#!/usr/bin/env python3
"""
Start monitoring and periodic tasks.
"""
import os
import sys
import time
import logging
from datetime import datetime
from app import create_app
from app.scheduler import task_manager
from config import config

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)


def start_monitoring():
    """Start the monitoring system."""
    try:
        # Create app
        config_name = os.environ.get('FLASK_ENV', 'development')
        app = create_app(config_name)
        
        with app.app_context():
            logger.info("Starting monitoring system...")
            
            # Schedule initial monitoring tasks
            health_job_id = task_manager.schedule_health_monitoring(interval_minutes=5)
            cleanup_job_id = task_manager.schedule_metrics_cleanup(interval_hours=24)
            
            if health_job_id:
                logger.info(f"Health monitoring scheduled: {health_job_id}")
            else:
                logger.error("Failed to schedule health monitoring")
            
            if cleanup_job_id:
                logger.info(f"Metrics cleanup scheduled: {cleanup_job_id}")
            else:
                logger.error("Failed to schedule metrics cleanup")
            
            logger.info("Monitoring system started successfully")
            
            # Keep the script running to reschedule tasks as needed
            logger.info("Monitoring scheduler running... Press Ctrl+C to stop")
            
            try:
                while True:
                    time.sleep(60)  # Check every minute
                    
                    # Reschedule tasks if needed
                    rescheduled = task_manager.reschedule_if_needed()
                    if rescheduled:
                        logger.info(f"Rescheduled tasks: {rescheduled}")
                    
            except KeyboardInterrupt:
                logger.info("Monitoring scheduler stopped by user")
                
    except Exception as e:
        logger.error(f"Failed to start monitoring system: {e}")
        sys.exit(1)


if __name__ == '__main__':
    start_monitoring()