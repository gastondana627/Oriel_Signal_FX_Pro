"""
Rate limiting configuration using Flask-Limiter.
"""
import logging
from flask import request, jsonify
from flask_limiter import Limiter
from flask_limiter.util import get_remote_address

logger = logging.getLogger(__name__)

# Initialize limiter
limiter = Limiter(
    key_func=get_remote_address,
    default_limits=["1000 per hour", "100 per minute"],
    storage_uri="memory://",  # Use Redis in production
    headers_enabled=True
)

def init_limiter(app):
    """
    Initialize rate limiter with Flask app.
    
    Args:
        app: Flask application instance
    """
    # Use Redis if available, otherwise fall back to memory
    redis_url = app.config.get('REDIS_URL')
    if redis_url:
        limiter.storage_uri = redis_url
        logger.info("Rate limiter using Redis storage")
    else:
        logger.warning("Rate limiter using memory storage (not suitable for production)")
    
    limiter.init_app(app)
    
    # Custom error handler for rate limit exceeded
    @app.errorhandler(429)
    def ratelimit_handler(e):
        logger.warning(f"Rate limit exceeded for {request.remote_addr}: {e}")
        return jsonify({
            'error': {
                'code': 'RATE_LIMIT_EXCEEDED',
                'message': 'Too many requests. Please try again later.',
                'retry_after': e.retry_after
            }
        }), 429
    
    logger.info("Rate limiter initialized successfully")

# Rate limiting decorators for different endpoint types
def auth_rate_limit():
    """Rate limit for authentication endpoints."""
    return limiter.limit("10 per minute")

def upload_rate_limit():
    """Rate limit for file upload endpoints."""
    return limiter.limit("5 per minute")

def api_rate_limit():
    """Rate limit for general API endpoints."""
    return limiter.limit("60 per minute")

def download_rate_limit():
    """Rate limit for download endpoints."""
    return limiter.limit("20 per minute")

def admin_rate_limit():
    """Rate limit for admin endpoints."""
    return limiter.limit("100 per minute")