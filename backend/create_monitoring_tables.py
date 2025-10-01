#!/usr/bin/env python3
"""
Create monitoring tables for job metrics and system health.
"""
import os
import sys
from flask import Flask
from app import create_app, db
from config import config

def create_monitoring_tables():
    """Create the monitoring tables."""
    try:
        # Create app
        config_name = os.environ.get('FLASK_ENV', 'development')
        app = create_app(config_name)
        
        with app.app_context():
            # Import models to ensure they're registered
            from app.models import JobMetrics, SystemHealth
            
            # Create tables
            db.create_all()
            print('Monitoring tables created successfully')
            
            # Verify tables exist
            inspector = db.inspect(db.engine)
            tables = inspector.get_table_names()
            
            if 'job_metrics' in tables:
                print('✓ job_metrics table created')
            else:
                print('✗ job_metrics table not found')
            
            if 'system_health' in tables:
                print('✓ system_health table created')
            else:
                print('✗ system_health table not found')
                
    except Exception as e:
        print(f'Error creating monitoring tables: {e}')
        sys.exit(1)

if __name__ == '__main__':
    create_monitoring_tables()