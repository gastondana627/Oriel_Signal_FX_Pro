"""
Database optimization utilities for performance improvements
"""
from sqlalchemy import text, inspect
from flask import current_app
from app import db
import logging

logger = logging.getLogger(__name__)

def create_database_indexes():
    """Create optimized database indexes for better query performance"""
    
    indexes = [
        # User table indexes
        "CREATE INDEX IF NOT EXISTS idx_user_email_active ON user(email, is_active);",
        "CREATE INDEX IF NOT EXISTS idx_user_created_at ON user(created_at);",
        
        # Payment table indexes
        "CREATE INDEX IF NOT EXISTS idx_payment_user_status ON payment(user_id, status);",
        "CREATE INDEX IF NOT EXISTS idx_payment_created_at ON payment(created_at);",
        "CREATE INDEX IF NOT EXISTS idx_payment_status_created ON payment(status, created_at);",
        "CREATE INDEX IF NOT EXISTS idx_payment_stripe_session ON payment(stripe_session_id);",
        
        # RenderJob table indexes
        "CREATE INDEX IF NOT EXISTS idx_renderjob_user_status ON render_job(user_id, status);",
        "CREATE INDEX IF NOT EXISTS idx_renderjob_status_created ON render_job(status, created_at);",
        "CREATE INDEX IF NOT EXISTS idx_renderjob_user_created ON render_job(user_id, created_at);",
        "CREATE INDEX IF NOT EXISTS idx_renderjob_completed_at ON render_job(completed_at);",
        "CREATE INDEX IF NOT EXISTS idx_renderjob_payment_id ON render_job(payment_id);",
        
        # PasswordResetToken table indexes
        "CREATE INDEX IF NOT EXISTS idx_password_reset_token ON password_reset_token(token);",
        "CREATE INDEX IF NOT EXISTS idx_password_reset_user_expires ON password_reset_token(user_id, expires_at);",
        "CREATE INDEX IF NOT EXISTS idx_password_reset_expires_used ON password_reset_token(expires_at, used);",
        
        # JobMetrics table indexes
        "CREATE INDEX IF NOT EXISTS idx_job_metrics_job_id ON job_metrics(job_id);",
        "CREATE INDEX IF NOT EXISTS idx_job_metrics_type_status ON job_metrics(job_type, status);",
        "CREATE INDEX IF NOT EXISTS idx_job_metrics_created_at ON job_metrics(created_at);",
        "CREATE INDEX IF NOT EXISTS idx_job_metrics_duration ON job_metrics(duration_seconds);",
        
        # SystemHealth table indexes
        "CREATE INDEX IF NOT EXISTS idx_system_health_timestamp ON system_health(timestamp);",
        "CREATE INDEX IF NOT EXISTS idx_system_health_redis_status ON system_health(redis_status);",
        "CREATE INDEX IF NOT EXISTS idx_system_health_gcs_status ON system_health(gcs_status);",
    ]
    
    try:
        for index_sql in indexes:
            db.session.execute(text(index_sql))
            logger.info(f"Created index: {index_sql}")
        
        db.session.commit()
        logger.info("All database indexes created successfully")
        
    except Exception as e:
        db.session.rollback()
        logger.error(f"Error creating database indexes: {e}")
        raise

def analyze_table_statistics():
    """Analyze table statistics for query optimization"""
    
    try:
        # Get table statistics
        inspector = inspect(db.engine)
        tables = inspector.get_table_names()
        
        stats = {}
        for table in tables:
            # Get row count
            result = db.session.execute(text(f"SELECT COUNT(*) FROM {table}"))
            row_count = result.scalar()
            
            # Get table size (PostgreSQL specific)
            if db.engine.dialect.name == 'postgresql':
                size_result = db.session.execute(
                    text(f"SELECT pg_size_pretty(pg_total_relation_size('{table}'))")
                )
                table_size = size_result.scalar()
            else:
                table_size = "N/A"
            
            stats[table] = {
                'row_count': row_count,
                'size': table_size
            }
            
            logger.info(f"Table {table}: {row_count} rows, size: {table_size}")
        
        return stats
        
    except Exception as e:
        logger.error(f"Error analyzing table statistics: {e}")
        return {}

def optimize_database_settings():
    """Apply database optimization settings"""
    
    optimizations = []
    
    if db.engine.dialect.name == 'postgresql':
        optimizations = [
            # Connection and memory settings
            "SET shared_buffers = '256MB';",
            "SET effective_cache_size = '1GB';",
            "SET maintenance_work_mem = '64MB';",
            "SET checkpoint_completion_target = 0.9;",
            "SET wal_buffers = '16MB';",
            "SET default_statistics_target = 100;",
            
            # Query optimization
            "SET random_page_cost = 1.1;",
            "SET effective_io_concurrency = 200;",
            
            # Logging and monitoring
            "SET log_min_duration_statement = 1000;",  # Log slow queries
            "SET log_checkpoints = on;",
            "SET log_connections = on;",
            "SET log_disconnections = on;",
            "SET log_lock_waits = on;",
        ]
    elif db.engine.dialect.name == 'sqlite':
        optimizations = [
            "PRAGMA journal_mode = WAL;",
            "PRAGMA synchronous = NORMAL;",
            "PRAGMA cache_size = 10000;",
            "PRAGMA temp_store = MEMORY;",
            "PRAGMA mmap_size = 268435456;",  # 256MB
        ]
    
    try:
        for optimization in optimizations:
            db.session.execute(text(optimization))
            logger.info(f"Applied optimization: {optimization}")
        
        db.session.commit()
        logger.info("Database optimizations applied successfully")
        
    except Exception as e:
        db.session.rollback()
        logger.error(f"Error applying database optimizations: {e}")

