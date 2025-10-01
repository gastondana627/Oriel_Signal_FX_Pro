"""
Error recovery utilities and mechanisms for external service failures.
"""
import time
import logging
from functools import wraps
from typing import Dict, Any, Optional, Callable
from app.errors import (
    ExternalServiceError, StorageError, EmailError, PaymentError,
    handle_external_service_error, CircuitBreaker, retry_with_backoff
)

logger = logging.getLogger(__name__)

# Global circuit breakers for different services
_circuit_breakers: Dict[str, CircuitBreaker] = {}


def get_circuit_breaker(service_name: str, failure_threshold: int = 5, recovery_timeout: int = 60) -> CircuitBreaker:
    """Get or create a circuit breaker for a service"""
    if service_name not in _circuit_breakers:
        _circuit_breakers[service_name] = CircuitBreaker(
            failure_threshold=failure_threshold,
            recovery_timeout=recovery_timeout,
            expected_exception=Exception
        )
    return _circuit_breakers[service_name]


def with_error_recovery(service_name: str, operation: str, max_retries: int = 3, 
                       circuit_breaker: bool = True, fallback: Optional[Callable] = None):
    """
    Decorator that adds comprehensive error recovery to external service calls.
    
    Args:
        service_name: Name of the external service
        operation: Description of the operation being performed
        max_retries: Maximum number of retry attempts
        circuit_breaker: Whether to use circuit breaker pattern
        fallback: Optional fallback function to call if all retries fail
    """
    def decorator(func):
        @wraps(func)
        def wrapper(*args, **kwargs):
            # Apply circuit breaker if enabled
            if circuit_breaker:
                breaker = get_circuit_breaker(service_name)
                func_with_breaker = breaker(func)
            else:
                func_with_breaker = func
            
            # Apply retry mechanism
            func_with_retry = retry_with_backoff(
                max_retries=max_retries,
                exceptions=(Exception,)
            )(func_with_breaker)
            
            try:
                return func_with_retry(*args, **kwargs)
            except Exception as e:
                logger.error(f"All recovery attempts failed for {service_name}.{operation}: {e}")
                
                # Try fallback if available
                if fallback:
                    try:
                        logger.info(f"Attempting fallback for {service_name}.{operation}")
                        return fallback(*args, **kwargs)
                    except Exception as fallback_error:
                        logger.error(f"Fallback also failed for {service_name}.{operation}: {fallback_error}")
                
                # Convert to appropriate service error
                handle_external_service_error(service_name, operation, e)
        
        return wrapper
    return decorator


class StripeErrorRecovery:
    """Stripe-specific error recovery mechanisms"""
    
    @staticmethod
    @with_error_recovery("stripe", "create_session", max_retries=2)
    def create_payment_session_with_recovery(stripe_func, *args, **kwargs):
        """Create Stripe payment session with error recovery"""
        try:
            return stripe_func(*args, **kwargs)
        except Exception as e:
            # Map Stripe-specific errors
            error_message = str(e).lower()
            if 'rate limit' in error_message:
                raise PaymentError("Payment service temporarily busy. Please try again.", 
                                 "STRIPE_RATE_LIMIT", recoverable=True)
            elif 'invalid api key' in error_message:
                raise PaymentError("Payment service configuration error", 
                                 "STRIPE_CONFIG_ERROR", recoverable=False)
            else:
                raise PaymentError(f"Payment service error: {e}", 
                                 "STRIPE_ERROR", recoverable=True)
    
    @staticmethod
    @with_error_recovery("stripe", "webhook_verification", max_retries=1)
    def verify_webhook_with_recovery(verify_func, *args, **kwargs):
        """Verify Stripe webhook with error recovery"""
        return verify_func(*args, **kwargs)


class StorageErrorRecovery:
    """Google Cloud Storage error recovery mechanisms"""
    
    @staticmethod
    def fallback_local_storage(file_path: str, content: bytes) -> str:
        """Fallback to local storage if GCS fails"""
        import os
        import tempfile
        
        # Create temporary file as fallback
        temp_dir = tempfile.gettempdir()
        fallback_path = os.path.join(temp_dir, f"fallback_{int(time.time())}_{os.path.basename(file_path)}")
        
        with open(fallback_path, 'wb') as f:
            f.write(content)
        
        logger.warning(f"Using local fallback storage: {fallback_path}")
        return fallback_path
    
    @staticmethod
    @with_error_recovery("gcs", "upload", max_retries=3, 
                        fallback=lambda *args, **kwargs: StorageErrorRecovery.fallback_local_storage(args[0], args[1]))
    def upload_with_recovery(upload_func, *args, **kwargs):
        """Upload to GCS with error recovery and local fallback"""
        try:
            return upload_func(*args, **kwargs)
        except Exception as e:
            error_message = str(e).lower()
            if 'quota' in error_message or 'limit' in error_message:
                raise StorageError("Storage quota exceeded. Please try again later.", 
                                 {"retry_after": 300})
            elif 'permission' in error_message or 'forbidden' in error_message:
                raise StorageError("Storage permission error", 
                                 {"requires_admin": True})
            else:
                raise StorageError(f"Storage service error: {e}")
    
    @staticmethod
    @with_error_recovery("gcs", "download", max_retries=2)
    def download_with_recovery(download_func, *args, **kwargs):
        """Download from GCS with error recovery"""
        return download_func(*args, **kwargs)
    
    @staticmethod
    @with_error_recovery("gcs", "delete", max_retries=2)
    def delete_with_recovery(delete_func, *args, **kwargs):
        """Delete from GCS with error recovery"""
        return delete_func(*args, **kwargs)


