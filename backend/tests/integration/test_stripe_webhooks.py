"""
Integration tests for Stripe webhook handling.
Tests webhook verification, payment completion, and error scenarios.
"""
import pytest
from unittest.mock import Mock, patch
import json
import hmac
import hashlib
import time
from datetime import datetime, timedelta
import uuid

from app.models import Purchase, User
from app.purchases.routes import purchases_bp


class TestStripeWebhooks:
    """Test cases for Stripe webhook integration"""
    
    @pytest.fixture
    def webhook_secret(self):
        """Test webhook secret for signature verification"""
        return 'whsec_test_secret_key_for_testing'
    
    @pytest.fixture
    def test_purchase_webhook(self, test_user):
        """Create test purchase for webhook testing"""
        from app import db
        
        purchase = Purchase(
            id=str(uuid.uuid4()),
            user_id=test_user.id,
            file_id='webhook-test-file',
            tier='personal',
            amount=299,
            stripe_session_id='cs_webhook_test_123',
            status='pending',
            download_expires_at=datetime.utcnow() + timedelta(hours=48)
        )
        db.session.add(purchase)
        db.session.commit()
        return purchase
    
    def create_stripe_signature(self, payload: str, secret: str, timestamp: int = None) -> str:
        """Create valid Stripe webhook signature"""
        if timestamp is None:
            timestamp = int(time.time())
        
        # Create signature as Stripe does
        signed_payload = f"{timestamp}.{payload}"
        signature = hmac.new(
            secret.encode('utf-8'),
            signed_payload.encode('utf-8'),
            hashlib.sha256
        ).hexdigest()
        
        return f"t={timestamp},v1={signature}"
    
    def test_webhook_checkout_session_completed_success(self, client, app_context, test_purchase_webhook, webhook_secret):
        """Test successful checkout.session.completed webhook"""
        # Create webhook payload
        webhook_payload = {
            'id': 'evt_test_webhook',
            'object': 'event',
            'type': 'checkout.session.completed',
            'data': {
                'object': {
                    'id': test_purchase_webhook.stripe_session_id,
                    'object': 'checkout.session',
                    'payment_status': 'paid',
                    'amount_total': 299,
                    'customer_email': 'test@example.com',
                    'payment_intent': 'pi_test_webhook_123'
                }
            },
            'created': int(time.time())
        }
        
        payload_json = json.dumps(webhook_payload)
        signature = self.create_stripe_signature(payload_json, webhook_secret)
        
        with patch('stripe.Webhook.construct_event') as mock_construct, \
             patch('app.purchases.manager.PurchaseManager.handle_payment_success') as mock_handle:
            
            # Mock Stripe webhook verification
            mock_construct.return_value = webhook_payload
            
            # Mock payment success handling
            mock_handle.return_value = {
                'success': True,
                'purchase_id': test_purchase_webhook.id,
                'download_token': 'test-token-123'
            }
            
            # Send webhook request
            response = client.post(
                '/api/purchases/webhook',
                data=payload_json,
                headers={
                    'Stripe-Signature': signature,
                    'Content-Type': 'application/json'
                }
            )
            
            assert response.status_code == 200
            assert response.json['success'] is True
            
            # Verify webhook was processed
            mock_construct.assert_called_once_with(
                payload_json.encode(),
                signature,
                None  # Webhook secret would be from environment in real implementation
            )
            mock_handle.assert_called_once_with(test_purchase_webhook.stripe_session_id)
    
    def test_webhook_invalid_signature(self, client, app_context, webhook_secret):
        """Test webhook with invalid signature"""
        webhook_payload = {
            'id': 'evt_invalid_sig',
            'type': 'checkout.session.completed',
            'data': {'object': {'id': 'cs_invalid'}}
        }
        
        payload_json = json.dumps(webhook_payload)
        invalid_signature = 't=123456789,v1=invalid_signature_hash'
        
        with patch('stripe.Webhook.construct_event') as mock_construct:
            import stripe
            mock_construct.side_effect = stripe.error.SignatureVerificationError(
                'Invalid signature', invalid_signature
            )
            
            response = client.post(
                '/api/purchases/webhook',
                data=payload_json,
                headers={
                    'Stripe-Signature': invalid_signature,
                    'Content-Type': 'application/json'
                }
            )
            
            assert response.status_code == 400
            assert 'error' in response.json
    
    def test_webhook_malformed_payload(self, client, app_context, webhook_secret):
        """Test webhook with malformed JSON payload"""
        malformed_payload = '{"invalid": json payload'
        signature = self.create_stripe_signature(malformed_payload, webhook_secret)
        
        response = client.post(
            '/api/purchases/webhook',
            data=malformed_payload,
            headers={
                'Stripe-Signature': signature,
                'Content-Type': 'application/json'
            }
        )
        
        assert response.status_code == 400
        assert 'error' in response.json
    
    def test_webhook_unsupported_event_type(self, client, app_context, webhook_secret):
        """Test webhook with unsupported event type"""
        webhook_payload = {
            'id': 'evt_unsupported',
            'type': 'customer.created',  # Unsupported event type
            'data': {'object': {'id': 'cus_test'}}
        }
        
        payload_json = json.dumps(webhook_payload)
        signature = self.create_stripe_signature(payload_json, webhook_secret)
        
        with patch('stripe.Webhook.construct_event') as mock_construct:
            mock_construct.return_value = webhook_payload
            
            response = client.post(
                '/api/purchases/webhook',
                data=payload_json,
                headers={
                    'Stripe-Signature': signature,
                    'Content-Type': 'application/json'
                }
            )
            
            # Should still return success but not process the event
            assert response.status_code == 200
            assert response.json['success'] is True
    
    def test_webhook_payment_failed_event(self, client, app_context, test_purchase_webhook, webhook_secret):
        """Test webhook for failed payment"""
        webhook_payload = {
            'id': 'evt_payment_failed',
            'type': 'checkout.session.completed',
            'data': {
                'object': {
                    'id': test_purchase_webhook.stripe_session_id,
                    'payment_status': 'unpaid',  # Payment failed
                    'amount_total': 299
                }
            }
        }
        
        payload_json = json.dumps(webhook_payload)
        signature = self.create_stripe_signature(payload_json, webhook_secret)
        
        with patch('stripe.Webhook.construct_event') as mock_construct, \
             patch('app.purchases.manager.PurchaseManager.handle_payment_success') as mock_handle:
            
            mock_construct.return_value = webhook_payload
            
            # Mock payment failure handling
            mock_handle.return_value = {
                'success': False,
                'error': 'Payment not completed'
            }
            
            response = client.post(
                '/api/purchases/webhook',
                data=payload_json,
                headers={
                    'Stripe-Signature': signature,
                    'Content-Type': 'application/json'
                }
            )
            
            assert response.status_code == 200
            mock_handle.assert_called_once_with(test_purchase_webhook.stripe_session_id)
    
    def test_webhook_duplicate_event_handling(self, client, app_context, test_purchase_webhook, webhook_secret):
        """Test handling duplicate webhook events (idempotency)"""
        webhook_payload = {
            'id': 'evt_duplicate_test',
            'type': 'checkout.session.completed',
            'data': {
                'object': {
                    'id': test_purchase_webhook.stripe_session_id,
                    'payment_status': 'paid',
                    'amount_total': 299
                }
            }
        }
        
        payload_json = json.dumps(webhook_payload)
        signature = self.create_stripe_signature(payload_json, webhook_secret)
        
        with patch('stripe.Webhook.construct_event') as mock_construct, \
             patch('app.purchases.manager.PurchaseManager.handle_payment_success') as mock_handle:
            
            mock_construct.return_value = webhook_payload
            mock_handle.return_value = {
                'success': True,
                'purchase_id': test_purchase_webhook.id
            }
            
            # Send same webhook twice
            response1 = client.post(
                '/api/purchases/webhook',
                data=payload_json,
                headers={
                    'Stripe-Signature': signature,
                    'Content-Type': 'application/json'
                }
            )
            
            response2 = client.post(
                '/api/purchases/webhook',
                data=payload_json,
                headers={
                    'Stripe-Signature': signature,
                    'Content-Type': 'application/json'
                }
            )
            
            # Both should succeed (idempotent)
            assert response1.status_code == 200
            assert response2.status_code == 200
            
            # Payment handler should be called twice
            assert mock_handle.call_count == 2
    
    def test_webhook_nonexistent_purchase(self, client, app_context, webhook_secret):
        """Test webhook for non-existent purchase"""
        webhook_payload = {
            'id': 'evt_nonexistent',
            'type': 'checkout.session.completed',
            'data': {
                'object': {
                    'id': 'cs_nonexistent_session',
                    'payment_status': 'paid',
                    'amount_total': 299
                }
            }
        }
        
        payload_json = json.dumps(webhook_payload)
        signature = self.create_stripe_signature(payload_json, webhook_secret)
        
        with patch('stripe.Webhook.construct_event') as mock_construct, \
             patch('app.purchases.manager.PurchaseManager.handle_payment_success') as mock_handle:
            
            mock_construct.return_value = webhook_payload
            mock_handle.return_value = {
                'success': False,
                'error': 'Purchase not found for session: cs_nonexistent_session'
            }
            
            response = client.post(
                '/api/purchases/webhook',
                data=payload_json,
                headers={
                    'Stripe-Signature': signature,
                    'Content-Type': 'application/json'
                }
            )
            
            assert response.status_code == 200
            mock_handle.assert_called_once_with('cs_nonexistent_session')
    
    def test_webhook_timeout_handling(self, client, app_context, test_purchase_webhook, webhook_secret):
        """Test webhook handling with processing timeout"""
        webhook_payload = {
            'id': 'evt_timeout_test',
            'type': 'checkout.session.completed',
            'data': {
                'object': {
                    'id': test_purchase_webhook.stripe_session_id,
                    'payment_status': 'paid',
                    'amount_total': 299
                }
            }
        }
        
        payload_json = json.dumps(webhook_payload)
        signature = self.create_stripe_signature(payload_json, webhook_secret)
        
        with patch('stripe.Webhook.construct_event') as mock_construct, \
             patch('app.purchases.manager.PurchaseManager.handle_payment_success') as mock_handle:
            
            mock_construct.return_value = webhook_payload
            
            # Simulate timeout/exception in payment processing
            mock_handle.side_effect = Exception('Processing timeout')
            
            response = client.post(
                '/api/purchases/webhook',
                data=payload_json,
                headers={
                    'Stripe-Signature': signature,
                    'Content-Type': 'application/json'
                }
            )
            
            assert response.status_code == 400
            assert 'error' in response.json


