from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required, get_jwt_identity
from app.security import auth_rate_limit
import logging
from datetime import datetime

bp = Blueprint('monitoring', __name__)
logger = logging.getLogger(__name__)

@bp.route('/errors', methods=['POST', 'OPTIONS'])
@auth_rate_limit()
def log_error():
    """Log frontend errors"""
    # Handle OPTIONS request for CORS
    if request.method == 'OPTIONS':
        return jsonify({'status': 'ok'}), 200
        
    try:
        data = request.get_json() or {}
        
        # Log the error
        error_info = {
            'timestamp': data.get('timestamp', datetime.utcnow().isoformat()),
            'message': data.get('message', 'Unknown error'),
            'stack': data.get('stack', ''),
            'url': data.get('url', ''),
            'user_agent': request.headers.get('User-Agent', ''),
            'user_id': get_jwt_identity() if request.headers.get('Authorization') else None
        }
        
        logger.error(f"Frontend error: {error_info}")
        
        return jsonify({
            'success': True,
            'message': 'Error logged successfully'
        }), 200
        
    except Exception as e:
        logger.error(f"Error logging frontend error: {str(e)}")
        return jsonify({
            'error': {
                'code': 'LOGGING_ERROR',
                'message': 'Failed to log error'
            }
        }), 500


@bp.route('/performance', methods=['POST', 'OPTIONS'])
@auth_rate_limit()
def log_performance():
    """Log performance metrics"""
    # Handle OPTIONS request for CORS
    if request.method == 'OPTIONS':
        return jsonify({'status': 'ok'}), 200
        
    try:
        data = request.get_json() or {}
        
        # Log performance data
        perf_info = {
            'timestamp': data.get('timestamp', datetime.utcnow().isoformat()),
            'metrics': data.get('metrics', {}),
            'user_id': get_jwt_identity() if request.headers.get('Authorization') else None
        }
        
        logger.info(f"Performance metrics: {perf_info}")
        
        return jsonify({
            'success': True,
            'message': 'Performance data logged successfully'
        }), 200
        
    except Exception as e:
        logger.error(f"Error logging performance data: {str(e)}")
        return jsonify({
            'error': {
                'code': 'PERFORMANCE_LOGGING_ERROR',
                'message': 'Failed to log performance data'
            }
        }), 500


@bp.route('/analytics', methods=['POST', 'OPTIONS'])
@auth_rate_limit()
def log_analytics():
    """Log analytics events"""
    # Handle OPTIONS request for CORS
    if request.method == 'OPTIONS':
        return jsonify({'status': 'ok'}), 200
        
    try:
        data = request.get_json() or {}
        
        # Log analytics event
        analytics_info = {
            'timestamp': data.get('timestamp', datetime.utcnow().isoformat()),
            'event': data.get('event', 'unknown'),
            'properties': data.get('properties', {}),
            'user_id': get_jwt_identity() if request.headers.get('Authorization') else None
        }
        
        logger.info(f"Analytics event: {analytics_info}")
        
        return jsonify({
            'success': True,
            'message': 'Analytics event logged successfully'
        }), 200
        
    except Exception as e:
        logger.error(f"Error logging analytics event: {str(e)}")
        return jsonify({
            'error': {
                'code': 'ANALYTICS_LOGGING_ERROR',
                'message': 'Failed to log analytics event'
            }
        }), 500