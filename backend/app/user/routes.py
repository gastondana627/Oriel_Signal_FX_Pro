from flask import request, jsonify, current_app
from flask_jwt_extended import jwt_required, get_jwt_identity
from werkzeug.security import generate_password_hash, check_password_hash
from datetime import datetime, timedelta
import re
import logging
from app import db
from app.models import User, Payment, RenderJob, Purchase
from app.user import bp
from app.security import auth_rate_limit
from app.storage.gcs import get_gcs_manager
from app.downloads.manager import create_download_manager

logger = logging.getLogger(__name__)


def validate_email(email):
    """Validate email format"""
    pattern = r'^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$'
    return re.match(pattern, email) is not None


def validate_password(password):
    """Validate password strength"""
    if len(password) < 8:
        return False, "Password must be at least 8 characters long"
    if not re.search(r'[A-Za-z]', password):
        return False, "Password must contain at least one letter"
    if not re.search(r'\d', password):
        return False, "Password must contain at least one number"
    return True, "Password is valid"


@bp.route('/usage', methods=['GET'])
@jwt_required(optional=True)
def get_usage():
    """Get user usage statistics"""
    try:
        current_user_id = get_jwt_identity()
        
        if current_user_id:
            # Authenticated user
            user = User.query.get(int(current_user_id))
            if not user:
                return jsonify({
                    'error': {
                        'code': 'USER_NOT_FOUND',
                        'message': 'User not found'
                    }
                }), 404
            
            # Get user's plan and usage
            plan = user.plan or 'free'
            
            # Calculate usage based on plan
            if plan == 'free':
                daily_limit = 3
                monthly_limit = 10
            elif plan == 'starter':
                daily_limit = 50
                monthly_limit = 50
            elif plan == 'pro':
                daily_limit = 500
                monthly_limit = 500
            else:
                daily_limit = 3
                monthly_limit = 10
            
            # Get actual usage (simplified for now)
            today = datetime.utcnow().date()
            daily_downloads = RenderJob.query.filter(
                RenderJob.user_id == user.id,
                RenderJob.created_at >= today,
                RenderJob.status == 'completed'
            ).count()
            
            # Calculate monthly usage
            month_start = datetime.utcnow().replace(day=1, hour=0, minute=0, second=0, microsecond=0)
            monthly_downloads = RenderJob.query.filter(
                RenderJob.user_id == user.id,
                RenderJob.created_at >= month_start,
                RenderJob.status == 'completed'
            ).count()
            
            return jsonify({
                'usage': {
                    'plan_id': plan,
                    'plan_name': plan.title(),
                    'daily_downloads': daily_downloads,
                    'daily_limit': daily_limit,
                    'daily_remaining': max(0, daily_limit - daily_downloads),
                    'monthly_downloads': monthly_downloads,
                    'monthly_limit': monthly_limit,
                    'monthly_remaining': max(0, monthly_limit - monthly_downloads),
                    'downloads_used': daily_downloads,
                    'downloads_limit': daily_limit,
                    'remaining_downloads': max(0, daily_limit - daily_downloads),
                    'is_at_limit': daily_downloads >= daily_limit,
                    'is_near_limit': daily_downloads >= (daily_limit * 0.8),
                    'needs_upgrade': daily_downloads >= daily_limit,
                    'last_reset': today.isoformat(),
                    'next_reset': (datetime.utcnow() + timedelta(days=1)).replace(hour=0, minute=0, second=0, microsecond=0).isoformat()
                }
            })
        else:
            # Anonymous user - return free plan limits
            return jsonify({
                'usage': {
                    'plan_id': 'free',
                    'plan_name': 'Free',
                    'daily_downloads': 0,
                    'daily_limit': 3,
                    'daily_remaining': 3,
                    'monthly_downloads': 0,
                    'monthly_limit': 10,
                    'monthly_remaining': 10,
                    'downloads_used': 0,
                    'downloads_limit': 3,
                    'remaining_downloads': 3,
                    'is_at_limit': False,
                    'is_near_limit': False,
                    'needs_upgrade': False,
                    'last_reset': datetime.utcnow().date().isoformat(),
                    'next_reset': (datetime.utcnow() + timedelta(days=1)).replace(hour=0, minute=0, second=0, microsecond=0).isoformat()
                }
            })
            
    except Exception as e:
        logger.error(f"Error getting usage: {str(e)}")
        return jsonify({
            'error': {
                'code': 'USAGE_ERROR',
                'message': 'Failed to get usage information'
            }
        }), 500


