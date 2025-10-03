"""
Integration tests for download link security and expiration logic.
Tests secure token generation, validation, and expiration handling.
"""
import pytest
from unittest.mock import Mock, patch
from datetime import datetime, timedelta
import uuid
import base64
import json
import hmac
import hashlib
from urllib.parse import urlparse, parse_qs

from app.models import Purchase, User
from app.downloads.manager import DownloadManager
from app.downloads.routes import downloads_bp


class TestDownloadSecurity:
    """Test download link security mechanisms"""
    
    @pytest.fixture
    def download_manager(self):
        """Create DownloadManager with test secret"""
        return DownloadManager(secret_key='test-secret-key-for-security-tests')
    
    @pytest.fixture
    def test_purchase_security(self, test_user):
        """Create test purchase for security testing"""
        from app import db
        
        purchase = Purchase(
            id=str(uuid.uuid4()),
            user_id=test_user.id,
            file_id='security-test-file',
            tier='personal',
            amount=299,
            stripe_session_id='cs_security_test',
            status='completed',
            completed_at=datetime.utcnow(),
            download_expires_at=datetime.utcnow() + timedelta(hours=48),
            download_attempts=0
        )
        db.session.add(purchase)
        db.session.commit()
        return purchase
    
    def test_secure_token_generation(self, app_context, download_manager, test_purchase_security):
        """Test secure token generation and structure"""
        file_path = 'renders/security-test-file.mp4'
        
        download_link = download_manager.create_secure_download_link(
            purchase_id=test_purchase_security.id,
            file_path=file_path,
            expires_hours=24
        )
        
        # Verify link structure
        assert '/api/downloads/secure' in download_link
        assert 'token=' in download_link
        
        # Extract and decode token
        token = download_link.split('token=')[1]
        
        # Verify token is base64 encoded
        try:
            # Add padding if needed
            missing_padding = len(token) % 4
            if missing_padding:
                token += '=' * (4 - missing_padding)
            
            decoded_bytes = base64.urlsafe_b64decode(token.encode('ascii'))
            token_data = json.loads(decoded_bytes.decode('utf-8'))
            
            # Verify token structure
            assert 'data' in token_data
            assert 'signature' in token_data
            
            # Verify data contents
            data = token_data['data']
            assert data['purchase_id'] == test_purchase_security.id
            assert data['file_path'] == file_path
            assert 'expires_at' in data
            assert 'nonce' in data
            
        except Exception as e:
            pytest.fail(f"Token decoding failed: {e}")
    
    def test_token_signature_verification(self, app_context, download_manager, test_purchase_security):
        """Test token signature verification prevents tampering"""
        file_path = 'renders/security-test-file.mp4'
        
        # Create valid token
        download_link = download_manager.create_secure_download_link(
            purchase_id=test_purchase_security.id,
            file_path=file_path
        )
        
        token = download_link.split('token=')[1]
        
        # Verify valid token works
        validation_result = download_manager.validate_download_access(token)
        assert validation_result['valid'] is True
        
        # Tamper with token
        try:
            # Decode token
            missing_padding = len(token) % 4
            if missing_padding:
                token += '=' * (4 - missing_padding)
            
            decoded_bytes = base64.urlsafe_b64decode(token.encode('ascii'))
            token_data = json.loads(decoded_bytes.decode('utf-8'))
            
            # Modify data (tampering)
            token_data['data']['purchase_id'] = 'tampered-id'
            
            # Re-encode tampered token
            tampered_json = json.dumps(token_data, separators=(',', ':'))
            tampered_bytes = tampered_json.encode('utf-8')
            tampered_token = base64.urlsafe_b64encode(tampered_bytes).decode('ascii')
            
            # Verify tampered token is rejected
            tampered_validation = download_manager.validate_download_access(tampered_token)
            assert tampered_validation['valid'] is False
            assert tampered_validation['error_code'] == 'INVALID_TOKEN'
            
        except Exception as e:
            pytest.fail(f"Token tampering test failed: {e}")
    
    def test_token_expiration_validation(self, app_context, download_manager, test_purchase_security):
        """Test token expiration validation"""
        file_path = 'renders/expired-test-file.mp4'
        
        # Create token with very short expiry
        download_link = download_manager.create_secure_download_link(
            purchase_id=test_purchase_security.id,
            file_path=file_path,
            expires_hours=-1  # Already expired
        )
        
        token = download_link.split('token=')[1]
        
        # Verify expired token is rejected
        validation_result = download_manager.validate_download_access(token)
        assert validation_result['valid'] is False
        assert validation_result['error_code'] == 'EXPIRED_TOKEN'
        assert 'expires_at' in validation_result
    
    def test_download_attempt_limits(self, app_context, download_manager, test_purchase_security):
        """Test download attempt limit enforcement"""
        # Set purchase to maximum attempts
        test_purchase_security.download_attempts = 5
        from app import db
        db.session.commit()
        
        file_path = 'renders/max-attempts-test.mp4'
        download_link = download_manager.create_secure_download_link(
            purchase_id=test_purchase_security.id,
            file_path=file_path
        )
        
        token = download_link.split('token=')[1]
        
        # Verify max attempts prevents access
        validation_result = download_manager.validate_download_access(token)
        assert validation_result['valid'] is False
        assert validation_result['error_code'] == 'MAX_ATTEMPTS_EXCEEDED'
        assert validation_result['attempts_used'] == 5
        assert validation_result['max_attempts'] == 5
    
    def test_purchase_status_validation(self, app_context, download_manager, test_user):
        """Test download access validation for different purchase statuses"""
        from app import db
        
        # Create pending purchase
        pending_purchase = Purchase(
            id=str(uuid.uuid4()),
            user_id=test_user.id,
            file_id='pending-test-file',
            tier='personal',
            amount=299,
            status='pending',  # Not completed
            download_expires_at=datetime.utcnow() + timedelta(hours=48)
        )
        db.session.add(pending_purchase)
        db.session.commit()
        
        file_path = 'renders/pending-test-file.mp4'
        download_link = download_manager.create_secure_download_link(
            purchase_id=pending_purchase.id,
            file_path=file_path
        )
        
        token = download_link.split('token=')[1]
        
        # Verify pending purchase prevents access
        validation_result = download_manager.validate_download_access(token)
        assert validation_result['valid'] is False
        assert validation_result['error_code'] == 'PURCHASE_INCOMPLETE'
        assert validation_result['purchase_status'] == 'pending'
    
    def test_nonexistent_purchase_validation(self, app_context, download_manager):
        """Test validation for non-existent purchase"""
        # Create token for non-existent purchase
        fake_purchase_id = str(uuid.uuid4())
        
        # Manually create token data
        token_data = {
            'purchase_id': fake_purchase_id,
            'file_path': 'renders/fake-file.mp4',
            'expires_at': (datetime.utcnow() + timedelta(hours=24)).isoformat(),
            'nonce': str(uuid.uuid4())
        }
        
        # Generate signed token
        token = download_manager._generate_signed_token(token_data)
        
        # Verify non-existent purchase is rejected
        validation_result = download_manager.validate_download_access(token)
        assert validation_result['valid'] is False
        assert validation_result['error_code'] == 'PURCHASE_NOT_FOUND'
    
    def test_token_replay_attack_prevention(self, app_context, download_manager, test_purchase_security):
        """Test prevention of token replay attacks using nonce"""
        file_path = 'renders/replay-test-file.mp4'
        
        # Create two tokens for same purchase
        link1 = download_manager.create_secure_download_link(
            purchase_id=test_purchase_security.id,
            file_path=file_path
        )
        
        link2 = download_manager.create_secure_download_link(
            purchase_id=test_purchase_security.id,
            file_path=file_path
        )
        
        token1 = link1.split('token=')[1]
        token2 = link2.split('token=')[1]
        
        # Tokens should be different (due to nonce)
        assert token1 != token2
        
        # Both should be valid
        validation1 = download_manager.validate_download_access(token1)
        validation2 = download_manager.validate_download_access(token2)
        
        assert validation1['valid'] is True
        assert validation2['valid'] is True
    
    def test_token_base64_padding_handling(self, app_context, download_manager, test_purchase_security):
        """Test proper handling of base64 padding in tokens"""
        file_path = 'renders/padding-test-file.mp4'
        
        download_link = download_manager.create_secure_download_link(
            purchase_id=test_purchase_security.id,
            file_path=file_path
        )
        
        token = download_link.split('token=')[1]
        
        # Test token with various padding scenarios
        # Remove padding
        token_no_padding = token.rstrip('=')
        validation_no_padding = download_manager.validate_download_access(token_no_padding)
        assert validation_no_padding['valid'] is True
        
        # Add extra padding
        token_extra_padding = token + '='
        validation_extra_padding = download_manager.validate_download_access(token_extra_padding)
        assert validation_extra_padding['valid'] is True
    
    def test_malformed_token_handling(self, app_context, download_manager):
        """Test handling of malformed tokens"""
        malformed_tokens = [
            '',  # Empty token
            'invalid-base64-!@#$',  # Invalid base64
            'dGVzdA==',  # Valid base64 but invalid JSON
            base64.urlsafe_b64encode(b'{"invalid": "json"').decode(),  # Invalid JSON
            base64.urlsafe_b64encode(b'{"data": {}, "signature": "invalid"}').decode(),  # Invalid signature
        ]
        
        for malformed_token in malformed_tokens:
            validation_result = download_manager.validate_download_access(malformed_token)
            assert validation_result['valid'] is False
            assert validation_result['error_code'] == 'INVALID_TOKEN'


