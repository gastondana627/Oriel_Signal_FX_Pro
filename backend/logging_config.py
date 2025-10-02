"""
Enhanced logging configuration with error tracking and monitoring.
"""
import os
import logging
import logging.config
import json
from datetime import datetime
from flask import request, g


class JSONFormatter(logging.Formatter):
    """Custom JSON formatter for structured logging"""
    
    def format(self, record):
        log_entry = {
            'timestamp': datetime.utcnow().isoformat(),
            'level': record.levelname,
            'logger': record.name,
            'module': record.module,
            'function': record.funcName,
            'line': record.lineno,
            'message': record.getMessage(),
        }
        
        # Add request context if available
        try:
            if hasattr(record, 'request_id'):
                log_entry['request_id'] = record.request_id
            elif hasattr(request, 'id'):
                log_entry['request_id'] = request.id
            
            if hasattr(record, 'user_id'):
                log_entry['user_id'] = record.user_id
            
            if hasattr(record, 'endpoint'):
                log_entry['endpoint'] = record.endpoint
            elif request:
                log_entry['endpoint'] = request.endpoint
                log_entry['method'] = request.method
                log_entry['url'] = request.url
                log_entry['ip_address'] = request.remote_addr
        except RuntimeError:
            # Working outside of request context, skip request-specific fields
            pass
        
        # Add exception info if present
        if record.exc_info:
            log_entry['exception'] = self.formatException(record.exc_info)
        
        # Add extra fields
        for key, value in record.__dict__.items():
            if key not in ['name', 'msg', 'args', 'levelname', 'levelno', 'pathname', 
                          'filename', 'module', 'lineno', 'funcName', 'created', 
                          'msecs', 'relativeCreated', 'thread', 'threadName', 
                          'processName', 'process', 'getMessage', 'exc_info', 'exc_text', 'stack_info']:
                log_entry[key] = value
        
        return json.dumps(log_entry)


class ErrorTrackingHandler(logging.Handler):
    """Custom handler for tracking error patterns and metrics"""
    
    def __init__(self):
        super().__init__()
        self.error_counts = {}
        self.error_patterns = {}
    
    def emit(self, record):
        if record.levelno >= logging.ERROR:
            error_type = getattr(record, 'error_type', 'unknown')
            self.error_counts[error_type] = self.error_counts.get(error_type, 0) + 1
            
            # Track error patterns for monitoring
            if hasattr(record, 'endpoint'):
                pattern_key = f"{record.endpoint}:{error_type}"
                self.error_patterns[pattern_key] = self.error_patterns.get(pattern_key, 0) + 1
    
    def get_error_stats(self):
        """Get error statistics for monitoring"""
        return {
            'error_counts': self.error_counts,
            'error_patterns': self.error_patterns,
            'total_errors': sum(self.error_counts.values())
        }


# Global error tracking handler instance
error_tracker = ErrorTrackingHandler()