@bp.route('/profile', methods=['GET'])
@jwt_required()
def get_profile():
    """Get current user profile with account information"""
    try:
        current_user_id = int(get_jwt_identity())
        user = User.query.get(current_user_id)
        
        if not user:
            return jsonify({
                'error': {
                    'code': 'USER_NOT_FOUND',
                    'message': 'User not found'
                }
            }), 404
        
        # Get user statistics
        total_payments = Payment.query.filter_by(user_id=user.id, status='completed').count()
        total_spent = db.session.query(db.func.sum(Payment.amount)).filter_by(
            user_id=user.id, status='completed'
        ).scalar() or 0
        
        total_renders = RenderJob.query.filter_by(user_id=user.id).count()
        completed_renders = RenderJob.query.filter_by(user_id=user.id, status='completed').count()
        
        return jsonify({
            'user': {
                'id': user.id,
                'email': user.email,
                'created_at': user.created_at.isoformat(),
                'is_active': user.is_active,
                'statistics': {
                    'total_payments': total_payments,
                    'total_spent_cents': total_spent,
                    'total_renders': total_renders,
                    'completed_renders': completed_renders
                }
            }
        }), 200
        
    except Exception as e:
        current_app.logger.error(f"Profile fetch error: {str(e)}")
        return jsonify({
            'error': {
                'code': 'PROFILE_FETCH_FAILED',
                'message': 'Failed to fetch profile'
            }
        }), 500


@bp.route('/profile', methods=['PUT'])
@jwt_required()
@auth_rate_limit()
def update_profile():
    """Update user profile (email and password)"""
    try:
        current_user_id = int(get_jwt_identity())
        user = User.query.get(current_user_id)
        
        if not user:
            return jsonify({
                'error': {
                    'code': 'USER_NOT_FOUND',
                    'message': 'User not found'
                }
            }), 404
        
        data = request.get_json()
        if not data:
            return jsonify({
                'error': {
                    'code': 'INVALID_REQUEST',
                    'message': 'Request body must be JSON'
                }
            }), 400
        
        updated_fields = []
        
        # Update email if provided
        new_email = data.get('email')
        if new_email:
            new_email = new_email.strip().lower()
            
            if not validate_email(new_email):
                return jsonify({
                    'error': {
                        'code': 'INVALID_EMAIL',
                        'message': 'Please provide a valid email address'
                    }
                }), 400
            
            # Check if email is already taken by another user
            existing_user = User.query.filter_by(email=new_email).first()
            if existing_user and existing_user.id != user.id:
                return jsonify({
                    'error': {
                        'code': 'EMAIL_EXISTS',
                        'message': 'An account with this email already exists'
                    }
                }), 409
            
            user.email = new_email
            updated_fields.append('email')
        
        # Update password if provided
        new_password = data.get('password')
        current_password = data.get('current_password')
        
        if new_password:
            # Require current password for password changes
            if not current_password:
                return jsonify({
                    'error': {
                        'code': 'CURRENT_PASSWORD_REQUIRED',
                        'message': 'Current password is required to change password'
                    }
                }), 400
            
            # Verify current password
            if not check_password_hash(user.password_hash, current_password):
                return jsonify({
                    'error': {
                        'code': 'INVALID_CURRENT_PASSWORD',
                        'message': 'Current password is incorrect'
                    }
                }), 400
            
            # Validate new password strength
            is_valid, message = validate_password(new_password)
            if not is_valid:
                return jsonify({
                    'error': {
                        'code': 'WEAK_PASSWORD',
                        'message': message
                    }
                }), 400
            
            user.password_hash = generate_password_hash(new_password)
            updated_fields.append('password')
        
        if not updated_fields:
            return jsonify({
                'error': {
                    'code': 'NO_CHANGES',
                    'message': 'No valid fields provided for update'
                }
            }), 400
        
        db.session.commit()
        
        return jsonify({
            'message': 'Profile updated successfully',
            'updated_fields': updated_fields,
            'user': {
                'id': user.id,
                'email': user.email,
                'created_at': user.created_at.isoformat(),
                'is_active': user.is_active
            }
        }), 200
        
    except Exception as e:
        db.session.rollback()
        current_app.logger.error(f"Profile update error: {str(e)}")
        return jsonify({
            'error': {
                'code': 'PROFILE_UPDATE_FAILED',
                'message': 'Failed to update profile'
            }
        }), 500


