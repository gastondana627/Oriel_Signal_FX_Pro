import stripe
from flask import request, jsonify, current_app
from flask_jwt_extended import jwt_required, get_jwt_identity
from app.payments import bp
from app.payments.utils import (
    validate_payment_amount, 
    validate_stripe_configuration,
    get_payment_by_session_id,
    get_stripe_session_details,
    handle_stripe_error,
    validate_webhook_signature
)
from app import db
from app.models import User, Payment
from datetime import datetime

@bp.route('/create-session', methods=['POST'])
@jwt_required()
def create_payment_session():
    """Create a Stripe checkout session for video rendering payment"""
    try:
        # Get current user
        current_user_id = get_jwt_identity()
        user = User.query.get(current_user_id)
        
        if not user:
            return jsonify({
                'error': {
                    'code': 'USER_NOT_FOUND',
                    'message': 'User not found'
                }
            }), 404
        
        # Configure Stripe
        stripe.api_key = current_app.config['STRIPE_SECRET_KEY']
        
        # Get request data
        data = request.get_json()
        if not data:
            return jsonify({
                'error': {
                    'code': 'INVALID_REQUEST',
                    'message': 'Request body is required'
                }
            }), 400
        
        # Validate Stripe configuration
        is_valid, config_error = validate_stripe_configuration()
        if not is_valid:
            current_app.logger.error(f"Stripe configuration error: {config_error}")
            return jsonify({
                'error': {
                    'code': 'PAYMENT_UNAVAILABLE',
                    'message': 'Payment processing is currently unavailable'
                }
            }), 503
        
        # Validate required fields
        amount = data.get('amount')  # Amount in cents
        is_valid_amount, amount_error = validate_payment_amount(amount)
        if not is_valid_amount:
            return jsonify({
                'error': {
                    'code': 'INVALID_AMOUNT',
                    'message': amount_error
                }
            }), 400
        
        # Create Stripe checkout session
        try:
            checkout_session = stripe.checkout.Session.create(
                payment_method_types=['card'],
                line_items=[{
                    'price_data': {
                        'currency': 'usd',
                        'product_data': {
                            'name': 'Oriel Signal FX Pro - Video Rendering',
                            'description': 'High-quality MP4 video rendering service'
                        },
                        'unit_amount': amount,
                    },
                    'quantity': 1,
                }],
                mode='payment',
                success_url=data.get('success_url', 'http://localhost:3000/success'),
                cancel_url=data.get('cancel_url', 'http://localhost:3000/cancel'),
                customer_email=user.email,
                metadata={
                    'user_id': str(user.id),
                    'service': 'video_rendering'
                }
            )
        except stripe.error.StripeError as e:
            error_response, status_code = handle_stripe_error(e)
            return jsonify(error_response), status_code
        
        # Create payment record in database
        payment = Payment(
            user_id=user.id,
            stripe_session_id=checkout_session.id,
            amount=amount,
            status='pending'
        )
        
        try:
            db.session.add(payment)
            db.session.commit()
        except Exception as e:
            db.session.rollback()
            return jsonify({
                'error': {
                    'code': 'DATABASE_ERROR',
                    'message': 'Failed to create payment record'
                }
            }), 500
        
        return jsonify({
            'session_id': checkout_session.id,
            'session_url': checkout_session.url,
            'payment_id': payment.id
        }), 201
        
    except Exception as e:
        current_app.logger.error(f"Payment session creation error: {str(e)}")
        return jsonify({
            'error': {
                'code': 'INTERNAL_ERROR',
                'message': 'Internal server error'
            }
        }), 500


@bp.route('/status/<session_id>', methods=['GET'])
@jwt_required()
def get_payment_status(session_id):
    """Get payment status for a Stripe session"""
    try:
        # Get current user
        current_user_id = get_jwt_identity()
        user = User.query.get(current_user_id)
        
        if not user:
            return jsonify({
                'error': {
                    'code': 'USER_NOT_FOUND',
                    'message': 'User not found'
                }
            }), 404
        
        # Find payment record
        payment = get_payment_by_session_id(session_id, user.id)
        
        if not payment:
            return jsonify({
                'error': {
                    'code': 'PAYMENT_NOT_FOUND',
                    'message': 'Payment not found'
                }
            }), 404
        
        # Get Stripe session details
        session, session_error = get_stripe_session_details(session_id)
        if session_error:
            return jsonify({
                'error': {
                    'code': 'STRIPE_ERROR',
                    'message': 'Failed to retrieve payment session',
                    'details': session_error
                }
            }), 400
        
        # Update payment status if needed
        stripe_status = session.payment_status
        if stripe_status == 'paid' and payment.status != 'completed':
            payment.status = 'completed'
            try:
                db.session.commit()
            except Exception as e:
                db.session.rollback()
                current_app.logger.error(f"Failed to update payment status: {str(e)}")
        
        return jsonify({
            'payment_id': payment.id,
            'session_id': session_id,
            'status': payment.status,
            'stripe_status': stripe_status,
            'amount': payment.amount,
            'created_at': payment.created_at.isoformat()
        }), 200
        
    except Exception as e:
        current_app.logger.error(f"Payment status check error: {str(e)}")
        return jsonify({
            'error': {
                'code': 'INTERNAL_ERROR',
                'message': 'Internal server error'
            }
        }), 500


