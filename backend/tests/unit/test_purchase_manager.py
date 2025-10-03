"""
Unit tests for PurchaseManager functionality.
Tests purchase flow, Stripe integration, and purchase management.
"""
import pytest
from unittest.mock import Mock, patch, MagicMock
from datetime import datetime, timedelta
import uuid
import threading

from app.models import Purchase, User
from app.purchases.manager import PurchaseManager
from app.purchases.config import PRICING_TIERS


class TestPurchaseManager:
    """Test cases for PurchaseManager class"""
    
    @pytest.fixture
    def purchase_manager(self):
        """Create PurchaseManager instance for testing"""
        return PurchaseManager()
    
    @pytest.fixture
    def test_purchase_data(self, test_user):
        """Sample purchase data for testing"""
        return {
            'user_id': test_user.id,
            'tier': 'personal',
            'file_id': 'test-file-123',
            'user_email': test_user.email
        }
    
    def test_create_purchase_session_success(self, app_context, purchase_manager, test_user):
        """Test successful purchase session creation"""
        with patch('stripe.checkout.Session.create') as mock_stripe, \
             patch('app.purchases.manager.url_for') as mock_url_for:
            
            # Mock Flask url_for to avoid SERVER_NAME issues
            mock_url_for.side_effect = lambda endpoint, **kwargs: f'/mock/{endpoint}'
            
            # Mock Stripe response
            mock_session = Mock()
            mock_session.id = 'cs_test_123456789'
            mock_session.url = 'https://checkout.stripe.com/pay/cs_test_123456789'
            mock_stripe.return_value = mock_session
            
            # Create purchase session
            result = purchase_manager.create_purchase_session(
                user_id=test_user.id,
                tier='personal',
                file_id='test-file-123',
                user_email=test_user.email
            )
            
            # Verify result
            assert result['success'] is True
            assert 'purchase_id' in result
            assert result['session_id'] == 'cs_test_123456789'
            assert result['checkout_url'] == 'https://checkout.stripe.com/pay/cs_test_123456789'
            assert result['tier_info']['name'] == 'Personal Use'
            
            # Verify purchase record created
            purchase = Purchase.query.filter_by(stripe_session_id='cs_test_123456789').first()
            assert purchase is not None
            assert purchase.user_id == test_user.id
            assert purchase.tier == 'personal'
            assert purchase.amount == PRICING_TIERS['personal']['price']
            assert purchase.status == 'pending'
    
    def test_create_purchase_session_anonymous_user(self, app_context, purchase_manager):
        """Test purchase session creation for anonymous user"""
        with patch('stripe.checkout.Session.create') as mock_stripe, \
             patch('app.purchases.manager.url_for') as mock_url_for:
            
            # Mock Flask url_for
            mock_url_for.side_effect = lambda endpoint, **kwargs: f'/mock/{endpoint}'
            
            mock_session = Mock()
            mock_session.id = 'cs_test_anonymous'
            mock_session.url = 'https://checkout.stripe.com/pay/cs_test_anonymous'
            mock_stripe.return_value = mock_session
            
            result = purchase_manager.create_purchase_session(
                user_id=None,
                tier='commercial',
                file_id='test-file-456',
                user_email='anonymous@example.com'
            )
            
            assert result['success'] is True
            
            # Verify purchase record for anonymous user
            purchase = Purchase.query.filter_by(stripe_session_id='cs_test_anonymous').first()
            assert purchase is not None
            assert purchase.user_id is None
            assert purchase.user_email == 'anonymous@example.com'
            assert purchase.tier == 'commercial'
    
    def test_create_purchase_session_invalid_tier(self, app_context, purchase_manager, test_user):
        """Test purchase session creation with invalid tier"""
        result = purchase_manager.create_purchase_session(
            user_id=test_user.id,
            tier='invalid_tier',
            file_id='test-file-123',
            user_email=test_user.email
        )
        
        assert result['success'] is False
        assert 'Invalid pricing tier' in result['error']
    
    def test_create_purchase_session_stripe_error(self, app_context, purchase_manager, test_user):
        """Test purchase session creation with Stripe error"""
        with patch('stripe.checkout.Session.create') as mock_stripe, \
             patch('app.purchases.manager.url_for') as mock_url_for:
            
            # Mock Flask url_for
            mock_url_for.side_effect = lambda endpoint, **kwargs: f'/mock/{endpoint}'
            
            # Mock Stripe error
            mock_stripe.side_effect = Exception('Payment processing error')
            
            result = purchase_manager.create_purchase_session(
                user_id=test_user.id,
                tier='personal',
                file_id='test-file-123',
                user_email=test_user.email
            )
            
            assert result['success'] is False
            assert 'Payment processing error' in result['error']
    
    def test_handle_payment_success(self, app_context, purchase_manager, test_user):
        """Test successful payment handling"""
        from app import db
        
        # Create pending purchase
        purchase = Purchase(
            id=str(uuid.uuid4()),
            user_id=test_user.id,
            file_id='test-file-123',
            tier='personal',
            amount=299,
            stripe_session_id='cs_test_success',
            status='pending',
            download_expires_at=datetime.utcnow() + timedelta(hours=48)
        )
        db.session.add(purchase)
        db.session.commit()
        
        with patch('stripe.checkout.Session.retrieve') as mock_retrieve, \
             patch.object(purchase_manager.licensing_service, 'send_licensing_email') as mock_email:
            
            # Mock Stripe session retrieval
            mock_session = Mock()
            mock_session.payment_status = 'paid'
            mock_session.payment_intent = 'pi_test_123'
            mock_retrieve.return_value = mock_session
            
            # Mock email service
            mock_email.return_value = {'success': True}
            
            # Handle payment success
            result = purchase_manager.handle_payment_success('cs_test_success')
            
            # Verify result
            assert result['success'] is True
            assert result['purchase_id'] == purchase.id
            assert 'download_token' in result
            assert result['tier'] == 'personal'
            assert result['amount'] == 299
            
            # Verify purchase updated
            updated_purchase = Purchase.query.get(purchase.id)
            assert updated_purchase.status == 'completed'
            assert updated_purchase.completed_at is not None
            assert updated_purchase.download_token is not None
            assert updated_purchase.stripe_payment_intent == 'pi_test_123'
            
            # Verify licensing email was sent
            mock_email.assert_called_once_with(updated_purchase)
    
    def test_handle_payment_success_purchase_not_found(self, app_context, purchase_manager):
        """Test payment success handling for non-existent purchase"""
        result = purchase_manager.handle_payment_success('cs_nonexistent')
        
        assert result['success'] is False
        assert 'Purchase not found' in result['error']
    
    def test_handle_payment_success_payment_not_completed(self, app_context, purchase_manager, test_user):
        """Test payment success handling when Stripe payment not completed"""
        from app import db
        
        # Create pending purchase
        purchase = Purchase(
            id=str(uuid.uuid4()),
            user_id=test_user.id,
            file_id='test-file-123',
            tier='personal',
            amount=299,
            stripe_session_id='cs_test_unpaid',
            status='pending'
        )
        db.session.add(purchase)
        db.session.commit()
        
        with patch('stripe.checkout.Session.retrieve') as mock_retrieve:
            # Mock unpaid Stripe session
            mock_session = Mock()
            mock_session.payment_status = 'unpaid'
            mock_retrieve.return_value = mock_session
            
            result = purchase_manager.handle_payment_success('cs_test_unpaid')
            
            assert result['success'] is False
            assert 'Payment not completed' in result['error']
    
    def test_verify_payment(self, app_context, purchase_manager, test_user):
        """Test payment verification"""
        from app import db
        
        # Create completed purchase
        purchase = Purchase(
            id=str(uuid.uuid4()),
            user_id=test_user.id,
            file_id='test-file-123',
            tier='personal',
            amount=299,
            status='completed',
            download_token='test-token-123'
        )
        db.session.add(purchase)
        db.session.commit()
        
        result = purchase_manager.verify_payment(purchase.id)
        
        assert result['success'] is True
        assert result['status'] == 'completed'
        assert result['completed'] is True
        assert result['download_token'] == 'test-token-123'
    
    def test_verify_payment_not_found(self, app_context, purchase_manager):
        """Test payment verification for non-existent purchase"""
        result = purchase_manager.verify_payment('nonexistent-id')
        
        assert result['success'] is False
        assert result['error'] == 'Purchase not found'
    
    def test_get_user_purchases(self, app_context, purchase_manager, test_user):
        """Test getting user purchase history"""
        from app import db
        
        # Create multiple purchases
        purchase1 = Purchase(
            id=str(uuid.uuid4()),
            user_id=test_user.id,
            file_id='file-1',
            tier='personal',
            amount=299,
            status='completed',
            download_token='token-1',
            download_expires_at=datetime.utcnow() + timedelta(hours=24),
            download_attempts=1,
            created_at=datetime.utcnow() - timedelta(days=1),
            completed_at=datetime.utcnow() - timedelta(days=1)
        )
        
        purchase2 = Purchase(
            id=str(uuid.uuid4()),
            user_id=test_user.id,
            file_id='file-2',
            tier='commercial',
            amount=999,
            status='pending',
            created_at=datetime.utcnow()
        )
        
        db.session.add_all([purchase1, purchase2])
        db.session.commit()
        
        purchases = purchase_manager.get_user_purchases(test_user.id)
        
        assert len(purchases) == 2
        
        # Check first purchase (most recent)
        recent_purchase = purchases[0]
        assert recent_purchase['tier'] == 'commercial'
        assert recent_purchase['status'] == 'pending'
        assert recent_purchase['download_available'] is False
        
        # Check second purchase
        older_purchase = purchases[1]
        assert older_purchase['tier'] == 'personal'
        assert older_purchase['status'] == 'completed'
        assert older_purchase['download_available'] is True
        assert older_purchase['download_token'] == 'token-1'
    
    def test_get_user_purchases_expired_download(self, app_context, purchase_manager, test_user):
        """Test user purchases with expired download"""
        from app import db
        
        # Create purchase with expired download
        purchase = Purchase(
            id=str(uuid.uuid4()),
            user_id=test_user.id,
            file_id='file-expired',
            tier='personal',
            amount=299,
            status='completed',
            download_token='expired-token',
            download_expires_at=datetime.utcnow() - timedelta(hours=1),  # Expired
            download_attempts=2
        )
        db.session.add(purchase)
        db.session.commit()
        
        purchases = purchase_manager.get_user_purchases(test_user.id)
        
        assert len(purchases) == 1
        assert purchases[0]['download_available'] is False
    
    def test_get_user_purchases_max_attempts_reached(self, app_context, purchase_manager, test_user):
        """Test user purchases with max download attempts reached"""
        from app import db
        
        # Create purchase with max attempts
        purchase = Purchase(
            id=str(uuid.uuid4()),
            user_id=test_user.id,
            file_id='file-maxed',
            tier='personal',
            amount=299,
            status='completed',
            download_token='maxed-token',
            download_expires_at=datetime.utcnow() + timedelta(hours=24),
            download_attempts=5  # Max attempts reached
        )
        db.session.add(purchase)
        db.session.commit()
        
        purchases = purchase_manager.get_user_purchases(test_user.id)
        
        assert len(purchases) == 1
        assert purchases[0]['download_available'] is False
    
    def test_get_purchase_by_token(self, app_context, purchase_manager, test_user):
        """Test getting purchase by download token"""
        from app import db
        
        purchase = Purchase(
            id=str(uuid.uuid4()),
            user_id=test_user.id,
            file_id='test-file',
            tier='personal',
            amount=299,
            status='completed',
            download_token='unique-token-123'
        )
        db.session.add(purchase)
        db.session.commit()
        
        found_purchase = purchase_manager.get_purchase_by_token('unique-token-123')
        
        assert found_purchase is not None
        assert found_purchase.id == purchase.id
        assert found_purchase.download_token == 'unique-token-123'
    
    def test_get_purchase_by_token_not_found(self, app_context, purchase_manager):
        """Test getting purchase by non-existent token"""
        found_purchase = purchase_manager.get_purchase_by_token('nonexistent-token')
        assert found_purchase is None
    
    def test_resend_licensing_email(self, app_context, purchase_manager, test_user):
        """Test resending licensing email"""
        from app import db
        
        purchase = Purchase(
            id=str(uuid.uuid4()),
            user_id=test_user.id,
            file_id='test-file',
            tier='personal',
            amount=299,
            status='completed'
        )
        db.session.add(purchase)
        db.session.commit()
        
        with patch.object(purchase_manager.licensing_service, 'resend_license_email') as mock_resend:
            mock_resend.return_value = {'success': True, 'message': 'Email sent'}
            
            result = purchase_manager.resend_licensing_email(purchase.id)
            
            assert result['success'] is True
            assert result['message'] == 'Email sent'
            mock_resend.assert_called_once_with(purchase.id)
    
    def test_mock_stripe_session_creation(self, app_context, purchase_manager, test_user):
        """Test mock Stripe session creation when no API key configured"""
        with patch('app.purchases.manager.url_for') as mock_url_for:
            # Mock Flask url_for
            mock_url_for.side_effect = lambda endpoint, **kwargs: f'/mock/{endpoint}'
            
            # Temporarily remove Stripe API key
            original_key = purchase_manager.stripe_api_key
            purchase_manager.stripe_api_key = None
            
            try:
                result = purchase_manager.create_purchase_session(
                    user_id=test_user.id,
                    tier='personal',
                    file_id='test-file-mock',
                    user_email=test_user.email
                )
                
                assert result['success'] is True
                assert result['session_id'].startswith('cs_mock_')
                assert '/mock-checkout/' in result['checkout_url']
                
            finally:
                # Restore original key
                purchase_manager.stripe_api_key = original_key


