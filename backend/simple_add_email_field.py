#!/usr/bin/env python3
"""
Simple script to add user_email field to Purchase model
"""
import sqlite3
import os

def add_purchase_email_field():
    """Add user_email field to purchase table"""
    db_path = 'app-dev.db'
    
    if not os.path.exists(db_path):
        print(f"Database file {db_path} not found")
        return
    
    try:
        conn = sqlite3.connect(db_path)
        cursor = conn.cursor()
        
        # Check if column already exists
        cursor.execute("PRAGMA table_info(purchase)")
        columns = [column[1] for column in cursor.fetchall()]
        
        if 'user_email' not in columns:
            print("Adding user_email column to purchase table...")
            
            # Add the column
            cursor.execute("""
                ALTER TABLE purchase 
                ADD COLUMN user_email VARCHAR(255)
            """)
            
            # Create index for the new column
            cursor.execute("""
                CREATE INDEX idx_purchase_user_email ON purchase(user_email)
            """)
            
            conn.commit()
            print("✅ Successfully added user_email column and index")
        else:
            print("✅ user_email column already exists")
            
        conn.close()
        
    except Exception as e:
        print(f"❌ Error adding user_email field: {e}")
        raise

if __name__ == '__main__':
    add_purchase_email_field()