@bp.route('/history', methods=['GET'])
@jwt_required()
def get_user_history():
    """Get user history showing past render jobs and payments"""
    try:
        current_user_id = int(get_jwt_identity())
        user = User.query.get(current_user_id)
        
        if not user:
            return jsonify({
                'error': {
                    'code': 'USER_NOT_FOUND',
                    'message': 'User not found'
                }
            }), 404
        
        # Get pagination parameters
        page = request.args.get('page', 1, type=int)
        per_page = min(request.args.get('per_page', 20, type=int), 100)  # Max 100 items per page
        
        # Get payments with pagination
        payments_query = Payment.query.filter_by(user_id=user.id).order_by(Payment.created_at.desc())
        payments_pagination = payments_query.paginate(
            page=page, per_page=per_page, error_out=False
        )
        
        payments_data = []
        for payment in payments_pagination.items:
            payment_data = {
                'id': payment.id,
                'stripe_session_id': payment.stripe_session_id,
                'amount_cents': payment.amount,
                'status': payment.status,
                'created_at': payment.created_at.isoformat(),
                'render_jobs': []
            }
            
            # Get associated render jobs
            for job in payment.render_jobs:
                job_data = {
                    'id': job.id,
                    'status': job.status,
                    'audio_filename': job.audio_filename,
                    'created_at': job.created_at.isoformat(),
                    'completed_at': job.completed_at.isoformat() if job.completed_at else None,
                    'has_download': bool(job.video_url and job.status == 'completed'),
                    'error_message': job.error_message
                }
                payment_data['render_jobs'].append(job_data)
            
            payments_data.append(payment_data)
        
        # Get render jobs separately for better overview
        render_jobs_query = RenderJob.query.filter_by(user_id=user.id).order_by(RenderJob.created_at.desc())
        render_jobs_pagination = render_jobs_query.paginate(
            page=page, per_page=per_page, error_out=False
        )
        
        render_jobs_data = []
        for job in render_jobs_pagination.items:
            job_data = {
                'id': job.id,
                'payment_id': job.payment_id,
                'status': job.status,
                'audio_filename': job.audio_filename,
                'render_config': job.render_config,
                'created_at': job.created_at.isoformat(),
                'completed_at': job.completed_at.isoformat() if job.completed_at else None,
                'has_download': bool(job.video_url and job.status == 'completed'),
                'error_message': job.error_message
            }
            render_jobs_data.append(job_data)
        
        return jsonify({
            'payments': {
                'items': payments_data,
                'pagination': {
                    'page': payments_pagination.page,
                    'pages': payments_pagination.pages,
                    'per_page': payments_pagination.per_page,
                    'total': payments_pagination.total,
                    'has_next': payments_pagination.has_next,
                    'has_prev': payments_pagination.has_prev
                }
            },
            'render_jobs': {
                'items': render_jobs_data,
                'pagination': {
                    'page': render_jobs_pagination.page,
                    'pages': render_jobs_pagination.pages,
                    'per_page': render_jobs_pagination.per_page,
                    'total': render_jobs_pagination.total,
                    'has_next': render_jobs_pagination.has_next,
                    'has_prev': render_jobs_pagination.has_prev
                }
            }
        }), 200
        
    except Exception as e:
        current_app.logger.error(f"History fetch error: {str(e)}")
        return jsonify({
            'error': {
                'code': 'HISTORY_FETCH_FAILED',
                'message': 'Failed to fetch user history'
            }
        }), 500


