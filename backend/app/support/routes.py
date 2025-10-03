"""
Support system routes for customer service integration
"""
from flask import Blueprint, request, jsonify, current_app
from flask_jwt_extended import get_jwt_identity
from .manager import SupportManager
from ..email.console_service import ConsoleEmailService
from ..errors import ValidationError, format_error_response

support_bp = Blueprint('support', __name__, url_prefix='/api/support')

# Initialize support manager with email service
email_service = ConsoleEmailService()
support_manager = SupportManager(email_service)


@support_bp.route('/ticket', methods=['POST'])
def create_support_ticket():
    """Create a new support ticket"""
    try:
        data = request.get_json()
        
        if not data:
            raise ValidationError("Request body is required")
        
        # Validate required fields
        required_fields = ['email', 'subject', 'description']
        missing_fields = [field for field in required_fields if not data.get(field)]
        if missing_fields:
            raise ValidationError(f"Missing required fields: {', '.join(missing_fields)}")
        
        # Get optional fields
        user_email = data['email'].strip()
        subject = data['subject'].strip()
        description = data['description'].strip()
        category = data.get('category', 'other')
        purchase_id = data.get('purchase_id')
        
        # Validate email format
        import re
        email_pattern = r'^[^\s@]+@[^\s@]+\.[^\s@]+$'
        if not re.match(email_pattern, user_email):
            raise ValidationError("Please enter a valid email address")
        
        # Get user ID if authenticated
        user_id = None
        try:
            user_id = get_jwt_identity()
            if user_id:
                user_id = str(user_id)
        except Exception:
            pass
        
        # Collect debug information
        debug_info = {
            'user_agent': request.headers.get('User-Agent'),
            'ip_address': request.remote_addr,
            'timestamp': data.get('timestamp'),
            'browser_info': data.get('browser_info'),
            'error_details': data.get('error_details')
        }
        
        # Create support ticket
        result = support_manager.create_ticket(
            user_email=user_email,
            subject=subject,
            description=description,
            category=category,
            user_id=user_id,
            purchase_id=purchase_id,
            debug_info=debug_info,
            user_agent=request.headers.get('User-Agent')
        )
        
        if result['success']:
            return jsonify(result)
        else:
            return jsonify(result), 500
            
    except ValidationError as e:
        return format_error_response(e)
    except Exception as e:
        current_app.logger.error(f"Error creating support ticket: {str(e)}")
        return jsonify({
            'success': False,
            'error': 'Failed to create support ticket. Please try again.'
        }), 500


@support_bp.route('/ticket/<ticket_id>/status', methods=['GET'])
def get_ticket_status(ticket_id):
    """Get status of a support ticket"""
    try:
        user_email = request.args.get('email')
        if not user_email:
            raise ValidationError("Email parameter is required")
        
        ticket_info = support_manager.get_ticket_status(ticket_id, user_email)
        
        if ticket_info:
            return jsonify({
                'success': True,
                'ticket': ticket_info
            })
        else:
            return jsonify({
                'success': False,
                'error': 'Ticket not found or access denied'
            }), 404
            
    except ValidationError as e:
        return format_error_response(e)
    except Exception as e:
        current_app.logger.error(f"Error getting ticket status: {str(e)}")
        return jsonify({
            'success': False,
            'error': 'Failed to get ticket status'
        }), 500


