# 社交媒体Logo集成文档

## 📋 概述

所有社交媒体卡片现在都使用统一的logo代理服务 (`/api/logo/{domain}`) 来显示品牌的原始logo。

---

## 🔌 Logo代理服务

### API端点
**路由**: `/api/logo/{domain}`  
**方法**: GET  
**文件**: `/app/backend/server.py`

### 工作原理
Logo代理会按顺序尝试以下三个来源：

1. **Clearbit Logo API** (首选)
   - URL: `https://logo.clearbit.com/{domain}`
   - 特点: 高质量SVG/PNG格式的品牌logo
   
2. **站点Favicon**
   - URL: `https://{domain}/favicon.ico`
   - 特点: 直接从官网获取
   
3. **DuckDuckGo Icons** (后备)
   - URL: `https://icons.duckduckgo.com/ip3/{domain}.ico`
   - 特点: 覆盖率更高

### 代码实现
```python
@api_router.get("/logo/{domain}")
async def get_logo(domain: str):
    candidates = [
        f"https://logo.clearbit.com/{dom}",
        f"https://{dom}/favicon.ico",
        f"https://icons.duckduckgo.com/ip3/{dom}.ico",
    ]
    # 依次尝试每个来源
    for url in candidates:
        # 返回第一个成功的结果
```

---

## 🎨 前端集成

### 已集成的社交媒体卡片

#### 1. WhatsApp
**组件**: `WhatsAppProfileCard.jsx`  
**域名**: `whatsapp.com`

```jsx
<img 
  src="/api/logo/whatsapp.com"
  alt="WhatsApp"
  className="w-5 h-5 object-contain"
  onError={(e) => {
    // 降级到图标
    e.target.style.display = 'none';
    e.target.nextElementSibling.style.display = 'block';
  }}
/>
<Phone className="w-5 h-5 text-green-400" style={{ display: 'none' }} />
```

#### 2. Telegram
**组件**: `TelegramCard.jsx`  
**域名**: `telegram.org`

```jsx
<img 
  src="/api/logo/telegram.org"
  alt="Telegram"
  className="w-5 h-5 object-contain"
  onError={(e) => {
    // 降级到图标
    e.target.style.display = 'none';
    e.target.nextElementSibling.style.display = 'block';
  }}
/>
<Send className="w-5 h-5 text-blue-400" style={{ display: 'none' }} />
```

#### 3. Snapchat
**文件**: `USProfileResult.jsx` / `IndonesiaProfileResult_Simple.jsx`  
**域名**: `snapchat.com`

```jsx
<img 
  src={`${API_BASE}/logo/snapchat.com`}
  alt="Snapchat"
  className="w-full h-full object-cover"
/>
```

#### 4. 其他平台
类似的集成方式可应用于：
- Facebook: `facebook.com`
- Instagram: `instagram.com`
- Twitter: `twitter.com`
- LinkedIn: `linkedin.com`
- TikTok: `tiktok.com`

---

## ✨ 优势

### 1. 品牌一致性
- ✅ 显示真实的品牌logo
- ✅ 保持品牌视觉识别
- ✅ 专业的UI外观

### 2. 自动降级
- ✅ Logo加载失败时自动显示图标
- ✅ 用户体验不中断
- ✅ 无需手动处理错误

### 3. 缓存友好
- ✅ 浏览器自动缓存logo
- ✅ 减少重复请求
- ✅ 提升加载速度

### 4. 统一管理
- ✅ 单一代理端点
- ✅ 避免CORS问题
- ✅ 集中式错误处理

---

## 🧪 测试

### 测试Logo可用性

```bash
# 测试 WhatsApp logo
curl -I http://localhost:8001/api/logo/whatsapp.com
# 预期: HTTP 200 + 图片内容 (2KB)

# 测试 Telegram logo  
curl -I http://localhost:8001/api/logo/telegram.org
# 预期: HTTP 200 + 图片内容 (4KB)

# 测试 Snapchat logo
curl -I http://localhost:8001/api/logo/snapchat.com
# 预期: HTTP 200 + 图片内容

# 下载查看
curl http://localhost:8001/api/logo/whatsapp.com -o /tmp/whatsapp.png
```

### 浏览器测试

1. 访问 http://localhost:3000
2. 登录并搜索电话号码
3. 查看社交媒体部分
4. 检查logo是否正确显示

