from functools import wraps
from flask import jsonify
from flask_jwt_extended import jwt_required, get_jwt_identity
from app.models import User


def auth_required(f):
    """
    Decorator that combines JWT validation with user existence check
    """
    @wraps(f)
    @jwt_required()
    def decorated_function(*args, **kwargs):
        current_user_id = int(get_jwt_identity())
        user = User.query.get(current_user_id)
        
        if not user:
            return jsonify({
                'error': {
                    'code': 'USER_NOT_FOUND',
                    'message': 'User account not found'
                }
            }), 404
        
        if not user.is_active:
            return jsonify({
                'error': {
                    'code': 'ACCOUNT_DISABLED',
                    'message': 'Your account has been disabled'
                }
            }), 403
        
        # Pass the user object to the route function
        return f(user, *args, **kwargs)
    
    return decorated_function


def get_current_user():
    """
    Helper function to get the current authenticated user
    Returns None if no valid user is found
    """
    try:
        current_user_id = get_jwt_identity()
        if current_user_id:
            user = User.query.get(int(current_user_id))
            if user and user.is_active:
                return user
    except Exception:
        pass
    return None


def admin_required(f):
    """
    Decorator for admin-only routes (placeholder for future admin functionality)
    """
    @wraps(f)
    @auth_required
    def decorated_function(user, *args, **kwargs):
        # For now, we'll implement basic admin check
        # In the future, this could check for an admin role
        if not user.email.endswith('@admin.com'):  # Placeholder logic
            return jsonify({
                'error': {
                    'code': 'ADMIN_REQUIRED',
                    'message': 'Administrator access required'
                }
            }), 403
        
        return f(user, *args, **kwargs)
    
    return decorated_function