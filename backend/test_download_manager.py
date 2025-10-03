#!/usr/bin/env python3
"""
Test suite for DownloadManager functionality
"""
import os
import sys
import unittest
from datetime import datetime, timedelta
import json

# Add the backend directory to the Python path
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from app import create_app, db
from app.models import Purchase, FreeDownloadUsage, User
from app.downloads.manager import DownloadManager
from app.downloads.free_tier import FreeTierManager


class TestDownloadManager(unittest.TestCase):
    """Test cases for DownloadManager class"""
    
    def setUp(self):
        """Set up test environment"""
        self.app = create_app('testing')
        self.app_context = self.app.app_context()
        self.app_context.push()
        
        # Create all tables
        db.create_all()
        
        # Initialize download manager
        self.download_manager = DownloadManager(secret_key='test-secret-key')
        
        # Create test user
        self.test_user = User(
            email='test@example.com',
            password_hash='hashed_password'
        )
        db.session.add(self.test_user)
        db.session.commit()
        
        # Create test purchase
        self.test_purchase = Purchase(
            user_id=self.test_user.id,
            file_id='test-file-123',
            tier='personal',
            amount=299,
            stripe_session_id='cs_test_123',
            status='completed',
            completed_at=datetime.utcnow()
        )
        db.session.add(self.test_purchase)
        db.session.commit()
    
    def tearDown(self):
        """Clean up test environment"""
        db.session.remove()
        db.drop_all()
        self.app_context.pop()
    
    def test_create_secure_download_link(self):
        """Test creating secure download links"""
        file_path = 'renders/test-file-123.mp4'
        
        # Create download link
        download_link = self.download_manager.create_secure_download_link(
            purchase_id=self.test_purchase.id,
            file_path=file_path,
            expires_hours=48
        )
        
        # Verify link format
        self.assertIn('/api/downloads/secure', download_link)
        self.assertIn('token=', download_link)
        
        # Verify purchase record updated
        updated_purchase = Purchase.query.get(self.test_purchase.id)
        self.assertIsNotNone(updated_purchase.download_token)
        self.assertIsNotNone(updated_purchase.download_expires_at)
        
        print(f"✅ Created secure download link: {download_link}")
    
    def test_validate_download_access_valid_token(self):
        """Test validating a valid download token"""
        file_path = 'renders/test-file-123.mp4'
        
        # Create download link
        download_link = self.download_manager.create_secure_download_link(
            purchase_id=self.test_purchase.id,
            file_path=file_path
        )
        
        # Extract token from link and URL decode it
        from urllib.parse import unquote
        token = download_link.split('token=')[1]
        token = unquote(token)
        
        # Validate access
        validation_result = self.download_manager.validate_download_access(token)
        
        self.assertTrue(validation_result['valid'])
        self.assertEqual(validation_result['purchase_id'], self.test_purchase.id)
        self.assertEqual(validation_result['file_path'], file_path)
        self.assertEqual(validation_result['attempts_remaining'], 5)
        
        print("✅ Valid token validation passed")
    
    def test_validate_download_access_expired_token(self):
        """Test validating an expired download token"""
        file_path = 'renders/test-file-123.mp4'
        
        # Create download link with very short expiry
        download_link = self.download_manager.create_secure_download_link(
            purchase_id=self.test_purchase.id,
            file_path=file_path,
            expires_hours=-1  # Already expired
        )
        
        # Extract token from link and URL decode it
        from urllib.parse import unquote
        token = download_link.split('token=')[1]
        token = unquote(token)
        
        # Validate access
        validation_result = self.download_manager.validate_download_access(token)
        
        self.assertFalse(validation_result['valid'])
        self.assertEqual(validation_result['error_code'], 'EXPIRED_TOKEN')
        
        print("✅ Expired token validation passed")
    
    def test_track_download_attempt(self):
        """Test tracking download attempts"""
        initial_attempts = self.test_purchase.download_attempts
        
        # Track successful download
        success = self.download_manager.track_download_attempt(
            purchase_id=self.test_purchase.id,
            success=True,
            user_agent='Test Browser',
            ip_address='127.0.0.1'
        )
        
        self.assertTrue(success)
        
        # Verify attempt count increased
        updated_purchase = Purchase.query.get(self.test_purchase.id)
        self.assertEqual(updated_purchase.download_attempts, initial_attempts + 1)
        
        print("✅ Download attempt tracking passed")
    
    def test_max_download_attempts(self):
        """Test maximum download attempts limit"""
        # Set purchase to maximum attempts
        self.test_purchase.download_attempts = 5
        db.session.commit()
        
        file_path = 'renders/test-file-123.mp4'
        download_link = self.download_manager.create_secure_download_link(
            purchase_id=self.test_purchase.id,
            file_path=file_path
        )
        
        # Extract token from link and URL decode it
        from urllib.parse import unquote
        token = download_link.split('token=')[1]
        token = unquote(token)
        
        validation_result = self.download_manager.validate_download_access(token)
        
        self.assertFalse(validation_result['valid'])
        self.assertEqual(validation_result['error_code'], 'MAX_ATTEMPTS_EXCEEDED')
        
        print("✅ Maximum attempts limit validation passed")
    
    def test_handle_link_expiration(self):
        """Test handling expired download links"""
        # Test valid purchase for re-send
        expiration_result = self.download_manager.handle_link_expiration(
            purchase_id=self.test_purchase.id
        )
        
        self.assertTrue(expiration_result['success'])
        self.assertTrue(expiration_result['can_resend'])
        
        print("✅ Link expiration handling passed")
    
    def test_create_resend_link(self):
        """Test creating resend links for expired purchases"""
        resend_result = self.download_manager.create_resend_link(
            purchase_id=self.test_purchase.id
        )
        
        self.assertTrue(resend_result['success'])
        self.assertIn('download_link', resend_result)
        self.assertIn('/api/downloads/secure', resend_result['download_link'])
        
        print("✅ Resend link creation passed")
    
    def test_get_download_analytics(self):
        """Test getting download analytics"""
        # Track some downloads first
        self.download_manager.track_download_attempt(self.test_purchase.id, success=True)
        self.download_manager.track_download_attempt(self.test_purchase.id, success=True)
        
        # Get analytics
        analytics_result = self.download_manager.get_download_analytics(
            user_id=self.test_user.id
        )
        
        self.assertTrue(analytics_result['success'])
        analytics = analytics_result['analytics']
        
        self.assertEqual(analytics['total_purchases'], 1)
        self.assertEqual(analytics['completed_purchases'], 1)
        self.assertEqual(analytics['total_downloads'], 2)
        
        print("✅ Download analytics passed")


