"""
Test configuration and fixtures for the backend test suite.
"""
import pytest
import tempfile
import os
from unittest.mock import Mock, patch
from datetime import datetime, timedelta

from app import create_app, db
from app.models import User, Payment, RenderJob
from werkzeug.security import generate_password_hash


@pytest.fixture(scope='session')
def app():
    """Create application for the tests."""
    # Mock external dependencies before creating app
    with patch('magic.from_buffer', return_value='audio/mpeg'):
        app = create_app('testing')
        
        # Create a temporary database file
        db_fd, app.config['DATABASE'] = tempfile.mkstemp()
        app.config['SQLALCHEMY_DATABASE_URI'] = f'sqlite:///{app.config["DATABASE"]}'
        app.config['TESTING'] = True
        app.config['WTF_CSRF_ENABLED'] = False
        
        with app.app_context():
            db.create_all()
            yield app
            db.drop_all()
        
        os.close(db_fd)
        os.unlink(app.config['DATABASE'])


@pytest.fixture
def client(app):
    """Create test client."""
    return app.test_client()


@pytest.fixture
def runner(app):
    """Create test runner."""
    return app.test_cli_runner()


@pytest.fixture
def app_context(app):
    """Create application context."""
    with app.app_context():
        yield app


@pytest.fixture
def test_user(app_context):
    """Create a test user."""
    user = User(
        email='test@example.com',
        password_hash=generate_password_hash('testpassword123'),
        created_at=datetime.utcnow()
    )
    db.session.add(user)
    db.session.commit()
    return user


@pytest.fixture
def admin_user(app_context):
    """Create an admin test user."""
    user = User(
        email='admin@example.com',
        password_hash=generate_password_hash('adminpassword123'),
        created_at=datetime.utcnow(),
        is_admin=True
    )
    db.session.add(user)
    db.session.commit()
    return user


@pytest.fixture
def test_payment(app_context, test_user):
    """Create a test payment."""
    payment = Payment(
        user_id=test_user.id,
        stripe_session_id='cs_test_123456789',
        amount=999,  # $9.99 in cents
        status='completed',
        created_at=datetime.utcnow()
    )
    db.session.add(payment)
    db.session.commit()
    return payment


@pytest.fixture
def test_render_job(app_context, test_user, test_payment):
    """Create a test render job."""
    job = RenderJob(
        user_id=test_user.id,
        payment_id=test_payment.id,
        status='completed',
        audio_filename='test_audio.mp3',
        render_config={
            'visualizer_type': 'bars',
            'color_scheme': 'rainbow',
            'background': 'dark'
        },
        video_url='https://storage.googleapis.com/test-bucket/video123.mp4',
        created_at=datetime.utcnow(),
        completed_at=datetime.utcnow()
    )
    db.session.add(job)
    db.session.commit()
    return job


@pytest.fixture
def auth_headers(client, test_user):
    """Get authentication headers for test user."""
    response = client.post('/api/auth/login', json={
        'email': test_user.email,
        'password': 'testpassword123'
    })
    
    if response.status_code == 200:
        token = response.json['access_token']
        return {'Authorization': f'Bearer {token}'}
    return {}


@pytest.fixture
def admin_headers(client, admin_user):
    """Get authentication headers for admin user."""
    response = client.post('/api/auth/login', json={
        'email': admin_user.email,
        'password': 'adminpassword123'
    })
    
    if response.status_code == 200:
        token = response.json['access_token']
        return {'Authorization': f'Bearer {token}'}
    return {}


