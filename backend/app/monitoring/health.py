"""
System health monitoring and checks.
"""
import logging
from datetime import datetime, timedelta
from app.models import SystemHealth, RenderJob, JobMetrics
from app.jobs.queue import get_redis_connection, queues
from app.monitoring.metrics import MetricsCollector

logger = logging.getLogger(__name__)


class HealthChecker:
    """Performs system health checks and monitoring."""
    
    def __init__(self):
        self.metrics_collector = MetricsCollector()
    
    def check_system_health(self):
        """
        Perform comprehensive system health check.
        
        Returns:
            dict: Health check results
        """
        health_status = {
            'overall_status': 'healthy',
            'timestamp': datetime.utcnow().isoformat(),
            'checks': {}
        }
        
        # Check individual components
        checks = [
            ('database', self._check_database),
            ('redis', self._check_redis),
            ('job_queues', self._check_job_queues),
            ('workers', self._check_workers),
            ('storage', self._check_storage),
            ('email', self._check_email),
            ('job_performance', self._check_job_performance),
            ('system_resources', self._check_system_resources)
        ]
        
        unhealthy_count = 0
        
        for check_name, check_func in checks:
            try:
                result = check_func()
                health_status['checks'][check_name] = result
                
                if result['status'] != 'healthy':
                    unhealthy_count += 1
                    
            except Exception as e:
                logger.error(f"Health check {check_name} failed: {e}")
                health_status['checks'][check_name] = {
                    'status': 'error',
                    'message': str(e)
                }
                unhealthy_count += 1
        
        # Determine overall status
        if unhealthy_count == 0:
            health_status['overall_status'] = 'healthy'
        elif unhealthy_count <= 2:
            health_status['overall_status'] = 'degraded'
        else:
            health_status['overall_status'] = 'unhealthy'
        
        return health_status
    
    def _check_database(self):
        """Check database connectivity and performance."""
        try:
            from app import db
            
            # Test basic connectivity
            db.session.execute('SELECT 1')
            
            # Check for recent activity
            recent_jobs = RenderJob.query.filter(
                RenderJob.created_at >= datetime.utcnow() - timedelta(hours=1)
            ).count()
            
            return {
                'status': 'healthy',
                'message': 'Database connection successful',
                'recent_jobs': recent_jobs
            }
            
        except Exception as e:
            return {
                'status': 'unhealthy',
                'message': f'Database connection failed: {e}'
            }
    
    def _check_redis(self):
        """Check Redis connectivity and queue status."""
        try:
            redis_conn = get_redis_connection()
            redis_conn.ping()
            
            # Get memory usage
            info = redis_conn.info('memory')
            memory_usage = info.get('used_memory_human', 'unknown')
            
            return {
                'status': 'healthy',
                'message': 'Redis connection successful',
                'memory_usage': memory_usage
            }
            
        except Exception as e:
            return {
                'status': 'unhealthy',
                'message': f'Redis connection failed: {e}'
            }
    
    def _check_job_queues(self):
        """Check job queue status and backlogs."""
        try:
            queue_status = {}
            total_queued = 0
            
            for name, queue in queues.items():
                length = len(queue)
                failed_count = queue.failed_job_registry.count
                
                queue_status[name] = {
                    'length': length,
                    'failed_jobs': failed_count
                }
                total_queued += length
            
            # Determine status based on queue lengths
            status = 'healthy'
            message = 'All queues operating normally'
            
            if total_queued > 50:
                status = 'degraded'
                message = f'High queue backlog: {total_queued} jobs'
            elif total_queued > 100:
                status = 'unhealthy'
                message = f'Critical queue backlog: {total_queued} jobs'
            
            return {
                'status': status,
                'message': message,
                'queues': queue_status,
                'total_queued': total_queued
            }
            
        except Exception as e:
            return {
                'status': 'unhealthy',
                'message': f'Queue check failed: {e}'
            }
    
    def _check_workers(self):
        """Check worker status and availability."""
        try:
            from rq import Worker
            redis_conn = get_redis_connection()
            
            workers = Worker.all(connection=redis_conn)
            active_workers = len([w for w in workers if w.state == 'busy'])
            idle_workers = len([w for w in workers if w.state == 'idle'])
            
            total_workers = active_workers + idle_workers
            
            status = 'healthy'
            message = f'{total_workers} workers available'
            
            if total_workers == 0:
                status = 'unhealthy'
                message = 'No workers available'
            elif active_workers == total_workers and total_workers < 3:
                status = 'degraded'
                message = 'All workers busy, may need scaling'
            
            return {
                'status': status,
                'message': message,
                'total_workers': total_workers,
                'active_workers': active_workers,
                'idle_workers': idle_workers
            }
            
        except Exception as e:
            return {
                'status': 'unhealthy',
                'message': f'Worker check failed: {e}'
            }
    
    def _check_storage(self):
        """Check Google Cloud Storage connectivity."""
        try:
            from app.storage.gcs import get_gcs_manager
            gcs_manager = get_gcs_manager()
            
            # Test basic connectivity
            list(gcs_manager.client.list_blobs(gcs_manager.bucket_name, max_results=1))
            
            return {
                'status': 'healthy',
                'message': 'GCS connection successful',
                'bucket': gcs_manager.bucket_name
            }
            
        except Exception as e:
            return {
                'status': 'unhealthy',
                'message': f'GCS connection failed: {e}'
            }
    
    def _check_email(self):
        """Check email service status."""
        try:
            from app.email.service import get_email_service
            email_service = get_email_service()
            
            # Basic configuration check
            if hasattr(email_service, 'sg') and email_service.sg:
                return {
                    'status': 'healthy',
                    'message': 'Email service configured'
                }
            else:
                return {
                    'status': 'degraded',
                    'message': 'Email service not configured'
                }
                
        except Exception as e:
            return {
                'status': 'unhealthy',
                'message': f'Email service check failed: {e}'
            }
    
    def _check_job_performance(self):
        """Check recent job performance metrics."""
        try:
            # Check jobs from last hour
            cutoff_time = datetime.utcnow() - timedelta(hours=1)
            
            recent_jobs = JobMetrics.query.filter(
                JobMetrics.created_at >= cutoff_time
            ).all()
            
            if not recent_jobs:
                return {
                    'status': 'healthy',
                    'message': 'No recent jobs to analyze'
                }
            
            total_jobs = len(recent_jobs)
            failed_jobs = len([j for j in recent_jobs if j.status == 'failed'])
            failure_rate = (failed_jobs / total_jobs) * 100
            
            # Calculate average duration for render jobs
            render_jobs = [j for j in recent_jobs if j.job_type == 'render_video' and j.duration_seconds]
            avg_duration = sum(j.duration_seconds for j in render_jobs) / len(render_jobs) if render_jobs else 0
            
            status = 'healthy'
            message = f'{total_jobs} jobs processed, {failure_rate:.1f}% failure rate'
            
            if failure_rate > 20:
                status = 'degraded'
                message = f'High failure rate: {failure_rate:.1f}%'
            elif failure_rate > 50:
                status = 'unhealthy'
                message = f'Critical failure rate: {failure_rate:.1f}%'
            
            return {
                'status': status,
                'message': message,
                'total_jobs': total_jobs,
                'failed_jobs': failed_jobs,
                'failure_rate': failure_rate,
                'avg_render_duration': avg_duration
            }
            
        except Exception as e:
            return {
                'status': 'unhealthy',
                'message': f'Job performance check failed: {e}'
            }
    
    def _check_system_resources(self):
        """Check system resource usage."""
        try:
            import psutil
            
            memory = psutil.virtual_memory()
            cpu_percent = psutil.cpu_percent(interval=1)
            disk = psutil.disk_usage('/')
            
            status = 'healthy'
            warnings = []
            
            if memory.percent > 85:
                status = 'degraded'
                warnings.append(f'High memory usage: {memory.percent:.1f}%')
            
            if cpu_percent > 80:
                status = 'degraded'
                warnings.append(f'High CPU usage: {cpu_percent:.1f}%')
            
            if disk.percent > 90:
                status = 'unhealthy'
                warnings.append(f'Critical disk usage: {disk.percent:.1f}%')
            
            message = 'System resources normal'
            if warnings:
                message = '; '.join(warnings)
            
            return {
                'status': status,
                'message': message,
                'memory_percent': memory.percent,
                'cpu_percent': cpu_percent,
                'disk_percent': disk.percent
            }
            
        except Exception as e:
            return {
                'status': 'unhealthy',
                'message': f'System resource check failed: {e}'
            }
    
    def check_dead_letter_queue(self):
        """Check for jobs in dead letter queue (failed jobs)."""
        try:
            dead_jobs = {}
            total_dead = 0
            
            for name, queue in queues.items():
                failed_registry = queue.failed_job_registry
                failed_count = failed_registry.count
                
                if failed_count > 0:
                    # Get sample of failed job IDs
                    failed_job_ids = failed_registry.get_job_ids(0, min(5, failed_count))
                    dead_jobs[name] = {
                        'count': failed_count,
                        'sample_job_ids': failed_job_ids
                    }
                
                total_dead += failed_count
            
            status = 'healthy'
            message = 'No dead letter queue issues'
            
            if total_dead > 0:
                status = 'degraded'
                message = f'{total_dead} jobs in dead letter queue'
            
            if total_dead > 20:
                status = 'unhealthy'
                message = f'Critical: {total_dead} jobs in dead letter queue'
            
            return {
                'status': status,
                'message': message,
                'total_dead_jobs': total_dead,
                'dead_jobs_by_queue': dead_jobs
            }
            
        except Exception as e:
            logger.error(f"Dead letter queue check failed: {e}")
            return {
                'status': 'error',
                'message': f'Dead letter queue check failed: {e}'
            }


def check_system_health():
    """Convenience function to perform system health check."""
    checker = HealthChecker()
    return checker.check_system_health()