---

## 📊 支持的域名列表

| 平台 | 域名 | 状态 |
|------|------|------|
| WhatsApp | whatsapp.com | ✅ 已集成 |
| Telegram | telegram.org | ✅ 已集成 |
| Snapchat | snapchat.com | ✅ 已集成 |
| Facebook | facebook.com | ✅ 可用 |
| Instagram | instagram.com | ✅ 可用 |
| Twitter/X | twitter.com | ✅ 可用 |
| LinkedIn | linkedin.com | ✅ 可用 |
| TikTok | tiktok.com | ✅ 可用 |
| YouTube | youtube.com | ✅ 可用 |
| Reddit | reddit.com | ✅ 可用 |

---

## 🎯 使用指南

### 在新组件中集成Logo

```jsx
import React from 'react';

const SocialCard = ({ platform, domain }) => {
  return (
    <div className="icon-container">
      {/* Logo图片 */}
      <img 
        src={`/api/logo/${domain}`}
        alt={platform}
        className="w-5 h-5 object-contain"
        onError={(e) => {
          // 降级到默认图标
          e.target.style.display = 'none';
          e.target.nextElementSibling.style.display = 'block';
        }}
      />
      
      {/* 降级图标 (默认隐藏) */}
      <DefaultIcon 
        className="w-5 h-5" 
        style={{ display: 'none' }} 
      />
    </div>
  );
};
```

### 降级策略

1. **首选**: 使用Logo代理
2. **降级**: 加载失败时显示Lucide图标
3. **样式**: 图标保持与logo相同尺寸

---

## 🔧 性能优化

### 1. 浏览器缓存
Logo通过代理获取，浏览器会自动缓存：
- 减少网络请求
- 加快页面加载
- 降低服务器负载

### 2. 超时设置
Logo代理设置了5秒超时：
```python
async with httpx.AsyncClient(timeout=5) as client:
```

### 3. 多源后备
三个来源确保高可用性：
- Clearbit (高质量)
- 官网Favicon (直接)
- DuckDuckGo (覆盖率)

---

## 🚨 错误处理

### 前端错误处理
```jsx
onError={(e) => {
  e.target.style.display = 'none';
  e.target.nextElementSibling.style.display = 'block';
}}
```

### 后端错误处理
```python
try:
    # 尝试获取logo
    for url in candidates:
        resp = await client.get(url)
        if resp.status_code == 200:
            return Response(content=resp.content)
except Exception:
    # 返回404
    raise HTTPException(status_code=404)
```

---

## 📝 最佳实践

### 1. 使用正确的域名
- ✅ `whatsapp.com` (不是 `wa.me`)
- ✅ `telegram.org` (不是 `t.me`)
- ✅ `snapchat.com` (不是 `snap.com`)

### 2. 设置降级图标
始终提供一个降级图标：
```jsx
<IconComponent style={{ display: 'none' }} />
```

### 3. 适当的尺寸
- 小图标: `w-5 h-5` (20x20px)
- 中图标: `w-8 h-8` (32x32px)
- 大图标: `w-10 h-10` (40x40px)

### 4. object-contain
使用 `object-contain` 保持长宽比：
```jsx
className="w-5 h-5 object-contain"
```

---

## 🎨 样式示例

### 圆形容器
```jsx
<div className="w-10 h-10 rounded-full overflow-hidden">
  <img src="/api/logo/whatsapp.com" />
</div>
```

### 方形容器
```jsx
<div className="w-10 h-10 rounded-lg overflow-hidden">
  <img src="/api/logo/telegram.org" />
</div>
```

### 带背景的容器
```jsx
<div className="icon-container" style={{
  background: 'linear-gradient(135deg, rgba(0, 230, 115, 0.2), ...)',
  border: '1px solid rgba(0, 230, 115, 0.3)'
}}>
  <img src="/api/logo/whatsapp.com" />
</div>
```

---

## ✅ 验证清单

- [x] Logo代理服务正常工作
- [x] WhatsApp使用whatsapp.com logo
- [x] Telegram使用telegram.org logo
- [x] Snapchat使用snapchat.com logo
- [x] 降级机制工作正常
- [x] 浏览器缓存生效
- [x] 错误处理完善

---

**最后更新**: 2025-12-09  
**版本**: 1.0.0