class TestFreeTierManager(unittest.TestCase):
    """Test cases for FreeTierManager class"""
    
    def setUp(self):
        """Set up test environment"""
        self.app = create_app('testing')
        self.app_context = self.app.app_context()
        self.app_context.push()
        
        db.create_all()
        
        self.free_tier_manager = FreeTierManager()
        
        # Create test user
        self.test_user = User(
            email='test@example.com',
            password_hash='hashed_password'
        )
        db.session.add(self.test_user)
        db.session.commit()
    
    def tearDown(self):
        """Clean up test environment"""
        db.session.remove()
        db.drop_all()
        self.app_context.pop()
    
    def test_check_download_eligibility_new_user(self):
        """Test checking eligibility for new registered user"""
        eligibility = self.free_tier_manager.check_download_eligibility(
            user_id=self.test_user.id
        )
        
        self.assertTrue(eligibility['eligible'])
        self.assertEqual(eligibility['downloads_used'], 0)
        self.assertEqual(eligibility['max_downloads'], 5)
        self.assertEqual(eligibility['downloads_remaining'], 5)
        self.assertEqual(eligibility['user_type'], 'registered')
        
        print("✅ New user eligibility check passed")
    
    def test_check_download_eligibility_anonymous(self):
        """Test checking eligibility for anonymous user"""
        eligibility = self.free_tier_manager.check_download_eligibility(
            session_id='test-session-123'
        )
        
        self.assertTrue(eligibility['eligible'])
        self.assertEqual(eligibility['downloads_used'], 0)
        self.assertEqual(eligibility['max_downloads'], 3)
        self.assertEqual(eligibility['downloads_remaining'], 3)
        self.assertEqual(eligibility['user_type'], 'anonymous')
        self.assertTrue(eligibility['upgrade_available'])
        
        print("✅ Anonymous user eligibility check passed")
    
    def test_consume_free_download(self):
        """Test consuming free downloads"""
        # Consume first download
        result = self.free_tier_manager.consume_free_download(
            user_id=self.test_user.id
        )
        
        self.assertTrue(result['success'])
        self.assertEqual(result['downloads_used'], 1)
        self.assertEqual(result['downloads_remaining'], 4)
        self.assertFalse(result['is_last_free_download'])
        
        print("✅ Free download consumption passed")
    
    def test_exhaust_free_downloads(self):
        """Test exhausting all free downloads"""
        # Consume all 5 free downloads for registered user
        for i in range(5):
            result = self.free_tier_manager.consume_free_download(
                user_id=self.test_user.id
            )
            self.assertTrue(result['success'])
        
        # Try to consume one more
        result = self.free_tier_manager.consume_free_download(
            user_id=self.test_user.id
        )
        
        self.assertFalse(result['success'])
        self.assertEqual(result['error_code'], 'NO_FREE_DOWNLOADS')
        self.assertEqual(result['downloads_remaining'], 0)
        
        print("✅ Free download exhaustion handling passed")
    
    def test_upgrade_anonymous_to_registered(self):
        """Test upgrading anonymous user to registered"""
        session_id = 'test-session-123'
        
        # Use some downloads as anonymous user
        self.free_tier_manager.consume_free_download(session_id=session_id)
        self.free_tier_manager.consume_free_download(session_id=session_id)
        
        # Upgrade to registered
        upgrade_result = self.free_tier_manager.upgrade_anonymous_to_registered(
            session_id=session_id,
            user_id=self.test_user.id
        )
        
        self.assertTrue(upgrade_result['success'])
        self.assertEqual(upgrade_result['downloads_used'], 2)
        self.assertEqual(upgrade_result['max_downloads'], 5)
        self.assertEqual(upgrade_result['downloads_remaining'], 3)
        self.assertEqual(upgrade_result['upgrade_benefit'], 2)
        
        print("✅ Anonymous to registered upgrade passed")
    
    def test_get_usage_statistics(self):
        """Test getting usage statistics"""
        # Create some usage records
        self.free_tier_manager.consume_free_download(user_id=self.test_user.id)
        self.free_tier_manager.consume_free_download(session_id='anon-session-1')
        self.free_tier_manager.consume_free_download(session_id='anon-session-2')
        
        # Get statistics
        stats_result = self.free_tier_manager.get_usage_statistics()
        
        self.assertTrue(stats_result['success'])
        stats = stats_result['statistics']
        
        self.assertEqual(stats['total_users'], 3)
        self.assertEqual(stats['registered_users'], 1)
        self.assertEqual(stats['anonymous_users'], 2)
        self.assertEqual(stats['total_downloads'], 3)
        
        print("✅ Usage statistics passed")


def run_download_manager_tests():
    """Run all download manager tests"""
    print("🧪 Running Download Manager Tests...")
    print("=" * 50)
    
    # Create test suite
    test_suite = unittest.TestSuite()
    
    # Add DownloadManager tests
    test_suite.addTest(unittest.makeSuite(TestDownloadManager))
    test_suite.addTest(unittest.makeSuite(TestFreeTierManager))
    
    # Run tests
    runner = unittest.TextTestRunner(verbosity=2)
    result = runner.run(test_suite)
    
    # Print summary
    print("\n" + "=" * 50)
    if result.wasSuccessful():
        print("✅ All download manager tests passed!")
        return True
    else:
        print(f"❌ {len(result.failures)} test(s) failed, {len(result.errors)} error(s)")
        
        # Print failures and errors
        for test, traceback in result.failures + result.errors:
            print(f"\n❌ {test}: {traceback}")
        
        return False


if __name__ == '__main__':
    success = run_download_manager_tests()
    sys.exit(0 if success else 1)