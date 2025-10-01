"""
Admin routes for additional functionality.
"""
from flask import jsonify, request, current_app
from flask_jwt_extended import jwt_required, get_jwt_identity
from app.admin import bp
from app.models import User, Payment, RenderJob
from app import db
import redis


@bp.route('/metrics')
@jwt_required()
def get_metrics():
    """API endpoint for admin metrics."""
    try:
        # Check if user is admin
        current_user_id = int(get_jwt_identity())
        user = User.query.get(current_user_id)
        admin_email = current_app.config.get('ADMIN_EMAIL')
        
        if not user or not admin_email or user.email != admin_email:
            return jsonify({'error': 'Unauthorized'}), 403
        
        # Get metrics
        metrics = {
            'users': {
                'total': User.query.count(),
                'active': User.query.filter_by(is_active=True).count(),
                'inactive': User.query.filter_by(is_active=False).count()
            },
            'payments': {
                'total': Payment.query.count(),
                'completed': Payment.query.filter_by(status='completed').count(),
                'pending': Payment.query.filter_by(status='pending').count(),
                'failed': Payment.query.filter_by(status='failed').count(),
                'total_revenue': db.session.query(db.func.sum(Payment.amount)).filter_by(
                    status='completed'
                ).scalar() or 0
            },
            'jobs': {
                'total': RenderJob.query.count(),
                'queued': RenderJob.query.filter_by(status='queued').count(),
                'processing': RenderJob.query.filter_by(status='processing').count(),
                'completed': RenderJob.query.filter_by(status='completed').count(),
                'failed': RenderJob.query.filter_by(status='failed').count()
            }
        }
        
        # Add queue status
        try:
            redis_url = current_app.config.get('REDIS_URL')
            if redis_url:
                r = redis.from_url(redis_url)
                metrics['queue'] = {
                    'default': r.llen('rq:queue:default'),
                    'high': r.llen('rq:queue:high'),
                    'low': r.llen('rq:queue:low')
                }
        except Exception as e:
            current_app.logger.error(f"Redis metrics error: {e}")
            metrics['queue'] = {'error': 'Unable to connect to Redis'}
        
        return jsonify(metrics)
        
    except Exception as e:
        current_app.logger.error(f"Admin metrics error: {e}")
        return jsonify({'error': 'Failed to fetch metrics'}), 500


@bp.route('/system-status')
@jwt_required()
def get_system_status():
    """Get system status for monitoring."""
    try:
        # Check if user is admin
        current_user_id = int(get_jwt_identity())
        user = User.query.get(current_user_id)
        admin_email = current_app.config.get('ADMIN_EMAIL')
        
        if not user or not admin_email or user.email != admin_email:
            return jsonify({'error': 'Unauthorized'}), 403
        
        status = {
            'database': 'healthy',
            'redis': 'unknown',
            'storage': 'unknown',
            'email': 'unknown'
        }
        
        # Check database
        try:
            db.session.execute('SELECT 1')
            status['database'] = 'healthy'
        except Exception:
            status['database'] = 'unhealthy'
        
        # Check Redis
        try:
            redis_url = current_app.config.get('REDIS_URL')
            if redis_url:
                r = redis.from_url(redis_url)
                r.ping()
                status['redis'] = 'healthy'
            else:
                status['redis'] = 'not_configured'
        except Exception:
            status['redis'] = 'unhealthy'
        
        # Check GCS (basic config check)
        gcs_bucket = current_app.config.get('GCS_BUCKET_NAME')
        gcs_creds = current_app.config.get('GOOGLE_APPLICATION_CREDENTIALS')
        status['storage'] = 'configured' if gcs_bucket and gcs_creds else 'not_configured'
        
        # Check SendGrid (basic config check)
        sendgrid_key = current_app.config.get('SENDGRID_API_KEY')
        status['email'] = 'configured' if sendgrid_key else 'not_configured'
        
        return jsonify(status)
        
    except Exception as e:
        current_app.logger.error(f"System status error: {e}")
        return jsonify({'error': 'Failed to fetch system status'}), 500