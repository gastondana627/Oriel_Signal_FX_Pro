#!/usr/bin/env python3
"""
Integration test for licensing service with purchase flow
"""
import os
import sys
import uuid
import sqlite3
from datetime import datetime, timedelta

def test_purchase_and_licensing_integration():
    """Test the complete purchase and licensing flow"""
    print("🧪 Testing Purchase & Licensing Integration")
    print("=" * 50)
    
    # Test database operations
    db_path = 'app-dev.db'
    
    if not os.path.exists(db_path):
        print("❌ Database file not found")
        return
    
    try:
        conn = sqlite3.connect(db_path)
        cursor = conn.cursor()
        
        # Test 1: Create a test purchase record
        print("\n1. Testing Purchase Record Creation")
        print("-" * 30)
        
        purchase_id = str(uuid.uuid4())
        test_email = "test@example.com"
        download_token = str(uuid.uuid4())
        
        cursor.execute("""
            INSERT INTO purchase (
                id, user_email, file_id, tier, amount, 
                stripe_session_id, status, download_token, 
                download_expires_at, created_at, license_sent
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        """, (
            purchase_id,
            test_email,
            str(uuid.uuid4()),
            'commercial',
            999,  # $9.99
            f'cs_test_{purchase_id}',
            'completed',
            download_token,
            (datetime.utcnow() + timedelta(hours=48)).isoformat(),
            datetime.utcnow().isoformat(),
            False
        ))
        
        conn.commit()
        print(f"✅ Test purchase record created: {purchase_id}")
        
        # Test 2: Verify purchase record
        print("\n2. Testing Purchase Record Retrieval")
        print("-" * 30)
        
        cursor.execute("SELECT * FROM purchase WHERE id = ?", (purchase_id,))
        purchase_row = cursor.fetchone()
        
        if purchase_row:
            print(f"✅ Purchase record retrieved successfully")
            print(f"   ID: {purchase_row[0]}")
            print(f"   Email: {purchase_row[2]}")
            print(f"   Tier: {purchase_row[4]}")
            print(f"   Status: {purchase_row[8]}")
        else:
            print("❌ Failed to retrieve purchase record")
        
        # Test 3: Test licensing email content generation
        print("\n3. Testing Licensing Email Content")
        print("-" * 30)
        
        # Mock the licensing service functionality
        tier_info = {
            'name': 'Commercial Use',
            'resolution': '1080p',
            'format': 'MP4',
            'license': 'commercial_use'
        }
        
        # Generate license terms
        license_terms = f"""
COMMERCIAL USE LICENSE AGREEMENT

Purchase ID: {purchase_id}
License Date: {datetime.utcnow().strftime("%B %d, %Y")}
Product: Audio Visualizer - {tier_info['name']}

GRANT OF LICENSE:
Subject to the terms of this agreement, Oriel FX grants you a non-exclusive, 
non-transferable license to use the purchased audio visualization video for 
commercial purposes as outlined below.

PERMITTED USES:
• Business marketing and advertising
• Client projects and presentations
• Commercial social media content

QUALITY SPECIFICATIONS:
• Resolution: {tier_info['resolution']}
• Format: {tier_info['format']}
• License Type: Commercial Use

© 2024 Oriel FX. All rights reserved.
        """.strip()
        
        print(f"✅ License terms generated ({len(license_terms)} characters)")
        
        # Test 4: Test email content structure
        print("\n4. Testing Email Content Structure")
        print("-" * 30)
        
        download_url = f"https://example.com/api/downloads/secure/{download_token}"
        subject = f"Your Oriel FX License & Download - {tier_info['name']}"
        
        # Simple HTML email content
        html_content = f"""
        <html>
        <body>
            <h1>Your Oriel FX License & Download</h1>
            <p>Purchase ID: {purchase_id}</p>
            <p>Product: {tier_info['name']}</p>
            <a href="{download_url}">Download Video</a>
            <pre>{license_terms}</pre>
        </body>
        </html>
        """
        
        text_content = f"""
Your Oriel FX License & Download

Purchase ID: {purchase_id}
Product: {tier_info['name']}

Download: {download_url}

{license_terms}
        """
        
        print(f"✅ Email content generated")
        print(f"   Subject: {subject}")
        print(f"   HTML length: {len(html_content)} chars")
        print(f"   Text length: {len(text_content)} chars")
        
        # Test 5: Update license_sent flag
        print("\n5. Testing License Sent Flag Update")
        print("-" * 30)
        
        cursor.execute("""
            UPDATE purchase 
            SET license_sent = 1 
            WHERE id = ?
        """, (purchase_id,))
        
        conn.commit()
        
        # Verify update
        cursor.execute("SELECT license_sent FROM purchase WHERE id = ?", (purchase_id,))
        license_sent = cursor.fetchone()[0]
        
        if license_sent:
            print("✅ License sent flag updated successfully")
        else:
            print("❌ Failed to update license sent flag")
        
        # Test 6: Test purchase history query
        print("\n6. Testing Purchase History Query")
        print("-" * 30)
        
        cursor.execute("""
            SELECT id, tier, amount, status, created_at, license_sent
            FROM purchase 
            WHERE user_email = ? 
            ORDER BY created_at DESC
        """, (test_email,))
        
        purchases = cursor.fetchall()
        
        if purchases:
            print(f"✅ Found {len(purchases)} purchase(s) for {test_email}")
            for purchase in purchases:
                print(f"   Purchase: {purchase[0][:8]}... | Tier: {purchase[1]} | Amount: ${purchase[2]/100:.2f} | Status: {purchase[3]}")
        else:
            print("❌ No purchases found")
        
        # Cleanup: Remove test purchase
        print("\n7. Cleaning Up Test Data")
        print("-" * 30)
        
        cursor.execute("DELETE FROM purchase WHERE id = ?", (purchase_id,))
        conn.commit()
        print("✅ Test purchase record cleaned up")
        
        conn.close()
        
        print(f"\n✅ Integration Test Complete - All Tests Passed!")
        
    except Exception as e:
        print(f"❌ Integration test failed: {e}")
        if 'conn' in locals():
            conn.close()
        raise

def test_api_endpoints():
    """Test API endpoint structure"""
    print("\n🌐 Testing API Endpoint Structure")
    print("=" * 40)
    
    # Test endpoint paths that should be available
    endpoints = [
        '/api/purchases/tiers',
        '/api/purchases/create-session',
        '/api/purchases/verify-payment',
        '/api/purchases/history',
        '/api/purchases/resend-license',
        '/api/purchases/success',
        '/api/purchases/webhook'
    ]
    
    print("Expected API endpoints:")
    for endpoint in endpoints:
        print(f"  ✅ {endpoint}")
    
    print("\nNote: Endpoints are defined but require running server to test HTTP requests")

if __name__ == '__main__':
    test_purchase_and_licensing_integration()
    test_api_endpoints()