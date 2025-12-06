# OSINT Tracker - Devin AI Setup Instructions / 设置说明

## 🚀 Quick Setup / 快速启动

### Step 1: Copy Environment File / 复制环境配置
```bash
cp .env.example .env
```

### Step 2: Install Backend Dependencies / 安装后端依赖
```bash
cd ~/repos/-osint-tracker/backend
pip install -r requirements.txt
```

### Step 3: Start the Application / 启动应用

#### Option A: Backend Only (Recommended) / 单端口模式（推荐）
```bash
cd ~/repos/-osint-tracker/backend
python server.py
```
- 🌐 Application / 应用地址: http://localhost:8000
- 📚 API Docs / API 文档: http://localhost:8000/docs

#### Option B: Full Development Mode / 开发模式
**Terminal 1 - Backend / 终端1 - 后端:**
```bash
cd ~/repos/-osint-tracker/backend
python server.py
```

**Terminal 2 - Frontend / 终端2 - 前端:**
```bash
cd ~/repos/-osint-tracker/frontend
yarn start
```
- 🎨 Frontend / 前端: http://localhost:3000
- 🔧 Backend / 后端: http://localhost:8000

### Step 4: Login / 登录信息
```
Username / 用户名: admin999999
Password / 密码: admin123
```

---

## 🐍 Python Version Requirements / Python 版本要求

**Required / 必需**: Python 3.9 or higher / Python 3.9 或更高版本
**Recommended / 推荐**: Python 3.12

Check version / 检查版本:
```bash
python --version
```

---

## 📦 Key Dependencies / 主要依赖

### Backend / 后端
- `fastapi>=0.115.2` - Web framework / Web 框架
- `uvicorn==0.25.0` - ASGI server / ASGI 服务器
- `sqlalchemy>=2.0.0` - ORM
- `bcrypt==4.1.3` - Password hashing / 密码哈希
- `httpx==0.27.2` - HTTP client / HTTP 客户端

### Frontend / 前端
- `react@18.3.1` - UI framework / UI 框架
- `axios@1.8.4` - HTTP client / HTTP 客户端
- `tailwindcss` - CSS framework / CSS 框架
- `mapbox-gl@3.16.0` - Maps / 地图

---

## 🗄️ Database / 数据库

**Default / 默认**: SQLite (auto-created at `backend/osint_tracker.db`)
- No setup required / 无需设置
- Automatically initializes on first run / 首次运行自动初始化
- Creates default admin user / 创建默认管理员用户

**Optional / 可选**: MongoDB (for advanced features / 高级功能)
- Configure `MONGO_URL` in `.env` / 在 `.env` 中配置

---

## 🔑 API Key Configuration / API 密钥配置

### Minimal Setup (for testing) / 最小配置（测试用）
Only these are required for basic functionality / 基本功能只需要这些:
```bash
DATABASE_URL=sqlite:///./osint_tracker.db
BACKEND_PORT=8000
ENVIRONMENT=development
DEBUG=true
```

### Full Setup (for production) / 完整配置（生产用）
Edit `.env` and configure / 编辑 `.env` 文件并配置:

```bash
# Core Services / 核心服务
RAPIDAPI_KEY=your-rapidapi-key
OSINT_INDUSTRIES_API_KEY=your-osint-industries-api-key
HIBP_API_KEY=your-hibp-api-key

# Phone Query Services / 电话查询服务
TRUECALLER_RAPIDAPI_KEY=your-truecaller-rapidapi-key
IPQS_API_KEY=your-ipqs-api-key
ACELOGIC_API_KEY=your-acelogic-api-key

# Social Media Services / 社交媒体服务
WHATSAPP_API_KEY=your-whatsapp-api-key
WHATSAPP_RAPIDAPI_KEY=your-whatsapp-rapidapi-key
```

---

## 🚀 Docker Setup (Alternative) / Docker 设置（可选）

If you prefer Docker / 如果您偏好 Docker:
```bash
# Build and start / 构建并启动
docker-compose up --build

# Access / 访问
# Frontend: http://localhost:80
# Backend: http://localhost:9000
```

---

## 🧪 Testing the Setup / 测试设置

### 1. Check Backend Health / 检查后端健康状态
```bash
curl http://localhost:8000/api/health
```

Expected response / 预期响应:
```json
{"status": "healthy", "version": "1.0.0"}
```

### 2. Test Login / 测试登录
```bash
curl -X POST http://localhost:8000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username":"admin999999","password":"admin123"}'
```

