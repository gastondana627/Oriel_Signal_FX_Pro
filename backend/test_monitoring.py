#!/usr/bin/env python3
"""
Test monitoring system functionality.
"""
import os
import sys
from app import create_app
from config import config

def test_monitoring():
    """Test the monitoring system components."""
    try:
        # Create app
        config_name = os.environ.get('FLASK_ENV', 'development')
        app = create_app(config_name)
        
        with app.app_context():
            print("Testing monitoring system...")
            
            # Test metrics collection
            print("\n1. Testing metrics collection...")
            try:
                from app.monitoring.metrics import collect_job_metrics, collect_system_health
                
                # Test job metrics collection
                collect_job_metrics(
                    job_id='test-job-123',
                    job_type='render_video',
                    status='completed',
                    duration=45.5
                )
                print("✓ Job metrics collection works")
                
                # Test system health collection
                health_record = collect_system_health()
                if health_record:
                    print("✓ System health collection works")
                else:
                    print("✗ System health collection failed")
                
            except Exception as e:
                print(f"✗ Metrics collection error: {e}")
            
            # Test health checks
            print("\n2. Testing health checks...")
            try:
                from app.monitoring.health import check_system_health
                
                health_status = check_system_health()
                print(f"✓ Health check completed: {health_status['overall_status']}")
                print(f"  - Checks performed: {len(health_status['checks'])}")
                
                for check_name, result in health_status['checks'].items():
                    status_icon = "✓" if result['status'] == 'healthy' else "⚠" if result['status'] == 'degraded' else "✗"
                    print(f"  - {check_name}: {status_icon} {result['status']}")
                
            except Exception as e:
                print(f"✗ Health check error: {e}")
            
            # Test alert system
            print("\n3. Testing alert system...")
            try:
                from app.monitoring.alerts import AlertManager
                
                alert_manager = AlertManager()
                alerts = alert_manager.check_alerts()
                
                print(f"✓ Alert system works: {len(alerts)} active alerts")
                
                for alert in alerts:
                    print(f"  - {alert['level'].value.upper()}: {alert['message']}")
                
            except Exception as e:
                print(f"✗ Alert system error: {e}")
            
            # Test performance summary
            print("\n4. Testing performance summary...")
            try:
                from app.monitoring.metrics import MetricsCollector
                
                collector = MetricsCollector()
                summary = collector.get_performance_summary(hours=24)
                
                print("✓ Performance summary works")
                print(f"  - Jobs in last 24h: {summary.get('jobs', {}).get('total', 0)}")
                print(f"  - Success rate: {summary.get('jobs', {}).get('success_rate', 0):.1f}%")
                
            except Exception as e:
                print(f"✗ Performance summary error: {e}")
            
            print("\nMonitoring system test completed!")
            
    except Exception as e:
        print(f"Test failed: {e}")
        sys.exit(1)

if __name__ == '__main__':
    test_monitoring()