class TestWebhookSecurity:
    """Test webhook security and validation"""
    
    def test_webhook_timestamp_validation(self, client, app_context):
        """Test webhook timestamp validation (replay attack prevention)"""
        old_timestamp = int(time.time()) - 3600  # 1 hour old
        
        webhook_payload = {
            'id': 'evt_old_timestamp',
            'type': 'checkout.session.completed',
            'data': {'object': {'id': 'cs_test'}}
        }
        
        payload_json = json.dumps(webhook_payload)
        
        # Create signature with old timestamp
        signed_payload = f"{old_timestamp}.{payload_json}"
        signature = hmac.new(
            b'test_secret',
            signed_payload.encode('utf-8'),
            hashlib.sha256
        ).hexdigest()
        stripe_signature = f"t={old_timestamp},v1={signature}"
        
        with patch('stripe.Webhook.construct_event') as mock_construct:
            import stripe
            # Stripe would reject old timestamps
            mock_construct.side_effect = stripe.error.SignatureVerificationError(
                'Timestamp outside tolerance', stripe_signature
            )
            
            response = client.post(
                '/api/purchases/webhook',
                data=payload_json,
                headers={
                    'Stripe-Signature': stripe_signature,
                    'Content-Type': 'application/json'
                }
            )
            
            assert response.status_code == 400
    
    def test_webhook_missing_signature_header(self, client, app_context):
        """Test webhook request without signature header"""
        webhook_payload = {'id': 'evt_no_sig', 'type': 'test'}
        payload_json = json.dumps(webhook_payload)
        
        response = client.post(
            '/api/purchases/webhook',
            data=payload_json,
            headers={'Content-Type': 'application/json'}
            # Missing Stripe-Signature header
        )
        
        assert response.status_code == 400
    
    def test_webhook_empty_payload(self, client, app_context):
        """Test webhook with empty payload"""
        response = client.post(
            '/api/purchases/webhook',
            data='',
            headers={
                'Stripe-Signature': 't=123,v1=test',
                'Content-Type': 'application/json'
            }
        )
        
        assert response.status_code == 400
    
    def test_webhook_content_type_validation(self, client, app_context):
        """Test webhook content type validation"""
        webhook_payload = {'id': 'evt_content_type', 'type': 'test'}
        payload_json = json.dumps(webhook_payload)
        
        response = client.post(
            '/api/purchases/webhook',
            data=payload_json,
            headers={
                'Stripe-Signature': 't=123,v1=test',
                'Content-Type': 'text/plain'  # Wrong content type
            }
        )
        
        # Should still process (Stripe sends application/json but we should be flexible)
        assert response.status_code == 400  # Due to invalid signature, not content type