class EmailErrorRecovery:
    """Email service error recovery mechanisms"""
    
    @staticmethod
    def fallback_log_email(to_email: str, subject: str, content: str) -> bool:
        """Fallback to logging email content if sending fails"""
        logger.warning(f"Email fallback - logging email content:")
        logger.warning(f"To: {to_email}")
        logger.warning(f"Subject: {subject}")
        logger.warning(f"Content: {content[:200]}...")
        return True
    
    @staticmethod
    @with_error_recovery("sendgrid", "send_email", max_retries=3,
                        fallback=lambda to, subject, content, **kwargs: EmailErrorRecovery.fallback_log_email(to, subject, content))
    def send_email_with_recovery(send_func, *args, **kwargs):
        """Send email with error recovery and logging fallback"""
        try:
            return send_func(*args, **kwargs)
        except Exception as e:
            error_message = str(e).lower()
            if 'rate limit' in error_message:
                raise EmailError("Email service rate limited. Email will be retried.", 
                               {"retry_after": 60})
            elif 'invalid api key' in error_message:
                raise EmailError("Email service configuration error", 
                               {"requires_admin": True})
            elif 'invalid email' in error_message:
                raise EmailError("Invalid email address provided", 
                               {"field": "email"})
            else:
                raise EmailError(f"Email service error: {e}")


class RenderingErrorRecovery:
    """Video rendering error recovery mechanisms"""
    
    @staticmethod
    @with_error_recovery("rendering", "video_generation", max_retries=2)
    def render_video_with_recovery(render_func, *args, **kwargs):
        """Render video with error recovery"""
        try:
            return render_func(*args, **kwargs)
        except Exception as e:
            error_message = str(e).lower()
            if 'memory' in error_message or 'out of memory' in error_message:
                from app.errors import RenderingResourceError
                raise RenderingResourceError("Insufficient memory for rendering", 
                                           "memory", {"suggestion": "Try a shorter audio file"})
            elif 'disk' in error_message or 'space' in error_message:
                from app.errors import RenderingResourceError
                raise RenderingResourceError("Insufficient disk space for rendering", 
                                           "disk", {"suggestion": "Please try again later"})
            elif 'timeout' in error_message:
                from app.errors import RenderingTimeoutError
                raise RenderingTimeoutError("Rendering operation timed out", 
                                          {"suggestion": "Try a shorter audio file"})
            else:
                from app.errors import RenderingError
                raise RenderingError(f"Rendering failed: {e}")
    
    @staticmethod
    @with_error_recovery("ffmpeg", "video_encoding", max_retries=1)
    def encode_video_with_recovery(encode_func, *args, **kwargs):
        """Encode video with FFmpeg with error recovery"""
        return encode_func(*args, **kwargs)
    
    @staticmethod
    @with_error_recovery("playwright", "browser_automation", max_retries=2)
    def capture_browser_with_recovery(capture_func, *args, **kwargs):
        """Capture browser content with error recovery"""
        return capture_func(*args, **kwargs)


def get_service_health_status() -> Dict[str, Any]:
    """Get health status of all services with circuit breakers"""
    health_status = {}
    
    for service_name, breaker in _circuit_breakers.items():
        health_status[service_name] = {
            'state': breaker.state,
            'failure_count': breaker.failure_count,
            'last_failure_time': breaker.last_failure_time,
            'healthy': breaker.state == 'CLOSED'
        }
    
    return health_status


def reset_circuit_breaker(service_name: str) -> bool:
    """Manually reset a circuit breaker (admin function)"""
    if service_name in _circuit_breakers:
        breaker = _circuit_breakers[service_name]
        breaker.failure_count = 0
        breaker.state = 'CLOSED'
        breaker.last_failure_time = None
        logger.info(f"Circuit breaker for {service_name} has been manually reset")
        return True
    return False


def reset_all_circuit_breakers():
    """Reset all circuit breakers (admin function)"""
    for service_name in _circuit_breakers:
        reset_circuit_breaker(service_name)
    logger.info("All circuit breakers have been reset")