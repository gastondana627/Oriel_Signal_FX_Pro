from flask import request, jsonify, current_app
from flask_jwt_extended import (
    create_access_token, create_refresh_token, jwt_required, 
    get_jwt_identity, get_jwt
)
from werkzeug.security import generate_password_hash, check_password_hash
from datetime import datetime, timedelta
import secrets
import re
from app import db
from app.models import User, PasswordResetToken
from app.auth import bp


def validate_email(email):
    """Validate email format"""
    pattern = r'^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$'
    return re.match(pattern, email) is not None


def validate_password(password):
    """Validate password strength"""
    if len(password) < 8:
        return False, "Password must be at least 8 characters long"
    if not re.search(r'[A-Za-z]', password):
        return False, "Password must contain at least one letter"
    if not re.search(r'\d', password):
        return False, "Password must contain at least one number"
    return True, "Password is valid"


@bp.route('/register', methods=['POST'])
def register():
    """Register a new user"""
    try:
        data = request.get_json()
        
        if not data:
            return jsonify({'error': {'code': 'INVALID_REQUEST', 'message': 'Request body must be JSON'}}), 400
        
        email = data.get('email', '').strip().lower()
        password = data.get('password', '')
        
        # Validate required fields
        if not email or not password:
            return jsonify({
                'error': {
                    'code': 'MISSING_FIELDS',
                    'message': 'Email and password are required'
                }
            }), 400
        
        # Validate email format
        if not validate_email(email):
            return jsonify({
                'error': {
                    'code': 'INVALID_EMAIL',
                    'message': 'Please provide a valid email address'
                }
            }), 400
        
        # Validate password strength
        is_valid, message = validate_password(password)
        if not is_valid:
            return jsonify({
                'error': {
                    'code': 'WEAK_PASSWORD',
                    'message': message
                }
            }), 400
        
        # Check if user already exists
        if User.query.filter_by(email=email).first():
            return jsonify({
                'error': {
                    'code': 'EMAIL_EXISTS',
                    'message': 'An account with this email already exists'
                }
            }), 409
        
        # Create new user
        user = User(
            email=email,
            password_hash=generate_password_hash(password)
        )
        
        db.session.add(user)
        db.session.commit()
        
        return jsonify({
            'message': 'Account created successfully',
            'user': {
                'id': user.id,
                'email': user.email,
                'created_at': user.created_at.isoformat()
            }
        }), 201
        
    except Exception as e:
        db.session.rollback()
        current_app.logger.error(f"Registration error: {str(e)}")
        return jsonify({
            'error': {
                'code': 'REGISTRATION_FAILED',
                'message': 'Failed to create account. Please try again.'
            }
        }), 500


@bp.route('/login', methods=['POST'])
def login():
    """Authenticate user and return JWT tokens"""
    try:
        data = request.get_json()
        
        if not data:
            return jsonify({'error': {'code': 'INVALID_REQUEST', 'message': 'Request body must be JSON'}}), 400
        
        email = data.get('email', '').strip().lower()
        password = data.get('password', '')
        
        if not email or not password:
            return jsonify({
                'error': {
                    'code': 'MISSING_CREDENTIALS',
                    'message': 'Email and password are required'
                }
            }), 400
        
        # Find user by email
        user = User.query.filter_by(email=email).first()
        
        if not user or not check_password_hash(user.password_hash, password):
            return jsonify({
                'error': {
                    'code': 'INVALID_CREDENTIALS',
                    'message': 'Invalid email or password'
                }
            }), 401
        
        if not user.is_active:
            return jsonify({
                'error': {
                    'code': 'ACCOUNT_DISABLED',
                    'message': 'Your account has been disabled. Please contact support.'
                }
            }), 403
        
        # Create JWT tokens
        access_token = create_access_token(identity=str(user.id))
        refresh_token = create_refresh_token(identity=str(user.id))
        
        return jsonify({
            'message': 'Login successful',
            'access_token': access_token,
            'refresh_token': refresh_token,
            'user': {
                'id': user.id,
                'email': user.email,
                'created_at': user.created_at.isoformat()
            }
        }), 200
        
    except Exception as e:
        current_app.logger.error(f"Login error: {str(e)}")
        return jsonify({
            'error': {
                'code': 'LOGIN_FAILED',
                'message': 'Login failed. Please try again.'
            }
        }), 500


@bp.route('/refresh', methods=['POST'])
@jwt_required(refresh=True)
def refresh():
    """Refresh access token using refresh token"""
    try:
        current_user_id = int(get_jwt_identity())
        
        # Verify user still exists and is active
        user = User.query.get(current_user_id)
        if not user or not user.is_active:
            return jsonify({
                'error': {
                    'code': 'INVALID_USER',
                    'message': 'User account not found or disabled'
                }
            }), 401
        
        # Create new access token
        new_access_token = create_access_token(identity=current_user_id)
        
        return jsonify({
            'access_token': new_access_token
        }), 200
        
    except Exception as e:
        current_app.logger.error(f"Token refresh error: {str(e)}")
        return jsonify({
            'error': {
                'code': 'REFRESH_FAILED',
                'message': 'Failed to refresh token. Please login again.'
            }
        }), 500


