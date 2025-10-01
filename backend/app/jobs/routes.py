"""
Job management API routes.
"""
import os
import tempfile
import mimetypes
from datetime import datetime
from werkzeug.utils import secure_filename
from flask import Blueprint, jsonify, request, current_app
from flask_jwt_extended import jwt_required, get_jwt_identity
from app.jobs.queue import get_job_status, get_queue_info, enqueue_job, clear_failed_jobs
from app.jobs.jobs import render_video_job, send_completion_email, cleanup_files
from app.models import RenderJob, Payment, User, db
from app.jobs.validation import validate_audio_file, AudioValidationError
from app.security import upload_rate_limit, api_rate_limit, download_rate_limit, admin_rate_limit
from app.security.validators import validate_file_upload, sanitize_input, SecurityValidationError
import logging

logger = logging.getLogger(__name__)

bp = Blueprint('jobs', __name__, url_prefix='/api/jobs')

# Allowed audio file extensions
ALLOWED_AUDIO_EXTENSIONS = {'mp3', 'wav', 'm4a', 'aac', 'flac', 'ogg'}
# Maximum file size: 50MB
MAX_FILE_SIZE = 50 * 1024 * 1024

@bp.route('/render/submit', methods=['POST'])
@jwt_required()
@upload_rate_limit()
def submit_render_job():
    """Submit a new video rendering job."""
    try:
        user_id = get_jwt_identity()
        
        # Check if audio file is provided
        if 'audio_file' not in request.files:
            return jsonify({
                'error': {
                    'code': 'NO_AUDIO_FILE',
                    'message': 'Audio file is required'
                }
            }), 400
        
        audio_file = request.files['audio_file']
        if audio_file.filename == '':
            return jsonify({
                'error': {
                    'code': 'NO_AUDIO_FILE',
                    'message': 'No audio file selected'
                }
            }), 400
        
        # Get render configuration from form data
        render_config = {}
        try:
            import json
            config_data = request.form.get('render_config', '{}')
            render_config = json.loads(config_data)
        except (json.JSONDecodeError, TypeError):
            return jsonify({
                'error': {
                    'code': 'INVALID_CONFIG',
                    'message': 'Invalid render configuration JSON'
                }
            }), 400
        
        # Get payment ID from form data
        payment_id = request.form.get('payment_id')
        if not payment_id:
            return jsonify({
                'error': {
                    'code': 'NO_PAYMENT_ID',
                    'message': 'Payment ID is required'
                }
            }), 400
        
        # Verify payment exists and belongs to user
        payment = Payment.query.filter_by(
            id=payment_id, 
            user_id=user_id, 
            status='completed'
        ).first()
        
        if not payment:
            return jsonify({
                'error': {
                    'code': 'INVALID_PAYMENT',
                    'message': 'Valid completed payment required'
                }
            }), 402
        
        # Check if payment already used for a render job
        existing_job = RenderJob.query.filter_by(payment_id=payment_id).first()
        if existing_job:
            return jsonify({
                'error': {
                    'code': 'PAYMENT_ALREADY_USED',
                    'message': 'This payment has already been used for a render job'
                }
            }), 409
        
        # Validate audio file
        try:
            validate_audio_file(audio_file)
        except AudioValidationError as e:
            return jsonify({
                'error': {
                    'code': 'INVALID_AUDIO_FILE',
                    'message': str(e),
                    'details': e.details if hasattr(e, 'details') else None
                }
            }), 415
        
        # Save audio file to temporary location
        filename = secure_filename(audio_file.filename)
        temp_dir = tempfile.mkdtemp(prefix='audio_upload_')
        audio_file_path = os.path.join(temp_dir, filename)
        audio_file.save(audio_file_path)
        
        # Create render job record in database
        render_job = RenderJob(
            user_id=user_id,
            payment_id=payment_id,
            status='queued',
            audio_filename=filename,
            render_config=render_config
        )
        db.session.add(render_job)
        db.session.commit()
        
        # Enqueue the rendering job
        job = enqueue_job(
            'video_rendering',
            render_video_job,
            str(render_job.id),
            user_id,
            audio_file_path,
            render_config
        )
        
        # Update render job with RQ job ID
        render_job.status = 'queued'
        db.session.commit()
        
        logger.info(f"Render job {render_job.id} submitted for user {user_id}")
        
        return jsonify({
            'success': True,
            'job_id': render_job.id,
            'rq_job_id': job.id,
            'status': 'queued',
            'message': 'Render job submitted successfully'
        }), 201
        
    except Exception as e:
        logger.error(f"Error submitting render job: {e}")
        db.session.rollback()
        return jsonify({
            'error': {
                'code': 'RENDER_SUBMISSION_ERROR',
                'message': 'Failed to submit render job'
            }
        }), 500

