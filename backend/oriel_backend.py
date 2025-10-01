import os
import logging
from app import create_app, db
from app.models import User, Payment, RenderJob
from config import config
from logging_config import setup_logging

# Get configuration from environment
config_name = os.environ.get('FLASK_ENV', 'development')
app = create_app(config_name)

# Setup production logging
if config_name == 'production':
    setup_logging(app)

@app.shell_context_processor
def make_shell_context():
    return {
        'db': db, 
        'User': User, 
        'Payment': Payment, 
        'RenderJob': RenderJob
    }

@app.before_first_request
def create_tables():
    """Create database tables on first request if they don't exist."""
    try:
        db.create_all()
        app.logger.info("Database tables created successfully")
    except Exception as e:
        app.logger.error(f"Error creating database tables: {e}")

# Add production error handlers
@app.errorhandler(500)
def internal_error(error):
    """Handle internal server errors in production."""
    app.logger.error(f"Internal server error: {error}")
    db.session.rollback()
    return {
        'error': {
            'code': 'INTERNAL_SERVER_ERROR',
            'message': 'An internal server error occurred. Please try again later.'
        }
    }, 500

@app.errorhandler(404)
def not_found_error(error):
    """Handle 404 errors."""
    return {
        'error': {
            'code': 'NOT_FOUND',
            'message': 'The requested resource was not found.'
        }
    }, 404

if __name__ == '__main__':
    port = int(os.environ.get('PORT', 5000))
    debug = app.config.get('DEBUG', False)
    
    if config_name == 'production':
        app.logger.info(f"Starting production server on port {port}")
        # In production, use gunicorn instead of Flask dev server
        app.run(host='0.0.0.0', port=port, debug=False)
    else:
        app.logger.info(f"Starting development server on port {port}")
        app.run(host='0.0.0.0', port=port, debug=debug)