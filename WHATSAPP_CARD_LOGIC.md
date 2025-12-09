# WhatsApp 卡片显示逻辑说明

## 📋 显示规则

WhatsApp Profile Card 组件根据 API 返回的数据智能决定是否显示卡片：

---

## 🎯 三种情况处理

### 1️⃣ 号码未注册 WhatsApp
**API 响应**:
```json
{
  "success": true,
  "data": {
    "success": false,
    "phone": "1234567890",
    "message": "Number is not registered on WhatsApp"
  }
}
```

**卡片行为**: ❌ **不显示卡片**
- 当 `data.success === false` 时，表示号码未注册
- 组件返回 `null`，完全不渲染

---

### 2️⃣ 号码已注册，有公开头像
**API 响应**:
```json
{
  "success": true,
  "data": {
    "success": true,
    "phone": "14403828826",
    "picture_url": "https://pps.whatsapp.net/...",
    "picture_path": "/app/pictures/14403828826.jpg",
    "message": "Profile picture downloaded successfully"
  }
}
```

**卡片行为**: ✅ **显示完整卡片**
- 显示 WhatsApp 头像
- 显示电话号码
- 显示"已找到 WhatsApp 头像"消息
- 提供"打开 WhatsApp"链接
- 提供"查看原图"链接

---

### 3️⃣ 号码已注册，但无公开头像
**API 响应**:
```json
{
  "success": true,
  "data": {
    "success": true,
    "phone": "1234567890",
    "picture_url": null,
    "message": "No profile picture available"
  }
}
```

**卡片行为**: ✅ **显示基础卡片**
- 显示占位符图标（电话图标）
- 显示电话号码
- 显示"账号已注册，但无公开头像"
- 提供"打开 WhatsApp"链接
- **不显示**"查看原图"链接

---

## 🎨 UI 元素对比

| 元素 | 未注册 | 有头像 | 无头像 |
|------|--------|--------|--------|
| **整个卡片** | ❌ 不显示 | ✅ 显示 | ✅ 显示 |
| **头像图片** | - | ✅ 显示 | ❌ 占位符 |
| **电话号码** | - | ✅ 显示 | ✅ 显示 |
| **已找到标识** | - | ✅ 显示 | ✅ 显示 |
| **消息** | - | "已找到头像" | "无公开头像" |
| **打开 WhatsApp** | - | ✅ 显示 | ✅ 显示 |
| **查看原图** | - | ✅ 显示 | ❌ 不显示 |

---

## 💻 代码逻辑

### 关键判断点

```javascript
// 1. 判断是否显示卡片
if (!loading && !data) {
  return null;  // 未注册时不显示
}

// 2. 判断 API 返回
if (result.success && result.data?.success) {
  // 账号存在（有或没有头像都显示）
  setData(result.data);
} else if (result.data?.success === false) {
  // 账号不存在，不显示卡片
  setData(null);
  setError(null);
}

// 3. 头像显示
{data.picture_url ? (
  <img src={data.picture_url} ... />
) : (
  <Phone className="w-8 h-8 text-green-400/60" />  // 占位符
)}

// 4. 消息显示
{data.picture_url ? 
  (data.message || '已找到 WhatsApp 头像') : 
  '账号已注册，但无公开头像'
}

// 5. 查看原图链接
{data.picture_url && (
  <a href={data.picture_url}>查看原图</a>
)}
```

---

## 🧪 测试场景

### 测试命令

```bash
# 测试有头像的号码
curl -X POST http://localhost:8001/api/profile-picture \
  -H "Content-Type: application/json" \
  -d '{"phone": "14403828826"}'

# 测试未注册的号码
curl -X POST http://localhost:8001/api/profile-picture \
  -H "Content-Type: application/json" \
  -d '{"phone": "1234567890"}'
```

### 前端测试

1. **测试未注册号码**:
   - 搜索: +1234567890
   - 预期: WhatsApp 卡片不显示

2. **测试有头像号码**:
   - 搜索: +14403828826
   - 预期: 显示完整卡片，包含头像和所有链接

3. **测试无头像号码**:
   - 找一个已注册但无公开头像的号码
   - 预期: 显示卡片但用占位符代替头像

---

## ✨ 优化点

### 改进前问题:
- ❌ 未注册号码也显示"未找到头像"错误
- ❌ 用户看到错误信息感到困惑

### 改进后优势:
- ✅ 未注册号码完全不显示卡片（干净整洁）
- ✅ 已注册但无头像的号码显示基础信息
- ✅ 用户体验更流畅，没有无意义的错误提示

---

## 📊 用户体验流程

```
用户输入电话号码
    ↓
API 查询
    ↓
判断结果
    ├─→ 未注册 → 不显示卡片（静默处理）
    ├─→ 有头像 → 显示完整卡片
    └─→ 无头像 → 显示基础卡片（占位符）
```

---

## 🎯 设计理念

1. **静默失败**: 号码未注册时不显示任何内容，避免视觉噪音
2. **信息优先**: 即使没有头像，也显示账号存在的信息
3. **渐进式展示**: 根据可用数据量调整显示内容
4. **用户引导**: 始终提供"打开 WhatsApp"链接，方便用户操作

---

**最后更新**: 2025-12-08  
**版本**: 1.1.0
