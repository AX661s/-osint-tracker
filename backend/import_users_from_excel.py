"""
从 Excel 文件导入用户数据到数据库
清空现有数据（除了admin），然后导入新数据
"""
import sys
import pandas as pd
from models import User, SessionLocal
from auth_operations import hash_password

def import_users_from_excel(excel_path):
    """从 Excel 导入用户数据"""
    print("=" * 80)
    print("从 Excel 导入用户数据到数据库")
    print("=" * 80)
    print()
    
    # 读取 Excel 文件（第一行也是数据，不是列名）
    try:
        df = pd.read_excel(excel_path, header=None)
        
        # 设置正确的列名（根据Excel结构：ID、用户名、邮箱、角色、积分、状态）
        df.columns = ['id', 'username', 'email', 'role', 'points', 'status', 'extra1', 'extra2']
        
        print(f"✅ 成功读取 Excel 文件: {excel_path}")
        print(f"📊 总共 {len(df)} 条记录")
        print()
        
        # 显示前5条数据
        print("数据预览:")
        print(f"{'ID':<6} {'用户名':<12} {'邮箱':<25} {'角色':<8} {'积分':<6} {'状态':<6}")
        print("-" * 80)
        for _, row in df.head(5).iterrows():
            print(f"{row['id']:<6} {row['username']:<12} {row['email']:<25} {row['role']:<8} {row['points']:<6} {row['status']:<6}")
        print()
        
    except Exception as e:
        print(f"❌ 读取 Excel 文件失败: {str(e)}")
        import traceback
        traceback.print_exc()
        return
    
    # 确认导入
    print("⚠️  警告：导入将会：")
    print("   1. 删除所有非admin用户")
    print(f"   2. 导入 {len(df)} 个新用户")
    print()
    confirm = input("确定要继续吗? (输入 'yes' 确认): ")
    
    if confirm.lower() != 'yes':
        print("❌ 操作已取消")
        return
    
    # 连接数据库
    db = SessionLocal()
    
    print()
    print("=" * 80)
    print("开始导入...")
    print("=" * 80)
    
    try:
        # 第1步：删除所有非admin用户
        print()
        print("第1步：清理现有用户...")
        deleted = db.query(User).filter(User.username != 'admin').delete()
        db.commit()
        print(f"✅ 删除了 {deleted} 个用户（保留 admin）")
        
        # 第2步：导入新用户
        print()
        print("第2步：导入新用户...")
        imported_count = 0
        skipped_count = 0
        error_count = 0
        
        for index, row in df.iterrows():
            try:
                # 提取数据
                username = str(row['username']).strip()
                email = str(row['email']).strip()
                role = str(row['role']).strip() if pd.notna(row['role']) else '用户'
                points = int(row['points']) if pd.notna(row['points']) else 100
                status = str(row['status']).strip() if pd.notna(row['status']) else '正常'
                
                # 默认密码为用户名
                password = username
                
                # 判断是否为管理员
                is_admin = (role == '管理员')
                
                # 判断是否激活（状态不是"禁用"）
                is_active = (status != '禁用')
                
                # 跳过空邮箱
                if not email or email == 'nan' or email == 'None' or '@' not in email:
                    skipped_count += 1
                    continue
                
                # 创建新用户
                hashed_pwd = hash_password(password)
                new_user = User(
                    username=username,
                    email=email,
                    password=hashed_pwd,
                    points=points,
                    is_admin=is_admin,
                    is_active=is_active
                )
                
                db.add(new_user)
                imported_count += 1
                
                # 每10条显示一次进度
                if imported_count % 10 == 0:
                    print(f"  已导入 {imported_count}/{len(df)} 个用户...")
                
            except Exception as e:
                print(f"❌ 处理第 {index+1} 行数据失败: {str(e)}")
                error_count += 1
                continue
        
        # 提交到数据库
        db.commit()
        
        print()
        print("=" * 80)
        print("✅ 导入完成！")
        print("=" * 80)
        print(f"  ✅ 成功导入: {imported_count} 个用户")
        if skipped_count > 0:
            print(f"  ⚠️  跳过: {skipped_count} 个用户（邮箱无效）")
        if error_count > 0:
            print(f"  ❌ 错误: {error_count} 个用户")
        
        # 显示数据库统计
        total_users = db.query(User).count()
        active_users = db.query(User).filter(User.is_active == True).count()
        disabled_users = db.query(User).filter(User.is_active == False).count()
        admin_users = db.query(User).filter(User.is_admin == True).count()
        
        print()
        print("📊 当前数据库统计:")
        print(f"   总用户数: {total_users}")
        print(f"   激活用户: {active_users}")
        print(f"   禁用用户: {disabled_users}")
        print(f"   管理员: {admin_users}")
        
    except Exception as e:
        db.rollback()
        print(f"❌ 导入失败: {str(e)}")
        import traceback
        traceback.print_exc()
    finally:
        db.close()

if __name__ == "__main__":
    if len(sys.argv) < 2:
        print("用法: python import_users_from_excel.py <Excel文件路径>")
        print("示例: python import_users_from_excel.py 'C:\\Users\\Administrator\\Desktop\\工作簿1 (4).xlsx'")
        sys.exit(1)
    
    excel_path = sys.argv[1]
    import_users_from_excel(excel_path)
