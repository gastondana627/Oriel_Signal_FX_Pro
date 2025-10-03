"""
End-to-end tests for complete purchase flow.
Tests the entire purchase journey from session creation to download.
"""
import pytest
from unittest.mock import Mock, patch, MagicMock
from datetime import datetime, timedelta
import uuid
import json
import time

from app.models import Purchase, User, FreeDownloadUsage
from app.purchases.manager import PurchaseManager
from app.purchases.licensing import LicensingService
from app.downloads.manager import DownloadManager


class TestCompletePurchaseFlow:
    """Test complete end-to-end purchase flow"""
    
    @pytest.fixture
    def purchase_manager(self):
        return PurchaseManager()
    
    @pytest.fixture
    def licensing_service(self):
        return LicensingService()
    
    @pytest.fixture
    def download_manager(self):
        return DownloadManager(secret_key='e2e-test-secret')
    
    def test_complete_registered_user_purchase_flow(self, client, app_context, test_user, 
                                                   purchase_manager, licensing_service, download_manager):
        """Test complete purchase flow for registered user"""
        from app import db
        
        # Step 1: Get pricing tiers
        response = client.get('/api/purchases/tiers')
        assert response.status_code == 200
        tiers = response.json['tiers']
        assert 'personal' in tiers
        assert 'commercial' in tiers
        assert 'premium' in tiers
        
        # Step 2: Create purchase session
        with patch('stripe.checkout.Session.create') as mock_stripe:
            mock_session = Mock()
            mock_session.id = 'cs_e2e_test_123'
            mock_session.url = 'https://checkout.stripe.com/pay/cs_e2e_test_123'
            mock_stripe.return_value = mock_session
            
            # Mock JWT authentication
            with patch('flask_jwt_extended.get_jwt_identity', return_value=test_user.id):
                response = client.post('/api/purchases/create-session', json={
                    'tier': 'commercial',
                    'file_id': 'e2e-test-file-123'
                })
            
            assert response.status_code == 200
            session_data = response.json
            assert session_data['success'] is True
            assert session_data['session_id'] == 'cs_e2e_test_123'
            
            purchase_id = session_data['purchase_id']
        
        # Step 3: Verify purchase record created
        purchase = Purchase.query.get(purchase_id)
        assert purchase is not None
        assert purchase.user_id == test_user.id
        assert purchase.tier == 'commercial'
        assert purchase.status == 'pending'
        
        # Step 4: Simulate successful payment (webhook)
        with patch('stripe.checkout.Session.retrieve') as mock_retrieve, \
             patch.object(licensing_service, 'send_licensing_email') as mock_email:
            
            mock_session = Mock()
            mock_session.payment_status = 'paid'
            mock_session.payment_intent = 'pi_e2e_test_123'
            mock_retrieve.return_value = mock_session
            
            mock_email.return_value = {'success': True, 'message': 'License email sent'}
            
            # Verify payment
            response = client.post('/api/purchases/verify-payment', json={
                'session_id': 'cs_e2e_test_123'
            })
            
            assert response.status_code == 200
            payment_data = response.json
            assert payment_data['success'] is True
            assert 'download_token' in payment_data
            
            download_token = payment_data['download_token']
        
        # Step 5: Verify purchase completed
        updated_purchase = Purchase.query.get(purchase_id)
        assert updated_purchase.status == 'completed'
        assert updated_purchase.completed_at is not None
        assert updated_purchase.download_token == download_token
        assert updated_purchase.stripe_payment_intent == 'pi_e2e_test_123'
        
        # Step 6: Verify licensing email was sent
        mock_email.assert_called_once_with(updated_purchase)
        
        # Step 7: Test download access
        validation_result = download_manager.validate_download_access(download_token)
        assert validation_result['valid'] is True
        assert validation_result['purchase_id'] == purchase_id
        
        # Step 8: Test purchase history
        with patch('flask_jwt_extended.get_jwt_identity', return_value=test_user.id):
            response = client.get('/api/purchases/history')
        
        assert response.status_code == 200
        history_data = response.json
        assert history_data['success'] is True
        assert len(history_data['purchases']) == 1
        
        purchase_history = history_data['purchases'][0]
        assert purchase_history['id'] == purchase_id
        assert purchase_history['tier'] == 'commercial'
        assert purchase_history['status'] == 'completed'
        assert purchase_history['download_available'] is True
        assert purchase_history['download_token'] == download_token
    
    def test_complete_anonymous_user_purchase_flow(self, client, app_context, 
                                                  purchase_manager, licensing_service):
        """Test complete purchase flow for anonymous user"""
        # Step 1: Create purchase session for anonymous user
        with patch('stripe.checkout.Session.create') as mock_stripe:
            mock_session = Mock()
            mock_session.id = 'cs_anonymous_test_123'
            mock_session.url = 'https://checkout.stripe.com/pay/cs_anonymous_test_123'
            mock_stripe.return_value = mock_session
            
            response = client.post('/api/purchases/create-session', json={
                'tier': 'personal',
                'file_id': 'anonymous-test-file',
                'email': 'anonymous@example.com'
            })
            
            assert response.status_code == 200
            session_data = response.json
            assert session_data['success'] is True
            
            purchase_id = session_data['purchase_id']
        
        # Step 2: Verify anonymous purchase record
        purchase = Purchase.query.get(purchase_id)
        assert purchase is not None
        assert purchase.user_id is None  # Anonymous
        assert purchase.user_email == 'anonymous@example.com'
        assert purchase.tier == 'personal'
        
        # Step 3: Complete payment
        with patch('stripe.checkout.Session.retrieve') as mock_retrieve, \
             patch.object(licensing_service, 'send_licensing_email') as mock_email:
            
            mock_session = Mock()
            mock_session.payment_status = 'paid'
            mock_session.payment_intent = 'pi_anonymous_test'
            mock_retrieve.return_value = mock_session
            
            mock_email.return_value = {'success': True}
            
            response = client.post('/api/purchases/verify-payment', json={
                'session_id': 'cs_anonymous_test_123'
            })
            
            assert response.status_code == 200
            assert response.json['success'] is True
        
        # Step 4: Verify email sent to anonymous email
        mock_email.assert_called_once()
        email_call_purchase = mock_email.call_args[0][0]
        assert email_call_purchase.user_email == 'anonymous@example.com'
    
    def test_purchase_flow_with_free_tier_integration(self, client, app_context, test_user):
        """Test purchase flow integration with free tier system"""
        from app import db
        from app.downloads.free_tier import FreeTierManager
        
        free_tier_manager = FreeTierManager()
        
        # Step 1: Use some free downloads first
        for i in range(3):
            result = free_tier_manager.consume_free_download(user_id=test_user.id)
            assert result['success'] is True
        
        # Step 2: Try to use another free download (should prompt for purchase)
        result = free_tier_manager.consume_free_download(user_id=test_user.id)
        assert result['success'] is True  # Still has 2 more (registered users get 5)
        
        # Use remaining free downloads
        for i in range(2):
            result = free_tier_manager.consume_free_download(user_id=test_user.id)
            assert result['success'] is True
        
        # Now should be out of free downloads
        result = free_tier_manager.consume_free_download(user_id=test_user.id)
        assert result['success'] is False
        assert result['error_code'] == 'NO_FREE_DOWNLOADS'
        assert result['upgrade_required'] is True
        
        # Step 3: Create purchase after free tier exhausted
        with patch('stripe.checkout.Session.create') as mock_stripe, \
             patch('flask_jwt_extended.get_jwt_identity', return_value=test_user.id):
            
            mock_session = Mock()
            mock_session.id = 'cs_post_free_tier'
            mock_session.url = 'https://checkout.stripe.com/pay/cs_post_free_tier'
            mock_stripe.return_value = mock_session
            
            response = client.post('/api/purchases/create-session', json={
                'tier': 'commercial',
                'file_id': 'post-free-tier-file'
            })
            
            assert response.status_code == 200
            assert response.json['success'] is True
    
    def test_purchase_flow_error_scenarios(self, client, app_context, test_user):
        """Test purchase flow error handling scenarios"""
        
        # Test 1: Invalid tier
        with patch('flask_jwt_extended.get_jwt_identity', return_value=test_user.id):
            response = client.post('/api/purchases/create-session', json={
                'tier': 'invalid_tier',
                'file_id': 'error-test-file'
            })
            
            assert response.status_code == 400
            assert response.json['success'] is False
            assert 'Invalid pricing tier' in response.json['error']
        
        # Test 2: Missing required fields
        response = client.post('/api/purchases/create-session', json={
            'tier': 'personal'
            # Missing file_id
        })
        
        assert response.status_code == 400
        assert 'Missing required fields' in response.json['error']
        
        # Test 3: Anonymous user without email
        response = client.post('/api/purchases/create-session', json={
            'tier': 'personal',
            'file_id': 'no-email-test'
            # Missing email for anonymous user
        })
        
        assert response.status_code == 400
        assert 'Email required for anonymous purchases' in response.json['error']
        
        # Test 4: Payment verification for non-existent session
        response = client.post('/api/purchases/verify-payment', json={
            'session_id': 'cs_nonexistent_session'
        })
        
        assert response.status_code == 400
        assert response.json['success'] is False
    
    def test_purchase_flow_with_stripe_errors(self, client, app_context, test_user):
        """Test purchase flow with Stripe API errors"""
        
        # Test Stripe session creation failure
        with patch('stripe.checkout.Session.create') as mock_stripe, \
             patch('flask_jwt_extended.get_jwt_identity', return_value=test_user.id):
            
            import stripe
            mock_stripe.side_effect = stripe.error.StripeError('Stripe API unavailable')
            
            response = client.post('/api/purchases/create-session', json={
                'tier': 'personal',
                'file_id': 'stripe-error-test'
            })
            
            assert response.status_code == 500
            assert response.json['success'] is False
            assert 'Stripe API unavailable' in response.json['error']
    
    def test_purchase_flow_concurrent_requests(self, client, app_context, test_user):
        """Test purchase flow with concurrent requests"""
        import threading
        import time
        
        results = []
        
        def create_concurrent_purchase(thread_id):
            with patch('stripe.checkout.Session.create') as mock_stripe, \
                 patch('flask_jwt_extended.get_jwt_identity', return_value=test_user.id):
                
                mock_session = Mock()
                mock_session.id = f'cs_concurrent_{thread_id}'
                mock_session.url = f'https://checkout.stripe.com/pay/cs_concurrent_{thread_id}'
                mock_stripe.return_value = mock_session
                
                response = client.post('/api/purchases/create-session', json={
                    'tier': 'personal',
                    'file_id': f'concurrent-file-{thread_id}'
                })
                
                results.append({
                    'thread_id': thread_id,
                    'status_code': response.status_code,
                    'success': response.json.get('success', False),
                    'purchase_id': response.json.get('purchase_id')
                })
        
        # Create multiple concurrent requests
        threads = []
        for i in range(5):
            thread = threading.Thread(target=create_concurrent_purchase, args=(i,))
            threads.append(thread)
            thread.start()
        
        # Wait for all threads to complete
        for thread in threads:
            thread.join()
        
        # Verify all requests succeeded
        assert len(results) == 5
        for result in results:
            assert result['status_code'] == 200
            assert result['success'] is True
            assert result['purchase_id'] is not None
        
        # Verify all purchase IDs are unique
        purchase_ids = [result['purchase_id'] for result in results]
        assert len(set(purchase_ids)) == 5


