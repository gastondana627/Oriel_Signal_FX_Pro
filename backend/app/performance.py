"""
Performance monitoring and bottleneck identification system
"""
import time
import psutil
import threading
from functools import wraps
from datetime import datetime, timedelta
from flask import request, g, current_app
from sqlalchemy import text
from app import db
from app.cache import cache
import logging

# Performance logger
perf_logger = logging.getLogger('performance')

class PerformanceMonitor:
    """System performance monitoring"""
    
    def __init__(self):
        self.metrics = {}
        self.lock = threading.Lock()
        
    def record_metric(self, name: str, value: float, tags: dict = None):
        """Record a performance metric"""
        with self.lock:
            timestamp = datetime.utcnow()
            metric_key = f"perf:{name}:{timestamp.strftime('%Y%m%d%H%M')}"
            
            metric_data = {
                'value': value,
                'timestamp': timestamp.isoformat(),
                'tags': tags or {}
            }
            
            # Store in cache for real-time access
            cache.set(metric_key, metric_data, timeout=3600)  # 1 hour
            
            # Log for analysis
            perf_logger.info(f"METRIC {name}: {value}", extra={
                'metric_name': name,
                'metric_value': value,
                'tags': tags
            })
    
    def get_metrics(self, name: str, hours: int = 1) -> list:
        """Get metrics for the last N hours"""
        metrics = []
        now = datetime.utcnow()
        
        for i in range(hours * 60):  # Check each minute
            timestamp = now - timedelta(minutes=i)
            metric_key = f"perf:{name}:{timestamp.strftime('%Y%m%d%H%M')}"
            metric = cache.get(metric_key)
            if metric:
                metrics.append(metric)
        
        return sorted(metrics, key=lambda x: x['timestamp'])
    
    def get_system_stats(self) -> dict:
        """Get current system performance stats"""
        try:
            cpu_percent = psutil.cpu_percent(interval=1)
            memory = psutil.virtual_memory()
            disk = psutil.disk_usage('/')
            
            # Database connection pool stats
            db_stats = self._get_db_stats()
            
            return {
                'cpu_percent': cpu_percent,
                'memory_percent': memory.percent,
                'memory_available_gb': memory.available / (1024**3),
                'disk_percent': disk.percent,
                'disk_free_gb': disk.free / (1024**3),
                'db_connections': db_stats,
                'timestamp': datetime.utcnow().isoformat()
            }
        except Exception as e:
            current_app.logger.error(f"Error getting system stats: {e}")
            return {}
    
    def _get_db_stats(self) -> dict:
        """Get database connection statistics"""
        try:
            engine = db.engine
            pool = engine.pool
            
            return {
                'pool_size': pool.size(),
                'checked_in': pool.checkedin(),
                'checked_out': pool.checkedout(),
                'overflow': pool.overflow(),
                'invalid': pool.invalid()
            }
        except Exception as e:
            current_app.logger.error(f"Error getting DB stats: {e}")
            return {}
    
    def check_slow_queries(self, threshold_ms: float = 1000) -> list:
        """Identify slow database queries"""
        try:
            # This would require query logging to be enabled
            # For now, return empty list
            return []
        except Exception as e:
            current_app.logger.error(f"Error checking slow queries: {e}")
            return []

# Global performance monitor
perf_monitor = PerformanceMonitor()

def monitor_performance(func):
    """Decorator to monitor function performance"""
    @wraps(func)
    def wrapper(*args, **kwargs):
        start_time = time.time()
        
        try:
            result = func(*args, **kwargs)
            success = True
            error = None
        except Exception as e:
            success = False
            error = str(e)
            raise
        finally:
            duration = time.time() - start_time
            
            # Record performance metric
            perf_monitor.record_metric(
                f"function.{func.__name__}.duration",
                duration * 1000,  # Convert to milliseconds
                {
                    'success': success,
                    'error': error,
                    'module': func.__module__
                }
            )
            
            # Log slow functions
            if duration > 1.0:  # Log functions taking more than 1 second
                current_app.logger.warning(
                    f"Slow function: {func.__name__} took {duration:.2f}s",
                    extra={'duration': duration, 'function': func.__name__}
                )
        
        return result
    return wrapper

def monitor_request_performance():
    """Flask before/after request handlers for monitoring"""
    
    def before_request():
        g.start_time = time.time()
        g.request_id = request.headers.get('X-Request-ID', 'unknown')
    
    def after_request(response):
        if hasattr(g, 'start_time'):
            duration = time.time() - g.start_time
            
            # Record request performance
            perf_monitor.record_metric(
                "request.duration",
                duration * 1000,
                {
                    'method': request.method,
                    'endpoint': request.endpoint,
                    'status_code': response.status_code,
                    'request_id': getattr(g, 'request_id', 'unknown')
                }
            )
            
            # Add performance headers
            response.headers['X-Response-Time'] = f"{duration:.3f}s"
            
            # Log slow requests
            if duration > 2.0:  # Log requests taking more than 2 seconds
                current_app.logger.warning(
                    f"Slow request: {request.method} {request.path} took {duration:.2f}s",
                    extra={
                        'duration': duration,
                        'method': request.method,
                        'path': request.path,
                        'status_code': response.status_code
                    }
                )
        
        return response
    
    return before_request, after_request

