"""
Comprehensive error handling and response formatting for the API
"""
from flask import jsonify, current_app, request
from werkzeug.exceptions import HTTPException
import traceback
import logging
import time
from datetime import datetime
from functools import wraps

logger = logging.getLogger(__name__)


class APIError(Exception):
    """Base custom API error class for consistent error responses"""
    
    def __init__(self, message, status_code=400, error_code=None, details=None, recoverable=False):
        super().__init__(message)
        self.message = message
        self.status_code = status_code
        self.error_code = error_code or self._generate_error_code()
        self.details = details or {}
        self.recoverable = recoverable
        self.timestamp = datetime.utcnow().isoformat()
    
    def _generate_error_code(self):
        """Generate error code from status code"""
        code_map = {
            400: 'BAD_REQUEST',
            401: 'UNAUTHORIZED',
            403: 'FORBIDDEN',
            404: 'NOT_FOUND',
            409: 'CONFLICT',
            413: 'PAYLOAD_TOO_LARGE',
            415: 'UNSUPPORTED_MEDIA_TYPE',
            422: 'UNPROCESSABLE_ENTITY',
            429: 'TOO_MANY_REQUESTS',
            500: 'INTERNAL_SERVER_ERROR',
            502: 'BAD_GATEWAY',
            503: 'SERVICE_UNAVAILABLE'
        }
        return code_map.get(self.status_code, 'UNKNOWN_ERROR')
    
    def to_dict(self):
        """Convert error to dictionary for JSON response"""
        return {
            'error': {
                'code': self.error_code,
                'message': self.message,
                'details': self.details,
                'timestamp': self.timestamp,
                'recoverable': self.recoverable
            }
        }


# Authentication and Authorization Errors
class AuthenticationError(APIError):
    """Authentication related errors"""
    def __init__(self, message="Authentication failed", details=None):
        super().__init__(message, 401, 'AUTHENTICATION_FAILED', details)


class AuthorizationError(APIError):
    """Authorization related errors"""
    def __init__(self, message="Access denied", details=None):
        super().__init__(message, 403, 'ACCESS_DENIED', details)


class TokenError(APIError):
    """JWT token related errors"""
    def __init__(self, message="Invalid token", error_code="INVALID_TOKEN", details=None):
        super().__init__(message, 401, error_code, details)


# Payment Processing Errors
class PaymentError(APIError):
    """Payment processing related errors"""
    def __init__(self, message, error_code="PAYMENT_ERROR", details=None, recoverable=True):
        super().__init__(message, 402, error_code, details, recoverable)


class StripeError(PaymentError):
    """Stripe specific errors"""
    def __init__(self, message, stripe_error_type=None, details=None):
        error_code = f"STRIPE_{stripe_error_type.upper()}" if stripe_error_type else "STRIPE_ERROR"
        super().__init__(message, error_code, details, recoverable=True)


# File and Upload Errors
class FileError(APIError):
    """File handling related errors"""
    def __init__(self, message, error_code="FILE_ERROR", details=None):
        super().__init__(message, 400, error_code, details)


class FileValidationError(FileError):
    """File validation errors"""
    def __init__(self, message, details=None):
        super().__init__(message, "FILE_VALIDATION_ERROR", details)


class FileSizeError(FileError):
    """File size related errors"""
    def __init__(self, message, max_size=None, actual_size=None):
        details = {}
        if max_size:
            details['max_size_mb'] = max_size // (1024 * 1024)
        if actual_size:
            details['actual_size_mb'] = actual_size // (1024 * 1024)
        super().__init__(message, "FILE_TOO_LARGE", details)


# Video Rendering Errors
class RenderingError(APIError):
    """Video rendering related errors"""
    def __init__(self, message, error_code="RENDERING_ERROR", details=None, recoverable=True):
        super().__init__(message, 500, error_code, details, recoverable)


class RenderingTimeoutError(RenderingError):
    """Rendering timeout errors"""
    def __init__(self, message="Rendering operation timed out", details=None):
        super().__init__(message, "RENDERING_TIMEOUT", details, recoverable=True)


