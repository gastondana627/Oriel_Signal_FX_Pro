"""
Job definitions for background processing.
"""
import os
import logging
import tempfile
import shutil
from datetime import datetime, timedelta
from rq import get_current_job
from flask import current_app

logger = logging.getLogger(__name__)

def render_video_job(job_id, user_id, audio_file_path, render_config):
    """
    Background job for rendering video from audio and visualization config.
    
    Args:
        job_id (str): Unique job identifier
        user_id (int): User ID who requested the render
        audio_file_path (str): Path to the uploaded audio file
        render_config (dict): Visualization configuration parameters
        
    Returns:
        dict: Job result with video URL or error information
    """
    current_job = get_current_job()
    temp_dir = None
    
    try:
        logger.info(f"Starting video render job {job_id} for user {user_id}")
        
        # Update job meta with progress
        current_job.meta['status'] = 'initializing'
        current_job.meta['progress'] = 0
        current_job.save_meta()
        
        # Create temporary directory for processing
        temp_dir = tempfile.mkdtemp(prefix=f'render_{job_id}_')
        logger.info(f"Created temp directory: {temp_dir}")
        
        # Validate audio file exists
        if not os.path.exists(audio_file_path):
            raise FileNotFoundError(f"Audio file not found: {audio_file_path}")
        
        # Update progress
        current_job.meta['status'] = 'processing'
        current_job.meta['progress'] = 25
        current_job.save_meta()
        
        # TODO: Implement actual video rendering logic
        # This will be implemented in task 7 (video rendering worker process)
        # For now, simulate processing time and return placeholder
        import time
        time.sleep(2)  # Simulate processing
        
        current_job.meta['progress'] = 50
        current_job.save_meta()
        
        # Simulate video generation
        video_filename = f"video_{job_id}.mp4"
        video_path = os.path.join(temp_dir, video_filename)
        
        # Create placeholder video file (will be replaced with actual rendering)
        with open(video_path, 'w') as f:
            f.write("placeholder video content")
        
        current_job.meta['progress'] = 75
        current_job.save_meta()
        
        # TODO: Upload to Google Cloud Storage (task 8)
        # For now, return placeholder URL
        video_url = f"https://storage.googleapis.com/placeholder/{video_filename}"
        
        current_job.meta['status'] = 'completed'
        current_job.meta['progress'] = 100
        current_job.meta['video_url'] = video_url
        current_job.save_meta()
        
        logger.info(f"Video render job {job_id} completed successfully")
        
        return {
            'success': True,
            'job_id': job_id,
            'video_url': video_url,
            'completed_at': datetime.utcnow().isoformat()
        }
        
    except Exception as e:
        logger.error(f"Video render job {job_id} failed: {e}")
        
        # Update job meta with error
        if current_job:
            current_job.meta['status'] = 'failed'
            current_job.meta['error'] = str(e)
            current_job.save_meta()
        
        return {
            'success': False,
            'job_id': job_id,
            'error': str(e),
            'failed_at': datetime.utcnow().isoformat()
        }
        
    finally:
        # Cleanup temporary directory
        if temp_dir and os.path.exists(temp_dir):
            try:
                shutil.rmtree(temp_dir)
                logger.info(f"Cleaned up temp directory: {temp_dir}")
            except Exception as e:
                logger.error(f"Failed to cleanup temp directory {temp_dir}: {e}")

def send_completion_email(user_email, video_url, job_id):
    """
    Send email notification when video rendering is complete.
    
    Args:
        user_email (str): User's email address
        video_url (str): URL to download the rendered video
        job_id (str): Job ID for reference
        
    Returns:
        dict: Email sending result
    """
    current_job = get_current_job()
    
    try:
        logger.info(f"Sending completion email for job {job_id} to {user_email}")
        
        # Update job meta
        if current_job:
            current_job.meta['status'] = 'sending_email'
            current_job.save_meta()
        
        # TODO: Implement actual email sending (task 9)
        # For now, simulate email sending
        import time
        time.sleep(1)
        
        logger.info(f"Completion email sent successfully for job {job_id}")
        
        return {
            'success': True,
            'job_id': job_id,
            'email': user_email,
            'sent_at': datetime.utcnow().isoformat()
        }
        
    except Exception as e:
        logger.error(f"Failed to send completion email for job {job_id}: {e}")
        
        if current_job:
            current_job.meta['status'] = 'email_failed'
            current_job.meta['error'] = str(e)
            current_job.save_meta()
        
        return {
            'success': False,
            'job_id': job_id,
            'error': str(e),
            'failed_at': datetime.utcnow().isoformat()
        }

def cleanup_files(file_paths, max_age_days=30):
    """
    Clean up old files and temporary directories.
    
    Args:
        file_paths (list): List of file paths to check for cleanup
        max_age_days (int): Maximum age in days before files are deleted
        
    Returns:
        dict: Cleanup result
    """
    current_job = get_current_job()
    cleaned_files = []
    errors = []
    
    try:
        logger.info(f"Starting cleanup job for {len(file_paths)} files")
        
        if current_job:
            current_job.meta['status'] = 'cleaning'
            current_job.save_meta()
        
        cutoff_date = datetime.utcnow() - timedelta(days=max_age_days)
        
        for file_path in file_paths:
            try:
                if os.path.exists(file_path):
                    # Check file age
                    file_mtime = datetime.fromtimestamp(os.path.getmtime(file_path))
                    
                    if file_mtime < cutoff_date:
                        os.remove(file_path)
                        cleaned_files.append(file_path)
                        logger.info(f"Cleaned up old file: {file_path}")
                    
            except Exception as e:
                error_msg = f"Failed to cleanup {file_path}: {e}"
                errors.append(error_msg)
                logger.error(error_msg)
        
        logger.info(f"Cleanup job completed. Cleaned {len(cleaned_files)} files, {len(errors)} errors")
        
        return {
            'success': True,
            'cleaned_files': cleaned_files,
            'errors': errors,
            'completed_at': datetime.utcnow().isoformat()
        }
        
    except Exception as e:
        logger.error(f"Cleanup job failed: {e}")
        
        if current_job:
            current_job.meta['status'] = 'failed'
            current_job.meta['error'] = str(e)
            current_job.save_meta()
        
        return {
            'success': False,
            'error': str(e),
            'failed_at': datetime.utcnow().isoformat()
        }

def update_render_job_status(job_id, status, **kwargs):
    """
    Update render job status in database.
    
    Args:
        job_id (str): Job ID
        status (str): New status
        **kwargs: Additional fields to update
    """
    try:
        # Import here to avoid circular imports
        from app.models import RenderJob
        from app import db
        
        render_job = RenderJob.query.filter_by(id=job_id).first()
        if render_job:
            render_job.status = status
            
            # Update additional fields
            for key, value in kwargs.items():
                if hasattr(render_job, key):
                    setattr(render_job, key, value)
            
            if status == 'completed':
                render_job.completed_at = datetime.utcnow()
            
            db.session.commit()
            logger.info(f"Updated render job {job_id} status to {status}")
        else:
            logger.error(f"Render job {job_id} not found in database")
            
    except Exception as e:
        logger.error(f"Failed to update render job {job_id} status: {e}")
        # Don't raise exception to avoid failing the main job