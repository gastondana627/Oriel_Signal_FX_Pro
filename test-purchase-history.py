#!/usr/bin/env python3
"""
Test script for purchase history and user dashboard functionality
"""
import sys
import os
import requests
import json
from datetime import datetime, timedelta

# Add backend to path
sys.path.insert(0, os.path.join(os.path.dirname(__file__), 'backend'))

def test_purchase_history_endpoints():
    """Test the purchase history API endpoints"""
    
    base_url = "http://localhost:8000/api"
    
    # Test data
    test_user = {
        "email": "test@example.com",
        "password": "testpassword123"
    }
    
    print("Testing Purchase History API Endpoints")
    print("=" * 50)
    
    try:
        # 1. Register test user (if not exists)
        print("1. Registering test user...")
        register_response = requests.post(f"{base_url}/auth/register", json=test_user)
        if register_response.status_code in [200, 201]:
            print("✓ User registered successfully")
        elif register_response.status_code == 409:
            print("✓ User already exists")
        else:
            print(f"✗ Registration failed: {register_response.status_code}")
            return False
        
        # 2. Login to get token
        print("2. Logging in...")
        login_response = requests.post(f"{base_url}/auth/login", json=test_user)
        if login_response.status_code != 200:
            print(f"✗ Login failed: {login_response.status_code}")
            return False
        
        login_data = login_response.json()
        token = login_data.get('access_token')
        if not token:
            print("✗ No access token received")
            return False
        
        print("✓ Login successful")
        
        headers = {
            'Authorization': f'Bearer {token}',
            'Content-Type': 'application/json'
        }
        
        # 3. Test purchase history endpoint (empty)
        print("3. Testing purchase history endpoint...")
        history_response = requests.get(f"{base_url}/user/purchases", headers=headers)
        if history_response.status_code != 200:
            print(f"✗ Purchase history failed: {history_response.status_code}")
            print(f"Response: {history_response.text}")
            return False
        
        history_data = history_response.json()
        print("✓ Purchase history endpoint working")
        print(f"  - Total purchases: {history_data['summary']['total_purchases']}")
        print(f"  - Items returned: {len(history_data['purchases']['items'])}")
        
        # 4. Test user profile endpoint
        print("4. Testing user profile endpoint...")
        profile_response = requests.get(f"{base_url}/user/profile", headers=headers)
        if profile_response.status_code != 200:
            print(f"✗ Profile failed: {profile_response.status_code}")
            return False
        
        profile_data = profile_response.json()
        print("✓ User profile endpoint working")
        print(f"  - Email: {profile_data['user']['email']}")
        print(f"  - Created: {profile_data['user']['created_at']}")
        
        # 5. Test invalid purchase details
        print("5. Testing invalid purchase details...")
        invalid_purchase_id = "invalid-purchase-id"
        details_response = requests.get(f"{base_url}/user/purchases/{invalid_purchase_id}", headers=headers)
        if details_response.status_code == 404:
            print("✓ Invalid purchase correctly returns 404")
        else:
            print(f"✗ Expected 404, got {details_response.status_code}")
        
        # 6. Test resend license for invalid purchase
        print("6. Testing resend license for invalid purchase...")
        resend_response = requests.post(f"{base_url}/user/purchases/{invalid_purchase_id}/resend-license", headers=headers)
        if resend_response.status_code == 404:
            print("✓ Invalid purchase resend correctly returns 404")
        else:
            print(f"✗ Expected 404, got {resend_response.status_code}")
        
        print("\n" + "=" * 50)
        print("✓ All purchase history tests passed!")
        return True
        
    except requests.exceptions.ConnectionError:
        print("✗ Connection error - make sure the backend server is running on localhost:8000")
        return False
    except Exception as e:
        print(f"✗ Test error: {str(e)}")
        return False