class TestPurchaseFlowIntegrationPoints:
    """Test integration points in purchase flow"""
    
    def test_purchase_to_download_integration(self, app_context, test_user):
        """Test integration between purchase system and download system"""
        from app import db
        
        purchase_manager = PurchaseManager()
        download_manager = DownloadManager(secret_key='integration-test-key')
        
        # Create and complete purchase
        with patch('stripe.checkout.Session.create') as mock_create, \
             patch('stripe.checkout.Session.retrieve') as mock_retrieve:
            
            # Mock Stripe session creation
            mock_session = Mock()
            mock_session.id = 'cs_integration_test'
            mock_session.url = 'https://checkout.stripe.com/pay/cs_integration_test'
            mock_create.return_value = mock_session
            
            # Create purchase session
            session_result = purchase_manager.create_purchase_session(
                user_id=test_user.id,
                tier='premium',
                file_id='integration-test-file',
                user_email=test_user.email
            )
            
            assert session_result['success'] is True
            purchase_id = session_result['purchase_id']
            
            # Mock payment completion
            mock_retrieve_session = Mock()
            mock_retrieve_session.payment_status = 'paid'
            mock_retrieve_session.payment_intent = 'pi_integration_test'
            mock_retrieve.return_value = mock_retrieve_session
            
            # Complete payment
            with patch.object(purchase_manager.licensing_service, 'send_licensing_email') as mock_email:
                mock_email.return_value = {'success': True}
                
                payment_result = purchase_manager.handle_payment_success('cs_integration_test')
                assert payment_result['success'] is True
                download_token = payment_result['download_token']
        
        # Test download system integration
        validation_result = download_manager.validate_download_access(download_token)
        assert validation_result['valid'] is True
        assert validation_result['purchase_id'] == purchase_id
        
        # Test download tracking
        track_result = download_manager.track_download_attempt(
            purchase_id=purchase_id,
            success=True,
            user_agent='Integration Test Browser',
            ip_address='127.0.0.1'
        )
        assert track_result is True
        
        # Verify purchase record updated
        purchase = Purchase.query.get(purchase_id)
        assert purchase.download_attempts == 1
    
    def test_purchase_to_email_integration(self, app_context, test_user):
        """Test integration between purchase system and email system"""
        from app import db
        
        purchase_manager = PurchaseManager()
        
        # Create completed purchase
        purchase = Purchase(
            id=str(uuid.uuid4()),
            user_id=test_user.id,
            file_id='email-integration-test',
            tier='commercial',
            amount=999,
            stripe_session_id='cs_email_integration',
            status='completed',
            download_token='email-test-token',
            download_expires_at=datetime.utcnow() + timedelta(hours=48),
            completed_at=datetime.utcnow()
        )
        db.session.add(purchase)
        db.session.commit()
        
        # Test licensing email integration
        with patch.object(purchase_manager.licensing_service, 'send_licensing_email') as mock_email:
            mock_email.return_value = {'success': True, 'message': 'Email sent successfully'}
            
            # Test resend functionality
            resend_result = purchase_manager.resend_licensing_email(purchase.id)
            
            assert resend_result['success'] is True
            assert resend_result['message'] == 'Email sent successfully'
            mock_email.assert_called_once_with(purchase.id)
    
    def test_purchase_history_integration(self, app_context, test_user):
        """Test purchase history integration with all systems"""
        from app import db
        
        purchase_manager = PurchaseManager()
        
        # Create multiple purchases with different states
        purchases_data = [
            {
                'tier': 'personal',
                'amount': 299,
                'status': 'completed',
                'download_token': 'history-token-1',
                'download_attempts': 1,
                'expires_at': datetime.utcnow() + timedelta(hours=24)
            },
            {
                'tier': 'commercial',
                'amount': 999,
                'status': 'completed',
                'download_token': 'history-token-2',
                'download_attempts': 5,  # Max attempts
                'expires_at': datetime.utcnow() + timedelta(hours=48)
            },
            {
                'tier': 'premium',
                'amount': 1999,
                'status': 'completed',
                'download_token': 'history-token-3',
                'download_attempts': 0,
                'expires_at': datetime.utcnow() - timedelta(hours=1)  # Expired
            },
            {
                'tier': 'personal',
                'amount': 299,
                'status': 'pending',
                'download_token': None,
                'download_attempts': 0,
                'expires_at': None
            }
        ]
        
        created_purchases = []
        for i, purchase_data in enumerate(purchases_data):
            purchase = Purchase(
                id=str(uuid.uuid4()),
                user_id=test_user.id,
                file_id=f'history-test-file-{i}',
                tier=purchase_data['tier'],
                amount=purchase_data['amount'],
                status=purchase_data['status'],
                download_token=purchase_data['download_token'],
                download_attempts=purchase_data['download_attempts'],
                download_expires_at=purchase_data['expires_at'],
                created_at=datetime.utcnow() - timedelta(hours=i),
                completed_at=datetime.utcnow() - timedelta(hours=i) if purchase_data['status'] == 'completed' else None
            )
            created_purchases.append(purchase)
            db.session.add(purchase)
        
        db.session.commit()
        
        # Get purchase history
        history = purchase_manager.get_user_purchases(test_user.id)
        
        assert len(history) == 4
        
        # Verify download availability logic
        # Purchase 0: Available (completed, not expired, attempts < 5)
        assert history[3]['download_available'] is True  # Most recent first
        assert history[3]['download_token'] == 'history-token-1'
        
        # Purchase 1: Not available (max attempts reached)
        assert history[2]['download_available'] is False
        
        # Purchase 2: Not available (expired)
        assert history[1]['download_available'] is False
        
        # Purchase 3: Not available (pending)
        assert history[0]['download_available'] is False
    
    def test_error_recovery_integration(self, app_context, test_user):
        """Test error recovery across integrated systems"""
        from app import db
        
        purchase_manager = PurchaseManager()
        
        # Test scenario: Payment succeeds but email fails
        with patch('stripe.checkout.Session.create') as mock_create, \
             patch('stripe.checkout.Session.retrieve') as mock_retrieve:
            
            # Create purchase session
            mock_session = Mock()
            mock_session.id = 'cs_error_recovery'
            mock_session.url = 'https://checkout.stripe.com/pay/cs_error_recovery'
            mock_create.return_value = mock_session
            
            session_result = purchase_manager.create_purchase_session(
                user_id=test_user.id,
                tier='personal',
                file_id='error-recovery-test',
                user_email=test_user.email
            )
            
            purchase_id = session_result['purchase_id']
            
            # Mock successful payment but failed email
            mock_retrieve_session = Mock()
            mock_retrieve_session.payment_status = 'paid'
            mock_retrieve_session.payment_intent = 'pi_error_recovery'
            mock_retrieve.return_value = mock_retrieve_session
            
            with patch.object(purchase_manager.licensing_service, 'send_licensing_email') as mock_email:
                mock_email.return_value = {'success': False, 'error': 'Email service unavailable'}
                
                # Payment should still succeed
                payment_result = purchase_manager.handle_payment_success('cs_error_recovery')
                assert payment_result['success'] is True
                
                # Purchase should be completed despite email failure
                purchase = Purchase.query.get(purchase_id)
                assert purchase.status == 'completed'
                assert purchase.download_token is not None
                
                # Email should have been attempted
                mock_email.assert_called_once()
        
        # Test recovery: Resend email later
        with patch.object(purchase_manager.licensing_service, 'resend_license_email') as mock_resend:
            mock_resend.return_value = {'success': True, 'message': 'Email sent on retry'}
            
            resend_result = purchase_manager.resend_licensing_email(purchase_id)
            assert resend_result['success'] is True
            mock_resend.assert_called_once_with(purchase_id)class
 TestPurchaseFlowComprehensive:
    """Comprehensive end-to-end purchase flow tests"""
    
    def test_complete_purchase_flow_with_all_tiers(self, client, app_context, test_user):
        """Test complete purchase flow for all pricing tiers"""
        from app import db
        from app.purchases.config import PRICING_TIERS
        
        purchase_manager = PurchaseManager()
        licensing_service = LicensingService()
        
        for tier_name, tier_info in PRICING_TIERS.items():
            with patch('stripe.checkout.Session.create') as mock_create, \
                 patch('stripe.checkout.Session.retrieve') as mock_retrieve, \
                 patch.object(licensing_service, 'send_licensing_email') as mock_email:
                
                # Mock Stripe session creation
                session_id = f'cs_tier_test_{tier_name}'
                mock_session = Mock()
                mock_session.id = session_id
                mock_session.url = f'https://checkout.stripe.com/pay/{session_id}'
                mock_create.return_value = mock_session
                
                # Create purchase session
                result = purchase_manager.create_purchase_session(
                    user_id=test_user.id,
                    tier=tier_name,
                    file_id=f'tier-test-{tier_name}',
                    user_email=test_user.email
                )
                
                assert result['success'] is True
                assert result['tier_info']['name'] == tier_info['name']
                assert result['tier_info']['price'] == tier_info['price']
                
                purchase_id = result['purchase_id']
                
                # Mock payment completion
                mock_retrieve_session = Mock()
                mock_retrieve_session.payment_status = 'paid'
                mock_retrieve_session.payment_intent = f'pi_tier_test_{tier_name}'
                mock_retrieve.return_value = mock_retrieve_session
                
                mock_email.return_value = {'success': True}
                
                # Complete payment
                payment_result = purchase_manager.handle_payment_success(session_id)
                assert payment_result['success'] is True
                assert payment_result['tier'] == tier_name
                assert payment_result['amount'] == tier_info['price']
                
                # Verify purchase record
                purchase = Purchase.query.get(purchase_id)
                assert purchase.status == 'completed'
                assert purchase.tier == tier_name
                assert purchase.amount == tier_info['price']
                
                # Verify licensing email was sent
                mock_email.assert_called_once()
    
    def test_purchase_flow_with_network_interruptions(self, client, app_context, test_user):
        """Test purchase flow resilience to network interruptions"""
        from app import db
        import socket
        
        purchase_manager = PurchaseManager()
        
        # Test network failure during session creation
        with patch('stripe.checkout.Session.create') as mock_stripe:
            # Simulate network timeout
            mock_stripe.side_effect = socket.timeout('Network timeout')
            
            result = purchase_manager.create_purchase_session(
                user_id=test_user.id,
                tier='personal',
                file_id='network-test-1',
                user_email=test_user.email
            )
            
            assert result['success'] is False
            assert 'timeout' in result['error'].lower() or 'network' in result['error'].lower()
        
        # Test network failure during payment verification
        purchase = Purchase(
            id=str(uuid.uuid4()),
            user_id=test_user.id,
            file_id='network-test-2',
            tier='personal',
            amount=299,
            stripe_session_id='cs_network_test',
            status='pending'
        )
        db.session.add(purchase)
        db.session.commit()
        
        with patch('stripe.checkout.Session.retrieve') as mock_retrieve:
            mock_retrieve.side_effect = socket.timeout('Network timeout')
            
            result = purchase_manager.handle_payment_success('cs_network_test')
            assert result['success'] is False
    
    def test_purchase_flow_with_database_failures(self, client, app_context, test_user):
        """Test purchase flow handling of database failures"""
        from app import db
        from sqlalchemy.exc import OperationalError
        
        purchase_manager = PurchaseManager()
        
        # Test database failure during purchase creation
        with patch('stripe.checkout.Session.create') as mock_stripe, \
             patch('app.purchases.manager.url_for') as mock_url_for, \
             patch.object(db.session, 'add') as mock_add:
            
            mock_url_for.side_effect = lambda endpoint, **kwargs: f'/mock/{endpoint}'
            
            mock_session = Mock()
            mock_session.id = 'cs_db_failure_test'
            mock_session.url = 'https://checkout.stripe.com/pay/cs_db_failure_test'
            mock_stripe.return_value = mock_session
            
            # Simulate database error
            mock_add.side_effect = OperationalError('Database connection lost', None, None)
            
            result = purchase_manager.create_purchase_session(
                user_id=test_user.id,
                tier='personal',
                file_id='db-failure-test',
                user_email=test_user.email
            )
            
            assert result['success'] is False
            assert 'database' in result['error'].lower() or 'connection' in result['error'].lower()
    
    def test_purchase_flow_with_email_service_failures(self, client, app_context, test_user):
        """Test purchase flow when email service fails"""
        from app import db
        
        purchase_manager = PurchaseManager()
        
        # Create purchase
        purchase = Purchase(
            id=str(uuid.uuid4()),
            user_id=test_user.id,
            file_id='email-failure-test',
            tier='commercial',
            amount=999,
            stripe_session_id='cs_email_failure',
            status='pending'
        )
        db.session.add(purchase)
        db.session.commit()
        
        with patch('stripe.checkout.Session.retrieve') as mock_retrieve, \
             patch.object(purchase_manager.licensing_service, 'send_licensing_email') as mock_email:
            
            # Mock successful payment
            mock_session = Mock()
            mock_session.payment_status = 'paid'
            mock_session.payment_intent = 'pi_email_failure'
            mock_retrieve.return_value = mock_session
            
            # Mock email failure
            mock_email.return_value = {'success': False, 'error': 'Email service unavailable'}
            
            # Payment should still succeed even if email fails
            result = purchase_manager.handle_payment_success('cs_email_failure')
            assert result['success'] is True
            
            # Purchase should be completed
            updated_purchase = Purchase.query.get(purchase.id)
            assert updated_purchase.status == 'completed'
            assert updated_purchase.download_token is not None
            
            # Email failure should be logged but not prevent purchase completion
            mock_email.assert_called_once()
    
    def test_purchase_flow_data_consistency(self, client, app_context, test_user):
        """Test data consistency throughout purchase flow"""
        from app import db
        
        purchase_manager = PurchaseManager()
        
        with patch('stripe.checkout.Session.create') as mock_create, \
             patch('stripe.checkout.Session.retrieve') as mock_retrieve, \
             patch.object(purchase_manager.licensing_service, 'send_licensing_email') as mock_email:
            
            # Create purchase session
            mock_session = Mock()
            mock_session.id = 'cs_consistency_test'
            mock_session.url = 'https://checkout.stripe.com/pay/cs_consistency_test'
            mock_create.return_value = mock_session
            
            result = purchase_manager.create_purchase_session(
                user_id=test_user.id,
                tier='premium',
                file_id='consistency-test-file',
                user_email=test_user.email
            )
            
            purchase_id = result['purchase_id']
            
            # Verify initial state
            purchase = Purchase.query.get(purchase_id)
            assert purchase.status == 'pending'
            assert purchase.tier == 'premium'
            assert purchase.amount == 1999  # Premium tier price
            assert purchase.user_id == test_user.id
            assert purchase.file_id == 'consistency-test-file'
            assert purchase.download_token is None
            assert purchase.completed_at is None
            
            # Complete payment
            mock_retrieve_session = Mock()
            mock_retrieve_session.payment_status = 'paid'
            mock_retrieve_session.payment_intent = 'pi_consistency_test'
            mock_retrieve.return_value = mock_retrieve_session
            
            mock_email.return_value = {'success': True}
            
            payment_result = purchase_manager.handle_payment_success('cs_consistency_test')
            
            # Verify final state
            updated_purchase = Purchase.query.get(purchase_id)
            assert updated_purchase.status == 'completed'
            assert updated_purchase.tier == 'premium'  # Unchanged
            assert updated_purchase.amount == 1999  # Unchanged
            assert updated_purchase.user_id == test_user.id  # Unchanged
            assert updated_purchase.file_id == 'consistency-test-file'  # Unchanged
            assert updated_purchase.download_token is not None  # Now set
            assert updated_purchase.completed_at is not None  # Now set
            assert updated_purchase.stripe_payment_intent == 'pi_consistency_test'
    
    def test_purchase_flow_rollback_scenarios(self, client, app_context, test_user):
        """Test proper rollback in various failure scenarios"""
        from app import db
        
        purchase_manager = PurchaseManager()
        initial_purchase_count = Purchase.query.count()
        
        # Scenario 1: Stripe session creation fails after purchase record creation
        with patch('stripe.checkout.Session.create') as mock_stripe, \
             patch('app.purchases.manager.url_for') as mock_url_for:
            
            mock_url_for.side_effect = lambda endpoint, **kwargs: f'/mock/{endpoint}'
            mock_stripe.side_effect = Exception('Stripe API error')
            
            result = purchase_manager.create_purchase_session(
                user_id=test_user.id,
                tier='personal',
                file_id='rollback-test-1',
                user_email=test_user.email
            )
            
            assert result['success'] is False
            
            # No purchase record should be left in database
            final_purchase_count = Purchase.query.count()
            assert final_purchase_count == initial_purchase_count
        
        # Scenario 2: Database commit fails
        with patch('stripe.checkout.Session.create') as mock_stripe, \
             patch('app.purchases.manager.url_for') as mock_url_for, \
             patch.object(db.session, 'commit') as mock_commit:
            
            mock_url_for.side_effect = lambda endpoint, **kwargs: f'/mock/{endpoint}'
            
            mock_session = Mock()
            mock_session.id = 'cs_rollback_test'
            mock_session.url = 'https://checkout.stripe.com/pay/cs_rollback_test'
            mock_stripe.return_value = mock_session
            
            # Simulate commit failure
            mock_commit.side_effect = Exception('Database commit failed')
            
            result = purchase_manager.create_purchase_session(
                user_id=test_user.id,
                tier='personal',
                file_id='rollback-test-2',
                user_email=test_user.email
            )
            
            assert result['success'] is False
            
            # Database should be rolled back
            final_purchase_count = Purchase.query.count()
            assert final_purchase_count == initial_purchase_count


