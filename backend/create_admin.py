#!/usr/bin/env python3
"""
Create admin user: admin / admin123
"""
import sqlite3
import hashlib
from datetime import datetime
from pathlib import Path

DB_PATH = "osint_tracker.db"

def hash_password(password):
    """Hash password using SHA256"""
    return hashlib.sha256(password.encode()).hexdigest()

def create_admin_user():
    """Create admin user"""
    print("\n" + "="*60)
    print("👑 Admin User Creator")
    print("="*60 + "\n")
    
    # Connect to database
    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()
    
    # Admin credentials
    username = "admin"
    password = "admin123"
    email = "admin@osint.local"
    
    # Hash password
    password_hash = hash_password(password)
    
    # Default high points for admin
    points = 9999
    
    # Created timestamp
    created_at = datetime.utcnow().isoformat()
    updated_at = created_at
    
    try:
        # Check if admin already exists
        cursor.execute("SELECT id FROM users WHERE username = ?", (username,))
        existing = cursor.fetchone()
        
        if existing:
            print(f"⚠️  Admin user '{username}' already exists!")
            print(f"   ID: {existing[0]}")
            print(f"\n   To reset password, delete and recreate:")
            print(f"   DELETE FROM users WHERE username='admin';")
        else:
            # Insert admin user
            cursor.execute("""
                INSERT INTO users 
                (username, password, email, points, is_admin, is_active, created_at, updated_at)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?)
            """, (username, password_hash, email, points, 1, 1, created_at, updated_at))
            
            conn.commit()
            
            print("✅ Admin user created successfully!")
            print("\n📋 Admin Credentials:")
            print(f"   Username: {username}")
            print(f"   Password: {password}")
            print(f"   Email:    {email}")
            print(f"   Points:   {points}")
            print(f"   Role:     👑 Administrator")
            
            # Get the created admin user
            cursor.execute("SELECT id FROM users WHERE username = ?", (username,))
            admin_id = cursor.fetchone()[0]
            print(f"   User ID:  {admin_id}")
    
    except sqlite3.IntegrityError as e:
        print(f"❌ Error: {str(e)}")
        return False
    
    finally:
        conn.close()
    
    print("\n" + "="*60)
    print("✅ You can now login with:")
    print(f"   Username: admin")
    print(f"   Password: admin123")
    print("="*60 + "\n")
    
    return True

if __name__ == "__main__":
    if not Path(DB_PATH).exists():
        print(f"❌ Database file not found: {DB_PATH}")
        exit(1)
    
    create_admin_user()
