#!/usr/bin/env python3
"""
Create migration for Purchase and FreeDownloadUsage models
"""
import os
import sys

# Add the backend directory to the Python path
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from flask_migrate import upgrade, migrate, init, revision
from app import create_app, db

def create_migration():
    """Create a new migration for the download models"""
    app = create_app('development')
    
    with app.app_context():
        try:
            # Create migration
            migrate(message='Add Purchase and FreeDownloadUsage models for download management')
            print("✅ Migration created successfully!")
            print("Run 'flask db upgrade' to apply the migration.")
            
        except Exception as e:
            print(f"❌ Error creating migration: {e}")
            return False
    
    return True

if __name__ == '__main__':
    create_migration()