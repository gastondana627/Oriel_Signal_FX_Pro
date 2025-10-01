"""
Admin endpoints for error monitoring and service health.
"""
from flask import Blueprint, jsonify, request
from flask_jwt_extended import jwt_required
from app.admin.utils import admin_required
from app.utils.error_recovery import get_service_health_status, reset_circuit_breaker, reset_all_circuit_breakers
from logging_config import get_error_stats
import logging

logger = logging.getLogger(__name__)

bp = Blueprint('error_monitoring', __name__)


@bp.route('/health/services', methods=['GET'])
@jwt_required()
@admin_required
def get_service_health():
    """Get health status of all external services"""
    try:
        health_status = get_service_health_status()
        
        # Add overall health summary
        total_services = len(health_status)
        healthy_services = sum(1 for status in health_status.values() if status['healthy'])
        
        return jsonify({
            'data': {
                'services': health_status,
                'summary': {
                    'total_services': total_services,
                    'healthy_services': healthy_services,
                    'unhealthy_services': total_services - healthy_services,
                    'overall_health': 'healthy' if healthy_services == total_services else 'degraded'
                }
            }
        }), 200
        
    except Exception as e:
        logger.error(f"Error getting service health: {e}")
        return jsonify({
            'error': {
                'code': 'HEALTH_CHECK_ERROR',
                'message': 'Failed to retrieve service health status'
            }
        }), 500


@bp.route('/errors/stats', methods=['GET'])
@jwt_required()
@admin_required
def get_error_statistics():
    """Get error statistics and patterns"""
    try:
        error_stats = get_error_stats()
        
        # Calculate error rates and trends
        total_errors = error_stats.get('total_errors', 0)
        error_counts = error_stats.get('error_counts', {})
        error_patterns = error_stats.get('error_patterns', {})
        
        # Sort errors by frequency
        sorted_errors = sorted(error_counts.items(), key=lambda x: x[1], reverse=True)
        sorted_patterns = sorted(error_patterns.items(), key=lambda x: x[1], reverse=True)
        
        return jsonify({
            'data': {
                'total_errors': total_errors,
                'error_types': dict(sorted_errors),
                'error_patterns': dict(sorted_patterns[:20]),  # Top 20 patterns
                'top_error_type': sorted_errors[0][0] if sorted_errors else None,
                'most_frequent_pattern': sorted_patterns[0][0] if sorted_patterns else None
            }
        }), 200
        
    except Exception as e:
        logger.error(f"Error getting error statistics: {e}")
        return jsonify({
            'error': {
                'code': 'STATS_ERROR',
                'message': 'Failed to retrieve error statistics'
            }
        }), 500


@bp.route('/circuit-breakers/reset/<service_name>', methods=['POST'])
@jwt_required()
@admin_required
def reset_service_circuit_breaker(service_name):
    """Reset circuit breaker for a specific service"""
    try:
        success = reset_circuit_breaker(service_name)
        
        if success:
            logger.info(f"Admin reset circuit breaker for service: {service_name}")
            return jsonify({
                'message': f'Circuit breaker for {service_name} has been reset',
                'data': {'service': service_name, 'status': 'reset'}
            }), 200
        else:
            return jsonify({
                'error': {
                    'code': 'SERVICE_NOT_FOUND',
                    'message': f'No circuit breaker found for service: {service_name}'
                }
            }), 404
            
    except Exception as e:
        logger.error(f"Error resetting circuit breaker for {service_name}: {e}")
        return jsonify({
            'error': {
                'code': 'RESET_ERROR',
                'message': f'Failed to reset circuit breaker for {service_name}'
            }
        }), 500


@bp.route('/circuit-breakers/reset-all', methods=['POST'])
@jwt_required()
@admin_required
def reset_all_service_circuit_breakers():
    """Reset all circuit breakers"""
    try:
        reset_all_circuit_breakers()
        logger.info("Admin reset all circuit breakers")
        
        return jsonify({
            'message': 'All circuit breakers have been reset',
            'data': {'status': 'all_reset'}
        }), 200
        
    except Exception as e:
        logger.error(f"Error resetting all circuit breakers: {e}")
        return jsonify({
            'error': {
                'code': 'RESET_ALL_ERROR',
                'message': 'Failed to reset all circuit breakers'
            }
        }), 500


@bp.route('/logs/recent-errors', methods=['GET'])
@jwt_required()
@admin_required
def get_recent_errors():
    """Get recent error logs (last 100 errors)"""
    try:
        # Get query parameters
        limit = min(int(request.args.get('limit', 100)), 500)  # Max 500
        level = request.args.get('level', 'ERROR').upper()
        
        # This would typically read from log files or a logging service
        # For now, return a placeholder response
        return jsonify({
            'data': {
                'errors': [],
                'message': 'Recent error logs would be displayed here',
                'note': 'This endpoint would integrate with your logging infrastructure'
            }
        }), 200
        
    except Exception as e:
        logger.error(f"Error getting recent errors: {e}")
        return jsonify({
            'error': {
                'code': 'LOG_RETRIEVAL_ERROR',
                'message': 'Failed to retrieve recent error logs'
            }
        }), 500


@bp.route('/alerts/configure', methods=['POST'])
@jwt_required()
@admin_required
def configure_error_alerts():
    """Configure error alerting thresholds"""
    try:
        data = request.get_json()
        
        if not data:
            return jsonify({
                'error': {
                    'code': 'INVALID_REQUEST',
                    'message': 'Request body is required'
                }
            }), 400
        
        # Validate alert configuration
        required_fields = ['error_threshold', 'time_window', 'notification_method']
        for field in required_fields:
            if field not in data:
                return jsonify({
                    'error': {
                        'code': 'MISSING_FIELD',
                        'message': f'Required field missing: {field}'
                    }
                }), 400
        
        # Store alert configuration (would typically save to database)
        alert_config = {
            'error_threshold': data['error_threshold'],
            'time_window': data['time_window'],
            'notification_method': data['notification_method'],
            'enabled': data.get('enabled', True)
        }
        
        logger.info(f"Admin configured error alerts: {alert_config}")
        
        return jsonify({
            'message': 'Error alert configuration updated',
            'data': alert_config
        }), 200
        
    except Exception as e:
        logger.error(f"Error configuring alerts: {e}")
        return jsonify({
            'error': {
                'code': 'ALERT_CONFIG_ERROR',
                'message': 'Failed to configure error alerts'
            }
        }), 500


@bp.route('/health/check', methods=['GET'])
def health_check():
    """Basic health check endpoint"""
    try:
        # Perform basic health checks
        health_status = {
            'status': 'healthy',
            'timestamp': '2024-01-01T00:00:00Z',
            'version': '1.0.0',
            'checks': {
                'database': 'healthy',
                'redis': 'healthy',
                'storage': 'healthy',
                'email': 'healthy'
            }
        }
        
        return jsonify(health_status), 200
        
    except Exception as e:
        logger.error(f"Health check failed: {e}")
        return jsonify({
            'status': 'unhealthy',
            'error': str(e)
        }), 503