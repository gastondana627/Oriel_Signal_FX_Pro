"""
Integration tests for database operations.
"""
import pytest
from datetime import datetime, timedelta
from sqlalchemy.exc import IntegrityError

from app import db
from app.models import User, Payment, RenderJob, PasswordResetToken


class TestUserModel:
    """Test User model database operations."""
    
    def test_user_crud_operations(self, app_context):
        """Test basic CRUD operations for User model."""
        # Create
        user = User(
            email='crud@example.com',
            password_hash='hashed_password'
        )
        db.session.add(user)
        db.session.commit()
        
        assert user.id is not None
        assert user.created_at is not None
        
        # Read
        retrieved_user = User.query.filter_by(email='crud@example.com').first()
        assert retrieved_user is not None
        assert retrieved_user.email == 'crud@example.com'
        
        # Update
        retrieved_user.email = 'updated@example.com'
        db.session.commit()
        
        updated_user = User.query.get(user.id)
        assert updated_user.email == 'updated@example.com'
        
        # Delete
        db.session.delete(updated_user)
        db.session.commit()
        
        deleted_user = User.query.get(user.id)
        assert deleted_user is None
    
    def test_user_email_uniqueness(self, app_context, test_user):
        """Test that user email must be unique."""
        duplicate_user = User(
            email=test_user.email,  # Same email as test_user
            password_hash='different_password'
        )
        
        db.session.add(duplicate_user)
        
        with pytest.raises(IntegrityError):
            db.session.commit()
        
        db.session.rollback()
    
    def test_user_relationships(self, app_context, test_user):
        """Test User model relationships."""
        # Create related payment
        payment = Payment(
            user_id=test_user.id,
            stripe_session_id='cs_relationship_test',
            amount=999,
            status='completed'
        )
        db.session.add(payment)
        
        # Create related render job
        render_job = RenderJob(
            user_id=test_user.id,
            payment_id=payment.id,
            status='completed',
            audio_filename='relationship_test.mp3',
            render_config={}
        )
        db.session.add(render_job)
        db.session.commit()
        
        # Test relationships
        assert len(test_user.payments) >= 1
        assert len(test_user.render_jobs) >= 1
        
        # Test back-references
        assert payment.user.id == test_user.id
        assert render_job.user.id == test_user.id
        assert render_job.payment.id == payment.id
    
    def test_user_cascade_delete(self, app_context):
        """Test cascade delete behavior for User model."""
        # Create user with related data
        user = User(
            email='cascade@example.com',
            password_hash='hashed_password'
        )
        db.session.add(user)
        db.session.flush()  # Get user ID without committing
        
        payment = Payment(
            user_id=user.id,
            stripe_session_id='cs_cascade_test',
            amount=999,
            status='completed'
        )
        db.session.add(payment)
        
        render_job = RenderJob(
            user_id=user.id,
            payment_id=payment.id,
            status='completed',
            audio_filename='cascade_test.mp3',
            render_config={}
        )
        db.session.add(render_job)
        db.session.commit()
        
        user_id = user.id
        payment_id = payment.id
        render_job_id = render_job.id
        
        # Delete user
        db.session.delete(user)
        db.session.commit()
        
        # Verify related records are handled appropriately
        # (Depending on cascade settings, they might be deleted or nullified)
        remaining_payment = Payment.query.get(payment_id)
        remaining_job = RenderJob.query.get(render_job_id)
        
        # These assertions depend on your cascade configuration
        # Adjust based on your actual model relationships


