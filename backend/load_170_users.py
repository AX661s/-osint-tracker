#!/usr/bin/env python3
"""
Load 170 real-like users into the database
"""
import sqlite3
from datetime import datetime, timedelta
import random
import string
from pathlib import Path

# Database path
DB_PATH = "osint_tracker.db"

def generate_usernames(count=170):
    """Generate realistic usernames"""
    first_names = [
        "alex", "brian", "charlie", "david", "emily", "frank", "grace", "henry",
        "ivy", "jack", "kate", "liam", "mia", "noah", "olivia", "peter",
        "quinn", "rachel", "sam", "tina", "uber", "victor", "walter", "xena",
        "yara", "zoe", "adam", "bella", "carl", "diana", "eric", "fiona",
        "george", "hannah", "iris", "james", "karen", "leo", "maya", "nathan",
        "oscar", "paula", "quinn", "robert", "sarah", "thomas", "ursula", "victor"
    ]
    
    last_names = [
        "smith", "johnson", "brown", "davis", "miller", "wilson", "moore", "taylor",
        "anderson", "thomas", "jackson", "white", "harris", "martin", "thompson", "garcia",
        "martinez", "robinson", "clark", "rodriguez", "lewis", "lee", "walker", "hall",
        "allen", "young", "king", "wright", "lopez", "hill", "scott", "green",
        "adams", "nelson", "carter", "mitchell", "roberts", "phillips", "campbell", "parker",
        "evans", "edwards", "collins", "stewart", "sanchez", "morris", "rogers", "morgan"
    ]
    
    usernames = set()
    while len(usernames) < count:
        first = random.choice(first_names)
        last = random.choice(last_names)
        num = random.randint(0, 9999)
        username = f"{first}_{last}{num}"
        usernames.add(username)
    
    return sorted(list(usernames))[:count]


def generate_emails(usernames):
    """Generate email addresses for usernames"""
    domains = ["gmail.com", "yahoo.com", "outlook.com", "hotmail.com", "company.com", 
               "example.com", "domain.com", "mail.com", "email.com", "user.com"]
    
    emails = []
    for username in usernames:
        domain = random.choice(domains)
        email = f"{username}@{domain}"
        emails.append(email)
    
    return emails


def hash_password(password):
    """Simple password hashing (in real app use bcrypt)"""
    import hashlib
    return hashlib.sha256(password.encode()).hexdigest()


def load_users_into_db(db_path, user_count=170):
    """Load users into database"""
    print(f"\n📊 Creating {user_count} realistic users...\n")
    
    # Connect to database
    conn = sqlite3.connect(db_path)
    cursor = conn.cursor()
    
    # Check if users table exists
    cursor.execute("SELECT name FROM sqlite_master WHERE type='table' AND name='users'")
    if not cursor.fetchone():
        print("❌ Users table does not exist. Creating schema...")
        create_schema(cursor)
        conn.commit()
    
    # Generate usernames and emails
    usernames = generate_usernames(user_count)
    emails = generate_emails(usernames)
    
    # Insert users
    inserted = 0
    skipped = 0
    
    for i, (username, email) in enumerate(zip(usernames, emails), 1):
        try:
            # Default password: username123
            password = hash_password(f"{username}123")
            
            # Random points between 100 and 1000
            points = random.randint(100, 1000)
            
            # Random admin flag (5% chance)
            is_admin = 1 if random.random() < 0.05 else 0
            
            # Created timestamp (past 6 months)
            days_ago = random.randint(0, 180)
            created_at = (datetime.utcnow() - timedelta(days=days_ago)).isoformat()
            updated_at = created_at
            
            cursor.execute("""
                INSERT OR IGNORE INTO users 
                (username, password, email, points, is_admin, is_active, created_at, updated_at)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?)
            """, (username, password, email, points, is_admin, 1, created_at, updated_at))
            
            inserted += 1
            
            if i % 20 == 0:
                print(f"✅ Inserted {i}/{user_count} users...")
        
        except sqlite3.IntegrityError:
            skipped += 1
            print(f"⚠️  User {username} already exists, skipping...")
    
    # Commit changes
    conn.commit()
    
    # Get final count
    cursor.execute("SELECT COUNT(*) FROM users")
    total_users = cursor.fetchone()[0]
    
    print(f"\n{'='*60}")
    print(f"✅ Database Update Complete!")
    print(f"{'='*60}")
    print(f"📝 Inserted:      {inserted} new users")
    print(f"⚠️  Skipped:       {skipped} duplicate users")
    print(f"👥 Total Users:   {total_users}")
    print(f"{'='*60}\n")
    
    # Show sample users
    print("📋 Sample Users (First 10):")
    cursor.execute("SELECT id, username, email, points, is_admin, created_at FROM users LIMIT 10")
    for row in cursor.fetchall():
        user_id, username, email, points, is_admin, created_at = row
        email_str = email if email else "N/A"
        admin_badge = "👑 ADMIN" if is_admin else ""
        print(f"  [{user_id:3d}] {username:25s} | {email_str:30s} | Points: {points:4d} {admin_badge}")
    
    print("\n📈 Statistics:")
    cursor.execute("SELECT COUNT(*) FROM users WHERE is_admin = 1")
    admin_count = cursor.fetchone()[0]
    cursor.execute("SELECT AVG(points) FROM users")
    avg_points = cursor.fetchone()[0]
    cursor.execute("SELECT SUM(points) FROM users")
    total_points = cursor.fetchone()[0]
    
    print(f"  👑 Admin Users: {admin_count}")
    print(f"  💰 Total Points: {total_points}")
    print(f"  📊 Average Points: {avg_points:.0f}")
    
    conn.close()


def create_schema(cursor):
    """Create database schema if it doesn't exist"""
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS users (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            username TEXT UNIQUE NOT NULL,
            password TEXT NOT NULL,
            email TEXT,
            points INTEGER DEFAULT 0,
            is_admin INTEGER DEFAULT 0,
            is_active INTEGER DEFAULT 1,
            created_at TEXT,
            updated_at TEXT
        )
    """)


def main():
    """Main function"""
    print("\n" + "="*60)
    print("🚀 OSINT User Database Loader")
    print("="*60 + "\n")
    
    # Check if database exists
    if not Path(DB_PATH).exists():
        print(f"❌ Database file not found: {DB_PATH}")
        return
    
    print(f"📂 Database: {DB_PATH}")
    
    # Load users
    load_users_into_db(DB_PATH, user_count=170)
    
    print("\n✅ Users loaded successfully!")
    print("💡 You can now:")
    print("  - Access the application at http://localhost:8000")
    print("  - Login with any username (password: username123)")
    print("  - Check user data in the database")
    print("\n")


if __name__ == "__main__":
    main()
