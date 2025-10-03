#!/usr/bin/env python3
"""
Test script for the licensing service
"""
import os
import sys
import uuid
from datetime import datetime, timedelta

# Add the backend directory to Python path
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

# Mock the models and database for testing
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
        print(f"Content Length - HTML: {len(html_content)}, Text: {len(text_content)}")
        
        # Extract download link
        import re
        download_match = re.search(r'href="([^"]*)"', html_content)
        if download_match:
            print(f"Download Link Found: {download_match.group(1)}")
        
        return {
            'success': True,
            'email': user_email,
            'status_code': 200,
            'sent_at': datetime.utcnow().isoformat(),
            'mode': 'mock',
            'purchase_id': purchase_id
        }

def test_licensing_service():
    """Test the licensing service functionality"""
    print("🧪 Testing Licensing Service")
    print("=" * 50)
    
    # Import the licensing service
    from app.purchases.licensing import LicensingService
    
    # Create mock email service
    mock_email_service = MockEmailService()
    
    # Initialize licensing service with mock email service
    licensing_service = LicensingService(email_service=mock_email_service)
    
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
    
    print(f"\n2. Testing Email Content Generation")
    print("-" * 30)
    
    # Test email content generation
    mock_purchase.tier = "commercial"
    try:
        license_terms = licensing_service.generate_license_terms(mock_purchase.tier, mock_purchase.id)
        download_url = f"https://example.com/download/{mock_purchase.download_token}"
        
        subject, html_content, text_content = licensing_service.create_license_email_content(
            mock_purchase, license_terms, download_url
        )
        
        print(f"✅ Email content generated")
        print(f"   Subject: {subject}")
        print(f"   HTML length: {len(html_content)} chars")
        print(f"   Text length: {len(text_content)} chars")
        
    except Exception as e:
        print(f"❌ Failed to generate email content: {e}")
    
    print(f"\n3. Testing Full Licensing Email Flow")
    print("-" * 30)
    
    # Test full licensing email flow
    try:
        result = licensing_service.send_licensing_email(mock_purchase)
        
        if result.get('success'):
            print(f"✅ Licensing email sent successfully")
            print(f"   Email: {result.get('email')}")
            print(f"   Mode: {result.get('mode')}")
        else:
            print(f"❌ Failed to send licensing email: {result.get('error')}")
            
    except Exception as e:
        print(f"❌ Exception in licensing email flow: {e}")
    
    print(f"\n4. Testing License Terms Content")
    print("-" * 30)
    
    # Test and display license terms content
    for tier in ['personal', 'commercial', 'premium']:
        try:
            license_terms = licensing_service.generate_license_terms(tier, mock_purchase.id)
            print(f"\n{tier.upper()} LICENSE PREVIEW:")
            print("-" * 20)
            # Show first few lines
            lines = license_terms.split('\n')[:8]
            for line in lines:
                print(line)
            print("...")
            
        except Exception as e:
            print(f"❌ Failed to generate {tier} license: {e}")
    
    print(f"\n✅ Licensing Service Test Complete")

if __name__ == '__main__':
    test_licensing_service()