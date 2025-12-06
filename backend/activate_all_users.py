"""
激活所有用户
"""
from models import User, SessionLocal

db = SessionLocal()

try:
    # 查找所有未激活的用户
    inactive_users = db.query(User).filter(User.is_active == False).all()
    
    print("=" * 80)
    print(f"找到 {len(inactive_users)} 个未激活的用户")
    print("=" * 80)
    print()
    
    if len(inactive_users) == 0:
        print("✅ 所有用户都已激活！")
    else:
        confirm = input(f"确定要激活这 {len(inactive_users)} 个用户吗? (输入 'yes' 确认): ")
        
        if confirm.lower() != 'yes':
            print("❌ 操作已取消")
        else:
            # 激活所有用户
            for user in inactive_users:
                user.is_active = True
            
            db.commit()
            
            print()
            print(f"✅ 成功激活 {len(inactive_users)} 个用户！")
            print()
            
            # 显示统计
            total_users = db.query(User).count()
            active_users = db.query(User).filter(User.is_active == True).count()
            
            print("📊 当前数据库统计:")
            print(f"   总用户数: {total_users}")
            print(f"   激活用户: {active_users}")
            print(f"   禁用用户: {total_users - active_users}")
            
finally:
    db.close()
