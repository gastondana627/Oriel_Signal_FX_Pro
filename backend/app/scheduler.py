"""
Task scheduler for periodic background jobs.
"""
import logging
from datetime import datetime, timedelta
from app.jobs.queue import enqueue_job
from app.jobs.jobs import collect_system_health_job, cleanup_old_metrics_job

logger = logging.getLogger(__name__)


def schedule_monitoring_jobs():
    """Schedule periodic monitoring and maintenance jobs."""
    try:
        # Schedule system health collection every 5 minutes
        health_job = enqueue_job(
            'high_priority',
            collect_system_health_job
        )
        logger.info(f"Scheduled system health collection job: {health_job.id}")
        
        # Schedule metrics cleanup once per day (keep 30 days of data)
        cleanup_job = enqueue_job(
            'cleanup',
            cleanup_old_metrics_job,
            30  # days to keep
        )
        logger.info(f"Scheduled metrics cleanup job: {cleanup_job.id}")
        
        return {
            'health_job_id': health_job.id,
            'cleanup_job_id': cleanup_job.id
        }
        
    except Exception as e:
        logger.error(f"Failed to schedule monitoring jobs: {e}")
        return None


def init_scheduler(app):
    """Initialize the task scheduler with the Flask app."""
    try:
        with app.app_context():
            # Schedule initial monitoring jobs
            schedule_monitoring_jobs()
            logger.info("Task scheduler initialized successfully")
            
    except Exception as e:
        logger.error(f"Failed to initialize task scheduler: {e}")


class PeriodicTaskManager:
    """Manages periodic background tasks."""
    
    def __init__(self):
        self.scheduled_tasks = {}
    
    def schedule_health_monitoring(self, interval_minutes=5):
        """
        Schedule periodic system health monitoring.
        
        Args:
            interval_minutes (int): Interval between health checks in minutes
        """
        try:
            job = enqueue_job(
                'high_priority',
                collect_system_health_job
            )
            
            self.scheduled_tasks['health_monitoring'] = {
                'job_id': job.id,
                'interval_minutes': interval_minutes,
                'last_scheduled': datetime.utcnow(),
                'next_scheduled': datetime.utcnow() + timedelta(minutes=interval_minutes)
            }
            
            logger.info(f"Scheduled health monitoring every {interval_minutes} minutes")
            return job.id
            
        except Exception as e:
            logger.error(f"Failed to schedule health monitoring: {e}")
            return None
    
    def schedule_metrics_cleanup(self, interval_hours=24, days_to_keep=30):
        """
        Schedule periodic metrics cleanup.
        
        Args:
            interval_hours (int): Interval between cleanups in hours
            days_to_keep (int): Number of days of metrics to keep
        """
        try:
            job = enqueue_job(
                'cleanup',
                cleanup_old_metrics_job,
                days_to_keep
            )
            
            self.scheduled_tasks['metrics_cleanup'] = {
                'job_id': job.id,
                'interval_hours': interval_hours,
                'days_to_keep': days_to_keep,
                'last_scheduled': datetime.utcnow(),
                'next_scheduled': datetime.utcnow() + timedelta(hours=interval_hours)
            }
            
            logger.info(f"Scheduled metrics cleanup every {interval_hours} hours")
            return job.id
            
        except Exception as e:
            logger.error(f"Failed to schedule metrics cleanup: {e}")
            return None
    
    def get_scheduled_tasks(self):
        """Get information about scheduled tasks."""
        return self.scheduled_tasks
    
    def reschedule_if_needed(self):
        """Check if any tasks need to be rescheduled."""
        current_time = datetime.utcnow()
        rescheduled = []
        
        for task_name, task_info in self.scheduled_tasks.items():
            if current_time >= task_info['next_scheduled']:
                try:
                    if task_name == 'health_monitoring':
                        job_id = self.schedule_health_monitoring(
                            task_info['interval_minutes']
                        )
                    elif task_name == 'metrics_cleanup':
                        job_id = self.schedule_metrics_cleanup(
                            task_info['interval_hours'],
                            task_info['days_to_keep']
                        )
                    else:
                        continue
                    
                    if job_id:
                        rescheduled.append(task_name)
                        logger.info(f"Rescheduled task: {task_name}")
                        
                except Exception as e:
                    logger.error(f"Failed to reschedule task {task_name}: {e}")
        
        return rescheduled


# Global task manager instance
task_manager = PeriodicTaskManager()