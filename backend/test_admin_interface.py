#!/usr/bin/env python3
"""
Test script for Flask-Admin interface functionality.
"""
import os
import sys
import json
import tempfile
import logging
from datetime import datetime
from unittest.mock import patch, Mock

# Add the parent directory to Python path to import backend modules
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


def test_admin_authentication():
    """Test admin authentication functionality"""
    print("Testing admin authentication...")
    
    try:
        # Mock magic module before importing app
        mock_magic = Mock()
        mock_magic.from_buffer.return_value = 'audio/mpeg'
        sys.modules['magic'] = mock_magic
        
        from app import create_app, db
        from app.models import User
        from werkzeug.security import generate_password_hash
        
        # Create test app
        app = create_app('testing')
        
        with app.app_context():
            # Set admin credentials
            app.config['ADMIN_EMAIL'] = 'admin@example.com'
            app.config['ADMIN_PASSWORD'] = 'admin123'
            
            # Create tables
            db.create_all()
            
            # Create admin user
            admin_user = User(
                email='admin@example.com',
                password_hash=generate_password_hash('admin123'),
                created_at=datetime.utcnow()
            )
            db.session.add(admin_user)
            db.session.commit()
            
            # Create test client
            client = app.test_client()
            
            # Test admin login page
            response = client.get('/admin/login')
            if response.status_code == 200:
                print("✓ Admin login page accessible")
            else:
                print(f"✗ Admin login page failed: {response.status_code}")
                return False
            
            # Test admin dashboard (should redirect to login)
            response = client.get('/admin/')
            if response.status_code in [302, 401]:
                print("✓ Admin dashboard properly protected")
            else:
                print(f"✗ Admin dashboard not protected: {response.status_code}")
                return False
            
            # Clean up
            db.drop_all()
            
            return True
            
    except Exception as e:
        print(f"✗ Admin authentication test failed: {e}")
        import traceback
        traceback.print_exc()
        return False


def test_admin_views():
    """Test admin model views"""
    print("Testing admin model views...")
    
    try:
        from app.admin.views import UserAdminView, PaymentAdminView, RenderJobAdminView
        from app.models import User, Payment, RenderJob
        
        # Test view initialization
        user_view = UserAdminView(User, None)
        payment_view = PaymentAdminView(Payment, None)
        job_view = RenderJobAdminView(RenderJob, None)
        
        print("✓ Admin views initialized successfully")
        
        # Test view configurations
        assert 'email' in user_view.column_searchable_list
        assert 'stripe_session_id' in payment_view.column_searchable_list
        assert 'audio_filename' in job_view.column_searchable_list
        
        print("✓ Admin view configurations validated")
        
        return True
        
    except Exception as e:
        print(f"✗ Admin views test failed: {e}")
        return False


def test_admin_metrics():
    """Test admin metrics functionality"""
    print("Testing admin metrics...")
    
    try:
        # Mock magic module
        mock_magic = Mock()
        mock_magic.from_buffer.return_value = 'audio/mpeg'
        sys.modules['magic'] = mock_magic
        
        from app import create_app, db
        from app.models import User, Payment, RenderJob
        from werkzeug.security import generate_password_hash
        
        # Create test app
        app = create_app('testing')
        
        with app.app_context():
            app.config['ADMIN_EMAIL'] = 'admin@example.com'
            
            # Create tables
            db.create_all()
            
            # Create admin user
            admin_user = User(
                email='admin@example.com',
                password_hash=generate_password_hash('admin123'),
                created_at=datetime.utcnow()
            )
            db.session.add(admin_user)
            
            # Create test data
            test_user = User(
                email='test@example.com',
                password_hash=generate_password_hash('test123'),
                created_at=datetime.utcnow()
            )
            db.session.add(test_user)
            db.session.commit()
            
            payment = Payment(
                user_id=test_user.id,
                stripe_session_id='cs_test_123',
                amount=999,
                status='completed'
            )
            db.session.add(payment)
            db.session.commit()
            
            job = RenderJob(
                user_id=test_user.id,
                payment_id=payment.id,
                status='completed',
                audio_filename='test.mp3'
            )
            db.session.add(job)
            db.session.commit()
            
            # Test metrics calculation
            from app.admin.views import SecureAdminIndexView
            admin_view = SecureAdminIndexView()
            
            metrics = admin_view.get_system_metrics()
            
            assert metrics['total_users'] == 2  # admin + test user
            assert metrics['total_payments'] == 1
            assert metrics['total_jobs'] == 1
            assert metrics['completed_jobs'] == 1
            
            print("✓ Admin metrics calculation working")
            
            # Clean up
            db.drop_all()
            
            return True
            
    except Exception as e:
        print(f"✗ Admin metrics test failed: {e}")
        import traceback
        traceback.print_exc()
        return False


