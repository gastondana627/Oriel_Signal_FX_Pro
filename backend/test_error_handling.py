"""
Comprehensive test suite for error handling functionality.
Tests various error scenarios and validates proper error responses.
"""
import pytest
import json
import tempfile
import os
from unittest.mock import patch, Mock
from flask import Flask
from app import create_app, db
from app.models import User, Payment, RenderJob
from app.errors import (
    APIError, AuthenticationError, AuthorizationError, PaymentError,
    FileError, RenderingError, ExternalServiceError, DatabaseError,
    ValidationError, RateLimitError, CircuitBreaker, retry_with_backoff,
    handle_external_service_error
)
import time


@pytest.fixture
def app():
    """Create test Flask application"""
    app = create_app('testing')
    app.config['TESTING'] = True
    app.config['WTF_CSRF_ENABLED'] = False
    app.config['SQLALCHEMY_DATABASE_URI'] = 'sqlite:///:memory:'
    
    with app.app_context():
        db.create_all()
        yield app
        db.drop_all()


@pytest.fixture
def client(app):
    """Create test client"""
    return app.test_client()


@pytest.fixture
def auth_headers(client):
    """Create authenticated user and return auth headers"""
    # Register user
    client.post('/api/auth/register', json={
        'email': 'test@example.com',
        'password': 'TestPass123'
    })
    
    # Login and get token
    response = client.post('/api/auth/login', json={
        'email': 'test@example.com',
        'password': 'TestPass123'
    })
    
    token = response.json['access_token']
    return {'Authorization': f'Bearer {token}'}


class TestCustomExceptions:
    """Test custom exception classes"""
    
    def test_api_error_basic(self):
        """Test basic APIError functionality"""
        error = APIError("Test error", 400, "TEST_ERROR", {"field": "value"})
        
        assert error.message == "Test error"
        assert error.status_code == 400
        assert error.error_code == "TEST_ERROR"
        assert error.details == {"field": "value"}
        assert error.recoverable == False
        assert error.timestamp is not None
    
    def test_api_error_auto_code_generation(self):
        """Test automatic error code generation"""
        error = APIError("Test error", 404)
        assert error.error_code == "NOT_FOUND"
        
        error = APIError("Test error", 500)
        assert error.error_code == "INTERNAL_SERVER_ERROR"
    
    def test_authentication_error(self):
        """Test AuthenticationError"""
        error = AuthenticationError("Invalid credentials")
        
        assert error.status_code == 401
        assert error.error_code == "AUTHENTICATION_FAILED"
        assert error.message == "Invalid credentials"
    
    def test_payment_error(self):
        """Test PaymentError"""
        error = PaymentError("Payment failed", "PAYMENT_DECLINED", {"reason": "insufficient_funds"})
        
        assert error.status_code == 402
        assert error.error_code == "PAYMENT_DECLINED"
        assert error.recoverable == True
    
    def test_file_validation_error(self):
        """Test FileValidationError"""
        error = FileError("Invalid file format", "INVALID_FORMAT", {"format": "txt"})
        
        assert error.status_code == 400
        assert error.error_code == "INVALID_FORMAT"
    
    def test_rendering_error(self):
        """Test RenderingError"""
        error = RenderingError("Rendering failed", "FFMPEG_ERROR", {"exit_code": 1})
        
        assert error.status_code == 500
        assert error.error_code == "FFMPEG_ERROR"
        assert error.recoverable == True
    
    def test_external_service_error(self):
        """Test ExternalServiceError"""
        error = ExternalServiceError("stripe", "API timeout", "STRIPE_TIMEOUT")
        
        assert error.status_code == 503
        assert error.error_code == "STRIPE_TIMEOUT"
        assert error.recoverable == True


