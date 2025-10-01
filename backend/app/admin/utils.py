"""
Admin utility functions and decorators.
"""
from functools import wraps
from flask import current_app, jsonify
from flask_jwt_extended import get_jwt_identity
from app.models import User


def admin_required(f):
    """Decorator to require admin privileges for a route"""
    @wraps(f)
    def decorated_function(*args, **kwargs):
        try:
            current_user_id = get_jwt_identity()
            user = User.query.get(current_user_id)
            
            if not user:
                return jsonify({
                    'error': {
                        'code': 'USER_NOT_FOUND',
                        'message': 'User not found'
                    }
                }), 404
            
            # Check if user is admin (you may need to add an is_admin field to User model)
            # For now, we'll check if the user email is in admin list from config
            admin_emails = current_app.config.get('ADMIN_EMAILS', [])
            if user.email not in admin_emails:
                return jsonify({
                    'error': {
                        'code': 'ADMIN_REQUIRED',
                        'message': 'Admin privileges required'
                    }
                }), 403
            
            return f(*args, **kwargs)
            
        except Exception as e:
            current_app.logger.error(f"Admin check failed: {e}")
            return jsonify({
                'error': {
                    'code': 'ADMIN_CHECK_ERROR',
                    'message': 'Failed to verify admin privileges'
                }
            }), 500
    
    return decorated_function


def is_admin_user(user_email):
    """Check if a user email is in the admin list"""
    admin_emails = current_app.config.get('ADMIN_EMAILS', [])
    return user_email in admin_emails