"""
Job definitions for background processing.
"""
import os
import logging
import tempfile
import shutil
import json
import time
import subprocess
from datetime import datetime, timedelta
from rq import get_current_job
from flask import current_app
from playwright.sync_api import sync_playwright
import ffmpeg

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
    start_time = datetime.utcnow()
    
    try:
        logger.info(f"Starting video render job {job_id} for user {user_id}")
        
        # Update database job status (only if we have Flask app context)
        try:
            update_render_job_status(job_id, 'processing', started_at=start_time)
        except Exception as e:
            logger.warning(f"Could not update database status (testing mode?): {e}")
        
        # Update job meta with progress (only if we have RQ job context)
        if current_job:
            current_job.meta['status'] = 'initializing'
            current_job.meta['progress'] = 0
            current_job.meta['stage'] = 'setup'
            current_job.meta['started_at'] = start_time.isoformat()
            current_job.meta['estimated_duration'] = 120  # 2 minutes estimate
            current_job.save_meta()
        
        # Create temporary directory for processing
        temp_dir = tempfile.mkdtemp(prefix=f'render_{job_id}_')
        logger.info(f"Created temp directory: {temp_dir}")
        
        # Validate audio file exists
        if not os.path.exists(audio_file_path):
            raise FileNotFoundError(f"Audio file not found: {audio_file_path}")
        
        # Update progress
        if current_job:
            current_job.meta['status'] = 'processing'
            current_job.meta['progress'] = 25
            current_job.meta['stage'] = 'validating_audio'
            current_job.save_meta()
        
        # Render video using Playwright and FFmpeg
        video_filename = f"video_{job_id}.mp4"
        video_path = os.path.join(temp_dir, video_filename)
        
        # Copy audio file to temp directory for browser access
        audio_filename = f"audio_{job_id}.wav"
        temp_audio_path = os.path.join(temp_dir, audio_filename)
        shutil.copy2(audio_file_path, temp_audio_path)
        
        if current_job:
            current_job.meta['progress'] = 30
            current_job.meta['stage'] = 'preparing_files'
            current_job.save_meta()
        
        # Render video using headless browser
        video_path = render_video_with_browser(
            temp_audio_path, 
            render_config, 
            video_path, 
            current_job
        )
        
        if current_job:
            current_job.meta['progress'] = 75
            current_job.meta['stage'] = 'uploading_video'
            current_job.save_meta()
        
        # Upload video to Google Cloud Storage
        blob_name = None
        try:
            from app.storage.gcs import get_gcs_manager
            gcs_manager = get_gcs_manager()
            
            # Upload video file
            blob_name = gcs_manager.upload_video(video_path, job_id, user_id)
            
            # Generate download URL (24 hour expiration)
            video_url = gcs_manager.generate_download_url(blob_name, expiration_hours=24)
            
            logger.info(f"Video uploaded to GCS: {blob_name}")
            
        except Exception as gcs_error:
            logger.error(f"Failed to upload video to GCS: {gcs_error}")
            # Fall back to local file URL for development/testing
            video_url = f"file://{video_path}"
        
        # Update database with completion
        try:
            update_render_job_status(job_id, 'completed', video_url=video_url, gcs_blob_name=blob_name)
        except Exception as e:
            logger.warning(f"Could not update database status (testing mode?): {e}")
        
        if current_job:
            current_job.meta['status'] = 'completed'
            current_job.meta['progress'] = 100
            current_job.meta['stage'] = 'completed'
            current_job.meta['video_url'] = video_url
            current_job.meta['completed_at'] = datetime.utcnow().isoformat()
            current_job.meta['duration'] = (datetime.utcnow() - start_time).total_seconds()
            current_job.save_meta()
        
        # Enqueue email notification job (only if we have Flask app context)
        try:
            from app.models import User
            from app.jobs.queue import enqueue_job
            user = User.query.get(user_id)
            if user and user.email:
                enqueue_job(
                    'high_priority',
                    send_completion_email,
                    user.email,
                    video_url,
                    job_id
                )
        except Exception as email_error:
            logger.warning(f"Could not enqueue email job (testing mode?): {email_error}")
            # Don't fail the main job for email issues
        
        logger.info(f"Video render job {job_id} completed successfully")
        
        # Collect job metrics
        try:
            from app.monitoring.metrics import collect_job_metrics
            duration = (datetime.utcnow() - start_time).total_seconds()
            collect_job_metrics(
                job_id=job_id,
                job_type='render_video',
                status='completed',
                duration=duration
            )
        except Exception as metrics_error:
            logger.warning(f"Failed to collect job metrics: {metrics_error}")
        
        return {
            'success': True,
            'job_id': job_id,
            'video_url': video_url,
            'completed_at': datetime.utcnow().isoformat()
        }
        
    except Exception as e:
        logger.error(f"Video render job {job_id} failed: {e}")
        
        # Update database with error
        try:
            update_render_job_status(job_id, 'failed', error_message=str(e))
        except Exception as db_error:
            logger.warning(f"Could not update database status (testing mode?): {db_error}")
        
        # Update job meta with error
        if current_job:
            current_job.meta['status'] = 'failed'
            current_job.meta['error'] = str(e)
            current_job.meta['failed_at'] = datetime.utcnow().isoformat()
            current_job.meta['duration'] = (datetime.utcnow() - start_time).total_seconds()
            current_job.save_meta()
        
        # Collect job metrics for failed job
        try:
            from app.monitoring.metrics import collect_job_metrics
            duration = (datetime.utcnow() - start_time).total_seconds()
            collect_job_metrics(
                job_id=job_id,
                job_type='render_video',
                status='failed',
                duration=duration,
                error_message=str(e)
            )
        except Exception as metrics_error:
            logger.warning(f"Failed to collect job metrics: {metrics_error}")
        
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
        
        # Cleanup uploaded audio file
        if audio_file_path and os.path.exists(audio_file_path):
            try:
                # Remove the audio file and its parent temp directory
                audio_temp_dir = os.path.dirname(audio_file_path)
                if audio_temp_dir and 'audio_upload_' in audio_temp_dir:
                    shutil.rmtree(audio_temp_dir)
                    logger.info(f"Cleaned up audio temp directory: {audio_temp_dir}")
            except Exception as e:
                logger.error(f"Failed to cleanup audio file {audio_file_path}: {e}")

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
        
        # Send email using SendGrid service
        try:
            from app.email import get_email_service
            email_service = get_email_service()
            
            result = email_service.send_video_completion_email(
                user_email=user_email,
                video_url=video_url,
                job_id=job_id
            )
            
            logger.info(f"Completion email sent successfully for job {job_id}")
            return result
            
        except Exception as email_error:
            # If email service is not configured (development), fall back to simulation
            logger.warning(f"Email service not available, simulating email send: {email_error}")
            
            import time
            time.sleep(1)
            
            return {
                'success': True,
                'job_id': job_id,
                'email': user_email,
                'sent_at': datetime.utcnow().isoformat(),
                'simulated': True
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

def cleanup_expired_videos(max_age_days=30):
    """
    Clean up expired videos from Google Cloud Storage and update database.
    
    Args:
        max_age_days (int): Maximum age in days before videos are deleted
        
    Returns:
        dict: Cleanup result
    """
    current_job = get_current_job()
    
    try:
        logger.info(f"Starting cleanup of videos older than {max_age_days} days")
        
        if current_job:
            current_job.meta['status'] = 'cleaning_videos'
            current_job.save_meta()
        
        # Get GCS manager
        from app.storage.gcs import get_gcs_manager
        gcs_manager = get_gcs_manager()
        
        # Clean up expired videos from GCS
        deleted_count, error_count = gcs_manager.cleanup_expired_videos(max_age_days)
        
        # Update database records for expired videos
        cutoff_date = datetime.utcnow() - timedelta(days=max_age_days)
        
        try:
            from app.models import RenderJob
            from app import db
            
            # Find completed jobs older than cutoff date
            expired_jobs = RenderJob.query.filter(
                RenderJob.status == 'completed',
                RenderJob.completed_at < cutoff_date,
                RenderJob.gcs_blob_name.isnot(None)
            ).all()
            
            # Mark videos as expired in database
            for job in expired_jobs:
                job.video_url = None  # Clear the download URL
                # Keep gcs_blob_name for reference but mark as expired
                
            db.session.commit()
            
            logger.info(f"Updated {len(expired_jobs)} database records for expired videos")
            
        except Exception as db_error:
            logger.warning(f"Could not update database records (testing mode?): {db_error}")
        
        logger.info(f"Video cleanup completed: {deleted_count} deleted, {error_count} errors")
        
        return {
            'success': True,
            'deleted_count': deleted_count,
            'error_count': error_count,
            'database_updates': len(expired_jobs) if 'expired_jobs' in locals() else 0,
            'completed_at': datetime.utcnow().isoformat()
        }
        
    except Exception as e:
        logger.error(f"Video cleanup job failed: {e}")
        
        if current_job:
            current_job.meta['status'] = 'failed'
            current_job.meta['error'] = str(e)
            current_job.save_meta()
        
        return {
            'success': False,
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

def render_video_with_browser(audio_path, render_config, output_path, current_job=None):
    """
    Render video using headless browser automation and FFmpeg.
    
    Args:
        audio_path (str): Path to the audio file
        render_config (dict): Visualization configuration
        output_path (str): Path where the final video should be saved
        current_job: RQ job instance for progress updates
        
    Returns:
        str: Path to the rendered video file
    """
    temp_dir = os.path.dirname(output_path)
    raw_video_path = os.path.join(temp_dir, 'raw_recording.webm')
    
    try:
        logger.info(f"Starting browser-based video rendering")
        
        # Update progress
        if current_job:
            current_job.meta['status'] = 'launching_browser'
            current_job.meta['progress'] = 35
            current_job.meta['stage'] = 'launching_browser'
            current_job.save_meta()
        
        # Get audio duration for video length
        audio_duration = get_audio_duration(audio_path)
        logger.info(f"Audio duration: {audio_duration} seconds")
        
        with sync_playwright() as p:
            # Launch browser in headless mode
            browser = p.chromium.launch(
                headless=True,
                args=[
                    '--no-sandbox',
                    '--disable-setuid-sandbox',
                    '--disable-dev-shm-usage',
                    '--disable-gpu',
                    '--disable-web-security',
                    '--allow-file-access-from-files',
                    '--autoplay-policy=no-user-gesture-required'
                ]
            )
            
            try:
                # Create browser context with permissions
                context = browser.new_context(
                    viewport={'width': 1920, 'height': 1080},
                    permissions=['microphone', 'camera']
                )
                
                page = context.new_page()
                
                # Update progress
                if current_job:
                    current_job.meta['status'] = 'loading_visualizer'
                    current_job.meta['progress'] = 45
                    current_job.meta['stage'] = 'loading_visualizer'
                    current_job.save_meta()
                
                # Create a local HTML file with the visualizer
                html_content = create_visualizer_html(audio_path, render_config)
                html_path = os.path.join(temp_dir, 'visualizer.html')
                
                with open(html_path, 'w') as f:
                    f.write(html_content)
                
                # Navigate to the local HTML file
                page.goto(f'file://{html_path}')
                
                # Wait for the visualizer to initialize
                page.wait_for_timeout(2000)
                
                # Update progress
                if current_job:
                    current_job.meta['status'] = 'recording_video'
                    current_job.meta['progress'] = 55
                    current_job.meta['stage'] = 'recording_video'
                    current_job.save_meta()
                
                # Start screen recording
                logger.info("Starting screen recording")
                
                # Use Playwright's video recording feature
                context_with_video = browser.new_context(
                    viewport={'width': 1920, 'height': 1080},
                    record_video_dir=temp_dir,
                    record_video_size={'width': 1920, 'height': 1080}
                )
                
                video_page = context_with_video.new_page()
                video_page.goto(f'file://{html_path}')
                
                # Wait for visualizer to load and start playing
                video_page.wait_for_timeout(2000)
                
                # Trigger audio playback
                video_page.evaluate("document.getElementById('audioPlayer').play()")
                
                # Record for the duration of the audio plus buffer
                recording_duration = int(audio_duration * 1000) + 2000  # Add 2 second buffer
                video_page.wait_for_timeout(recording_duration)
                
                # Close the page to finalize video recording
                video_page.close()
                context_with_video.close()
                
                # Get the recorded video file
                video_files = [f for f in os.listdir(temp_dir) if f.endswith('.webm')]
                if not video_files:
                    raise Exception("No video file was recorded")
                
                raw_video_path = os.path.join(temp_dir, video_files[0])
                logger.info(f"Raw video recorded: {raw_video_path}")
                
            finally:
                browser.close()
        
        # Update progress
        if current_job:
            current_job.meta['status'] = 'encoding_video'
            current_job.meta['progress'] = 65
            current_job.meta['stage'] = 'encoding_video'
            current_job.save_meta()
        
        # Process video with FFmpeg for optimization
        encode_video_with_ffmpeg(raw_video_path, output_path, audio_path)
        
        logger.info(f"Video rendering completed: {output_path}")
        return output_path
        
    except Exception as e:
        logger.error(f"Video rendering failed: {e}")
        raise

def create_visualizer_html(audio_path, render_config):
    """
    Create HTML content for the visualizer with the given audio and configuration.
    
    Args:
        audio_path (str): Path to the audio file
        render_config (dict): Visualization configuration
        
    Returns:
        str: HTML content for the visualizer
    """
    # Convert absolute path to relative for browser access
    audio_filename = os.path.basename(audio_path)
    
    html_template = f"""
    <!DOCTYPE html>
    <html lang="en">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Audio Visualizer</title>
        <style>
            body {{
                margin: 0;
                padding: 0;
                background: black;
                display: flex;
                justify-content: center;
                align-items: center;
                height: 100vh;
                overflow: hidden;
            }}
            canvas {{
                border: none;
                background: black;
            }}
            #audioPlayer {{
                display: none;
            }}
        </style>
    </head>
    <body>
        <canvas id="visualizer" width="1920" height="1080"></canvas>
        <audio id="audioPlayer" src="{audio_filename}" preload="auto"></audio>
        
        <script>
            // Audio visualizer implementation
            const canvas = document.getElementById('visualizer');
            const ctx = canvas.getContext('2d');
            const audio = document.getElementById('audioPlayer');
            
            // Configuration from render_config
            const config = {json.dumps(render_config)};
            
            let audioContext;
            let analyser;
            let dataArray;
            let bufferLength;
            
            function initAudioContext() {{
                audioContext = new (window.AudioContext || window.webkitAudioContext)();
                const source = audioContext.createMediaElementSource(audio);
                analyser = audioContext.createAnalyser();
                
                source.connect(analyser);
                analyser.connect(audioContext.destination);
                
                analyser.fftSize = config.fftSize || 2048;
                bufferLength = analyser.frequencyBinCount;
                dataArray = new Uint8Array(bufferLength);
            }}
            
            function draw() {{
                requestAnimationFrame(draw);
                
                if (!analyser) return;
                
                analyser.getByteFrequencyData(dataArray);
                
                // Clear canvas
                ctx.fillStyle = config.backgroundColor || 'black';
                ctx.fillRect(0, 0, canvas.width, canvas.height);
                
                // Draw visualization based on config
                drawVisualization();
            }}
            
            function drawVisualization() {{
                const barWidth = (canvas.width / bufferLength) * 2.5;
                let barHeight;
                let x = 0;
                
                for (let i = 0; i < bufferLength; i++) {{
                    barHeight = (dataArray[i] / 255) * canvas.height * 0.8;
                    
                    // Color based on frequency
                    const hue = (i / bufferLength) * 360;
                    ctx.fillStyle = `hsl(${{hue}}, 70%, 50%)`;
                    
                    ctx.fillRect(x, canvas.height - barHeight, barWidth, barHeight);
                    x += barWidth + 1;
                }}
            }}
            
            // Initialize when audio can play
            audio.addEventListener('canplaythrough', () => {{
                initAudioContext();
                draw();
            }});
            
            // Handle audio context resume (required for autoplay)
            document.addEventListener('click', () => {{
                if (audioContext && audioContext.state === 'suspended') {{
                    audioContext.resume();
                }}
            }});
        </script>
    </body>
    </html>
    """
    
    return html_template

def get_audio_duration(audio_path):
    """
    Get the duration of an audio file using FFmpeg.
    
    Args:
        audio_path (str): Path to the audio file
        
    Returns:
        float: Duration in seconds
    """
    try:
        probe = ffmpeg.probe(audio_path)
        duration = float(probe['streams'][0]['duration'])
        return duration
    except Exception as e:
        logger.error(f"Failed to get audio duration: {e}")
        # Return default duration if probe fails
        return 30.0

def encode_video_with_ffmpeg(input_path, output_path, audio_path):
    """
    Encode video using FFmpeg with audio synchronization and optimization.
    
    Args:
        input_path (str): Path to the raw video file
        output_path (str): Path for the final encoded video
        audio_path (str): Path to the original audio file
    """
    try:
        logger.info(f"Encoding video with FFmpeg: {input_path} -> {output_path}")
        
        # Create FFmpeg stream for video and audio
        video_stream = ffmpeg.input(input_path)
        audio_stream = ffmpeg.input(audio_path)
        
        # Combine video and audio with optimization settings
        out = ffmpeg.output(
            video_stream,
            audio_stream,
            output_path,
            vcodec='libx264',
            acodec='aac',
            preset='medium',
            crf=23,
            movflags='faststart',
            pix_fmt='yuv420p',
            r=30,  # 30 FPS
            shortest=None  # Match shortest stream duration
        )
        
        # Run FFmpeg
        ffmpeg.run(out, overwrite_output=True, quiet=True)
        
        logger.info(f"Video encoding completed: {output_path}")
        
    except Exception as e:
        logger.error(f"FFmpeg encoding failed: {e}")
        raise

def collect_system_health_job():
    """
    Background job to collect system health metrics.
    """
    current_job = get_current_job()
    
    try:
        logger.info("Starting system health collection job")
        
        if current_job:
            current_job.meta['status'] = 'collecting_metrics'
            current_job.save_meta()
        
        # Collect system health metrics
        from app.monitoring.metrics import collect_system_health
        health_record = collect_system_health()
        
        if health_record:
            logger.info("System health metrics collected successfully")
            
            # Check for alerts
            try:
                from app.monitoring.alerts import AlertManager
                alert_manager = AlertManager()
                alerts = alert_manager.check_alerts()
                
                # Send critical alerts
                critical_alerts = [a for a in alerts if a['level'].value == 'critical']
                for alert in critical_alerts:
                    alert_manager.send_alert(alert)
                
                if alerts:
                    logger.info(f"Found {len(alerts)} active alerts ({len(critical_alerts)} critical)")
                
            except Exception as alert_error:
                logger.warning(f"Failed to check alerts: {alert_error}")
        
        return {
            'success': True,
            'collected_at': datetime.utcnow().isoformat(),
            'health_record_id': health_record.id if health_record else None
        }
        
    except Exception as e:
        logger.error(f"System health collection job failed: {e}")
        
        if current_job:
            current_job.meta['status'] = 'failed'
            current_job.meta['error'] = str(e)
            current_job.save_meta()
        
        return {
            'success': False,
            'error': str(e),
            'failed_at': datetime.utcnow().isoformat()
        }

def cleanup_old_metrics_job(days_to_keep=30):
    """
    Background job to clean up old metrics and health records.
    
    Args:
        days_to_keep (int): Number of days of metrics to keep
    """
    current_job = get_current_job()
    
    try:
        logger.info(f"Starting cleanup of metrics older than {days_to_keep} days")
        
        if current_job:
            current_job.meta['status'] = 'cleaning_metrics'
            current_job.save_meta()
        
        cutoff_date = datetime.utcnow() - timedelta(days=days_to_keep)
        
        # Clean up old job metrics
        from app.models import JobMetrics, SystemHealth, db
        
        old_job_metrics = JobMetrics.query.filter(
            JobMetrics.created_at < cutoff_date
        ).all()
        
        for metric in old_job_metrics:
            db.session.delete(metric)
        
        # Clean up old system health records
        old_health_records = SystemHealth.query.filter(
            SystemHealth.timestamp < cutoff_date
        ).all()
        
        for record in old_health_records:
            db.session.delete(record)
        
        db.session.commit()
        
        logger.info(f"Cleaned up {len(old_job_metrics)} job metrics and {len(old_health_records)} health records")
        
        return {
            'success': True,
            'cleaned_job_metrics': len(old_job_metrics),
            'cleaned_health_records': len(old_health_records),
            'completed_at': datetime.utcnow().isoformat()
        }
        
    except Exception as e:
        logger.error(f"Metrics cleanup job failed: {e}")
        
        if current_job:
            current_job.meta['status'] = 'failed'
            current_job.meta['error'] = str(e)
            current_job.save_meta()
        
        return {
            'success': False,
            'error': str(e),
            'failed_at': datetime.utcnow().isoformat()
        }


def validate_audio_file(file_path):
    """
    Validate an audio file for rendering.
    
    Args:
        file_path: Path to the audio file
        
    Returns:
        bool: True if valid
        
    Raises:
        ValueError: If file is invalid
    """
    if not os.path.exists(file_path):
        raise FileNotFoundError(f"Audio file not found: {file_path}")
    
    # Check file size
    file_size = os.path.getsize(file_path)
    max_size = 50 * 1024 * 1024  # 50MB
    
    if file_size > max_size:
        raise ValueError(f"Audio file too large: {file_size} bytes (max: {max_size})")
    
    if file_size < 1024:  # 1KB minimum
        raise ValueError(f"Audio file too small: {file_size} bytes")
    
    # Check file format using magic numbers
    try:
        import magic
        mime_type = magic.from_file(file_path, mime=True)
        allowed_types = ['audio/mpeg', 'audio/wav', 'audio/mp4', 'audio/flac', 'audio/ogg']
        
        if mime_type not in allowed_types:
            raise ValueError(f"Invalid audio format: {mime_type}")
    
    except ImportError:
        # Fallback to extension check if python-magic not available
        _, ext = os.path.splitext(file_path)
        allowed_extensions = ['.mp3', '.wav', '.m4a', '.flac', '.ogg']
        
        if ext.lower() not in allowed_extensions:
            raise ValueError(f"Invalid audio format: {ext}")
    
    return True


def generate_video_config(render_params):
    """
    Generate video configuration from render parameters.
    
    Args:
        render_params: Dictionary of render parameters
        
    Returns:
        dict: Video configuration
    """
    default_config = {
        'visualizer_type': 'bars',
        'color_scheme': 'rainbow',
        'background': 'dark',
        'audio_reactive': True,
        'output_format': 'mp4',
        'resolution': '1920x1080',
        'fps': 30,
        'quality': 'high'
    }
    
    # Merge with provided parameters
    config = {**default_config, **render_params}
    
    # Validate configuration
    valid_visualizer_types = ['bars', 'waveform', 'circular', 'spectrum']
    if config['visualizer_type'] not in valid_visualizer_types:
        config['visualizer_type'] = 'bars'
    
    valid_color_schemes = ['rainbow', 'blue', 'red', 'green', 'purple', 'custom']
    if config['color_scheme'] not in valid_color_schemes:
        config['color_scheme'] = 'rainbow'
    
    valid_backgrounds = ['dark', 'light', 'transparent', 'custom']
    if config['background'] not in valid_backgrounds:
        config['background'] = 'dark'
    
    return config


def cleanup_expired_files():
    """
    Clean up expired files and return statistics.
    
    Returns:
        dict: Cleanup statistics
    """
    try:
        from app.models import RenderJob
        from app import db
        from datetime import datetime, timedelta
        
        # Find expired jobs (older than 30 days)
        cutoff_date = datetime.utcnow() - timedelta(days=30)
        
        expired_jobs = RenderJob.query.filter(
            RenderJob.status == 'completed',
            RenderJob.completed_at < cutoff_date,
            RenderJob.video_url.isnot(None)
        ).all()
        
        cleaned_count = 0
        
        for job in expired_jobs:
            try:
                # Remove from cloud storage if possible
                if job.gcs_blob_name:
                    from app.storage.gcs import get_gcs_manager
                    gcs_manager = get_gcs_manager()
                    gcs_manager.delete_file(job.gcs_blob_name)
                
                # Clear video URL
                job.video_url = None
                cleaned_count += 1
                
            except Exception as e:
                logger.warning(f"Failed to clean up job {job.id}: {e}")
        
        db.session.commit()
        
        return {
            'success': True,
            'cleaned_count': cleaned_count,
            'total_expired': len(expired_jobs)
        }
        
    except Exception as e:
        logger.error(f"File cleanup failed: {e}")
        return {
            'success': False,
            'cleaned_count': 0,
            'error': str(e)
        }


def update_render_job_status(job_id, status, **kwargs):
    """
    Update render job status in database.
    
    Args:
        job_id: Job ID
        status: New status
        **kwargs: Additional fields to update
    """
    try:
        from app.models import RenderJob
        from app import db
        
        job = RenderJob.query.get(job_id)
        if job:
            job.status = status
            
            for key, value in kwargs.items():
                if hasattr(job, key):
                    setattr(job, key, value)
            
            db.session.commit()
            
    except Exception as e:
        logger.warning(f"Could not update job status: {e}")


def render_video_with_playwright(audio_path, render_config, output_path):
    """
    Render video using Playwright (alias for render_video_with_browser).
    
    Args:
        audio_path: Path to audio file
        render_config: Render configuration
        output_path: Output video path
        
    Returns:
        str: Path to rendered video
    """
    return render_video_with_browser(audio_path, render_config, output_path)

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