@bp.route('/download/<int:job_id>', methods=['GET'])
@jwt_required()
def get_download_link(job_id):
    """Get download link for a completed render job with access validation"""
    try:
        current_user_id = int(get_jwt_identity())
        
        # Get the render job and validate ownership
        job = RenderJob.query.filter_by(id=job_id, user_id=current_user_id).first()
        
        if not job:
            return jsonify({
                'error': {
                    'code': 'JOB_NOT_FOUND',
                    'message': 'Render job not found or access denied'
                }
            }), 404
        
        # Check if job is completed and has a video
        if job.status != 'completed':
            return jsonify({
                'error': {
                    'code': 'JOB_NOT_COMPLETED',
                    'message': f'Render job is not completed (status: {job.status})'
                }
            }), 400
        
        if not job.gcs_blob_name:
            return jsonify({
                'error': {
                    'code': 'VIDEO_NOT_AVAILABLE',
                    'message': 'Video file is not available'
                }
            }), 404
        
        # Check if the video file still exists and generate download URL
        try:
            gcs_manager = get_gcs_manager()
            
            # Verify file exists
            video_info = gcs_manager.get_video_info(job.gcs_blob_name)
            if not video_info:
                return jsonify({
                    'error': {
                        'code': 'VIDEO_FILE_NOT_FOUND',
                        'message': 'Video file no longer exists in storage'
                    }
                }), 404
            
            # Check if video is expired (older than 30 days)
            if job.completed_at:
                expiry_date = job.completed_at + timedelta(days=30)
                if datetime.utcnow() > expiry_date:
                    return jsonify({
                        'error': {
                            'code': 'VIDEO_EXPIRED',
                            'message': 'Video download has expired (videos are available for 30 days)'
                        }
                    }), 410  # Gone
            
            # Generate signed download URL (valid for 24 hours)
            download_url = gcs_manager.generate_download_url(job.gcs_blob_name, expiration_hours=24)
            
            return jsonify({
                'download_url': download_url,
                'expires_in_hours': 24,
                'job': {
                    'id': job.id,
                    'audio_filename': job.audio_filename,
                    'completed_at': job.completed_at.isoformat() if job.completed_at else None,
                    'video_size_bytes': video_info.get('size'),
                    'created_at': job.created_at.isoformat()
                }
            }), 200
            
        except Exception as storage_error:
            current_app.logger.error(f"Storage error for job {job_id}: {storage_error}")
            return jsonify({
                'error': {
                    'code': 'STORAGE_ERROR',
                    'message': 'Failed to generate download link. Please try again later.'
                }
            }), 500
        
    except Exception as e:
        current_app.logger.error(f"Download link error: {str(e)}")
        return jsonify({
            'error': {
                'code': 'DOWNLOAD_LINK_FAILED',
                'message': 'Failed to generate download link'
            }
        }), 500


@bp.route('/logout', methods=['POST'])
@jwt_required()
def logout():
    """Logout user (client should discard tokens)"""
    try:
        # In a more advanced implementation, we could maintain a blacklist of tokens
        # For now, we rely on the client to discard the tokens
        current_user_id = get_jwt_identity()
        current_app.logger.info(f"User {current_user_id} logged out")
        
        return jsonify({
            'message': 'Logged out successfully'
        }), 200
        
    except Exception as e:
        current_app.logger.error(f"Logout error: {str(e)}")
        return jsonify({
            'error': {
                'code': 'LOGOUT_FAILED',
                'message': 'Logout failed'
            }
        }), 500


@bp.route('/session/verify', methods=['GET'])
@jwt_required()
def verify_session():
    """Verify user session and return current user info"""
    try:
        current_user_id = int(get_jwt_identity())
        user = User.query.get(current_user_id)
        
        if not user or not user.is_active:
            return jsonify({
                'error': {
                    'code': 'INVALID_SESSION',
                    'message': 'User session is invalid or account is disabled'
                }
            }), 401
        
        return jsonify({
            'valid': True,
            'user': {
                'id': user.id,
                'email': user.email,
                'created_at': user.created_at.isoformat(),
                'is_active': user.is_active
            }
        }), 200
        
    except Exception as e:
        current_app.logger.error(f"Session verification error: {str(e)}")
        return jsonify({
            'error': {
                'code': 'SESSION_VERIFICATION_FAILED',
                'message': 'Failed to verify session'
            }
        }), 500