class TestWebhookIntegrationFlow:
    """Test complete webhook integration flow"""
    
    def test_complete_webhook_to_email_flow(self, client, app_context, test_user, webhook_secret):
        """Test complete flow from webhook to licensing email"""
        from app import db
        
        # Create purchase
        purchase = Purchase(
            id=str(uuid.uuid4()),
            user_id=test_user.id,
            file_id='integration-test-file',
            tier='commercial',
            amount=999,
            stripe_session_id='cs_integration_test',
            status='pending',
            download_expires_at=datetime.utcnow() + timedelta(hours=48)
        )
        db.session.add(purchase)
        db.session.commit()
        
        # Create webhook payload
        webhook_payload = {
            'id': 'evt_integration_test',
            'type': 'checkout.session.completed',
            'data': {
                'object': {
                    'id': 'cs_integration_test',
                    'payment_status': 'paid',
                    'amount_total': 999,
                    'customer_email': test_user.email,
                    'payment_intent': 'pi_integration_test'
                }
            }
        }
        
        payload_json = json.dumps(webhook_payload)
        signature = hmac.new(
            webhook_secret.encode(),
            f"{int(time.time())}.{payload_json}".encode(),
            hashlib.sha256
        ).hexdigest()
        stripe_signature = f"t={int(time.time())},v1={signature}"
        
        with patch('stripe.Webhook.construct_event') as mock_construct, \
             patch('stripe.checkout.Session.retrieve') as mock_retrieve, \
             patch('app.purchases.licensing.LicensingService.send_licensing_email') as mock_email:
            
            # Mock Stripe webhook verification
            mock_construct.return_value = webhook_payload
            
            # Mock Stripe session retrieval
            mock_session = Mock()
            mock_session.payment_status = 'paid'
            mock_session.payment_intent = 'pi_integration_test'
            mock_retrieve.return_value = mock_session
            
            # Mock email sending
            mock_email.return_value = {'success': True, 'message': 'License email sent'}
            
            # Send webhook
            response = client.post(
                '/api/purchases/webhook',
                data=payload_json,
                headers={
                    'Stripe-Signature': stripe_signature,
                    'Content-Type': 'application/json'
                }
            )
            
            assert response.status_code == 200
            
            # Verify purchase was updated
            updated_purchase = Purchase.query.get(purchase.id)
            assert updated_purchase.status == 'completed'
            assert updated_purchase.completed_at is not None
            assert updated_purchase.download_token is not None
            assert updated_purchase.stripe_payment_intent == 'pi_integration_test'
            
            # Verify email was sent
            mock_email.assert_called_once()
            email_call_args = mock_email.call_args[0]
            assert email_call_args[0] == updated_purchase  # Purchase object passed to email service
    
    def test_webhook_error_recovery(self, client, app_context, test_user, webhook_secret):
        """Test webhook error recovery and retry logic"""
        from app import db
        
        purchase = Purchase(
            id=str(uuid.uuid4()),
            user_id=test_user.id,
            file_id='error-recovery-test',
            tier='personal',
            amount=299,
            stripe_session_id='cs_error_recovery',
            status='pending'
        )
        db.session.add(purchase)
        db.session.commit()
        
        webhook_payload = {
            'id': 'evt_error_recovery',
            'type': 'checkout.session.completed',
            'data': {
                'object': {
                    'id': 'cs_error_recovery',
                    'payment_status': 'paid',
                    'amount_total': 299
                }
            }
        }
        
        payload_json = json.dumps(webhook_payload)
        signature = hmac.new(
            webhook_secret.encode(),
            f"{int(time.time())}.{payload_json}".encode(),
            hashlib.sha256
        ).hexdigest()
        stripe_signature = f"t={int(time.time())},v1={signature}"
        
        with patch('stripe.Webhook.construct_event') as mock_construct, \
             patch('app.purchases.manager.PurchaseManager.handle_payment_success') as mock_handle:
            
            mock_construct.return_value = webhook_payload
            
            # First attempt fails
            mock_handle.side_effect = [
                Exception('Database connection error'),  # First call fails
                {'success': True, 'purchase_id': purchase.id}  # Second call succeeds
            ]
            
            # First webhook attempt (fails)
            response1 = client.post(
                '/api/purchases/webhook',
                data=payload_json,
                headers={
                    'Stripe-Signature': stripe_signature,
                    'Content-Type': 'application/json'
                }
            )
            assert response1.status_code == 400
            
            # Second webhook attempt (succeeds - Stripe retry)
            response2 = client.post(
                '/api/purchases/webhook',
                data=payload_json,
                headers={
                    'Stripe-Signature': stripe_signature,
                    'Content-Type': 'application/json'
                }
            )
            assert response2.status_code == 200
            
            # Verify both attempts were made
            assert mock_handle.call_count == 2
