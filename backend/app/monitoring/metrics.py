"""
Metrics collection and performance monitoring.
"""
import os
import psutil
import logging
from datetime import datetime, timedelta
from rq import Worker
from app.models import JobMetrics, SystemHealth, RenderJob, User, db
from app.jobs.queue import get_redis_connection, queues

logger = logging.getLogger(__name__)


class MetricsCollector:
    """Collects and stores system and job metrics."""
    
    def __init__(self):
        self.redis_conn = get_redis_connection()
    
    def collect_job_metrics(self, job_id, job_type, status, duration=None, 
                          queue_wait_time=None, error_message=None):
        """
        Collect metrics for a completed job.
        
        Args:
            job_id (str): Job ID
            job_type (str): Type of job (render_video, send_email, cleanup)
            status (str): Job status (completed, failed)
            duration (float): Job duration in seconds
            queue_wait_time (float): Time spent in queue before processing
            error_message (str): Error message if job failed
        """
        try:
            # Get system resource usage
            process = psutil.Process()
            memory_usage = process.memory_info().rss / 1024 / 1024  # MB
            cpu_usage = process.cpu_percent()
            
            # Create metrics record
            metrics = JobMetrics(
                job_id=job_id,
                job_type=job_type,
                status=status,
                duration_seconds=duration,
                queue_wait_time=queue_wait_time,
                memory_usage_mb=memory_usage,
                cpu_usage_percent=cpu_usage,
                error_message=error_message
            )
            
            db.session.add(metrics)
            db.session.commit()
            
            logger.info(f"Collected metrics for job {job_id}: {status} in {duration}s")
            
        except Exception as e:
            logger.error(f"Failed to collect job metrics for {job_id}: {e}")
            db.session.rollback()
    
    def collect_system_health(self):
        """Collect system health metrics."""
        try:
            # Get queue lengths
            queue_lengths = {}
            for name, queue in queues.items():
                try:
                    queue_lengths[name] = len(queue)
                except Exception as e:
                    logger.warning(f"Failed to get length for queue {name}: {e}")
                    queue_lengths[name] = 0
            
            # Get worker count
            active_workers = 0
            failed_jobs_count = 0
            try:
                workers = Worker.all(connection=self.redis_conn)
                active_workers = len([w for w in workers if w.state == 'busy'])
                
                # Count failed jobs across all queues
                for queue in queues.values():
                    failed_jobs_count += queue.failed_job_registry.count
                    
            except Exception as e:
                logger.warning(f"Failed to get worker metrics: {e}")
            
            # Get database metrics
            total_users = User.query.count()
            active_jobs = RenderJob.query.filter(
                RenderJob.status.in_(['queued', 'processing'])
            ).count()
            
            today = datetime.utcnow().date()
            completed_jobs_today = RenderJob.query.filter(
                RenderJob.status == 'completed',
                RenderJob.completed_at >= today
            ).count()
            
            failed_jobs_today = RenderJob.query.filter(
                RenderJob.status == 'failed',
                RenderJob.created_at >= today
            ).count()
            
            # Get system resource usage
            memory_usage = psutil.virtual_memory().percent
            cpu_usage = psutil.cpu_percent(interval=1)
            disk_usage = psutil.disk_usage('/').percent
            
            # Check external services status
            redis_status = self._check_redis_status()
            gcs_status = self._check_gcs_status()
            sendgrid_status = self._check_sendgrid_status()
            
            # Create health record
            health = SystemHealth(
                queue_high_priority_length=queue_lengths.get('high_priority', 0),
                queue_video_rendering_length=queue_lengths.get('video_rendering', 0),
                queue_cleanup_length=queue_lengths.get('cleanup', 0),
                active_workers=active_workers,
                failed_jobs_count=failed_jobs_count,
                total_users=total_users,
                active_jobs=active_jobs,
                completed_jobs_today=completed_jobs_today,
                failed_jobs_today=failed_jobs_today,
                memory_usage_percent=memory_usage,
                cpu_usage_percent=cpu_usage,
                disk_usage_percent=disk_usage,
                redis_status=redis_status,
                gcs_status=gcs_status,
                sendgrid_status=sendgrid_status
            )
            
            db.session.add(health)
            db.session.commit()
            
            logger.info("Collected system health metrics")
            return health
            
        except Exception as e:
            logger.error(f"Failed to collect system health metrics: {e}")
            db.session.rollback()
            return None
    
    def _check_redis_status(self):
        """Check Redis connection status."""
        try:
            self.redis_conn.ping()
            return 'healthy'
        except Exception:
            return 'unhealthy'
    
    def _check_gcs_status(self):
        """Check Google Cloud Storage status."""
        try:
            from app.storage.gcs import get_gcs_manager
            gcs_manager = get_gcs_manager()
            # Try to list objects (basic connectivity test)
            list(gcs_manager.client.list_blobs(gcs_manager.bucket_name, max_results=1))
            return 'healthy'
        except Exception:
            return 'unhealthy'
    
    def _check_sendgrid_status(self):
        """Check SendGrid status."""
        try:
            from app.email.service import get_email_service
            email_service = get_email_service()
            # Basic configuration check
            if hasattr(email_service, 'sg') and email_service.sg:
                return 'healthy'
            return 'not_configured'
        except Exception:
            return 'unhealthy'
    
    def get_performance_summary(self, hours=24):
        """
        Get performance summary for the last N hours.
        
        Args:
            hours (int): Number of hours to look back
            
        Returns:
            dict: Performance summary
        """
        try:
            cutoff_time = datetime.utcnow() - timedelta(hours=hours)
            
            # Job metrics
            job_metrics = JobMetrics.query.filter(
                JobMetrics.created_at >= cutoff_time
            ).all()
            
            total_jobs = len(job_metrics)
            completed_jobs = len([m for m in job_metrics if m.status == 'completed'])
            failed_jobs = len([m for m in job_metrics if m.status == 'failed'])
            
            # Average durations
            render_jobs = [m for m in job_metrics if m.job_type == 'render_video' and m.duration_seconds]
            avg_render_duration = sum(m.duration_seconds for m in render_jobs) / len(render_jobs) if render_jobs else 0
            
            # System health trends
            health_records = SystemHealth.query.filter(
                SystemHealth.timestamp >= cutoff_time
            ).order_by(SystemHealth.timestamp.desc()).all()
            
            avg_memory_usage = sum(h.memory_usage_percent for h in health_records if h.memory_usage_percent) / len(health_records) if health_records else 0
            avg_cpu_usage = sum(h.cpu_usage_percent for h in health_records if h.cpu_usage_percent) / len(health_records) if health_records else 0
            
            return {
                'period_hours': hours,
                'jobs': {
                    'total': total_jobs,
                    'completed': completed_jobs,
                    'failed': failed_jobs,
                    'success_rate': (completed_jobs / total_jobs * 100) if total_jobs > 0 else 0
                },
                'performance': {
                    'avg_render_duration': avg_render_duration,
                    'avg_memory_usage': avg_memory_usage,
                    'avg_cpu_usage': avg_cpu_usage
                },
                'current_status': health_records[0] if health_records else None
            }
            
        except Exception as e:
            logger.error(f"Failed to get performance summary: {e}")
            return {}


def collect_job_metrics(job_id, job_type, status, **kwargs):
    """Convenience function to collect job metrics."""
    collector = MetricsCollector()
    return collector.collect_job_metrics(job_id, job_type, status, **kwargs)


def collect_system_health():
    """Convenience function to collect system health metrics."""
    collector = MetricsCollector()
    return collector.collect_system_health()