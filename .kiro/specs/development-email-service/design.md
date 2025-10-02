# Development Email Service Design

## Overview

This design implements a development-friendly email service that automatically detects the environment and uses console logging for email delivery in development while maintaining SendGrid integration for production. The solution provides a seamless developer experience without requiring external email service configuration.

## Architecture

### Email Service Factory Pattern

```
EmailServiceFactory
├── detect_environment()
├── create_service() → EmailService | ConsoleEmailService
└── get_service() → Singleton instance

EmailService (Production)
├── SendGrid integration
├── Real email delivery
└── Production error handling

ConsoleEmailService (Development)
├── Console logging
├── Email content formatting
└── Development-friendly output
```

### Environment Detection Logic

1. **Check SendGrid Configuration**
   - Look for `SENDGRID_API_KEY` and `SENDGRID_FROM_EMAIL`
   - Validate API key format (starts with 'SG.')
   - Validate email format

2. **Fallback Strategy**
   - If credentials missing → Console mode
   - If credentials invalid → Console mode with warning
   - If credentials valid → SendGrid mode

## Components and Interfaces

### 1. Email Service Interface

```python
class EmailServiceInterface:
    def send_password_reset_email(self, user_email: str, reset_token: str) -> Dict[str, Any]
    def send_welcome_email(self, user_email: str, user_name: str = None) -> Dict[str, Any]
    def send_video_completion_email(self, user_email: str, video_url: str, job_id: str) -> Dict[str, Any]
```

### 2. Console Email Service

```python
class ConsoleEmailService(EmailServiceInterface):
    def __init__(self):
        self.logger = logging.getLogger(__name__)
        
    def send_password_reset_email(self, user_email: str, reset_token: str) -> Dict[str, Any]:
        # Format and log email content
        # Return success response matching production format
        
    def _log_email(self, to: str, subject: str, html_content: str, text_content: str):
        # Pretty-print email content to console
        # Include separator lines for readability
        # Highlight important links/tokens
```

### 3. Email Service Factory

```python
class EmailServiceFactory:
    _instance = None
    
    @classmethod
    def get_service(cls) -> EmailServiceInterface:
        if cls._instance is None:
            cls._instance = cls._create_service()
        return cls._instance
    
    @classmethod
    def _create_service(cls) -> EmailServiceInterface:
        if cls._has_sendgrid_config():
            return EmailService()
        else:
            return ConsoleEmailService()
```

### 4. Configuration Updates

Update existing email service initialization to use factory:

```python
# In auth/routes.py and other email usage
from app.email.factory import EmailServiceFactory

def request_password_reset():
    email_service = EmailServiceFactory.get_service()
    result = email_service.send_password_reset_email(email, token)
```

## Data Models

### Email Response Format

Both services return consistent response format:

```python
{
    'success': bool,
    'email': str,
    'status_code': int,  # 200 for console, actual for SendGrid
    'sent_at': str,      # ISO timestamp
    'mode': str,         # 'console' or 'sendgrid'
    'job_id': str        # Optional, for video emails
}
```

### Console Output Format

```
================================================================================
📧 EMAIL SENT (DEVELOPMENT MODE)
================================================================================
To: user@example.com
Subject: Reset Your Oriel FX Password
Mode: Console Logging
Timestamp: 2024-01-15T10:30:00Z

🔗 IMPORTANT LINKS:
Reset Password: http://localhost:3000/reset-password?token=abc123...

📄 HTML CONTENT:
[Formatted HTML content...]

📝 TEXT CONTENT:
[Plain text content...]

================================================================================
```

## Error Handling

### Development Mode Errors

1. **Missing Configuration**
   - Log clear message about console mode
   - Continue with console logging
   - No application failure

2. **Invalid Email Addresses**
   - Log warning but continue
   - Validate format in console output
   - Return success for development

### Production Mode Errors

1. **SendGrid API Errors**
   - Log detailed error information
   - Attempt fallback to console mode
   - Return appropriate error response

2. **Network Issues**
   - Retry logic (existing)
   - Fallback to console logging
   - Alert administrators

## Testing Strategy

### Unit Tests

1. **EmailServiceFactory Tests**
   - Test environment detection
   - Test service creation logic
   - Test singleton behavior

2. **ConsoleEmailService Tests**
   - Test email content formatting
   - Test console output generation
   - Test response format consistency

3. **Integration Tests**
   - Test with missing SendGrid config
   - Test with invalid SendGrid config
   - Test with valid SendGrid config

### Development Testing

1. **Password Reset Flow**
   - Trigger password reset
   - Verify console output
   - Test reset link functionality

2. **Email Template Testing**
   - Send all email types
   - Verify HTML/text formatting
   - Check link generation

## Implementation Notes

### File Structure

```
backend/app/email/
├── __init__.py
├── service.py          # Existing SendGrid service
├── console_service.py  # New console email service
├── factory.py          # New email service factory
└── interface.py        # New email service interface
```

### Configuration Changes

Update `backend/config.py`:

```python
class Config:
    # Email configuration (existing)
    SENDGRID_API_KEY = os.environ.get('SENDGRID_API_KEY')
    SENDGRID_FROM_EMAIL = os.environ.get('SENDGRID_FROM_EMAIL')
    
    # Development email settings (new)
    EMAIL_MODE = os.environ.get('EMAIL_MODE', 'auto')  # auto, console, sendgrid
    DEVELOPMENT_EMAIL_LOGGING = True
```

### Backward Compatibility

- Existing `EmailService` class remains unchanged
- New factory pattern wraps existing functionality
- All existing email calls continue to work
- No breaking changes to API

This design ensures seamless development experience while maintaining production reliability and providing clear visibility into email functionality during testing.