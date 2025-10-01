#!/usr/bin/env python3
"""
Add new fields to User model for enhanced registration
"""
import os
import sys
import sqlite3
from datetime import datetime

def migrate_user_table():
    """Add new columns to user table"""
    db_path = os.path.join('backend', 'app-dev.db')
    
    if not os.path.exists(db_path):
        print("❌ Database file not found:", db_path)
        return False
    
    try:
        conn = sqlite3.connect(db_path)
        cursor = conn.cursor()
        
        print("🔄 Adding new columns to user table...")
        
        # Add new columns (SQLite doesn't support adding multiple columns at once)
        new_columns = [
            ("account_type", "VARCHAR(20) DEFAULT 'user'"),
            ("playlists", "TEXT"),
            ("marketing_consent", "BOOLEAN DEFAULT 0"),
            ("plan", "VARCHAR(20) DEFAULT 'free'")
        ]
        
        for column_name, column_def in new_columns:
            try:
                cursor.execute(f"ALTER TABLE user ADD COLUMN {column_name} {column_def}")
                print(f"✅ Added column: {column_name}")
            except sqlite3.OperationalError as e:
                if "duplicate column name" in str(e):
                    print(f"⚠️ Column {column_name} already exists")
                else:
                    print(f"❌ Error adding column {column_name}: {e}")
        
        # Create new indexes
        indexes = [
            "CREATE INDEX IF NOT EXISTS idx_user_account_type ON user(account_type)",
        ]
        
        for index_sql in indexes:
            try:
                cursor.execute(index_sql)
                print(f"✅ Created index")
            except sqlite3.OperationalError as e:
                print(f"⚠️ Index creation: {e}")
        
        # Update existing users with default values
        cursor.execute("""
            UPDATE user 
            SET account_type = 'user', 
                playlists = 'creative', 
                marketing_consent = 0,
                plan = 'free'
            WHERE account_type IS NULL
        """)
        
        updated_count = cursor.rowcount
        if updated_count > 0:
            print(f"✅ Updated {updated_count} existing users with default values")
        
        conn.commit()
        conn.close()
        
        print("✅ User table migration completed successfully!")
        return True
        
    except Exception as e:
        print(f"❌ Error migrating user table: {e}")
        return False

def show_user_table_structure():
    """Show the current user table structure"""
    db_path = os.path.join('backend', 'app-dev.db')
    
    if not os.path.exists(db_path):
        print("❌ Database file not found:", db_path)
        return
    
    try:
        conn = sqlite3.connect(db_path)
        cursor = conn.cursor()
        
        cursor.execute("PRAGMA table_info(user)")
        columns = cursor.fetchall()
        
        print("\n📊 Current User Table Structure:")
        print("-" * 50)
        for column in columns:
            print(f"  {column[1]} ({column[2]}) - Default: {column[4]}")
        
        cursor.execute("SELECT COUNT(*) FROM user")
        user_count = cursor.fetchone()[0]
        print(f"\n👥 Total users: {user_count}")
        
        if user_count > 0:
            cursor.execute("SELECT email, account_type, playlists FROM user LIMIT 5")
            users = cursor.fetchall()
            print("\n📋 Sample users:")
            for user in users:
                print(f"  {user[0]} - Type: {user[1]} - Playlists: {user[2]}")
        
        conn.close()
        
    except Exception as e:
        print(f"❌ Error showing table structure: {e}")

if __name__ == "__main__":
    print("🔧 User Model Migration Tool")
    print("=" * 50)
    
    if len(sys.argv) > 1 and sys.argv[1] == '--show':
        show_user_table_structure()
    else:
        print("🔄 Migrating user table...")
        if migrate_user_table():
            print("\n📊 Showing updated structure...")
            show_user_table_structure()
        else:
            print("❌ Migration failed")