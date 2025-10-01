#!/usr/bin/env python3
"""
Test script for email service functionality.
"""
import os
import sys
import logging
from unittest.mock import Mock, patch

# Add the parent directory to Python path to import backend modules
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

def test_email_service_initialization():
    """Test email service initialization with mock credentials."""
    print("Testing Email Service initialization...")
    
    # Mock Flask app context
    with patch('app.email.service.current_app') as mock_app:
        mock_app.config = {
            'SENDGRID_API_KEY': 'test-api-key',
            'SENDGRID_FROM_EMAIL': 'test@oriel-fx.com'
        }
        
        # Mock SendGrid client
        with patch('app.email.service.SendGridAPIClient') as mock_client:
            from app.email.service import EmailService
            
            # Test initialization
            email_service = EmailService()
            
            assert email_service.api_key == 'test-api-key'
            assert email_service.from_email == 'test@oriel-fx.com'
            mock_client.assert_called_once_with(api_key='test-api-key')
            
            print("✓ Email Service initialization test passed")

def test_video_completion_email():
    """Test video completion email sending with mocked SendGrid."""
    print("Testing video completion email...")
    
    with patch('app.email.service.current_app') as mock_app:
        mock_app.config = {
            'SENDGRID_API_KEY': 'test-api-key',
            'SENDGRID_FROM_EMAIL': 'test@oriel-fx.com'
        }
        
        with patch('app.email.service.SendGridAPIClient') as mock_client:
            # Setup mock response
            mock_response = Mock()
            mock_response.status_code = 202
            mock_client.return_value.send.return_value = mock_response
            
            from app.email.service import EmailService
            
            email_service = EmailService()
            
            # Test email sending
            result = email_service.send_video_completion_email(
                user_email='test@example.com',
                video_url='https://storage.googleapis.com/test-bucket/video.mp4',
                job_id='test-job-123'
            )
            
            # Verify result
            assert result['success'] is True
            assert result['job_id'] == 'test-job-123'
            assert result['email'] == 'test@example.com'
            assert result['status_code'] == 202
            
            # Verify SendGrid was called
            mock_client.return_value.send.assert_called_once()
            
            print("✓ Video completion email test passed")

def test_welcome_email():
    """Test welcome email sending with mocked SendGrid."""
    print("Testing welcome email...")
    
    with patch('app.email.service.current_app') as mock_app:
        mock_app.config = {
            'SENDGRID_API_KEY': 'test-api-key',
            'SENDGRID_FROM_EMAIL': 'test@oriel-fx.com'
        }
        
        with patch('app.email.service.SendGridAPIClient') as mock_client:
            # Setup mock response
            mock_response = Mock()
            mock_response.status_code = 202
            mock_client.return_value.send.return_value = mock_response
            
            from app.email.service import EmailService
            
            email_service = EmailService()
            
            # Test email sending
            result = email_service.send_welcome_email(
                user_email='newuser@example.com',
                user_name='New User'
            )
            
            # Verify result
            assert result['success'] is True
            assert result['email'] == 'newuser@example.com'
            assert result['status_code'] == 202
            
            # Verify SendGrid was called
            mock_client.return_value.send.assert_called_once()
            
            print("✓ Welcome email test passed")

def test_password_reset_email():
    """Test password reset email sending with mocked SendGrid."""
    print("Testing password reset email...")
    
    with patch('app.email.service.current_app') as mock_app:
        mock_app.config = {
            'SENDGRID_API_KEY': 'test-api-key',
            'SENDGRID_FROM_EMAIL': 'test@oriel-fx.com'
        }
        
        with patch('app.email.service.SendGridAPIClient') as mock_client:
            # Setup mock response
            mock_response = Mock()
            mock_response.status_code = 202
            mock_client.return_value.send.return_value = mock_response
            
            from app.email.service import EmailService
            
            email_service = EmailService()
            
            # Test email sending
            result = email_service.send_password_reset_email(
                user_email='user@example.com',
                reset_token='test-reset-token-123'
            )
            
            # Verify result
            assert result['success'] is True
            assert result['email'] == 'user@example.com'
            assert result['status_code'] == 202
            
            # Verify SendGrid was called
            mock_client.return_value.send.assert_called_once()
            
            print("✓ Password reset email test passed")

def test_email_content_generation():
    """Test email content generation methods."""
    print("Testing email content generation...")
    
    with patch('app.email.service.current_app') as mock_app:
        mock_app.config = {
            'SENDGRID_API_KEY': 'test-api-key',
            'SENDGRID_FROM_EMAIL': 'test@oriel-fx.com'
        }
        
        with patch('app.email.service.SendGridAPIClient'):
            from app.email.service import EmailService
            
            email_service = EmailService()
            
            # Test completion email content
            html_content = email_service._create_completion_email_html(
                'https://example.com/video.mp4', 
                'test-job-123'
            )
            text_content = email_service._create_completion_email_text(
                'https://example.com/video.mp4', 
                'test-job-123'
            )
            
            assert 'test-job-123' in html_content
            assert 'https://example.com/video.mp4' in html_content
            assert 'test-job-123' in text_content
            assert 'https://example.com/video.mp4' in text_content
            
            # Test welcome email content
            welcome_html = email_service._create_welcome_email_html('Test User')
            welcome_text = email_service._create_welcome_email_text('Test User')
            
            assert 'Test User' in welcome_html
            assert 'Test User' in welcome_text
            
            # Test password reset content
            reset_html = email_service._create_password_reset_email_html('https://example.com/reset?token=123')
            reset_text = email_service._create_password_reset_email_text('https://example.com/reset?token=123')
            
            assert 'https://example.com/reset?token=123' in reset_html
            assert 'https://example.com/reset?token=123' in reset_text
            
            print("✓ Email content generation test passed")

def main():
    """Run all tests."""
    print("Running email service tests...\n")
    
    try:
        test_email_service_initialization()
        test_video_completion_email()
        test_welcome_email()
        test_password_reset_email()
        test_email_content_generation()
        
        print("\n✅ All email service tests passed!")
        return 0
        
    except Exception as e:
        print(f"\n❌ Test failed: {e}")
        import traceback
        traceback.print_exc()
        return 1

if __name__ == '__main__':
    sys.exit(main())