"""
Email delivery system using SendGrid.
"""
try:
    from .service import EmailService, get_email_service
    __all__ = ['EmailService', 'get_email_service']
except ImportError:
    # SendGrid not available, only export console service
    __all__ = []