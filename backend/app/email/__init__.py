"""
Email delivery system with SendGrid and console services.
"""
from .factory import get_email_service, EmailServiceFactory, configure_email_service, send_test_email
from .console_service import ConsoleEmailService
from .interface import EmailServiceInterface

try:
    from .service import EmailService
    __all__ = [
        'EmailService', 'ConsoleEmailService', 'EmailServiceInterface',
        'get_email_service', 'EmailServiceFactory', 'configure_email_service', 'send_test_email'
    ]
except ImportError:
    # SendGrid not available, only export console service and factory
    __all__ = [
        'ConsoleEmailService', 'EmailServiceInterface',
        'get_email_service', 'EmailServiceFactory', 'configure_email_service', 'send_test_email'
    ]