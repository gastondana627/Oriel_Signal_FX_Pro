#!/usr/bin/env python3
"""
Integration test for download API endpoints
"""
import os
import sys
import json
from datetime import datetime

# Add the backend directory to the Python path
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from app import create_app, db
from app.models import Purchase, FreeDownloadUsage, User


def test_download_api_endpoints():
    """Test the download API endpoints"""
    print("🧪 Testing Download API Endpoints...")
    print("=" * 50)
    
    app = create_app('testing')
    
    with app.test_client() as client:
        with app.app_context():
            # Create all tables
            db.create_all()
            
            try:
                # Test 1: Check download limits for new anonymous user
                print("📋 Test 1: Check download limits for anonymous user")
                response = client.get('/api/downloads/check-limits?session_id=test-session-123')
                assert response.status_code == 200
                data = response.get_json()
                assert data['success'] == True
                assert data['downloads_used'] == 0
                assert data['max_downloads'] == 3
                assert data['downloads_remaining'] == 3
                print("✅ Anonymous user limits check passed")
                
                # Test 2: Create a test user and check registered user limits
                print("\n📋 Test 2: Check download limits for registered user")
                test_user = User(email='test@example.com', password_hash='hashed')
                db.session.add(test_user)
                db.session.commit()
                
                response = client.get(f'/api/downloads/check-limits?user_id={test_user.id}')
                assert response.status_code == 200
                data = response.get_json()
                assert data['success'] == True
                assert data['downloads_used'] == 0
                assert data['max_downloads'] == 5
                assert data['downloads_remaining'] == 5
                print("✅ Registered user limits check passed")
                
                # Test 3: Test token validation endpoint
                print("\n📋 Test 3: Test token validation")
                # Create a test purchase
                test_purchase = Purchase(
                    user_id=test_user.id,
                    file_id='test-file-123',
                    tier='personal',
                    amount=299,
                    stripe_session_id='cs_test_123',
                    status='completed',
                    completed_at=datetime.utcnow()
                )
                db.session.add(test_purchase)
                db.session.commit()
                
                # Create a download manager and generate token
                from app.downloads.manager import create_download_manager
                download_manager = create_download_manager()
                download_link = download_manager.create_secure_download_link(
                    purchase_id=test_purchase.id,
                    file_path='renders/test-file-123.mp4'
                )
                
                # Extract token
                from urllib.parse import unquote
                token = download_link.split('token=')[1]
                token = unquote(token)
                
                # Test token validation
                response = client.post('/api/downloads/validate-token', 
                                     json={'token': token},
                                     content_type='application/json')
                assert response.status_code == 200
                data = response.get_json()
                assert data['valid'] == True
                assert data['purchase_id'] == test_purchase.id
                print("✅ Token validation passed")
                
                # Test 4: Test resend link functionality
                print("\n📋 Test 4: Test resend link functionality")
                response = client.post('/api/downloads/resend-link',
                                     json={'purchase_id': test_purchase.id},
                                     content_type='application/json')
                assert response.status_code == 200
                data = response.get_json()
                assert data['success'] == True
                assert 'download_link' in data
                print("✅ Resend link functionality passed")
                
                # Test 5: Test analytics endpoint
                print("\n📋 Test 5: Test analytics endpoint")
                response = client.get(f'/api/downloads/analytics?user_id={test_user.id}')
                assert response.status_code == 200
                data = response.get_json()
                assert 'total_purchases' in data
                assert 'completed_purchases' in data
                print("✅ Analytics endpoint passed")
                
                # Test 6: Test error cases
                print("\n📋 Test 6: Test error cases")
                
                # Invalid token validation
                response = client.post('/api/downloads/validate-token',
                                     json={'token': 'invalid-token'},
                                     content_type='application/json')
                assert response.status_code == 200
                data = response.get_json()
                assert data['valid'] == False
                
                # Missing purchase ID for resend
                response = client.post('/api/downloads/resend-link',
                                     json={},
                                     content_type='application/json')
                assert response.status_code == 400
                
                # Non-existent purchase for resend
                response = client.post('/api/downloads/resend-link',
                                     json={'purchase_id': 'non-existent'},
                                     content_type='application/json')
                assert response.status_code == 404
                
                print("✅ Error cases handled correctly")
                
                print("\n" + "=" * 50)
                print("✅ All download API tests passed!")
                return True
                
            except Exception as e:
                print(f"\n❌ Test failed: {str(e)}")
                import traceback
                traceback.print_exc()
                return False
            
            finally:
                # Clean up
                db.session.remove()
                db.drop_all()


if __name__ == '__main__':
    success = test_download_api_endpoints()
    sys.exit(0 if success else 1)