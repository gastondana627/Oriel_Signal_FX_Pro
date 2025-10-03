from flask import Flask
from flask_sqlalchemy import SQLAlchemy
from flask_migrate import Migrate
from flask_jwt_extended import JWTManager
from flask_cors import CORS
from config import config

db = SQLAlchemy()
migrate = Migrate()
jwt = JWTManager()

def create_app(config_name='default'):
    app = Flask(__name__)
    app.config.from_object(config[config_name])
    
    # Initialize extensions
    db.init_app(app)
    migrate.init_app(app, db)
    jwt.init_app(app)
    
    # Configure CORS with detailed settings
    CORS(app, 
         resources={
             r"/api/*": {
                 "origins": app.config['CORS_ORIGINS'],
                 "methods": ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
                 "allow_headers": ["Content-Type", "Authorization", "X-Requested-With"],
                 "expose_headers": ["X-Total-Count", "X-Page-Count"],
                 "supports_credentials": True,
                 "max_age": 3600
             }
         })
    
    # Initialize security features
    from app.security import init_limiter
    init_limiter(app)
    
    # Initialize comprehensive security only in production
    if not app.debug and config_name == 'production':
        from app.security_config import init_all_security_features
        init_all_security_features(app)
    
    # Initialize caching
    from app.cache import cache
    cache.init_app(app)
    
    # Initialize performance monitoring
    from app.performance import init_performance_monitoring
    init_performance_monitoring(app)
    
    # Initialize logging first
    from logging_config import setup_logging
    setup_logging(app)
    
    # Initialize request/response logging middleware
    from app.logging.middleware import init_request_logging
    init_request_logging(app)
    
    # Initialize error handlers
    from app.errors import init_error_handlers
    init_error_handlers(app)
    
    # Add security headers
    @app.after_request
    def add_security_headers(response):
        # Prevent clickjacking
        response.headers['X-Frame-Options'] = 'DENY'
        
        # Prevent MIME type sniffing
        response.headers['X-Content-Type-Options'] = 'nosniff'
        
        # Enable XSS protection
        response.headers['X-XSS-Protection'] = '1; mode=block'
        
        # Strict transport security (HTTPS only)
        if app.config.get('HTTPS_ONLY', False):
            response.headers['Strict-Transport-Security'] = 'max-age=31536000; includeSubDomains'
        
        # Content Security Policy
        response.headers['Content-Security-Policy'] = (
            "default-src 'self'; "
            "script-src 'self' 'unsafe-inline'; "
            "style-src 'self' 'unsafe-inline'; "
            "img-src 'self' data: https:; "
            "font-src 'self' https:; "
            "connect-src 'self' https:; "
            "media-src 'self' https:; "
            "object-src 'none'; "
            "base-uri 'self'; "
            "form-action 'self'"
        )
        
        return response
    
    # Initialize job queue system
    try:
        from app.jobs.queue import init_queue
        init_queue(app)
    except Exception as e:
        app.logger.error(f"Failed to initialize job queue: {e}")
        
    # JWT error handlers
    @jwt.expired_token_loader
    def expired_token_callback(jwt_header, jwt_payload):
        return {'error': {'code': 'TOKEN_EXPIRED', 'message': 'The token has expired'}}, 401
    
    @jwt.invalid_token_loader
    def invalid_token_callback(error):
        return {'error': {'code': 'INVALID_TOKEN', 'message': 'Invalid token'}}, 401
    
    @jwt.unauthorized_loader
    def missing_token_callback(error):
        return {'error': {'code': 'TOKEN_REQUIRED', 'message': 'Authorization token is required'}}, 401
    
    # Register blueprints
    from app.main import bp as main_bp
    app.register_blueprint(main_bp)
    
    from app.auth import bp as auth_bp
    app.register_blueprint(auth_bp, url_prefix='/api/auth')
    
    from app.jobs import bp as jobs_bp
    app.register_blueprint(jobs_bp, url_prefix='/api/jobs')
    
    from app.payments import bp as payments_bp
    app.register_blueprint(payments_bp, url_prefix='/api/payments')
    
    from app.user import bp as user_bp
    app.register_blueprint(user_bp, url_prefix='/api/user')
    
    from app.admin import bp as admin_api_bp
    app.register_blueprint(admin_api_bp, url_prefix='/admin/api')
    
    # Register monitoring endpoints
    from app.monitoring import bp as monitoring_bp
    app.register_blueprint(monitoring_bp, url_prefix='/api/monitoring')
    
    # Register error monitoring endpoints
    from app.admin.error_monitoring import bp as error_monitoring_bp
    app.register_blueprint(error_monitoring_bp, url_prefix='/admin/api/monitoring')
    
    # Register API documentation
    from app.api_docs import api_bp
    app.register_blueprint(api_bp, url_prefix='/api')
    
    # Register logging endpoints
    from app.logging.routes import logging_bp
    app.register_blueprint(logging_bp)
    
    # Register downloads endpoints
    from app.downloads.routes import downloads_bp
    app.register_blueprint(downloads_bp)
    
    # Register purchases endpoints
    from app.purchases.routes import purchases_bp
    app.register_blueprint(purchases_bp)
    
    # Register support endpoints
    from app.support.routes import support_bp
    app.register_blueprint(support_bp)
    
    # Initialize Flask-Admin
    from app.admin.views import init_admin
    init_admin(app)
    
    return app

from app import models