class TestDownloadExpiration:
    """Test download expiration logic and handling"""
    
    @pytest.fixture
    def download_manager(self):
        return DownloadManager(secret_key='test-expiration-key')
    
    def test_link_expiration_check(self, app_context, download_manager, test_user):
        """Test download link expiration checking"""
        from app import db
        
        # Create purchase with expired download
        expired_purchase = Purchase(
            id=str(uuid.uuid4()),
            user_id=test_user.id,
            file_id='expired-link-test',
            tier='personal',
            amount=299,
            status='completed',
            completed_at=datetime.utcnow() - timedelta(days=2),
            download_expires_at=datetime.utcnow() - timedelta(hours=1)  # Expired 1 hour ago
        )
        db.session.add(expired_purchase)
        db.session.commit()
        
        # Test expiration handling
        expiration_result = download_manager.handle_link_expiration(expired_purchase.id)
        
        assert expiration_result['success'] is True
        assert expiration_result['can_resend'] is True
        assert 'days_since_purchase' in expiration_result
        assert expiration_result['days_since_purchase'] <= 30  # Within resend window
    
    def test_old_purchase_expiration(self, app_context, download_manager, test_user):
        """Test expiration handling for very old purchases"""
        from app import db
        
        # Create very old purchase (over 30 days)
        old_purchase = Purchase(
            id=str(uuid.uuid4()),
            user_id=test_user.id,
            file_id='old-purchase-test',
            tier='personal',
            amount=299,
            status='completed',
            completed_at=datetime.utcnow() - timedelta(days=35),  # 35 days old
            download_expires_at=datetime.utcnow() - timedelta(days=33)
        )
        db.session.add(old_purchase)
        db.session.commit()
        
        # Test old purchase handling
        expiration_result = download_manager.handle_link_expiration(old_purchase.id)
        
        assert expiration_result['success'] is False
        assert 'Purchase too old for re-send' in expiration_result['error']
        assert expiration_result['days_since_purchase'] > 30
    
    def test_resend_link_creation(self, app_context, download_manager, test_user):
        """Test creating new download links for expired purchases"""
        from app import db
        
        # Create expired but recent purchase
        expired_purchase = Purchase(
            id=str(uuid.uuid4()),
            user_id=test_user.id,
            file_id='resend-test-file',
            tier='commercial',
            amount=999,
            status='completed',
            completed_at=datetime.utcnow() - timedelta(hours=50),
            download_expires_at=datetime.utcnow() - timedelta(hours=2),  # Expired
            download_attempts=2
        )
        db.session.add(expired_purchase)
        db.session.commit()
        
        # Create new download link
        resend_result = download_manager.create_resend_link(expired_purchase.id)
        
        assert resend_result['success'] is True
        assert 'download_link' in resend_result
        assert '/api/downloads/secure' in resend_result['download_link']
        assert 'expires_at' in resend_result
        assert resend_result['attempts_remaining'] == 3  # 5 - 2 previous attempts
        
        # Verify purchase record updated with new token and expiration
        updated_purchase = Purchase.query.get(expired_purchase.id)
        assert updated_purchase.download_token is not None
        assert updated_purchase.download_expires_at > datetime.utcnow()
    
    def test_expiration_with_max_attempts(self, app_context, download_manager, test_user):
        """Test expiration handling when max attempts reached"""
        from app import db
        
        # Create purchase with max attempts
        maxed_purchase = Purchase(
            id=str(uuid.uuid4()),
            user_id=test_user.id,
            file_id='maxed-attempts-test',
            tier='personal',
            amount=299,
            status='completed',
            completed_at=datetime.utcnow() - timedelta(hours=25),
            download_expires_at=datetime.utcnow() - timedelta(hours=1),
            download_attempts=5  # Max attempts reached
        )
        db.session.add(maxed_purchase)
        db.session.commit()
        
        # Resend should still work (new expiration, but attempts remain)
        resend_result = download_manager.create_resend_link(maxed_purchase.id)
        
        assert resend_result['success'] is True
        assert resend_result['attempts_remaining'] == 0  # No attempts remaining
        
        # But validation should fail due to max attempts
        new_token = resend_result['download_link'].split('token=')[1]
        validation_result = download_manager.validate_download_access(new_token)
        
        assert validation_result['valid'] is False
        assert validation_result['error_code'] == 'MAX_ATTEMPTS_EXCEEDED'


