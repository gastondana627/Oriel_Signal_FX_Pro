#!/usr/bin/env python3
"""
Integration test for user dashboard endpoints.
"""
import os
import sys
import json
import tempfile
import logging
from datetime import datetime

# Add the parent directory to Python path to import backend modules
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

def test_user_endpoints_integration():
    """Test user endpoints with actual Flask app"""
    print("Testing user endpoints integration...")
    
    try:
        # Mock the security validators to avoid libmagic dependency
        from unittest.mock import patch, Mock
        import sys
        
        # Mock magic module before importing app
        mock_magic = Mock()
        mock_magic.from_buffer.return_value = 'audio/mpeg'
        sys.modules['magic'] = mock_magic
            
        from app import create_app, db
        from app.models import User, Payment, RenderJob
        from werkzeug.security import generate_password_hash
            
        # Create test app
        app = create_app('testing')
        
        with app.app_context():
            # Create tables
            db.create_all()
            
            # Create test user
            test_user = User(
                email='test@example.com',
                password_hash=generate_password_hash('testpassword123'),
                created_at=datetime.utcnow()
            )
            db.session.add(test_user)
            db.session.commit()
            
            # Create test client
            client = app.test_client()
            
            # Test login to get token
            login_response = client.post('/api/auth/login', json={
                'email': 'test@example.com',
                'password': 'testpassword123'
            })
            
            if login_response.status_code != 200:
                print(f"✗ Login failed: {login_response.status_code}")
                return False
            
            login_data = json.loads(login_response.data)
            token = login_data['access_token']
            headers = {'Authorization': f'Bearer {token}'}
            
            # Test profile endpoint
            profile_response = client.get('/api/user/profile', headers=headers)
            if profile_response.status_code == 200:
                print("✓ Profile endpoint working")
                profile_data = json.loads(profile_response.data)
                assert 'user' in profile_data
                assert 'statistics' in profile_data['user']
            else:
                print(f"✗ Profile endpoint failed: {profile_response.status_code}")
                return False
            
            # Test history endpoint
            history_response = client.get('/api/user/history', headers=headers)
            if history_response.status_code == 200:
                print("✓ History endpoint working")
                history_data = json.loads(history_response.data)
                assert 'payments' in history_data
                assert 'render_jobs' in history_data
            else:
                print(f"✗ History endpoint failed: {history_response.status_code}")
                return False
            
            # Test profile update
            update_response = client.put('/api/user/profile', 
                                       headers=headers,
                                       json={'email': 'updated@example.com'})
            if update_response.status_code == 200:
                print("✓ Profile update working")
                update_data = json.loads(update_response.data)
                assert 'updated_fields' in update_data
                assert 'email' in update_data['updated_fields']
            else:
                print(f"✗ Profile update failed: {update_response.status_code}")
                return False
            
            # Test session verification
            verify_response = client.get('/api/user/session/verify', headers=headers)
            if verify_response.status_code == 200:
                print("✓ Session verification working")
                verify_data = json.loads(verify_response.data)
                assert verify_data['valid'] is True
            else:
                print(f"✗ Session verification failed: {verify_response.status_code}")
                return False
            
            # Test logout
            logout_response = client.post('/api/user/logout', headers=headers)
            if logout_response.status_code == 200:
                print("✓ Logout endpoint working")
            else:
                print(f"✗ Logout failed: {logout_response.status_code}")
                return False
            
            # Clean up
            db.drop_all()
            
            return True
            
    except Exception as e:
        print(f"✗ Integration test failed: {e}")
        import traceback
        traceback.print_exc()
        return False


def main():
    """Run integration tests"""
    print("=" * 60)
    print("USER DASHBOARD INTEGRATION TESTS")
    print("=" * 60)
    
    if test_user_endpoints_integration():
        print("\n✓ All integration tests passed!")
        return True
    else:
        print("\n✗ Integration tests failed")
        return False


if __name__ == '__main__':
    main()