class DatabaseQueryMonitor:
    """Monitor database query performance"""
    
    def __init__(self):
        self.slow_queries = []
        self.query_count = 0
        
    def log_query(self, query: str, duration: float, params=None):
        """Log database query performance"""
        self.query_count += 1
        
        if duration > 0.1:  # Log queries taking more than 100ms
            query_info = {
                'query': query[:500],  # Truncate long queries
                'duration': duration,
                'params': str(params)[:200] if params else None,
                'timestamp': datetime.utcnow().isoformat()
            }
            
            self.slow_queries.append(query_info)
            
            # Keep only last 100 slow queries
            if len(self.slow_queries) > 100:
                self.slow_queries = self.slow_queries[-100:]
            
            # Log to performance logger
            perf_logger.warning(
                f"Slow query ({duration:.3f}s): {query[:200]}...",
                extra={
                    'query_duration': duration,
                    'query': query[:500]
                }
            )
    
    def get_slow_queries(self, limit: int = 20) -> list:
        """Get recent slow queries"""
        return sorted(
            self.slow_queries[-limit:],
            key=lambda x: x['duration'],
            reverse=True
        )
    
    def get_query_stats(self) -> dict:
        """Get query statistics"""
        if not self.slow_queries:
            return {'total_queries': self.query_count, 'slow_queries': 0}
        
        durations = [q['duration'] for q in self.slow_queries]
        
        return {
            'total_queries': self.query_count,
            'slow_queries': len(self.slow_queries),
            'avg_slow_duration': sum(durations) / len(durations),
            'max_duration': max(durations),
            'min_duration': min(durations)
        }

# Global query monitor
query_monitor = DatabaseQueryMonitor()

def init_performance_monitoring(app):
    """Initialize performance monitoring for Flask app"""
    
    # Add request monitoring
    before_request, after_request = monitor_request_performance()
    app.before_request(before_request)
    app.after_request(after_request)
    
    # Add database event listeners for query monitoring (deferred until first request)
    from sqlalchemy import event
    
    def setup_db_listeners():
        """Setup database event listeners - called on first request"""
        if not hasattr(app, '_db_listeners_setup'):
            @event.listens_for(db.engine, "before_cursor_execute")
            def receive_before_cursor_execute(conn, cursor, statement, parameters, context, executemany):
                context._query_start_time = time.time()
            
            @event.listens_for(db.engine, "after_cursor_execute")
            def receive_after_cursor_execute(conn, cursor, statement, parameters, context, executemany):
                if hasattr(context, '_query_start_time'):
                    duration = time.time() - context._query_start_time
                    query_monitor.log_query(statement, duration, parameters)
            
            app._db_listeners_setup = True
    
    # Setup listeners on first request
    @app.before_request
    def setup_monitoring():
        if not hasattr(app, '_db_listeners_setup'):
            setup_db_listeners()
    
    # Start background system monitoring
    def monitor_system():
        """Background thread to monitor system performance"""
        while True:
            try:
                with app.app_context():
                    stats = perf_monitor.get_system_stats()
                    if stats:
                        # Record system metrics
                        perf_monitor.record_metric("system.cpu_percent", stats['cpu_percent'])
                        perf_monitor.record_metric("system.memory_percent", stats['memory_percent'])
                        perf_monitor.record_metric("system.disk_percent", stats['disk_percent'])
                        
                        # Cache for admin dashboard
                        cache.set("system_performance", stats, timeout=120)
                
                time.sleep(60)  # Monitor every minute
            except Exception as e:
                with app.app_context():
                    app.logger.error(f"System monitoring error: {e}")
                time.sleep(60)
    
    # Start monitoring thread
    monitor_thread = threading.Thread(target=monitor_system, daemon=True)
    monitor_thread.start()
    
    app.logger.info("Performance monitoring initialized")

def get_performance_report() -> dict:
    """Generate comprehensive performance report"""
    try:
        # Get system stats
        system_stats = perf_monitor.get_system_stats()
        
        # Get query stats
        query_stats = query_monitor.get_query_stats()
        
        # Get recent metrics
        cpu_metrics = perf_monitor.get_metrics("system.cpu_percent", hours=1)
        memory_metrics = perf_monitor.get_metrics("system.memory_percent", hours=1)
        
        # Get slow queries
        slow_queries = query_monitor.get_slow_queries(10)
        
        return {
            'system_stats': system_stats,
            'query_stats': query_stats,
            'cpu_trend': cpu_metrics[-10:] if cpu_metrics else [],
            'memory_trend': memory_metrics[-10:] if memory_metrics else [],
            'slow_queries': slow_queries,
            'generated_at': datetime.utcnow().isoformat()
        }
    except Exception as e:
        current_app.logger.error(f"Error generating performance report: {e}")
        return {'error': str(e)}