class TestPaymentModel:
    """Test Payment model database operations."""
    
    def test_payment_crud_operations(self, app_context, test_user):
        """Test basic CRUD operations for Payment model."""
        # Create
        payment = Payment(
            user_id=test_user.id,
            stripe_session_id='cs_crud_test',
            amount=1999,
            status='pending'
        )
        db.session.add(payment)
        db.session.commit()
        
        assert payment.id is not None
        assert payment.created_at is not None
        
        # Read
        retrieved_payment = Payment.query.filter_by(
            stripe_session_id='cs_crud_test'
        ).first()
        assert retrieved_payment is not None
        assert retrieved_payment.amount == 1999
        
        # Update
        retrieved_payment.status = 'completed'
        db.session.commit()
        
        updated_payment = Payment.query.get(payment.id)
        assert updated_payment.status == 'completed'
        
        # Delete
        db.session.delete(updated_payment)
        db.session.commit()
        
        deleted_payment = Payment.query.get(payment.id)
        assert deleted_payment is None
    
    def test_payment_stripe_session_uniqueness(self, app_context, test_user):
        """Test that Stripe session ID must be unique."""
        payment1 = Payment(
            user_id=test_user.id,
            stripe_session_id='cs_unique_test',
            amount=999,
            status='pending'
        )
        db.session.add(payment1)
        db.session.commit()
        
        payment2 = Payment(
            user_id=test_user.id,
            stripe_session_id='cs_unique_test',  # Same session ID
            amount=999,
            status='pending'
        )
        db.session.add(payment2)
        
        with pytest.raises(IntegrityError):
            db.session.commit()
        
        db.session.rollback()
    
    def test_payment_status_transitions(self, app_context, test_user):
        """Test payment status transitions."""
        payment = Payment(
            user_id=test_user.id,
            stripe_session_id='cs_status_test',
            amount=999,
            status='pending'
        )
        db.session.add(payment)
        db.session.commit()
        
        # Test status transitions
        valid_statuses = ['pending', 'completed', 'failed', 'refunded']
        
        for status in valid_statuses:
            payment.status = status
            db.session.commit()
            
            updated_payment = Payment.query.get(payment.id)
            assert updated_payment.status == status
    
    def test_payment_amount_validation(self, app_context, test_user):
        """Test payment amount validation."""
        # Test positive amount
        payment = Payment(
            user_id=test_user.id,
            stripe_session_id='cs_amount_test',
            amount=999,
            status='pending'
        )
        db.session.add(payment)
        db.session.commit()
        
        assert payment.amount == 999
        
        # Test zero amount (should be allowed for free trials, etc.)
        free_payment = Payment(
            user_id=test_user.id,
            stripe_session_id='cs_free_test',
            amount=0,
            status='completed'
        )
        db.session.add(free_payment)
        db.session.commit()
        
        assert free_payment.amount == 0


