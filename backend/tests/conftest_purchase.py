"""
Additional test fixtures specifically for purchase system testing.
Extends the main conftest.py with purchase-related fixtures.
"""
import pytest
from unittest.mock import Mock, patch
from datetime import datetime, timedelta
import uuid

from app.models import Purchase, FreeDownloadUsage
from app.purchases.manager import PurchaseManager
from app.purchases.licensing import LicensingService
from app.downloads.manager import DownloadManager


@pytest.fixture
def test_purchase(app_context, test_user):
    """Create a test purchase record"""
    from app import db
    
    purchase = Purchase(
        id=str(uuid.uuid4()),
        user_id=test_user.id,
        file_id='test-purchase-file-123',
        tier='personal',
        amount=299,
        stripe_session_id='cs_test_purchase_123',
        status='completed',
        download_token='test-download-token-123',
        download_expires_at=datetime.utcnow() + timedelta(hours=48),
        download_attempts=0,
        license_sent=True,
        created_at=datetime.utcnow(),
        completed_at=datetime.utcnow()
    )
    db.session.add(purchase)
    db.session.commit()
    return purchase


@pytest.fixture
def test_pending_purchase(app_context, test_user):
    """Create a test pending purchase record"""
    from app import db
    
    purchase = Purchase(
        id=str(uuid.uuid4()),
        user_id=test_user.id,
        file_id='test-pending-file-456',
        tier='commercial',
        amount=999,
        stripe_session_id='cs_test_pending_456',
        status='pending',
        download_expires_at=datetime.utcnow() + timedelta(hours=48),
        created_at=datetime.utcnow()
    )
    db.session.add(purchase)
    db.session.commit()
    return purchase


@pytest.fixture
def test_expired_purchase(app_context, test_user):
    """Create a test purchase with expired download"""
    from app import db
    
    purchase = Purchase(
        id=str(uuid.uuid4()),
        user_id=test_user.id,
        file_id='test-expired-file-789',
        tier='premium',
        amount=1999,
        stripe_session_id='cs_test_expired_789',
        status='completed',
        download_token='expired-token-789',
        download_expires_at=datetime.utcnow() - timedelta(hours=1),  # Expired
        download_attempts=2,
        license_sent=True,
        created_at=datetime.utcnow() - timedelta(days=2),
        completed_at=datetime.utcnow() - timedelta(days=2)
    )
    db.session.add(purchase)
    db.session.commit()
    return purchase


@pytest.fixture
def test_anonymous_purchase(app_context):
    """Create a test anonymous purchase record"""
    from app import db
    
    purchase = Purchase(
        id=str(uuid.uuid4()),
        user_id=None,  # Anonymous
        user_email='anonymous@test.com',
        file_id='test-anonymous-file-999',
        tier='personal',
        amount=299,
        stripe_session_id='cs_test_anonymous_999',
        status='completed',
        download_token='anonymous-token-999',
        download_expires_at=datetime.utcnow() + timedelta(hours=48),
        download_attempts=1,
        license_sent=True,
        created_at=datetime.utcnow(),
        completed_at=datetime.utcnow()
    )
    db.session.add(purchase)
    db.session.commit()
    return purchase


@pytest.fixture
def test_free_usage(app_context, test_user):
    """Create a test free download usage record"""
    from app import db
    
    usage = FreeDownloadUsage(
        id=str(uuid.uuid4()),
        user_id=test_user.id,
        downloads_used=2,
        max_downloads=5,
        created_at=datetime.utcnow(),
        updated_at=datetime.utcnow()
    )
    db.session.add(usage)
    db.session.commit()
    return usage


@pytest.fixture
def test_anonymous_free_usage(app_context):
    """Create a test anonymous free download usage record"""
    from app import db
    
    usage = FreeDownloadUsage(
        id=str(uuid.uuid4()),
        user_id=None,
        session_id='test-session-anonymous-123',
        downloads_used=1,
        max_downloads=3,
        created_at=datetime.utcnow(),
        updated_at=datetime.utcnow()
    )
    db.session.add(usage)
    db.session.commit()
    return usage


@pytest.fixture
def purchase_manager():
    """Create PurchaseManager instance for testing"""
    return PurchaseManager()


@pytest.fixture
def licensing_service():
    """Create LicensingService instance for testing"""
    return LicensingService()


@pytest.fixture
def download_manager():
    """Create DownloadManager instance for testing"""
    return DownloadManager(secret_key='test-download-manager-secret')


@pytest.fixture
def mock_stripe_session():
    """Mock Stripe session for testing"""
    session = Mock()
    session.id = 'cs_mock_test_session'
    session.url = 'https://checkout.stripe.com/pay/cs_mock_test_session'
    session.payment_status = 'paid'
    session.payment_intent = 'pi_mock_test_intent'
    session.amount_total = 299
    session.customer_email = 'test@example.com'
    return session


@pytest.fixture
def mock_stripe_create(mock_stripe_session):
    """Mock Stripe checkout session creation"""
    with patch('stripe.checkout.Session.create') as mock_create:
        mock_create.return_value = mock_stripe_session
        yield mock_create


