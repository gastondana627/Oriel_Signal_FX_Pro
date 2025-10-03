from flask import Blueprint, request, jsonify, session, redirect, url_for, current_app
from flask_jwt_extended import get_jwt_identity
from ..auth.utils import get_current_user
from .manager import PurchaseManager
from .config import get_all_tiers, get_tier_info, format_price
from .licensing import LicensingService
from ..errors import (
    PaymentError, StripeError, ValidationError, ExternalServiceError,
    format_error_response, retry_with_backoff
)
import stripe

purchases_bp = Blueprint('purchases', __name__, url_prefix='/api/purchases')

purchase_manager = PurchaseManager()

@purchases_bp.route('/tiers', methods=['GET'])
@retry_with_backoff(max_retries=2, exceptions=(ExternalServiceError,))
def get_pricing_tiers():
    """Get all available pricing tiers"""
    try:
        tiers = get_all_tiers()
        
        # Format tiers for frontend
        formatted_tiers = {}
        for tier_key, tier_data in tiers.items():
            formatted_tiers[tier_key] = {
                **tier_data,
                'formatted_price': format_price(tier_data['price'])
            }
        
        return jsonify({
            'success': True,
            'tiers': formatted_tiers
        })
        
    except Exception as e:
        current_app.logger.error(f"Error loading pricing tiers: {str(e)}")
        return format_error_response(
            ExternalServiceError("pricing", "Failed to load pricing tiers", recoverable=True)
        )

@purchases_bp.route('/create-session', methods=['POST'])
def create_purchase_session():
    """Create Stripe checkout session for purchase"""
    try:
        data = request.get_json()
        
        # Validate request data
        if not data:
            raise ValidationError("Request body is required")
        
        # Validate required fields
        required_fields = ['tier', 'file_id']
        missing_fields = [field for field in required_fields if field not in data]
        if missing_fields:
            raise ValidationError(f"Missing required fields: {', '.join(missing_fields)}")
        
        tier = data['tier']
        file_id = data['file_id']
        user_email = data.get('email', '').strip()
        
        # Validate tier
        if not get_tier_info(tier):
            raise ValidationError(f"Invalid pricing tier: {tier}")
        
        # Validate file_id format (basic check)
        if not file_id or len(file_id) < 10:
            raise ValidationError("Invalid file ID format")
        
        # Get user ID if authenticated
        user_id = None
        try:
            user_id = get_jwt_identity()
            if user_id:
                user_id = str(user_id)
        except Exception:
            pass  # User not authenticated
        
        # For anonymous users, require and validate email
        if not user_id:
            if not user_email:
                raise ValidationError("Email address is required for purchases", field="email")
            
            # Basic email validation
            import re
            email_pattern = r'^[^\s@]+@[^\s@]+\.[^\s@]+$'
            if not re.match(email_pattern, user_email):
                raise ValidationError("Please enter a valid email address", field="email")
        
        # Create purchase session with error handling
        try:
            result = purchase_manager.create_purchase_session(
                user_id=user_id,
                tier=tier,
                file_id=file_id,
                user_email=user_email
            )
            
            if result['success']:
                return jsonify(result)
            else:
                # Handle specific purchase manager errors
                error_message = result.get('error', 'Failed to create checkout session')
                
                if 'stripe' in error_message.lower():
                    raise StripeError(error_message)
                elif 'network' in error_message.lower() or 'timeout' in error_message.lower():
                    raise ExternalServiceError("payment", error_message, recoverable=True)
                else:
                    raise PaymentError(error_message, recoverable=True)
                    
        except Exception as e:
            if 'stripe' in str(e).lower():
                current_app.logger.error(f"Stripe error in create_purchase_session: {str(e)}")
                raise StripeError(f"Payment service error: {str(e)}")
            else:
                raise
        
    except ValidationError as e:
        return format_error_response(e)
    except (PaymentError, StripeError, ExternalServiceError) as e:
        return format_error_response(e)
    except Exception as e:
        current_app.logger.error(f"Unexpected error in create_purchase_session: {str(e)}")
        return format_error_response(
            PaymentError("An unexpected error occurred while creating checkout session", recoverable=True)
        )

@purchases_bp.route('/verify-payment', methods=['POST'])
def verify_payment():
    """Verify payment completion"""
    try:
        data = request.get_json()
        
        if not data or 'session_id' not in data:
            return jsonify({
                'success': False,
                'error': 'Missing session_id'
            }), 400
        
        session_id = data['session_id']
        
        # Handle payment success
        result = purchase_manager.handle_payment_success(session_id)
        
        if result['success']:
            return jsonify(result)
        else:
            return jsonify(result), 400
            
    except Exception as e:
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500

@purchases_bp.route('/status/<purchase_id>', methods=['GET'])
def get_purchase_status(purchase_id):
    """Get purchase status"""
    try:
        result = purchase_manager.verify_payment(purchase_id)
        return jsonify(result)
        
    except Exception as e:
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500

