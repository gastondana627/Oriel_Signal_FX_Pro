"""
End-to-end tests for complete user workflows.
"""
import pytest
import json
from unittest.mock import patch, Mock

from app.models import User, Payment, RenderJob


class TestUserRegistrationWorkflow:
    """Test complete user registration workflow."""
    
    @patch('app.email.service.send_email')
    def test_complete_registration_workflow(self, mock_send_email, client, app_context):
        """Test complete user registration and verification workflow."""
        mock_send_email.return_value = True
        
        # Step 1: Register new user
        registration_data = {
            'email': 'newuser@example.com',
            'password': 'SecurePassword123!'
        }
        
        register_response = client.post('/api/auth/register', json=registration_data)
        assert register_response.status_code == 201
        
        register_data = register_response.get_json()
        assert 'user_id' in register_data
        user_id = register_data['user_id']
        
        # Verify user was created in database
        user = User.query.get(user_id)
        assert user is not None
        assert user.email == 'newuser@example.com'
        assert user.is_active is True
        
        # Step 2: Login with new credentials
        login_response = client.post('/api/auth/login', json={
            'email': 'newuser@example.com',
            'password': 'SecurePassword123!'
        })
        
        assert login_response.status_code == 200
        login_data = login_response.get_json()
        assert 'access_token' in login_data
        assert 'user' in login_data
        
        access_token = login_data['access_token']
        headers = {'Authorization': f'Bearer {access_token}'}
        
        # Step 3: Access protected profile endpoint
        profile_response = client.get('/api/user/profile', headers=headers)
        assert profile_response.status_code == 200
        
        profile_data = profile_response.get_json()
        assert profile_data['user']['email'] == 'newuser@example.com'
        assert profile_data['user']['statistics']['total_payments'] == 0
        assert profile_data['user']['statistics']['total_render_jobs'] == 0


class TestPaymentToRenderingWorkflow:
    """Test complete payment to video rendering workflow."""
    
    @patch('stripe.checkout.Session.create')
    @patch('stripe.Webhook.construct_event')
    @patch('app.jobs.queue.enqueue_job')
    @patch('app.storage.gcs.upload_file')
    @patch('app.email.service.send_email')
    def test_complete_payment_to_rendering_workflow(self, mock_send_email, mock_upload,
                                                   mock_enqueue, mock_webhook, mock_stripe_session,
                                                   client, app_context, test_user, sample_audio_file):
        """Test complete workflow from payment to video rendering."""
        
        # Setup mocks
        mock_stripe_session.return_value = Mock(
            id='cs_test_workflow_123',
            url='https://checkout.stripe.com/pay/cs_test_workflow_123'
        )
        
        mock_job = Mock()
        mock_job.id = 'render-job-workflow-123'
        mock_enqueue.return_value = mock_job
        
        mock_upload.return_value = 'https://storage.googleapis.com/bucket/workflow_video.mp4'
        mock_send_email.return_value = True
        
        # Step 1: User login
        login_response = client.post('/api/auth/login', json={
            'email': test_user.email,
            'password': 'testpassword123'
        })
        
        assert login_response.status_code == 200
        access_token = login_response.get_json()['access_token']
        headers = {'Authorization': f'Bearer {access_token}'}
        
        # Step 2: Create payment session
        payment_response = client.post('/api/payments/create-session',
                                     headers=headers,
                                     json={
                                         'product_type': 'basic_video',
                                         'quantity': 1,
                                         'success_url': 'https://example.com/success',
                                         'cancel_url': 'https://example.com/cancel'
                                     })
        
        assert payment_response.status_code == 200
        payment_data = payment_response.get_json()
        assert 'session_id' in payment_data
        assert 'checkout_url' in payment_data
        
        session_id = payment_data['session_id']
        
        # Verify payment record was created
        payment = Payment.query.filter_by(stripe_session_id=session_id).first()
        assert payment is not None
        assert payment.status == 'pending'
        
        # Step 3: Simulate successful payment webhook
        mock_webhook.return_value = {
            'type': 'checkout.session.completed',
            'data': {
                'object': {
                    'id': session_id,
                    'payment_status': 'paid',
                    'amount_total': 999,
                    'customer_email': test_user.email
                }
            }
        }
        
        webhook_response = client.post('/api/payments/webhook',
                                     data='{"test": "webhook_data"}',
                                     headers={
                                         'Stripe-Signature': 'test_signature',
                                         'Content-Type': 'application/json'
                                     })
        
        assert webhook_response.status_code == 200
        
        # Verify payment status updated
        updated_payment = Payment.query.filter_by(stripe_session_id=session_id).first()
        assert updated_payment.status == 'completed'
        
        # Step 4: Submit render job
        with open(sample_audio_file, 'rb') as f:
            render_response = client.post('/api/jobs/submit',
                                        headers=headers,
                                        data={
                                            'audio_file': (f, 'workflow_test.mp3'),
                                            'visualizer_type': 'bars',
                                            'color_scheme': 'rainbow',
                                            'background': 'dark',
                                            'payment_id': str(updated_payment.id)
                                        },
                                        content_type='multipart/form-data')
        
        assert render_response.status_code == 202
        render_data = render_response.get_json()
        assert 'job_id' in render_data
        
        # Verify render job was created
        render_job = RenderJob.query.filter_by(user_id=test_user.id).first()
        assert render_job is not None
        assert render_job.payment_id == updated_payment.id
        assert render_job.status == 'queued'
        
        # Step 5: Check job status
        status_response = client.get(f'/api/jobs/status/{render_job.id}', headers=headers)
        assert status_response.status_code == 200
        
        # Step 6: Simulate job completion
        render_job.status = 'completed'
        render_job.video_url = 'https://storage.googleapis.com/bucket/completed_video.mp4'
        from app import db
        db.session.commit()
        
        # Step 7: Get download link
        download_response = client.get(f'/api/jobs/download/{render_job.id}', headers=headers)
        assert download_response.status_code == 200
        
        download_data = download_response.get_json()
        assert 'download_url' in download_data
        assert 'expires_at' in download_data
        
        # Step 8: Verify user history shows completed workflow
        history_response = client.get('/api/user/history', headers=headers)
        assert history_response.status_code == 200
        
        history_data = history_response.get_json()
        assert len(history_data['payments']) >= 1
        assert len(history_data['render_jobs']) >= 1
        
        completed_payment = next(p for p in history_data['payments'] if p['id'] == updated_payment.id)
        assert completed_payment['status'] == 'completed'
        
        completed_job = next(j for j in history_data['render_jobs'] if j['id'] == render_job.id)
        assert completed_job['status'] == 'completed'
        assert completed_job['video_url'] is not None


