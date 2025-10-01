"""
Payment utility functions for validation and error handling
"""
import stripe
import re
from flask import current_app
from app.models import Payment, User
from app import db


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


def calculate_payment_amount(product_type, quantity=1):
    """
    Calculate payment amount based on product type and quantity.
    
    Args:
        product_type: Type of product ('basic_video', 'premium_video')
        quantity: Number of items
        
    Returns:
        int: Amount in cents
    """
    prices = {
        'basic_video': 999,    # $9.99
        'premium_video': 1999  # $19.99
    }
    
    if product_type not in prices:
        raise ValueError(f"Invalid product type: {product_type}")
    
    base_amount = prices[product_type] * quantity
    
    # Apply bulk discount for 5+ items
    if quantity >= 5:
        base_amount = int(base_amount * 0.9)  # 10% discount
    
    return base_amount


def validate_payment_data(data):
    """
    Validate payment request data.
    
    Args:
        data: Dictionary containing payment data
        
    Returns:
        bool: True if valid
        
    Raises:
        ValueError: If validation fails
    """
    required_fields = ['product_type', 'quantity', 'user_email', 'success_url', 'cancel_url']
    
    for field in required_fields:
        if field not in data:
            raise ValueError(f"Missing required field: {field}")
    
    # Validate email format
    email_pattern = r'^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$'
    if not re.match(email_pattern, data['user_email']):
        raise ValueError("Invalid email format")
    
    # Validate URLs
    url_pattern = r'^https?://.+'
    if not re.match(url_pattern, data['success_url']):
        raise ValueError("Invalid URL format for success_url")
    if not re.match(url_pattern, data['cancel_url']):
        raise ValueError("Invalid URL format for cancel_url")
    
    # Validate quantity
    if not isinstance(data['quantity'], int) or data['quantity'] < 1:
        raise ValueError("Quantity must be a positive integer")
    
    return True


def create_stripe_session(payment_data):
    """
    Create a Stripe checkout session.
    
    Args:
        payment_data: Dictionary containing payment information
        
    Returns:
        dict: Session information
    """
    stripe.api_key = current_app.config['STRIPE_SECRET_KEY']
    
    amount = calculate_payment_amount(payment_data['product_type'], payment_data['quantity'])
    
    session = stripe.checkout.Session.create(
        payment_method_types=['card'],
        line_items=[{
            'price_data': {
                'currency': 'usd',
                'product_data': {
                    'name': f"{payment_data['product_type'].replace('_', ' ').title()} Rendering",
                },
                'unit_amount': calculate_payment_amount(payment_data['product_type']),
            },
            'quantity': payment_data['quantity'],
        }],
        mode='payment',
        success_url=payment_data['success_url'],
        cancel_url=payment_data['cancel_url'],
        customer_email=payment_data['user_email'],
    )
    
    return {
        'id': session.id,
        'url': session.url
    }


def verify_stripe_webhook(payload, signature, webhook_secret):
    """
    Verify and construct Stripe webhook event.
    
    Args:
        payload: Raw request payload
        signature: Stripe signature header
        webhook_secret: Webhook secret
        
    Returns:
        dict: Webhook event data
    """
    return stripe.Webhook.construct_event(payload, signature, webhook_secret)


def process_payment_completion(webhook_event):
    """
    Process payment completion webhook.
    
    Args:
        webhook_event: Stripe webhook event
        
    Returns:
        bool: True if processed successfully
    """
    if webhook_event['type'] != 'checkout.session.completed':
        return False
    
    session = webhook_event['data']['object']
    session_id = session['id']
    
    # Find the payment record
    payment = Payment.query.filter_by(stripe_session_id=session_id).first()
    if not payment:
        return False
    
    # Update payment status
    if payment.status != 'completed':
        payment.status = 'completed'
        db.session.commit()
    
    return True