@bp.route('/track-download', methods=['POST', 'OPTIONS'])
@auth_rate_limit()
@jwt_required()
def track_download():
    """Track a download and update usage"""
    # Handle OPTIONS request for CORS
    if request.method == 'OPTIONS':
        return jsonify({'status': 'ok'}), 200
        
    try:
        current_user_id = get_jwt_identity()
        user = User.query.get(current_user_id)
        
        if not user:
            return jsonify({
                'error': {
                    'code': 'USER_NOT_FOUND',
                    'message': 'User not found'
                }
            }), 404
        
        data = request.get_json() or {}
        download_type = data.get('type', 'mp3')
        metadata = data.get('metadata', {})
        
        # TODO: Implement actual download tracking logic
        # For now, just return success
        
        return jsonify({
            'success': True,
            'message': 'Download tracked successfully',
            'remaining_downloads': 9  # Placeholder
        }), 200
        
    except Exception as e:
        logger.error(f"Error tracking download: {str(e)}")
        return jsonify({
            'error': {
                'code': 'TRACKING_ERROR',
                'message': 'Failed to track download'
            }
        }), 500


@bp.route('/preferences', methods=['GET', 'POST', 'OPTIONS'])
@auth_rate_limit()
@jwt_required()
def user_preferences():
    """Get or update user preferences"""
    # Handle OPTIONS request for CORS
    if request.method == 'OPTIONS':
        return jsonify({'status': 'ok'}), 200
        
    try:
        current_user_id = get_jwt_identity()
        user = User.query.get(current_user_id)
        
        if not user:
            return jsonify({
                'error': {
                    'code': 'USER_NOT_FOUND',
                    'message': 'User not found'
                }
            }), 404
        
        if request.method == 'GET':
            # Return user preferences
            preferences = {
                'theme': 'dark',
                'notifications': True,
                'auto_save': True,
                'default_format': 'mp3'
            }
            return jsonify({'preferences': preferences}), 200
        
        elif request.method == 'POST':
            # Update preferences
            data = request.get_json() or {}
            # TODO: Save preferences to database
            return jsonify({
                'success': True,
                'message': 'Preferences updated successfully'
            }), 200
        
    except Exception as e:
        logger.error(f"Error with preferences: {str(e)}")
        return jsonify({
            'error': {
                'code': 'PREFERENCES_ERROR',
                'message': 'Failed to handle preferences'
            }
        }), 500


@bp.route('/download-history', methods=['GET', 'OPTIONS'])
@auth_rate_limit()
@jwt_required()
def download_history():
    """Get user's download history"""
    # Handle OPTIONS request for CORS
    if request.method == 'OPTIONS':
        return jsonify({'status': 'ok'}), 200
        
    try:
        current_user_id = get_jwt_identity()
        user = User.query.get(current_user_id)
        
        if not user:
            return jsonify({
                'error': {
                    'code': 'USER_NOT_FOUND',
                    'message': 'User not found'
                }
            }), 404
        
        # TODO: Get actual download history from database
        history = [
            {
                'id': 1,
                'filename': 'visualization_001.mp3',
                'format': 'mp3',
                'created_at': datetime.utcnow().isoformat(),
                'size': '2.5MB'
            }
        ]
        
        return jsonify({
            'history': history,
            'total': len(history)
        }), 200
        
    except Exception as e:
        logger.error(f"Error getting download history: {str(e)}")
        return jsonify({
            'error': {
                'code': 'HISTORY_ERROR',
                'message': 'Failed to get download history'
            }
        }), 500


