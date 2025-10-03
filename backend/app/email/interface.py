"""
Email service interface definition.
"""
from abc import ABC, abstractmethod
from typing import Dict, Any


class EmailServiceInterface(ABC):
    """Abstract base class for email services."""
    
    @abstractmethod
    def send_password_reset_email(self, user_email: str, reset_token: str) -> Dict[str, Any]:
        """
        Send password reset email.
        
        Args:
            user_email: User's email address
            reset_token: Password reset token
            
        Returns:
            dict: Email sending result with keys:
                - success: bool
                - email: str
                - status_code: int
                - sent_at: str (ISO timestamp)
                - mode: str (email service mode)
        """
        pass
    
    @abstractmethod
    def send_welcome_email(self, user_email: str, user_name: str = None) -> Dict[str, Any]:
        """
        Send welcome email to new users.
        
        Args:
            user_email: New user's email address
            user_name: User's name (optional)
            
        Returns:
            dict: Email sending result with keys:
                - success: bool
                - email: str
                - status_code: int
                - sent_at: str (ISO timestamp)
                - mode: str (email service mode)
        """
        pass
    
    @abstractmethod
    def send_video_completion_email(self, user_email: str, video_url: str, job_id: str) -> Dict[str, Any]:
        """
        Send video completion notification email.
        
        Args:
            user_email: Recipient email address
            video_url: URL to download the rendered video
            job_id: Job ID for reference
            
        Returns:
            dict: Email sending result with keys:
                - success: bool
                - email: str
                - status_code: int
                - sent_at: str (ISO timestamp)
                - mode: str (email service mode)
                - job_id: str (for video emails)
        """
        pass
    
    @abstractmethod
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
            dict: Email sending result with keys:
                - success: bool
                - email: str
                - status_code: int
                - sent_at: str (ISO timestamp)
                - mode: str (email service mode)
                - purchase_id: str (for licensing emails)
        """
        pass
    
    @abstractmethod
    def send_email(self, to_email: str, subject: str, html_content: str = None, 
                   text_content: str = None, **kwargs) -> Dict[str, Any]:
        """
        Send a generic email.
        
        Args:
            to_email: Recipient email address
            subject: Email subject line
            html_content: HTML email content (optional)
            text_content: Plain text email content (optional)
            **kwargs: Additional email parameters
            
        Returns:
            dict: Email sending result with keys:
                - success: bool
                - email: str
                - status_code: int
                - sent_at: str (ISO timestamp)
                - mode: str (email service mode)
        """
        pass