@support_bp.route('/purchase-issue', methods=['POST'])
def create_purchase_issue_ticket():
    """Create a support ticket for purchase-related issues"""
    try:
        data = request.get_json()
        
        if not data:
            raise ValidationError("Request body is required")
        
        # Validate required fields
        required_fields = ['purchase_id', 'email', 'issue_type', 'description']
        missing_fields = [field for field in required_fields if not data.get(field)]
        if missing_fields:
            raise ValidationError(f"Missing required fields: {', '.join(missing_fields)}")
        
        purchase_id = data['purchase_id']
        user_email = data['email'].strip()
        issue_type = data['issue_type']
        description = data['description'].strip()
        
        # Validate email format
        import re
        email_pattern = r'^[^\s@]+@[^\s@]+\.[^\s@]+$'
        if not re.match(email_pattern, user_email):
            raise ValidationError("Please enter a valid email address")
        
        # Validate issue type
        valid_issue_types = [
            'payment_failed', 'download_expired', 'download_failed',
            'licensing_email', 'refund_request', 'billing_question'
        ]
        if issue_type not in valid_issue_types:
            raise ValidationError(f"Invalid issue type. Must be one of: {', '.join(valid_issue_types)}")
        
        # Collect debug information
        debug_info = {
            'user_agent': request.headers.get('User-Agent'),
            'ip_address': request.remote_addr,
            'issue_type': issue_type,
            'timestamp': data.get('timestamp'),
            'error_details': data.get('error_details')
        }
        
        # Create purchase issue ticket
        result = support_manager.create_purchase_issue_ticket(
            purchase_id=purchase_id,
            user_email=user_email,
            issue_type=issue_type,
            description=description,
            debug_info=debug_info
        )
        
        if result['success']:
            return jsonify(result)
        else:
            return jsonify(result), 500
            
    except ValidationError as e:
        return format_error_response(e)
    except Exception as e:
        current_app.logger.error(f"Error creating purchase issue ticket: {str(e)}")
        return jsonify({
            'success': False,
            'error': 'Failed to create support ticket. Please try again.'
        }), 500


@support_bp.route('/common-issues', methods=['GET'])
def get_common_issues():
    """Get common issues and solutions"""
    try:
        common_issues = {
            'payment_issues': {
                'title': 'Payment Issues',
                'solutions': [
                    {
                        'problem': 'Payment was declined',
                        'solution': 'Check that your card details are correct and you have sufficient funds. Try a different payment method if the issue persists.'
                    },
                    {
                        'problem': 'Payment succeeded but no download link',
                        'solution': 'Check your email (including spam folder) for the licensing email. If not received, contact support with your payment confirmation.'
                    },
                    {
                        'problem': 'Charged twice for the same purchase',
                        'solution': 'This may be a temporary authorization hold. Contact support immediately with your payment details for investigation.'
                    }
                ]
            },
            'download_issues': {
                'title': 'Download Issues',
                'solutions': [
                    {
                        'problem': 'Download link expired',
                        'solution': 'Download links are valid for 48 hours. Contact support with your purchase details to get a new link.'
                    },
                    {
                        'problem': 'Download fails or is corrupted',
                        'solution': 'Try downloading again with a stable internet connection. Clear your browser cache and try a different browser if needed.'
                    },
                    {
                        'problem': 'Cannot find licensing email',
                        'solution': 'Check your spam/junk folder. Search for emails from "noreply@orielfx.com". Contact support if still not found.'
                    }
                ]
            },
            'technical_issues': {
                'title': 'Technical Issues',
                'solutions': [
                    {
                        'problem': 'Website not loading properly',
                        'solution': 'Clear your browser cache and cookies. Try a different browser or incognito/private mode. Check your internet connection.'
                    },
                    {
                        'problem': 'Audio file upload fails',
                        'solution': 'Ensure your file is in a supported format (MP3, WAV, M4A, AAC, FLAC, OGG) and under the size limit. Try a different browser.'
                    },
                    {
                        'problem': 'Video generation takes too long',
                        'solution': 'Processing time depends on audio length and server load. Wait for the completion email. Contact support if no response after 30 minutes.'
                    }
                ]
            }
        }
        
        return jsonify({
            'success': True,
            'common_issues': common_issues
        })
        
    except Exception as e:
        current_app.logger.error(f"Error getting common issues: {str(e)}")
        return jsonify({
            'success': False,
            'error': 'Failed to load common issues'
        }), 500