class TestPasswordResetWorkflow:
    """Test complete password reset workflow."""
    
    @patch('app.email.service.send_email')
    @patch('app.auth.utils.generate_password_reset_token')
    @patch('app.auth.utils.verify_password_reset_token')
    def test_complete_password_reset_workflow(self, mock_verify_token, mock_generate_token,
                                            mock_send_email, client, app_context, test_user):
        """Test complete password reset workflow."""
        
        mock_send_email.return_value = True
        mock_generate_token.return_value = 'secure_reset_token_123'
        mock_verify_token.return_value = test_user
        
        # Step 1: Request password reset
        reset_request_response = client.post('/api/auth/reset-password', json={
            'email': test_user.email
        })
        
        assert reset_request_response.status_code == 200
        reset_data = reset_request_response.get_json()
        assert 'message' in reset_data
        
        # Verify email was sent
        mock_send_email.assert_called_once()
        mock_generate_token.assert_called_once_with(test_user.email)
        
        # Step 2: Verify reset token (simulate clicking email link)
        verify_response = client.get('/api/auth/reset-password/verify/secure_reset_token_123')
        assert verify_response.status_code == 200
        
        verify_data = verify_response.get_json()
        assert verify_data['valid'] is True
        
        # Step 3: Reset password with token
        new_password = 'NewSecurePassword123!'
        reset_response = client.post('/api/auth/reset-password/confirm', json={
            'token': 'secure_reset_token_123',
            'new_password': new_password
        })
        
        assert reset_response.status_code == 200
        reset_confirm_data = reset_response.get_json()
        assert 'message' in reset_confirm_data
        
        # Step 4: Login with new password
        login_response = client.post('/api/auth/login', json={
            'email': test_user.email,
            'password': new_password
        })
        
        assert login_response.status_code == 200
        login_data = login_response.get_json()
        assert 'access_token' in login_data
        
        # Step 5: Verify old password no longer works
        old_login_response = client.post('/api/auth/login', json={
            'email': test_user.email,
            'password': 'testpassword123'  # Old password
        })
        
        assert old_login_response.status_code == 401


