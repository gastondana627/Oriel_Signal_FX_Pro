#!/usr/bin/env python3
"""
Standalone test for licensing functionality without full app dependencies
"""
import uuid
from datetime import datetime, timedelta
from typing import Dict, Any, Tuple, Optional

# Mock the pricing tiers
PRICING_TIERS = {
    'personal': {
        'price': 299,  # $2.99 in cents
        'name': 'Personal Use',
        'resolution': '1080p',
        'format': 'MP4',
        'license': 'personal_use',
        'description': 'Perfect for social media and personal projects'
    },
    'commercial': {
        'price': 999,  # $9.99 in cents
        'name': 'Commercial Use',
        'resolution': '1080p',
        'format': 'MP4',
        'license': 'commercial_use',
        'description': 'For business use, marketing, and client projects'
    },
    'premium': {
        'price': 1999,  # $19.99 in cents
        'name': 'Premium Commercial',
        'resolution': '4K',
        'format': 'MP4',
        'license': 'extended_commercial',
        'description': 'Highest quality for professional productions'
    }
}

def get_tier_info(tier: str) -> Optional[Dict]:
    """Get tier information"""
    return PRICING_TIERS.get(tier)

class MockPurchase:
    def __init__(self):
        self.id = str(uuid.uuid4())
        self.user_id = None
        self.user_email = "test@example.com"
        self.tier = "commercial"
        self.amount = 999  # $9.99 in cents
        self.download_token = str(uuid.uuid4())
        self.download_expires_at = datetime.utcnow() + timedelta(hours=48)
        self.created_at = datetime.utcnow()
        self.license_sent = False

class MockEmailService:
    def send_licensing_email(self, user_email, subject, html_content, text_content, purchase_id):
        print(f"\n📧 MOCK EMAIL SERVICE - Licensing Email")
        print(f"To: {user_email}")
        print(f"Subject: {subject}")
        print(f"Purchase ID: {purchase_id}")
        
        # Extract and show download link
        import re
        download_match = re.search(r'href="([^"]*secure_download[^"]*)"', html_content)
        if download_match:
            print(f"🔗 Download Link: {download_match.group(1)}")
        
        # Show a preview of the content
        print(f"\n📄 EMAIL PREVIEW:")
        print("-" * 40)
        # Clean HTML for preview
        clean_content = re.sub(r'<[^>]+>', '', html_content)
        lines = clean_content.split('\n')[:10]
        for line in lines:
            if line.strip():
                print(line.strip()[:80])
        print("...")
        
        return {
            'success': True,
            'email': user_email,
            'status_code': 200,
            'sent_at': datetime.utcnow().isoformat(),
            'mode': 'mock',
            'purchase_id': purchase_id
        }

