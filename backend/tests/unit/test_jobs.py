"""
Unit tests for job processing functionality.
"""
import pytest
from unittest.mock import Mock, patch, MagicMock
from datetime import datetime
import tempfile
import os

from app.models import RenderJob, User, Payment
from app.jobs.jobs import (
    render_video_job,
    send_completion_email,
    cleanup_expired_files,
    validate_audio_file,
    generate_video_config
)
from app.jobs.queue import (
    enqueue_job,
    get_job_status,
    cancel_job,
    retry_failed_job
)
from app.jobs.validation import (
    validate_render_request,
    sanitize_filename,
    check_file_size_limits,
    validate_audio_format
)


class TestJobValidation:
    """Test job validation functions."""
    
    def test_validate_render_request_success(self):
        """Test successful render request validation."""
        request_data = {
            'audio_file': 'test_audio.mp3',
            'visualizer_type': 'bars',
            'color_scheme': 'rainbow',
            'background': 'dark',
            'duration': 180  # 3 minutes
        }
        
        result = validate_render_request(request_data)
        assert result is True
    
    def test_validate_render_request_missing_fields(self):
        """Test render request validation with missing fields."""
        request_data = {
            'audio_file': 'test_audio.mp3',
            # Missing other required fields
        }
        
        with pytest.raises(ValueError) as exc_info:
            validate_render_request(request_data)
        
        assert 'Missing required field' in str(exc_info.value)
    
    def test_validate_render_request_invalid_visualizer(self):
        """Test render request validation with invalid visualizer type."""
        request_data = {
            'audio_file': 'test_audio.mp3',
            'visualizer_type': 'invalid_type',
            'color_scheme': 'rainbow',
            'background': 'dark',
            'duration': 180
        }
        
        with pytest.raises(ValueError) as exc_info:
            validate_render_request(request_data)
        
        assert 'Invalid visualizer type' in str(exc_info.value)
    
    def test_sanitize_filename(self):
        """Test filename sanitization."""
        dangerous_filename = '../../../etc/passwd<script>.mp3'
        safe_filename = sanitize_filename(dangerous_filename)
        
        assert '../' not in safe_filename
        assert '<script>' not in safe_filename
        assert safe_filename.endswith('.mp3')
        assert len(safe_filename) > 0
    
    def test_check_file_size_limits(self, sample_audio_file):
        """Test file size limit checking."""
        # Test with valid file size
        assert check_file_size_limits(sample_audio_file) is True
        
        # Test with oversized file (mock)
        with patch('os.path.getsize', return_value=100 * 1024 * 1024):  # 100MB
            assert check_file_size_limits(sample_audio_file) is False
    
    def test_validate_audio_format(self, sample_audio_file):
        """Test audio format validation."""
        with patch('magic.from_file', return_value='audio/mpeg'):
            assert validate_audio_format(sample_audio_file) is True
        
        with patch('magic.from_file', return_value='video/mp4'):
            assert validate_audio_format(sample_audio_file) is False


class TestJobQueue:
    """Test job queue operations."""
    
    @patch('rq.Queue')
    def test_enqueue_job_success(self, mock_queue_class):
        """Test successful job enqueueing."""
        mock_queue = Mock()
        mock_job = Mock()
        mock_job.id = 'test-job-123'
        
        mock_queue_class.return_value = mock_queue
        mock_queue.enqueue.return_value = mock_job
        
        job = enqueue_job('video_rendering', render_video_job, 'arg1', 'arg2')
        
        assert job.id == 'test-job-123'
        mock_queue.enqueue.assert_called_once()
    
    @patch('rq.Job.fetch')
    def test_get_job_status_success(self, mock_fetch):
        """Test successful job status retrieval."""
        mock_job = Mock()
        mock_job.get_status.return_value = 'queued'
        mock_job.meta = {'progress': 0}
        mock_job.result = None
        mock_job.exc_info = None
        
        mock_fetch.return_value = mock_job
        
        status = get_job_status('test-job-123')
        
        assert status['status'] == 'queued'
        assert status['progress'] == 0
        assert status['result'] is None
    
    @patch('rq.Job.fetch')
    def test_get_job_status_not_found(self, mock_fetch):
        """Test job status retrieval for non-existent job."""
        from rq.exceptions import NoSuchJobError
        mock_fetch.side_effect = NoSuchJobError()
        
        status = get_job_status('nonexistent-job')
        
        assert status is None
    
    @patch('rq.Job.fetch')
    def test_cancel_job_success(self, mock_fetch):
        """Test successful job cancellation."""
        mock_job = Mock()
        mock_job.cancel.return_value = None
        mock_fetch.return_value = mock_job
        
        result = cancel_job('test-job-123')
        
        assert result is True
        mock_job.cancel.assert_called_once()
    
    @patch('rq.Job.fetch')
    def test_retry_failed_job_success(self, mock_fetch):
        """Test successful job retry."""
        mock_job = Mock()
        mock_job.requeue.return_value = None
        mock_fetch.return_value = mock_job
        
        result = retry_failed_job('test-job-123')
        
        assert result is True
        mock_job.requeue.assert_called_once()