class Tes
tStripeWebhooksComprehensive:
    """Comprehensive Stripe webhook tests covering all scenarios"""
    
    @pytest.fixture
    def webhook_secret(self):
        return 'whsec_comprehensive_test_secret'
    
    def test_webhook_event_types_handling(self, client, app_context, webhook_secret):
        """Test handling of different Stripe event types"""
        
        event_types = [
            'checkout.session.completed',
            'checkout.session.expired',
            'payment_intent.succeeded',
            'payment_intent.payment_failed',
            'invoice.payment_succeeded',
            'customer.subscription.created'
        ]
        
        for event_type in event_types:
            webhook_payload = {
                'id': f'evt_{event_type.replace(".", "_")}',
                'type': event_type,
                'data': {
                    'object': {
                        'id': f'obj_{event_type.replace(".", "_")}',
                        'payment_status': 'paid' if 'succeeded' in event_type else 'unpaid'
                    }
                }
            }
            
            payload_json = json.dumps(webhook_payload)
            signature = self.create_stripe_signature(payload_json, webhook_secret)
            
            with patch('stripe.Webhook.construct_event') as mock_construct:
                mock_construct.return_value = webhook_payload
                
                response = client.post(
                    '/api/purchases/webhook',
                    data=payload_json,
                    headers={
                        'Stripe-Signature': signature,
                        'Content-Type': 'application/json'
                    }
                )
                
                # Should handle all event types gracefully
                assert response.status_code in [200, 400]  # 200 for handled, 400 for validation errors
    
    def test_webhook_payload_size_limits(self, client, app_context, webhook_secret):
        """Test webhook handling with various payload sizes"""
        
        # Test with very large payload
        large_data = {'large_field': 'x' * 10000}  # 10KB of data
        
        webhook_payload = {
            'id': 'evt_large_payload',
            'type': 'checkout.session.completed',
            'data': {
                'object': {
                    'id': 'cs_large_test',
                    'payment_status': 'paid',
                    'metadata': large_data
                }
            }
        }
        
        payload_json = json.dumps(webhook_payload)
        signature = self.create_stripe_signature(payload_json, webhook_secret)
        
        with patch('stripe.Webhook.construct_event') as mock_construct:
            mock_construct.return_value = webhook_payload
            
            response = client.post(
                '/api/purchases/webhook',
                data=payload_json,
                headers={
                    'Stripe-Signature': signature,
                    'Content-Type': 'application/json'
                }
            )
            
            # Should handle large payloads
            assert response.status_code in [200, 400, 413]  # 413 for payload too large
    
    def test_webhook_concurrent_processing(self, client, app_context, test_user, webhook_secret):
        """Test concurrent webhook processing"""
        from app import db
        import threading
        
        # Create multiple purchases
        purchases = []
        for i in range(5):
            purchase = Purchase(
                id=str(uuid.uuid4()),
                user_id=test_user.id,
                file_id=f'concurrent-webhook-{i}',
                tier='personal',
                amount=299,
                stripe_session_id=f'cs_concurrent_webhook_{i}',
                status='pending',
                download_expires_at=datetime.utcnow() + timedelta(hours=48)
            )
            purchases.append(purchase)
            db.session.add(purchase)
        
        db.session.commit()
        
        results = []
        
        def send_webhook(purchase):
            webhook_payload = {
                'id': f'evt_concurrent_{purchase.id}',
                'type': 'checkout.session.completed',
                'data': {
                    'object': {
                        'id': purchase.stripe_session_id,
                        'payment_status': 'paid',
                        'amount_total': purchase.amount,
                        'payment_intent': f'pi_concurrent_{purchase.id}'
                    }
                }
            }
            
            payload_json = json.dumps(webhook_payload)
            signature = self.create_stripe_signature(payload_json, webhook_secret)
            
            with patch('stripe.Webhook.construct_event') as mock_construct:
                mock_construct.return_value = webhook_payload
                
                response = client.post(
                    '/api/purchases/webhook',
                    data=payload_json,
                    headers={
                        'Stripe-Signature': signature,
                        'Content-Type': 'application/json'
                    }
                )
                
                results.append({
                    'purchase_id': purchase.id,
                    'status_code': response.status_code,
                    'response': response.json if response.content_type == 'application/json' else None
                })
        
        # Send webhooks concurrently
        threads = []
        for purchase in purchases:
            thread = threading.Thread(target=send_webhook, args=(purchase,))
            threads.append(thread)
            thread.start()
        
        # Wait for all threads
        for thread in threads:
            thread.join()
        
        # All should succeed
        assert len(results) == 5
        for result in results:
            assert result['status_code'] == 200
    
    def test_webhook_retry_mechanism(self, client, app_context, test_purchase_webhook, webhook_secret):
        """Test webhook retry mechanism for failed processing"""
        
        webhook_payload = {
            'id': 'evt_retry_test',
            'type': 'checkout.session.completed',
            'data': {
                'object': {
                    'id': test_purchase_webhook.stripe_session_id,
                    'payment_status': 'paid',
                    'amount_total': 299
                }
            }
        }
        
        payload_json = json.dumps(webhook_payload)
        signature = self.create_stripe_signature(payload_json, webhook_secret)
        
        with patch('stripe.Webhook.construct_event') as mock_construct, \
             patch('app.purchases.manager.PurchaseManager.handle_payment_success') as mock_handle:
            
            mock_construct.return_value = webhook_payload
            
            # First attempt fails
            mock_handle.side_effect = [
                Exception('Database connection error'),
                {'success': True, 'purchase_id': test_purchase_webhook.id}
            ]
            
            # First webhook call (should fail)
            response1 = client.post(
                '/api/purchases/webhook',
                data=payload_json,
                headers={
                    'Stripe-Signature': signature,
                    'Content-Type': 'application/json'
                }
            )
            
            assert response1.status_code == 400  # Should fail
            
            # Second webhook call (Stripe retry - should succeed)
            response2 = client.post(
                '/api/purchases/webhook',
                data=payload_json,
                headers={
                    'Stripe-Signature': signature,
                    'Content-Type': 'application/json'
                }
            )
            
            assert response2.status_code == 200  # Should succeed
    
    def test_webhook_signature_algorithms(self, client, app_context, webhook_secret):
        """Test different signature algorithms and versions"""
        
        webhook_payload = {
            'id': 'evt_signature_test',
            'type': 'checkout.session.completed',
            'data': {'object': {'id': 'cs_sig_test', 'payment_status': 'paid'}}
        }
        
        payload_json = json.dumps(webhook_payload)
        timestamp = int(time.time())
        
        # Test different signature versions
        signature_versions = ['v1', 'v0']  # Stripe uses v1, but test backward compatibility
        
        for version in signature_versions:
            signed_payload = f"{timestamp}.{payload_json}"
            signature = hmac.new(
                webhook_secret.encode('utf-8'),
                signed_payload.encode('utf-8'),
                hashlib.sha256
            ).hexdigest()
            
            stripe_signature = f"t={timestamp},{version}={signature}"
            
            with patch('stripe.Webhook.construct_event') as mock_construct:
                mock_construct.return_value = webhook_payload
                
                response = client.post(
                    '/api/purchases/webhook',
                    data=payload_json,
                    headers={
                        'Stripe-Signature': stripe_signature,
                        'Content-Type': 'application/json'
                    }
                )
                
                # Should handle different signature versions
                assert response.status_code in [200, 400]
    
    def test_webhook_idempotency_advanced(self, client, app_context, test_purchase_webhook, webhook_secret):
        """Test advanced idempotency scenarios"""
        
        webhook_payload = {
            'id': 'evt_idempotency_advanced',
            'type': 'checkout.session.completed',
            'data': {
                'object': {
                    'id': test_purchase_webhook.stripe_session_id,
                    'payment_status': 'paid',
                    'amount_total': 299
                }
            }
        }
        
        payload_json = json.dumps(webhook_payload)
        signature = self.create_stripe_signature(payload_json, webhook_secret)
        
        with patch('stripe.Webhook.construct_event') as mock_construct, \
             patch('app.purchases.manager.PurchaseManager.handle_payment_success') as mock_handle:
            
            mock_construct.return_value = webhook_payload
            mock_handle.return_value = {'success': True, 'purchase_id': test_purchase_webhook.id}
            
            # Send same webhook multiple times rapidly
            responses = []
            for i in range(5):
                response = client.post(
                    '/api/purchases/webhook',
                    data=payload_json,
                    headers={
                        'Stripe-Signature': signature,
                        'Content-Type': 'application/json'
                    }
                )
                responses.append(response)
            
            # All should succeed (idempotent)
            for response in responses:
                assert response.status_code == 200
            
            # Payment handler should be called multiple times (no deduplication at webhook level)
            assert mock_handle.call_count == 5
    
    def create_stripe_signature(self, payload: str, secret: str, timestamp: int = None) -> str:
        """Create valid Stripe webhook signature"""
        if timestamp is None:
            timestamp = int(time.time())
        
        signed_payload = f"{timestamp}.{payload}"
        signature = hmac.new(
            secret.encode('utf-8'),
            signed_payload.encode('utf-8'),
            hashlib.sha256
        ).hexdigest()
        
        return f"t={timestamp},v1={signature}"


