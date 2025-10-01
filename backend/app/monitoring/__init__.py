"""
Monitoring and metrics collection module.
"""
from flask import Blueprint

bp = Blueprint('monitoring', __name__)

from .metrics import MetricsCollector, collect_job_metrics, collect_system_health
from .health import HealthChecker, check_system_health
from .alerts import AlertManager, send_alert

# Import routes to register them with the blueprint
from . import routes

__all__ = [
    'bp',
    'MetricsCollector',
    'collect_job_metrics', 
    'collect_system_health',
    'HealthChecker',
    'check_system_health',
    'AlertManager',
    'send_alert'
]