"""
Request/Response logging middleware for enhanced API monitoring.
"""
import time
import uuid
import logging
from flask import request, g, current_app
from functools import wraps

# Get logger for middleware
logger = logging.getLogger('app.api')


def init_request_logging(app):
    """
    Initialize request/response logging middleware for the Flask app.
    
    Args:
        app: Flask application instance
    """
    
    @app.before_request
    def before_request():
        """Log incoming requests and set up request context."""
        # Generate unique request ID
        g.request_id = str(uuid.uuid4())
        g.start_time = time.time()
        
        # Skip logging for health checks and static files
        if should_skip_logging(request.path):
            return
        
        # Log request details
        logger.info(
            f"Request started: {request.method} {request.path}",
            extra={
                'request_id': g.request_id,
                'method': request.method,
                'path': request.path,
                'query_string': request.query_string.decode('utf-8'),
                'remote_addr': request.remote_addr,
                'user_agent': request.headers.get('User-Agent', ''),
                'content_type': request.headers.get('Content-Type', ''),
                'content_length': request.headers.get('Content-Length', 0),
                'referrer': request.headers.get('Referer', ''),
                'action_type': 'request_start'
            }
        )
        
        # Log request body for POST/PUT requests (excluding sensitive data)
        if request.method in ['POST', 'PUT', 'PATCH'] and request.is_json:
            try:
                request_data = request.get_json()
                # Filter out sensitive fields
                filtered_data = filter_sensitive_data(request_data)
                
                logger.debug(
                    f"Request body: {request.method} {request.path}",
                    extra={
                        'request_id': g.request_id,
                        'request_body': filtered_data,
                        'action_type': 'request_body'
                    }
                )
            except Exception as e:
                logger.warning(
                    f"Failed to log request body: {e}",
                    extra={'request_id': g.request_id}
                )
    
    @app.after_request
    def after_request(response):
        """Log response details and performance metrics."""
        # Skip logging for health checks and static files
        if should_skip_logging(request.path):
            return response
        
        # Calculate request duration
        duration = time.time() - g.get('start_time', time.time())
        
        # Determine log level based on status code
        if response.status_code >= 500:
            log_level = logging.ERROR
        elif response.status_code >= 400:
            log_level = logging.WARNING
        else:
            log_level = logging.INFO
        
        # Log response details
        logger.log(
            log_level,
            f"Request completed: {response.status_code} {request.method} {request.path}",
            extra={
                'request_id': g.get('request_id', 'unknown'),
                'method': request.method,
                'path': request.path,
                'status_code': response.status_code,
                'duration_ms': round(duration * 1000, 2),
                'response_size': len(response.get_data()),
                'content_type': response.headers.get('Content-Type', ''),
                'action_type': 'request_complete'
            }
        )
        
        # Log slow requests
        if duration > current_app.config.get('SLOW_REQUEST_THRESHOLD', 1.0):
            logger.warning(
                f"Slow request detected: {duration:.2f}s for {request.method} {request.path}",
                extra={
                    'request_id': g.get('request_id', 'unknown'),
                    'duration_ms': round(duration * 1000, 2),
                    'action_type': 'slow_request'
                }
            )
        
        # Add request ID to response headers for debugging
        response.headers['X-Request-ID'] = g.get('request_id', 'unknown')
        
        return response
    
    @app.teardown_request
    def teardown_request(exception):
        """Log any exceptions that occurred during request processing."""
        if exception:
            logger.error(
                f"Request failed with exception: {exception}",
                extra={
                    'request_id': g.get('request_id', 'unknown'),
                    'method': request.method,
                    'path': request.path,
                    'exception_type': type(exception).__name__,
                    'exception_message': str(exception),
                    'action_type': 'request_exception'
                },
                exc_info=True
            )


def should_skip_logging(path):
    """
    Determine if a request path should be skipped from logging.
    
    Args:
        path (str): Request path
        
    Returns:
        bool: True if logging should be skipped
    """
    skip_paths = [
        '/health',
        '/api/monitoring/health',
        '/favicon.ico',
        '/static/',
        '/assets/'
    ]
    
    return any(path.startswith(skip_path) for skip_path in skip_paths)


def filter_sensitive_data(data):
    """
    Filter out sensitive data from request/response logging.
    
    Args:
        data (dict): Request/response data
        
    Returns:
        dict: Filtered data with sensitive fields removed or masked
    """
    if not isinstance(data, dict):
        return data
    
    sensitive_fields = [
        'password',
        'token',
        'secret',
        'key',
        'authorization',
        'credit_card',
        'ssn',
        'social_security'
    ]
    
    filtered = {}
    for key, value in data.items():
        key_lower = key.lower()
        
        # Check if field is sensitive
        if any(sensitive_field in key_lower for sensitive_field in sensitive_fields):
            filtered[key] = '[REDACTED]'
        elif isinstance(value, dict):
            filtered[key] = filter_sensitive_data(value)
        elif isinstance(value, list):
            filtered[key] = [filter_sensitive_data(item) if isinstance(item, dict) else item for item in value]
        else:
            filtered[key] = value
    
    return filtered


def log_user_action(action, user_id=None, details=None):
    """
    Log user actions with context.
    
    Args:
        action (str): Action performed by user
        user_id (str, optional): User identifier
        details (dict, optional): Additional action details
    """
    user_logger = logging.getLogger('app.user_actions')
    
    user_logger.info(
        f"User action: {action}",
        extra={
            'request_id': g.get('request_id', 'unknown'),
            'user_id': user_id,
            'action': action,
            'details': details or {},
            'timestamp': time.time(),
            'ip_address': request.remote_addr if request else None,
            'user_agent': request.headers.get('User-Agent', '') if request else '',
            'action_type': 'user_action'
        }
    )


def log_api_error(error, context=None):
    """
    Log API errors with full context.
    
    Args:
        error (Exception): Error that occurred
        context (dict, optional): Additional error context
    """
    api_logger = logging.getLogger('app.api')
    
    api_logger.error(
        f"API error: {str(error)}",
        extra={
            'request_id': g.get('request_id', 'unknown'),
            'error_type': type(error).__name__,
            'error_message': str(error),
            'context': context or {},
            'method': request.method if request else None,
            'path': request.path if request else None,
            'action_type': 'api_error'
        },
        exc_info=True
    )


def log_performance_metric(metric_name, value, context=None):
    """
    Log performance metrics.
    
    Args:
        metric_name (str): Name of the performance metric
        value (float): Metric value
        context (dict, optional): Additional metric context
    """
    perf_logger = logging.getLogger('app.performance')
    
    perf_logger.info(
        f"Performance metric: {metric_name} = {value}",
        extra={
            'request_id': g.get('request_id', 'unknown'),
            'metric_name': metric_name,
            'metric_value': value,
            'context': context or {},
            'timestamp': time.time(),
            'action_type': 'performance_metric'
        }
    )