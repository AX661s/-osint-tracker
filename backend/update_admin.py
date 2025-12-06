#!/usr/bin/env python3
"""
Update admin user with proper credentials
"""
import sqlite3
import hashlib
from datetime import datetime

DB_PATH = "osint_tracker.db"

def hash_password(password):
    """Hash password using SHA256"""
    return hashlib.sha256(password.encode()).hexdigest()

def update_admin_user():
    """Update admin user"""
    print("\n" + "="*60)
    print("👑 Admin User Updater")
    print("="*60 + "\n")
    
    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()
    
    # Admin credentials
    username = "admin"
    password = "admin123"
    email = "admin@osint.local"
    points = 9999
    
    # Hash password
    password_hash = hash_password(password)
    updated_at = datetime.utcnow().isoformat()
    
    try:
        # Update admin user
        cursor.execute("""
            UPDATE users 
            SET password = ?, email = ?, points = ?, is_admin = 1, updated_at = ?
            WHERE username = ?
        """, (password_hash, email, points, updated_at, username))
        
        conn.commit()
        
        print("✅ Admin user updated successfully!")
        print("\n📋 Admin Credentials:")
        print(f"   Username: {username}")
        print(f"   Password: {password}")
        print(f"   Email:    {email}")
        print(f"   Points:   {points}")
        print(f"   Role:     👑 Administrator")
        
        # Get the updated admin user
        cursor.execute("SELECT id, username, email, points, is_admin FROM users WHERE username = ?", (username,))
        row = cursor.fetchone()
        print(f"   User ID:  {row[0]}")
        print(f"   Status:   {'✅ Active' if row[4] else '❌ Inactive'}")
    
    except Exception as e:
        print(f"❌ Error: {str(e)}")
        return False
    
    finally:
        conn.close()
    
    print("\n" + "="*60)
    print("✅ Ready to Login:")
    print(f"   Username: admin")
    print(f"   Password: admin123")
    print("="*60 + "\n")
    
    return True

if __name__ == "__main__":
    update_admin_user()
