"""
更新所有用户的密码为 123456qs
"""
import sqlite3
import hashlib
from datetime import datetime

def hash_password(password: str) -> str:
    """哈希密码"""
    return hashlib.sha256(password.encode()).hexdigest()

def update_all_passwords():
    """更新所有用户密码为 123456qs"""
    db_path = 'osint_tracker.db'
    new_password = '123456qs'
    password_hash = hash_password(new_password)
    updated_at = datetime.now().isoformat()
    
    try:
        conn = sqlite3.connect(db_path)
        cursor = conn.cursor()
        
        # 获取当前用户数量
        cursor.execute("SELECT COUNT(*) FROM users")
        total_users = cursor.fetchone()[0]
        print(f"📊 数据库中共有 {total_users} 个用户")
        
        # 更新所有用户密码
        cursor.execute("""
            UPDATE users 
            SET password = ?, 
                updated_at = ?
        """, (password_hash, updated_at))
        
        affected_rows = cursor.rowcount
        conn.commit()
        
        print(f"✅ 成功更新 {affected_rows} 个用户的密码")
        print(f"🔑 新密码: {new_password}")
        print(f"🔒 密码哈希: {password_hash[:32]}...")
        
        # 显示部分用户信息验证
        cursor.execute("""
            SELECT id, username, email, is_active, points 
            FROM users 
            ORDER BY id 
            LIMIT 5
        """)
        
        print("\n📋 前5个用户信息:")
        print("-" * 80)
        print(f"{'ID':<5} {'用户名':<15} {'邮箱':<30} {'激活':<6} {'积分':<6}")
        print("-" * 80)
        
        for row in cursor.fetchall():
            user_id, username, email, is_active, points = row
            active_str = "是" if is_active else "否"
            print(f"{user_id:<5} {username:<15} {email or '无':<30} {active_str:<6} {points:<6}")
        
        print("-" * 80)
        print(f"\n✨ 所有用户密码已统一更新为: {new_password}")
        
        conn.close()
        return True
        
    except sqlite3.Error as e:
        print(f"❌ 数据库错误: {e}")
        return False
    except Exception as e:
        print(f"❌ 发生错误: {e}")
        return False

if __name__ == "__main__":
    print("🔄 开始更新所有用户密码...")
    print("=" * 80)
    update_all_passwords()
    print("=" * 80)
