"""
Unit tests for authentication functionality.
"""
import pytest
from datetime import datetime, timedelta
from werkzeug.security import check_password_hash
from flask_jwt_extended import create_access_token, decode_token

from app.models import User, PasswordResetToken
from app.auth.utils import (
    validate_password_strength,
    generate_password_reset_token,
    verify_password_reset_token,
    hash_password,
    verify_password
)


class TestPasswordValidation:
    """Test password validation functions."""
    
    def test_valid_password(self):
        """Test valid password passes validation."""
        valid_passwords = [
            'Password123!',
            'MySecure@Pass1',
            'Complex#Password9'
        ]
        
        for password in valid_passwords:
            assert validate_password_strength(password) is True
    
    def test_weak_passwords(self):
        """Test weak passwords fail validation."""
        weak_passwords = [
            'password',  # No uppercase, numbers, or symbols
            'PASSWORD',  # No lowercase, numbers, or symbols
            '12345678',  # No letters or symbols
            'Pass1',     # Too short
            'Password1', # No symbols
            'Password!', # No numbers
        ]
        
        for password in weak_passwords:
            assert validate_password_strength(password) is False
    
    def test_password_hashing(self):
        """Test password hashing and verification."""
        password = 'TestPassword123!'
        
        # Test hashing
        hashed = hash_password(password)
        assert hashed != password
        assert len(hashed) > 50  # Bcrypt hashes are long
        
        # Test verification
        assert verify_password(password, hashed) is True
        assert verify_password('wrong_password', hashed) is False


class TestPasswordReset:
    """Test password reset functionality."""
    
    def test_generate_reset_token(self, app_context, test_user):
        """Test password reset token generation."""
        token = generate_password_reset_token(test_user.email)
        
        assert token is not None
        assert len(token) > 20  # Should be a substantial token
        
        # Verify token is stored in database
        reset_token = PasswordResetToken.query.filter_by(
            user_id=test_user.id
        ).first()
        
        assert reset_token is not None
        assert reset_token.expires_at > datetime.utcnow()
    
    def test_verify_reset_token_valid(self, app_context, test_user):
        """Test verification of valid reset token."""
        token = generate_password_reset_token(test_user.email)
        
        user = verify_password_reset_token(token)
        assert user is not None
        assert user.id == test_user.id
    
    def test_verify_reset_token_invalid(self, app_context):
        """Test verification of invalid reset token."""
        user = verify_password_reset_token('invalid_token')
        assert user is None
    
    def test_verify_reset_token_expired(self, app_context, test_user):
        """Test verification of expired reset token."""
        # Create expired token
        from app import db
        expired_token = PasswordResetToken(
            user_id=test_user.id,
            token='expired_token',
            expires_at=datetime.utcnow() - timedelta(hours=1)
        )
        db.session.add(expired_token)
        db.session.commit()
        
        user = verify_password_reset_token('expired_token')
        assert user is None


class TestJWTTokens:
    """Test JWT token functionality."""
    
    def test_token_creation(self, app_context, test_user):
        """Test JWT token creation."""
        token = create_access_token(identity=str(test_user.id))
        
        assert token is not None
        assert len(token) > 50  # JWT tokens are substantial
        
        # Decode and verify token
        decoded = decode_token(token)
        assert decoded['sub'] == str(test_user.id)
    
    def test_token_expiration(self, app_context, test_user):
        """Test JWT token expiration."""
        # Create token with short expiration
        token = create_access_token(
            identity=str(test_user.id),
            expires_delta=timedelta(seconds=1)
        )
        
        # Token should be valid immediately
        decoded = decode_token(token)
        assert decoded['sub'] == str(test_user.id)
        
        # Note: We can't easily test expiration without waiting
        # This would be better tested in integration tests


class TestUserModel:
    """Test User model functionality."""
    
    def test_user_creation(self, app_context):
        """Test user model creation."""
        from app import db
        
        user = User(
            email='newuser@example.com',
            password_hash=hash_password('Password123!')
        )
        
        db.session.add(user)
        db.session.commit()
        
        assert user.id is not None
        assert user.email == 'newuser@example.com'
        assert user.created_at is not None
        assert user.is_active is True
    
    def test_user_password_verification(self, app_context, test_user):
        """Test user password verification."""
        # The test_user fixture uses 'testpassword123'
        assert check_password_hash(test_user.password_hash, 'testpassword123')
        assert not check_password_hash(test_user.password_hash, 'wrongpassword')
    
    def test_user_string_representation(self, app_context, test_user):
        """Test user string representation."""
        assert str(test_user) == f'<User {test_user.email}>'
    
    def test_user_relationships(self, app_context, test_user, test_payment, test_render_job):
        """Test user model relationships."""
        # Test payments relationship
        assert len(test_user.payments) == 1
        assert test_user.payments[0].id == test_payment.id
        
        # Test render jobs relationship
        assert len(test_user.render_jobs) == 1
        assert test_user.render_jobs[0].id == test_render_job.id


class TestAuthenticationHelpers:
    """Test authentication helper functions."""
    
    def test_email_validation(self):
        """Test email validation."""
        from app.auth.utils import is_valid_email
        
        valid_emails = [
            'user@example.com',
            'test.email@domain.co.uk',
            'user+tag@example.org'
        ]
        
        invalid_emails = [
            'invalid-email',
            '@example.com',
            'user@',
            'user@.com',
            ''
        ]
        
        for email in valid_emails:
            assert is_valid_email(email) is True
        
        for email in invalid_emails:
            assert is_valid_email(email) is False
    
    def test_generate_secure_token(self):
        """Test secure token generation."""
        from app.auth.utils import generate_secure_token
        
        token1 = generate_secure_token()
        token2 = generate_secure_token()
        
        assert token1 != token2  # Should be unique
        assert len(token1) >= 32  # Should be substantial length
        assert token1.isalnum()  # Should be alphanumeric
    
    def test_rate_limit_key_generation(self):
        """Test rate limit key generation."""
        from app.auth.utils import get_rate_limit_key
        
        key = get_rate_limit_key('login', '192.168.1.1')
        assert key == 'rate_limit:login:192.168.1.1'
        
        key = get_rate_limit_key('register', 'user@example.com')
        assert key == 'rate_limit:register:user@example.com'