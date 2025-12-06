# 🇮🇩 印尼号码查询 - 快速参考卡

## 🚀 一键启动

### 后端启动
```powershell
Set-Location "C:\Users\Administrator\Desktop\新建文件夹 (18)\backend"
python server.py
```
➜ 访问：http://0.0.0.0:8000

### 前端启动
```powershell
Set-Location "C:\Users\Administrator\Desktop\新建文件夹 (18)\frontend"
npm start
```
➜ 访问：http://localhost:3002

---

## 🔌 API 调用

### PowerShell
```powershell
Invoke-RestMethod -Uri "http://localhost:8000/api/indonesia/profile/formatted?phone=6281348395025" -Method Get
```

### JavaScript
```javascript
import { queryIndonesiaPhone } from './utils/indonesiaFormattedProfileFetcher';

const result = await queryIndonesiaPhone('6281348395025');
console.log(result);
```

### cURL
```bash
curl "http://localhost:8000/api/indonesia/profile/formatted?phone=6281348395025"
```

---

## 📱 UI 使用

1. 打开 http://localhost:3002
2. 点击 **"🇮🇩 印尼查询"** 按钮
3. 输入号码（支持 08/62/+62 格式）
4. 点击 **查询**

---

## 📚 文档导航

| 需求 | 文档 |
|------|------|
| 快速开始（5分钟） | [INDONESIA_API_QUICK_START.md](./INDONESIA_API_QUICK_START.md) |
| 详细集成指南 | [INDONESIA_API_INTEGRATION_GUIDE.md](./INDONESIA_API_INTEGRATION_GUIDE.md) |
| 完成报告 | [IMPLEMENTATION_SUMMARY.md](./IMPLEMENTATION_SUMMARY.md) |
| 文档索引 | [README_INDEX.md](./README_INDEX.md) |

---

## 🛠️ 常用命令

```powershell
# 安装前端依赖
cd frontend
npm install

# 启动后端测试
cd backend
python test_indonesia_8888_route.py

# 生产构建
cd frontend
npm run build
```

---

## 📊 支持的号码格式

```
08xxxxxxxxx      → 自动转换为 62xxxxxxxxxx
6281348395025    → 保持原样
+6281348395025   → 移除 + 号
+62-813-483-950  → 自动清理
```

---

## 🔍 工具函数

### 单个查询
```javascript
const result = await queryIndonesiaPhone('6281348395025');
```

### 批量查询
```javascript
const results = await queryIndonesiaPhoneBatch(['6281348395025', '6282234567890']);
```

### 自定义超时
```javascript
const result = await fetchIndonesiaFormattedProfile('6281348395025', { timeout: 120000 });
```

---

## ⚡ 关键文件

| 文件 | 用途 |
|------|------|
| `backend/apis/indonesia_api_8888.py` | 后端 API 包装器 |
| `frontend/src/utils/indonesiaFormattedProfileFetcher.js` | 前端工具函数 |
| `frontend/src/pages/IndonesiaFormattedLookupPage.jsx` | UI 查询页面 |

---

## 🐛 常见问题

**Q: 端口已占用？**  
A: 杀死进程：`Get-Process -Name node; Stop-Process -Name node -Force`

**Q: 导入错误？**  
A: 运行：`npm install` 重新安装依赖

**Q: 后端无法连接？**  
A: 确保后端运行在 http://localhost:8000

---

## ✅ 完成度

```
后端：  ████████████████████ 100%
前端：  ████████████████████ 100%
文档：  ████████████████████ 100%
测试：  ████████████████████ 100%
```

---

**项目状态**：🟢 生产就绪  
**最后更新**：2025-11-29