class RenderingResourceError(RenderingError):
    """Rendering resource errors (memory, disk space, etc.)"""
    def __init__(self, message, resource_type=None, details=None):
        error_code = f"RENDERING_{resource_type.upper()}_ERROR" if resource_type else "RENDERING_RESOURCE_ERROR"
        super().__init__(message, error_code, details, recoverable=True)


# External Service Errors
class ExternalServiceError(APIError):
    """External service related errors"""
    def __init__(self, service_name, message, error_code=None, details=None, recoverable=True):
        if not error_code:
            error_code = f"{service_name.upper()}_SERVICE_ERROR"
        super().__init__(message, 503, error_code, details, recoverable)


class StorageError(ExternalServiceError):
    """Cloud storage related errors"""
    def __init__(self, message, details=None):
        super().__init__("storage", message, "STORAGE_ERROR", details, recoverable=True)


class EmailError(ExternalServiceError):
    """Email service related errors"""
    def __init__(self, message, details=None):
        super().__init__("email", message, "EMAIL_ERROR", details, recoverable=True)


# Database Errors
class DatabaseError(APIError):
    """Database related errors"""
    def __init__(self, message, error_code="DATABASE_ERROR", details=None, recoverable=True):
        super().__init__(message, 500, error_code, details, recoverable)


# Validation Errors
class ValidationError(APIError):
    """Input validation errors"""
    def __init__(self, message, field=None, details=None):
        if field and not details:
            details = {'field': field}
        elif field and details:
            details['field'] = field
        super().__init__(message, 422, 'VALIDATION_ERROR', details)


# Rate Limiting Errors
class RateLimitError(APIError):
    """Rate limiting errors"""
    def __init__(self, message="Rate limit exceeded", retry_after=None, details=None):
        if retry_after and not details:
            details = {'retry_after': retry_after}
        elif retry_after and details:
            details['retry_after'] = retry_after
        super().__init__(message, 429, 'RATE_LIMIT_EXCEEDED', details)


def log_error(error, context=None):
    """Log error with context information"""
    error_info = {
        'error_type': type(error).__name__,
        'error_message': str(error),
        'timestamp': datetime.utcnow().isoformat(),
        'request_id': getattr(request, 'id', None),
        'user_agent': request.headers.get('User-Agent') if request else None,
        'ip_address': request.remote_addr if request else None,
        'endpoint': request.endpoint if request else None,
        'method': request.method if request else None,
        'url': request.url if request else None
    }
    
    if context:
        error_info['context'] = context
    
    if isinstance(error, APIError):
        if error.status_code >= 500:
            logger.error(f"Server error: {error_info}", exc_info=True)
        elif error.status_code >= 400:
            logger.warning(f"Client error: {error_info}")
    else:
        logger.error(f"Unexpected error: {error_info}", exc_info=True)
    
    return error_info


def format_error_response(error, status_code=500, context=None):
    """Format error response consistently for frontend consumption"""
    # Log the error
    log_error(error, context)
    
    if isinstance(error, APIError):
        return jsonify(error.to_dict()), error.status_code
    
    if isinstance(error, HTTPException):
        return jsonify({
            'error': {
                'code': error.name.upper().replace(' ', '_'),
                'message': error.description,
                'details': {},
                'timestamp': datetime.utcnow().isoformat(),
                'recoverable': False
            }
        }), error.code
    
    # For unexpected errors, don't expose internal details in production
    if current_app.config.get('DEBUG'):
        error_details = {
            'type': type(error).__name__,
            'traceback': traceback.format_exc()
        }
    else:
        error_details = {}
    
    return jsonify({
        'error': {
            'code': 'INTERNAL_SERVER_ERROR',
            'message': 'An unexpected error occurred',
            'details': error_details,
            'timestamp': datetime.utcnow().isoformat(),
            'recoverable': False
        }
    }), status_code


