#!/usr/bin/env python3
"""
Integration test for video rendering job queue.

This test verifies that render jobs can be properly queued and processed
by the worker system.
"""
import os
import sys
import tempfile
import shutil
import logging
import time
from pathlib import Path

# Add the backend directory to Python path
backend_dir = Path(__file__).parent
sys.path.insert(0, str(backend_dir))

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

def create_test_audio_file(output_path, duration=3):
    """Create a test audio file using FFmpeg."""
    try:
        import ffmpeg
        
        # Generate a test tone
        out = ffmpeg.output(
            ffmpeg.input('anullsrc=channel_layout=stereo:sample_rate=44100', f='lavfi'),
            output_path,
            acodec='pcm_s16le',
            t=duration
        )
        
        ffmpeg.run(out, overwrite_output=True, quiet=True)
        logger.info(f"Created test audio file: {output_path}")
        return True
        
    except Exception as e:
        logger.error(f"Failed to create test audio file: {e}")
        return False

def test_render_job_direct():
    """Test the render job function directly (without Redis queue)."""
    temp_dir = None
    
    try:
        # Create temporary directory
        temp_dir = tempfile.mkdtemp(prefix='render_job_test_')
        logger.info(f"Created test directory: {temp_dir}")
        
        # Create test audio file
        audio_path = os.path.join(temp_dir, 'test_audio.wav')
        if not create_test_audio_file(audio_path, duration=3):
            return False
        
        # Test configuration
        render_config = {
            'fftSize': 1024,
            'backgroundColor': 'black',
            'visualizationType': 'bars'
        }
        
        # Import and test the render job function
        from app.jobs.jobs import render_video_job
        
        logger.info("Starting render job test...")
        
        # Call the render job function directly
        result = render_video_job(
            job_id='test_job_123',
            user_id=1,
            audio_file_path=audio_path,
            render_config=render_config
        )
        
        # Check result
        if result and result.get('success'):
            logger.info("✓ Render job completed successfully")
            logger.info(f"Result: {result}")
            return True
        else:
            logger.error(f"✗ Render job failed: {result}")
            return False
            
    except Exception as e:
        logger.error(f"Render job test failed: {e}")
        return False
        
    finally:
        # Cleanup
        if temp_dir and os.path.exists(temp_dir):
            try:
                shutil.rmtree(temp_dir)
                logger.info(f"Cleaned up test directory: {temp_dir}")
            except Exception as e:
                logger.error(f"Failed to cleanup test directory: {e}")

if __name__ == '__main__':
    logger.info("Starting render job integration test...")
    
    success = test_render_job_direct()
    
    if success:
        logger.info("Integration test passed!")
        sys.exit(0)
    else:
        logger.error("Integration test failed!")
        sys.exit(1)