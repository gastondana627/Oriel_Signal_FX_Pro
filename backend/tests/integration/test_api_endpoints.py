"""
Integration tests for API endpoints.
"""
import pytest
import json
from unittest.mock import patch

from app.models import User, Payment, RenderJob


class TestAuthEndpoints:
    """Test authentication API endpoints."""
    
    def test_register_success(self, client, app_context):
        """Test successful user registration."""
        response = client.post('/api/auth/register', json={
            'email': 'newuser@example.com',
            'password': 'NewPassword123!'
        })
        
        assert response.status_code == 201
        data = response.get_json()
        assert 'message' in data
        assert 'user_id' in data
        
        # Verify user was created in database
        user = User.query.filter_by(email='newuser@example.com').first()
        assert user is not None
        assert user.is_active is True
    
    def test_register_duplicate_email(self, client, app_context, test_user):
        """Test registration with duplicate email."""
        response = client.post('/api/auth/register', json={
            'email': test_user.email,
            'password': 'NewPassword123!'
        })
        
        assert response.status_code == 400
        data = response.get_json()
        assert 'error' in data
        assert 'already exists' in data['error']['message']
    
    def test_register_weak_password(self, client, app_context):
        """Test registration with weak password."""
        response = client.post('/api/auth/register', json={
            'email': 'newuser@example.com',
            'password': 'weak'
        })
        
        assert response.status_code == 400
        data = response.get_json()
        assert 'error' in data
        assert 'password' in data['error']['message'].lower()
    
    def test_login_success(self, client, app_context, test_user):
        """Test successful user login."""
        response = client.post('/api/auth/login', json={
            'email': test_user.email,
            'password': 'testpassword123'
        })
        
        assert response.status_code == 200
        data = response.get_json()
        assert 'access_token' in data
        assert 'refresh_token' in data
        assert 'user' in data
        assert data['user']['email'] == test_user.email
    
    def test_login_invalid_credentials(self, client, app_context, test_user):
        """Test login with invalid credentials."""
        response = client.post('/api/auth/login', json={
            'email': test_user.email,
            'password': 'wrongpassword'
        })
        
        assert response.status_code == 401
        data = response.get_json()
        assert 'error' in data
        assert 'Invalid credentials' in data['error']['message']
    
    def test_login_nonexistent_user(self, client, app_context):
        """Test login with nonexistent user."""
        response = client.post('/api/auth/login', json={
            'email': 'nonexistent@example.com',
            'password': 'password123'
        })
        
        assert response.status_code == 401
        data = response.get_json()
        assert 'error' in data
    
    def test_refresh_token_success(self, client, app_context, test_user):
        """Test successful token refresh."""
        # First login to get refresh token
        login_response = client.post('/api/auth/login', json={
            'email': test_user.email,
            'password': 'testpassword123'
        })
        
        refresh_token = login_response.get_json()['refresh_token']
        
        # Use refresh token to get new access token
        response = client.post('/api/auth/refresh', 
                             headers={'Authorization': f'Bearer {refresh_token}'})
        
        assert response.status_code == 200
        data = response.get_json()
        assert 'access_token' in data
    
    @patch('app.email.service.send_email')
    def test_password_reset_request(self, mock_send_email, client, app_context, test_user):
        """Test password reset request."""
        mock_send_email.return_value = True
        
        response = client.post('/api/auth/reset-password', json={
            'email': test_user.email
        })
        
        assert response.status_code == 200
        data = response.get_json()
        assert 'message' in data
        
        # Verify email was sent
        mock_send_email.assert_called_once()