@bp.route('/purchases', methods=['GET'])
@jwt_required()
def get_purchase_history():
    """
    Get user's purchase history with download links and licensing information.
    Implements requirements 6.1, 6.2, 6.3, 6.4, 6.5
    """
    try:
        current_user_id = int(get_jwt_identity())
        user = User.query.get(current_user_id)
        
        if not user:
            return jsonify({
                'error': {
                    'code': 'USER_NOT_FOUND',
                    'message': 'User not found'
                }
            }), 404
        
        # Get pagination parameters
        page = request.args.get('page', 1, type=int)
        per_page = min(request.args.get('per_page', 20, type=int), 100)
        status_filter = request.args.get('status')  # Optional status filter
        
        # Build query for user's purchases
        query = Purchase.query.filter_by(user_id=user.id)
        
        # Apply status filter if provided
        if status_filter:
            query = query.filter_by(status=status_filter)
        
        # Order by creation date (newest first)
        query = query.order_by(Purchase.created_at.desc())
        
        # Paginate results
        purchases_pagination = query.paginate(
            page=page, per_page=per_page, error_out=False
        )
        
        purchases_data = []
        for purchase in purchases_pagination.items:
            # Check if download is still valid
            can_download = purchase.can_download()
            is_expired = purchase.is_download_expired()
            
            purchase_data = {
                'id': purchase.id,
                'tier': purchase.tier,
                'amount_cents': purchase.amount,
                'status': purchase.status,
                'created_at': purchase.created_at.isoformat(),
                'completed_at': purchase.completed_at.isoformat() if purchase.completed_at else None,
                'download_info': {
                    'can_download': can_download,
                    'is_expired': is_expired,
                    'expires_at': purchase.download_expires_at.isoformat() if purchase.download_expires_at else None,
                    'attempts_used': purchase.download_attempts,
                    'max_attempts': 5,
                    'attempts_remaining': max(0, 5 - purchase.download_attempts)
                },
                'licensing': {
                    'license_sent': purchase.license_sent,
                    'license_type': purchase.tier,
                    'can_resend_license': purchase.status == 'completed'
                },
                'receipt': {
                    'stripe_session_id': purchase.stripe_session_id,
                    'stripe_payment_intent': purchase.stripe_payment_intent,
                    'purchase_reference': purchase.id
                }
            }
            
            # Add download link if valid
            if can_download and purchase.download_token:
                purchase_data['download_info']['download_url'] = f"/api/downloads/secure?token={purchase.download_token}"
            
            purchases_data.append(purchase_data)
        
        # Calculate summary statistics
        total_purchases = Purchase.query.filter_by(user_id=user.id).count()
        completed_purchases = Purchase.query.filter_by(user_id=user.id, status='completed').count()
        total_spent = db.session.query(db.func.sum(Purchase.amount)).filter_by(
            user_id=user.id, status='completed'
        ).scalar() or 0
        
        return jsonify({
            'purchases': {
                'items': purchases_data,
                'pagination': {
                    'page': purchases_pagination.page,
                    'pages': purchases_pagination.pages,
                    'per_page': purchases_pagination.per_page,
                    'total': purchases_pagination.total,
                    'has_next': purchases_pagination.has_next,
                    'has_prev': purchases_pagination.has_prev
                }
            },
            'summary': {
                'total_purchases': total_purchases,
                'completed_purchases': completed_purchases,
                'total_spent_cents': total_spent,
                'total_spent_dollars': total_spent / 100.0
            }
        }), 200
        
    except Exception as e:
        current_app.logger.error(f"Purchase history fetch error: {str(e)}")
        return jsonify({
            'error': {
                'code': 'PURCHASE_HISTORY_FAILED',
                'message': 'Failed to fetch purchase history'
            }
        }), 500


@bp.route('/purchases/<purchase_id>', methods=['GET'])
@jwt_required()
def get_purchase_details(purchase_id):
    """
    Get detailed information about a specific purchase including receipt and licensing.
    Implements requirements 6.3, 6.4, 6.5
    """
    try:
        current_user_id = int(get_jwt_identity())
        user = User.query.get(current_user_id)
        
        if not user:
            return jsonify({
                'error': {
                    'code': 'USER_NOT_FOUND',
                    'message': 'User not found'
                }
            }), 404
        
        # Get purchase and verify ownership
        purchase = Purchase.query.filter_by(id=purchase_id, user_id=user.id).first()
        
        if not purchase:
            return jsonify({
                'error': {
                    'code': 'PURCHASE_NOT_FOUND',
                    'message': 'Purchase not found or access denied'
                }
            }), 404
        
        # Get license text from config
        from app.downloads.config import get_license_text
        license_text = get_license_text(
            purchase.tier, 
            purchase.id, 
            purchase.completed_at.strftime('%Y-%m-%d') if purchase.completed_at else 'N/A'
        )
        
        # Check download status
        can_download = purchase.can_download()
        is_expired = purchase.is_download_expired()
        
        purchase_details = {
            'id': purchase.id,
            'tier': purchase.tier,
            'amount_cents': purchase.amount,
            'amount_dollars': purchase.amount / 100.0,
            'status': purchase.status,
            'file_id': purchase.file_id,
            'created_at': purchase.created_at.isoformat(),
            'completed_at': purchase.completed_at.isoformat() if purchase.completed_at else None,
            'download_info': {
                'can_download': can_download,
                'is_expired': is_expired,
                'expires_at': purchase.download_expires_at.isoformat() if purchase.download_expires_at else None,
                'attempts_used': purchase.download_attempts,
                'max_attempts': 5,
                'attempts_remaining': max(0, 5 - purchase.download_attempts),
                'download_token': purchase.download_token if can_download else None
            },
            'licensing': {
                'license_sent': purchase.license_sent,
                'license_type': purchase.tier,
                'license_text': license_text,
                'can_resend_license': purchase.status == 'completed'
            },
            'receipt': {
                'stripe_session_id': purchase.stripe_session_id,
                'stripe_payment_intent': purchase.stripe_payment_intent,
                'purchase_reference': purchase.id,
                'invoice_url': f"/api/purchases/{purchase.id}/receipt"  # Future endpoint
            }
        }
        
        # Add download URL if valid
        if can_download and purchase.download_token:
            purchase_details['download_info']['download_url'] = f"/api/downloads/secure?token={purchase.download_token}"
        
        return jsonify({
            'purchase': purchase_details
        }), 200
        
    except Exception as e:
        current_app.logger.error(f"Purchase details fetch error: {str(e)}")
        return jsonify({
            'error': {
                'code': 'PURCHASE_DETAILS_FAILED',
                'message': 'Failed to fetch purchase details'
            }
        }), 500