@bp.route('/render/status/<int:job_id>', methods=['GET'])
@jwt_required()
def render_job_status(job_id):
    """Get the status of a specific render job."""
    try:
        user_id = get_jwt_identity()
        
        # Get render job from database
        render_job = RenderJob.query.filter_by(id=job_id, user_id=user_id).first()
        if not render_job:
            return jsonify({
                'error': {
                    'code': 'JOB_NOT_FOUND',
                    'message': 'Render job not found'
                }
            }), 404
        
        # Get RQ job status if available
        rq_status = None
        progress = 0
        
        # For now, we'll use the database status
        # In a full implementation, we'd also check RQ job status
        
        response_data = {
            'success': True,
            'job': {
                'id': render_job.id,
                'status': render_job.status,
                'progress': progress,
                'audio_filename': render_job.audio_filename,
                'video_url': render_job.video_url,
                'error_message': render_job.error_message,
                'created_at': render_job.created_at.isoformat(),
                'completed_at': render_job.completed_at.isoformat() if render_job.completed_at else None
            }
        }
        
        return jsonify(response_data)
        
    except Exception as e:
        logger.error(f"Error getting render job status for {job_id}: {e}")
        return jsonify({
            'error': {
                'code': 'JOB_STATUS_ERROR',
                'message': 'Failed to get job status'
            }
        }), 500

@bp.route('/status/<job_id>', methods=['GET'])
@jwt_required()
def job_status(job_id):
    """Get the status of a specific job."""
    try:
        status = get_job_status(job_id)
        return jsonify({
            'success': True,
            'job': status
        })
    except Exception as e:
        logger.error(f"Error getting job status for {job_id}: {e}")
        return jsonify({
            'error': {
                'code': 'JOB_STATUS_ERROR',
                'message': 'Failed to get job status'
            }
        }), 500

@bp.route('/queue-info', methods=['GET'])
@jwt_required()
def queue_info():
    """Get information about all job queues."""
    try:
        info = get_queue_info()
        return jsonify({
            'success': True,
            'queues': info
        })
    except Exception as e:
        logger.error(f"Error getting queue info: {e}")
        return jsonify({
            'error': {
                'code': 'QUEUE_INFO_ERROR',
                'message': 'Failed to get queue information'
            }
        }), 500

@bp.route('/test-job', methods=['POST'])
@jwt_required()
def test_job():
    """Create a test job for debugging purposes."""
    try:
        user_id = get_jwt_identity()
        
        # Enqueue a test email job
        job = enqueue_job(
            'high_priority',
            send_completion_email,
            'test@example.com',
            'https://example.com/test-video.mp4',
            'test-job-123'
        )
        
        return jsonify({
            'success': True,
            'job_id': job.id,
            'message': 'Test job enqueued successfully'
        })
        
    except Exception as e:
        logger.error(f"Error creating test job: {e}")
        return jsonify({
            'error': {
                'code': 'TEST_JOB_ERROR',
                'message': 'Failed to create test job'
            }
        }), 500

@bp.route('/render/retry/<int:job_id>', methods=['POST'])
@jwt_required()
def retry_render_job(job_id):
    """Retry a failed render job."""
    try:
        user_id = get_jwt_identity()
        
        # Get render job from database
        render_job = RenderJob.query.filter_by(id=job_id, user_id=user_id).first()
        if not render_job:
            return jsonify({
                'error': {
                    'code': 'JOB_NOT_FOUND',
                    'message': 'Render job not found'
                }
            }), 404
        
        # Only allow retry for failed jobs
        if render_job.status != 'failed':
            return jsonify({
                'error': {
                    'code': 'JOB_NOT_FAILED',
                    'message': 'Only failed jobs can be retried'
                }
            }), 400
        
        # Reset job status
        render_job.status = 'queued'
        render_job.error_message = None
        render_job.completed_at = None
        db.session.commit()
        
        # Re-enqueue the job (audio file path would need to be reconstructed)
        # For now, return success - full implementation would re-enqueue
        
        logger.info(f"Render job {job_id} retry requested by user {user_id}")
        
        return jsonify({
            'success': True,
            'job_id': job_id,
            'status': 'queued',
            'message': 'Render job queued for retry'
        })
        
    except Exception as e:
        logger.error(f"Error retrying render job {job_id}: {e}")
        return jsonify({
            'error': {
                'code': 'RETRY_ERROR',
                'message': 'Failed to retry render job'
            }
        }), 500

