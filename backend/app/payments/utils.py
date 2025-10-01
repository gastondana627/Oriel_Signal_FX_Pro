"""
Payment utility functions for validation and error handling
"""
import stripe
from flask import current_app
from app.models import Payment, User


def validate_payment_amount(amount):
    """
    Validate payment amount
    
    Args:
        amount: Amount in cents
        
    Returns:
        tuple: (is_valid, error_message)
    """
    if not isinstance(amount, int):
        return False, "Amount must be an integer"
    
    if amount <= 0:
        return False, "Amount must be greater than 0"
    
    # Minimum charge amount for Stripe (50 cents)
    if amount < 50:
        return False, "Amount must be at least 50 cents"
    
    # Maximum reasonable amount (prevent abuse)
    if amount > 10000:  # $100
        return False, "Amount exceeds maximum allowed ($100)"
    
    return True, None


def validate_stripe_configuration():
    """
    Validate that Stripe is properly configured
    
    Returns:
        tuple: (is_valid, error_message)
    """
    required_keys = ['STRIPE_SECRET_KEY', 'STRIPE_PUBLISHABLE_KEY']
    
    for key in required_keys:
        if not current_app.config.get(key):
            return False, f"Missing configuration: {key}"
    
    # Test Stripe API key
    try:
        stripe.api_key = current_app.config['STRIPE_SECRET_KEY']
        # Make a simple API call to validate the key
        stripe.Account.retrieve()
        return True, None
    except stripe.error.AuthenticationError:
        return False, "Invalid Stripe API key"
    except Exception as e:
        return False, f"Stripe configuration error: {str(e)}"


def get_payment_by_session_id(session_id, user_id=None):
    """
    Get payment record by Stripe session ID with optional user validation
    
    Args:
        session_id: Stripe checkout session ID
        user_id: Optional user ID for authorization check
        
    Returns:
        Payment object or None
    """
    query = Payment.query.filter_by(stripe_session_id=session_id)
    
    if user_id:
        query = query.filter_by(user_id=user_id)
    
    return query.first()


def is_payment_completed(payment):
    """
    Check if a payment is completed and valid for rendering
    
    Args:
        payment: Payment object
        
    Returns:
        bool: True if payment is completed and valid
    """
    if not payment:
        return False
    
    return payment.status == 'completed'


def get_stripe_session_details(session_id):
    """
    Retrieve Stripe session details with error handling
    
    Args:
        session_id: Stripe checkout session ID
        
    Returns:
        tuple: (session_object, error_message)
    """
    try:
        stripe.api_key = current_app.config['STRIPE_SECRET_KEY']
        session = stripe.checkout.Session.retrieve(session_id)
        return session, None
    except stripe.error.InvalidRequestError:
        return None, "Invalid session ID"
    except stripe.error.AuthenticationError:
        return None, "Stripe authentication failed"
    except stripe.error.StripeError as e:
        return None, f"Stripe error: {str(e)}"
    except Exception as e:
        return None, f"Unexpected error: {str(e)}"


def handle_stripe_error(error):
    """
    Convert Stripe errors to standardized API error responses
    
    Args:
        error: Stripe error object
        
    Returns:
        tuple: (error_dict, http_status_code)
    """
    if isinstance(error, stripe.error.CardError):
        return {
            'error': {
                'code': 'CARD_ERROR',
                'message': 'Your card was declined',
                'details': error.user_message
            }
        }, 402
    
    elif isinstance(error, stripe.error.RateLimitError):
        return {
            'error': {
                'code': 'RATE_LIMIT_ERROR',
                'message': 'Too many requests made to the API too quickly'
            }
        }, 429
    
    elif isinstance(error, stripe.error.InvalidRequestError):
        return {
            'error': {
                'code': 'INVALID_REQUEST_ERROR',
                'message': 'Invalid parameters were supplied to Stripe API'
            }
        }, 400
    
    elif isinstance(error, stripe.error.AuthenticationError):
        return {
            'error': {
                'code': 'AUTHENTICATION_ERROR',
                'message': 'Authentication with Stripe API failed'
            }
        }, 401
    
    elif isinstance(error, stripe.error.APIConnectionError):
        return {
            'error': {
                'code': 'API_CONNECTION_ERROR',
                'message': 'Network communication with Stripe failed'
            }
        }, 503
    
    elif isinstance(error, stripe.error.StripeError):
        return {
            'error': {
                'code': 'STRIPE_ERROR',
                'message': 'An error occurred with our payment processor'
            }
        }, 500
    
    else:
        return {
            'error': {
                'code': 'UNKNOWN_ERROR',
                'message': 'An unexpected error occurred'
            }
        }, 500


def validate_webhook_signature(payload, sig_header, webhook_secret):
    """
    Validate Stripe webhook signature
    
    Args:
        payload: Raw request payload
        sig_header: Stripe-Signature header
        webhook_secret: Webhook endpoint secret
        
    Returns:
        tuple: (event_object, error_message)
    """
    try:
        event = stripe.Webhook.construct_event(
            payload, sig_header, webhook_secret
        )
        return event, None
    except ValueError:
        return None, "Invalid payload"
    except stripe.error.SignatureVerificationError:
        return None, "Invalid signature"
    except Exception as e:
        return None, f"Webhook validation error: {str(e)}"