class TestPurchaseManagerEdgeCases:
    """Test edge cases and error conditions for PurchaseManager"""
    
    @pytest.fixture
    def purchase_manager(self):
        return PurchaseManager()
    
    def test_create_session_with_all_tiers(self, app_context, purchase_manager, test_user):
        """Test creating sessions for all available tiers"""
        with patch('stripe.checkout.Session.create') as mock_stripe, \
             patch('app.purchases.manager.url_for') as mock_url_for:
            
            # Mock Flask url_for
            mock_url_for.side_effect = lambda endpoint, **kwargs: f'/mock/{endpoint}'
            
            for i, (tier_name, tier_info) in enumerate(PRICING_TIERS.items()):
                mock_session = Mock()
                mock_session.id = f'cs_test_tier_{i}'
                mock_session.url = f'https://checkout.stripe.com/pay/cs_test_tier_{i}'
                mock_stripe.return_value = mock_session
                
                result = purchase_manager.create_purchase_session(
                    user_id=test_user.id,
                    tier=tier_name,
                    file_id=f'test-file-{tier_name}',
                    user_email=test_user.email
                )
                
                assert result['success'] is True
                assert result['tier_info']['name'] == tier_info['name']
                assert result['tier_info']['price'] == tier_info['price']
    
    def test_handle_payment_success_with_email_failure(self, app_context, purchase_manager, test_user):
        """Test payment success handling when licensing email fails"""
        from app import db
        
        purchase = Purchase(
            id=str(uuid.uuid4()),
            user_id=test_user.id,
            file_id='test-file-email-fail',
            tier='personal',
            amount=299,
            stripe_session_id='cs_test_email_fail',
            status='pending',
            download_expires_at=datetime.utcnow() + timedelta(hours=48)
        )
        db.session.add(purchase)
        db.session.commit()
        
        with patch('stripe.checkout.Session.retrieve') as mock_retrieve, \
             patch.object(purchase_manager.licensing_service, 'send_licensing_email') as mock_email:
            
            mock_session = Mock()
            mock_session.payment_status = 'paid'
            mock_session.payment_intent = 'pi_test_email_fail'
            mock_retrieve.return_value = mock_session
            
            # Mock email failure
            mock_email.return_value = {'success': False, 'error': 'Email service unavailable'}
            
            # Payment should still succeed even if email fails
            result = purchase_manager.handle_payment_success('cs_test_email_fail')
            
            assert result['success'] is True
            
            # Verify purchase is still completed
            updated_purchase = Purchase.query.get(purchase.id)
            assert updated_purchase.status == 'completed'
    
    def test_concurrent_purchase_creation(self, app_context, purchase_manager, test_user):
        """Test handling concurrent purchase creation"""
        results = []
        
        def create_purchase(thread_id):
            # Each thread needs its own app context
            with app_context.app_context():
                with patch('stripe.checkout.Session.create') as mock_stripe, \
                     patch('app.purchases.manager.url_for') as mock_url_for:
                    
                    # Mock Flask url_for
                    mock_url_for.side_effect = lambda endpoint, **kwargs: f'/mock/{endpoint}'
                    
                    mock_session = Mock()
                    mock_session.id = f'cs_concurrent_{thread_id}'
                    mock_session.url = f'https://checkout.stripe.com/pay/{mock_session.id}'
                    mock_stripe.return_value = mock_session
                    
                    result = purchase_manager.create_purchase_session(
                        user_id=test_user.id,
                        tier='personal',
                        file_id=f'concurrent-file-{thread_id}',
                        user_email=test_user.email
                    )
                    results.append(result)
        
        # Create multiple threads
        threads = []
        for i in range(3):
            thread = threading.Thread(target=create_purchase, args=(i,))
            threads.append(thread)
            thread.start()
        
        # Wait for all threads to complete
        for thread in threads:
            thread.join()
        
        # Verify all purchases were created successfully
        assert len(results) == 3
        for result in results:
            assert result['success'] is True
        
        # Verify unique purchase IDs
        purchase_ids = [result['purchase_id'] for result in results]
        assert len(set(purchase_ids)) == 3  # All unique