@bp.route('/logout', methods=['POST'])
@jwt_required()
def logout():
    """Logout user (client should discard tokens)"""
    try:
        # In a more advanced implementation, we could maintain a blacklist of tokens
        # For now, we rely on the client to discard the tokens
        return jsonify({
            'message': 'Logged out successfully'
        }), 200
        
    except Exception as e:
        current_app.logger.error(f"Logout error: {str(e)}")
        return jsonify({
            'error': {
                'code': 'LOGOUT_FAILED',
                'message': 'Logout failed'
            }
        }), 500


@bp.route('/profile', methods=['GET'])
@jwt_required()
def get_profile():
    """Get current user profile"""
    try:
        current_user_id = int(get_jwt_identity())
        user = User.query.get(current_user_id)
        
        if not user:
            return jsonify({
                'error': {
                    'code': 'USER_NOT_FOUND',
                    'message': 'User not found'
                }
            }), 404
        
        return jsonify({
            'user': {
                'id': user.id,
                'email': user.email,
                'created_at': user.created_at.isoformat(),
                'is_active': user.is_active
            }
        }), 200
        
    except Exception as e:
        current_app.logger.error(f"Profile fetch error: {str(e)}")
        return jsonify({
            'error': {
                'code': 'PROFILE_FETCH_FAILED',
                'message': 'Failed to fetch profile'
            }
        }), 500


@bp.route('/verify', methods=['GET'])
@jwt_required()
def verify_token():
    """Verify JWT token is valid"""
    try:
        current_user_id = int(get_jwt_identity())
        user = User.query.get(current_user_id)
        
        if not user or not user.is_active:
            return jsonify({
                'error': {
                    'code': 'INVALID_USER',
                    'message': 'User account not found or disabled'
                }
            }), 401
        
        return jsonify({
            'valid': True,
            'user_id': user.id,
            'email': user.email
        }), 200
        
    except Exception as e:
        current_app.logger.error(f"Token verification error: {str(e)}")
        return jsonify({
            'error': {
                'code': 'VERIFICATION_FAILED',
                'message': 'Token verification failed'
            }
        }), 500


# Password reset functionality

@bp.route('/request-password-reset', methods=['POST'])
def request_password_reset():
    """Request password reset token"""
    try:
        data = request.get_json()
        
        if not data:
            return jsonify({'error': {'code': 'INVALID_REQUEST', 'message': 'Request body must be JSON'}}), 400
        
        email = data.get('email', '').strip().lower()
        
        if not email:
            return jsonify({
                'error': {
                    'code': 'MISSING_EMAIL',
                    'message': 'Email is required'
                }
            }), 400
        
        if not validate_email(email):
            return jsonify({
                'error': {
                    'code': 'INVALID_EMAIL',
                    'message': 'Please provide a valid email address'
                }
            }), 400
        
        user = User.query.filter_by(email=email).first()
        
        # Always return success to prevent email enumeration
        if user and user.is_active:
            # Generate secure reset token
            reset_token = secrets.token_urlsafe(32)
            expires_at = datetime.utcnow() + timedelta(hours=1)  # Token expires in 1 hour
            
            # Invalidate any existing tokens for this user
            PasswordResetToken.query.filter_by(user_id=user.id, used=False).update({'used': True})
            
            # Create new reset token
            token_record = PasswordResetToken(
                user_id=user.id,
                token=reset_token,
                expires_at=expires_at
            )
            
            db.session.add(token_record)
            db.session.commit()
            
            # TODO: Send email with reset link (will be implemented in email task)
            # For now, we'll log the token for development
            current_app.logger.info(f"Password reset token for {email}: {reset_token}")
        
        return jsonify({
            'message': 'If an account with that email exists, a password reset link has been sent.'
        }), 200
        
    except Exception as e:
        db.session.rollback()
        current_app.logger.error(f"Password reset request error: {str(e)}")
        return jsonify({
            'error': {
                'code': 'RESET_REQUEST_FAILED',
                'message': 'Failed to process password reset request. Please try again.'
            }
        }), 500


@bp.route('/reset-password', methods=['POST'])
def reset_password():
    """Reset password using token"""
    try:
        data = request.get_json()
        
        if not data:
            return jsonify({'error': {'code': 'INVALID_REQUEST', 'message': 'Request body must be JSON'}}), 400
        
        token = data.get('token', '')
        new_password = data.get('password', '')
        
        if not token or not new_password:
            return jsonify({
                'error': {
                    'code': 'MISSING_FIELDS',
                    'message': 'Token and new password are required'
                }
            }), 400
        
        # Validate password strength
        is_valid, message = validate_password(new_password)
        if not is_valid:
            return jsonify({
                'error': {
                    'code': 'WEAK_PASSWORD',
                    'message': message
                }
            }), 400
        
        # Find and validate token
        token_record = PasswordResetToken.query.filter_by(token=token).first()
        
        if not token_record or not token_record.is_valid():
            return jsonify({
                'error': {
                    'code': 'INVALID_TOKEN',
                    'message': 'Invalid or expired reset token'
                }
            }), 400
        
        # Update user password
        user = token_record.user
        user.password_hash = generate_password_hash(new_password)
        
        # Mark token as used
        token_record.used = True
        
        db.session.commit()
        
        return jsonify({
            'message': 'Password reset successfully'
        }), 200
        
    except Exception as e:
        db.session.rollback()
        current_app.logger.error(f"Password reset error: {str(e)}")
        return jsonify({
            'error': {
                'code': 'RESET_FAILED',
                'message': 'Failed to reset password. Please try again.'
            }
        }), 500