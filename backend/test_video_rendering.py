#!/usr/bin/env python3
"""
Test script for video rendering functionality.

This script tests the video rendering worker process without requiring
the full Flask application setup.
"""
import os
import sys
import tempfile
import shutil
import logging
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

def create_test_audio_file(output_path, duration=5):
    """
    Create a test audio file using FFmpeg.
    
    Args:
        output_path (str): Path where to save the test audio
        duration (int): Duration in seconds
    """
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

def test_video_rendering():
    """Test the video rendering functionality."""
    temp_dir = None
    
    try:
        # Create temporary directory
        temp_dir = tempfile.mkdtemp(prefix='video_render_test_')
        logger.info(f"Created test directory: {temp_dir}")
        
        # Create test audio file
        audio_path = os.path.join(temp_dir, 'test_audio.wav')
        if not create_test_audio_file(audio_path, duration=5):
            logger.error("Failed to create test audio file")
            return False
        
        # Test configuration
        render_config = {
            'fftSize': 2048,
            'backgroundColor': 'black',
            'visualizationType': 'bars'
        }
        
        # Output video path
        video_path = os.path.join(temp_dir, 'test_video.mp4')
        
        # Import and test the rendering function
        from app.jobs.jobs import render_video_with_browser
        
        logger.info("Starting video rendering test...")
        result_path = render_video_with_browser(
            audio_path,
            render_config,
            video_path
        )
        
        # Check if video was created
        if os.path.exists(result_path):
            file_size = os.path.getsize(result_path)
            logger.info(f"Video rendering test successful!")
            logger.info(f"Output file: {result_path}")
            logger.info(f"File size: {file_size} bytes")
            return True
        else:
            logger.error("Video file was not created")
            return False
            
    except Exception as e:
        logger.error(f"Video rendering test failed: {e}")
        return False
        
    finally:
        # Cleanup
        if temp_dir and os.path.exists(temp_dir):
            try:
                shutil.rmtree(temp_dir)
                logger.info(f"Cleaned up test directory: {temp_dir}")
            except Exception as e:
                logger.error(f"Failed to cleanup test directory: {e}")

def check_dependencies():
    """Check if all required dependencies are available."""
    logger.info("Checking dependencies...")
    
    try:
        import playwright
        logger.info("✓ Playwright is installed")
    except ImportError:
        logger.error("✗ Playwright is not installed")
        return False
    
    try:
        import ffmpeg
        logger.info("✓ ffmpeg-python is installed")
    except ImportError:
        logger.error("✗ ffmpeg-python is not installed")
        return False
    
    # Check if Playwright browsers are installed
    try:
        from playwright.sync_api import sync_playwright
        with sync_playwright() as p:
            browser = p.chromium.launch(headless=True)
            browser.close()
        logger.info("✓ Playwright Chromium browser is available")
    except Exception as e:
        logger.error(f"✗ Playwright Chromium browser is not available: {e}")
        return False
    
    # Check if FFmpeg binary is available
    try:
        import subprocess
        result = subprocess.run(['ffmpeg', '-version'], 
                              capture_output=True, text=True)
        if result.returncode == 0:
            logger.info("✓ FFmpeg binary is available")
        else:
            logger.error("✗ FFmpeg binary is not available")
            return False
    except FileNotFoundError:
        logger.error("✗ FFmpeg binary is not found in PATH")
        return False
    
    return True

if __name__ == '__main__':
    logger.info("Starting video rendering test suite...")
    
    # Check dependencies first
    if not check_dependencies():
        logger.error("Dependency check failed. Please install missing dependencies.")
        sys.exit(1)
    
    # Run the test
    success = test_video_rendering()
    
    if success:
        logger.info("All tests passed!")
        sys.exit(0)
    else:
        logger.error("Tests failed!")
        sys.exit(1)