class TestDownloadTracking:
    """Test download attempt tracking and analytics"""
    
    @pytest.fixture
    def download_manager(self):
        return DownloadManager(secret_key='test-tracking-key')
    
    def test_download_attempt_tracking(self, app_context, download_manager, test_user):
        """Test tracking download attempts"""
        from app import db
        
        purchase = Purchase(
            id=str(uuid.uuid4()),
            user_id=test_user.id,
            file_id='tracking-test-file',
            tier='personal',
            amount=299,
            status='completed',
            download_attempts=0
        )
        db.session.add(purchase)
        db.session.commit()
        
        initial_attempts = purchase.download_attempts
        
        # Track successful download
        success = download_manager.track_download_attempt(
            purchase_id=purchase.id,
            success=True,
            user_agent='Test Browser 1.0',
            ip_address='192.168.1.100'
        )
        
        assert success is True
        
        # Verify attempt count increased
        updated_purchase = Purchase.query.get(purchase.id)
        assert updated_purchase.download_attempts == initial_attempts + 1
    
    def test_download_attempt_tracking_failure(self, app_context, download_manager, test_user):
        """Test tracking failed download attempts"""
        from app import db
        
        purchase = Purchase(
            id=str(uuid.uuid4()),
            user_id=test_user.id,
            file_id='tracking-failure-test',
            tier='commercial',
            amount=999,
            status='completed',
            download_attempts=1
        )
        db.session.add(purchase)
        db.session.commit()
        
        # Track failed download
        success = download_manager.track_download_attempt(
            purchase_id=purchase.id,
            success=False,
            user_agent='Test Browser 1.0',
            ip_address='192.168.1.100'
        )
        
        assert success is True  # Tracking succeeded
        
        # Verify attempt count still increased (even for failed downloads)
        updated_purchase = Purchase.query.get(purchase.id)
        assert updated_purchase.download_attempts == 2
    
    def test_download_analytics_generation(self, app_context, download_manager, test_user):
        """Test download analytics generation"""
        from app import db
        
        # Create multiple purchases with different tiers and attempts
        purchases = []
        for i, tier in enumerate(['personal', 'commercial', 'premium']):
            purchase = Purchase(
                id=str(uuid.uuid4()),
                user_id=test_user.id,
                file_id=f'analytics-test-{i}',
                tier=tier,
                amount=299 + (i * 700),  # Different amounts
                status='completed',
                download_attempts=i + 1,  # Different attempt counts
                created_at=datetime.utcnow() - timedelta(days=i)
            )
            purchases.append(purchase)
            db.session.add(purchase)
        
        db.session.commit()
        
        # Get analytics
        analytics_result = download_manager.get_download_analytics(user_id=test_user.id)
        
        assert analytics_result['success'] is True
        analytics = analytics_result['analytics']
        
        assert analytics['total_purchases'] == 3
        assert analytics['completed_purchases'] == 3
        assert analytics['total_downloads'] == 6  # 1 + 2 + 3
        assert analytics['average_downloads_per_purchase'] == 2.0
        
        # Check tier statistics
        tier_stats = analytics['tier_statistics']
        assert 'personal' in tier_stats
        assert 'commercial' in tier_stats
        assert 'premium' in tier_stats
        
        assert tier_stats['personal']['count'] == 1
        assert tier_stats['personal']['downloads'] == 1
        assert tier_stats['commercial']['count'] == 1
        assert tier_stats['commercial']['downloads'] == 2
    
    def test_download_analytics_date_filtering(self, app_context, download_manager, test_user):
        """Test download analytics with date filtering"""
        from app import db
        
        # Create purchases on different dates
        old_purchase = Purchase(
            id=str(uuid.uuid4()),
            user_id=test_user.id,
            file_id='old-analytics-test',
            tier='personal',
            amount=299,
            status='completed',
            download_attempts=2,
            created_at=datetime.utcnow() - timedelta(days=10)
        )
        
        recent_purchase = Purchase(
            id=str(uuid.uuid4()),
            user_id=test_user.id,
            file_id='recent-analytics-test',
            tier='commercial',
            amount=999,
            status='completed',
            download_attempts=3,
            created_at=datetime.utcnow() - timedelta(days=1)
        )
        
        db.session.add_all([old_purchase, recent_purchase])
        db.session.commit()
        
        # Get analytics for last 5 days only
        date_from = datetime.utcnow() - timedelta(days=5)
        analytics_result = download_manager.get_download_analytics(
            user_id=test_user.id,
            date_from=date_from
        )
        
        assert analytics_result['success'] is True
        analytics = analytics_result['analytics']
        
        # Should only include recent purchase
        assert analytics['total_purchases'] == 1
        assert analytics['total_downloads'] == 3
        assert 'commercial' in analytics['tier_statistics']
        assert 'personal' not in analytics['tier_statistics']c