class SimpleLicensingService:
    """Simplified licensing service for testing"""
    
    def __init__(self, email_service=None):
        self.email_service = email_service or MockEmailService()
    
    def generate_license_terms(self, tier: str, purchase_id: str) -> str:
        """Generate legal license text based on tier"""
        tier_info = get_tier_info(tier)
        if not tier_info:
            raise ValueError(f"Invalid pricing tier: {tier}")
        
        license_type = tier_info['license']
        current_date = datetime.utcnow().strftime("%B %d, %Y")
        
        if license_type == 'personal_use':
            return self._generate_personal_license(purchase_id, current_date, tier_info)
        elif license_type == 'commercial_use':
            return self._generate_commercial_license(purchase_id, current_date, tier_info)
        elif license_type == 'extended_commercial':
            return self._generate_extended_commercial_license(purchase_id, current_date, tier_info)
        else:
            raise ValueError(f"Unknown license type: {license_type}")
    
    def create_license_email_content(self, purchase: MockPurchase, license_terms: str, 
                                   download_url: str) -> Tuple[str, str, str]:
        """Generate HTML and text email content for licensing"""
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
            'max_downloads': 5
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
    
    def send_licensing_email(self, purchase: MockPurchase) -> Dict[str, Any]:
        """Send licensing email with terms and download link"""
        try:
            # Generate license terms
            license_terms = self.generate_license_terms(purchase.tier, purchase.id)
            
            # Create download URL
            download_url = f"https://example.com/api/downloads/secure/{purchase.download_token}"
            
            # Generate email content
            subject, html_content, text_content = self.create_license_email_content(
                purchase, license_terms, download_url
            )
            
            # Send email using the configured email service
            result = self.email_service.send_licensing_email(
                purchase.user_email, subject, html_content, text_content, purchase.id
            )
            
            return result
            
        except Exception as e:
            return {
                'success': False,
                'error': str(e),
                'purchase_id': purchase.id
            }
    
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
            <title>Your Oriel FX License & Download</title>
        </head>
        <body>
            <div style="max-width: 600px; margin: 0 auto; font-family: Arial, sans-serif;">
                <div style="background: linear-gradient(135deg, #8309D5, #FF6B6B); color: white; padding: 30px; text-align: center;">
                    <h1>📄 Your License & Download</h1>
                    <p>Your Oriel FX purchase is complete with licensing information</p>
                </div>
                <div style="padding: 30px; background: #f9f9f9;">
                    <div style="background: #e8f5e8; padding: 20px; border-radius: 8px; margin: 20px 0;">
                        <h2>🎬 Download Your Video</h2>
                        <p>Your audio visualization is ready!</p>
                        <a href="{download_url}" style="display: inline-block; background: #28a745; color: white; padding: 15px 30px; text-decoration: none; border-radius: 5px;">Download Video Now</a>
                        <p><strong>Important:</strong> This download link expires on {purchase_details['expires_date']}</p>
                    </div>
                    
                    <div style="background: #fff; padding: 20px; border-radius: 8px; margin: 20px 0;">
                        <h3>📋 Purchase Details</h3>
                        <p><strong>Purchase ID:</strong> {purchase_details['purchase_id']}</p>
                        <p><strong>Product:</strong> {purchase_details['tier_name']}</p>
                        <p><strong>Amount Paid:</strong> {purchase_details['amount']}</p>
                        <p><strong>Purchase Date:</strong> {purchase_details['purchase_date']}</p>
                    </div>
                    
                    <div style="background: #fff; padding: 20px; border-radius: 8px; margin: 20px 0;">
                        <h3>📜 License Agreement</h3>
                        <pre style="font-family: 'Courier New', monospace; font-size: 12px; background: #f8f9fa; padding: 15px; white-space: pre-line;">{license_terms}</pre>
                    </div>
                </div>
                <div style="text-align: center; margin-top: 30px; color: #666;">
                    <p>Thank you for choosing Oriel FX!</p>
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

PURCHASE DETAILS
Purchase ID: {purchase_details['purchase_id']}
Product: {purchase_details['tier_name']}
Amount Paid: {purchase_details['amount']}
Purchase Date: {purchase_details['purchase_date']}

LICENSE AGREEMENT
{license_terms}

Thank you for choosing Oriel FX!
© 2024 Oriel FX. All rights reserved.
        """

def test_licensing_service():
    """Test the licensing service functionality"""
    print("🧪 Testing Licensing Service")
    print("=" * 50)
    
    # Initialize licensing service
    licensing_service = SimpleLicensingService()
    
    # Create mock purchase
    mock_purchase = MockPurchase()
    
    print(f"\n1. Testing License Terms Generation")
    print("-" * 30)
    
    # Test license terms generation for different tiers
    tiers = ['personal', 'commercial', 'premium']
    
    for tier in tiers:
        mock_purchase.tier = tier
        try:
            license_terms = licensing_service.generate_license_terms(tier, mock_purchase.id)
            print(f"✅ {tier.title()} license terms generated ({len(license_terms)} chars)")
        except Exception as e:
            print(f"❌ Failed to generate {tier} license terms: {e}")
    
    print(f"\n2. Testing Full Licensing Email Flow")
    print("-" * 30)
    
    # Test full licensing email flow
    mock_purchase.tier = "commercial"
    try:
        result = licensing_service.send_licensing_email(mock_purchase)
        
        if result.get('success'):
            print(f"✅ Licensing email sent successfully")
        else:
            print(f"❌ Failed to send licensing email: {result.get('error')}")
            
    except Exception as e:
        print(f"❌ Exception in licensing email flow: {e}")
    
    print(f"\n3. Testing Different License Types")
    print("-" * 30)
    
    # Test different license types
    for tier in ['personal', 'commercial', 'premium']:
        mock_purchase.tier = tier
        try:
            license_terms = licensing_service.generate_license_terms(tier, mock_purchase.id)
            print(f"\n{tier.upper()} LICENSE PREVIEW:")
            print("-" * 20)
            # Show first few lines
            lines = license_terms.split('\n')[:6]
            for line in lines:
                if line.strip():
                    print(line)
            print("...")
            
        except Exception as e:
            print(f"❌ Failed to generate {tier} license: {e}")
    
    print(f"\n✅ Licensing Service Test Complete")

if __name__ == '__main__':
    test_licensing_service()