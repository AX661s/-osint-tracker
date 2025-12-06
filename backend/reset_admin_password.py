"""
重置管理员密码脚本
"""
import sys
import os
sys.path.insert(0, os.path.dirname(__file__))

from models import SessionLocal, User
from passlib.context import CryptContext

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

def reset_admin_password(new_password: str = "admin123"):
    """重置管理员密码"""
    db = SessionLocal()
    try:
        # 查找 admin 用户
        admin = db.query(User).filter(User.username == "admin").first()
        
        if not admin:
            print("❌ 未找到 admin 用户")
            return False
        
        # 重置密码
        admin.password_hash = pwd_context.hash(new_password)
        db.commit()
        
        print(f"✅ 管理员密码已重置为: {new_password}")
        print(f"   用户名: admin")
        print(f"   密码: {new_password}")
        return True
        
    except Exception as e:
        print(f"❌ 重置密码失败: {str(e)}")
        db.rollback()
        return False
    finally:
        db.close()

if __name__ == "__main__":
    reset_admin_password()