@purchases_bp.route('/history', methods=['GET'])
def get_purchase_history():
    """Get user's purchase history"""
    try:
        try:
            user_id = get_jwt_identity()
            if not user_id:
                return jsonify({
                    'success': False,
                    'error': 'Authentication required'
                }), 401
            user_id = str(user_id)
        except:
            return jsonify({
                'success': False,
                'error': 'Authentication required'
            }), 401
        
        purchases = purchase_manager.get_user_purchases(user_id)
        
        return jsonify({
            'success': True,
            'purchases': purchases
        })
        
    except Exception as e:
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500

@purchases_bp.route('/resend-license', methods=['POST'])
def resend_license_email():
    """Resend licensing email for a purchase"""
    try:
        data = request.get_json()
        
        if not data or 'purchase_id' not in data:
            return jsonify({
                'success': False,
                'error': 'Missing purchase_id'
            }), 400
        
        purchase_id = data['purchase_id']
        
        # Verify user owns this purchase (if authenticated)
        try:
            user_id = get_jwt_identity()
            if user_id:
                user_id = str(user_id)
                # Verify ownership
                from ..models import Purchase
                purchase = Purchase.query.get(purchase_id)
                if purchase and purchase.user_id != user_id:
                    return jsonify({
                        'success': False,
                        'error': 'Access denied'
                    }), 403
        except:
            pass  # Allow anonymous resend for now
        
        # Resend licensing email
        result = purchase_manager.resend_licensing_email(purchase_id)
        
        if result['success']:
            return jsonify(result)
        else:
            return jsonify(result), 400
            
    except Exception as e:
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500

@purchases_bp.route('/success')
def payment_success():
    """Handle successful payment redirect from Stripe"""
    try:
        session_id = request.args.get('session_id')
        if not session_id:
            current_app.logger.warning("Payment success callback missing session_id")
            return redirect(url_for('main.index', error='missing_session', error_code='MISSING_SESSION'))
        
        # Handle payment success with detailed error handling
        try:
            result = purchase_manager.handle_payment_success(session_id)
            
            if result['success']:
                current_app.logger.info(f"Payment completed successfully for session: {session_id}")
                # Redirect to success page with download info
                return redirect(url_for('main.index', 
                                      success='payment_complete',
                                      download_token=result['download_token']))
            else:
                error_message = result.get('error', 'Payment processing failed')
                current_app.logger.error(f"Payment processing failed for session {session_id}: {error_message}")
                
                # Determine error type for better user experience
                if 'not found' in error_message.lower():
                    return redirect(url_for('main.index', error='missing_session', error_code='SESSION_NOT_FOUND'))
                elif 'not completed' in error_message.lower() or 'not paid' in error_message.lower():
                    return redirect(url_for('main.index', error='payment_failed', error_code='PAYMENT_NOT_COMPLETED'))
                else:
                    return redirect(url_for('main.index', error='payment_error', error_code='PROCESSING_ERROR'))
                    
        except Exception as e:
            if 'stripe' in str(e).lower():
                current_app.logger.error(f"Stripe error in payment success: {str(e)}")
                return redirect(url_for('main.index', error='payment_error', error_code='STRIPE_ERROR'))
            else:
                raise
        except Exception as e:
            current_app.logger.error(f"Unexpected error in payment success: {str(e)}")
            return redirect(url_for('main.index', error='payment_error', error_code='UNEXPECTED_ERROR'))
            
    except Exception as e:
        current_app.logger.error(f"Critical error in payment success callback: {str(e)}")
        return redirect(url_for('main.index', error='payment_error', error_code='CRITICAL_ERROR'))

@purchases_bp.route('/cancel/<purchase_id>')
def payment_cancel(purchase_id):
    """Handle cancelled payment redirect from Stripe"""
    current_app.logger.info(f"Payment cancelled for purchase: {purchase_id}")
    
    # Update purchase status to cancelled if it exists
    try:
        from ..models import Purchase, db
        purchase = Purchase.query.get(purchase_id)
        if purchase and purchase.status == 'pending':
            purchase.status = 'cancelled'
            db.session.commit()
            current_app.logger.info(f"Updated purchase {purchase_id} status to cancelled")
    except Exception as e:
        current_app.logger.error(f"Error updating cancelled purchase status: {str(e)}")
    
    return redirect(url_for('main.index', info='payment_cancelled'))

# Webhook endpoint for Stripe events (for production)
@purchases_bp.route('/webhook', methods=['POST'])
def stripe_webhook():
    """Handle Stripe webhook events"""
    try:
        payload = request.get_data()
        sig_header = request.headers.get('Stripe-Signature')
        
        # In production, verify webhook signature
        # For now, just log the event
        import json
        event_data = json.loads(payload)
        
        if event_data['type'] == 'checkout.session.completed':
            session_id = event_data['data']['object']['id']
            purchase_manager.handle_payment_success(session_id)
        
        return jsonify({'success': True})
        
    except Exception as e:
        return jsonify({'error': str(e)}), 400