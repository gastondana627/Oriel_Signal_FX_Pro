"""
Unit tests for payment processing functionality.
"""
import pytest
from unittest.mock import Mock, patch
from datetime import datetime

from app.models import Payment, User
from app.payments.utils import (
    create_stripe_session,
    verify_stripe_webhook,
    process_payment_completion,
    calculate_payment_amount,
    validate_payment_data
)


class TestPaymentCalculation:
    """Test payment amount calculation."""
    
    def test_basic_video_price(self):
        """Test basic video rendering price calculation."""
        amount = calculate_payment_amount('basic_video')
        assert amount == 999  # $9.99 in cents
    
    def test_premium_video_price(self):
        """Test premium video rendering price calculation."""
        amount = calculate_payment_amount('premium_video')
        assert amount == 1999  # $19.99 in cents
    
    def test_invalid_product_type(self):
        """Test invalid product type raises error."""
        with pytest.raises(ValueError):
            calculate_payment_amount('invalid_product')
    
    def test_bulk_discount(self):
        """Test bulk discount calculation."""
        # 5 videos should get 10% discount
        amount = calculate_payment_amount('basic_video', quantity=5)
        expected = int(999 * 5 * 0.9)  # 10% discount
        assert amount == expected


class TestPaymentValidation:
    """Test payment data validation."""
    
    def test_valid_payment_data(self):
        """Test validation of valid payment data."""
        valid_data = {
            'product_type': 'basic_video',
            'quantity': 1,
            'user_email': 'test@example.com',
            'success_url': 'https://example.com/success',
            'cancel_url': 'https://example.com/cancel'
        }
        
        result = validate_payment_data(valid_data)
        assert result is True
    
    def test_missing_required_fields(self):
        """Test validation fails with missing required fields."""
        invalid_data = {
            'product_type': 'basic_video',
            # Missing other required fields
        }
        
        with pytest.raises(ValueError) as exc_info:
            validate_payment_data(invalid_data)
        
        assert 'Missing required field' in str(exc_info.value)
    
    def test_invalid_email_format(self):
        """Test validation fails with invalid email."""
        invalid_data = {
            'product_type': 'basic_video',
            'quantity': 1,
            'user_email': 'invalid-email',
            'success_url': 'https://example.com/success',
            'cancel_url': 'https://example.com/cancel'
        }
        
        with pytest.raises(ValueError) as exc_info:
            validate_payment_data(invalid_data)
        
        assert 'Invalid email format' in str(exc_info.value)
    
    def test_invalid_urls(self):
        """Test validation fails with invalid URLs."""
        invalid_data = {
            'product_type': 'basic_video',
            'quantity': 1,
            'user_email': 'test@example.com',
            'success_url': 'not-a-url',
            'cancel_url': 'https://example.com/cancel'
        }
        
        with pytest.raises(ValueError) as exc_info:
            validate_payment_data(invalid_data)
        
        assert 'Invalid URL format' in str(exc_info.value)


class TestStripeIntegration:
    """Test Stripe integration functions."""
    
    @patch('stripe.checkout.Session.create')
    def test_create_stripe_session_success(self, mock_create):
        """Test successful Stripe session creation."""
        # Mock Stripe response
        mock_session = Mock()
        mock_session.id = 'cs_test_123456789'
        mock_session.url = 'https://checkout.stripe.com/pay/cs_test_123456789'
        mock_create.return_value = mock_session
        
        payment_data = {
            'product_type': 'basic_video',
            'quantity': 1,
            'user_email': 'test@example.com',
            'success_url': 'https://example.com/success',
            'cancel_url': 'https://example.com/cancel'
        }
        
        session = create_stripe_session(payment_data)
        
        assert session['id'] == 'cs_test_123456789'
        assert session['url'] == 'https://checkout.stripe.com/pay/cs_test_123456789'
        
        # Verify Stripe was called with correct parameters
        mock_create.assert_called_once()
        call_args = mock_create.call_args[1]
        assert call_args['mode'] == 'payment'
        assert call_args['customer_email'] == 'test@example.com'
    
    @patch('stripe.checkout.Session.create')
    def test_create_stripe_session_failure(self, mock_create):
        """Test Stripe session creation failure."""
        # Mock Stripe error
        import stripe
        mock_create.side_effect = stripe.error.StripeError('Payment failed')
        
        payment_data = {
            'product_type': 'basic_video',
            'quantity': 1,
            'user_email': 'test@example.com',
            'success_url': 'https://example.com/success',
            'cancel_url': 'https://example.com/cancel'
        }
        
        with pytest.raises(stripe.error.StripeError):
            create_stripe_session(payment_data)
    
    @patch('stripe.Webhook.construct_event')
    def test_verify_stripe_webhook_success(self, mock_construct):
        """Test successful webhook verification."""
        # Mock webhook event
        mock_event = {
            'type': 'checkout.session.completed',
            'data': {
                'object': {
                    'id': 'cs_test_123456789',
                    'payment_status': 'paid',
                    'amount_total': 999,
                    'customer_email': 'test@example.com'
                }
            }
        }
        mock_construct.return_value = mock_event
        
        payload = '{"test": "data"}'
        signature = 'test_signature'
        webhook_secret = 'whsec_test_secret'
        
        event = verify_stripe_webhook(payload, signature, webhook_secret)
        
        assert event['type'] == 'checkout.session.completed'
        assert event['data']['object']['id'] == 'cs_test_123456789'
        
        mock_construct.assert_called_once_with(payload, signature, webhook_secret)
    
    @patch('stripe.Webhook.construct_event')
    def test_verify_stripe_webhook_invalid_signature(self, mock_construct):
        """Test webhook verification with invalid signature."""
        import stripe
        mock_construct.side_effect = stripe.error.SignatureVerificationError(
            'Invalid signature', 'test_signature'
        )
        
        payload = '{"test": "data"}'
        signature = 'invalid_signature'
        webhook_secret = 'whsec_test_secret'
        
        with pytest.raises(stripe.error.SignatureVerificationError):
            verify_stripe_webhook(payload, signature, webhook_secret)


