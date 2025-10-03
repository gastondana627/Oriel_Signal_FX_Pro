"""
Email service implementation using SendGrid.
"""
import os
import logging
from typing import Optional, Dict, Any
from datetime import datetime
from sendgrid import SendGridAPIClient
from sendgrid.helpers.mail import Mail, Email, To, Content
from flask import current_app
from .interface import EmailServiceInterface

logger = logging.getLogger(__name__)

class EmailService(EmailServiceInterface):
    """Email service using SendGrid for delivery."""
    
    def __init__(self, api_key: str = None, from_email: str = None):
        """
        Initialize email service.
        
        Args:
            api_key: SendGrid API key (defaults to config)
            from_email: From email address (defaults to config)
        """
        self.api_key = api_key or current_app.config.get('SENDGRID_API_KEY')
        self.from_email = from_email or current_app.config.get('SENDGRID_FROM_EMAIL')
        
        if not self.api_key:
            raise ValueError("SENDGRID_API_KEY must be configured")
        if not self.from_email:
            raise ValueError("SENDGRID_FROM_EMAIL must be configured")
        
        self.client = SendGridAPIClient(api_key=self.api_key)
        logger.info(f"Initialized email service with from address: {self.from_email}")
    
    def send_video_completion_email(self, user_email: str, video_url: str, job_id: str) -> Dict[str, Any]:
        """
        Send video completion notification email.
        
        Args:
            user_email: Recipient email address
            video_url: URL to download the rendered video
            job_id: Job ID for reference
            
        Returns:
            dict: Email sending result
            
        Raises:
            Exception: If email sending fails
        """
        try:
            logger.info(f"Sending video completion email for job {job_id} to {user_email}")
            
            # Create email content
            subject = "Your Oriel FX Video is Ready! 🎬"
            
            html_content = self._create_completion_email_html(video_url, job_id)
            text_content = self._create_completion_email_text(video_url, job_id)
            
            # Create mail object
            mail = Mail(
                from_email=Email(self.from_email, "Oriel FX"),
                to_emails=To(user_email),
                subject=subject,
                html_content=Content("text/html", html_content),
                plain_text_content=Content("text/plain", text_content)
            )
            
            # Send email
            response = self.client.send(mail)
            
            logger.info(f"Email sent successfully for job {job_id}. Status: {response.status_code}")
            
            return {
                'success': True,
                'job_id': job_id,
                'email': user_email,
                'status_code': response.status_code,
                'sent_at': datetime.utcnow().isoformat(),
                'mode': 'sendgrid'
            }
            
        except Exception as e:
            logger.error(f"Failed to send video completion email for job {job_id}: {e}")
            raise
    
    def send_welcome_email(self, user_email: str, user_name: str = None) -> Dict[str, Any]:
        """
        Send welcome email to new users.
        
        Args:
            user_email: New user's email address
            user_name: User's name (optional)
            
        Returns:
            dict: Email sending result
        """
        try:
            logger.info(f"Sending welcome email to {user_email}")
            
            subject = "Welcome to Oriel FX! 🎵✨"
            
            html_content = self._create_welcome_email_html(user_name or user_email)
            text_content = self._create_welcome_email_text(user_name or user_email)
            
            mail = Mail(
                from_email=Email(self.from_email, "Oriel FX"),
                to_emails=To(user_email),
                subject=subject,
                html_content=Content("text/html", html_content),
                plain_text_content=Content("text/plain", text_content)
            )
            
            response = self.client.send(mail)
            
            logger.info(f"Welcome email sent successfully to {user_email}. Status: {response.status_code}")
            
            return {
                'success': True,
                'email': user_email,
                'status_code': response.status_code,
                'sent_at': datetime.utcnow().isoformat(),
                'mode': 'sendgrid'
            }
            
        except Exception as e:
            logger.error(f"Failed to send welcome email to {user_email}: {e}")
            raise
    
    def send_password_reset_email(self, user_email: str, reset_token: str) -> Dict[str, Any]:
        """
        Send password reset email.
        
        Args:
            user_email: User's email address
            reset_token: Password reset token
            
        Returns:
            dict: Email sending result
        """
        try:
            logger.info(f"Sending password reset email to {user_email}")
            
            subject = "Reset Your Oriel FX Password"
            
            # Create reset URL (this would be your frontend URL)
            reset_url = f"https://oriel-fx.com/reset-password?token={reset_token}"
            
            html_content = self._create_password_reset_email_html(reset_url)
            text_content = self._create_password_reset_email_text(reset_url)
            
            mail = Mail(
                from_email=Email(self.from_email, "Oriel FX"),
                to_emails=To(user_email),
                subject=subject,
                html_content=Content("text/html", html_content),
                plain_text_content=Content("text/plain", text_content)
            )
            
            response = self.client.send(mail)
            
            logger.info(f"Password reset email sent successfully to {user_email}. Status: {response.status_code}")
            
            return {
                'success': True,
                'email': user_email,
                'status_code': response.status_code,
                'sent_at': datetime.utcnow().isoformat(),
                'mode': 'sendgrid'
            }
            
        except Exception as e:
            logger.error(f"Failed to send password reset email to {user_email}: {e}")
            raise
    
    def _create_completion_email_html(self, video_url: str, job_id: str) -> str:
        """Create HTML content for video completion email."""
        return f"""
        <!DOCTYPE html>
        <html>
        <head>
            <meta charset="utf-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>Your Oriel FX Video is Ready!</title>
            <style>
                body {{ font-family: Arial, sans-serif; line-height: 1.6; color: #333; }}
                .container {{ max-width: 600px; margin: 0 auto; padding: 20px; }}
                .header {{ background: linear-gradient(135deg, #8309D5, #FF6B6B); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }}
                .content {{ background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px; }}
                .button {{ display: inline-block; background: #8309D5; color: white; padding: 15px 30px; text-decoration: none; border-radius: 5px; margin: 20px 0; }}
                .footer {{ text-align: center; margin-top: 30px; color: #666; font-size: 14px; }}
            </style>
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
                    
                    <a href="{video_url}" class="button">Download Video</a>
                    
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
            <style>
                body {{ font-family: Arial, sans-serif; line-height: 1.6; color: #333; }}
                .container {{ max-width: 600px; margin: 0 auto; padding: 20px; }}
                .header {{ background: linear-gradient(135deg, #8309D5, #FF6B6B); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }}
                .content {{ background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px; }}
                .button {{ display: inline-block; background: #8309D5; color: white; padding: 15px 30px; text-decoration: none; border-radius: 5px; margin: 20px 0; }}
                .footer {{ text-align: center; margin-top: 30px; color: #666; font-size: 14px; }}
            </style>
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
                    
                    <a href="https://oriel-fx.com/dashboard" class="button">Start Creating</a>
                    
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

Start creating: https://oriel-fx.com/dashboard

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
            <style>
                body {{ font-family: Arial, sans-serif; line-height: 1.6; color: #333; }}
                .container {{ max-width: 600px; margin: 0 auto; padding: 20px; }}
                .header {{ background: #8309D5; color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }}
                .content {{ background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px; }}
                .button {{ display: inline-block; background: #8309D5; color: white; padding: 15px 30px; text-decoration: none; border-radius: 5px; margin: 20px 0; }}
                .footer {{ text-align: center; margin-top: 30px; color: #666; font-size: 14px; }}
            </style>
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
                    
                    <a href="{reset_url}" class="button">Reset Password</a>
                    
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
    
    def send_licensing_email(self, user_email: str, subject: str, html_content: str, 
                           text_content: str, purchase_id: str) -> Dict[str, Any]:
        """
        Send licensing email with purchase details and license terms.
        
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
            logger.info(f"Sending licensing email for purchase {purchase_id} to {user_email}")
            
            # Create mail object
            mail = Mail(
                from_email=Email(self.from_email, "Oriel FX"),
                to_emails=To(user_email),
                subject=subject,
                html_content=Content("text/html", html_content),
                plain_text_content=Content("text/plain", text_content)
            )
            
            # Send email
            response = self.client.send(mail)
            
            logger.info(f"Licensing email sent successfully for purchase {purchase_id}. Status: {response.status_code}")
            
            return {
                'success': True,
                'email': user_email,
                'status_code': response.status_code,
                'sent_at': datetime.utcnow().isoformat(),
                'mode': 'sendgrid',
                'purchase_id': purchase_id
            }
            
        except Exception as e:
            logger.error(f"Failed to send licensing email for purchase {purchase_id}: {e}")
            raise

def get_email_service() -> EmailService:
    """
    Get a configured email service instance.
    
    Returns:
        EmailService: Configured email service
    """
    return EmailService()