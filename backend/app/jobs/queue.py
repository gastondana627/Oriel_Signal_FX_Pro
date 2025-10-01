"""
Redis queue configuration and management.
"""
import redis
from rq import Queue, Worker, Connection
from flask import current_app
import logging

logger = logging.getLogger(__name__)

# Global Redis connection
redis_conn = None

# Queue instances with different priority levels
queues = {}

def init_queue(app):
    """Initialize Redis connection and job queues."""
    global redis_conn, queues
    
    try:
        # Create Redis connection
        redis_url = app.config.get('REDIS_URL', 'redis://localhost:6379/0')
        redis_conn = redis.from_url(redis_url, decode_responses=True)
        
        # Test connection
        redis_conn.ping()
        logger.info(f"Connected to Redis at {redis_url}")
        
        # Initialize queues with different priority levels
        queues = {
            'high_priority': Queue('high_priority', connection=redis_conn, default_timeout=300),  # 5 minutes
            'video_rendering': Queue('video_rendering', connection=redis_conn, default_timeout=600),  # 10 minutes
            'cleanup': Queue('cleanup', connection=redis_conn, default_timeout=120)  # 2 minutes
        }
        
        logger.info("Job queues initialized successfully")
        
    except redis.ConnectionError as e:
        logger.error(f"Failed to connect to Redis: {e}")
        raise
    except Exception as e:
        logger.error(f"Error initializing job queues: {e}")
        raise

def get_queue(queue_name='video_rendering'):
    """Get a specific queue by name."""
    if queue_name not in queues:
        raise ValueError(f"Queue '{queue_name}' not found. Available queues: {list(queues.keys())}")
    return queues[queue_name]

def get_redis_connection():
    """Get the Redis connection instance."""
    return redis_conn

def enqueue_job(queue_name, func, *args, **kwargs):
    """
    Enqueue a job to a specific queue.
    
    Args:
        queue_name (str): Name of the queue ('high_priority', 'video_rendering', 'cleanup')
        func: Function to execute
        *args: Arguments for the function
        **kwargs: Keyword arguments for the function
        
    Returns:
        Job: RQ Job instance
    """
    try:
        queue = get_queue(queue_name)
        job = queue.enqueue(func, *args, **kwargs)
        logger.info(f"Job {job.id} enqueued to {queue_name} queue")
        return job
    except Exception as e:
        logger.error(f"Failed to enqueue job to {queue_name}: {e}")
        raise

def get_job_status(job_id):
    """
    Get the status of a job by ID.
    
    Args:
        job_id (str): Job ID
        
    Returns:
        dict: Job status information
    """
    try:
        from rq.job import Job
        job = Job.fetch(job_id, connection=redis_conn)
        
        return {
            'id': job.id,
            'status': job.get_status(),
            'result': job.result,
            'exc_info': job.exc_info,
            'created_at': job.created_at.isoformat() if job.created_at else None,
            'started_at': job.started_at.isoformat() if job.started_at else None,
            'ended_at': job.ended_at.isoformat() if job.ended_at else None,
            'meta': job.meta
        }
    except Exception as e:
        logger.error(f"Failed to get job status for {job_id}: {e}")
        return {
            'id': job_id,
            'status': 'not_found',
            'error': str(e)
        }

def get_queue_info():
    """Get information about all queues."""
    info = {}
    for name, queue in queues.items():
        try:
            info[name] = {
                'length': len(queue),
                'failed_jobs': queue.failed_job_registry.count,
                'started_jobs': queue.started_job_registry.count,
                'finished_jobs': queue.finished_job_registry.count
            }
        except Exception as e:
            logger.error(f"Error getting info for queue {name}: {e}")
            info[name] = {'error': str(e)}
    
    return info

def clear_failed_jobs(queue_name=None):
    """Clear failed jobs from a specific queue or all queues."""
    try:
        if queue_name:
            queue = get_queue(queue_name)
            queue.failed_job_registry.requeue_all()
            logger.info(f"Cleared failed jobs from {queue_name} queue")
        else:
            for name, queue in queues.items():
                queue.failed_job_registry.requeue_all()
                logger.info(f"Cleared failed jobs from {name} queue")
    except Exception as e:
        logger.error(f"Error clearing failed jobs: {e}")
        raise