class TestPurchaseFlowPerformance:
    """Performance tests for purchase flow"""
    
    def test_purchase_flow_performance_under_load(self, client, app_context, test_user):
        """Test purchase flow performance under simulated load"""
        import time
        import threading
        
        purchase_manager = PurchaseManager()
        results = []
        
        def create_purchase(thread_id):
            start_time = time.time()
            
            with patch('stripe.checkout.Session.create') as mock_stripe, \
                 patch('app.purchases.manager.url_for') as mock_url_for:
                
                mock_url_for.side_effect = lambda endpoint, **kwargs: f'/mock/{endpoint}'
                
                mock_session = Mock()
                mock_session.id = f'cs_load_test_{thread_id}'
                mock_session.url = f'https://checkout.stripe.com/pay/cs_load_test_{thread_id}'
                mock_stripe.return_value = mock_session
                
                result = purchase_manager.create_purchase_session(
                    user_id=test_user.id,
                    tier='personal',
                    file_id=f'load-test-{thread_id}',
                    user_email=test_user.email
                )
                
                end_time = time.time()
                
                results.append({
                    'thread_id': thread_id,
                    'success': result['success'],
                    'duration': end_time - start_time,
                    'purchase_id': result.get('purchase_id')
                })
        
        # Create multiple concurrent purchases
        threads = []
        for i in range(20):  # 20 concurrent purchases
            thread = threading.Thread(target=create_purchase, args=(i,))
            threads.append(thread)
            thread.start()
        
        # Wait for all threads
        for thread in threads:
            thread.join()
        
        # Analyze results
        assert len(results) == 20
        
        # All should succeed
        successful_results = [r for r in results if r['success']]
        assert len(successful_results) == 20
        
        # Performance should be reasonable
        durations = [r['duration'] for r in results]
        avg_duration = sum(durations) / len(durations)
        max_duration = max(durations)
        
        # Average should be under 1 second
        assert avg_duration < 1.0, f"Average duration too high: {avg_duration}"
        
        # No single request should take more than 5 seconds
        assert max_duration < 5.0, f"Max duration too high: {max_duration}"
        
        # All purchase IDs should be unique
        purchase_ids = [r['purchase_id'] for r in successful_results]
        assert len(set(purchase_ids)) == len(purchase_ids)
    
    def test_purchase_completion_performance(self, client, app_context, test_user):
        """Test performance of purchase completion process"""
        from app import db
        import time
        
        purchase_manager = PurchaseManager()
        
        # Create multiple pending purchases
        purchases = []
        for i in range(10):
            purchase = Purchase(
                id=str(uuid.uuid4()),
                user_id=test_user.id,
                file_id=f'perf-test-{i}',
                tier='personal',
                amount=299,
                stripe_session_id=f'cs_perf_test_{i}',
                status='pending'
            )
            purchases.append(purchase)
            db.session.add(purchase)
        
        db.session.commit()
        
        # Complete purchases and measure performance
        completion_times = []
        
        for purchase in purchases:
            with patch('stripe.checkout.Session.retrieve') as mock_retrieve, \
                 patch.object(purchase_manager.licensing_service, 'send_licensing_email') as mock_email:
                
                mock_session = Mock()
                mock_session.payment_status = 'paid'
                mock_session.payment_intent = f'pi_perf_test_{purchase.id}'
                mock_retrieve.return_value = mock_session
                
                mock_email.return_value = {'success': True}
                
                start_time = time.time()
                result = purchase_manager.handle_payment_success(purchase.stripe_session_id)
                end_time = time.time()
                
                assert result['success'] is True
                completion_times.append(end_time - start_time)
        
        # Analyze performance
        avg_completion_time = sum(completion_times) / len(completion_times)
        max_completion_time = max(completion_times)
        
        # Should complete quickly
        assert avg_completion_time < 0.5, f"Average completion time too high: {avg_completion_time}"
        assert max_completion_time < 2.0, f"Max completion time too high: {max_completion_time}"


