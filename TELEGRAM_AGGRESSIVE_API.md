# Telegram Aggressive API 集成文档

## 📋 概述

Telegram Aggressive API 用于批量检测电话号码是否注册了 Telegram 账号，并获取账号信息（用户名、头像、是否Premium等）。

---

## 🔌 后端实现

### 1. API 适配器
**文件**: `/app/backend/apis/telegram_aggressive.py`

#### 主要函数:
- `check_telegram_aggressive(phone_numbers, timeout)` - 批量检测
- `check_single_telegram_aggressive(phone, timeout)` - 单号码检测

#### 示例响应:
```json
{
  "success": true,
  "data": {
    "total_checked": 1,
    "results": [
      {
        "phone_number": "+14403828826",
        "exists": true,
        "user_id": 5342571846,
        "username": "DoubleRJames",
        "first_name": "1",
        "last_name": null,
        "is_bot": false,
        "has_photo": true,
        "profile_photo": "photos/5342571846_profile.jpg",
        "profile_photo_url": "http://47.253.47.192:8084/photos/5342571846_profile.jpg"
      }
    ]
  },
  "source": "telegram_aggressive",
  "phone_count": 1
}
```

### 2. API 路由
**文件**: `/app/backend/server.py`

#### 端点 1: 批量检测 (POST)
```
POST /api/social/telegram/aggressive
Content-Type: application/json

{
  "phone_numbers": ["+14403828826", "+1234567890"]
}
```

#### 端点 2: 单号码检测 (GET)
```
GET /api/social/telegram/aggressive/+14403828826
```

---

## 🎨 前端实现

### 1. API 配置
**文件**: `/app/frontend/src/config/api.js`

```javascript
telegram: {
  username: (username) => `/telegram/username/${username}`,
  aggressive: '/social/telegram/aggressive',
  aggressiveSingle: (phone) => `/social/telegram/aggressive/${phone}`
}
```

### 2. TelegramCard 组件
**文件**: `/app/frontend/src/components/TelegramCard.jsx`

#### 特性:
- ✅ 自动查询 Telegram 账号
- ✅ 显示用户名、姓名、头像
- ✅ Premium 标识
- ✅ Bot 标识
- ✅ 点击用户名打开 Telegram
- ✅ 仅在找到账号时显示

#### 使用方法:
```jsx
import TelegramCard from './TelegramCard';

// 自动搜索
<TelegramCard phoneNumber="+14403828826" autoSearch={true} />

// 手动搜索
<TelegramCard phoneNumber={phoneNumber} autoSearch={false} />
```

### 3. 集成位置

#### 美国档案页面
**文件**: `/app/frontend/src/components/USProfileResult.jsx`
- 位置: 社交媒体部分末尾 (Snapchat Card 之后)

#### 印尼档案页面
**文件**: `/app/frontend/src/components/IndonesiaProfileResult_Simple.jsx`
- 位置: 社交媒体部分末尾 (Snapchat Card 之后)

---

## 🧪 测试

### 后端测试
```bash
# 测试批量检测
curl -X POST http://localhost:8001/api/social/telegram/aggressive \
  -H "Content-Type: application/json" \
  -d '{"phone_numbers": ["+14403828826"]}'

# 测试单号码检测
curl http://localhost:8001/api/social/telegram/aggressive/+14403828826
```

### PowerShell 测试
```powershell
# 批量检测
Invoke-RestMethod -Uri "http://localhost:8001/api/social/telegram/aggressive" `
  -Method POST `
  -ContentType "application/json" `
  -Body '{"phone_numbers": ["+14403828826"]}'

# 单号码检测
Invoke-RestMethod -Uri "http://localhost:8001/api/social/telegram/aggressive/%2B14403828826"
```

### 前端测试
1. 访问 http://localhost:3000
2. 登录系统 (admin/admin123)
3. 搜索美国号码: +14403828826
4. 在档案页面查看 Telegram 卡片

---

## 📊 数据字段说明

| 字段 | 类型 | 说明 |
|------|------|------|
| `phone_number` | string | 电话号码 |
| `exists` | boolean | 是否存在 Telegram 账号 |
| `user_id` | integer | Telegram 用户 ID |
| `username` | string | Telegram 用户名 (@username) |
| `first_name` | string | 名字 |
| `last_name` | string | 姓氏 |
| `is_bot` | boolean | 是否为 Bot |
| `has_photo` | boolean | 是否有头像 |
| `profile_photo` | string | 头像相对路径 |
| `profile_photo_url` | string | 头像完整 URL |

---

## 🎯 功能特性

### 显示逻辑
- ✅ **有账号**: 显示完整的 Telegram 卡片
- ❌ **无账号**: 显示"未找到账号"提示
- ⏳ **查询中**: 显示加载动画
- 🚫 **查询失败**: 显示错误信息

### UI 元素
- 📱 Telegram 图标
- 👤 用户头像（如果有）
- 📝 姓名和用户名
- ✅ "已注册"标识
- 👑 Premium 标识（如果是Premium用户）
- 🤖 Bot 标识（如果是Bot）
- 🔗 打开 Telegram 链接
- 🖼️ 查看头像链接

---

## 🔧 环境变量

可选配置环境变量来自定义 API 端点：

```bash
# 后端 .env
TELEGRAM_AGGRESSIVE_API_URL=http://47.253.47.192:8084/check-aggressive
```

---

## ✅ 集成清单

- [x] 后端 API 适配器 (`telegram_aggressive.py`)
- [x] 后端路由 (POST + GET)
- [x] 前端 API 配置 (`api.js`)
- [x] 前端 TelegramCard 组件
- [x] 集成到美国档案页面
- [x] 集成到印尼档案页面
- [x] 自动查询功能
- [x] 错误处理
- [x] 加载状态
- [x] Premium 标识
- [x] Bot 标识
- [x] 响应式设计

---

## 📝 注意事项

1. **仅在有账号时显示**: TelegramCard 仅在检测到 Telegram 账号时才会显示卡片
2. **自动查询**: 设置 `autoSearch={true}` 时，组件会在加载时自动查询
3. **电话号码格式**: API 会自动处理带 + 或不带 + 的号码
4. **缓存**: 建议在生产环境中添加缓存机制以减少 API 调用

---

## 🚀 部署

### 开发环境
```bash
# 重启后端
sudo supervisorctl restart backend

# 重启前端
sudo supervisorctl restart frontend
```

### 生产环境
无需额外配置，已集成到现有部署流程中。

---

## 📞 支持

如有问题，请查看日志：
```bash
# 后端日志
tail -f /var/log/supervisor/backend.err.log | grep Telegram

# 前端日志
tail -f /var/log/supervisor/frontend.out.log
```

---

**最后更新**: 2025-12-08  
**版本**: 1.0.0