class TestPaymentEndpoints:
    """Test payment API endpoints."""
    
    @patch('stripe.checkout.Session.create')
    def test_create_payment_session_success(self, mock_create, client, app_context, 
                                          test_user, auth_headers):
        """Test successful payment session creation."""
        # Mock Stripe response
        from unittest.mock import Mock
        mock_session = Mock()
        mock_session.id = 'cs_test_123456789'
        mock_session.url = 'https://checkout.stripe.com/pay/cs_test_123456789'
        mock_create.return_value = mock_session
        
        response = client.post('/api/payments/create-session', 
                             headers=auth_headers,
                             json={
                                 'product_type': 'basic_video',
                                 'quantity': 1,
                                 'success_url': 'https://example.com/success',
                                 'cancel_url': 'https://example.com/cancel'
                             })
        
        assert response.status_code == 200
        data = response.get_json()
        assert 'session_id' in data
        assert 'checkout_url' in data
        
        # Verify payment record was created
        payment = Payment.query.filter_by(
            stripe_session_id='cs_test_123456789'
        ).first()
        assert payment is not None
        assert payment.user_id == test_user.id
    
    def test_create_payment_session_unauthorized(self, client, app_context):
        """Test payment session creation without authentication."""
        response = client.post('/api/payments/create-session', json={
            'product_type': 'basic_video',
            'quantity': 1
        })
        
        assert response.status_code == 401
    
    @patch('stripe.Webhook.construct_event')
    def test_payment_webhook_success(self, mock_construct, client, app_context, 
                                   test_user, test_payment):
        """Test successful payment webhook processing."""
        # Mock webhook event
        mock_event = {
            'type': 'checkout.session.completed',
            'data': {
                'object': {
                    'id': test_payment.stripe_session_id,
                    'payment_status': 'paid',
                    'amount_total': test_payment.amount,
                    'customer_email': test_user.email
                }
            }
        }
        mock_construct.return_value = mock_event
        
        response = client.post('/api/payments/webhook',
                             data='{"test": "data"}',
                             headers={
                                 'Stripe-Signature': 'test_signature',
                                 'Content-Type': 'application/json'
                             })
        
        assert response.status_code == 200
        
        # Verify payment status was updated
        updated_payment = Payment.query.get(test_payment.id)
        assert updated_payment.status == 'completed'
    
    def test_payment_status_success(self, client, app_context, test_payment, auth_headers):
        """Test payment status retrieval."""
        response = client.get(f'/api/payments/status/{test_payment.stripe_session_id}',
                            headers=auth_headers)
        
        assert response.status_code == 200
        data = response.get_json()
        assert 'payment' in data
        assert data['payment']['status'] == test_payment.status


class TestJobEndpoints:
    """Test job processing API endpoints."""
    
    @patch('app.jobs.queue.enqueue_job')
    def test_submit_render_job_success(self, mock_enqueue, client, app_context, 
                                     test_user, test_payment, auth_headers, sample_audio_file):
        """Test successful render job submission."""
        # Mock job enqueueing
        from unittest.mock import Mock
        mock_job = Mock()
        mock_job.id = 'test-job-123'
        mock_enqueue.return_value = mock_job
        
        with open(sample_audio_file, 'rb') as f:
            response = client.post('/api/jobs/submit',
                                 headers=auth_headers,
                                 data={
                                     'audio_file': (f, 'test_audio.mp3'),
                                     'visualizer_type': 'bars',
                                     'color_scheme': 'rainbow',
                                     'background': 'dark',
                                     'payment_id': str(test_payment.id)
                                 },
                                 content_type='multipart/form-data')
        
        assert response.status_code == 202
        data = response.get_json()
        assert 'job_id' in data
        assert 'status' in data
        
        # Verify render job was created
        job = RenderJob.query.filter_by(user_id=test_user.id).first()
        assert job is not None
        assert job.payment_id == test_payment.id
    
    def test_submit_render_job_unauthorized(self, client, app_context, sample_audio_file):
        """Test render job submission without authentication."""
        with open(sample_audio_file, 'rb') as f:
            response = client.post('/api/jobs/submit',
                                 data={
                                     'audio_file': (f, 'test_audio.mp3'),
                                     'visualizer_type': 'bars'
                                 },
                                 content_type='multipart/form-data')
        
        assert response.status_code == 401
    
    def test_submit_render_job_no_payment(self, client, app_context, 
                                        auth_headers, sample_audio_file):
        """Test render job submission without valid payment."""
        with open(sample_audio_file, 'rb') as f:
            response = client.post('/api/jobs/submit',
                                 headers=auth_headers,
                                 data={
                                     'audio_file': (f, 'test_audio.mp3'),
                                     'visualizer_type': 'bars',
                                     'payment_id': '999999'  # Non-existent payment
                                 },
                                 content_type='multipart/form-data')
        
        assert response.status_code == 400
        data = response.get_json()
        assert 'error' in data
    
    @patch('app.jobs.queue.get_job_status')
    def test_job_status_success(self, mock_get_status, client, app_context, 
                              test_render_job, auth_headers):
        """Test successful job status retrieval."""
        # Mock job status
        mock_get_status.return_value = {
            'status': 'processing',
            'progress': 50,
            'result': None
        }
        
        response = client.get(f'/api/jobs/status/{test_render_job.id}',
                            headers=auth_headers)
        
        assert response.status_code == 200
        data = response.get_json()
        assert 'status' in data
        assert 'progress' in data
    
    def test_job_status_not_found(self, client, app_context, auth_headers):
        """Test job status retrieval for non-existent job."""
        response = client.get('/api/jobs/status/nonexistent-job',
                            headers=auth_headers)
        
        assert response.status_code == 404
    
    def test_job_download_success(self, client, app_context, test_render_job, auth_headers):
        """Test successful job download link retrieval."""
        response = client.get(f'/api/jobs/download/{test_render_job.id}',
                            headers=auth_headers)
        
        assert response.status_code == 200
        data = response.get_json()
        assert 'download_url' in data
        assert 'expires_at' in data
    
    def test_job_download_not_completed(self, client, app_context, test_user, 
                                      test_payment, auth_headers):
        """Test download link retrieval for incomplete job."""
        from app import db
        
        # Create incomplete job
        incomplete_job = RenderJob(
            user_id=test_user.id,
            payment_id=test_payment.id,
            status='processing',
            audio_filename='processing_audio.mp3',
            render_config={}
        )
        db.session.add(incomplete_job)
        db.session.commit()
        
        response = client.get(f'/api/jobs/download/{incomplete_job.id}',
                            headers=auth_headers)
        
        assert response.status_code == 400
        data = response.get_json()
        assert 'error' in data
        assert 'not completed' in data['error']['message']


