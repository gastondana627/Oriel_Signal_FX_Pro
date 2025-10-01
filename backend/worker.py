#!/usr/bin/env python3
"""
RQ Worker script for processing background jobs.

This script starts worker processes that listen to Redis queues and execute
background jobs like video rendering, email sending, and file cleanup.

Usage:
    python worker.py                    # Start worker for all queues
    python worker.py video_rendering    # Start worker for specific queue
    python worker.py --burst            # Process jobs and exit (for testing)
"""
import os
import sys
import logging
import signal
from rq import Worker, Connection
from rq.job import Job
from app import create_app
from app.jobs.queue import get_redis_connection, queues, init_queue
from config import config

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

def signal_handler(signum, frame):
    """Handle shutdown signals gracefully."""
    logger.info(f"Received signal {signum}, shutting down worker...")
    sys.exit(0)

def exception_handler(job, exc_type, exc_value, traceback):
    """Handle job exceptions and update job status."""
    logger.error(f"Job {job.id} failed with exception: {exc_value}")
    
    # Update job meta with error information
    job.meta['status'] = 'failed'
    job.meta['error'] = str(exc_value)
    job.meta['error_type'] = exc_type.__name__
    job.save_meta()
    
    # Update database status if it's a render job
    try:
        from app.jobs.jobs import update_render_job_status
        if hasattr(job, 'args') and len(job.args) > 0:
            job_id = job.args[0]  # First argument is usually job_id
            update_render_job_status(job_id, 'failed', error_message=str(exc_value))
    except Exception as e:
        logger.error(f"Failed to update database status for job {job.id}: {e}")
    
    return False  # Don't reraise the exception

def main():
    """Main worker function."""
    # Parse command line arguments
    queue_names = sys.argv[1:] if len(sys.argv) > 1 else list(queues.keys())
    burst_mode = '--burst' in queue_names
    
    if '--burst' in queue_names:
        queue_names.remove('--burst')
    
    if not queue_names:
        queue_names = list(queues.keys())
    
    # Set up signal handlers
    signal.signal(signal.SIGTERM, signal_handler)
    signal.signal(signal.SIGINT, signal_handler)
    
    # Initialize Flask app and job queues
    config_name = os.environ.get('FLASK_ENV', 'development')
    app = create_app(config[config_name])
    
    with app.app_context():
        try:
            # Initialize job queues
            init_queue(app)
            redis_conn = get_redis_connection()
            
            # Get queue objects
            worker_queues = []
            for queue_name in queue_names:
                if queue_name in queues:
                    worker_queues.append(queues[queue_name])
                    logger.info(f"Added queue: {queue_name}")
                else:
                    logger.error(f"Unknown queue: {queue_name}")
                    sys.exit(1)
            
            if not worker_queues:
                logger.error("No valid queues specified")
                sys.exit(1)
            
            # Create and configure worker
            worker = Worker(
                worker_queues,
                connection=redis_conn,
                exception_handlers=[exception_handler]
            )
            
            logger.info(f"Starting worker for queues: {queue_names}")
            logger.info(f"Burst mode: {burst_mode}")
            logger.info(f"Worker PID: {os.getpid()}")
            
            # Start worker
            with Connection(redis_conn):
                worker.work(burst=burst_mode, with_scheduler=True)
                
        except KeyboardInterrupt:
            logger.info("Worker interrupted by user")
        except Exception as e:
            logger.error(f"Worker failed to start: {e}")
            sys.exit(1)
        finally:
            logger.info("Worker shutdown complete")

if __name__ == '__main__':
    main()