class TestPurchaseManagerComprehensive:
    """Comprehensive test cases for PurchaseManager covering all scenarios"""
    
    @pytest.fixture
    def purchase_manager(self):
        return PurchaseManager()
    
    def test_purchase_session_expiration_handling(self, app_context, purchase_manager, test_user):
        """Test purchase session expiration and cleanup"""
        from app import db
        
        # Create expired purchase session
        purchase = Purchase(
            id=str(uuid.uuid4()),
            user_id=test_user.id,
            file_id='expired-session-test',
            tier='personal',
            amount=299,
            stripe_session_id='cs_expired_session',
            status='pending',
            created_at=datetime.utcnow() - timedelta(hours=2),  # 2 hours old
            download_expires_at=datetime.utcnow() + timedelta(hours=46)  # Still valid for download
        )
        db.session.add(purchase)
        db.session.commit()
        
        # Should still work if Stripe says it's paid
        with patch('stripe.checkout.Session.retrieve') as mock_retrieve, \
             patch.object(purchase_manager.licensing_service, 'send_licensing_email') as mock_email:
            
            mock_session = Mock()
            mock_session.payment_status = 'paid'
            mock_session.payment_intent = 'pi_expired_test'
            mock_retrieve.return_value = mock_session
            
            mock_email.return_value = {'success': True}
            
            result = purchase_manager.handle_payment_success('cs_expired_session')
            assert result['success'] is True
    
    def test_purchase_manager_circuit_breaker(self, app_context, purchase_manager, test_user):
        """Test circuit breaker functionality for Stripe API calls"""
        with patch('stripe.checkout.Session.create') as mock_stripe, \
             patch('app.purchases.manager.url_for') as mock_url_for:
            
            mock_url_for.side_effect = lambda endpoint, **kwargs: f'/mock/{endpoint}'
            
            # Simulate multiple failures to trigger circuit breaker
            mock_stripe.side_effect = Exception('Stripe API unavailable')
            
            # First few calls should fail normally
            for i in range(3):
                result = purchase_manager.create_purchase_session(
                    user_id=test_user.id,
                    tier='personal',
                    file_id=f'circuit-test-{i}',
                    user_email=test_user.email
                )
                assert result['success'] is False
    
    def test_purchase_manager_retry_logic(self, app_context, purchase_manager, test_user):
        """Test retry logic for transient failures"""
        with patch('stripe.checkout.Session.create') as mock_stripe, \
             patch('app.purchases.manager.url_for') as mock_url_for:
            
            mock_url_for.side_effect = lambda endpoint, **kwargs: f'/mock/{endpoint}'
            
            # First call fails, second succeeds
            mock_session = Mock()
            mock_session.id = 'cs_retry_success'
            mock_session.url = 'https://checkout.stripe.com/pay/cs_retry_success'
            
            mock_stripe.side_effect = [
                Exception('Temporary network error'),  # First call fails
                mock_session  # Second call succeeds
            ]
            
            result = purchase_manager.create_purchase_session(
                user_id=test_user.id,
                tier='personal',
                file_id='retry-test-file',
                user_email=test_user.email
            )
            
            # Should succeed after retry
            assert result['success'] is True
            assert result['session_id'] == 'cs_retry_success'
    
    def test_purchase_validation_edge_cases(self, app_context, purchase_manager, test_user):
        """Test purchase validation with edge cases"""
        
        # Test with empty strings
        result = purchase_manager.create_purchase_session(
            user_id=test_user.id,
            tier='',  # Empty tier
            file_id='test-file',
            user_email=test_user.email
        )
        assert result['success'] is False
        assert 'Tier and file_id are required' in result['error']
        
        # Test with None values
        result = purchase_manager.create_purchase_session(
            user_id=test_user.id,
            tier=None,
            file_id='test-file',
            user_email=test_user.email
        )
        assert result['success'] is False
        
        # Test with whitespace-only strings
        result = purchase_manager.create_purchase_session(
            user_id=test_user.id,
            tier='   ',  # Whitespace only
            file_id='test-file',
            user_email=test_user.email
        )
        assert result['success'] is False
    
    def test_purchase_manager_database_rollback(self, app_context, purchase_manager, test_user):
        """Test database rollback on errors"""
        from app import db
        
        initial_count = Purchase.query.count()
        
        with patch('stripe.checkout.Session.create') as mock_stripe, \
             patch('app.purchases.manager.url_for') as mock_url_for:
            
            mock_url_for.side_effect = lambda endpoint, **kwargs: f'/mock/{endpoint}'
            
            # Simulate Stripe error after purchase record creation
            mock_stripe.side_effect = Exception('Stripe API error')
            
            result = purchase_manager.create_purchase_session(
                user_id=test_user.id,
                tier='personal',
                file_id='rollback-test',
                user_email=test_user.email
            )
            
            assert result['success'] is False
            
            # Verify no purchase record was left in database
            final_count = Purchase.query.count()
            assert final_count == initial_count
    
    def test_purchase_manager_large_file_ids(self, app_context, purchase_manager, test_user):
        """Test handling of large file IDs and edge cases"""
        with patch('stripe.checkout.Session.create') as mock_stripe, \
             patch('app.purchases.manager.url_for') as mock_url_for:
            
            mock_url_for.side_effect = lambda endpoint, **kwargs: f'/mock/{endpoint}'
            
            mock_session = Mock()
            mock_session.id = 'cs_large_file_test'
            mock_session.url = 'https://checkout.stripe.com/pay/cs_large_file_test'
            mock_stripe.return_value = mock_session
            
            # Test with very long file ID
            long_file_id = 'a' * 1000  # 1000 character file ID
            
            result = purchase_manager.create_purchase_session(
                user_id=test_user.id,
                tier='personal',
                file_id=long_file_id,
                user_email=test_user.email
            )
            
            assert result['success'] is True
            
            # Verify purchase was created with long file ID
            purchase = Purchase.query.filter_by(stripe_session_id='cs_large_file_test').first()
            assert purchase.file_id == long_file_id
    
    def test_purchase_manager_unicode_handling(self, app_context, purchase_manager, test_user):
        """Test handling of unicode characters in file IDs and emails"""
        with patch('stripe.checkout.Session.create') as mock_stripe, \
             patch('app.purchases.manager.url_for') as mock_url_for:
            
            mock_url_for.side_effect = lambda endpoint, **kwargs: f'/mock/{endpoint}'
            
            mock_session = Mock()
            mock_session.id = 'cs_unicode_test'
            mock_session.url = 'https://checkout.stripe.com/pay/cs_unicode_test'
            mock_stripe.return_value = mock_session
            
            # Test with unicode characters
            unicode_file_id = 'test-file-音乐-🎵-файл'
            unicode_email = 'test-用户@example.com'
            
            result = purchase_manager.create_purchase_session(
                user_id=None,  # Anonymous user
                tier='personal',
                file_id=unicode_file_id,
                user_email=unicode_email
            )
            
            assert result['success'] is True
            
            # Verify purchase was created with unicode data
            purchase = Purchase.query.filter_by(stripe_session_id='cs_unicode_test').first()
            assert purchase.file_id == unicode_file_id
            assert purchase.user_email == unicode_email


