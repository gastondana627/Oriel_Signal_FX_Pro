#!/usr/bin/env python3
"""
Create purchase table for one-time download licensing
"""
import sqlite3
import os

def create_purchase_table():
    """Create purchase table with all required fields"""
    db_path = 'app-dev.db'
    
    if not os.path.exists(db_path):
        print(f"Database file {db_path} not found")
        return
    
    try:
        conn = sqlite3.connect(db_path)
        cursor = conn.cursor()
        
        # Check if table already exists
        cursor.execute("SELECT name FROM sqlite_master WHERE type='table' AND name='purchase'")
        if cursor.fetchone():
            print("✅ Purchase table already exists")
            conn.close()
            return
        
        print("Creating purchase table...")
        
        # Create purchase table
        cursor.execute("""
            CREATE TABLE purchase (
                id VARCHAR(36) NOT NULL PRIMARY KEY,
                user_id INTEGER,
                user_email VARCHAR(255),
                file_id VARCHAR(36) NOT NULL,
                tier VARCHAR(20) NOT NULL,
                amount INTEGER NOT NULL,
                stripe_session_id VARCHAR(255) UNIQUE,
                stripe_payment_intent VARCHAR(255),
                status VARCHAR(20) DEFAULT 'pending',
                download_token VARCHAR(500),
                download_expires_at DATETIME,
                download_attempts INTEGER DEFAULT 0,
                license_sent BOOLEAN DEFAULT 0,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                completed_at DATETIME,
                FOREIGN KEY(user_id) REFERENCES user (id)
            )
        """)
        
        # Create indexes
        indexes = [
            "CREATE INDEX idx_purchase_user_status ON purchase(user_id, status)",
            "CREATE INDEX idx_purchase_status_created ON purchase(status, created_at)",
            "CREATE INDEX idx_purchase_token ON purchase(download_token)",
            "CREATE INDEX idx_purchase_expires ON purchase(download_expires_at)",
            "CREATE INDEX idx_purchase_user_email ON purchase(user_email)",
            "CREATE INDEX idx_purchase_user_id ON purchase(user_id)",
            "CREATE INDEX idx_purchase_tier ON purchase(tier)",
            "CREATE INDEX idx_purchase_stripe_session ON purchase(stripe_session_id)",
            "CREATE INDEX idx_purchase_stripe_intent ON purchase(stripe_payment_intent)",
            "CREATE INDEX idx_purchase_status ON purchase(status)"
        ]
        
        for index_sql in indexes:
            cursor.execute(index_sql)
        
        conn.commit()
        print("✅ Successfully created purchase table with indexes")
        
        conn.close()
        
    except Exception as e:
        print(f"❌ Error creating purchase table: {e}")
        raise

if __name__ == '__main__':
    create_purchase_table()