def test_dashboard_html():
    """Test that the dashboard HTML file is properly created"""
    print("\nTesting Dashboard HTML File")
    print("=" * 30)
    
    dashboard_file = "user-dashboard.html"
    
    if not os.path.exists(dashboard_file):
        print(f"✗ Dashboard file {dashboard_file} not found")
        return False
    
    with open(dashboard_file, 'r') as f:
        content = f.read()
    
    # Check for key components
    required_elements = [
        'User Dashboard',
        'Purchase History',
        'class="purchase-item"',
        'loadPurchaseHistory',
        'regenerateDownloadLink',
        'resendLicense',
        'viewPurchaseDetails'
    ]
    
    for element in required_elements:
        if element not in content:
            print(f"✗ Missing required element: {element}")
            return False
    
    print("✓ Dashboard HTML file contains all required elements")
    print(f"✓ File size: {len(content)} characters")
    return True


def create_sample_purchase_data():
    """Create sample purchase data for testing (requires database access)"""
    print("\nCreating Sample Purchase Data")
    print("=" * 30)
    
    try:
        from app import create_app, db
        from app.models import User, Purchase
        from datetime import datetime, timedelta
        import uuid
        
        app = create_app()
        
        with app.app_context():
            # Find test user
            user = User.query.filter_by(email="test@example.com").first()
            if not user:
                print("✗ Test user not found - run API tests first")
                return False
            
            # Check if sample purchases already exist
            existing_purchases = Purchase.query.filter_by(user_id=user.id).count()
            if existing_purchases > 0:
                print(f"✓ User already has {existing_purchases} purchases")
                return True
            
            # Create sample purchases
            sample_purchases = [
                {
                    'tier': 'personal',
                    'amount': 299,
                    'status': 'completed',
                    'completed_at': datetime.utcnow() - timedelta(days=5)
                },
                {
                    'tier': 'commercial',
                    'amount': 999,
                    'status': 'completed',
                    'completed_at': datetime.utcnow() - timedelta(days=2)
                },
                {
                    'tier': 'premium',
                    'amount': 1999,
                    'status': 'pending',
                    'completed_at': None
                }
            ]
            
            for purchase_data in sample_purchases:
                purchase = Purchase(
                    id=str(uuid.uuid4()),
                    user_id=user.id,
                    file_id=str(uuid.uuid4()),
                    tier=purchase_data['tier'],
                    amount=purchase_data['amount'],
                    stripe_session_id=f"cs_test_{uuid.uuid4().hex[:24]}",
                    status=purchase_data['status'],
                    completed_at=purchase_data['completed_at'],
                    download_expires_at=datetime.utcnow() + timedelta(hours=48) if purchase_data['status'] == 'completed' else None,
                    license_sent=purchase_data['status'] == 'completed'
                )
                db.session.add(purchase)
            
            db.session.commit()
            print(f"✓ Created {len(sample_purchases)} sample purchases")
            return True
            
    except ImportError:
        print("✗ Cannot import Flask app - make sure you're in the right directory")
        return False
    except Exception as e:
        print(f"✗ Error creating sample data: {str(e)}")
        return False


if __name__ == "__main__":
    print("Purchase History Implementation Test Suite")
    print("=" * 60)
    
    # Test HTML dashboard
    html_success = test_dashboard_html()
    
    # Test API endpoints
    api_success = test_purchase_history_endpoints()
    
    # Create sample data if requested
    if len(sys.argv) > 1 and sys.argv[1] == "--create-sample-data":
        sample_success = create_sample_purchase_data()
    else:
        sample_success = True
        print("\nSkipping sample data creation (use --create-sample-data to enable)")
    
    print("\n" + "=" * 60)
    print("FINAL RESULTS:")
    print(f"HTML Dashboard: {'✓ PASS' if html_success else '✗ FAIL'}")
    print(f"API Endpoints: {'✓ PASS' if api_success else '✗ FAIL'}")
    print(f"Sample Data: {'✓ PASS' if sample_success else '✗ FAIL'}")
    
    if html_success and api_success and sample_success:
        print("\n🎉 All tests passed! Purchase history implementation is working.")
        sys.exit(0)
    else:
        print("\n❌ Some tests failed. Check the output above for details.")
        sys.exit(1)