class TestVideoRendering:
    """Test video rendering job functionality."""
    
    @patch('app.jobs.jobs.render_video_with_playwright')
    @patch('app.jobs.jobs.upload_to_gcs')
    @patch('app.jobs.jobs.send_completion_email')
    def test_render_video_job_success(self, mock_email, mock_upload, mock_render, 
                                    app_context, test_render_job):
        """Test successful video rendering job."""
        # Mock successful rendering
        mock_render.return_value = '/tmp/rendered_video.mp4'
        mock_upload.return_value = 'https://storage.googleapis.com/bucket/video.mp4'
        mock_email.return_value = True
        
        result = render_video_job(
            test_render_job.id,
            'test_audio.mp3',
            test_render_job.render_config
        )
        
        assert result['status'] == 'completed'
        assert 'video_url' in result
        
        # Verify all steps were called
        mock_render.assert_called_once()
        mock_upload.assert_called_once()
        mock_email.assert_called_once()
    
    @patch('app.jobs.jobs.render_video_with_playwright')
    def test_render_video_job_rendering_failure(self, mock_render, app_context, test_render_job):
        """Test video rendering job with rendering failure."""
        # Mock rendering failure
        mock_render.side_effect = Exception('Rendering failed')
        
        result = render_video_job(
            test_render_job.id,
            'test_audio.mp3',
            test_render_job.render_config
        )
        
        assert result['status'] == 'failed'
        assert 'error' in result
        assert 'Rendering failed' in result['error']
    
    def test_generate_video_config(self):
        """Test video configuration generation."""
        render_params = {
            'visualizer_type': 'bars',
            'color_scheme': 'rainbow',
            'background': 'dark',
            'audio_reactive': True
        }
        
        config = generate_video_config(render_params)
        
        assert config['visualizer_type'] == 'bars'
        assert config['color_scheme'] == 'rainbow'
        assert config['background'] == 'dark'
        assert config['audio_reactive'] is True
        assert 'output_format' in config
        assert 'resolution' in config
    
    def test_validate_audio_file_success(self, sample_audio_file):
        """Test successful audio file validation."""
        with patch('magic.from_file', return_value='audio/mpeg'):
            result = validate_audio_file(sample_audio_file)
            assert result is True
    
    def test_validate_audio_file_invalid_format(self, sample_audio_file):
        """Test audio file validation with invalid format."""
        with patch('magic.from_file', return_value='video/mp4'):
            with pytest.raises(ValueError) as exc_info:
                validate_audio_file(sample_audio_file)
            
            assert 'Invalid audio format' in str(exc_info.value)
    
    def test_validate_audio_file_not_found(self):
        """Test audio file validation with non-existent file."""
        with pytest.raises(FileNotFoundError):
            validate_audio_file('/nonexistent/file.mp3')


