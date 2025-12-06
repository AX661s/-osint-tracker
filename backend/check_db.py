import sqlite3

conn = sqlite3.connect('osint_tracker.db')
cursor = conn.cursor()

# 获取所有表
cursor.execute("SELECT name FROM sqlite_master WHERE type='table'")
tables = cursor.fetchall()
print("=== 数据库表 ===")
for t in tables:
    print(f"  - {t[0]}")

# 统计各表数据量
print("\n=== 数据统计 ===")
for t in tables:
    table_name = t[0]
    cursor.execute(f"SELECT COUNT(*) FROM {table_name}")
    count = cursor.fetchone()[0]
    print(f"  {table_name}: {count} 条记录")

# 查看用户
print("\n=== 用户列表 ===")
cursor.execute("SELECT id, username, email, points, is_admin, is_active FROM users LIMIT 10")
users = cursor.fetchall()
for u in users:
    admin_flag = "👑" if u[4] else ""
    active_flag = "✓" if u[5] else "✗"
    print(f"  [{u[0]}] {u[1]} {admin_flag} | 邮箱: {u[2]} | 积分: {u[3]} | 状态: {active_flag}")

conn.close()
