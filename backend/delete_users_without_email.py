"""
删除所有没有邮箱的用户记录
"""
import sys
sys.path.append('.')

from models import User, SessionLocal
from sqlalchemy import or_

def delete_users_without_email():
    """删除所有没有邮箱的用户"""
    db = SessionLocal()
    
    try:
        # 查找所有没有邮箱的用户（email为None, 空字符串, 或'-'）
        users_without_email = db.query(User).filter(
            or_(
                User.email == None,
                User.email == '',
                User.email == '-'
            )
        ).all()
        
        total_count = len(users_without_email)
        print(f"📊 找到 {total_count} 个没有邮箱的用户")
        
        if total_count == 0:
            print("✅ 没有需要删除的用户")
            return
        
        # 显示前10个要删除的用户
        print("\n前10个要删除的用户:")
        for i, user in enumerate(users_without_email[:10], 1):
            print(f"  {i}. ID:{user.id} - {user.username} - 邮箱:'{user.email}' - 积分:{user.points}")
        
        if total_count > 10:
            print(f"  ... 还有 {total_count - 10} 个用户")
        
        # 确认删除
        confirm = input(f"\n⚠️  确定要删除这 {total_count} 个用户吗? (输入 'yes' 确认): ")
        
        if confirm.lower() != 'yes':
            print("❌ 操作已取消")
            return
        
        # 执行删除
        deleted_count = 0
        for user in users_without_email:
            # 不删除管理员账户
            if user.is_admin:
                print(f"⚠️  跳过管理员账户: {user.username}")
                continue
            
            db.delete(user)
            deleted_count += 1
        
        db.commit()
        
        print(f"\n✅ 成功删除 {deleted_count} 个用户")
        print(f"⚠️  跳过 {total_count - deleted_count} 个管理员账户")
        
        # 显示剩余用户统计
        remaining_users = db.query(User).count()
        users_with_email = db.query(User).filter(
            User.email != None,
            User.email != '',
            User.email != '-'
        ).count()
        
        print(f"\n📊 清理后统计:")
        print(f"   总用户数: {remaining_users}")
        print(f"   有邮箱的用户: {users_with_email}")
        print(f"   没有邮箱的用户: {remaining_users - users_with_email}")
        
    except Exception as e:
        db.rollback()
        print(f"❌ 删除失败: {str(e)}")
        import traceback
        traceback.print_exc()
    finally:
        db.close()

if __name__ == "__main__":
    print("="*50)
    print("  删除没有邮箱的用户")
    print("="*50)
    delete_users_without_email()