class TestPurchaseFlowSecurity:
    """Security tests for purchase flow"""
    
    def test_purchase_flow_authorization(self, client, app_context):
        """Test authorization controls in purchase flow"""
        from app import db
        
        # Create two users
        user1 = User(email='user1@example.com', password_hash='hash1', created_at=datetime.utcnow())
        user2 = User(email='user2@example.com', password_hash='hash2', created_at=datetime.utcnow())
        db.session.add_all([user1, user2])
        db.session.commit()
        
        purchase_manager = PurchaseManager()
        
        # User1 creates purchase
        with patch('stripe.checkout.Session.create') as mock_stripe, \
             patch('app.purchases.manager.url_for') as mock_url_for:
            
            mock_url_for.side_effect = lambda endpoint, **kwargs: f'/mock/{endpoint}'
            
            mock_session = Mock()
            mock_session.id = 'cs_auth_test'
            mock_session.url = 'https://checkout.stripe.com/pay/cs_auth_test'
            mock_stripe.return_value = mock_session
            
            result = purchase_manager.create_purchase_session(
                user_id=user1.id,
                tier='personal',
                file_id='auth-test-file',
                user_email=user1.email
            )
            
            purchase_id = result['purchase_id']
        
        # User1 should see their purchase
        user1_purchases = purchase_manager.get_user_purchases(user1.id)
        assert len(user1_purchases) == 1
        assert user1_purchases[0]['id'] == purchase_id
        
        # User2 should not see user1's purchase
        user2_purchases = purchase_manager.get_user_purchases(user2.id)
        assert len(user2_purchases) == 0
    
    def test_purchase_flow_input_validation(self, client, app_context, test_user):
        """Test input validation in purchase flow"""
        
        purchase_manager = PurchaseManager()
        
        # Test invalid inputs
        invalid_inputs = [
            # Invalid tier
            {'user_id': test_user.id, 'tier': 'invalid', 'file_id': 'test', 'user_email': test_user.email},
            # Missing tier
            {'user_id': test_user.id, 'tier': None, 'file_id': 'test', 'user_email': test_user.email},
            # Missing file_id
            {'user_id': test_user.id, 'tier': 'personal', 'file_id': None, 'user_email': test_user.email},
            # Anonymous user without email
            {'user_id': None, 'tier': 'personal', 'file_id': 'test', 'user_email': None},
            # SQL injection attempts
            {'user_id': test_user.id, 'tier': "'; DROP TABLE purchases; --", 'file_id': 'test', 'user_email': test_user.email},
            {'user_id': test_user.id, 'tier': 'personal', 'file_id': "'; DROP TABLE purchases; --", 'user_email': test_user.email},
        ]
        
        for invalid_input in invalid_inputs:
            result = purchase_manager.create_purchase_session(**invalid_input)
            assert result['success'] is False
            assert 'error' in result
    
    def test_purchase_flow_rate_limiting_simulation(self, client, app_context, test_user):
        """Test purchase flow under rapid requests (rate limiting simulation)"""
        import time
        
        purchase_manager = PurchaseManager()
        
        # Simulate rapid purchase attempts
        results = []
        start_time = time.time()
        
        for i in range(50):  # 50 rapid requests
            with patch('stripe.checkout.Session.create') as mock_stripe, \
                 patch('app.purchases.manager.url_for') as mock_url_for:
                
                mock_url_for.side_effect = lambda endpoint, **kwargs: f'/mock/{endpoint}'
                
                mock_session = Mock()
                mock_session.id = f'cs_rate_test_{i}'
                mock_session.url = f'https://checkout.stripe.com/pay/cs_rate_test_{i}'
                mock_stripe.return_value = mock_session
                
                result = purchase_manager.create_purchase_session(
                    user_id=test_user.id,
                    tier='personal',
                    file_id=f'rate-test-{i}',
                    user_email=test_user.email
                )
                
                results.append(result)
        
        end_time = time.time()
        total_time = end_time - start_time
        
        # All should succeed (no rate limiting implemented yet)
        successful_results = [r for r in results if r['success']]
        assert len(successful_results) == 50
        
        # Should handle rapid requests efficiently
        requests_per_second = len(results) / total_time
        assert requests_per_second > 10, f"Request rate too low: {requests_per_second} req/s"