class TestEmailNotifications:
    """Test email notification functionality."""
    
    @patch('app.email.service.send_email')
    def test_send_completion_email_success(self, mock_send_email):
        """Test successful completion email sending."""
        mock_send_email.return_value = True
        
        result = send_completion_email(
            'test@example.com',
            'https://storage.googleapis.com/bucket/video.mp3',
            'test-job-123'
        )
        
        assert result is True
        mock_send_email.assert_called_once()
        
        # Verify email content
        call_args = mock_send_email.call_args
        assert 'test@example.com' in call_args[0]
        assert 'Video Ready' in call_args[1]['subject']
    
    @patch('app.email.service.send_email')
    def test_send_completion_email_failure(self, mock_send_email):
        """Test completion email sending failure."""
        mock_send_email.side_effect = Exception('Email service unavailable')
        
        result = send_completion_email(
            'test@example.com',
            'https://storage.googleapis.com/bucket/video.mp3',
            'test-job-123'
        )
        
        assert result is False


class TestFileCleanup:
    """Test file cleanup functionality."""
    
    @patch('app.storage.gcs.delete_file')
    def test_cleanup_expired_files_success(self, mock_delete, app_context):
        """Test successful cleanup of expired files."""
        from app import db
        from datetime import timedelta
        
        # Create expired render job
        expired_job = RenderJob(
            user_id=1,
            payment_id=1,
            status='completed',
            audio_filename='expired_audio.mp3',
            render_config={},
            video_url='https://storage.googleapis.com/bucket/expired_video.mp4',
            created_at=datetime.utcnow() - timedelta(days=31),  # Expired
            completed_at=datetime.utcnow() - timedelta(days=31)
        )
        db.session.add(expired_job)
        db.session.commit()
        
        mock_delete.return_value = True
        
        result = cleanup_expired_files()
        
        assert result['cleaned_count'] > 0
        mock_delete.assert_called()
    
    @patch('app.storage.gcs.delete_file')
    def test_cleanup_expired_files_no_expired(self, mock_delete, app_context):
        """Test cleanup with no expired files."""
        mock_delete.return_value = True
        
        result = cleanup_expired_files()
        
        assert result['cleaned_count'] == 0
        mock_delete.assert_not_called()


class TestRenderJobModel:
    """Test RenderJob model functionality."""
    
    def test_render_job_creation(self, app_context, test_user, test_payment):
        """Test render job model creation."""
        from app import db
        
        job = RenderJob(
            user_id=test_user.id,
            payment_id=test_payment.id,
            status='queued',
            audio_filename='new_audio.mp3',
            render_config={
                'visualizer_type': 'waveform',
                'color_scheme': 'blue'
            }
        )
        
        db.session.add(job)
        db.session.commit()
        
        assert job.id is not None
        assert job.user_id == test_user.id
        assert job.payment_id == test_payment.id
        assert job.status == 'queued'
        assert job.created_at is not None
    
    def test_render_job_relationships(self, app_context, test_render_job, test_user, test_payment):
        """Test render job model relationships."""
        assert test_render_job.user.id == test_user.id
        assert test_render_job.payment.id == test_payment.id
    
    def test_render_job_string_representation(self, app_context, test_render_job):
        """Test render job string representation."""
        expected = f'<RenderJob {test_render_job.id}: {test_render_job.status}>'
        assert str(test_render_job) == expected
    
    def test_render_job_is_completed(self, app_context, test_render_job):
        """Test render job completion status check."""
        # test_render_job has status='completed'
        assert test_render_job.is_completed is True
        
        # Test with queued job
        from app import db
        queued_job = RenderJob(
            user_id=test_render_job.user_id,
            payment_id=test_render_job.payment_id,
            status='queued',
            audio_filename='queued_audio.mp3',
            render_config={}
        )
        db.session.add(queued_job)
        db.session.commit()
        
        assert queued_job.is_completed is False
    
    def test_render_job_duration_calculation(self, app_context, test_render_job):
        """Test render job duration calculation."""
        # Set specific times for testing
        from app import db
        test_render_job.created_at = datetime(2023, 1, 1, 10, 0, 0)
        test_render_job.completed_at = datetime(2023, 1, 1, 10, 5, 30)
        db.session.commit()
        
        duration = test_render_job.processing_duration
        assert duration.total_seconds() == 330  # 5 minutes 30 seconds