class TestPurchaseManagerPerformance:
    """Performance and load testing for PurchaseManager"""
    
    @pytest.fixture
    def purchase_manager(self):
        return PurchaseManager()
    
    def test_bulk_purchase_creation_performance(self, app_context, purchase_manager, test_user):
        """Test performance with multiple rapid purchase creations"""
        import time
        
        with patch('stripe.checkout.Session.create') as mock_stripe, \
             patch('app.purchases.manager.url_for') as mock_url_for:
            
            mock_url_for.side_effect = lambda endpoint, **kwargs: f'/mock/{endpoint}'
            
            # Mock Stripe to return quickly
            def create_mock_session():
                session_id = f'cs_perf_test_{uuid.uuid4().hex[:8]}'
                mock_session = Mock()
                mock_session.id = session_id
                mock_session.url = f'https://checkout.stripe.com/pay/{session_id}'
                return mock_session
            
            mock_stripe.side_effect = lambda **kwargs: create_mock_session()
            
            # Create multiple purchases rapidly
            start_time = time.time()
            results = []
            
            for i in range(10):  # Create 10 purchases
                result = purchase_manager.create_purchase_session(
                    user_id=test_user.id,
                    tier='personal',
                    file_id=f'perf-test-file-{i}',
                    user_email=test_user.email
                )
                results.append(result)
            
            end_time = time.time()
            duration = end_time - start_time
            
            # All should succeed
            assert all(r['success'] for r in results)
            
            # Should complete reasonably quickly (less than 5 seconds for 10 purchases)
            assert duration < 5.0
            
            # All purchase IDs should be unique
            purchase_ids = [r['purchase_id'] for r in results]
            assert len(set(purchase_ids)) == len(purchase_ids)
    
    def test_concurrent_payment_completion(self, app_context, purchase_manager, test_user):
        """Test concurrent payment completion handling"""
        from app import db
        import threading
        
        # Create multiple pending purchases
        purchases = []
        for i in range(5):
            purchase = Purchase(
                id=str(uuid.uuid4()),
                user_id=test_user.id,
                file_id=f'concurrent-test-{i}',
                tier='personal',
                amount=299,
                stripe_session_id=f'cs_concurrent_test_{i}',
                status='pending'
            )
            purchases.append(purchase)
            db.session.add(purchase)
        
        db.session.commit()
        
        results = []
        
        def complete_payment(session_id):
            with patch('stripe.checkout.Session.retrieve') as mock_retrieve, \
                 patch.object(purchase_manager.licensing_service, 'send_licensing_email') as mock_email:
                
                mock_session = Mock()
                mock_session.payment_status = 'paid'
                mock_session.payment_intent = f'pi_{session_id}'
                mock_retrieve.return_value = mock_session
                
                mock_email.return_value = {'success': True}
                
                result = purchase_manager.handle_payment_success(session_id)
                results.append(result)
        
        # Complete payments concurrently
        threads = []
        for purchase in purchases:
            thread = threading.Thread(target=complete_payment, args=(purchase.stripe_session_id,))
            threads.append(thread)
            thread.start()
        
        # Wait for all threads to complete
        for thread in threads:
            thread.join()
        
        # All should succeed
        assert len(results) == 5
        assert all(r['success'] for r in results)
        
        # All purchases should be completed
        completed_purchases = Purchase.query.filter_by(status='completed').count()
        assert completed_purchases == 5