def test_admin_api_endpoints():
    """Test admin API endpoints"""
    print("Testing admin API endpoints...")
    
    try:
        # Mock magic module
        mock_magic = Mock()
        mock_magic.from_buffer.return_value = 'audio/mpeg'
        sys.modules['magic'] = mock_magic
        
        from app import create_app, db
        from app.models import User
        from werkzeug.security import generate_password_hash
        
        # Create test app
        app = create_app('testing')
        
        with app.app_context():
            app.config['ADMIN_EMAIL'] = 'admin@example.com'
            
            # Create tables
            db.create_all()
            
            # Create admin user
            admin_user = User(
                email='admin@example.com',
                password_hash=generate_password_hash('admin123'),
                created_at=datetime.utcnow()
            )
            db.session.add(admin_user)
            db.session.commit()
            
            # Create test client
            client = app.test_client()
            
            # Login to get token
            login_response = client.post('/api/auth/login', json={
                'email': 'admin@example.com',
                'password': 'admin123'
            })
            
            if login_response.status_code == 200:
                login_data = json.loads(login_response.data)
                token = login_data['access_token']
                headers = {'Authorization': f'Bearer {token}'}
                
                # Test metrics endpoint
                metrics_response = client.get('/admin/api/metrics', headers=headers)
                if metrics_response.status_code == 200:
                    print("✓ Admin metrics API working")
                    metrics_data = json.loads(metrics_response.data)
                    assert 'users' in metrics_data
                    assert 'payments' in metrics_data
                    assert 'jobs' in metrics_data
                else:
                    print(f"✗ Admin metrics API failed: {metrics_response.status_code}")
                    return False
                
                # Test system status endpoint
                status_response = client.get('/admin/api/system-status', headers=headers)
                if status_response.status_code == 200:
                    print("✓ Admin system status API working")
                    status_data = json.loads(status_response.data)
                    assert 'database' in status_data
                    assert 'redis' in status_data
                else:
                    print(f"✗ Admin system status API failed: {status_response.status_code}")
                    return False
                
            else:
                print(f"✗ Admin login failed: {login_response.status_code}")
                return False
            
            # Clean up
            db.drop_all()
            
            return True
            
    except Exception as e:
        print(f"✗ Admin API endpoints test failed: {e}")
        import traceback
        traceback.print_exc()
        return False


def main():
    """Run all admin interface tests"""
    print("=" * 60)
    print("TESTING FLASK-ADMIN INTERFACE")
    print("=" * 60)
    
    tests = [
        test_admin_authentication,
        test_admin_views,
        test_admin_metrics,
        test_admin_api_endpoints
    ]
    
    passed = 0
    total = len(tests)
    
    for test in tests:
        if test():
            passed += 1
        print()
    
    print("=" * 60)
    print(f"RESULTS: {passed}/{total} tests passed")
    
    if passed == total:
        print("✓ All Flask-Admin tests passed!")
        return True
    else:
        print("✗ Some tests failed")
        return False


if __name__ == '__main__':
    main()