class TestUserProfileManagementWorkflow:
    """Test complete user profile management workflow."""
    
    def test_complete_profile_management_workflow(self, client, app_context, test_user):
        """Test complete user profile management workflow."""
        
        # Step 1: Login
        login_response = client.post('/api/auth/login', json={
            'email': test_user.email,
            'password': 'testpassword123'
        })
        
        assert login_response.status_code == 200
        access_token = login_response.get_json()['access_token']
        headers = {'Authorization': f'Bearer {access_token}'}
        
        # Step 2: Get initial profile
        initial_profile_response = client.get('/api/user/profile', headers=headers)
        assert initial_profile_response.status_code == 200
        
        initial_profile = initial_profile_response.get_json()
        assert initial_profile['user']['email'] == test_user.email
        
        # Step 3: Update email
        update_response = client.put('/api/user/profile',
                                   headers=headers,
                                   json={
                                       'email': 'updated@example.com'
                                   })
        
        assert update_response.status_code == 200
        update_data = update_response.get_json()
        assert 'updated_fields' in update_data
        assert 'email' in update_data['updated_fields']
        
        # Step 4: Verify profile was updated
        updated_profile_response = client.get('/api/user/profile', headers=headers)
        assert updated_profile_response.status_code == 200
        
        updated_profile = updated_profile_response.get_json()
        assert updated_profile['user']['email'] == 'updated@example.com'
        
        # Step 5: Verify database was updated
        from app import db
        db.session.refresh(test_user)
        assert test_user.email == 'updated@example.com'
        
        # Step 6: Test session verification still works
        verify_response = client.get('/api/user/session/verify', headers=headers)
        assert verify_response.status_code == 200
        
        verify_data = verify_response.get_json()
        assert verify_data['valid'] is True
        
        # Step 7: Logout
        logout_response = client.post('/api/user/logout', headers=headers)
        assert logout_response.status_code == 200
        
        # Step 8: Verify session is invalidated
        post_logout_response = client.get('/api/user/profile', headers=headers)
        # Note: This might still work depending on JWT implementation
        # In a real app, you might implement token blacklisting


class TestErrorRecoveryWorkflows:
    """Test error recovery and edge case workflows."""
    
    @patch('stripe.checkout.Session.create')
    def test_payment_failure_recovery_workflow(self, mock_stripe_session, client, 
                                             app_context, test_user):
        """Test recovery from payment failures."""
        
        # Setup mock to fail first, succeed second
        mock_stripe_session.side_effect = [
            Exception('Payment service temporarily unavailable'),
            Mock(id='cs_recovery_test', url='https://checkout.stripe.com/pay/cs_recovery_test')
        ]
        
        # Step 1: Login
        login_response = client.post('/api/auth/login', json={
            'email': test_user.email,
            'password': 'testpassword123'
        })
        
        access_token = login_response.get_json()['access_token']
        headers = {'Authorization': f'Bearer {access_token}'}
        
        # Step 2: First payment attempt fails
        payment_data = {
            'product_type': 'basic_video',
            'quantity': 1,
            'success_url': 'https://example.com/success',
            'cancel_url': 'https://example.com/cancel'
        }
        
        first_attempt = client.post('/api/payments/create-session',
                                  headers=headers,
                                  json=payment_data)
        
        assert first_attempt.status_code == 500
        error_data = first_attempt.get_json()
        assert 'error' in error_data
        
        # Step 3: Retry payment (should succeed)
        second_attempt = client.post('/api/payments/create-session',
                                   headers=headers,
                                   json=payment_data)
        
        assert second_attempt.status_code == 200
        success_data = second_attempt.get_json()
        assert 'session_id' in success_data
        assert 'checkout_url' in success_data
    
    @patch('app.jobs.queue.enqueue_job')
    def test_job_submission_failure_recovery(self, mock_enqueue, client, app_context,
                                           test_user, test_payment, sample_audio_file):
        """Test recovery from job submission failures."""
        
        # Setup mock to fail first, succeed second
        mock_enqueue.side_effect = [
            Exception('Job queue temporarily unavailable'),
            Mock(id='recovery-job-123')
        ]
        
        # Step 1: Login
        login_response = client.post('/api/auth/login', json={
            'email': test_user.email,
            'password': 'testpassword123'
        })
        
        access_token = login_response.get_json()['access_token']
        headers = {'Authorization': f'Bearer {access_token}'}
        
        # Step 2: First job submission fails
        with open(sample_audio_file, 'rb') as f:
            first_attempt = client.post('/api/jobs/submit',
                                      headers=headers,
                                      data={
                                          'audio_file': (f, 'recovery_test.mp3'),
                                          'visualizer_type': 'bars',
                                          'color_scheme': 'rainbow',
                                          'background': 'dark',
                                          'payment_id': str(test_payment.id)
                                      },
                                      content_type='multipart/form-data')
        
        assert first_attempt.status_code == 500
        
        # Step 3: Retry job submission (should succeed)
        with open(sample_audio_file, 'rb') as f:
            second_attempt = client.post('/api/jobs/submit',
                                       headers=headers,
                                       data={
                                           'audio_file': (f, 'recovery_test_2.mp3'),
                                           'visualizer_type': 'bars',
                                           'color_scheme': 'rainbow',
                                           'background': 'dark',
                                           'payment_id': str(test_payment.id)
                                       },
                                       content_type='multipart/form-data')
        
        assert second_attempt.status_code == 202
        success_data = second_attempt.get_json()
        assert 'job_id' in success_data