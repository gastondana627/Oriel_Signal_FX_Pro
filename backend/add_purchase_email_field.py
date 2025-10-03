#!/usr/bin/env python3
"""
Add user_email field to Purchase model for anonymous purchases
"""
import os
import sys
from sqlalchemy import text

# Add the backend directory to Python path
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from app import create_app
from app.models import db

def add_purchase_email_field():
    """Add user_email field to purchase table"""
    app = create_app()
    
    with app.app_context():
        try:
            # Check if column already exists
            result = db.engine.execute(text("""
                SELECT COUNT(*) as count 
                FROM pragma_table_info('purchase') 
                WHERE name = 'user_email'
            """))
            
            count = result.fetchone()[0]
            
            if count == 0:
                print("Adding user_email column to purchase table...")
                
                # Add the column
                db.engine.execute(text("""
                    ALTER TABLE purchase 
                    ADD COLUMN user_email VARCHAR(255)
                """))
                
                # Create index for the new column
                db.engine.execute(text("""
                    CREATE INDEX idx_purchase_user_email ON purchase(user_email)
                """))
                
                print("✅ Successfully added user_email column and index")
            else:
                print("✅ user_email column already exists")
                
        except Exception as e:
            print(f"❌ Error adding user_email field: {e}")
            raise

if __name__ == '__main__':
    add_purchase_email_field()