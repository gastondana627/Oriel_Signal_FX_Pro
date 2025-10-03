#!/usr/bin/env python3
"""
Create support tables for customer service integration
"""
import sys
import os

# Add the backend directory to the Python path
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from app import create_app
from app.models import db
from app.support.manager import SupportTicket

def create_support_tables():
    """Create support-related database tables"""
    app = create_app()
    
    with app.app_context():
        try:
            # Create support tickets table
            db.create_all()
            
            print("✅ Support tables created successfully!")
            print("📋 Created tables:")
            print("   - support_tickets")
            
        except Exception as e:
            print(f"❌ Error creating support tables: {e}")
            return False
    
    return True

if __name__ == "__main__":
    success = create_support_tables()
    sys.exit(0 if success else 1)