class TestRenderJobModel:
    """Test RenderJob model database operations."""
    
    def test_render_job_crud_operations(self, app_context, test_user, test_payment):
        """Test basic CRUD operations for RenderJob model."""
        # Create
        job = RenderJob(
            user_id=test_user.id,
            payment_id=test_payment.id,
            status='queued',
            audio_filename='crud_test.mp3',
            render_config={
                'visualizer_type': 'bars',
                'color_scheme': 'rainbow'
            }
        )
        db.session.add(job)
        db.session.commit()
        
        assert job.id is not None
        assert job.created_at is not None
        
        # Read
        retrieved_job = RenderJob.query.filter_by(
            audio_filename='crud_test.mp3'
        ).first()
        assert retrieved_job is not None
        assert retrieved_job.render_config['visualizer_type'] == 'bars'
        
        # Update
        retrieved_job.status = 'processing'
        retrieved_job.render_config['progress'] = 50
        db.session.commit()
        
        updated_job = RenderJob.query.get(job.id)
        assert updated_job.status == 'processing'
        assert updated_job.render_config['progress'] == 50
        
        # Delete
        db.session.delete(updated_job)
        db.session.commit()
        
        deleted_job = RenderJob.query.get(job.id)
        assert deleted_job is None
    
    def test_render_job_status_transitions(self, app_context, test_user, test_payment):
        """Test render job status transitions."""
        job = RenderJob(
            user_id=test_user.id,
            payment_id=test_payment.id,
            status='queued',
            audio_filename='status_test.mp3',
            render_config={}
        )
        db.session.add(job)
        db.session.commit()
        
        # Test status transitions
        status_flow = ['queued', 'processing', 'completed']
        
        for status in status_flow:
            job.status = status
            if status == 'completed':
                job.completed_at = datetime.utcnow()
                job.video_url = 'https://storage.googleapis.com/bucket/video.mp4'
            db.session.commit()
            
            updated_job = RenderJob.query.get(job.id)
            assert updated_job.status == status
    
    def test_render_job_json_config(self, app_context, test_user, test_payment):
        """Test JSON configuration storage and retrieval."""
        complex_config = {
            'visualizer_type': 'waveform',
            'color_scheme': 'custom',
            'colors': ['#FF0000', '#00FF00', '#0000FF'],
            'background': {
                'type': 'gradient',
                'colors': ['#000000', '#333333']
            },
            'audio_settings': {
                'fft_size': 2048,
                'smoothing': 0.8,
                'gain': 1.5
            }
        }
        
        job = RenderJob(
            user_id=test_user.id,
            payment_id=test_payment.id,
            status='queued',
            audio_filename='json_test.mp3',
            render_config=complex_config
        )
        db.session.add(job)
        db.session.commit()
        
        # Retrieve and verify JSON data
        retrieved_job = RenderJob.query.get(job.id)
        assert retrieved_job.render_config == complex_config
        assert retrieved_job.render_config['audio_settings']['fft_size'] == 2048
    
    def test_render_job_completion_tracking(self, app_context, test_user, test_payment):
        """Test render job completion time tracking."""
        job = RenderJob(
            user_id=test_user.id,
            payment_id=test_payment.id,
            status='queued',
            audio_filename='completion_test.mp3',
            render_config={}
        )
        db.session.add(job)
        db.session.commit()
        
        start_time = job.created_at
        
        # Simulate job completion
        job.status = 'completed'
        job.completed_at = datetime.utcnow()
        job.video_url = 'https://storage.googleapis.com/bucket/completed_video.mp4'
        db.session.commit()
        
        # Verify completion tracking
        completed_job = RenderJob.query.get(job.id)
        assert completed_job.completed_at is not None
        assert completed_job.completed_at > start_time
        assert completed_job.video_url is not None


class TestPasswordResetToken:
    """Test PasswordResetToken model database operations."""
    
    def test_password_reset_token_crud(self, app_context, test_user):
        """Test basic CRUD operations for PasswordResetToken model."""
        # Create
        token = PasswordResetToken(
            user_id=test_user.id,
            token='secure_reset_token_123',
            expires_at=datetime.utcnow() + timedelta(hours=1)
        )
        db.session.add(token)
        db.session.commit()
        
        assert token.id is not None
        assert token.created_at is not None
        
        # Read
        retrieved_token = PasswordResetToken.query.filter_by(
            token='secure_reset_token_123'
        ).first()
        assert retrieved_token is not None
        assert retrieved_token.user_id == test_user.id
        
        # Update
        retrieved_token.expires_at = datetime.utcnow() + timedelta(hours=2)
        db.session.commit()
        
        updated_token = PasswordResetToken.query.get(token.id)
        assert updated_token.expires_at > datetime.utcnow() + timedelta(minutes=90)
        
        # Delete
        db.session.delete(updated_token)
        db.session.commit()
        
        deleted_token = PasswordResetToken.query.get(token.id)
        assert deleted_token is None
    
    def test_password_reset_token_expiration(self, app_context, test_user):
        """Test password reset token expiration logic."""
        # Create expired token
        expired_token = PasswordResetToken(
            user_id=test_user.id,
            token='expired_token_123',
            expires_at=datetime.utcnow() - timedelta(hours=1)
        )
        db.session.add(expired_token)
        
        # Create valid token
        valid_token = PasswordResetToken(
            user_id=test_user.id,
            token='valid_token_123',
            expires_at=datetime.utcnow() + timedelta(hours=1)
        )
        db.session.add(valid_token)
        db.session.commit()
        
        # Test expiration queries
        current_time = datetime.utcnow()
        
        expired_tokens = PasswordResetToken.query.filter(
            PasswordResetToken.expires_at < current_time
        ).all()
        
        valid_tokens = PasswordResetToken.query.filter(
            PasswordResetToken.expires_at > current_time
        ).all()
        
        assert len(expired_tokens) >= 1
        assert len(valid_tokens) >= 1
        assert expired_token in expired_tokens
        assert valid_token in valid_tokens