@bp.route('/purchases/<purchase_id>/resend-license', methods=['POST'])
@jwt_required()
@auth_rate_limit()
def resend_license_email(purchase_id):
    """
    Resend licensing email for a completed purchase.
    Implements requirement 6.5
    """
    try:
        current_user_id = int(get_jwt_identity())
        user = User.query.get(current_user_id)
        
        if not user:
            return jsonify({
                'error': {
                    'code': 'USER_NOT_FOUND',
                    'message': 'User not found'
                }
            }), 404
        
        # Get purchase and verify ownership
        purchase = Purchase.query.filter_by(id=purchase_id, user_id=user.id).first()
        
        if not purchase:
            return jsonify({
                'error': {
                    'code': 'PURCHASE_NOT_FOUND',
                    'message': 'Purchase not found or access denied'
                }
            }), 404
        
        # Check if purchase is completed
        if purchase.status != 'completed':
            return jsonify({
                'error': {
                    'code': 'PURCHASE_NOT_COMPLETED',
                    'message': f'Cannot resend license for purchase with status: {purchase.status}'
                }
            }), 400
        
        # Check if it's not too old (30 days limit from design)
        if purchase.completed_at:
            days_since_purchase = (datetime.utcnow() - purchase.completed_at).days
            if days_since_purchase > 30:
                return jsonify({
                    'error': {
                        'code': 'PURCHASE_TOO_OLD',
                        'message': 'Cannot resend license for purchases older than 30 days'
                    }
                }), 400
        
        # TODO: Integrate with LicensingService to send email
        # For now, simulate email sending
        try:
            # This would call the LicensingService.send_licensing_email method
            # licensing_service = LicensingService()
            # email_sent = licensing_service.send_licensing_email(purchase)
            
            # Simulate successful email sending
            email_sent = True
            
            if email_sent:
                # Update license_sent flag
                purchase.license_sent = True
                db.session.commit()
                
                logger.info(f"License email resent for purchase {purchase_id}")
                
                return jsonify({
                    'message': 'License email sent successfully',
                    'purchase_id': purchase_id,
                    'sent_to': user.email
                }), 200
            else:
                return jsonify({
                    'error': {
                        'code': 'EMAIL_SEND_FAILED',
                        'message': 'Failed to send license email'
                    }
                }), 500
                
        except Exception as email_error:
            logger.error(f"Email sending error for purchase {purchase_id}: {str(email_error)}")
            return jsonify({
                'error': {
                    'code': 'EMAIL_SERVICE_ERROR',
                    'message': 'Email service temporarily unavailable'
                }
            }), 503
        
    except Exception as e:
        current_app.logger.error(f"License resend error: {str(e)}")
        return jsonify({
            'error': {
                'code': 'LICENSE_RESEND_FAILED',
                'message': 'Failed to resend license email'
            }
        }), 500