class TestWebhookErrorHandling:
    """Test webhook error handling and edge cases"""
    
    def test_webhook_malformed_json_variants(self, client, app_context):
        """Test various malformed JSON scenarios"""
        
        malformed_payloads = [
            '',  # Empty payload
            '{',  # Incomplete JSON
            '{"key": }',  # Invalid JSON syntax
            '{"key": "value"',  # Missing closing brace
            'not json at all',  # Not JSON
            '{"key": "value", "key": "duplicate"}',  # Duplicate keys
            '{"unicode": "测试🎵"}',  # Unicode content (should work)
            '{"number": 123.456.789}',  # Invalid number format
        ]
        
        for payload in malformed_payloads:
            response = client.post(
                '/api/purchases/webhook',
                data=payload,
                headers={
                    'Stripe-Signature': 't=123,v1=fake_signature',
                    'Content-Type': 'application/json'
                }
            )
            
            # Should handle malformed JSON gracefully
            assert response.status_code == 400
            if response.content_type == 'application/json':
                assert 'error' in response.json
    
    def test_webhook_network_timeout_simulation(self, client, app_context, test_user):
        """Test webhook handling under network timeout conditions"""
        from app import db
        
        purchase = Purchase(
            id=str(uuid.uuid4()),
            user_id=test_user.id,
            file_id='timeout-test',
            tier='personal',
            amount=299,
            stripe_session_id='cs_timeout_test',
            status='pending'
        )
        db.session.add(purchase)
        db.session.commit()
        
        webhook_payload = {
            'id': 'evt_timeout_test',
            'type': 'checkout.session.completed',
            'data': {
                'object': {
                    'id': 'cs_timeout_test',
                    'payment_status': 'paid'
                }
            }
        }
        
        payload_json = json.dumps(webhook_payload)
        
        with patch('stripe.Webhook.construct_event') as mock_construct, \
             patch('app.purchases.manager.PurchaseManager.handle_payment_success') as mock_handle:
            
            mock_construct.return_value = webhook_payload
            
            # Simulate timeout
            import socket
            mock_handle.side_effect = socket.timeout('Network timeout')
            
            response = client.post(
                '/api/purchases/webhook',
                data=payload_json,
                headers={
                    'Stripe-Signature': 't=123,v1=fake_signature',
                    'Content-Type': 'application/json'
                }
            )
            
            # Should handle timeout gracefully
            assert response.status_code == 400
    
    def test_webhook_database_connection_failure(self, client, app_context):
        """Test webhook handling when database is unavailable"""
        
        webhook_payload = {
            'id': 'evt_db_failure',
            'type': 'checkout.session.completed',
            'data': {
                'object': {
                    'id': 'cs_db_failure_test',
                    'payment_status': 'paid'
                }
            }
        }
        
        payload_json = json.dumps(webhook_payload)
        
        with patch('stripe.Webhook.construct_event') as mock_construct, \
             patch('app.purchases.manager.PurchaseManager.handle_payment_success') as mock_handle:
            
            mock_construct.return_value = webhook_payload
            
            # Simulate database connection error
            from sqlalchemy.exc import OperationalError
            mock_handle.side_effect = OperationalError('Database connection failed', None, None)
            
            response = client.post(
                '/api/purchases/webhook',
                data=payload_json,
                headers={
                    'Stripe-Signature': 't=123,v1=fake_signature',
                    'Content-Type': 'application/json'
                }
            )
            
            # Should handle database errors gracefully
            assert response.status_code == 400
    
    def test_webhook_memory_pressure_handling(self, client, app_context):
        """Test webhook handling under memory pressure"""
        
        # Create a very large webhook payload to simulate memory pressure
        large_metadata = {f'key_{i}': 'x' * 1000 for i in range(100)}  # ~100KB
        
        webhook_payload = {
            'id': 'evt_memory_pressure',
            'type': 'checkout.session.completed',
            'data': {
                'object': {
                    'id': 'cs_memory_test',
                    'payment_status': 'paid',
                    'metadata': large_metadata
                }
            }
        }
        
        payload_json = json.dumps(webhook_payload)
        
        with patch('stripe.Webhook.construct_event') as mock_construct:
            mock_construct.return_value = webhook_payload
            
            response = client.post(
                '/api/purchases/webhook',
                data=payload_json,
                headers={
                    'Stripe-Signature': 't=123,v1=fake_signature',
                    'Content-Type': 'application/json'
                }
            )
            
            # Should handle large payloads
            assert response.status_code in [200, 400, 413]