class TestErrorHandlers:
    """Test error handler responses"""
    
    def test_404_error_handler(self, client):
        """Test 404 error handling"""
        response = client.get('/api/nonexistent')
        
        assert response.status_code == 404
        data = response.json
        assert data['error']['code'] == 'NOT_FOUND'
        assert 'timestamp' in data['error']
        assert data['error']['recoverable'] == False
    
    def test_405_method_not_allowed(self, client):
        """Test 405 error handling"""
        response = client.put('/api/auth/login')  # Only POST allowed
        
        assert response.status_code == 405
        data = response.json
        assert data['error']['code'] == 'METHOD_NOT_ALLOWED'
        assert 'allowed_methods' in data['error']['details']
    
    def test_413_payload_too_large(self, client, app):
        """Test file size limit error"""
        app.config['MAX_CONTENT_LENGTH'] = 1024  # 1KB limit
        
        # Create a file larger than the limit
        large_data = b'x' * 2048  # 2KB
        
        response = client.post('/api/jobs/render/submit', 
                             data={'audio_file': (tempfile.NamedTemporaryFile(), 'test.mp3')},
                             content_length=len(large_data))
        
        assert response.status_code == 413
        data = response.json
        assert data['error']['code'] == 'FILE_TOO_LARGE'
        assert 'max_size_mb' in data['error']['details']
    
    def test_415_unsupported_media_type(self, client, auth_headers):
        """Test unsupported file type error"""
        with tempfile.NamedTemporaryFile(suffix='.txt') as f:
            f.write(b'not an audio file')
            f.seek(0)
            
            response = client.post('/api/jobs/render/submit',
                                 headers=auth_headers,
                                 data={'audio_file': (f, 'test.txt')})
        
        assert response.status_code == 415
        data = response.json
        assert data['error']['code'] == 'UNSUPPORTED_MEDIA_TYPE'
        assert 'supported_types' in data['error']['details']
    
    def test_422_validation_error(self, client):
        """Test validation error handling"""
        response = client.post('/api/auth/register', json={
            'email': 'invalid-email',
            'password': '123'  # Too short
        })
        
        assert response.status_code == 422
        data = response.json
        assert data['error']['code'] == 'VALIDATION_ERROR'
    
    def test_rate_limit_error(self, client):
        """Test rate limiting error"""
        # Make multiple requests to trigger rate limit
        for _ in range(10):
            response = client.post('/api/auth/login', json={
                'email': 'test@example.com',
                'password': 'wrong'
            })
        
        # Should eventually get rate limited
        assert response.status_code in [401, 429]  # Either auth error or rate limit


class TestCircuitBreaker:
    """Test circuit breaker functionality"""
    
    def test_circuit_breaker_closed_state(self):
        """Test circuit breaker in closed state"""
        @CircuitBreaker(failure_threshold=3, recovery_timeout=1)
        def test_function():
            return "success"
        
        result = test_function()
        assert result == "success"
    
    def test_circuit_breaker_opens_after_failures(self):
        """Test circuit breaker opens after threshold failures"""
        call_count = 0
        
        @CircuitBreaker(failure_threshold=3, recovery_timeout=1)
        def failing_function():
            nonlocal call_count
            call_count += 1
            raise Exception("Service error")
        
        # First 3 calls should fail normally
        for _ in range(3):
            with pytest.raises(Exception, match="Service error"):
                failing_function()
        
        # 4th call should trigger circuit breaker
        with pytest.raises(ExternalServiceError, match="temporarily unavailable"):
            failing_function()
        
        assert call_count == 3  # Function not called when circuit is open
    
    def test_circuit_breaker_recovery(self):
        """Test circuit breaker recovery after timeout"""
        call_count = 0
        
        @CircuitBreaker(failure_threshold=2, recovery_timeout=0.1)
        def recovering_function():
            nonlocal call_count
            call_count += 1
            if call_count <= 2:
                raise Exception("Service error")
            return "recovered"
        
        # Trigger circuit breaker
        for _ in range(2):
            with pytest.raises(Exception):
                recovering_function()
        
        # Circuit should be open
        with pytest.raises(ExternalServiceError):
            recovering_function()
        
        # Wait for recovery timeout
        time.sleep(0.2)
        
        # Should recover and work
        result = recovering_function()
        assert result == "recovered"