@pytest.fixture
def mock_stripe_retrieve(mock_stripe_session):
    """Mock Stripe checkout session retrieval"""
    with patch('stripe.checkout.Session.retrieve') as mock_retrieve:
        mock_retrieve.return_value = mock_stripe_session
        yield mock_retrieve


@pytest.fixture
def mock_stripe_webhook():
    """Mock Stripe webhook verification"""
    with patch('stripe.Webhook.construct_event') as mock_webhook:
        webhook_event = {
            'id': 'evt_mock_test',
            'type': 'checkout.session.completed',
            'data': {
                'object': {
                    'id': 'cs_mock_test_session',
                    'payment_status': 'paid',
                    'amount_total': 299,
                    'customer_email': 'test@example.com',
                    'payment_intent': 'pi_mock_test_intent'
                }
            },
            'created': 1234567890
        }
        mock_webhook.return_value = webhook_event
        yield mock_webhook


@pytest.fixture
def mock_email_service():
    """Mock email service for testing"""
    with patch('app.purchases.licensing.LicensingService._send_custom_email') as mock_email:
        mock_email.return_value = {
            'success': True,
            'message': 'Test email sent successfully'
        }
        yield mock_email


@pytest.fixture
def mock_gcs_storage():
    """Mock Google Cloud Storage for file operations"""
    with patch('app.downloads.manager.get_gcs_manager') as mock_gcs:
        mock_manager = Mock()
        mock_manager.bucket.blob.return_value.download_as_bytes.return_value = b'test file content'
        mock_gcs.return_value = mock_manager
        yield mock_gcs


@pytest.fixture
def sample_purchase_data():
    """Sample purchase data for testing"""
    return {
        'tier': 'commercial',
        'file_id': 'sample-test-file-123',
        'user_email': 'sample@test.com'
    }


@pytest.fixture
def sample_webhook_payload():
    """Sample Stripe webhook payload for testing"""
    return {
        'id': 'evt_sample_webhook',
        'object': 'event',
        'type': 'checkout.session.completed',
        'data': {
            'object': {
                'id': 'cs_sample_session',
                'object': 'checkout.session',
                'payment_status': 'paid',
                'amount_total': 999,
                'customer_email': 'webhook@test.com',
                'payment_intent': 'pi_sample_intent'
            }
        },
        'created': 1234567890
    }


@pytest.fixture
def all_pricing_tiers():
    """All available pricing tiers for testing"""
    from app.purchases.config import PRICING_TIERS
    return PRICING_TIERS


@pytest.fixture(autouse=True)
def cleanup_purchase_data(app_context):
    """Automatically clean up purchase-related data after each test"""
    yield
    
    # Clean up purchase and usage data
    from app import db
    from app.models import Purchase, FreeDownloadUsage
    
    try:
        # Delete all test purchases and usage records
        Purchase.query.delete()
        FreeDownloadUsage.query.delete()
        db.session.commit()
    except Exception as e:
        db.session.rollback()
        # Log error but don't fail the test
        import logging
        logging.getLogger(__name__).warning(f"Cleanup failed: {e}")


@pytest.fixture
def test_purchase_scenarios(app_context, test_user):
    """Create multiple purchase scenarios for comprehensive testing"""
    from app import db
    
    scenarios = []
    
    # Scenario 1: Completed purchase with available download
    purchase1 = Purchase(
        id=str(uuid.uuid4()),
        user_id=test_user.id,
        file_id='scenario-1-file',
        tier='personal',
        amount=299,
        status='completed',
        download_token='scenario-1-token',
        download_expires_at=datetime.utcnow() + timedelta(hours=24),
        download_attempts=1,
        license_sent=True
    )
    scenarios.append(('available_download', purchase1))
    
    # Scenario 2: Completed purchase with expired download
    purchase2 = Purchase(
        id=str(uuid.uuid4()),
        user_id=test_user.id,
        file_id='scenario-2-file',
        tier='commercial',
        amount=999,
        status='completed',
        download_token='scenario-2-token',
        download_expires_at=datetime.utcnow() - timedelta(hours=1),
        download_attempts=2,
        license_sent=True
    )
    scenarios.append(('expired_download', purchase2))
    
    # Scenario 3: Completed purchase with max attempts
    purchase3 = Purchase(
        id=str(uuid.uuid4()),
        user_id=test_user.id,
        file_id='scenario-3-file',
        tier='premium',
        amount=1999,
        status='completed',
        download_token='scenario-3-token',
        download_expires_at=datetime.utcnow() + timedelta(hours=48),
        download_attempts=5,  # Max attempts
        license_sent=True
    )
    scenarios.append(('max_attempts', purchase3))
    
    # Scenario 4: Pending purchase
    purchase4 = Purchase(
        id=str(uuid.uuid4()),
        user_id=test_user.id,
        file_id='scenario-4-file',
        tier='personal',
        amount=299,
        status='pending',
        download_token=None,
        download_expires_at=None,
        download_attempts=0,
        license_sent=False
    )
    scenarios.append(('pending_purchase', purchase4))
    
    # Add all purchases to database
    for _, purchase in scenarios:
        db.session.add(purchase)
    
    db.session.commit()
    
    return scenarios