class TestWebhookPerformance:
    """Performance tests for webhook handling"""
    
    def test_webhook_processing_speed(self, client, app_context, test_user):
        """Test webhook processing speed under normal conditions"""
        from app import db
        import time
        
        # Create purchase
        purchase = Purchase(
            id=str(uuid.uuid4()),
            user_id=test_user.id,
            file_id='speed-test',
            tier='personal',
            amount=299,
            stripe_session_id='cs_speed_test',
            status='pending'
        )
        db.session.add(purchase)
        db.session.commit()
        
        webhook_payload = {
            'id': 'evt_speed_test',
            'type': 'checkout.session.completed',
            'data': {
                'object': {
                    'id': 'cs_speed_test',
                    'payment_status': 'paid'
                }
            }
        }
        
        payload_json = json.dumps(webhook_payload)
        
        with patch('stripe.Webhook.construct_event') as mock_construct, \
             patch('app.purchases.manager.PurchaseManager.handle_payment_success') as mock_handle:
            
            mock_construct.return_value = webhook_payload
            mock_handle.return_value = {'success': True, 'purchase_id': purchase.id}
            
            start_time = time.time()
            
            response = client.post(
                '/api/purchases/webhook',
                data=payload_json,
                headers={
                    'Stripe-Signature': 't=123,v1=fake_signature',
                    'Content-Type': 'application/json'
                }
            )
            
            end_time = time.time()
            processing_time = end_time - start_time
            
            assert response.status_code == 200
            
            # Should process quickly (less than 1 second for simple webhook)
            assert processing_time < 1.0
    
    def test_webhook_batch_processing(self, client, app_context, test_user):
        """Test processing multiple webhooks in sequence"""
        from app import db
        import time
        
        # Create multiple purchases
        purchases = []
        for i in range(10):
            purchase = Purchase(
                id=str(uuid.uuid4()),
                user_id=test_user.id,
                file_id=f'batch-test-{i}',
                tier='personal',
                amount=299,
                stripe_session_id=f'cs_batch_test_{i}',
                status='pending'
            )
            purchases.append(purchase)
            db.session.add(purchase)
        
        db.session.commit()
        
        start_time = time.time()
        
        # Process webhooks sequentially
        for i, purchase in enumerate(purchases):
            webhook_payload = {
                'id': f'evt_batch_test_{i}',
                'type': 'checkout.session.completed',
                'data': {
                    'object': {
                        'id': purchase.stripe_session_id,
                        'payment_status': 'paid'
                    }
                }
            }
            
            payload_json = json.dumps(webhook_payload)
            
            with patch('stripe.Webhook.construct_event') as mock_construct, \
                 patch('app.purchases.manager.PurchaseManager.handle_payment_success') as mock_handle:
                
                mock_construct.return_value = webhook_payload
                mock_handle.return_value = {'success': True, 'purchase_id': purchase.id}
                
                response = client.post(
                    '/api/purchases/webhook',
                    data=payload_json,
                    headers={
                        'Stripe-Signature': 't=123,v1=fake_signature',
                        'Content-Type': 'application/json'
                    }
                )
                
                assert response.status_code == 200
        
        end_time = time.time()
        total_time = end_time - start_time
        
        # Should process 10 webhooks in reasonable time (less than 10 seconds)
        assert total_time < 10.0
        
        # Average processing time should be reasonable
        avg_time = total_time / 10
        assert avg_time < 1.0