@bp.route('/webhook', methods=['POST'])
def stripe_webhook():
    """Handle Stripe webhook events for payment confirmations"""
    payload = request.get_data()
    sig_header = request.headers.get('Stripe-Signature')
    
    if not sig_header:
        current_app.logger.warning("Stripe webhook received without signature")
        return jsonify({
            'error': {
                'code': 'MISSING_SIGNATURE',
                'message': 'Stripe signature header is missing'
            }
        }), 400
    
    # Verify webhook signature
    webhook_secret = current_app.config['STRIPE_WEBHOOK_SECRET']
    if not webhook_secret:
        current_app.logger.error("Stripe webhook secret not configured")
        return jsonify({
            'error': {
                'code': 'WEBHOOK_NOT_CONFIGURED',
                'message': 'Webhook secret not configured'
            }
        }), 500
    
    event, webhook_error = validate_webhook_signature(payload, sig_header, webhook_secret)
    if webhook_error:
        current_app.logger.error(f"Webhook validation failed: {webhook_error}")
        return jsonify({
            'error': {
                'code': 'WEBHOOK_VALIDATION_FAILED',
                'message': webhook_error
            }
        }), 400
    
    # Handle the event
    try:
        if event['type'] == 'checkout.session.completed':
            session = event['data']['object']
            session_id = session['id']
            
            # Find the payment record
            payment = Payment.query.filter_by(stripe_session_id=session_id).first()
            
            if not payment:
                current_app.logger.warning(f"Payment not found for session {session_id}")
                return jsonify({'status': 'payment_not_found'}), 404
            
            # Update payment status
            if payment.status != 'completed':
                payment.status = 'completed'
                
                try:
                    db.session.commit()
                    current_app.logger.info(f"Payment {payment.id} marked as completed")
                    
                    # TODO: Trigger render job creation (will be implemented in task 6)
                    # This is where we would queue the video rendering job
                    
                except Exception as e:
                    db.session.rollback()
                    current_app.logger.error(f"Failed to update payment {payment.id}: {str(e)}")
                    return jsonify({
                        'error': {
                            'code': 'DATABASE_ERROR',
                            'message': 'Failed to update payment status'
                        }
                    }), 500
            
        elif event['type'] == 'checkout.session.expired':
            session = event['data']['object']
            session_id = session['id']
            
            # Find and update payment record
            payment = Payment.query.filter_by(stripe_session_id=session_id).first()
            
            if payment and payment.status == 'pending':
                payment.status = 'failed'
                
                try:
                    db.session.commit()
                    current_app.logger.info(f"Payment {payment.id} marked as failed (expired)")
                except Exception as e:
                    db.session.rollback()
                    current_app.logger.error(f"Failed to update expired payment {payment.id}: {str(e)}")
        
        elif event['type'] == 'payment_intent.payment_failed':
            # Handle failed payments
            payment_intent = event['data']['object']
            current_app.logger.info(f"Payment failed for intent {payment_intent['id']}")
            
            # Note: We would need to link payment_intent to our payment record
            # For now, we'll log the failure
        
        else:
            current_app.logger.info(f"Unhandled Stripe webhook event: {event['type']}")
        
        return jsonify({'status': 'success'}), 200
        
    except Exception as e:
        current_app.logger.error(f"Error processing Stripe webhook: {str(e)}")
        return jsonify({
            'error': {
                'code': 'WEBHOOK_PROCESSING_ERROR',
                'message': 'Error processing webhook'
            }
        }), 500


@bp.route('/history', methods=['GET', 'OPTIONS'])
@jwt_required()
def payment_history():
    """Get user's payment history"""
    # Handle OPTIONS request for CORS
    if request.method == 'OPTIONS':
        return jsonify({'status': 'ok'}), 200
        
    try:
        current_user_id = get_jwt_identity()
        user = User.query.get(current_user_id)
        
        if not user:
            return jsonify({
                'error': {
                    'code': 'USER_NOT_FOUND',
                    'message': 'User not found'
                }
            }), 404
        
        # Get user's payment history
        payments = Payment.query.filter_by(user_id=user.id).order_by(Payment.created_at.desc()).all()
        
        history = []
        for payment in payments:
            history.append({
                'id': payment.id,
                'amount': float(payment.amount),
                'currency': 'USD',
                'status': payment.status,
                'created_at': payment.created_at.isoformat(),
                'description': f'Video rendering payment - ${payment.amount}'
            })
        
        return jsonify({
            'history': history,
            'total': len(history)
        }), 200
        
    except Exception as e:
        current_app.logger.error(f"Error getting payment history: {str(e)}")
        return jsonify({
            'error': {
                'code': 'PAYMENT_HISTORY_ERROR',
                'message': 'Failed to get payment history'
            }
        }), 500