# Error Recovery Mechanisms
class CircuitBreaker:
    """Circuit breaker pattern for external service calls"""
    
    def __init__(self, failure_threshold=5, recovery_timeout=60, expected_exception=Exception):
        self.failure_threshold = failure_threshold
        self.recovery_timeout = recovery_timeout
        self.expected_exception = expected_exception
        self.failure_count = 0
        self.last_failure_time = None
        self.state = 'CLOSED'  # CLOSED, OPEN, HALF_OPEN
    
    def __call__(self, func):
        @wraps(func)
        def wrapper(*args, **kwargs):
            if self.state == 'OPEN':
                if time.time() - self.last_failure_time > self.recovery_timeout:
                    self.state = 'HALF_OPEN'
                else:
                    raise ExternalServiceError(
                        "service", 
                        "Service temporarily unavailable due to repeated failures",
                        details={'retry_after': self.recovery_timeout}
                    )
            
            try:
                result = func(*args, **kwargs)
                self._on_success()
                return result
            except self.expected_exception as e:
                self._on_failure()
                raise
        
        return wrapper
    
    def _on_success(self):
        """Reset circuit breaker on successful call"""
        self.failure_count = 0
        self.state = 'CLOSED'
    
    def _on_failure(self):
        """Handle failure and potentially open circuit"""
        self.failure_count += 1
        self.last_failure_time = time.time()
        
        if self.failure_count >= self.failure_threshold:
            self.state = 'OPEN'
            logger.warning(f"Circuit breaker opened after {self.failure_count} failures")


def retry_with_backoff(max_retries=3, backoff_factor=2, exceptions=(Exception,)):
    """Decorator for retrying operations with exponential backoff"""
    def decorator(func):
        @wraps(func)
        def wrapper(*args, **kwargs):
            last_exception = None
            
            for attempt in range(max_retries + 1):
                try:
                    return func(*args, **kwargs)
                except exceptions as e:
                    last_exception = e
                    
                    if attempt == max_retries:
                        logger.error(f"Function {func.__name__} failed after {max_retries + 1} attempts: {e}")
                        break
                    
                    wait_time = backoff_factor ** attempt
                    logger.warning(f"Function {func.__name__} failed (attempt {attempt + 1}), retrying in {wait_time}s: {e}")
                    time.sleep(wait_time)
            
            raise last_exception
        
        return wrapper
    return decorator


def handle_external_service_error(service_name, operation, error):
    """Handle external service errors with appropriate error types"""
    error_message = str(error)
    
    # Map common error patterns to specific error types
    if 'timeout' in error_message.lower():
        raise ExternalServiceError(
            service_name, 
            f"{service_name.title()} service timeout during {operation}",
            f"{service_name.upper()}_TIMEOUT",
            {'operation': operation, 'original_error': error_message}
        )
    elif 'connection' in error_message.lower():
        raise ExternalServiceError(
            service_name,
            f"Connection error to {service_name} service during {operation}",
            f"{service_name.upper()}_CONNECTION_ERROR",
            {'operation': operation, 'original_error': error_message}
        )
    elif 'authentication' in error_message.lower() or 'unauthorized' in error_message.lower():
        raise ExternalServiceError(
            service_name,
            f"Authentication error with {service_name} service",
            f"{service_name.upper()}_AUTH_ERROR",
            {'operation': operation, 'original_error': error_message}
        )
    else:
        raise ExternalServiceError(
            service_name,
            f"Error in {service_name} service during {operation}: {error_message}",
            details={'operation': operation, 'original_error': error_message}
        )