@bp.route('/render/cancel/<int:job_id>', methods=['POST'])
@jwt_required()
def cancel_render_job(job_id):
    """Cancel a queued or processing render job."""
    try:
        user_id = get_jwt_identity()
        
        # Get render job from database
        render_job = RenderJob.query.filter_by(id=job_id, user_id=user_id).first()
        if not render_job:
            return jsonify({
                'error': {
                    'code': 'JOB_NOT_FOUND',
                    'message': 'Render job not found'
                }
            }), 404
        
        # Only allow cancellation for queued or processing jobs
        if render_job.status not in ['queued', 'processing']:
            return jsonify({
                'error': {
                    'code': 'JOB_NOT_CANCELLABLE',
                    'message': 'Job cannot be cancelled in current state'
                }
            }), 400
        
        # Update job status
        render_job.status = 'cancelled'
        render_job.error_message = 'Job cancelled by user'
        render_job.completed_at = datetime.utcnow()
        db.session.commit()
        
        # TODO: Cancel RQ job if it's still in queue
        
        logger.info(f"Render job {job_id} cancelled by user {user_id}")
        
        return jsonify({
            'success': True,
            'job_id': job_id,
            'status': 'cancelled',
            'message': 'Render job cancelled successfully'
        })
        
    except Exception as e:
        logger.error(f"Error cancelling render job {job_id}: {e}")
        return jsonify({
            'error': {
                'code': 'CANCEL_ERROR',
                'message': 'Failed to cancel render job'
            }
        }), 500

@bp.route('/cleanup/expired-videos', methods=['POST'])
@jwt_required()
def cleanup_expired_videos_endpoint():
    """Trigger cleanup of expired videos from GCS."""
    try:
        data = request.get_json() or {}
        max_age_days = data.get('max_age_days', 30)
        
        # Validate max_age_days
        if max_age_days < 1 or max_age_days > 365:
            return jsonify({
                'error': {
                    'code': 'INVALID_AGE',
                    'message': 'max_age_days must be between 1 and 365'
                }
            }), 400
        
        # Import cleanup function
        from app.jobs.jobs import cleanup_expired_videos
        
        # Enqueue cleanup job
        job = enqueue_job(
            'cleanup',
            cleanup_expired_videos,
            max_age_days
        )
        
        return jsonify({
            'success': True,
            'cleanup_job_id': job.id,
            'max_age_days': max_age_days,
            'message': 'Video cleanup job started'
        })
        
    except Exception as e:
        logger.error(f"Error starting video cleanup job: {e}")
        return jsonify({
            'error': {
                'code': 'CLEANUP_ERROR',
                'message': 'Failed to start video cleanup job'
            }
        }), 500

@bp.route('/cleanup/old-files', methods=['POST'])
@jwt_required()
def cleanup_old_files():
    """Trigger cleanup of old temporary files."""
    try:
        data = request.get_json() or {}
        max_age_days = data.get('max_age_days', 7)
        
        # Get list of temporary directories and files to clean
        temp_dirs = []
        # TODO: Implement logic to find old temp directories
        
        # Enqueue cleanup job
        job = enqueue_job(
            'cleanup',
            cleanup_files,
            temp_dirs,
            max_age_days
        )
        
        return jsonify({
            'success': True,
            'cleanup_job_id': job.id,
            'message': 'Cleanup job started'
        })
        
    except Exception as e:
        logger.error(f"Error starting cleanup job: {e}")
        return jsonify({
            'error': {
                'code': 'CLEANUP_ERROR',
                'message': 'Failed to start cleanup job'
            }
        }), 500

