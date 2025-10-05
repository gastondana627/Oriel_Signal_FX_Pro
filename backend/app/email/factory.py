"""
Email service factory for choosing between development and production email services.
"""
import os
import logging
from typing import Union
from flask import current_app

from .interface import EmailServiceInterface
from .console_service import ConsoleEmailService

logger = logging.getLogger(__name__)


def get_email_service() -> EmailServiceInterface:
    """
    Get the appropriate email service based on environment configuration.
    
    Returns:
        EmailServiceInterface: Configured email service (SendGrid or Console)
    """
    try:
        # Check if we're in development mode or if SendGrid is not configured
        is_development = current_app.config.get('ENV') == 'development'
        sendgrid_api_key = current_app.config.get('SENDGRID_API_KEY')
        sendgrid_from_email = current_app.config.get('SENDGRID_FROM_EMAIL')
        
        # Use console service if in development or SendGrid not configured
        if is_development or not sendgrid_api_key or not sendgrid_from_email:
            logger.info("Using Console Email Service (development mode)")
            return ConsoleEmailService()
        
        # Try to use SendGrid service for production
        try:
            from .service import EmailService
            logger.info("Using SendGrid Email Service (production mode)")
            return EmailService()
        except ImportError as e:
            logger.warning(f"SendGrid not available, falling back to console service: {e}")
            return ConsoleEmailService()
            
    except Exception as e:
        logger.error(f"Error initializing email service, falling back to console: {e}")
        return ConsoleEmailService()


class EmailServiceFactory:
    """Factory class for creating email service instances."""
    
    @staticmethod
    def create_service(force_console: bool = False) -> EmailServiceInterface:
        """
        Create an email service instance.
        
        Args:
            force_console: Force use of console service for testing
            
        Returns:
            EmailServiceInterface: Configured email service
        """
        if force_console:
            return ConsoleEmailService()
        
        return get_email_service()
    
    @staticmethod
    def create_console_service() -> ConsoleEmailService:
        """Create a console email service for development/testing."""
        return ConsoleEmailService()
    
    @staticmethod
    def create_sendgrid_service(api_key: str = None, from_email: str = None) -> 'EmailService':
        """
        Create a SendGrid email service.
        
        Args:
            api_key: SendGrid API key (optional, uses config if not provided)
            from_email: From email address (optional, uses config if not provided)
            
        Returns:
            EmailService: SendGrid email service
            
        Raises:
            ImportError: If SendGrid is not available
            ValueError: If required configuration is missing
        """
        try:
            from .service import EmailService
            return EmailService(api_key=api_key, from_email=from_email)
        except ImportError:
            raise ImportError("SendGrid package not available. Install with: pip install sendgrid")


def configure_email_service(app):
    """
    Configure email service for Flask app.
    
    Args:
        app: Flask application instance
    """
    with app.app_context():
        try:
            # Test email service initialization
            service = get_email_service()
            logger.info(f"Email service configured: {type(service).__name__}")
            
            # Store service type in app config for reference
            app.config['EMAIL_SERVICE_TYPE'] = type(service).__name__
            
        except Exception as e:
            logger.error(f"Failed to configure email service: {e}")
            app.config['EMAIL_SERVICE_TYPE'] = 'ConsoleEmailService'


def send_test_email(to_email: str, service_type: str = 'auto') -> dict:
    """
    Send a test email to verify email service configuration.
    
    Args:
        to_email: Recipient email address
        service_type: Type of service to use ('auto', 'console', 'sendgrid')
        
    Returns:
        dict: Test result
    """
    try:
        # Get appropriate service
        if service_type == 'console':
            service = EmailServiceFactory.create_console_service()
        elif service_type == 'sendgrid':
            service = EmailServiceFactory.create_sendgrid_service()
        else:
            service = get_email_service()
        
        # Send test email
        result = service.send_welcome_email(
            user_email=to_email,
            user_name="Test User"
        )
        
        return {
            'success': True,
            'service_type': type(service).__name__,
            'result': result
        }
        
    except Exception as e:
        logger.error(f"Test email failed: {e}")
        return {
            'success': False,
            'error': str(e),
            'service_type': service_type
        }