@pytest.fixture
def mock_stripe():
    """Mock Stripe API calls."""
    with patch('stripe.checkout.Session') as mock_session, \
         patch('stripe.Webhook') as mock_webhook:
        
        # Mock session creation
        mock_session.create.return_value = Mock(
            id='cs_test_123456789',
            url='https://checkout.stripe.com/pay/cs_test_123456789',
            payment_status='unpaid'
        )
        
        # Mock webhook verification
        mock_webhook.construct_event.return_value = {
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
        
        yield {
            'session': mock_session,
            'webhook': mock_webhook
        }


@pytest.fixture
def mock_gcs():
    """Mock Google Cloud Storage operations."""
    with patch('app.storage.gcs.storage.Client') as mock_client:
        mock_bucket = Mock()
        mock_blob = Mock()
        
        mock_client.return_value.bucket.return_value = mock_bucket
        mock_bucket.blob.return_value = mock_blob
        mock_blob.upload_from_filename.return_value = None
        mock_blob.generate_signed_url.return_value = 'https://storage.googleapis.com/signed-url'
        
        yield {
            'client': mock_client,
            'bucket': mock_bucket,
            'blob': mock_blob
        }


@pytest.fixture
def mock_sendgrid():
    """Mock SendGrid email service."""
    with patch('app.email.service.SendGridAPIClient') as mock_client:
        mock_response = Mock()
        mock_response.status_code = 202
        mock_client.return_value.send.return_value = mock_response
        
        yield mock_client


@pytest.fixture
def mock_redis():
    """Mock Redis operations."""
    with patch('redis.Redis') as mock_redis_class:
        mock_redis = Mock()
        mock_redis_class.return_value = mock_redis
        
        # Mock basic Redis operations
        mock_redis.ping.return_value = True
        mock_redis.set.return_value = True
        mock_redis.get.return_value = b'test_value'
        mock_redis.delete.return_value = 1
        
        yield mock_redis


@pytest.fixture
def mock_rq():
    """Mock RQ job queue operations."""
    with patch('rq.Queue') as mock_queue_class, \
         patch('rq.Job') as mock_job_class:
        
        mock_queue = Mock()
        mock_job = Mock()
        
        mock_queue_class.return_value = mock_queue
        mock_job_class.return_value = mock_job
        
        # Mock job operations
        mock_job.id = 'test-job-123'
        mock_job.get_status.return_value = 'queued'
        mock_queue.enqueue.return_value = mock_job
        
        yield {
            'queue': mock_queue,
            'job': mock_job
        }


@pytest.fixture
def mock_playwright():
    """Mock Playwright browser automation."""
    with patch('playwright.sync_api.sync_playwright') as mock_playwright:
        mock_browser = Mock()
        mock_page = Mock()
        mock_context = Mock()
        
        mock_playwright.return_value.__enter__.return_value.chromium.launch.return_value = mock_browser
        mock_browser.new_context.return_value = mock_context
        mock_context.new_page.return_value = mock_page
        
        # Mock page operations
        mock_page.goto.return_value = None
        mock_page.wait_for_load_state.return_value = None
        mock_page.screenshot.return_value = b'fake_screenshot_data'
        
        yield {
            'playwright': mock_playwright,
            'browser': mock_browser,
            'page': mock_page
        }


@pytest.fixture
def mock_ffmpeg():
    """Mock FFmpeg operations."""
    with patch('ffmpeg.input') as mock_input, \
         patch('ffmpeg.output') as mock_output, \
         patch('ffmpeg.run') as mock_run:
        
        mock_input.return_value = Mock()
        mock_output.return_value = Mock()
        mock_run.return_value = None
        
        yield {
            'input': mock_input,
            'output': mock_output,
            'run': mock_run
        }


@pytest.fixture
def sample_audio_file():
    """Create a sample audio file for testing."""
    with tempfile.NamedTemporaryFile(suffix='.mp3', delete=False) as f:
        # Write minimal MP3 header
        f.write(b'ID3\x03\x00\x00\x00\x00\x00\x00\x00')
        f.write(b'\xFF\xFB\x90\x00')  # MP3 frame header
        f.write(b'\x00' * 1000)  # Padding
        temp_path = f.name
    
    yield temp_path
    
    # Cleanup
    if os.path.exists(temp_path):
        os.unlink(temp_path)


@pytest.fixture(autouse=True)
def cleanup_database(app_context):
    """Clean up database after each test."""
    yield
    
    # Clean up all tables
    db.session.remove()
    for table in reversed(db.metadata.sorted_tables):
        db.session.execute(table.delete())
    db.session.commit()