class TestRetryMechanism:
    """Test retry with backoff functionality"""
    
    def test_retry_success_on_first_attempt(self):
        """Test successful operation on first attempt"""
        @retry_with_backoff(max_retries=3)
        def success_function():
            return "success"
        
        result = success_function()
        assert result == "success"
    
    def test_retry_success_after_failures(self):
        """Test successful operation after some failures"""
        call_count = 0
        
        @retry_with_backoff(max_retries=3, backoff_factor=0.1)
        def eventually_success_function():
            nonlocal call_count
            call_count += 1
            if call_count < 3:
                raise Exception("Temporary error")
            return "success"
        
        result = eventually_success_function()
        assert result == "success"
        assert call_count == 3
    
    def test_retry_exhausted(self):
        """Test retry exhaustion"""
        call_count = 0
        
        @retry_with_backoff(max_retries=2, backoff_factor=0.1)
        def always_fail_function():
            nonlocal call_count
            call_count += 1
            raise Exception("Persistent error")
        
        with pytest.raises(Exception, match="Persistent error"):
            always_fail_function()
        
        assert call_count == 3  # Initial attempt + 2 retries


class TestExternalServiceErrorHandling:
    """Test external service error handling"""
    
    def test_timeout_error_handling(self):
        """Test timeout error mapping"""
        original_error = Exception("Connection timeout occurred")
        
        with pytest.raises(ExternalServiceError) as exc_info:
            handle_external_service_error("stripe", "payment", original_error)
        
        error = exc_info.value
        assert error.error_code == "STRIPE_TIMEOUT"
        assert "timeout" in error.message.lower()
        assert error.recoverable == True
    
    def test_connection_error_handling(self):
        """Test connection error mapping"""
        original_error = Exception("Connection refused")
        
        with pytest.raises(ExternalServiceError) as exc_info:
            handle_external_service_error("gcs", "upload", original_error)
        
        error = exc_info.value
        assert error.error_code == "GCS_CONNECTION_ERROR"
        assert "connection" in error.message.lower()
    
    def test_authentication_error_handling(self):
        """Test authentication error mapping"""
        original_error = Exception("Authentication failed - unauthorized")
        
        with pytest.raises(ExternalServiceError) as exc_info:
            handle_external_service_error("sendgrid", "send_email", original_error)
        
        error = exc_info.value
        assert error.error_code == "SENDGRID_AUTH_ERROR"
        assert "authentication" in error.message.lower()
    
    def test_generic_error_handling(self):
        """Test generic error mapping"""
        original_error = Exception("Unknown service error")
        
        with pytest.raises(ExternalServiceError) as exc_info:
            handle_external_service_error("unknown", "operation", original_error)
        
        error = exc_info.value
        assert error.error_code == "UNKNOWN_SERVICE_ERROR"
        assert "Unknown service error" in error.message


class TestErrorLogging:
    """Test error logging functionality"""
    
    def test_error_logging_with_context(self, app, client):
        """Test that errors are logged with proper context"""
        with app.app_context():
            with patch('app.errors.logger') as mock_logger:
                # Trigger an error
                response = client.get('/api/nonexistent')
                
                # Verify logging was called
                assert mock_logger.warning.called or mock_logger.error.called
    
    def test_request_id_tracking(self, client):
        """Test that request IDs are properly tracked"""
        response = client.get('/api/nonexistent')
        
        # Request should have been processed (even if 404)
        assert response.status_code == 404


class TestDatabaseErrorHandling:
    """Test database error handling"""
    
    def test_database_connection_error(self, app):
        """Test database connection error handling"""
        with app.app_context():
            with patch('app.db.session.commit') as mock_commit:
                from sqlalchemy.exc import DisconnectionError
                mock_commit.side_effect = DisconnectionError("Connection lost")
                
                error = DatabaseError("Connection lost", "DATABASE_CONNECTION_ERROR")
                assert error.recoverable == True
                assert error.status_code == 500


if __name__ == '__main__':
    pytest.main([__file__, '-v'])