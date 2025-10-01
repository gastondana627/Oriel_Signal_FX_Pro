from functools import wraps
import re
import secrets
import string
from datetime import datetime, timedelta
from flask import jsonify
from flask_jwt_extended import jwt_required, get_jwt_identity
from werkzeug.security import generate_password_hash, check_password_hash
from app.models import User, PasswordResetToken
from app import db


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


def validate_password_strength(password):
    """
    Validate password strength requirements.
    Returns True if password meets requirements, False otherwise.
    """
    if len(password) < 8:
        return False
    
    # Check for uppercase letter
    if not re.search(r'[A-Z]', password):
        return False
    
    # Check for lowercase letter
    if not re.search(r'[a-z]', password):
        return False
    
    # Check for digit
    if not re.search(r'\d', password):
        return False
    
    # Check for special character
    if not re.search(r'[!@#$%^&*(),.?":{}|<>]', password):
        return False
    
    return True


def hash_password(password):
    """
    Hash a password using werkzeug's security functions.
    """
    return generate_password_hash(password)


def verify_password(password, password_hash):
    """
    Verify a password against its hash.
    """
    return check_password_hash(password_hash, password)


def generate_secure_token(length=32):
    """
    Generate a secure random token.
    """
    alphabet = string.ascii_letters + string.digits
    return ''.join(secrets.choice(alphabet) for _ in range(length))


def generate_password_reset_token(email):
    """
    Generate a password reset token for a user.
    """
    user = User.query.filter_by(email=email).first()
    if not user:
        return None
    
    # Generate secure token
    token = generate_secure_token(64)
    
    # Create reset token record
    reset_token = PasswordResetToken(
        user_id=user.id,
        token=token,
        expires_at=datetime.utcnow() + timedelta(hours=1)
    )
    
    db.session.add(reset_token)
    db.session.commit()
    
    return token


def verify_password_reset_token(token):
    """
    Verify a password reset token and return the associated user.
    """
    reset_token = PasswordResetToken.query.filter_by(token=token).first()
    
    if not reset_token:
        return None
    
    # Check if token is expired
    if reset_token.expires_at < datetime.utcnow():
        # Clean up expired token
        db.session.delete(reset_token)
        db.session.commit()
        return None
    
    return reset_token.user


def is_valid_email(email):
    """
    Validate email format.
    """
    pattern = r'^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$'
    return re.match(pattern, email) is not None


def get_rate_limit_key(action, identifier):
    """
    Generate a rate limit key for Redis.
    """
    return f'rate_limit:{action}:{identifier}'