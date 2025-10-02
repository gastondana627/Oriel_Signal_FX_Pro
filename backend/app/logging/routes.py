"""
Enhanced logging routes for handling frontend logs and providing logging endpoints.
"""
import logging
from datetime import datetime
from flask import Blueprint, request, jsonify, current_app
from flask_cors import cross_origin

# Create logging blueprint
logging_bp = Blueprint('logging', __name__, url_prefix='/api')

# Get logger for this module
logger = logging.getLogger('app.logging')


@logging_bp.route('/logs', methods=['POST', 'OPTIONS'])
@cross_origin(origins=['http://127.0.0.1:3000', 'http://localhost:3000'], 
              methods=['POST', 'OPTIONS'],
              allow_headers=['Content-Type'])
def receive_frontend_logs():
    """
    Receive and process logs from frontend applications.
    
    Expected payload:
    {
        "logs": [
            {
                "timestamp": "2023-10-01T12:00:00.000Z",
                "level": "INFO",
                "message": "User action performed",
                "sessionId": "sess_123456",
                "requestId": "req_789",
                "userContext": {...},
                "context": {...}
            }
        ],
        "sessionId": "sess_123456"
    }
    """
    if request.method == 'OPTIONS':
        return '', 200
        
    try:
        data = request.get_json()
        
        if not data or 'logs' not in data:
            return jsonify({'error': 'Invalid payload: logs array required'}), 400
        
        logs = data['logs']
        session_id = data.get('sessionId', 'unknown')
        
        # Process each log entry
        processed_count = 0
        for log_entry in logs:
            try:
                process_frontend_log(log_entry, session_id)
                processed_count += 1
            except Exception as e:
                logger.error(f"Failed to process log entry: {e}", 
                           extra={'log_entry': log_entry, 'session_id': session_id})
        
        logger.info(f"Processed {processed_count}/{len(logs)} frontend log entries",
                   extra={'session_id': session_id, 'total_logs': len(logs)})
        
        return jsonify({
            'status': 'success',
            'processed': processed_count,
            'total': len(logs)
        })
        
    except Exception as e:
        logger.error(f"Frontend log processing failed: {e}")
        return jsonify({'error': 'Internal server error'}), 500


def process_frontend_log(log_entry, session_id):
    """
    Process a single frontend log entry and route it to appropriate backend logger.
    
    Args:
        log_entry (dict): Frontend log entry
        session_id (str): Session identifier
    """
    try:
        # Extract log details
        level = log_entry.get('level', 'INFO').upper()
        message = log_entry.get('message', 'No message')
        timestamp = log_entry.get('timestamp')
        request_id = log_entry.get('requestId')
        user_context = log_entry.get('userContext', {})
        context = log_entry.get('context', {})
        error_info = log_entry.get('error')
        
        # Create extra context for backend logging
        extra_context = {
            'frontend_log': True,
            'session_id': session_id,
            'request_id': request_id,
            'user_context': user_context,
            'frontend_context': context,
            'frontend_timestamp': timestamp,
            'url': log_entry.get('url'),
            'user_agent': log_entry.get('userAgent')
        }
        
        # Add error information if present
        if error_info:
            extra_context['frontend_error'] = error_info
        
        # Route to appropriate logger based on context
        target_logger = get_target_logger(context, level)
        
        # Format message with frontend context
        formatted_message = f"[FRONTEND] {message}"
        
        # Log with appropriate level
        if level == 'DEBUG':
            target_logger.debug(formatted_message, extra=extra_context)
        elif level == 'INFO':
            target_logger.info(formatted_message, extra=extra_context)
        elif level == 'WARN':
            target_logger.warning(formatted_message, extra=extra_context)
        elif level in ['ERROR', 'CRITICAL']:
            target_logger.error(formatted_message, extra=extra_context)
        else:
            target_logger.info(formatted_message, extra=extra_context)
            
    except Exception as e:
        logger.error(f"Failed to process frontend log entry: {e}", 
                    extra={'log_entry': log_entry})


def get_target_logger(context, level):
    """
    Determine the appropriate backend logger based on log context.
    
    Args:
        context (dict): Log context
        level (str): Log level
        
    Returns:
        logging.Logger: Target logger instance
    """
    action_type = context.get('actionType', '')
    
    # Route to specialized loggers based on action type
    if action_type in ['api_request', 'api_response']:
        return logging.getLogger('app.api')
    elif action_type == 'user_action':
        return logging.getLogger('app.user_actions')
    elif action_type == 'performance':
        return logging.getLogger('app.performance')
    elif level in ['ERROR', 'CRITICAL']:
        return logging.getLogger('app.frontend_errors')
    else:
        return logging.getLogger('app.frontend')


@logging_bp.route('/logs/stats', methods=['GET'])
@cross_origin()
def get_logging_stats():
    """
    Get logging statistics and health information.
    """
    try:
        from ..logging_config import get_error_stats
        
        stats = {
            'status': 'healthy',
            'timestamp': datetime.utcnow().isoformat(),
            'error_stats': get_error_stats(),
            'log_levels': ['DEBUG', 'INFO', 'WARN', 'ERROR', 'CRITICAL'],
            'available_loggers': [
                'app',
                'app.api', 
                'app.user_actions',
                'app.performance',
                'app.frontend',
                'app.frontend_errors',
                'app.security'
            ]
        }
        
        return jsonify(stats)
        
    except Exception as e:
        logger.error(f"Failed to get logging stats: {e}")
        return jsonify({'error': 'Failed to retrieve stats'}), 500


@logging_bp.route('/logs/test', methods=['POST'])
@cross_origin()
def test_logging():
    """
    Test endpoint for validating logging functionality.
    """
    try:
        data = request.get_json() or {}
        test_message = data.get('message', 'Test log message')
        test_level = data.get('level', 'INFO').upper()
        
        # Log test message
        test_logger = logging.getLogger('app.test')
        
        if test_level == 'DEBUG':
            test_logger.debug(test_message, extra={'test_log': True})
        elif test_level == 'INFO':
            test_logger.info(test_message, extra={'test_log': True})
        elif test_level == 'WARN':
            test_logger.warning(test_message, extra={'test_log': True})
        elif test_level == 'ERROR':
            test_logger.error(test_message, extra={'test_log': True})
        
        return jsonify({
            'status': 'success',
            'message': f'Test log sent: {test_message}',
            'level': test_level
        })
        
    except Exception as e:
        logger.error(f"Logging test failed: {e}")
        return jsonify({'error': 'Test failed'}), 500