def setup_logging(app):
    """
    Configure comprehensive logging for production deployment.
    
    Args:
        app: Flask application instance
    """
    log_level = app.config.get('LOG_LEVEL', 'INFO')
    environment = app.config.get('FLASK_ENV', 'production')
    
    # Create logs directory if it doesn't exist
    log_dir = os.path.join(os.path.dirname(__file__), 'logs')
    os.makedirs(log_dir, exist_ok=True)
    
    # Choose formatter based on environment
    if environment == 'development':
        console_formatter = 'detailed'
        file_formatter = 'detailed'
    else:
        console_formatter = 'json'
        file_formatter = 'json'
    
    # Logging configuration
    logging_config = {
        'version': 1,
        'disable_existing_loggers': False,
        'formatters': {
            'default': {
                'format': '[%(asctime)s] %(levelname)s in %(module)s: %(message)s',
                'datefmt': '%Y-%m-%d %H:%M:%S'
            },
            'detailed': {
                'format': '[%(asctime)s] %(levelname)s [%(name)s.%(funcName)s:%(lineno)d] [%(request_id)s] %(message)s',
                'datefmt': '%Y-%m-%d %H:%M:%S'
            },
            'json': {
                '()': JSONFormatter
            }
        },
        'handlers': {
            'console': {
                'class': 'logging.StreamHandler',
                'level': log_level,
                'formatter': console_formatter,
                'stream': 'ext://sys.stdout'
            },
            'file': {
                'class': 'logging.handlers.RotatingFileHandler',
                'level': 'INFO',
                'formatter': file_formatter,
                'filename': os.path.join(log_dir, 'app.log'),
                'maxBytes': 10485760,  # 10MB
                'backupCount': 10
            },
            'error_file': {
                'class': 'logging.handlers.RotatingFileHandler',
                'level': 'ERROR',
                'formatter': file_formatter,
                'filename': os.path.join(log_dir, 'errors.log'),
                'maxBytes': 10485760,  # 10MB
                'backupCount': 10
            },
            'security_file': {
                'class': 'logging.handlers.RotatingFileHandler',
                'level': 'WARNING',
                'formatter': file_formatter,
                'filename': os.path.join(log_dir, 'security.log'),
                'maxBytes': 5242880,  # 5MB
                'backupCount': 10
            },
            'performance_file': {
                'class': 'logging.handlers.RotatingFileHandler',
                'level': 'INFO',
                'formatter': file_formatter,
                'filename': os.path.join(log_dir, 'performance.log'),
                'maxBytes': 5242880,  # 5MB
                'backupCount': 5
            }
        },
        'loggers': {
            'app': {
                'level': log_level,
                'handlers': ['console', 'file', 'error_file'],
                'propagate': False
            },
            'app.security': {
                'level': 'WARNING',
                'handlers': ['console', 'security_file'],
                'propagate': False
            },
            'app.performance': {
                'level': 'INFO',
                'handlers': ['performance_file'],
                'propagate': False
            },
            'werkzeug': {
                'level': 'WARNING',
                'handlers': ['console'],
                'propagate': False
            },
            'sqlalchemy.engine': {
                'level': 'WARNING',
                'handlers': ['console'],
                'propagate': False
            },
            'stripe': {
                'level': 'INFO',
                'handlers': ['console', 'file'],
                'propagate': False
            },
            'google.cloud': {
                'level': 'WARNING',
                'handlers': ['console', 'file'],
                'propagate': False
            },
            'app.frontend': {
                'level': 'INFO',
                'handlers': ['console', 'file'],
                'propagate': False
            },
            'app.frontend_errors': {
                'level': 'ERROR',
                'handlers': ['console', 'error_file'],
                'propagate': False
            },
            'app.api': {
                'level': 'INFO',
                'handlers': ['console', 'file'],
                'propagate': False
            },
            'app.user_actions': {
                'level': 'INFO',
                'handlers': ['console', 'file'],
                'propagate': False
            },
            'app.logging': {
                'level': 'INFO',
                'handlers': ['console', 'file'],
                'propagate': False
            },
            'app.test': {
                'level': 'DEBUG',
                'handlers': ['console'],
                'propagate': False
            }
        },
        'root': {
            'level': log_level,
            'handlers': ['console']
        }
    }
    
    # Apply logging configuration
    logging.config.dictConfig(logging_config)
    
    # Add error tracking handler to root logger
    root_logger = logging.getLogger()
    root_logger.addHandler(error_tracker)
    
    # Set Flask app logger
    app.logger.setLevel(getattr(logging, log_level))
    
    # Add request context to logs
    @app.before_request
    def log_request_start():
        request_id = getattr(request, 'id', 'unknown')
        app.logger.info(f"Request started: {request.method} {request.url}", 
                       extra={'request_id': request_id, 'endpoint': request.endpoint})
    
    @app.after_request
    def log_request_end(response):
        request_id = getattr(request, 'id', 'unknown')
        app.logger.info(f"Request completed: {response.status_code}", 
                       extra={'request_id': request_id, 'status_code': response.status_code})
        return response
    
    # Log startup information
    app.logger.info(f"Application started in {environment} mode")
    app.logger.info(f"Log level set to {log_level}")
    app.logger.info(f"Logging directory: {log_dir}")
    
    return app.logger


def get_error_stats():
    """Get error statistics for monitoring dashboard"""
    return error_tracker.get_error_stats()


def log_security_event(event_type, message, **kwargs):
    """Log security-related events"""
    security_logger = logging.getLogger('app.security')
    security_logger.warning(f"Security event: {event_type} - {message}", 
                           extra={'event_type': event_type, **kwargs})


def log_performance_metric(metric_name, value, **kwargs):
    """Log performance metrics"""
    performance_logger = logging.getLogger('app.performance')
    performance_logger.info(f"Performance metric: {metric_name} = {value}", 
                           extra={'metric_name': metric_name, 'metric_value': value, **kwargs})