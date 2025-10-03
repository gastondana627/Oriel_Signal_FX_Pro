"""
Licensing service for generating license terms and sending licensing emails.
"""
import logging
from datetime import datetime, timezone
from typing import Dict, Any, Tuple, Optional
from flask import current_app, url_for
from ..models import Purchase, User
from ..email.interface import EmailServiceInterface
from ..email.console_service import ConsoleEmailService

# Try to import EmailService, fall back to console service if dependencies missing
try:
    from ..email.service import EmailService
    EMAIL_SERVICE_AVAILABLE = True
except ImportError:
    EMAIL_SERVICE_AVAILABLE = False
from .config import PRICING_TIERS, get_tier_info

logger = logging.getLogger(__name__)


class LicensingService:
    """Service for handling licensing and email delivery for purchases"""
    
    def __init__(self, email_service: EmailServiceInterface = None):
        """
        Initialize licensing service
        
        Args:
            email_service: Email service instance (defaults to console service in dev)
        """
        self._email_service = email_service
        self._initialized_email_service = None
        logger.info("LicensingService initialized")
    
    @property
    def email_service(self):
        """Lazy initialization of email service to avoid application context issues"""
        if self._initialized_email_service is None:
            if self._email_service:
                self._initialized_email_service = self._email_service
            else:
                # Use console service for development, real service for production
                try:
                    if current_app.config.get('DEVELOPMENT_MODE', True) or not EMAIL_SERVICE_AVAILABLE:
                        self._initialized_email_service = ConsoleEmailService()
                    else:
                        self._initialized_email_service = EmailService()
                except RuntimeError:
                    # Fallback to console service if no app context
                    self._initialized_email_service = ConsoleEmailService()
        return self._initialized_email_service
    
    def generate_license_terms(self, tier: str, purchase_id: str) -> str:
        """
        Generate legal license text based on tier
        
        Args:
            tier: Pricing tier (personal, commercial, premium)
            purchase_id: Purchase reference ID
            
        Returns:
            str: Formatted license agreement text
        """
        tier_info = get_tier_info(tier)
        if not tier_info:
            raise ValueError(f"Invalid pricing tier: {tier}")
        
        license_type = tier_info['license']
        current_date = datetime.now(timezone.utc).strftime("%B %d, %Y")
        
        if license_type == 'personal_use':
            return self._generate_personal_license(purchase_id, current_date, tier_info)
        elif license_type == 'commercial_use':
            return self._generate_commercial_license(purchase_id, current_date, tier_info)
        elif license_type == 'extended_commercial':
            return self._generate_extended_commercial_license(purchase_id, current_date, tier_info)
        else:
            raise ValueError(f"Unknown license type: {license_type}")
    
    def send_licensing_email(self, purchase_record: Purchase) -> Dict[str, Any]:
        """
        Send licensing email with terms and download link
        
        Args:
            purchase_record: Purchase database record
            
        Returns:
            Dict with email sending result
        """
        try:
            # Get user email
            user_email = self._get_purchase_email(purchase_record)
            if not user_email:
                raise ValueError("No email address found for purchase")
            
            # Generate license terms
            license_terms = self.generate_license_terms(
                purchase_record.tier, 
                purchase_record.id
            )
            
            # Create download URL
            download_url = self._create_download_url(purchase_record.download_token)
            
            # Generate email content
            subject, html_content, text_content = self.create_license_email_content(
                purchase_record, license_terms, download_url
            )
            
            # Send email using the configured email service
            result = self._send_license_email(
                user_email, subject, html_content, text_content, purchase_record
            )
            
            if result.get('success'):
                # Mark license as sent
                purchase_record.license_sent = True
                from ..models import db
                db.session.commit()
                
                logger.info(f"License email sent successfully for purchase {purchase_record.id}")
            
            return result
            
        except Exception as e:
            logger.error(f"Failed to send licensing email for purchase {purchase_record.id}: {e}")
            return {
                'success': False,
                'error': str(e),
                'purchase_id': purchase_record.id
            }
    
    def create_license_email_content(self, purchase: Purchase, license_terms: str, 
                                   download_url: str) -> Tuple[str, str, str]:
        """
        Generate HTML and text email content for licensing
        
        Args:
            purchase: Purchase record
            license_terms: Generated license terms
            download_url: Secure download URL
            
        Returns:
            Tuple of (subject, html_content, text_content)
        """
        tier_info = get_tier_info(purchase.tier)
        tier_name = tier_info['name'] if tier_info else purchase.tier.title()
        
        # Email subject
        subject = f"Your Oriel FX License & Download - {tier_name}"
        
        # Format purchase details
        purchase_details = {
            'purchase_id': purchase.id,
            'tier_name': tier_name,
            'amount': f"${purchase.amount / 100:.2f}",
            'purchase_date': purchase.created_at.strftime("%B %d, %Y at %I:%M %p UTC"),
            'expires_date': purchase.download_expires_at.strftime("%B %d, %Y at %I:%M %p UTC"),
            'resolution': tier_info['resolution'] if tier_info else 'HD',
            'format': tier_info['format'] if tier_info else 'MP4',
            'max_downloads': 5  # From config
        }
        
        # Generate HTML content
        html_content = self._create_license_email_html(
            purchase_details, license_terms, download_url
        )
        
        # Generate text content
        text_content = self._create_license_email_text(
            purchase_details, license_terms, download_url
        )
        
        return subject, html_content, text_content
    
    def resend_license_email(self, purchase_id: str) -> Dict[str, Any]:
        """
        Resend licensing email for an existing purchase
        
        Args:
            purchase_id: Purchase ID to resend license for
            
        Returns:
            Dict with resend result
        """
        try:
            purchase = Purchase.query.get(purchase_id)
            if not purchase:
                return {'success': False, 'error': 'Purchase not found'}
            
            if purchase.status != 'completed':
                return {'success': False, 'error': 'Purchase not completed'}
            
            # Check if download is still valid
            if purchase.download_expires_at < datetime.utcnow():
                return {'success': False, 'error': 'Download link has expired'}
            
            # Send the licensing email
            result = self.send_licensing_email(purchase)
            
            if result.get('success'):
                logger.info(f"License email resent for purchase {purchase_id}")
            
            return result
            
        except Exception as e:
            logger.error(f"Failed to resend license email for purchase {purchase_id}: {e}")
            return {
                'success': False,
                'error': str(e)
            }
    
    def _get_purchase_email(self, purchase: Purchase) -> Optional[str]:
        """Get email address for a purchase"""
        if purchase.user_id:
            user = User.query.get(purchase.user_id)
            return user.email if user else None
        
        # For anonymous purchases, use stored email
        return purchase.user_email
    
    def _create_download_url(self, download_token: str) -> str:
        """Create secure download URL"""
        return url_for('downloads.secure_download', token=download_token, _external=True)
    
    def _send_license_email(self, user_email: str, subject: str, html_content: str, 
                          text_content: str, purchase: Purchase) -> Dict[str, Any]:
        """Send licensing email using the configured email service"""
        try:
            # Create a custom email method for licensing
            result = self._send_custom_email(
                user_email, subject, html_content, text_content, purchase.id
            )
            return result
            
        except Exception as e:
            logger.error(f"Failed to send license email: {e}")
            return {
                'success': False,
                'error': str(e)
            }
    
    def _send_custom_email(self, user_email: str, subject: str, html_content: str, 
                         text_content: str, purchase_id: str) -> Dict[str, Any]:
        """Send custom licensing email"""
        try:
            # Use the email service interface method
            return self.email_service.send_licensing_email(
                user_email, subject, html_content, text_content, purchase_id
            )
            
        except Exception as e:
            return {
                'success': False,
                'error': str(e),
                'purchase_id': purchase_id
            }
    

    
    def _clean_html_for_console(self, html_content: str) -> str:
        """Clean HTML content for better console display"""
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
    
    def _generate_personal_license(self, purchase_id: str, date: str, tier_info: Dict) -> str:
        """Generate personal use license terms"""
        return f"""
PERSONAL USE LICENSE AGREEMENT

Purchase ID: {purchase_id}
License Date: {date}
Product: Audio Visualizer - {tier_info['name']}

GRANT OF LICENSE:
Subject to the terms of this agreement, Oriel FX grants you a non-exclusive, 
non-transferable license to use the purchased audio visualization video for 
personal, non-commercial purposes only.

PERMITTED USES:
• Personal social media posts
• Personal entertainment and enjoyment
• Sharing with friends and family
• Personal creative projects

RESTRICTIONS:
• Commercial use is strictly prohibited
• Resale or redistribution is not permitted
• Modification for commercial purposes is not allowed
• Use in advertising or marketing materials is prohibited

QUALITY SPECIFICATIONS:
• Resolution: {tier_info['resolution']}
• Format: {tier_info['format']}
• License Type: Personal Use Only

This license is effective immediately upon purchase and remains valid indefinitely 
for the permitted uses outlined above.

For commercial use rights, please purchase a Commercial or Premium license.

© 2024 Oriel FX. All rights reserved.
        """.strip()
    
    def _generate_commercial_license(self, purchase_id: str, date: str, tier_info: Dict) -> str:
        """Generate commercial use license terms"""
        return f"""
COMMERCIAL USE LICENSE AGREEMENT

Purchase ID: {purchase_id}
License Date: {date}
Product: Audio Visualizer - {tier_info['name']}

GRANT OF LICENSE:
Subject to the terms of this agreement, Oriel FX grants you a non-exclusive, 
non-transferable license to use the purchased audio visualization video for 
commercial purposes as outlined below.

PERMITTED USES:
• Business marketing and advertising
• Client projects and presentations
• Commercial social media content
• Corporate communications
• Product demonstrations
• Educational and training materials

RESTRICTIONS:
• Resale as a standalone product is prohibited
• Mass distribution without context is not permitted
• Use in competing audio visualization services is prohibited
• Sublicensing to third parties requires written permission

QUALITY SPECIFICATIONS:
• Resolution: {tier_info['resolution']}
• Format: {tier_info['format']}
• License Type: Commercial Use

ATTRIBUTION:
While not required, attribution to Oriel FX is appreciated in commercial uses.

This license is effective immediately upon purchase and remains valid indefinitely 
for the permitted commercial uses outlined above.

© 2024 Oriel FX. All rights reserved.
        """.strip()
    
    def _generate_extended_commercial_license(self, purchase_id: str, date: str, tier_info: Dict) -> str:
        """Generate extended commercial license terms"""
        return f"""
EXTENDED COMMERCIAL LICENSE AGREEMENT

Purchase ID: {purchase_id}
License Date: {date}
Product: Audio Visualizer - {tier_info['name']}

GRANT OF LICENSE:
Subject to the terms of this agreement, Oriel FX grants you a comprehensive, 
non-exclusive, non-transferable license to use the purchased audio visualization 
video for all commercial purposes including extended rights as outlined below.

PERMITTED USES:
• All standard commercial uses (marketing, advertising, client work)
• Broadcast and television use
• Streaming platform content
• Large-scale commercial distribution
• Integration into commercial products
• Resale as part of larger creative packages
• Unlimited commercial distribution rights

ENHANCED RIGHTS:
• 4K Ultra HD quality for professional productions
• Extended distribution rights
• Broadcast quality specifications
• Professional production use
• Large audience commercial use (unlimited viewers)

QUALITY SPECIFICATIONS:
• Resolution: {tier_info['resolution']} (4K Ultra HD)
• Format: {tier_info['format']} (Professional Grade)
• License Type: Extended Commercial Use

ATTRIBUTION:
Attribution to Oriel FX is appreciated but not required for extended commercial uses.

WARRANTY:
This premium license includes enhanced quality assurance and professional-grade 
output suitable for broadcast and high-end commercial applications.

This license is effective immediately upon purchase and remains valid indefinitely 
for all permitted uses outlined above.

© 2024 Oriel FX. All rights reserved.
        """.strip()
    
    def _create_license_email_html(self, purchase_details: Dict, license_terms: str, 
                                 download_url: str) -> str:
        """Create HTML content for licensing email"""
        return f"""
        <!DOCTYPE html>
        <html>
        <head>
            <meta charset="utf-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>Your Oriel FX License & Download</title>
            <style>
                body {{ font-family: Arial, sans-serif; line-height: 1.6; color: #333; margin: 0; padding: 0; }}
                .container {{ max-width: 600px; margin: 0 auto; padding: 20px; }}
                .header {{ background: linear-gradient(135deg, #8309D5, #FF6B6B); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }}
                .content {{ background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px; }}
                .download-section {{ background: #e8f5e8; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #28a745; }}
                .purchase-details {{ background: #fff; padding: 20px; border-radius: 8px; margin: 20px 0; border: 1px solid #ddd; }}
                .license-section {{ background: #fff; padding: 20px; border-radius: 8px; margin: 20px 0; border: 1px solid #ddd; }}
                .button {{ display: inline-block; background: #28a745; color: white; padding: 15px 30px; text-decoration: none; border-radius: 5px; margin: 10px 0; font-weight: bold; }}
                .button:hover {{ background: #218838; }}
                .footer {{ text-align: center; margin-top: 30px; color: #666; font-size: 14px; }}
                .important {{ background: #fff3cd; padding: 15px; border-radius: 5px; border-left: 4px solid #ffc107; margin: 15px 0; }}
                .license-text {{ font-family: 'Courier New', monospace; font-size: 12px; background: #f8f9fa; padding: 15px; border-radius: 5px; white-space: pre-line; }}
                table {{ width: 100%; border-collapse: collapse; }}
                td {{ padding: 8px; border-bottom: 1px solid #eee; }}
                .label {{ font-weight: bold; width: 40%; }}
            </style>
        </head>
        <body>
            <div class="container">
                <div class="header">
                    <h1>📄 Your License & Download</h1>
                    <p>Your Oriel FX purchase is complete with licensing information</p>
                </div>
                <div class="content">
                    <div class="download-section">
                        <h2>🎬 Download Your Video</h2>
                        <p>Your audio visualization is ready! Click the button below to download your video.</p>
                        <a href="{download_url}" class="button">Download Video Now</a>
                        <div class="important">
                            <strong>Important:</strong> This download link expires on {purchase_details['expires_date']} 
                            and allows up to {purchase_details['max_downloads']} downloads.
                        </div>
                    </div>
                    
                    <div class="purchase-details">
                        <h3>📋 Purchase Details</h3>
                        <table>
                            <tr><td class="label">Purchase ID:</td><td>{purchase_details['purchase_id']}</td></tr>
                            <tr><td class="label">Product:</td><td>{purchase_details['tier_name']}</td></tr>
                            <tr><td class="label">Amount Paid:</td><td>{purchase_details['amount']}</td></tr>
                            <tr><td class="label">Purchase Date:</td><td>{purchase_details['purchase_date']}</td></tr>
                            <tr><td class="label">Resolution:</td><td>{purchase_details['resolution']}</td></tr>
                            <tr><td class="label">Format:</td><td>{purchase_details['format']}</td></tr>
                        </table>
                    </div>
                    
                    <div class="license-section">
                        <h3>📜 License Agreement</h3>
                        <p>Please review your license terms below. This license grants you specific rights to use your purchased video.</p>
                        <div class="license-text">{license_terms}</div>
                    </div>
                    
                    <div class="important">
                        <h4>📞 Need Help?</h4>
                        <p>If you have any questions about your purchase or license, please contact our support team with your Purchase ID: <strong>{purchase_details['purchase_id']}</strong></p>
                    </div>
                </div>
                <div class="footer">
                    <p>Thank you for choosing Oriel FX!</p>
                    <p>This email serves as your receipt and license documentation.</p>
                    <p>© 2024 Oriel FX. All rights reserved.</p>
                </div>
            </div>
        </body>
        </html>
        """
    
    def _create_license_email_text(self, purchase_details: Dict, license_terms: str, 
                                 download_url: str) -> str:
        """Create plain text content for licensing email"""
        return f"""
Your Oriel FX License & Download

DOWNLOAD YOUR VIDEO
Your audio visualization is ready! Download it here:
{download_url}

IMPORTANT: This download link expires on {purchase_details['expires_date']} 
and allows up to {purchase_details['max_downloads']} downloads.

PURCHASE DETAILS
Purchase ID: {purchase_details['purchase_id']}
Product: {purchase_details['tier_name']}
Amount Paid: {purchase_details['amount']}
Purchase Date: {purchase_details['purchase_date']}
Resolution: {purchase_details['resolution']}
Format: {purchase_details['format']}

LICENSE AGREEMENT
Please review your license terms below. This license grants you specific rights to use your purchased video.

{license_terms}

NEED HELP?
If you have any questions about your purchase or license, please contact our support team with your Purchase ID: {purchase_details['purchase_id']}

Thank you for choosing Oriel FX!
This email serves as your receipt and license documentation.

© 2024 Oriel FX. All rights reserved.
        """