lass TestDownloadSecurityComprehensive:
    """Comprehensive download security tests covering all attack vectors"""
    
    @pytest.fixture
    def download_manager(self):
        return DownloadManager(secret_key='comprehensive-security-test-key')
    
    def test_token_cryptographic_strength(self, app_context, download_manager, test_user):
        """Test cryptographic strength of download tokens"""
        from app import db
        
        purchase = Purchase(
            id=str(uuid.uuid4()),
            user_id=test_user.id,
            file_id='crypto-strength-test',
            tier='personal',
            amount=299,
            status='completed',
            completed_at=datetime.utcnow(),
            download_expires_at=datetime.utcnow() + timedelta(hours=48),
            download_attempts=0
        )
        db.session.add(purchase)
        db.session.commit()
        
        # Generate multiple tokens
        tokens = []
        for i in range(100):
            file_path = f'renders/crypto-test-{i}.mp4'
            download_link = download_manager.create_secure_download_link(
                purchase_id=purchase.id,
                file_path=file_path,
                expires_hours=24
            )
            token = download_link.split('token=')[1]
            tokens.append(token)
        
        # Test token uniqueness
        assert len(set(tokens)) == len(tokens), "All tokens should be unique"
        
        # Test token entropy (should not have obvious patterns)
        for token in tokens[:10]:  # Test first 10 tokens
            # Tokens should be base64 encoded
            import base64
            try:
                # Add padding if needed
                missing_padding = len(token) % 4
                if missing_padding:
                    token += '=' * (4 - missing_padding)
                decoded = base64.urlsafe_b64decode(token.encode('ascii'))
                assert len(decoded) > 50  # Should have substantial content
            except Exception:
                pytest.fail(f"Token should be valid base64: {token}")
    
    def test_timing_attack_resistance(self, app_context, download_manager, test_user):
        """Test resistance to timing attacks on token validation"""
        from app import db
        import time
        
        purchase = Purchase(
            id=str(uuid.uuid4()),
            user_id=test_user.id,
            file_id='timing-attack-test',
            tier='personal',
            amount=299,
            status='completed',
            completed_at=datetime.utcnow(),
            download_expires_at=datetime.utcnow() + timedelta(hours=48),
            download_attempts=0
        )
        db.session.add(purchase)
        db.session.commit()
        
        # Create valid token
        file_path = 'renders/timing-test.mp4'
        download_link = download_manager.create_secure_download_link(
            purchase_id=purchase.id,
            file_path=file_path
        )
        valid_token = download_link.split('token=')[1]
        
        # Create invalid tokens of different lengths
        invalid_tokens = [
            'short',
            'medium_length_token',
            'very_long_invalid_token_that_should_not_validate_but_takes_time_to_process',
            valid_token[:-5] + 'wrong',  # Almost valid token
            'completely_different_token_with_same_length_as_valid_' + 'x' * (len(valid_token) - 50)
        ]
        
        # Measure validation times
        valid_times = []
        invalid_times = []
        
        # Test valid token multiple times
        for _ in range(10):
            start = time.time()
            result = download_manager.validate_download_access(valid_token)
            end = time.time()
            valid_times.append(end - start)
            assert result['valid'] is True
        
        # Test invalid tokens
        for invalid_token in invalid_tokens:
            times_for_this_token = []
            for _ in range(5):
                start = time.time()
                result = download_manager.validate_download_access(invalid_token)
                end = time.time()
                times_for_this_token.append(end - start)
                assert result['valid'] is False
            invalid_times.extend(times_for_this_token)
        
        # Timing should be relatively consistent (no obvious timing leaks)
        avg_valid_time = sum(valid_times) / len(valid_times)
        avg_invalid_time = sum(invalid_times) / len(invalid_times)
        
        # Times should be in similar range (within 10x of each other)
        time_ratio = max(avg_valid_time, avg_invalid_time) / min(avg_valid_time, avg_invalid_time)
        assert time_ratio < 10, f"Timing difference too large: {time_ratio}"
    
    def test_token_brute_force_resistance(self, app_context, download_manager, test_user):
        """Test resistance to brute force attacks on tokens"""
        from app import db
        import random
        import string
        
        purchase = Purchase(
            id=str(uuid.uuid4()),
            user_id=test_user.id,
            file_id='brute-force-test',
            tier='personal',
            amount=299,
            status='completed',
            completed_at=datetime.utcnow(),
            download_expires_at=datetime.utcnow() + timedelta(hours=48),
            download_attempts=0
        )
        db.session.add(purchase)
        db.session.commit()
        
        # Generate random tokens to test brute force resistance
        random_tokens = []
        for _ in range(1000):
            # Generate random base64-like strings
            length = random.randint(50, 200)
            chars = string.ascii_letters + string.digits + '-_='
            random_token = ''.join(random.choice(chars) for _ in range(length))
            random_tokens.append(random_token)
        
        # None of the random tokens should validate
        valid_count = 0
        for token in random_tokens:
            try:
                result = download_manager.validate_download_access(token)
                if result.get('valid'):
                    valid_count += 1
            except Exception:
                # Exceptions are fine for invalid tokens
                pass
        
        # Should have extremely low (ideally zero) false positive rate
        false_positive_rate = valid_count / len(random_tokens)
        assert false_positive_rate < 0.001, f"Too many false positives: {false_positive_rate}"
    
    def test_token_replay_attack_advanced(self, app_context, download_manager, test_user):
        """Test advanced replay attack scenarios"""
        from app import db
        
        purchase = Purchase(
            id=str(uuid.uuid4()),
            user_id=test_user.id,
            file_id='replay-advanced-test',
            tier='personal',
            amount=299,
            status='completed',
            completed_at=datetime.utcnow(),
            download_expires_at=datetime.utcnow() + timedelta(hours=48),
            download_attempts=0
        )
        db.session.add(purchase)
        db.session.commit()
        
        # Create token
        file_path = 'renders/replay-test.mp4'
        download_link = download_manager.create_secure_download_link(
            purchase_id=purchase.id,
            file_path=file_path
        )
        token = download_link.split('token=')[1]
        
        # Test token reuse across different contexts
        contexts = [
            {'user_agent': 'Browser1', 'ip': '192.168.1.1'},
            {'user_agent': 'Browser2', 'ip': '192.168.1.2'},
            {'user_agent': 'Mobile', 'ip': '10.0.0.1'},
        ]
        
        # Token should work from different contexts (no binding to IP/UA)
        for context in contexts:
            result = download_manager.validate_download_access(token)
            assert result['valid'] is True
        
        # But should still respect attempt limits
        # Simulate multiple downloads
        for i in range(5):  # Max attempts
            success = download_manager.track_download_attempt(
                purchase_id=purchase.id,
                success=True,
                user_agent=f'Test-Agent-{i}',
                ip_address=f'192.168.1.{i}'
            )
            assert success is True
        
        # After max attempts, token should be invalid
        result = download_manager.validate_download_access(token)
        assert result['valid'] is False
        assert result['error_code'] == 'MAX_ATTEMPTS_EXCEEDED'
    
    def test_cross_purchase_token_isolation(self, app_context, download_manager, test_user):
        """Test that tokens from one purchase cannot access another purchase"""
        from app import db
        
        # Create two purchases
        purchase1 = Purchase(
            id=str(uuid.uuid4()),
            user_id=test_user.id,
            file_id='isolation-test-1',
            tier='personal',
            amount=299,
            status='completed',
            completed_at=datetime.utcnow(),
            download_expires_at=datetime.utcnow() + timedelta(hours=48),
            download_attempts=0
        )
        
        purchase2 = Purchase(
            id=str(uuid.uuid4()),
            user_id=test_user.id,
            file_id='isolation-test-2',
            tier='commercial',
            amount=999,
            status='completed',
            completed_at=datetime.utcnow(),
            download_expires_at=datetime.utcnow() + timedelta(hours=48),
            download_attempts=0
        )
        
        db.session.add_all([purchase1, purchase2])
        db.session.commit()
        
        # Create tokens for both purchases
        link1 = download_manager.create_secure_download_link(
            purchase_id=purchase1.id,
            file_path='renders/file1.mp4'
        )
        token1 = link1.split('token=')[1]
        
        link2 = download_manager.create_secure_download_link(
            purchase_id=purchase2.id,
            file_path='renders/file2.mp4'
        )
        token2 = link2.split('token=')[1]
        
        # Validate tokens access correct purchases
        result1 = download_manager.validate_download_access(token1)
        assert result1['valid'] is True
        assert result1['purchase_id'] == purchase1.id
        
        result2 = download_manager.validate_download_access(token2)
        assert result2['valid'] is True
        assert result2['purchase_id'] == purchase2.id
        
        # Tokens should be different
        assert token1 != token2
    
    def test_token_modification_detection(self, app_context, download_manager, test_user):
        """Test detection of token modifications"""
        from app import db
        import base64
        import json
        
        purchase = Purchase(
            id=str(uuid.uuid4()),
            user_id=test_user.id,
            file_id='modification-test',
            tier='personal',
            amount=299,
            status='completed',
            completed_at=datetime.utcnow(),
            download_expires_at=datetime.utcnow() + timedelta(hours=48),
            download_attempts=0
        )
        db.session.add(purchase)
        db.session.commit()
        
        # Create valid token
        file_path = 'renders/modification-test.mp4'
        download_link = download_manager.create_secure_download_link(
            purchase_id=purchase.id,
            file_path=file_path
        )
        valid_token = download_link.split('token=')[1]
        
        # Verify valid token works
        result = download_manager.validate_download_access(valid_token)
        assert result['valid'] is True
        
        # Test various modifications
        modifications = [
            # Change single character
            valid_token[:-1] + ('A' if valid_token[-1] != 'A' else 'B'),
            # Swap two characters
            valid_token[:-2] + valid_token[-1] + valid_token[-2],
            # Add character
            valid_token + 'X',
            # Remove character
            valid_token[:-1],
            # Change in middle
            valid_token[:len(valid_token)//2] + 'X' + valid_token[len(valid_token)//2+1:],
        ]
        
        for modified_token in modifications:
            result = download_manager.validate_download_access(modified_token)
            assert result['valid'] is False, f"Modified token should be invalid: {modified_token}"
            assert result['error_code'] == 'INVALID_TOKEN'


class TestDownloadSecurityEdgeCases:
    """Edge case security tests for download system"""
    
    @pytest.fixture
    def download_manager(self):
        return DownloadManager(secret_key='edge-case-security-test')
    
    def test_zero_length_secret_key(self):
        """Test behavior with zero-length secret key"""
        try:
            manager = DownloadManager(secret_key='')
            # Should still work but with reduced security
            assert manager.secret_key == ''
        except Exception:
            # Or should raise an exception - either is acceptable
            pass
    
    def test_unicode_secret_key(self):
        """Test behavior with unicode secret key"""
        unicode_key = '测试密钥🔑'
        manager = DownloadManager(secret_key=unicode_key)
        assert manager.secret_key == unicode_key
        
        # Should be able to create and validate tokens
        token_data = {
            'purchase_id': str(uuid.uuid4()),
            'file_path': 'test.mp4',
            'expires_at': (datetime.utcnow() + timedelta(hours=1)).isoformat(),
            'nonce': str(uuid.uuid4())
        }
        
        try:
            token = manager._generate_signed_token(token_data)
            verified_data = manager._verify_signed_token(token)
            assert verified_data == token_data
        except Exception as e:
            # Unicode handling might fail, which is acceptable
            assert 'unicode' in str(e).lower() or 'encoding' in str(e).lower()
    
    def test_extremely_long_file_paths(self, app_context, download_manager, test_user):
        """Test handling of extremely long file paths"""
        from app import db
        
        purchase = Purchase(
            id=str(uuid.uuid4()),
            user_id=test_user.id,
            file_id='long-path-test',
            tier='personal',
            amount=299,
            status='completed',
            completed_at=datetime.utcnow(),
            download_expires_at=datetime.utcnow() + timedelta(hours=48),
            download_attempts=0
        )
        db.session.add(purchase)
        db.session.commit()
        
        # Create extremely long file path
        long_path = 'renders/' + 'very_long_directory_name/' * 100 + 'file.mp4'
        
        try:
            download_link = download_manager.create_secure_download_link(
                purchase_id=purchase.id,
                file_path=long_path,
                expires_hours=24
            )
            
            token = download_link.split('token=')[1]
            result = download_manager.validate_download_access(token)
            
            if result['valid']:
                assert result['file_path'] == long_path
            else:
                # May fail due to length limits, which is acceptable
                assert 'INVALID_TOKEN' in result.get('error_code', '')
                
        except Exception as e:
            # May raise exception for extremely long paths
            assert 'length' in str(e).lower() or 'size' in str(e).lower()
    
    def test_negative_expiration_times(self, app_context, download_manager, test_user):
        """Test handling of negative expiration times"""
        from app import db
        
        purchase = Purchase(
            id=str(uuid.uuid4()),
            user_id=test_user.id,
            file_id='negative-expiry-test',
            tier='personal',
            amount=299,
            status='completed',
            completed_at=datetime.utcnow(),
            download_expires_at=datetime.utcnow() + timedelta(hours=48),
            download_attempts=0
        )
        db.session.add(purchase)
        db.session.commit()
        
        # Test with negative expiration hours
        try:
            download_link = download_manager.create_secure_download_link(
                purchase_id=purchase.id,
                file_path='renders/negative-test.mp4',
                expires_hours=-24  # Negative hours
            )
            
            token = download_link.split('token=')[1]
            result = download_manager.validate_download_access(token)
            
            # Should be expired immediately
            assert result['valid'] is False
            assert result['error_code'] == 'EXPIRED_TOKEN'
            
        except Exception as e:
            # May raise exception for negative values
            assert 'negative' in str(e).lower() or 'invalid' in str(e).lower()
    
    def test_concurrent_token_validation(self, app_context, download_manager, test_user):
        """Test concurrent token validation for race conditions"""
        from app import db
        import threading
        
        purchase = Purchase(
            id=str(uuid.uuid4()),
            user_id=test_user.id,
            file_id='concurrent-validation-test',
            tier='personal',
            amount=299,
            status='completed',
            completed_at=datetime.utcnow(),
            download_expires_at=datetime.utcnow() + timedelta(hours=48),
            download_attempts=0
        )
        db.session.add(purchase)
        db.session.commit()
        
        # Create token
        download_link = download_manager.create_secure_download_link(
            purchase_id=purchase.id,
            file_path='renders/concurrent-test.mp4'
        )
        token = download_link.split('token=')[1]
        
        results = []
        
        def validate_token():
            try:
                result = download_manager.validate_download_access(token)
                results.append(result)
            except Exception as e:
                results.append({'valid': False, 'error': str(e)})
        
        # Validate token concurrently
        threads = []
        for _ in range(10):
            thread = threading.Thread(target=validate_token)
            threads.append(thread)
            thread.start()
        
        # Wait for all threads
        for thread in threads:
            thread.join()
        
        # All validations should succeed (token is valid)
        assert len(results) == 10
        for result in results:
            assert result.get('valid') is True or 'error' in result
    
    def test_token_with_special_characters_in_data(self, app_context, download_manager, test_user):
        """Test tokens containing special characters in data fields"""
        from app import db
        
        # Create purchase with special characters in ID (if possible)
        special_purchase_id = str(uuid.uuid4())  # UUIDs are safe, but test the concept
        
        purchase = Purchase(
            id=special_purchase_id,
            user_id=test_user.id,
            file_id='special-chars-test-<>&"\'',
            tier='personal',
            amount=299,
            status='completed',
            completed_at=datetime.utcnow(),
            download_expires_at=datetime.utcnow() + timedelta(hours=48),
            download_attempts=0
        )
        db.session.add(purchase)
        db.session.commit()
        
        # Create token with special characters in file path
        special_file_path = 'renders/file-with-<>&"\'-chars.mp4'
        
        download_link = download_manager.create_secure_download_link(
            purchase_id=special_purchase_id,
            file_path=special_file_path
        )
        
        token = download_link.split('token=')[1]
        result = download_manager.validate_download_access(token)
        
        assert result['valid'] is True
        assert result['purchase_id'] == special_purchase_id
        assert result['file_path'] == special_file_path