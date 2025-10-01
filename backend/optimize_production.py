#!/usr/bin/env python3
"""
Production optimization script for Oriel backend
"""
import os
import sys
import logging
from flask import Flask
from app import create_app, db
from app.database_optimization import optimize_database
from app.cache import cache

# Setup logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

def optimize_production():
    """Run production optimizations"""
    
    logger.info("Starting production optimization...")
    
    # Create Flask app
    app = create_app('production')
    
    with app.app_context():
        try:
            # 1. Database optimizations
            logger.info("Running database optimizations...")
            db_report = optimize_database()
            
            if db_report['status'] == 'success':
                logger.info("Database optimization completed successfully")
                logger.info(f"Table statistics: {db_report['table_stats']}")
                
                if db_report['slow_queries']:
                    logger.warning(f"Found {len(db_report['slow_queries'])} slow queries")
                    for query in db_report['slow_queries'][:5]:  # Show top 5
                        logger.warning(f"Slow query: {query['query']} (avg: {query['mean_time']}ms)")
            else:
                logger.error(f"Database optimization failed: {db_report['error']}")
            
            # 2. Cache warmup
            logger.info("Warming up cache...")
            warmup_cache()
            
            # 3. System checks
            logger.info("Running system checks...")
            run_system_checks(app)
            
            logger.info("Production optimization completed successfully!")
            return True
            
        except Exception as e:
            logger.error(f"Production optimization failed: {e}")
            return False

def warmup_cache():
    """Warm up frequently accessed cache entries"""
    
    try:
        # Cache system metrics
        from app.performance import perf_monitor
        system_stats = perf_monitor.get_system_stats()
        cache.set("system_performance", system_stats, timeout=120)
        
        # Cache database performance metrics
        from app.database_optimization import get_database_performance_metrics
        db_metrics = get_database_performance_metrics()
        cache.set("database_metrics", db_metrics, timeout=300)
        
        logger.info("Cache warmup completed")
        
    except Exception as e:
        logger.error(f"Cache warmup failed: {e}")

def run_system_checks(app):
    """Run system health checks"""
    
    checks = []
    
    # Check database connection
    try:
        db.session.execute(db.text("SELECT 1"))
        checks.append(("Database", "OK"))
    except Exception as e:
        checks.append(("Database", f"FAILED: {e}"))
    
    # Check Redis connection
    try:
        import redis
        redis_url = app.config.get('REDIS_URL', 'redis://localhost:6379/0')
        r = redis.from_url(redis_url)
        r.ping()
        checks.append(("Redis", "OK"))
    except Exception as e:
        checks.append(("Redis", f"FAILED: {e}"))
    
    # Check Google Cloud Storage
    try:
        from app.storage.gcs import test_gcs_connection
        if test_gcs_connection():
            checks.append(("Google Cloud Storage", "OK"))
        else:
            checks.append(("Google Cloud Storage", "FAILED"))
    except Exception as e:
        checks.append(("Google Cloud Storage", f"FAILED: {e}"))
    
    # Check SendGrid
    try:
        sendgrid_key = app.config.get('SENDGRID_API_KEY')
        if sendgrid_key:
            checks.append(("SendGrid", "OK - API key configured"))
        else:
            checks.append(("SendGrid", "WARNING - No API key"))
    except Exception as e:
        checks.append(("SendGrid", f"FAILED: {e}"))
    
    # Check Stripe
    try:
        stripe_key = app.config.get('STRIPE_SECRET_KEY')
        if stripe_key:
            checks.append(("Stripe", "OK - API key configured"))
        else:
            checks.append(("Stripe", "WARNING - No API key"))
    except Exception as e:
        checks.append(("Stripe", f"FAILED: {e}"))
    
    # Log results
    logger.info("System Health Check Results:")
    for service, status in checks:
        if "FAILED" in status:
            logger.error(f"  {service}: {status}")
        elif "WARNING" in status:
            logger.warning(f"  {service}: {status}")
        else:
            logger.info(f"  {service}: {status}")

def check_security_configuration(app):
    """Check security configuration"""
    
    security_checks = []
    
    # Check HTTPS enforcement
    if app.config.get('HTTPS_ONLY'):
        security_checks.append(("HTTPS Enforcement", "ENABLED"))
    else:
        security_checks.append(("HTTPS Enforcement", "DISABLED - WARNING"))
    
    # Check secret key strength
    secret_key = app.config.get('SECRET_KEY', '')
    if len(secret_key) >= 32:
        security_checks.append(("Secret Key", "STRONG"))
    else:
        security_checks.append(("Secret Key", "WEAK - WARNING"))
    
    # Check JWT secret
    jwt_secret = app.config.get('JWT_SECRET_KEY', '')
    if len(jwt_secret) >= 32:
        security_checks.append(("JWT Secret", "STRONG"))
    else:
        security_checks.append(("JWT Secret", "WEAK - WARNING"))
    
    # Check CORS configuration
    cors_origins = app.config.get('CORS_ORIGINS', [])
    if cors_origins and '*' not in str(cors_origins):
        security_checks.append(("CORS Configuration", "SECURE"))
    else:
        security_checks.append(("CORS Configuration", "INSECURE - WARNING"))
    
    # Log security check results
    logger.info("Security Configuration Check:")
    for check, status in security_checks:
        if "WARNING" in status:
            logger.warning(f"  {check}: {status}")
        else:
            logger.info(f"  {check}: {status}")

def main():
    """Main optimization function"""
    
    if len(sys.argv) > 1:
        command = sys.argv[1]
        
        if command == "optimize":
            success = optimize_production()
            sys.exit(0 if success else 1)
        elif command == "check":
            app = create_app('production')
            with app.app_context():
                run_system_checks(app)
                check_security_configuration(app)
        elif command == "cache":
            app = create_app('production')
            with app.app_context():
                warmup_cache()
        else:
            print("Usage: python optimize_production.py [optimize|check|cache]")
            sys.exit(1)
    else:
        print("Usage: python optimize_production.py [optimize|check|cache]")
        print("  optimize - Run full production optimization")
        print("  check    - Run system health checks")
        print("  cache    - Warm up cache")
        sys.exit(1)

if __name__ == "__main__":
    main()