def vacuum_and_analyze():
    """Perform database maintenance operations"""
    
    try:
        if db.engine.dialect.name == 'postgresql':
            # PostgreSQL maintenance
            db.session.execute(text("VACUUM ANALYZE;"))
            logger.info("PostgreSQL VACUUM ANALYZE completed")
            
        elif db.engine.dialect.name == 'sqlite':
            # SQLite maintenance
            db.session.execute(text("VACUUM;"))
            db.session.execute(text("ANALYZE;"))
            logger.info("SQLite VACUUM and ANALYZE completed")
        
        db.session.commit()
        
    except Exception as e:
        db.session.rollback()
        logger.error(f"Error during database maintenance: {e}")

def get_slow_queries(limit: int = 10):
    """Get slow queries from database logs (PostgreSQL only)"""
    
    if db.engine.dialect.name != 'postgresql':
        logger.warning("Slow query analysis only available for PostgreSQL")
        return []
    
    try:
        # Query pg_stat_statements if available
        slow_queries_sql = """
        SELECT 
            query,
            calls,
            total_time,
            mean_time,
            rows,
            100.0 * shared_blks_hit / nullif(shared_blks_hit + shared_blks_read, 0) AS hit_percent
        FROM pg_stat_statements 
        WHERE mean_time > 100  -- queries taking more than 100ms on average
        ORDER BY mean_time DESC 
        LIMIT :limit;
        """
        
        result = db.session.execute(text(slow_queries_sql), {'limit': limit})
        slow_queries = []
        
        for row in result:
            slow_queries.append({
                'query': row.query[:200] + '...' if len(row.query) > 200 else row.query,
                'calls': row.calls,
                'total_time': round(row.total_time, 2),
                'mean_time': round(row.mean_time, 2),
                'rows': row.rows,
                'hit_percent': round(row.hit_percent or 0, 2)
            })
        
        return slow_queries
        
    except Exception as e:
        logger.error(f"Error getting slow queries: {e}")
        return []

def check_index_usage():
    """Check index usage statistics (PostgreSQL only)"""
    
    if db.engine.dialect.name != 'postgresql':
        logger.warning("Index usage analysis only available for PostgreSQL")
        return []
    
    try:
        index_usage_sql = """
        SELECT 
            schemaname,
            tablename,
            indexname,
            idx_tup_read,
            idx_tup_fetch,
            idx_scan
        FROM pg_stat_user_indexes 
        ORDER BY idx_scan DESC;
        """
        
        result = db.session.execute(text(index_usage_sql))
        index_stats = []
        
        for row in result:
            index_stats.append({
                'schema': row.schemaname,
                'table': row.tablename,
                'index': row.indexname,
                'tuples_read': row.idx_tup_read,
                'tuples_fetched': row.idx_tup_fetch,
                'scans': row.idx_scan
            })
        
        return index_stats
        
    except Exception as e:
        logger.error(f"Error checking index usage: {e}")
        return []

def optimize_database():
    """Run complete database optimization"""
    
    logger.info("Starting database optimization...")
    
    try:
        # Create indexes
        create_database_indexes()
        
        # Analyze table statistics
        stats = analyze_table_statistics()
        
        # Apply optimization settings
        optimize_database_settings()
        
        # Perform maintenance
        vacuum_and_analyze()
        
        # Get performance insights
        slow_queries = get_slow_queries()
        index_usage = check_index_usage()
        
        optimization_report = {
            'status': 'success',
            'table_stats': stats,
            'slow_queries': slow_queries,
            'index_usage': index_usage,
            'timestamp': db.func.now()
        }
        
        logger.info("Database optimization completed successfully")
        return optimization_report
        
    except Exception as e:
        logger.error(f"Database optimization failed: {e}")
        return {
            'status': 'error',
            'error': str(e),
            'timestamp': db.func.now()
        }

def get_database_performance_metrics():
    """Get current database performance metrics"""
    
    try:
        metrics = {}
        
        if db.engine.dialect.name == 'postgresql':
            # PostgreSQL specific metrics
            pg_metrics_sql = """
            SELECT 
                (SELECT count(*) FROM pg_stat_activity WHERE state = 'active') as active_connections,
                (SELECT count(*) FROM pg_stat_activity) as total_connections,
                (SELECT sum(numbackends) FROM pg_stat_database) as backends,
                (SELECT sum(xact_commit) FROM pg_stat_database) as commits,
                (SELECT sum(xact_rollback) FROM pg_stat_database) as rollbacks,
                (SELECT sum(blks_read) FROM pg_stat_database) as blocks_read,
                (SELECT sum(blks_hit) FROM pg_stat_database) as blocks_hit;
            """
            
            result = db.session.execute(text(pg_metrics_sql))
            row = result.fetchone()
            
            if row:
                metrics = {
                    'active_connections': row.active_connections,
                    'total_connections': row.total_connections,
                    'backends': row.backends,
                    'commits': row.commits,
                    'rollbacks': row.rollbacks,
                    'blocks_read': row.blocks_read,
                    'blocks_hit': row.blocks_hit,
                    'cache_hit_ratio': round((row.blocks_hit / (row.blocks_hit + row.blocks_read)) * 100, 2) if (row.blocks_hit + row.blocks_read) > 0 else 0
                }
        
        # Add general metrics
        table_stats = analyze_table_statistics()
        metrics['table_stats'] = table_stats
        
        return metrics
        
    except Exception as e:
        logger.error(f"Error getting database performance metrics: {e}")
        return {'error': str(e)}