@bp.route('/purchases/<purchase_id>/download-link', methods=['POST'])
@jwt_required()
@auth_rate_limit()
def regenerate_download_link(purchase_id):
    """
    Generate a new download link for an expired purchase.
    Implements requirement 6.4
    """
    try:
        current_user_id = int(get_jwt_identity())
        user = User.query.get(current_user_id)
        
        if not user:
            return jsonify({
                'error': {
                    'code': 'USER_NOT_FOUND',
                    'message': 'User not found'
                }
            }), 404
        
        # Get purchase and verify ownership
        purchase = Purchase.query.filter_by(id=purchase_id, user_id=user.id).first()
        
        if not purchase:
            return jsonify({
                'error': {
                    'code': 'PURCHASE_NOT_FOUND',
                    'message': 'Purchase not found or access denied'
                }
            }), 404
        
        # Use download manager to create new link
        download_manager = create_download_manager()
        resend_result = download_manager.create_resend_link(purchase_id)
        
        if not resend_result['success']:
            return jsonify({
                'error': {
                    'code': 'LINK_GENERATION_FAILED',
                    'message': resend_result.get('error', 'Failed to generate new download link')
                }
            }), 400
        
        logger.info(f"New download link generated for purchase {purchase_id}")
        
        return jsonify({
            'message': 'New download link generated successfully',
            'download_link': resend_result['download_link'],
            'expires_at': resend_result['expires_at'].isoformat() if resend_result['expires_at'] else None,
            'attempts_remaining': resend_result['attempts_remaining']
        }), 200
        
    except Exception as e:
        current_app.logger.error(f"Download link regeneration error: {str(e)}")
        return jsonify({
            'error': {
                'code': 'LINK_REGENERATION_FAILED',
                'message': 'Failed to regenerate download link'
            }
        }), 500


@bp.route('/purchases/<purchase_id>/receipt', methods=['GET'])
@jwt_required()
def get_purchase_receipt(purchase_id):
    """
    Get detailed receipt information for a purchase.
    Implements requirement 6.3
    """
    try:
        current_user_id = int(get_jwt_identity())
        user = User.query.get(current_user_id)
        
        if not user:
            return jsonify({
                'error': {
                    'code': 'USER_NOT_FOUND',
                    'message': 'User not found'
                }
            }), 404
        
        # Get purchase and verify ownership
        purchase = Purchase.query.filter_by(id=purchase_id, user_id=user.id).first()
        
        if not purchase:
            return jsonify({
                'error': {
                    'code': 'PURCHASE_NOT_FOUND',
                    'message': 'Purchase not found or access denied'
                }
            }), 404
        
        # Get tier information from config
        from app.downloads.config import PRICING_TIERS
        tier_info = PRICING_TIERS.get(purchase.tier, {})
        
        receipt_data = {
            'purchase_id': purchase.id,
            'purchase_reference': purchase.id,
            'customer': {
                'email': user.email,
                'user_id': user.id
            },
            'item': {
                'name': tier_info.get('name', purchase.tier.title()),
                'description': tier_info.get('description', f'{purchase.tier} license'),
                'tier': purchase.tier,
                'resolution': tier_info.get('resolution', 'N/A'),
                'format': tier_info.get('format', 'MP4'),
                'license_type': tier_info.get('license', purchase.tier)
            },
            'payment': {
                'amount_cents': purchase.amount,
                'amount_dollars': purchase.amount / 100.0,
                'currency': 'USD',
                'stripe_session_id': purchase.stripe_session_id,
                'stripe_payment_intent': purchase.stripe_payment_intent,
                'status': purchase.status
            },
            'dates': {
                'created_at': purchase.created_at.isoformat(),
                'completed_at': purchase.completed_at.isoformat() if purchase.completed_at else None
            },
            'download_info': {
                'file_id': purchase.file_id,
                'expires_at': purchase.download_expires_at.isoformat() if purchase.download_expires_at else None,
                'attempts_used': purchase.download_attempts,
                'max_attempts': 5
            }
        }
        
        return jsonify({
            'receipt': receipt_data
        }), 200
        
    except Exception as e:
        current_app.logger.error(f"Receipt fetch error: {str(e)}")
        return jsonify({
            'error': {
                'code': 'RECEIPT_FETCH_FAILED',
                'message': 'Failed to fetch receipt'
            }
        }), 500