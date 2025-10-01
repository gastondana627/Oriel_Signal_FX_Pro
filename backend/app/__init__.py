from flask import Flask
from flask_sqlalchemy import SQLAlchemy
from flask_migrate import Migrate
from flask_jwt_extended import JWTManager
from flask_cors import CORS
from config import Config

db = SQLAlchemy()
migrate = Migrate()
jwt = JWTManager()

def create_app(config_class=Config):
    app = Flask(__name__)
    app.config.from_object(config_class)
    
    # Initialize extensions
    db.init_app(app)
    migrate.init_app(app, db)
    jwt.init_app(app)
    CORS(app)
    
    # Initialize job queue system
    try:
        from app.jobs.queue import init_queue
        init_queue(app)
    except Exception as e:
        app.logger.error(f"Failed to initialize job queue: {e}")
        # Don't fail app startup if Redis is not available in development
    
    # JWT error handlers
    @jwt.expired_token_loader
    def expired_token_callback(jwt_header, jwt_payload):
        return {
            'error': {
                'code': 'TOKEN_EXPIRED',
                'message': 'The token has expired'
            }
        }, 401
    
    @jwt.invalid_token_loader
    def invalid_token_callback(error):
        return {
            'error': {
                'code': 'INVALID_TOKEN',
                'message': 'Invalid token'
            }
        }, 401
    
    @jwt.unauthorized_loader
    def missing_token_callback(error):
        return {
            'error': {
                'code': 'TOKEN_REQUIRED',
                'message': 'Authorization token is required'
            }
        }, 401
    
    # Register blueprints
    from app.main import bp as main_bp
    app.register_blueprint(main_bp)
    
    from app.auth import bp as auth_bp
    app.register_blueprint(auth_bp)
    
    from app.jobs import routes as jobs_routes
    app.register_blueprint(jobs_routes.bp)
    
    return app

from app import models