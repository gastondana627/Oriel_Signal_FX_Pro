import os
from datetime import datetime
from flask import jsonify, current_app
from app.main import bp
from app import db

@bp.route('/')
def index():
    """Root endpoint with API information"""
    return jsonify({
        'message': 'Oriel Signal FX Pro Backend API',
        'version': '1.0.0',
        'documentation': '/api/docs/',
        'health': '/health',
        'status': '/status',
        'endpoints': {
            'authentication': '/api/auth/',
            'payments': '/api/payments/',
            'jobs': '/api/jobs/',
            'user': '/api/user/',
            'admin': '/admin/'
        }
    })

@bp.route('/health')
@bp.route('/api/health')
def health_check():
    """Comprehensive health check endpoint for Railway deployment verification"""
    try:
        # Check database connection
        from sqlalchemy import text
        db.session.execute(text('SELECT 1'))
        db_status = 'healthy'
    except Exception as e:
        current_app.logger.error(f"Database health check failed: {e}")
        db_status = 'unhealthy'
    
    # Check Redis connection (if available)
    redis_status = 'not_configured'
    try:
        from app.jobs.queue import get_redis_connection
        redis_conn = get_redis_connection()
        if redis_conn:
            redis_conn.ping()
            redis_status = 'healthy'
    except Exception as e:
        current_app.logger.warning(f"Redis health check failed: {e}")
        redis_status = 'unhealthy'
    
    # Check external services
    external_services = {
        'stripe': 'configured' if current_app.config.get('STRIPE_SECRET_KEY') else 'not_configured',
        'sendgrid': 'configured' if current_app.config.get('SENDGRID_API_KEY') else 'not_configured',
        'gcs': 'configured' if current_app.config.get('GCS_BUCKET_NAME') else 'not_configured'
    }
    
    health_data = {
        'message': 'Oriel Signal FX Pro Backend',
        'status': 'healthy' if db_status == 'healthy' else 'degraded',
        'service': 'backend-api',
        'version': '1.0.0',
        'timestamp': datetime.utcnow().isoformat(),
        'environment': os.environ.get('FLASK_ENV', 'unknown'),
        'checks': {
            'database': db_status,
            'redis': redis_status,
            'external_services': external_services
        }
    }
    
    status_code = 200 if db_status == 'healthy' else 503
    return jsonify(health_data), status_code

@bp.route('/status')
def status():
    """Detailed status endpoint for monitoring"""
    try:
        # Get database info
        db_info = {
            'connected': True,
            'url': current_app.config.get('SQLALCHEMY_DATABASE_URI', '').split('@')[-1] if '@' in current_app.config.get('SQLALCHEMY_DATABASE_URI', '') else 'local'
        }
    except Exception as e:
        db_info = {
            'connected': False,
            'error': str(e)
        }
    
    # Get job queue info
    try:
        from app.jobs.queue import get_redis_connection
        redis_conn = get_redis_connection()
        if redis_conn:
            queue_info = {
                'connected': True,
                'pending_jobs': redis_conn.llen('rq:queue:video_rendering'),
                'failed_jobs': redis_conn.llen('rq:queue:failed')
            }
        else:
            queue_info = {'connected': False}
    except Exception as e:
        queue_info = {
            'connected': False,
            'error': str(e)
        }
    
    return jsonify({
        'service': 'Oriel Signal FX Pro Backend',
        'version': '1.0.0',
        'environment': os.environ.get('FLASK_ENV', 'unknown'),
        'timestamp': datetime.utcnow().isoformat(),
        'uptime': 'N/A',  # Could implement uptime tracking
        'database': db_info,
        'job_queue': queue_info,
        'features': {
            'user_authentication': True,
            'payment_processing': True,
            'video_rendering': True,
            'file_storage': True,
            'email_service': True,
            'user_dashboard': True,
            'admin_interface': True,
            'api_documentation': True
        },
        'cors': {
            'enabled': True,
            'allowed_origins': current_app.config.get('CORS_ORIGINS', []),
            'allowed_methods': ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
            'supports_credentials': True
        }
    })

@bp.route('/api/info')
def api_info():
    """API information and available endpoints"""
    return jsonify({
        'api': {
            'name': 'Oriel Signal FX Pro API',
            'version': '1.0.0',
            'description': 'Backend API for audio-reactive video rendering service',
            'documentation_url': '/api/docs/',
            'base_url': '/api',
            'authentication': 'JWT Bearer Token'
        },
        'endpoints': {
            'authentication': {
                'register': 'POST /api/auth/register',
                'login': 'POST /api/auth/login',
                'refresh': 'POST /api/auth/refresh',
                'reset_password': 'POST /api/auth/reset-password'
            },
            'payments': {
                'create_session': 'POST /api/payments/create-session',
                'webhook': 'POST /api/payments/webhook',
                'status': 'GET /api/payments/status/{session_id}'
            },
            'jobs': {
                'submit': 'POST /api/jobs/submit',
                'status': 'GET /api/jobs/status/{job_id}',
                'download': 'GET /api/jobs/download/{job_id}',
                'list': 'GET /api/jobs/list'
            },
            'user': {
                'profile': 'GET /api/user/profile',
                'history': 'GET /api/user/history',
                'update': 'PUT /api/user/profile'
            }
        },
        'rate_limits': {
            'default': '100 requests per minute',
            'file_upload': '10 requests per minute',
            'payment': '20 requests per minute'
        }
    })

@bp.route('/api/cors-test')
def cors_test():
    """Test endpoint for CORS functionality"""
    from flask import request
    
    return jsonify({
        'message': 'CORS test successful',
        'origin': request.headers.get('Origin'),
        'method': request.method,
        'headers': dict(request.headers),
        'timestamp': datetime.utcnow().isoformat()
    })