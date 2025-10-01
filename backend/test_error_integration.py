"""
Simple integration test for error handling functionality.
"""
import sys
import os
sys.path.append(os.path.dirname(__file__))

from app.errors import (
    APIError, AuthenticationError, PaymentError, RenderingError,
    format_error_response, CircuitBreaker, retry_with_backoff
)

def test_error_classes():
    """Test custom error classes"""
    print("Testing custom error classes...")
    
    # Test APIError
    api_error = APIError("Test error", 400, "TEST_ERROR", {"field": "value"})
    error_dict = api_error.to_dict()
    
    assert error_dict['error']['code'] == "TEST_ERROR"
    assert error_dict['error']['message'] == "Test error"
    assert error_dict['error']['details'] == {"field": "value"}
    assert 'timestamp' in error_dict['error']
    print("✓ APIError works correctly")
    
    # Test AuthenticationError
    auth_error = AuthenticationError("Invalid credentials")
    assert auth_error.status_code == 401
    assert auth_error.error_code == "AUTHENTICATION_FAILED"
    print("✓ AuthenticationError works correctly")
    
    # Test PaymentError
    payment_error = PaymentError("Payment failed", "PAYMENT_DECLINED")
    assert payment_error.status_code == 402
    assert payment_error.error_code == "PAYMENT_DECLINED"
    assert payment_error.recoverable == True
    print("✓ PaymentError works correctly")
    
    # Test RenderingError
    rendering_error = RenderingError("Rendering failed", "FFMPEG_ERROR")
    assert rendering_error.status_code == 500
    assert rendering_error.error_code == "FFMPEG_ERROR"
    assert rendering_error.recoverable == True
    print("✓ RenderingError works correctly")


def test_circuit_breaker():
    """Test circuit breaker functionality"""
    print("Testing Circuit Breaker...")
    
    call_count = 0
    
    @CircuitBreaker(failure_threshold=2, recovery_timeout=0.1)
    def test_function():
        nonlocal call_count
        call_count += 1
        if call_count <= 2:
            raise Exception("Service error")
        return "success"
    
    # Test failures
    try:
        test_function()
    except Exception as e:
        assert str(e) == "Service error"
    
    try:
        test_function()
    except Exception as e:
        assert str(e) == "Service error"
    
    # This should trigger circuit breaker
    try:
        test_function()
    except Exception as e:
        assert "temporarily unavailable" in str(e)
    
    print("✓ Circuit breaker works correctly")


def test_retry_mechanism():
    """Test retry with backoff"""
    print("Testing retry mechanism...")
    
    call_count = 0
    
    @retry_with_backoff(max_retries=2, backoff_factor=0.01)
    def eventually_success():
        nonlocal call_count
        call_count += 1
        if call_count < 3:
            raise Exception("Temporary error")
        return "success"
    
    result = eventually_success()
    assert result == "success"
    assert call_count == 3
    print("✓ Retry mechanism works correctly")


def test_error_recovery_utilities():
    """Test error recovery utilities"""
    print("Testing error recovery utilities...")
    
    from app.utils.error_recovery import get_service_health_status
    
    # Test service health status
    health = get_service_health_status()
    assert isinstance(health, dict)
    print("✓ Service health status works correctly")


if __name__ == '__main__':
    test_error_classes()
    test_circuit_breaker()
    test_retry_mechanism()
    test_error_recovery_utilities()
    print("\nAll error handling tests passed! ✅")