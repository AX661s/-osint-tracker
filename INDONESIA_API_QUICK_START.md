# 🚀 印尼号码查询功能 - 快速使用指南

## ✅ 已完成的集成

### 后端
- ✅ 新增模块：`backend/apis/indonesia_api_8888.py`
- ✅ 导出配置：更新 `backend/apis/__init__.py`
- ✅ 新增路由：`GET /api/indonesia/profile/formatted?phone=...` 在 `backend/server.py`

### 前端
- ✅ 工具函数：`frontend/src/utils/indonesiaFormattedProfileFetcher.js`
- ✅ 专用页面：`frontend/src/pages/IndonesiaFormattedLookupPage.jsx`
- ✅ 应用集成：`frontend/src/App.js` 中添加路由和处理函数
- ✅ 导航按钮：`SearchPage.jsx` 中添加"🇮🇩 印尼查询"按钮

---

## 🎯 使用方式

### 方式 1：通过 UI 界面

1. **启动应用**
   ```bash
   # 后端（Python）
   cd backend
   python server.py
   
   # 前端（Node.js）- 在另一个终端
   cd frontend
   npm start  # 运行在 http://localhost:3002
   ```

2. **使用界面**
   - 打开 http://localhost:3002
   - 登录或注册账户
   - 点击主页的 **"🇮🇩 印尼查询"** 按钮
   - 输入印尼电话号码（支持格式：08xxx、62xxx、+62xxx）
   - 点击"查询"获取结果

### 方式 2：通过 API 直接调用

**后端 API 端点**

```bash
# PowerShell 示例
Invoke-RestMethod -Uri "http://localhost:8000/api/indonesia/profile/formatted?phone=6281348395025" -Method Get

# 或使用 curl
curl "http://localhost:8000/api/indonesia/profile/formatted?phone=6281348395025"
```

**预期响应**

```json
{
  "success": true,
  "source": "indonesia_api_8888",
  "phone": "6281348395025",
  "data": {
    // 档案详情数据
  }
}
```

### 方式 3：在前端代码中使用

```javascript
import { queryIndonesiaPhone } from './utils/indonesiaFormattedProfileFetcher';

async function myFunction() {
  const result = await queryIndonesiaPhone('6281348395025');
  
  if (result.success) {
    console.log('查询成功:', result.data);
  } else {
    console.error('查询失败:', result.error);
  }
}
```

---

## 📁 文件结构

```
项目根目录/
├── backend/
│   ├── apis/
│   │   ├── __init__.py              ← 已更新，导出新模块
│   │   └── indonesia_api_8888.py    ← 新增，8888 API 包装器
│   ├── server.py                    ← 已更新，添加新路由
│   └── test_indonesia_8888_route.py ← 新增，测试脚本
│
├── frontend/
│   ├── src/
│   │   ├── pages/
│   │   │   └── IndonesiaFormattedLookupPage.jsx  ← 新增，专用页面
│   │   ├── utils/
│   │   │   └── indonesiaFormattedProfileFetcher.js ← 新增，工具函数
│   │   ├── components/
│   │   │   └── SearchPage.jsx       ← 已更新，添加导航按钮
│   │   └── App.js                   ← 已更新，添加路由和处理函数
│
├── INDONESIA_API_INTEGRATION_GUIDE.md    ← 详细集成文档
└── INDONESIA_API_QUICK_START.md          ← 本文件
```

---

## 🔧 支持的号码格式

| 输入格式 | 示例 | 转换为 |
|---------|------|--------|
| 国际格式 | `+6281348395025` | `6281348395025` |
| 标准格式 | `6281348395025` | `6281348395025` |
| 本地格式 | `081348395025` | `6281348395025` (自动转换) |
| 格式化 | `+62-813-483-950` | `6281348395025` |

---

## ⚡ 常见命令

### 启动开发环境

```powershell
# 打开两个 PowerShell 窗口

# 窗口 1：后端
Set-Location "C:\Users\Administrator\Desktop\新建文件夹 (18)\backend"
python server.py

# 窗口 2：前端
Set-Location "C:\Users\Administrator\Desktop\新建文件夹 (18)\frontend"
npm install  # 如需重装依赖
npm start
```