class TestPaymentProcessing:
    """Test payment processing logic."""
    
    def test_process_payment_completion_success(self, app_context, test_user):
        """Test successful payment completion processing."""
        from app import db
        
        # Create pending payment
        payment = Payment(
            user_id=test_user.id,
            stripe_session_id='cs_test_123456789',
            amount=999,
            status='pending',
            created_at=datetime.utcnow()
        )
        db.session.add(payment)
        db.session.commit()
        
        # Mock webhook event
        webhook_event = {
            'type': 'checkout.session.completed',
            'data': {
                'object': {
                    'id': 'cs_test_123456789',
                    'payment_status': 'paid',
                    'amount_total': 999,
                    'customer_email': test_user.email
                }
            }
        }
        
        result = process_payment_completion(webhook_event)
        
        assert result is True
        
        # Verify payment status updated
        updated_payment = Payment.query.filter_by(
            stripe_session_id='cs_test_123456789'
        ).first()
        assert updated_payment.status == 'completed'
    
    def test_process_payment_completion_not_found(self, app_context):
        """Test payment completion for non-existent payment."""
        webhook_event = {
            'type': 'checkout.session.completed',
            'data': {
                'object': {
                    'id': 'cs_nonexistent_session',
                    'payment_status': 'paid',
                    'amount_total': 999,
                    'customer_email': 'test@example.com'
                }
            }
        }
        
        result = process_payment_completion(webhook_event)
        assert result is False
    
    def test_process_payment_completion_already_processed(self, app_context, test_user):
        """Test payment completion for already completed payment."""
        from app import db
        
        # Create already completed payment
        payment = Payment(
            user_id=test_user.id,
            stripe_session_id='cs_test_123456789',
            amount=999,
            status='completed',
            created_at=datetime.utcnow()
        )
        db.session.add(payment)
        db.session.commit()
        
        webhook_event = {
            'type': 'checkout.session.completed',
            'data': {
                'object': {
                    'id': 'cs_test_123456789',
                    'payment_status': 'paid',
                    'amount_total': 999,
                    'customer_email': test_user.email
                }
            }
        }
        
        result = process_payment_completion(webhook_event)
        assert result is True  # Should handle gracefully


class TestPaymentModel:
    """Test Payment model functionality."""
    
    def test_payment_creation(self, app_context, test_user):
        """Test payment model creation."""
        from app import db
        
        payment = Payment(
            user_id=test_user.id,
            stripe_session_id='cs_test_new_payment',
            amount=1999,
            status='pending'
        )
        
        db.session.add(payment)
        db.session.commit()
        
        assert payment.id is not None
        assert payment.user_id == test_user.id
        assert payment.amount == 1999
        assert payment.status == 'pending'
        assert payment.created_at is not None
    
    def test_payment_user_relationship(self, app_context, test_payment, test_user):
        """Test payment-user relationship."""
        assert test_payment.user.id == test_user.id
        assert test_payment.user.email == test_user.email
    
    def test_payment_string_representation(self, app_context, test_payment):
        """Test payment string representation."""
        expected = f'<Payment {test_payment.stripe_session_id}: ${test_payment.amount/100:.2f}>'
        assert str(test_payment) == expected
    
    def test_payment_amount_in_dollars(self, app_context, test_payment):
        """Test payment amount conversion to dollars."""
        # test_payment has amount=999 (cents)
        assert test_payment.amount_in_dollars == 9.99
    
    def test_payment_is_completed(self, app_context, test_payment):
        """Test payment completion status check."""
        # test_payment has status='completed'
        assert test_payment.is_completed is True
        
        # Test with pending payment
        from app import db
        pending_payment = Payment(
            user_id=test_payment.user_id,
            stripe_session_id='cs_pending',
            amount=999,
            status='pending'
        )
        db.session.add(pending_payment)
        db.session.commit()
        
        assert pending_payment.is_completed is False