"""
Security configuration and HTTPS enforcement
"""
from flask import Flask, request, redirect, url_for
from flask_talisman import Talisman
import logging

logger = logging.getLogger(__name__)

def init_security_headers(app: Flask):
    """Initialize security headers and HTTPS enforcement"""
    
    # Content Security Policy
    csp = {
        'default-src': "'self'",
        'script-src': [
            "'self'",
            "'unsafe-inline'",  # Required for some admin interface functionality
            "https://js.stripe.com",
            "https://cdn.jsdelivr.net"
        ],
        'style-src': [
            "'self'",
            "'unsafe-inline'",  # Required for admin interface
            "https://fonts.googleapis.com",
            "https://cdn.jsdelivr.net"
        ],
        'font-src': [
            "'self'",
            "https://fonts.gstatic.com",
            "data:"
        ],
        'img-src': [
            "'self'",
            "data:",
            "https:",
            "blob:"
        ],
        'connect-src': [
            "'self'",
            "https://api.stripe.com",
            "https://storage.googleapis.com"
        ],
        'media-src': [
            "'self'",
            "https://storage.googleapis.com",
            "blob:"
        ],
        'object-src': "'none'",
        'base-uri': "'self'",
        'form-action': "'self'",
        'frame-ancestors': "'none'",
        'upgrade-insecure-requests': True
    }
    
    # Only initialize Talisman in production
    if not app.debug and app.config.get('ENV') != 'development':
        # Initialize Talisman for security headers
        Talisman(
            app,
            force_https=app.config.get('HTTPS_ONLY', False),
            strict_transport_security=True,
            strict_transport_security_max_age=31536000,  # 1 year
            strict_transport_security_include_subdomains=True,
            content_security_policy=csp,
            content_security_policy_nonce_in=['script-src', 'style-src'],
            referrer_policy='strict-origin-when-cross-origin',
            permissions_policy={
                'geolocation': '()',
                'microphone': '()',
                'camera': '()',
                'payment': '(self)',
                'usb': '()',
                'magnetometer': '()',
                'accelerometer': '()',
                'gyroscope': '()',
                'clipboard-read': '()',
                'clipboard-write': '(self)'
            }
        )
    
    @app.before_request
    def enforce_https():
        """Enforce HTTPS in production"""
        if app.config.get('HTTPS_ONLY', False):
            if not request.is_secure and request.headers.get('X-Forwarded-Proto') != 'https':
                # Redirect HTTP to HTTPS
                return redirect(request.url.replace('http://', 'https://'), code=301)
    
    @app.after_request
    def add_security_headers(response):
        """Add additional security headers"""
        
        # Prevent clickjacking
        response.headers['X-Frame-Options'] = 'DENY'
        
        # Prevent MIME type sniffing
        response.headers['X-Content-Type-Options'] = 'nosniff'
        
        # Enable XSS protection
        response.headers['X-XSS-Protection'] = '1; mode=block'
        
        # Remove server information
        response.headers.pop('Server', None)
        
        # Add custom security headers
        response.headers['X-Permitted-Cross-Domain-Policies'] = 'none'
        response.headers['Cross-Origin-Embedder-Policy'] = 'require-corp'
        response.headers['Cross-Origin-Opener-Policy'] = 'same-origin'
        response.headers['Cross-Origin-Resource-Policy'] = 'same-origin'
        
        # Cache control for sensitive pages
        if request.endpoint and any(sensitive in request.endpoint for sensitive in ['admin', 'auth', 'user']):
            response.headers['Cache-Control'] = 'no-cache, no-store, must-revalidate, private'
            response.headers['Pragma'] = 'no-cache'
            response.headers['Expires'] = '0'
        
        return response
    
    logger.info("Security headers and HTTPS enforcement initialized")

def validate_request_origin(app: Flask):
    """Validate request origin to prevent CSRF attacks"""
    
    @app.before_request
    def check_origin():
        """Check request origin for state-changing operations"""
        
        # Skip origin check in development
        if app.config.get('ENV') == 'development' or app.debug:
            return
        
        # Skip origin check for safe methods
        if request.method in ['GET', 'HEAD', 'OPTIONS']:
            return
        
        # Skip for API endpoints with proper authentication
        if request.path.startswith('/api/') and request.headers.get('Authorization'):
            return
        
        # Skip for localhost and development
        if request.remote_addr in ['127.0.0.1', 'localhost', '::1']:
            return
        
        # Get allowed origins
        allowed_origins = app.config.get('CORS_ORIGINS', [])
        if isinstance(allowed_origins, str):
            allowed_origins = allowed_origins.split(',')
        
        # Add localhost origins for development
        localhost_origins = [
            'http://localhost:3000',
            'http://localhost:5000',
            'http://127.0.0.1:3000',
            'http://127.0.0.1:5000'
        ]
        allowed_origins.extend(localhost_origins)
        
        # Check Origin header
        origin = request.headers.get('Origin')
        referer = request.headers.get('Referer')
        
        if origin:
            if origin not in allowed_origins:
                logger.warning(f"Request from unauthorized origin: {origin}")
                return {'error': 'Unauthorized origin'}, 403
        elif referer:
            # Fallback to Referer header
            from urllib.parse import urlparse
            referer_origin = f"{urlparse(referer).scheme}://{urlparse(referer).netloc}"
            if referer_origin not in allowed_origins:
                logger.warning(f"Request from unauthorized referer: {referer_origin}")
                return {'error': 'Unauthorized referer'}, 403
        # Allow requests without origin/referer in development
        elif not app.config.get('HTTPS_ONLY', False):
            return