def init_error_handlers(app):
    """Initialize comprehensive error handlers for the Flask app"""
    
    # Add request ID for tracking
    @app.before_request
    def add_request_id():
        request.id = f"{int(time.time())}-{hash(request.remote_addr or 'unknown') % 10000}"
    
    @app.errorhandler(APIError)
    def handle_api_error(error):
        """Handle custom API errors"""
        return format_error_response(error)
    
    @app.errorhandler(AuthenticationError)
    def handle_authentication_error(error):
        """Handle authentication errors"""
        return format_error_response(error)
    
    @app.errorhandler(AuthorizationError)
    def handle_authorization_error(error):
        """Handle authorization errors"""
        return format_error_response(error)
    
    @app.errorhandler(PaymentError)
    def handle_payment_error(error):
        """Handle payment errors"""
        return format_error_response(error)
    
    @app.errorhandler(FileError)
    def handle_file_error(error):
        """Handle file errors"""
        return format_error_response(error)
    
    @app.errorhandler(RenderingError)
    def handle_rendering_error(error):
        """Handle rendering errors"""
        return format_error_response(error)
    
    @app.errorhandler(ExternalServiceError)
    def handle_external_service_error(error):
        """Handle external service errors"""
        return format_error_response(error)
    
    @app.errorhandler(DatabaseError)
    def handle_database_error(error):
        """Handle database errors"""
        return format_error_response(error)
    
    @app.errorhandler(ValidationError)
    def handle_validation_error(error):
        """Handle validation errors"""
        return format_error_response(error)
    
    @app.errorhandler(RateLimitError)
    def handle_rate_limit_error(error):
        """Handle rate limit errors"""
        return format_error_response(error)
    
    @app.errorhandler(400)
    def handle_bad_request(error):
        """Handle bad request errors"""
        return format_error_response(error, context={'http_error': True})
    
    @app.errorhandler(401)
    def handle_unauthorized(error):
        """Handle unauthorized errors"""
        return format_error_response(error, context={'http_error': True})
    
    @app.errorhandler(403)
    def handle_forbidden(error):
        """Handle forbidden errors"""
        return format_error_response(error, context={'http_error': True})
    
    @app.errorhandler(404)
    def handle_not_found(error):
        """Handle not found errors"""
        return format_error_response(error, context={'http_error': True})
    
    @app.errorhandler(405)
    def handle_method_not_allowed(error):
        """Handle method not allowed errors"""
        return jsonify({
            'error': {
                'code': 'METHOD_NOT_ALLOWED',
                'message': f'Method {request.method} not allowed for this endpoint',
                'details': {
                    'allowed_methods': error.valid_methods if hasattr(error, 'valid_methods') else []
                },
                'timestamp': datetime.utcnow().isoformat(),
                'recoverable': False
            }
        }), 405
    
    @app.errorhandler(413)
    def handle_payload_too_large(error):
        """Handle file too large errors"""
        max_size = app.config.get('MAX_CONTENT_LENGTH', 0)
        return jsonify({
            'error': {
                'code': 'FILE_TOO_LARGE',
                'message': f'File size exceeds maximum limit of {max_size // (1024*1024)}MB',
                'details': {
                    'max_size_mb': max_size // (1024*1024),
                    'max_size_bytes': max_size
                },
                'timestamp': datetime.utcnow().isoformat(),
                'recoverable': False
            }
        }), 413
    
    @app.errorhandler(415)
    def handle_unsupported_media_type(error):
        """Handle unsupported media type errors"""
        return jsonify({
            'error': {
                'code': 'UNSUPPORTED_MEDIA_TYPE',
                'message': 'The uploaded file type is not supported',
                'details': {
                    'supported_types': ['audio/mpeg', 'audio/wav', 'audio/mp4', 'audio/x-m4a', 'audio/aac', 'audio/flac', 'audio/ogg'],
                    'received_type': request.content_type
                },
                'timestamp': datetime.utcnow().isoformat(),
                'recoverable': False
            }
        }), 415
    
    @app.errorhandler(422)
    def handle_unprocessable_entity(error):
        """Handle validation errors"""
        return jsonify({
            'error': {
                'code': 'VALIDATION_ERROR',
                'message': 'The request contains invalid data',
                'details': getattr(error, 'data', {}) if hasattr(error, 'data') else {},
                'timestamp': datetime.utcnow().isoformat(),
                'recoverable': True
            }
        }), 422
    
    @app.errorhandler(429)
    def handle_rate_limit_exceeded(error):
        """Handle rate limit exceeded errors"""
        retry_after = getattr(error, 'retry_after', 60)
        return jsonify({
            'error': {
                'code': 'RATE_LIMIT_EXCEEDED',
                'message': 'Too many requests. Please try again later.',
                'details': {
                    'retry_after': retry_after,
                    'limit_type': getattr(error, 'limit_type', 'general')
                },
                'timestamp': datetime.utcnow().isoformat(),
                'recoverable': True
            }
        }), 429
    
    @app.errorhandler(500)
    def handle_internal_server_error(error):
        """Handle internal server errors"""
        return format_error_response(error, 500, context={'http_error': True})
    
    @app.errorhandler(502)
    def handle_bad_gateway(error):
        """Handle bad gateway errors"""
        return jsonify({
            'error': {
                'code': 'BAD_GATEWAY',
                'message': 'External service error. Please try again later.',
                'details': {},
                'timestamp': datetime.utcnow().isoformat(),
                'recoverable': True
            }
        }), 502
    
    @app.errorhandler(503)
    def handle_service_unavailable(error):
        """Handle service unavailable errors"""
        return jsonify({
            'error': {
                'code': 'SERVICE_UNAVAILABLE',
                'message': 'Service temporarily unavailable. Please try again later.',
                'details': {
                    'retry_after': 60
                },
                'timestamp': datetime.utcnow().isoformat(),
                'recoverable': True
            }
        }), 503
    
    @app.errorhandler(Exception)
    def handle_unexpected_error(error):
        """Handle any unexpected errors"""
        # Log critical errors with full context
        logger.critical(f"Unexpected error in request {getattr(request, 'id', 'unknown')}: {error}", 
                       exc_info=True, extra={
                           'request_id': getattr(request, 'id', None),
                           'endpoint': request.endpoint,
                           'method': request.method,
                           'url': request.url,
                           'user_agent': request.headers.get('User-Agent'),
                           'ip_address': request.remote_addr
                       })
        
        return format_error_response(error, 500, context={'unexpected_error': True})
    
    # Database connection error handling
    from sqlalchemy.exc import SQLAlchemyError, DisconnectionError, TimeoutError as SQLTimeoutError
    
    @app.errorhandler(SQLAlchemyError)
    def handle_database_error(error):
        """Handle database errors"""
        if isinstance(error, DisconnectionError):
            db_error = DatabaseError(
                "Database connection lost. Please try again.",
                "DATABASE_CONNECTION_ERROR",
                recoverable=True
            )
        elif isinstance(error, SQLTimeoutError):
            db_error = DatabaseError(
                "Database operation timed out. Please try again.",
                "DATABASE_TIMEOUT",
                recoverable=True
            )
        else:
            db_error = DatabaseError(
                "Database error occurred. Please try again.",
                "DATABASE_ERROR",
                recoverable=True
            )
        
        return format_error_response(db_error)


def success_response(data=None, message=None, status_code=200):
    """Create consistent success response format"""
    response = {}
    
    if message:
        response['message'] = message
    
    if data is not None:
        response['data'] = data
    
    return jsonify(response), status_code


def paginated_response(items, page, per_page, total, endpoint=None, **kwargs):
    """Create paginated response format"""
    from flask import url_for, request
    
    # Calculate pagination info
    has_prev = page > 1
    has_next = page * per_page < total
    prev_page = page - 1 if has_prev else None
    next_page = page + 1 if has_next else None
    
    # Build URLs if endpoint provided
    prev_url = None
    next_url = None
    if endpoint:
        if has_prev:
            prev_url = url_for(endpoint, page=prev_page, per_page=per_page, **kwargs)
        if has_next:
            next_url = url_for(endpoint, page=next_page, per_page=per_page, **kwargs)
    
    return jsonify({
        'data': items,
        'pagination': {
            'page': page,
            'per_page': per_page,
            'total': total,
            'pages': (total + per_page - 1) // per_page,
            'has_prev': has_prev,
            'has_next': has_next,
            'prev_url': prev_url,
            'next_url': next_url
        }
    })