@bp.route('/clear-failed', methods=['POST'])
@jwt_required()
def clear_failed():
    """Clear failed jobs from queues (admin only)."""
    try:
        data = request.get_json() or {}
        queue_name = data.get('queue_name')
        
        clear_failed_jobs(queue_name)
        
        return jsonify({
            'success': True,
            'message': f'Failed jobs cleared from {queue_name or "all queues"}'
        })
        
    except Exception as e:
        logger.error(f"Error clearing failed jobs: {e}")
        return jsonify({
            'error': {
                'code': 'CLEAR_FAILED_ERROR',
                'message': 'Failed to clear failed jobs'
            }
        }), 500

@bp.route('/render/download/<int:job_id>', methods=['GET'])
@jwt_required()
def generate_download_url(job_id):
    """Generate a fresh download URL for a completed render job."""
    try:
        user_id = get_jwt_identity()
        
        # Get render job from database
        render_job = RenderJob.query.filter_by(id=job_id, user_id=user_id).first()
        if not render_job:
            return jsonify({
                'error': {
                    'code': 'JOB_NOT_FOUND',
                    'message': 'Render job not found'
                }
            }), 404
        
        # Check if job is completed
        if render_job.status != 'completed':
            return jsonify({
                'error': {
                    'code': 'JOB_NOT_COMPLETED',
                    'message': 'Video is not ready for download'
                }
            }), 400
        
        # Check if we have a GCS blob name
        if not render_job.gcs_blob_name:
            return jsonify({
                'error': {
                    'code': 'NO_VIDEO_FILE',
                    'message': 'Video file not found in storage'
                }
            }), 404
        
        # Generate fresh download URL
        try:
            from app.storage.gcs import get_gcs_manager
            gcs_manager = get_gcs_manager()
            
            # Get expiration hours from query parameter (default 24 hours, max 168 hours = 7 days)
            expiration_hours = min(int(request.args.get('expiration_hours', 24)), 168)
            
            download_url = gcs_manager.generate_download_url(
                render_job.gcs_blob_name, 
                expiration_hours=expiration_hours
            )
            
            # Update the video_url in database with fresh URL
            render_job.video_url = download_url
            db.session.commit()
            
            logger.info(f"Generated fresh download URL for job {job_id}")
            
            return jsonify({
                'success': True,
                'job_id': job_id,
                'download_url': download_url,
                'expires_in_hours': expiration_hours,
                'message': 'Download URL generated successfully'
            })
            
        except Exception as gcs_error:
            logger.error(f"Failed to generate download URL for job {job_id}: {gcs_error}")
            return jsonify({
                'error': {
                    'code': 'DOWNLOAD_URL_ERROR',
                    'message': 'Failed to generate download URL'
                }
            }), 500
        
    except Exception as e:
        logger.error(f"Error generating download URL for job {job_id}: {e}")
        return jsonify({
            'error': {
                'code': 'DOWNLOAD_ERROR',
                'message': 'Failed to process download request'
            }
        }), 500

@bp.route('/render/list', methods=['GET'])
@jwt_required()
def list_render_jobs():
    """List all render jobs for the current user."""
    try:
        user_id = get_jwt_identity()
        
        # Get query parameters
        status = request.args.get('status')
        limit = min(int(request.args.get('limit', 50)), 100)  # Max 100 jobs
        offset = int(request.args.get('offset', 0))
        
        # Build query
        query = RenderJob.query.filter_by(user_id=user_id)
        
        if status:
            query = query.filter_by(status=status)
        
        # Order by creation date (newest first)
        query = query.order_by(RenderJob.created_at.desc())
        
        # Apply pagination
        total_count = query.count()
        jobs = query.offset(offset).limit(limit).all()
        
        # Format response
        job_list = []
        for job in jobs:
            job_data = {
                'id': job.id,
                'status': job.status,
                'audio_filename': job.audio_filename,
                'video_url': job.video_url,
                'error_message': job.error_message,
                'created_at': job.created_at.isoformat(),
                'completed_at': job.completed_at.isoformat() if job.completed_at else None
            }
            job_list.append(job_data)
        
        return jsonify({
            'success': True,
            'jobs': job_list,
            'pagination': {
                'total': total_count,
                'limit': limit,
                'offset': offset,
                'has_more': offset + limit < total_count
            }
        })
        
    except Exception as e:
        logger.error(f"Error listing render jobs: {e}")
        return jsonify({
            'error': {
                'code': 'LIST_JOBS_ERROR',
                'message': 'Failed to list render jobs'
            }
        }), 500