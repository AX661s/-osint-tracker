# WhatsApp Profile Picture API 集成文档

## 📋 概述

WhatsApp Profile Picture API 用于获取电话号码的 WhatsApp 头像和个人资料信息。

---

## 🔌 后端实现

### API 路由
**文件**: `/app/backend/server.py`

#### 端点: POST /api/profile-picture
```
POST /api/profile-picture
Content-Type: application/json

{
  "phone": "14403828826"
}
```

#### 外部API
- **URL**: http://47.253.47.192:8090/api/profile/picture
- **方法**: POST
- **超时**: 30秒

#### 示例响应:
```json
{
  "success": true,
  "phone": "14403828826",
  "data": {
    "success": true,
    "phone": "14403828826",
    "picture_url": "https://pps.whatsapp.net/v/t61.24694-24/425290468_711214397829444_5929681582868499324_n.jpg?ccb=11-4&oh=01_Q5Aa3QGMOSo4Bygpwe_JxPH4QsvHMGfPp9xqOSGQv9qTq8wSaw&oe=69446C16&_nc_sid=5e03e0&_nc_cat=102",
    "picture_path": "/app/pictures/14403828826.jpg",
    "message": "Profile picture downloaded successfully"
  }
}
```

---

## 🎨 前端实现

### 1. WhatsAppProfileCard 组件
**文件**: `/app/frontend/src/components/WhatsAppProfileCard.jsx`

#### 特性:
- ✅ 自动查询 WhatsApp 头像
- ✅ 显示高清头像
- ✅ WhatsApp 品牌颜色 (#00E673)
- ✅ 点击打开 WhatsApp 聊天
- ✅ 查看原图链接
- ✅ **仅在找到头像时显示卡片**

#### 使用方法:
```jsx
import WhatsAppProfileCard from './WhatsAppProfileCard';

// 自动搜索
<WhatsAppProfileCard phoneNumber="+14403828826" autoSearch={true} />

// 手动搜索
<WhatsAppProfileCard phoneNumber={phoneNumber} autoSearch={false} />
```

### 2. 集成位置

#### 美国档案页面
**文件**: `/app/frontend/src/components/USProfileResult.jsx`
- 位置: 社交媒体部分末尾 (Telegram Card 之后)

#### 印尼档案页面
**文件**: `/app/frontend/src/components/IndonesiaProfileResult_Simple.jsx`
- 位置: 社交媒体部分末尾 (Telegram Card 之后)

### 3. API 配置
**文件**: `/app/frontend/src/config/api.js`

```javascript
proxy: {
  logo: (domain) => `/logo/${domain}`,
  avatar: '/avatar',
  filterFinancial: '/filter-financial',
  profilePicture: '/profile-picture'
}
```

---

## 🧪 测试

### 后端测试
```bash
# cURL 测试
curl -X POST http://localhost:8001/api/profile-picture \
  -H "Content-Type: application/json" \
  -d '{"phone": "14403828826"}'
```

### PowerShell 测试
```powershell
# 测试 Profile Picture API
Invoke-RestMethod -Uri "http://localhost:8001/api/profile-picture" `
  -Method POST `
  -ContentType "application/json" `
  -Body '{"phone": "14403828826"}'

# 或者直接调用外部 API
Invoke-RestMethod -Uri "http://47.253.47.192:8090/api/profile/picture" `
  -Method POST `
  -ContentType "application/json" `
  -Body '{"phone": "14403828826"}'
```

### 前端测试
1. 访问 http://localhost:3000
2. 登录系统 (admin/admin123)
3. 搜索美国号码: +14403828826
4. 在档案页面查看 WhatsApp 头像卡片

---

## 📊 数据字段说明

| 字段 | 类型 | 说明 |
|------|------|------|
| `success` | boolean | 是否成功获取头像 |
| `phone` | string | 电话号码 |
| `picture_url` | string | WhatsApp 头像 URL (高清) |
| `picture_path` | string | 本地保存路径 |
| `message` | string | 状态消息 |

---

## 🎯 功能特性

### 显示逻辑
- ✅ **有头像**: 显示完整的 WhatsApp 卡片
- ❌ **无头像**: 显示"未找到头像"提示
- ⏳ **查询中**: 显示加载动画
- 🚫 **查询失败**: 显示错误信息

### UI 元素
- 📱 WhatsApp 图标 (绿色)
- 👤 用户头像 (从 WhatsApp CDN 加载)
- 📝 电话号码
- ✅ "已找到"标识
- 🔗 打开 WhatsApp 聊天链接
- 🖼️ 查看原图链接
- 📂 本地保存路径显示

---

## 🔧 电话号码格式

API 会自动清理电话号码：
- 移除 + 号
- 移除特殊字符
- 仅保留数字

### 支持的格式:
- `+14403828826` → `14403828826`
- `+1 (440) 382-8826` → `14403828826`
- `1-440-382-8826` → `14403828826`

---

## 📝 注意事项

1. **隐私保护**: WhatsApp 头像需要用户公开设置才能获取
2. **CDN链接**: 头像URL来自 WhatsApp CDN，可能有过期时间
3. **本地缓存**: 后端会将头像保存到 `/app/pictures/` 目录
4. **自动查询**: 设置 `autoSearch={true}` 时，组件会在加载时自动查询
5. **仅在找到头像时显示**: 如果没有头像，卡片不会显示

---

## 🎨 样式特性

### WhatsApp 品牌色
- 主色: `#00E673` (WhatsApp Green)
- 辅色: `#00C864` (深绿)
- 背景: `rgba(0, 230, 115, 0.15)`
- 边框: `rgba(0, 230, 115, 0.3)`

### 动画效果
- ✨ 淡入动画 (fade-in-up)
- 🎭 悬浮效果 (hover-lift)
- 💫 脉冲点 (pulse)
- 🔄 加载旋转器 (crystal-loader)

---

## 🚀 部署

### 开发环境
```bash
# 重启前端
sudo supervisorctl restart frontend
```

### 生产环境
无需额外配置，已集成到现有部署流程中。

---

## 🔗 相关API

- **Telegram Aggressive**: `/api/social/telegram/aggressive`
- **Profile Picture**: `/api/profile-picture`
- **Google Avatar**: `/api/google/avatar`
- **Avatar Proxy**: `/api/avatar`

---

## 📞 支持

如有问题，请查看日志：
```bash
# 后端日志
tail -f /var/log/supervisor/backend.err.log | grep "Profile Picture"

# 前端日志
tail -f /var/log/supervisor/frontend.out.log
```

---

## ✅ 集成清单

- [x] 后端API路由 (`/api/profile-picture`)
- [x] 前端 API 配置 (`api.js`)
- [x] 前端 WhatsAppProfileCard 组件
- [x] 集成到美国档案页面
- [x] 集成到印尼档案页面
- [x] 自动查询功能
- [x] 错误处理
- [x] 加载状态
- [x] WhatsApp 聊天链接
- [x] 响应式设计

---

**最后更新**: 2025-12-08  
**版本**: 1.0.0
