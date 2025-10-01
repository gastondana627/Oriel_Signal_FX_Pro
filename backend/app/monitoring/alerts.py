"""
Alert management and notification system.
"""
import logging
from datetime import datetime, timedelta
from enum import Enum
from app.models import SystemHealth, JobMetrics

logger = logging.getLogger(__name__)


class AlertLevel(Enum):
    """Alert severity levels."""
    INFO = "info"
    WARNING = "warning"
    ERROR = "error"
    CRITICAL = "critical"


class AlertManager:
    """Manages system alerts and notifications."""
    
    def __init__(self):
        self.alert_thresholds = {
            'queue_backlog': 50,
            'failure_rate': 20,  # percentage
            'memory_usage': 85,  # percentage
            'cpu_usage': 80,     # percentage
            'disk_usage': 90,    # percentage
            'dead_jobs': 10
        }
    
    def check_alerts(self):
        """
        Check system metrics against thresholds and generate alerts.
        
        Returns:
            list: List of active alerts
        """
        alerts = []
        
        try:
            # Get latest system health data
            latest_health = SystemHealth.query.order_by(
                SystemHealth.timestamp.desc()
            ).first()
            
            if not latest_health:
                return alerts
            
            # Check queue backlogs
            total_queued = (
                latest_health.queue_high_priority_length +
                latest_health.queue_video_rendering_length +
                latest_health.queue_cleanup_length
            )
            
            if total_queued > self.alert_thresholds['queue_backlog']:
                alerts.append({
                    'level': AlertLevel.WARNING if total_queued < 100 else AlertLevel.ERROR,
                    'type': 'queue_backlog',
                    'message': f'High queue backlog: {total_queued} jobs',
                    'value': total_queued,
                    'threshold': self.alert_thresholds['queue_backlog']
                })
            
            # Check system resources
            if latest_health.memory_usage_percent and latest_health.memory_usage_percent > self.alert_thresholds['memory_usage']:
                alerts.append({
                    'level': AlertLevel.ERROR,
                    'type': 'memory_usage',
                    'message': f'High memory usage: {latest_health.memory_usage_percent:.1f}%',
                    'value': latest_health.memory_usage_percent,
                    'threshold': self.alert_thresholds['memory_usage']
                })
            
            if latest_health.cpu_usage_percent and latest_health.cpu_usage_percent > self.alert_thresholds['cpu_usage']:
                alerts.append({
                    'level': AlertLevel.WARNING,
                    'type': 'cpu_usage',
                    'message': f'High CPU usage: {latest_health.cpu_usage_percent:.1f}%',
                    'value': latest_health.cpu_usage_percent,
                    'threshold': self.alert_thresholds['cpu_usage']
                })
            
            if latest_health.disk_usage_percent and latest_health.disk_usage_percent > self.alert_thresholds['disk_usage']:
                alerts.append({
                    'level': AlertLevel.CRITICAL,
                    'type': 'disk_usage',
                    'message': f'Critical disk usage: {latest_health.disk_usage_percent:.1f}%',
                    'value': latest_health.disk_usage_percent,
                    'threshold': self.alert_thresholds['disk_usage']
                })
            
            # Check failed jobs
            if latest_health.failed_jobs_count > self.alert_thresholds['dead_jobs']:
                alerts.append({
                    'level': AlertLevel.WARNING,
                    'type': 'dead_jobs',
                    'message': f'High number of failed jobs: {latest_health.failed_jobs_count}',
                    'value': latest_health.failed_jobs_count,
                    'threshold': self.alert_thresholds['dead_jobs']
                })
            
            # Check job failure rate (last hour)
            failure_rate_alert = self._check_failure_rate()
            if failure_rate_alert:
                alerts.append(failure_rate_alert)
            
            # Check external service status
            if latest_health.redis_status == 'unhealthy':
                alerts.append({
                    'level': AlertLevel.CRITICAL,
                    'type': 'redis_down',
                    'message': 'Redis service is unhealthy',
                    'value': latest_health.redis_status
                })
            
            if latest_health.gcs_status == 'unhealthy':
                alerts.append({
                    'level': AlertLevel.ERROR,
                    'type': 'gcs_down',
                    'message': 'Google Cloud Storage is unhealthy',
                    'value': latest_health.gcs_status
                })
            
            # Add timestamp to all alerts
            for alert in alerts:
                alert['timestamp'] = datetime.utcnow().isoformat()
            
            return alerts
            
        except Exception as e:
            logger.error(f"Failed to check alerts: {e}")
            return [{
                'level': AlertLevel.ERROR,
                'type': 'alert_system_error',
                'message': f'Alert system error: {e}',
                'timestamp': datetime.utcnow().isoformat()
            }]
    
    def _check_failure_rate(self):
        """Check job failure rate in the last hour."""
        try:
            cutoff_time = datetime.utcnow() - timedelta(hours=1)
            
            recent_jobs = JobMetrics.query.filter(
                JobMetrics.created_at >= cutoff_time
            ).all()
            
            if len(recent_jobs) < 5:  # Need minimum sample size
                return None
            
            failed_jobs = len([j for j in recent_jobs if j.status == 'failed'])
            failure_rate = (failed_jobs / len(recent_jobs)) * 100
            
            if failure_rate > self.alert_thresholds['failure_rate']:
                level = AlertLevel.WARNING if failure_rate < 50 else AlertLevel.ERROR
                return {
                    'level': level,
                    'type': 'failure_rate',
                    'message': f'High job failure rate: {failure_rate:.1f}%',
                    'value': failure_rate,
                    'threshold': self.alert_thresholds['failure_rate'],
                    'sample_size': len(recent_jobs)
                }
            
            return None
            
        except Exception as e:
            logger.error(f"Failed to check failure rate: {e}")
            return None
    
    def send_alert(self, alert, recipients=None):
        """
        Send alert notification.
        
        Args:
            alert (dict): Alert information
            recipients (list): List of email addresses to notify
        """
        try:
            if not recipients:
                # Get admin email from config
                import os
                admin_email = os.environ.get('ADMIN_EMAIL')
                if admin_email:
                    recipients = [admin_email]
                else:
                    logger.warning("No alert recipients configured")
                    return
            
            # Format alert message
            subject = f"[{alert['level'].value.upper()}] Oriel Signal FX Pro Alert: {alert['type']}"
            
            message = f"""
Alert Details:
- Type: {alert['type']}
- Level: {alert['level'].value.upper()}
- Message: {alert['message']}
- Timestamp: {alert['timestamp']}
"""
            
            if 'value' in alert and 'threshold' in alert:
                message += f"- Current Value: {alert['value']}\n"
                message += f"- Threshold: {alert['threshold']}\n"
            
            # Send email notification
            try:
                from app.email.service import get_email_service
                email_service = get_email_service()
                
                for recipient in recipients:
                    email_service.send_alert_email(
                        recipient_email=recipient,
                        subject=subject,
                        message=message,
                        alert_level=alert['level'].value
                    )
                
                logger.info(f"Alert sent to {len(recipients)} recipients: {alert['type']}")
                
            except Exception as email_error:
                logger.error(f"Failed to send alert email: {email_error}")
                # Log alert to file as fallback
                self._log_alert_to_file(alert)
            
        except Exception as e:
            logger.error(f"Failed to send alert: {e}")
    
    def _log_alert_to_file(self, alert):
        """Log alert to file as fallback notification method."""
        try:
            import os
            log_dir = os.path.join(os.path.dirname(__file__), '..', '..', 'logs')
            os.makedirs(log_dir, exist_ok=True)
            
            alert_log_file = os.path.join(log_dir, 'alerts.log')
            
            with open(alert_log_file, 'a') as f:
                f.write(f"{alert['timestamp']} [{alert['level'].value.upper()}] {alert['type']}: {alert['message']}\n")
            
            logger.info(f"Alert logged to file: {alert_log_file}")
            
        except Exception as e:
            logger.error(f"Failed to log alert to file: {e}")
    
    def get_alert_history(self, hours=24):
        """
        Get alert history from system health records.
        
        Args:
            hours (int): Number of hours to look back
            
        Returns:
            list: Historical alerts
        """
        try:
            cutoff_time = datetime.utcnow() - timedelta(hours=hours)
            
            health_records = SystemHealth.query.filter(
                SystemHealth.timestamp >= cutoff_time
            ).order_by(SystemHealth.timestamp.desc()).all()
            
            historical_alerts = []
            
            for record in health_records:
                # Simulate alert checking for historical data
                temp_alerts = []
                
                # Check historical thresholds
                total_queued = (
                    record.queue_high_priority_length +
                    record.queue_video_rendering_length +
                    record.queue_cleanup_length
                )
                
                if total_queued > self.alert_thresholds['queue_backlog']:
                    temp_alerts.append({
                        'timestamp': record.timestamp.isoformat(),
                        'type': 'queue_backlog',
                        'level': 'warning' if total_queued < 100 else 'error',
                        'value': total_queued
                    })
                
                if record.memory_usage_percent and record.memory_usage_percent > self.alert_thresholds['memory_usage']:
                    temp_alerts.append({
                        'timestamp': record.timestamp.isoformat(),
                        'type': 'memory_usage',
                        'level': 'error',
                        'value': record.memory_usage_percent
                    })
                
                historical_alerts.extend(temp_alerts)
            
            return historical_alerts
            
        except Exception as e:
            logger.error(f"Failed to get alert history: {e}")
            return []


def send_alert(alert_type, message, level=AlertLevel.WARNING, **kwargs):
    """
    Convenience function to send an alert.
    
    Args:
        alert_type (str): Type of alert
        message (str): Alert message
        level (AlertLevel): Alert severity level
        **kwargs: Additional alert data
    """
    alert_manager = AlertManager()
    
    alert = {
        'type': alert_type,
        'level': level,
        'message': message,
        'timestamp': datetime.utcnow().isoformat(),
        **kwargs
    }
    
    alert_manager.send_alert(alert)