### 3. Access API Documentation / 访问 API 文档
Open browser / 打开浏览器: http://localhost:8000/docs

---

## 📁 Project Structure / 项目结构

```
-osint-tracker/
├── backend/
│   ├── server.py              # Main FastAPI server / 主 FastAPI 服务器
│   ├── models.py              # Database models / 数据库模型
│   ├── requirements.txt       # Python dependencies / Python 依赖
│   └── apis/                  # API integrations / API 集成
├── frontend/
│   ├── src/
│   │   ├── App.js            # Main React component / 主 React 组件
│   │   └── components/       # UI components / UI 组件
│   └── package.json          # Node dependencies / Node 依赖
├── .env.example              # Environment template / 环境变量模板
└── docker-compose.yml        # Docker configuration / Docker 配置
```

---

## 🔧 Common Issues & Solutions / 常见问题与解决方案

### Issue 1: Port Already in Use / 端口被占用
```bash
# Find and kill process on port 8000 / 查找并终止端口 8000 上的进程
lsof -ti:8000 | xargs kill -9
```

### Issue 2: SQLite Permission Error / SQLite 权限错误
```bash
# Give write permissions to backend directory / 给后端目录写权限
chmod 777 backend/
```

### Issue 3: Missing Dependencies / 缺少依赖
```bash
# Reinstall all dependencies / 重新安装所有依赖
pip install -r backend/requirements.txt --force-reinstall
```

### Issue 4: Frontend Build Errors / 前端构建错误
```bash
# Clear cache and reinstall / 清除缓存并重新安装
cd frontend
rm -rf node_modules yarn.lock
yarn install
```

---

## 🎯 Devin Tasks / Devin 任务建议

Once setup is complete, you can ask Devin to / 设置完成后，您可以要求 Devin:

1. **Code Review / 代码审查**
   - "Review the authentication system in `backend/auth_operations.py`"
   - "Analyze the API architecture in `backend/server.py`"

2. **Add Features / 添加功能**
   - "Add rate limiting to prevent API abuse"
   - "Implement pagination for query history"
   - "Add export functionality for search results"

3. **Testing / 测试**
   - "Create unit tests for authentication endpoints"
   - "Add integration tests for phone lookup APIs"

4. **Optimization / 优化**
   - "Optimize Docker build times"
   - "Add caching layer for repeated queries"
   - "Refactor frontend components for better performance"

---

## 📊 Database Schema / 数据库架构

### Main Tables / 主要表
- **users** - User accounts (id, username, password, points, is_admin)
- **sessions** - Login sessions (token, user_id, created_at)
- **email_queries** - Email lookup history / 邮箱查询历史
- **phone_queries** - Phone lookup history / 电话查询历史
- **points_transactions** - Credit system transactions / 积分系统交易

### Auto-Created Admin User / 自动创建的管理员用户
```
Username / 用户名: admin999999
Password / 密码: admin123
Points / 积分: 999999 (unlimited / 无限)
Is Admin / 是否管理员: true
```

---

## 🔐 Security Notes / 安全说明

### Development Mode / 开发模式
- SQLite database with default admin credentials / 使用默认管理员凭据的 SQLite 数据库
- CORS allows localhost origins / CORS 允许本地主机源
- Debug mode enabled / 启用调试模式

### Production Deployment / 生产部署
Before deploying to production / 部署到生产环境之前:
1. ✅ Change `ADMIN_PASSWORD` in `.env` / 更改 `.env` 中的 `ADMIN_PASSWORD`
2. ✅ Set `DEBUG=false` / 设置 `DEBUG=false`
3. ✅ Configure proper `ALLOWED_ORIGINS` / 配置适当的 `ALLOWED_ORIGINS`
4. ✅ Use environment-specific secrets / 使用特定环境的密钥
5. ✅ Enable HTTPS / 启用 HTTPS

---

## 📚 Additional Documentation / 附加文档

- `START_HERE.md` - Quick start guide / 快速开始指南
- `PROJECT_OVERVIEW_COMPLETE.md` - Full project documentation / 完整项目文档
- `API_ARCHITECTURE.md` - API design details / API 设计详情
- `DOCKER_QUICK_START.md` - Docker deployment guide / Docker 部署指南

---

**Setup Time / 设置时间**: ~5 minutes / 约5分钟
**First Run / 首次运行**: Application auto-initializes database and creates admin user / 应用自动初始化数据库并创建管理员用户
**Default URL / 默认地址**: http://localhost:8000
**Status / 状态**: ✅ Ready for Development / 开发就绪
