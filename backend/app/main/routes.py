import os
from datetime import datetime
from flask import jsonify, current_app
from app.main import bp
from app import db

@bp.route('/')
@bp.route('/health')
def health_check():
    """Comprehensive health check endpoint for Railway deployment verification"""
    try:
        # Check database connection
        db.session.execute('SELECT 1')
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
    
    health_data = {
        'message': 'Oriel Signal FX Pro Backend',
        'status': 'healthy' if db_status == 'healthy' else 'degraded',
        'service': 'backend-api',
        'version': '1.0.0',
        'timestamp': datetime.utcnow().isoformat(),
        'environment': os.environ.get('FLASK_ENV', 'unknown'),
        'checks': {
            'database': db_status,
            'redis': redis_status
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
    
    return jsonify({
        'service': 'Oriel Signal FX Pro Backend',
        'version': '1.0.0',
        'environment': os.environ.get('FLASK_ENV', 'unknown'),
        'timestamp': datetime.utcnow().isoformat(),
        'uptime': 'N/A',  # Could implement uptime tracking
        'database': db_info,
        'features': {
            'user_authentication': True,
            'payment_processing': True,
            'video_rendering': True,
            'file_storage': True,
            'email_service': True,
            'user_dashboard': True
        }
    })