class TestUserEndpoints:
    """Test user management API endpoints."""
    
    def test_user_profile_success(self, client, app_context, test_user, 
                                test_payment, test_render_job, auth_headers):
        """Test successful user profile retrieval."""
        response = client.get('/api/user/profile', headers=auth_headers)
        
        assert response.status_code == 200
        data = response.get_json()
        assert 'user' in data
        assert data['user']['email'] == test_user.email
        assert 'statistics' in data['user']
        assert data['user']['statistics']['total_payments'] == 1
        assert data['user']['statistics']['total_render_jobs'] == 1
    
    def test_user_profile_unauthorized(self, client, app_context):
        """Test user profile retrieval without authentication."""
        response = client.get('/api/user/profile')
        
        assert response.status_code == 401
    
    def test_user_history_success(self, client, app_context, test_user, 
                                test_payment, test_render_job, auth_headers):
        """Test successful user history retrieval."""
        response = client.get('/api/user/history', headers=auth_headers)
        
        assert response.status_code == 200
        data = response.get_json()
        assert 'payments' in data
        assert 'render_jobs' in data
        assert len(data['payments']) == 1
        assert len(data['render_jobs']) == 1
        assert data['payments'][0]['id'] == test_payment.id
        assert data['render_jobs'][0]['id'] == test_render_job.id
    
    def test_user_profile_update_success(self, client, app_context, test_user, auth_headers):
        """Test successful user profile update."""
        response = client.put('/api/user/profile',
                            headers=auth_headers,
                            json={
                                'email': 'updated@example.com'
                            })
        
        assert response.status_code == 200
        data = response.get_json()
        assert 'updated_fields' in data
        assert 'email' in data['updated_fields']
        
        # Verify user was updated in database
        updated_user = User.query.get(test_user.id)
        assert updated_user.email == 'updated@example.com'
    
    def test_user_profile_update_invalid_email(self, client, app_context, auth_headers):
        """Test user profile update with invalid email."""
        response = client.put('/api/user/profile',
                            headers=auth_headers,
                            json={
                                'email': 'invalid-email'
                            })
        
        assert response.status_code == 400
        data = response.get_json()
        assert 'error' in data
        assert 'email' in data['error']['message'].lower()


class TestHealthEndpoints:
    """Test health check and monitoring endpoints."""
    
    def test_health_check_success(self, client, app_context):
        """Test successful health check."""
        response = client.get('/api/health')
        
        assert response.status_code == 200
        data = response.get_json()
        assert 'status' in data
        assert data['status'] == 'healthy'
        assert 'timestamp' in data
        assert 'version' in data
    
    @patch('redis.Redis.ping')
    def test_health_check_redis_failure(self, mock_ping, client, app_context):
        """Test health check with Redis failure."""
        mock_ping.side_effect = Exception('Redis connection failed')
        
        response = client.get('/api/health')
        
        assert response.status_code == 503
        data = response.get_json()
        assert data['status'] == 'unhealthy'
        assert 'redis' in data['checks']
        assert data['checks']['redis']['status'] == 'failed'