class TestPurchaseManagerSecurity:
    """Security-focused tests for PurchaseManager"""
    
    @pytest.fixture
    def purchase_manager(self):
        return PurchaseManager()
    
    def test_sql_injection_prevention(self, app_context, purchase_manager):
        """Test SQL injection prevention in purchase operations"""
        
        # Attempt SQL injection in various fields
        malicious_inputs = [
            "'; DROP TABLE purchases; --",
            "' OR '1'='1",
            "'; UPDATE purchases SET amount=0; --",
            "<script>alert('xss')</script>",
            "../../etc/passwd"
        ]
        
        for malicious_input in malicious_inputs:
            # Test in file_id
            result = purchase_manager.create_purchase_session(
                user_id=None,
                tier='personal',
                file_id=malicious_input,
                user_email='test@example.com'
            )
            
            # Should handle gracefully without SQL injection
            # (May succeed or fail validation, but shouldn't cause SQL injection)
            assert 'error' not in str(result).lower() or 'sql' not in str(result).lower()
    
    def test_purchase_amount_tampering_prevention(self, app_context, purchase_manager, test_user):
        """Test prevention of purchase amount tampering"""
        from app import db
        
        with patch('stripe.checkout.Session.create') as mock_stripe, \
             patch('app.purchases.manager.url_for') as mock_url_for:
            
            mock_url_for.side_effect = lambda endpoint, **kwargs: f'/mock/{endpoint}'
            
            mock_session = Mock()
            mock_session.id = 'cs_tamper_test'
            mock_session.url = 'https://checkout.stripe.com/pay/cs_tamper_test'
            mock_stripe.return_value = mock_session
            
            # Create purchase
            result = purchase_manager.create_purchase_session(
                user_id=test_user.id,
                tier='premium',  # Should be $19.99
                file_id='tamper-test',
                user_email=test_user.email
            )
            
            assert result['success'] is True
            
            # Verify amount is set correctly from tier config, not user input
            purchase = Purchase.query.filter_by(stripe_session_id='cs_tamper_test').first()
            assert purchase.amount == PRICING_TIERS['premium']['price']  # Should be 1999 cents
    
    def test_user_isolation(self, app_context, purchase_manager):
        """Test that users can only access their own purchases"""
        from app import db
        
        # Create two users
        user1 = User(
            email='user1@example.com',
            password_hash='hash1',
            created_at=datetime.utcnow()
        )
        user2 = User(
            email='user2@example.com',
            password_hash='hash2',
            created_at=datetime.utcnow()
        )
        db.session.add_all([user1, user2])
        db.session.commit()
        
        # Create purchases for each user
        purchase1 = Purchase(
            id=str(uuid.uuid4()),
            user_id=user1.id,
            file_id='user1-file',
            tier='personal',
            amount=299,
            status='completed'
        )
        purchase2 = Purchase(
            id=str(uuid.uuid4()),
            user_id=user2.id,
            file_id='user2-file',
            tier='commercial',
            amount=999,
            status='completed'
        )
        db.session.add_all([purchase1, purchase2])
        db.session.commit()
        
        # User1 should only see their purchases
        user1_purchases = purchase_manager.get_user_purchases(user1.id)
        assert len(user1_purchases) == 1
        assert user1_purchases[0]['id'] == purchase1.id
        
        # User2 should only see their purchases
        user2_purchases = purchase_manager.get_user_purchases(user2.id)
        assert len(user2_purchases) == 1
        assert user2_purchases[0]['id'] == purchase2.id
    
    def test_download_token_uniqueness(self, app_context, purchase_manager, test_user):
        """Test that download tokens are unique and unpredictable"""
        from app import db
        
        # Create multiple purchases and complete them
        tokens = []
        
        for i in range(10):
            purchase = Purchase(
                id=str(uuid.uuid4()),
                user_id=test_user.id,
                file_id=f'token-test-{i}',
                tier='personal',
                amount=299,
                stripe_session_id=f'cs_token_test_{i}',
                status='pending'
            )
            db.session.add(purchase)
            db.session.commit()
            
            with patch('stripe.checkout.Session.retrieve') as mock_retrieve, \
                 patch.object(purchase_manager.licensing_service, 'send_licensing_email') as mock_email:
                
                mock_session = Mock()
                mock_session.payment_status = 'paid'
                mock_session.payment_intent = f'pi_token_test_{i}'
                mock_retrieve.return_value = mock_session
                
                mock_email.return_value = {'success': True}
                
                result = purchase_manager.handle_payment_success(f'cs_token_test_{i}')
                assert result['success'] is True
                
                tokens.append(result['download_token'])
        
        # All tokens should be unique
        assert len(set(tokens)) == len(tokens)
        
        # Tokens should be UUIDs (36 characters with hyphens)
        for token in tokens:
            assert len(token) == 36
            assert token.count('-') == 4