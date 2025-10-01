#!/usr/bin/env python3
"""
Reset test database by removing test users
"""
import os
import sys
import sqlite3
from datetime import datetime

def reset_database():
    """Reset the development database"""
    db_path = os.path.join('backend', 'app-dev.db')
    
    if not os.path.exists(db_path):
        print("❌ Database file not found:", db_path)
        return False
    
    try:
        conn = sqlite3.connect(db_path)
        cursor = conn.cursor()
        
        # Show current users
        cursor.execute("SELECT id, email, created_at FROM user")
        users = cursor.fetchall()
        
        print("📊 Current users in database:")
        for user in users:
            print(f"  ID: {user[0]}, Email: {user[1]}, Created: {user[2]}")
        
        if not users:
            print("✅ Database is already empty")
            return True
        
        # Ask for confirmation
        response = input(f"\n🗑️ Delete all {len(users)} users? (y/N): ")
        if response.lower() != 'y':
            print("❌ Operation cancelled")
            return False
        
        # Delete all users (this will cascade to related tables)
        cursor.execute("DELETE FROM user")
        deleted_count = cursor.rowcount
        
        # Reset auto-increment counter
        cursor.execute("DELETE FROM sqlite_sequence WHERE name='user'")
        
        conn.commit()
        conn.close()
        
        print(f"✅ Successfully deleted {deleted_count} users")
        print("✅ Database reset complete")
        return True
        
    except Exception as e:
        print(f"❌ Error resetting database: {e}")
        return False

def backup_database():
    """Create a backup of the current database"""
    db_path = os.path.join('backend', 'app-dev.db')
    
    if not os.path.exists(db_path):
        print("❌ Database file not found:", db_path)
        return False
    
    timestamp = datetime.now().strftime('%Y%m%d_%H%M%S')
    backup_path = os.path.join('backend', f'app-dev-backup-{timestamp}.db')
    
    try:
        import shutil
        shutil.copy2(db_path, backup_path)
        print(f"✅ Database backed up to: {backup_path}")
        return True
    except Exception as e:
        print(f"❌ Error creating backup: {e}")
        return False

if __name__ == "__main__":
    print("🔧 Database Reset Tool")
    print("=" * 50)
    
    if len(sys.argv) > 1 and sys.argv[1] == '--backup':
        backup_database()
    else:
        print("💡 Creating backup first...")
        if backup_database():
            print("\n🔄 Resetting database...")
            reset_database()
        else:
            print("❌ Backup failed, aborting reset")