def init_rate_limiting(app: Flask):
    """Initialize advanced rate limiting"""
    
    from flask_limiter import Limiter
    from flask_limiter.util import get_remote_address
    import redis
    
    # Use Redis for rate limiting storage in production
    if app.config.get('RATELIMIT_STORAGE_URL'):
        storage_uri = app.config['RATELIMIT_STORAGE_URL']
    else:
        storage_uri = "memory://"
    
    limiter = Limiter(
        app,
        key_func=get_remote_address,
        storage_uri=storage_uri,
        default_limits=["1000 per hour", "100 per minute"]
    )
    
    # Apply stricter limits to sensitive endpoints
    @limiter.limit("5 per minute")
    @app.route('/api/auth/login', methods=['POST'])
    def login_rate_limit():
        pass
    
    @limiter.limit("3 per minute")
    @app.route('/api/auth/register', methods=['POST'])
    def register_rate_limit():
        pass
    
    @limiter.limit("2 per minute")
    @app.route('/api/auth/reset-password', methods=['POST'])
    def reset_password_rate_limit():
        pass
    
    @limiter.limit("10 per minute")
    @app.route('/api/payments/create-session', methods=['POST'])
    def payment_rate_limit():
        pass
    
    @limiter.limit("20 per minute")
    @app.route('/api/jobs/submit', methods=['POST'])
    def job_submit_rate_limit():
        pass
    
    logger.info("Advanced rate limiting initialized")

def init_input_validation(app: Flask):
    """Initialize request input validation"""
    
    @app.before_request
    def validate_request_size():
        """Validate request size to prevent DoS attacks"""
        
        max_content_length = app.config.get('MAX_CONTENT_LENGTH', 50 * 1024 * 1024)  # 50MB default
        
        if request.content_length and request.content_length > max_content_length:
            logger.warning(f"Request too large: {request.content_length} bytes")
            return {'error': 'Request too large'}, 413
    
    @app.before_request
    def validate_content_type():
        """Validate content type for POST/PUT requests"""
        
        if request.method in ['POST', 'PUT', 'PATCH']:
            content_type = request.content_type
            
            # Allow specific content types
            allowed_types = [
                'application/json',
                'application/x-www-form-urlencoded',
                'multipart/form-data',
                'text/plain'
            ]
            
            if content_type and not any(allowed in content_type for allowed in allowed_types):
                logger.warning(f"Invalid content type: {content_type}")
                return {'error': 'Invalid content type'}, 400
    
    @app.before_request
    def validate_user_agent():
        """Validate User-Agent header to block suspicious requests"""
        
        # Skip user agent validation in development
        if app.config.get('ENV') == 'development' or app.debug:
            return
        
        user_agent = request.headers.get('User-Agent', '').lower()
        
        # Block known malicious user agents
        blocked_agents = [
            'sqlmap',
            'nikto',
            'nmap',
            'masscan',
            'zap',
            'burp',
            'w3af',
            'havij',
            'pangolin',
            'jsql',
            'sqlninja'
        ]
        
        if any(blocked in user_agent for blocked in blocked_agents):
            logger.warning(f"Blocked malicious user agent: {user_agent}")
            return {'error': 'Access denied'}, 403

def init_security_monitoring(app: Flask):
    """Initialize security event monitoring"""
    
    @app.after_request
    def log_security_events(response):
        """Log security-related events"""
        
        # Log failed authentication attempts
        if response.status_code == 401 and request.path.startswith('/api/auth/'):
            logger.warning(f"Failed authentication attempt from {request.remote_addr} to {request.path}")
        
        # Log access to admin endpoints
        if request.path.startswith('/admin/') and response.status_code == 200:
            logger.info(f"Admin access from {request.remote_addr} to {request.path}")
        
        # Log suspicious 4xx responses
        if 400 <= response.status_code < 500 and response.status_code not in [401, 404]:
            logger.warning(f"Suspicious {response.status_code} response from {request.remote_addr} to {request.path}")
        
        return response

def init_all_security_features(app: Flask):
    """Initialize all security features"""
    
    logger.info("Initializing security features...")
    
    # Always add basic security headers
    init_security_headers(app)
    
    # Only enable strict security in production
    if not app.debug and app.config.get('ENV') != 'development':
        logger.info("Production mode: enabling strict security features")
        
        # Request origin validation
        validate_request_origin(app)
        
        # Advanced rate limiting
        init_rate_limiting(app)
        
        # Input validation
        init_input_validation(app)
    else:
        logger.info("Development mode: using relaxed security settings")
    
    # Always enable security monitoring
    init_security_monitoring(app)
    
    logger.info("Security features initialized successfully")