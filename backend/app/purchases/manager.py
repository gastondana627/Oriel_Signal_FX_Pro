import os
import uuid
import stripe
from datetime import datetime, timedelta
from typing import Dict, List, Optional
from flask import current_app, url_for
from ..models import db, Purchase, User
from .config import PRICING_TIERS, PURCHASE_CONFIG, get_tier_info
from .licensing import LicensingService
from ..errors import (
    PaymentError, StripeError, ValidationError, ExternalServiceError,
    DatabaseError, retry_with_backoff, CircuitBreaker
)

# Configure Stripe
stripe.api_key = os.environ.get('STRIPE_SECRET_KEY')

class PurchaseManager:
    """Manages purchase flow and Stripe integration"""
    
    def __init__(self):
        self.stripe_api_key = os.environ.get('STRIPE_SECRET_KEY')
        if not self.stripe_api_key:
            current_app.logger.warning("STRIPE_SECRET_KEY not configured - using mock mode")
        
        # Initialize licensing service
        self.licensing_service = LicensingService()
        
        # Circuit breaker for Stripe API calls
        self.stripe_circuit_breaker = CircuitBreaker(
            failure_threshold=3,
            recovery_timeout=60,
            expected_exception=Exception
        )
    
    @retry_with_backoff(max_retries=2, exceptions=(Exception,))
    def create_purchase_session(self, user_id: Optional[str], tier: str, file_id: str, 
                              user_email: Optional[str] = None) -> Dict:
        """
        Create Stripe checkout session for purchase
        
        Args:
            user_id: User ID (None for anonymous users)
            tier: Pricing tier (personal, commercial, premium)
            file_id: Generated file reference
            user_email: Email for anonymous users
            
        Returns:
            Dict with session info and checkout URL
        """
        try:
            # Validate inputs
            if not tier or not file_id:
                raise ValidationError("Tier and file_id are required")
            
            tier_info = get_tier_info(tier)
            if not tier_info:
                raise ValidationError(f"Invalid pricing tier: {tier}")
            
            # Validate email for anonymous users
            if not user_id and not user_email:
                raise ValidationError("Email is required for anonymous purchases")
            
            # Create purchase record with error handling
            try:
                purchase_id = str(uuid.uuid4())
                purchase = Purchase(
                    id=purchase_id,
                    user_id=user_id,
                    user_email=user_email,
                    file_id=file_id,
                    tier=tier,
                    amount=tier_info['price'],
                    status='pending',
                    download_expires_at=datetime.utcnow() + timedelta(
                        hours=PURCHASE_CONFIG['download_link_expiry_hours']
                    )
                )
                
                db.session.add(purchase)
                db.session.flush()  # Get the ID without committing
                
            except Exception as e:
                db.session.rollback()
                current_app.logger.error(f"Database error creating purchase: {str(e)}")
                raise DatabaseError("Failed to create purchase record", recoverable=True)
            
            # Prepare Stripe session data
            session_data = {
                'payment_method_types': ['card'],
                'line_items': [{
                    'price_data': {
                        'currency': 'usd',
                        'product_data': {
                            'name': f"Audio Visualizer - {tier_info['name']}",
                            'description': tier_info['description'],
                            'metadata': {
                                'resolution': tier_info['resolution'],
                                'format': tier_info['format'],
                                'license': tier_info['license']
                            }
                        },
                        'unit_amount': tier_info['price'],
                    },
                    'quantity': 1,
                }],
                'mode': 'payment',
                'success_url': url_for('purchases.payment_success', 
                                     session_id='{CHECKOUT_SESSION_ID}', 
                                     _external=True),
                'cancel_url': url_for('purchases.payment_cancel', 
                                    purchase_id=purchase_id, 
                                    _external=True),
                'metadata': {
                    'purchase_id': purchase_id,
                    'file_id': file_id,
                    'tier': tier
                },
                'expires_at': int((datetime.utcnow() + timedelta(hours=1)).timestamp())  # 1 hour expiry
            }
            
            # Add customer email
            customer_email = user_email
            if not customer_email and user_id:
                try:
                    user = User.query.get(user_id)
                    if user and user.email:
                        customer_email = user.email
                except Exception as e:
                    current_app.logger.warning(f"Could not fetch user email: {str(e)}")
            
            if customer_email:
                session_data['customer_email'] = customer_email
            
            # Create Stripe session with circuit breaker
            try:
                if self.stripe_api_key:
                    session = self._create_stripe_session_with_circuit_breaker(session_data)
                    purchase.stripe_session_id = session.id
                    checkout_url = session.url
                else:
                    # Mock session for development
                    session_id = f'cs_mock_{purchase_id}'
                    purchase.stripe_session_id = session_id
                    checkout_url = f'/mock-checkout/{purchase_id}'
                
                # Commit the purchase record
                db.session.commit()
                
                current_app.logger.info(f"Created purchase session: {purchase_id}")
                
                return {
                    'success': True,
                    'purchase_id': purchase_id,
                    'session_id': purchase.stripe_session_id,
                    'checkout_url': checkout_url,
                    'tier_info': tier_info
                }
                
            except Exception as e:
                if 'stripe' in str(e).lower():
                    db.session.rollback()
                    current_app.logger.error(f"Stripe error creating session: {str(e)}")
                    raise StripeError(f"Payment service error: {str(e)}")
                else:
                    raise
            
        except (ValidationError, StripeError, DatabaseError) as e:
            raise e
        except Exception as e:
            db.session.rollback()
            current_app.logger.error(f"Unexpected error creating purchase session: {str(e)}")
            raise PaymentError("Failed to create checkout session", recoverable=True)
    
    def _create_stripe_session_with_circuit_breaker(self, session_data):
        """Create Stripe session with circuit breaker protection"""
        return self.stripe_circuit_breaker(lambda: stripe.checkout.Session.create(**session_data))()
    
    def handle_payment_success(self, session_id: str) -> Dict:
        """
        Handle successful payment completion
        
        Args:
            session_id: Stripe checkout session ID
            
        Returns:
            Dict with purchase info and download link
        """
        try:
            # Find purchase by session ID
            purchase = Purchase.query.filter_by(stripe_session_id=session_id).first()
            if not purchase:
                raise ValueError(f"Purchase not found for session: {session_id}")
            
            # Verify payment with Stripe (if configured)
            if self.stripe_api_key and not session_id.startswith('cs_mock_'):
                session = stripe.checkout.Session.retrieve(session_id)
                if session.payment_status != 'paid':
                    raise ValueError("Payment not completed")
                
                purchase.stripe_payment_intent = session.payment_intent
            
            # Update purchase record
            purchase.status = 'completed'
            purchase.completed_at = datetime.utcnow()
            
            # Generate secure download token
            download_token = str(uuid.uuid4())
            purchase.download_token = download_token
            
            db.session.commit()
            
            # Send licensing email automatically
            try:
                email_result = self.licensing_service.send_licensing_email(purchase)
                if email_result.get('success'):
                    current_app.logger.info(f"Licensing email sent for purchase: {purchase.id}")
                else:
                    current_app.logger.error(f"Failed to send licensing email for purchase {purchase.id}: {email_result.get('error')}")
            except Exception as e:
                current_app.logger.error(f"Exception sending licensing email for purchase {purchase.id}: {e}")
            
            current_app.logger.info(f"Payment completed for purchase: {purchase.id}")
            
            return {
                'success': True,
                'purchase_id': purchase.id,
                'download_token': download_token,
                'download_expires_at': purchase.download_expires_at.isoformat(),
                'tier': purchase.tier,
                'amount': purchase.amount
            }
            
        except Exception as e:
            current_app.logger.error(f"Error handling payment success: {str(e)}")
            return {
                'success': False,
                'error': str(e)
            }
    
    def verify_payment(self, purchase_id: str) -> Dict:
        """
        Verify payment status for a purchase
        
        Args:
            purchase_id: Purchase ID to verify
            
        Returns:
            Dict with verification status
        """
        try:
            purchase = Purchase.query.get(purchase_id)
            if not purchase:
                return {'success': False, 'error': 'Purchase not found'}
            
            return {
                'success': True,
                'status': purchase.status,
                'completed': purchase.status == 'completed',
                'download_token': purchase.download_token if purchase.status == 'completed' else None
            }
            
        except Exception as e:
            current_app.logger.error(f"Error verifying payment: {str(e)}")
            return {
                'success': False,
                'error': str(e)
            }
    
    def get_user_purchases(self, user_id: str) -> List[Dict]:
        """
        Get purchase history for a user
        
        Args:
            user_id: User ID
            
        Returns:
            List of purchase records
        """
        try:
            purchases = Purchase.query.filter_by(user_id=user_id).order_by(
                Purchase.created_at.desc()
            ).all()
            
            result = []
            for purchase in purchases:
                tier_info = get_tier_info(purchase.tier)
                
                purchase_data = {
                    'id': purchase.id,
                    'tier': purchase.tier,
                    'tier_name': tier_info['name'] if tier_info else purchase.tier,
                    'amount': purchase.amount,
                    'status': purchase.status,
                    'created_at': purchase.created_at.isoformat(),
                    'completed_at': purchase.completed_at.isoformat() if purchase.completed_at else None,
                    'download_expires_at': purchase.download_expires_at.isoformat() if purchase.download_expires_at else None,
                    'download_attempts': purchase.download_attempts,
                    'download_available': (
                        purchase.status == 'completed' and 
                        purchase.download_expires_at and 
                        purchase.download_expires_at > datetime.utcnow() and
                        purchase.download_attempts < PURCHASE_CONFIG['max_download_attempts']
                    )
                }
                
                if purchase_data['download_available']:
                    purchase_data['download_token'] = purchase.download_token
                
                result.append(purchase_data)
            
            return result
            
        except Exception as e:
            current_app.logger.error(f"Error getting user purchases: {str(e)}")
            return []
    
    def get_purchase_by_token(self, download_token: str) -> Optional[Purchase]:
        """
        Get purchase by download token
        
        Args:
            download_token: Secure download token
            
        Returns:
            Purchase object or None
        """
        return Purchase.query.filter_by(download_token=download_token).first()
    
    def resend_licensing_email(self, purchase_id: str) -> Dict:
        """
        Resend licensing email for a purchase
        
        Args:
            purchase_id: Purchase ID to resend license for
            
        Returns:
            Dict with resend result
        """
        try:
            return self.licensing_service.resend_license_email(purchase_id)
        except Exception as e:
            current_app.logger.error(f"Error resending licensing email: {str(e)}")
            return {
                'success': False,
                'error': str(e)
            }