### 测试后端路由

```powershell
# 测试示例
Invoke-RestMethod -Uri "http://127.0.0.1:8000/api/indonesia/profile/formatted?phone=6281348395025" -Method Get | ConvertTo-Json -Depth 10
```

### 运行测试脚本

```bash
cd backend
python test_indonesia_8888_route.py
```

---

## 🐛 故障排除

### 问题 1：前端编译错误 "Module not found: Cannot resolve './ui/card'"

**解决**：已修复。路径已更新为 `../components/ui/card`

### 问题 2：端口已占用

```powershell
# 查找占用 3000 端口的进程
Get-Process -Name node

# 杀死进程
Stop-Process -Name node -Force
```

### 问题 3：外部 API 不可达

后端会返回：`{ "success": false, "error": "..." }`

这可能是因为：
- 外部 API 服务离线
- 网络连接问题
- 超时设置过短

**解决**：增加超时时间或检查网络连接

### 问题 4：前端无法连接后端

确保：
1. 后端运行在 `http://localhost:8000`
2. 前端环境变量正确：`REACT_APP_API_URL=http://localhost:8000/api`
3. 没有 CORS 错误（后端已配置 CORS）

---

## 📊 功能概览

### 查询单个号码

```javascript
import { queryIndonesiaPhone } from './utils/indonesiaFormattedProfileFetcher';

const result = await queryIndonesiaPhone('6281348395025');
// 返回：{ success: true, data: {...}, source: 'indonesia_api_8888', phone: '6281348395025' }
```

### 批量查询

```javascript
import { queryIndonesiaPhoneBatch } from './utils/indonesiaFormattedProfileFetcher';

const phones = ['6281348395025', '6282234567890', '6283456789012'];
const results = await queryIndonesiaPhoneBatch(phones, { 
  concurrency: 3,  // 同时处理 3 个
  timeout: 60000 
});
```

### 自定义超时

```javascript
import { fetchIndonesiaFormattedProfile } from './utils/indonesiaFormattedProfileFetcher';

const result = await fetchIndonesiaFormattedProfile('6281348395025', {
  timeout: 120000  // 120 秒
});
```

---

## 🎓 工作原理

```
用户输入号码
    ↓
前端验证 (格式化、国码处理)
    ↓
调用 /api/indonesia/profile/formatted
    ↓
后端路由调用 query_indonesia_api_8888()
    ↓
后端模块调用外部 8888 API
    ↓
返回标准化结果
    ↓
前端显示结果或错误
```

---

## 📚 相关文件

- **详细集成指南**：[INDONESIA_API_INTEGRATION_GUIDE.md](./INDONESIA_API_INTEGRATION_GUIDE.md)
- **后端实现**：`backend/apis/indonesia_api_8888.py`
- **前端工具**：`frontend/src/utils/indonesiaFormattedProfileFetcher.js`
- **前端页面**：`frontend/src/pages/IndonesiaFormattedLookupPage.jsx`

---

## ✨ 已实现的特性

✅ 号码格式化和验证  
✅ 自动 08 → 62 转换  
✅ 超时和错误处理  
✅ 单个和批量查询  
✅ 后端代理和 CORS 支持  
✅ UI 专用查询页面  
✅ 导航集成  
✅ 响应显示和导出  

---

## 🚀 下一步

1. **测试功能**：打开前端，试用印尼查询功能
2. **集成到现有流程**：在需要的地方导入工具函数
3. **自定义显示**：修改 `IndonesiaProfileResult` 组件以适应需求
4. **性能优化**：根据需要添加缓存或限流

---

## 📞 获取帮助

- 查看详细文档：`INDONESIA_API_INTEGRATION_GUIDE.md`
- 检查后端日志：运行 Python 服务器时的控制台输出
- 检查前端日志：浏览器开发者工具的控制台标签
- 运行测试脚本：`python test_indonesia_8888_route.py`

---

**最后更新**：2025-11-29  
**状态**：✅ 已完成集成和测试
