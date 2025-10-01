#!/usr/bin/env python3
"""
Simple test script to verify job queue functionality.
"""
import os
import sys
import time
from app import create_app
from app.jobs.queue import init_queue, enqueue_job, get_job_status
from app.jobs.jobs import send_completion_email
from config import config

def test_job_queue():
    """Test basic job queue functionality."""
    print("Testing Redis job queue system...")
    
    # Initialize Flask app
    config_name = os.environ.get('FLASK_ENV', 'development')
    app = create_app(config[config_name])
    
    with app.app_context():
        try:
            # Initialize job queue
            init_queue(app)
            print("✓ Job queue initialized successfully")
            
            # Enqueue a test job
            job = enqueue_job(
                'high_priority',
                send_completion_email,
                'test@example.com',
                'https://example.com/test-video.mp4',
                'test-job-123'
            )
            print(f"✓ Test job enqueued with ID: {job.id}")
            
            # Check job status
            status = get_job_status(job.id)
            print(f"✓ Job status retrieved: {status['status']}")
            
            print("\nJob queue system is working correctly!")
            print("To process jobs, run: python worker.py")
            
        except Exception as e:
            print(f"✗ Error testing job queue: {e}")
            sys.exit(1)

if __name__ == '__main__':
    test_job_queue()