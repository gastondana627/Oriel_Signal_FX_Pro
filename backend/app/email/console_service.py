"""
Console email service implementation for development.
"""
import logging
from typing import Dict, Any
from datetime import datetime, timezone
from .interface import EmailServiceInterface

logger = logging.getLogger(__name__)


class ConsoleEmailService(EmailServiceInterface):
    """Email service that logs emails to console for development."""
    
    def __init__(self):
        """Initialize console email service."""
        self.logger = logging.getLogger(__name__)
        self.logger.info("🔧 Console Email Service initialized - Development Mode Active")
    
    def send_password_reset_email(self, user_email: str, reset_token: str) -> Dict[str, Any]:
        """
        Send password reset email via console logging.
        
        Args:
            user_email: User's email address
            reset_token: Password reset token
            
        Returns:
            dict: Email sending result
        """
        try:
            # Create reset URL (this would be your frontend URL)
            reset_url = f"http://localhost:3000/reset-password?token={reset_token}"
            
            subject = "Reset Your Oriel FX Password"
            html_content = self._create_password_reset_email_html(reset_url)
            text_content = self._create_password_reset_email_text(reset_url)
            
            # Log email to console with formatting
            self._log_email(
                to=user_email,
                subject=subject,
                html_content=html_content,
                text_content=text_content,
                important_links=[("Reset Password", reset_url)]
            )
            
            return {
                'success': True,
                'email': user_email,
                'status_code': 200,
                'sent_at': datetime.now(timezone.utc).isoformat(),
                'mode': 'console'
            }
            
        except Exception as e:
            self.logger.error(f"Failed to log password reset email for {user_email}: {e}")
            return {
                'success': False,
                'email': user_email,
                'status_code': 500,
                'sent_at': datetime.now(timezone.utc).isoformat(),
                'mode': 'console',
                'error': str(e)
            }
    
    def send_welcome_email(self, user_email: str, user_name: str = None) -> Dict[str, Any]:
        """
        Send welcome email via console logging.
        
        Args:
            user_email: New user's email address
            user_name: User's name (optional)
            
        Returns:
            dict: Email sending result
        """
        try:
            subject = "Welcome to Oriel FX! 🎵✨"
            html_content = self._create_welcome_email_html(user_name or user_email)
            text_content = self._create_welcome_email_text(user_name or user_email)
            
            # Log email to console with formatting
            self._log_email(
                to=user_email,
                subject=subject,
                html_content=html_content,
                text_content=text_content,
                important_links=[("Start Creating", "http://localhost:3000/dashboard")]
            )
            
            return {
                'success': True,
                'email': user_email,
                'status_code': 200,
                'sent_at': datetime.now(timezone.utc).isoformat(),
                'mode': 'console'
            }
            
        except Exception as e:
            self.logger.error(f"Failed to log welcome email for {user_email}: {e}")
            return {
                'success': False,
                'email': user_email,
                'status_code': 500,
                'sent_at': datetime.now(timezone.utc).isoformat(),
                'mode': 'console',
                'error': str(e)
            }
    
    def send_video_completion_email(self, user_email: str, video_url: str, job_id: str) -> Dict[str, Any]:
        """
        Send video completion notification email via console logging.
        
        Args:
            user_email: Recipient email address
            video_url: URL to download the rendered video
            job_id: Job ID for reference
            
        Returns:
            dict: Email sending result
        """
        try:
            subject = "Your Oriel FX Video is Ready! 🎬"
            html_content = self._create_completion_email_html(video_url, job_id)
            text_content = self._create_completion_email_text(video_url, job_id)
            
            # Log email to console with formatting
            self._log_email(
                to=user_email,
                subject=subject,
                html_content=html_content,
                text_content=text_content,
                important_links=[("Download Video", video_url)],
                job_id=job_id
            )
            
            return {
                'success': True,
                'email': user_email,
                'status_code': 200,
                'sent_at': datetime.now(timezone.utc).isoformat(),
                'mode': 'console',
                'job_id': job_id
            }
            
        except Exception as e:
            self.logger.error(f"Failed to log video completion email for job {job_id}: {e}")
            return {
                'success': False,
                'email': user_email,
                'status_code': 500,
                'sent_at': datetime.now(timezone.utc).isoformat(),
                'mode': 'console',
                'job_id': job_id,
                'error': str(e)
            }
    
    def send_licensing_email(self, user_email: str, subject: str, html_content: str, 
                           text_content: str, purchase_id: str) -> Dict[str, Any]:
        """
        Send licensing email via console logging.
        
        Args:
            user_email: Recipient email address
            subject: Email subject line
            html_content: HTML email content
            text_content: Plain text email content
            purchase_id: Purchase ID for reference
            
        Returns:
            dict: Email sending result
        """
        try:
            # Extract download link for highlighting
            import re
            download_match = re.search(r'href="([^"]*secure_download[^"]*)"', html_content)
            download_links = []
            if download_match:
                download_links.append(("Secure Download", download_match.group(1)))
            
            # Log email to console with formatting
            self._log_email(
                to=user_email,
                subject=subject,
                html_content=html_content,
                text_content=text_content,
                important_links=download_links,
                purchase_id=purchase_id
            )
            
            return {
                'success': True,
                'email': user_email,
                'status_code': 200,
                'sent_at': datetime.now(timezone.utc).isoformat(),
                'mode': 'console',
                'purchase_id': purchase_id
            }
            
        except Exception as e:
            self.logger.error(f"Failed to log licensing email for purchase {purchase_id}: {e}")
            return {
                'success': False,
                'email': user_email,
                'status_code': 500,
                'sent_at': datetime.now(timezone.utc).isoformat(),
                'mode': 'console',
                'purchase_id': purchase_id,
                'error': str(e)
            }
    
    def _log_email(self, to: str, subject: str, html_content: str, text_content: str, 
                   important_links: list = None, job_id: str = None, purchase_id: str = None):
        """
        Log email content to console with pretty formatting.
        
        Args:
            to: Recipient email
            subject: Email subject
            html_content: HTML email content
            text_content: Plain text email content
            important_links: List of (label, url) tuples for highlighting
            job_id: Optional job ID for video emails
            purchase_id: Optional purchase ID for licensing emails
        """
        separator = "=" * 80
        
        # Main email header
        print(f"\n{separator}")
        print("📧 EMAIL SENT (DEVELOPMENT MODE)")
        print(separator)
        print(f"To: {to}")
        print(f"Subject: {subject}")
        print(f"Mode: Console Logging")
        print(f"Timestamp: {datetime.now(timezone.utc).isoformat()}Z")
        
        if job_id:
            print(f"Job ID: {job_id}")
        
        if purchase_id:
            print(f"Purchase ID: {purchase_id}")
        
        # Important links section
        if important_links:
            print(f"\n🔗 IMPORTANT LINKS:")
            for label, url in important_links:
                print(f"{label}: {url}")
        
        # HTML content section
        print(f"\n📄 HTML CONTENT:")
        print("-" * 40)
        # Clean up HTML for better console readability
        clean_html = self._clean_html_for_console(html_content)
        print(clean_html)
        
        # Text content section
        print(f"\n📝 TEXT CONTENT:")
        print("-" * 40)
        print(text_content.strip())
        
        print(f"\n{separator}")
        print("✅ Email logged successfully to console")
        print(separator)
    
    def _clean_html_for_console(self, html_content: str) -> str:
        """
        Clean HTML content for better console display.
        
        Args:
            html_content: Raw HTML content
            
        Returns:
            str: Cleaned content for console display
        """
        import re
        
        # Remove HTML tags but keep the content
        clean = re.sub(r'<[^>]+>', '', html_content)
        
        # Clean up extra whitespace
        clean = re.sub(r'\n\s*\n', '\n\n', clean)
        clean = re.sub(r'^\s+', '', clean, flags=re.MULTILINE)
        
        # Limit line length for better console readability
        lines = clean.split('\n')
        formatted_lines = []
        for line in lines:
            if len(line) > 70:
                # Simple word wrap
                words = line.split()
                current_line = ""
                for word in words:
                    if len(current_line + word) > 70:
                        if current_line:
                            formatted_lines.append(current_line.strip())
                            current_line = word + " "
                        else:
                            formatted_lines.append(word)
                            current_line = ""
                    else:
                        current_line += word + " "
                if current_line:
                    formatted_lines.append(current_line.strip())
            else:
                formatted_lines.append(line)
        
        return '\n'.join(formatted_lines).strip()
    
    def _create_completion_email_html(self, video_url: str, job_id: str) -> str:
        """Create HTML content for video completion email."""
        return f"""
        <!DOCTYPE html>
        <html>
        <head>
            <meta charset="utf-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>Your Oriel FX Video is Ready!</title>
        </head>
        <body>
            <div class="container">
                <div class="header">
                    <h1>🎬 Your Video is Ready!</h1>
                    <p>Your Oriel FX audio visualization has been created successfully</p>
                </div>
                <div class="content">
                    <h2>Download Your Masterpiece</h2>
                    <p>Great news! Your audio visualization video has been processed and is ready for download.</p>
                    
                    <p><strong>Job ID:</strong> {job_id}</p>
                    
                    <a href="{video_url}">Download Video</a>
                    
                    <p><strong>Important:</strong> This download link will expire in 24 hours for security reasons. Please download your video soon!</p>
                    
                    <h3>What's Next?</h3>
                    <ul>
                        <li>Share your creation on social media</li>
                        <li>Create more visualizations with different audio tracks</li>
                        <li>Explore our premium features for longer videos</li>
                    </ul>
                </div>
                <div class="footer">
                    <p>Thanks for using Oriel FX!</p>
                    <p>If you have any questions, feel free to reach out to our support team.</p>
                </div>
            </div>
        </body>
        </html>
        """
    
    def _create_completion_email_text(self, video_url: str, job_id: str) -> str:
        """Create plain text content for video completion email."""
        return f"""
Your Oriel FX Video is Ready!

Great news! Your audio visualization video has been processed and is ready for download.

Job ID: {job_id}

Download your video: {video_url}

IMPORTANT: This download link will expire in 24 hours for security reasons. Please download your video soon!

What's Next?
- Share your creation on social media
- Create more visualizations with different audio tracks
- Explore our premium features for longer videos

Thanks for using Oriel FX!

If you have any questions, feel free to reach out to our support team.
        """
    
    def _create_welcome_email_html(self, user_name: str) -> str:
        """Create HTML content for welcome email."""
        return f"""
        <!DOCTYPE html>
        <html>
        <head>
            <meta charset="utf-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>Welcome to Oriel FX!</title>
        </head>
        <body>
            <div class="container">
                <div class="header">
                    <h1>🎵 Welcome to Oriel FX!</h1>
                    <p>Transform your audio into stunning visual experiences</p>
                </div>
                <div class="content">
                    <h2>Hello {user_name}!</h2>
                    <p>Welcome to Oriel FX, where your music comes to life through beautiful visualizations!</p>
                    
                    <h3>Getting Started</h3>
                    <ul>
                        <li>Upload your favorite audio tracks</li>
                        <li>Choose from various visualization styles</li>
                        <li>Customize colors and effects</li>
                        <li>Download your personalized video</li>
                    </ul>
                    
                    <a href="http://localhost:3000/dashboard">Start Creating</a>
                    
                    <p>We're excited to see what amazing visualizations you'll create!</p>
                </div>
                <div class="footer">
                    <p>Happy creating!</p>
                    <p>The Oriel FX Team</p>
                </div>
            </div>
        </body>
        </html>
        """
    
    def _create_welcome_email_text(self, user_name: str) -> str:
        """Create plain text content for welcome email."""
        return f"""
Welcome to Oriel FX!

Hello {user_name}!

Welcome to Oriel FX, where your music comes to life through beautiful visualizations!

Getting Started:
- Upload your favorite audio tracks
- Choose from various visualization styles
- Customize colors and effects
- Download your personalized video

Start creating: http://localhost:3000/dashboard

We're excited to see what amazing visualizations you'll create!

Happy creating!
The Oriel FX Team
        """
    
    def _create_password_reset_email_html(self, reset_url: str) -> str:
        """Create HTML content for password reset email."""
        return f"""
        <!DOCTYPE html>
        <html>
        <head>
            <meta charset="utf-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>Reset Your Oriel FX Password</title>
        </head>
        <body>
            <div class="container">
                <div class="header">
                    <h1>🔐 Password Reset</h1>
                    <p>Reset your Oriel FX account password</p>
                </div>
                <div class="content">
                    <h2>Reset Your Password</h2>
                    <p>We received a request to reset your password. Click the button below to create a new password:</p>
                    
                    <a href="{reset_url}">Reset Password</a>
                    
                    <p><strong>Important:</strong> This link will expire in 1 hour for security reasons.</p>
                    
                    <p>If you didn't request this password reset, please ignore this email. Your password will remain unchanged.</p>
                </div>
                <div class="footer">
                    <p>Oriel FX Security Team</p>
                </div>
            </div>
        </body>
        </html>
        """
    
    def _create_password_reset_email_text(self, reset_url: str) -> str:
        """Create plain text content for password reset email."""
        return f"""
Reset Your Oriel FX Password

We received a request to reset your password. Click the link below to create a new password:

{reset_url}

IMPORTANT: This link will expire in 1 hour for security reasons.

If you didn't request this password reset, please ignore this email. Your password will remain unchanged.

Oriel FX Security Team
        """
    
    def send_email(self, to_email: str, subject: str, html_content: str = None, 
                   text_content: str = None, **kwargs) -> Dict[str, Any]:
        """
        Send a generic email via console logging.
        
        Args:
            to_email: Recipient email address
            subject: Email subject line
            html_content: HTML email content (optional)
            text_content: Plain text email content (optional)
            **kwargs: Additional email parameters
            
        Returns:
            dict: Email sending result
        """
        try:
            # Use text content if no HTML provided
            if not html_content and text_content:
                html_content = f"<pre>{text_content}</pre>"
            
            # Use HTML content if no text provided
            if not text_content and html_content:
                text_content = self._clean_html_for_console(html_content)
            
            # Default content if neither provided
            if not html_content and not text_content:
                html_content = "<p>No content provided</p>"
                text_content = "No content provided"
            
            # Extract any important links from kwargs or HTML
            important_links = kwargs.get('important_links', [])
            
            # Log email to console with formatting
            self._log_email(
                to=to_email,
                subject=subject,
                html_content=html_content,
                text_content=text_content,
                important_links=important_links,
                **{k: v for k, v in kwargs.items() if k not in ['important_links']}
            )
            
            return {
                'success': True,
                'email': to_email,
                'status_code': 200,
                'sent_at': datetime.now(timezone.utc).isoformat(),
                'mode': 'console'
            }
            
        except Exception as e:
            self.logger.error(f"Failed to log generic email to {to_email}: {e}")
            return {
                'success': False,
                'email': to_email,
                'status_code': 500,
                'sent_at': datetime.now(timezone.utc).isoformat(),
                'mode': 'console',
                'error': str(e)
            }