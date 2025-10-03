"""
Customer Support Manager for handling purchase issues and user inquiries
"""
import uuid
from datetime import datetime
from typing import Dict, Optional
from flask import current_app
from ..models import db
from ..email.interface import EmailServiceInterface


class SupportTicket(db.Model):
    """Support ticket model for tracking customer issues"""
    __tablename__ = 'support_tickets'
    
    id = db.Column(db.String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    user_id = db.Column(db.String(36), db.ForeignKey('user.id'), nullable=True)
    user_email = db.Column(db.String(255), nullable=False)
    purchase_id = db.Column(db.String(36), db.ForeignKey('purchase.id'), nullable=True)
    
    # Ticket details
    subject = db.Column(db.String(255), nullable=False)
    category = db.Column(db.String(50), nullable=False)  # payment, download, technical, other
    priority = db.Column(db.String(20), default='normal')  # low, normal, high, urgent
    status = db.Column(db.String(20), default='open')  # open, in_progress, resolved, closed
    
    # Issue details
    description = db.Column(db.Text, nullable=False)
    user_agent = db.Column(db.Text)
    error_details = db.Column(db.Text)
    debug_info = db.Column(db.JSON)
    
    # Timestamps
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    resolved_at = db.Column(db.DateTime)
    
    # Relationships
    user = db.relationship('User', backref='support_tickets')
    purchase = db.relationship('Purchase', backref='support_tickets')


class SupportManager:
    """Manages customer support tickets and automated responses"""
    
    def __init__(self, email_service: EmailServiceInterface):
        self.email_service = email_service
        self.support_email = 'support@orielfx.com'
        
    def create_ticket(self, user_email: str, subject: str, description: str,
                     category: str = 'other', user_id: Optional[str] = None,
                     purchase_id: Optional[str] = None, debug_info: Optional[Dict] = None,
                     user_agent: Optional[str] = None) -> Dict:
        """
        Create a new support ticket
        
        Args:
            user_email: Customer email address
            subject: Ticket subject
            description: Issue description
            category: Issue category (payment, download, technical, other)
            user_id: User ID if authenticated
            purchase_id: Related purchase ID if applicable
            debug_info: Debug information for technical issues
            user_agent: User's browser information
            
        Returns:
            Dict with ticket creation result
        """
        try:
            # Determine priority based on category and keywords
            priority = self._determine_priority(category, description)
            
            # Create ticket
            ticket = SupportTicket(
                user_id=user_id,
                user_email=user_email,
                purchase_id=purchase_id,
                subject=subject,
                category=category,
                priority=priority,
                description=description,
                user_agent=user_agent,
                debug_info=debug_info
            )
            
            db.session.add(ticket)
            db.session.commit()
            
            # Send confirmation email to customer
            self._send_ticket_confirmation(ticket)
            
            # Send notification to support team
            self._notify_support_team(ticket)
            
            current_app.logger.info(f"Created support ticket: {ticket.id}")
            
            return {
                'success': True,
                'ticket_id': ticket.id,
                'message': 'Support ticket created successfully. You will receive a confirmation email shortly.'
            }
            
        except Exception as e:
            db.session.rollback()
            current_app.logger.error(f"Error creating support ticket: {str(e)}")
            return {
                'success': False,
                'error': 'Failed to create support ticket. Please try again or contact us directly.'
            }
    
    def _determine_priority(self, category: str, description: str) -> str:
        """Determine ticket priority based on category and content"""
        urgent_keywords = ['payment failed', 'charged twice', 'cannot download', 'urgent', 'critical']
        high_keywords = ['payment', 'billing', 'refund', 'download issue', 'not working']
        
        description_lower = description.lower()
        
        if category == 'payment' or any(keyword in description_lower for keyword in urgent_keywords):
            return 'urgent'
        elif any(keyword in description_lower for keyword in high_keywords):
            return 'high'
        else:
            return 'normal'
    
    def _send_ticket_confirmation(self, ticket: SupportTicket):
        """Send confirmation email to customer"""
        try:
            subject = f"Support Ticket Created - #{ticket.id[:8]}"
            
            # Generate estimated response time based on priority
            response_times = {
                'urgent': '2-4 hours',
                'high': '4-8 hours',
                'normal': '24-48 hours',
                'low': '2-3 business days'
            }
            
            estimated_response = response_times.get(ticket.priority, '24-48 hours')
            
            html_content = f"""
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
                <h2 style="color: #007bff;">Support Ticket Confirmation</h2>
                
                <p>Hello,</p>
                
                <p>Thank you for contacting OrielFX support. We have received your request and created a support ticket for you.</p>
                
                <div style="background: #f8f9fa; padding: 20px; border-radius: 8px; margin: 20px 0;">
                    <h3 style="margin-top: 0; color: #333;">Ticket Details</h3>
                    <p><strong>Ticket ID:</strong> #{ticket.id[:8]}</p>
                    <p><strong>Subject:</strong> {ticket.subject}</p>
                    <p><strong>Category:</strong> {ticket.category.title()}</p>
                    <p><strong>Priority:</strong> {ticket.priority.title()}</p>
                    <p><strong>Created:</strong> {ticket.created_at.strftime('%Y-%m-%d %H:%M UTC')}</p>
                </div>
                
                <div style="background: #e7f3ff; padding: 15px; border-radius: 8px; margin: 20px 0;">
                    <p style="margin: 0;"><strong>Estimated Response Time:</strong> {estimated_response}</p>
                </div>
                
                <p>Our support team will review your request and respond as soon as possible. You will receive an email notification when we have an update.</p>
                
                <p>If you need to add more information to this ticket, please reply to this email and include your ticket ID in the subject line.</p>
                
                <hr style="margin: 30px 0; border: none; border-top: 1px solid #eee;">
                
                <p style="color: #666; font-size: 14px;">
                    Best regards,<br>
                    OrielFX Support Team<br>
                    <a href="mailto:{self.support_email}">{self.support_email}</a>
                </p>
            </div>
            """
            
            text_content = f"""
Support Ticket Confirmation

Hello,

Thank you for contacting OrielFX support. We have received your request and created a support ticket for you.

Ticket Details:
- Ticket ID: #{ticket.id[:8]}
- Subject: {ticket.subject}
- Category: {ticket.category.title()}
- Priority: {ticket.priority.title()}
- Created: {ticket.created_at.strftime('%Y-%m-%d %H:%M UTC')}

Estimated Response Time: {estimated_response}

Our support team will review your request and respond as soon as possible. You will receive an email notification when we have an update.

If you need to add more information to this ticket, please reply to this email and include your ticket ID in the subject line.

Best regards,
OrielFX Support Team
{self.support_email}
            """
            
            self.email_service.send_email(
                to_email=ticket.user_email,
                subject=subject,
                html_content=html_content,
                text_content=text_content
            )
            
        except Exception as e:
            current_app.logger.error(f"Failed to send ticket confirmation: {str(e)}")
    
    def _notify_support_team(self, ticket: SupportTicket):
        """Send notification to support team"""
        try:
            subject = f"New Support Ticket - {ticket.priority.upper()} - #{ticket.id[:8]}"
            
            # Include purchase details if available
            purchase_info = ""
            if ticket.purchase_id:
                try:
                    from ..models import Purchase
                    purchase = Purchase.query.get(ticket.purchase_id)
                    if purchase:
                        purchase_info = f"""
Purchase Information:
- Purchase ID: {purchase.id}
- Tier: {purchase.tier}
- Amount: ${purchase.amount / 100:.2f}
- Status: {purchase.status}
- Created: {purchase.created_at.strftime('%Y-%m-%d %H:%M UTC')}
                        """
                except Exception as e:
                    current_app.logger.warning(f"Could not fetch purchase info: {str(e)}")
            
            # Include debug info if available
            debug_info = ""
            if ticket.debug_info:
                debug_info = f"""
Debug Information:
{ticket.debug_info}
                """
            
            content = f"""
New support ticket created:

Ticket ID: #{ticket.id[:8]}
Priority: {ticket.priority.upper()}
Category: {ticket.category.title()}
User Email: {ticket.user_email}
Subject: {ticket.subject}

Description:
{ticket.description}

{purchase_info}

{debug_info}

User Agent: {ticket.user_agent or 'Not provided'}

Created: {ticket.created_at.strftime('%Y-%m-%d %H:%M UTC')}

Please respond promptly based on the ticket priority.
            """
            
            # In development, log to console. In production, send to support team
            if current_app.config.get('DEBUG'):
                current_app.logger.info(f"Support team notification:\n{content}")
            else:
                self.email_service.send_email(
                    to_email=self.support_email,
                    subject=subject,
                    text_content=content
                )
                
        except Exception as e:
            current_app.logger.error(f"Failed to notify support team: {str(e)}")
    
    def get_ticket_status(self, ticket_id: str, user_email: str) -> Optional[Dict]:
        """Get ticket status for a user"""
        try:
            ticket = SupportTicket.query.filter_by(
                id=ticket_id,
                user_email=user_email
            ).first()
            
            if not ticket:
                return None
            
            return {
                'id': ticket.id,
                'subject': ticket.subject,
                'category': ticket.category,
                'priority': ticket.priority,
                'status': ticket.status,
                'created_at': ticket.created_at.isoformat(),
                'updated_at': ticket.updated_at.isoformat(),
                'resolved_at': ticket.resolved_at.isoformat() if ticket.resolved_at else None
            }
            
        except Exception as e:
            current_app.logger.error(f"Error getting ticket status: {str(e)}")
            return None
    
    def create_purchase_issue_ticket(self, purchase_id: str, user_email: str,
                                   issue_type: str, description: str,
                                   debug_info: Optional[Dict] = None) -> Dict:
        """Create a support ticket specifically for purchase issues"""
        
        issue_subjects = {
            'payment_failed': 'Payment Failed - Need Assistance',
            'download_expired': 'Download Link Expired - Request New Link',
            'download_failed': 'Download Failed - Technical Issue',
            'licensing_email': 'Licensing Email Not Received',
            'refund_request': 'Refund Request',
            'billing_question': 'Billing Question'
        }
        
        subject = issue_subjects.get(issue_type, 'Purchase Issue - Need Help')
        
        return self.create_ticket(
            user_email=user_email,
            subject=subject,
            description=description,
            category='payment',
            purchase_id=purchase_id,
            debug_info=debug_info
        )