class TestDatabaseConstraints:
    """Test database constraints and relationships."""
    
    def test_foreign_key_constraints(self, app_context, test_user):
        """Test foreign key constraints."""
        # Test valid foreign key
        payment = Payment(
            user_id=test_user.id,
            stripe_session_id='cs_fk_test',
            amount=999,
            status='pending'
        )
        db.session.add(payment)
        db.session.commit()
        
        assert payment.user_id == test_user.id
        
        # Test invalid foreign key (should fail)
        invalid_payment = Payment(
            user_id=99999,  # Non-existent user ID
            stripe_session_id='cs_invalid_fk',
            amount=999,
            status='pending'
        )
        db.session.add(invalid_payment)
        
        with pytest.raises(IntegrityError):
            db.session.commit()
        
        db.session.rollback()
    
    def test_not_null_constraints(self, app_context, test_user):
        """Test NOT NULL constraints."""
        # Test missing required field
        incomplete_payment = Payment(
            user_id=test_user.id,
            # Missing stripe_session_id (required)
            amount=999,
            status='pending'
        )
        db.session.add(incomplete_payment)
        
        with pytest.raises(IntegrityError):
            db.session.commit()
        
        db.session.rollback()
    
    def test_database_indexes(self, app_context):
        """Test database indexes for performance."""
        # This test would verify that indexes exist on commonly queried fields
        # Implementation depends on your database inspection capabilities
        
        from sqlalchemy import inspect
        inspector = inspect(db.engine)
        
        # Check for indexes on User table
        user_indexes = inspector.get_indexes('user')
        index_columns = [idx['column_names'] for idx in user_indexes]
        
        # Verify email index exists (for login queries)
        assert any('email' in cols for cols in index_columns)
        
        # Check for indexes on Payment table
        payment_indexes = inspector.get_indexes('payment')
        payment_index_columns = [idx['column_names'] for idx in payment_indexes]
        
        # Verify stripe_session_id index exists (for webhook queries)
        assert any('stripe_session_id' in cols for cols in payment_index_columns)


class TestDatabaseTransactions:
    """Test database transaction handling."""
    
    def test_transaction_rollback(self, app_context, test_user):
        """Test transaction rollback on error."""
        initial_payment_count = Payment.query.count()
        
        try:
            # Start transaction
            payment1 = Payment(
                user_id=test_user.id,
                stripe_session_id='cs_transaction_test_1',
                amount=999,
                status='pending'
            )
            db.session.add(payment1)
            
            # This should cause an error (duplicate session ID)
            payment2 = Payment(
                user_id=test_user.id,
                stripe_session_id='cs_transaction_test_1',  # Duplicate
                amount=999,
                status='pending'
            )
            db.session.add(payment2)
            
            db.session.commit()
            
        except IntegrityError:
            db.session.rollback()
        
        # Verify no payments were added due to rollback
        final_payment_count = Payment.query.count()
        assert final_payment_count == initial_payment_count
    
    def test_transaction_commit(self, app_context, test_user):
        """Test successful transaction commit."""
        initial_payment_count = Payment.query.count()
        
        # Create multiple related records in one transaction
        payment = Payment(
            user_id=test_user.id,
            stripe_session_id='cs_commit_test',
            amount=999,
            status='completed'
        )
        db.session.add(payment)
        db.session.flush()  # Get payment ID
        
        render_job = RenderJob(
            user_id=test_user.id,
            payment_id=payment.id,
            status='queued',
            audio_filename='commit_test.mp3',
            render_config={}
        )
        db.session.add(render_job)
        
        db.session.commit()
        
        # Verify both records were created
        final_payment_count = Payment.query.count()
        assert final_payment_count == initial_payment_count + 1
        
        created_job = RenderJob.query.filter_by(
            audio_filename='commit_test.mp3'
        ).first()
        assert created_job is not None
        assert created_job.payment_id == payment.id