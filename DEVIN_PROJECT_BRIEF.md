# OSINT Tracker - Devin AI Project Brief

## 🎯 Project Overview / 项目概述
**OSINT Tracker** is a full-stack intelligence gathering platform for phone numbers and email lookup across multiple OSINT APIs.

OSINT Tracker 是一个开源情报收集和分析平台，专门用于：
- 📧 邮箱查询和数据泄露检测
- 📱 电话号码查询（美国、印尼）
- 🌐 社交媒体账户查询
- 🗺️ 地理位置可视化
- 👥 用户管理和权限控制
- 💰 积分系统

## 🏗️ Architecture / 技术架构

### Backend / 后端
- **Framework**: FastAPI (Python 3.12+)
- **Database**: SQLite with SQLAlchemy ORM / MongoDB
- **Cache**: Redis
- **Authentication**: JWT + bcrypt
- **Port**: 8000 (dev), 9000 (prod)

### Frontend / 前端
- **Framework**: React 18.3
- **UI Library**: Tailwind CSS + Radix UI / shadcn/ui
- **Maps**: Leaflet + Mapbox GL
- **State Management**: React Hook Form
- **Build**: Create React App + Craco
- **Port**: 3000 (dev), 80 (prod)

### Infrastructure / 基础设施
- **Containerization**: Docker + Docker Compose
- **Web Server**: Nginx (production)
- **Services**: Backend, Frontend, MongoDB, Redis

## 🔑 Key Features / 核心功能

1. **Multi-Source Intelligence / 多源情报收集**
   - Email breach detection (Have I Been Pwned) / 邮箱数据泄露检测
   - Phone number lookup (US & Indonesia) / 电话号码查询（美国、印尼）
   - Social media tracking (Telegram, Facebook, WhatsApp) / 社交媒体追踪
   - TrueCaller integration / TrueCaller 集成

2. **User Management / 用户管理**
   - Authentication system (Session tokens) / 认证系统
   - Points-based credit system / 积分系统
   - Admin dashboard / 管理员面板
   - Role-based permissions / 基于角色的权限

3. **Data Visualization / 数据可视化**
   - Profile cards with structured data / 结构化档案卡片
   - Interactive maps (Mapbox) / 交互式地图
   - Avatar aggregation / 头像聚合
   - Historical query logs / 历史查询记录

## 📁 Directory Structure / 目录结构

```
.
├── backend/
│   ├── server.py              # FastAPI main server
│   ├── models.py              # SQLAlchemy models
│   ├── db_operations.py       # Database operations
│   ├── auth_operations.py     # Authentication logic
│   └── apis/                  # API adapters (20+ integrations)
├── frontend/
│   ├── src/
│   │   ├── App.js
│   │   ├── components/        # React components
│   │   ├── pages/             # Page components
│   │   └── services/          # API services
│   └── public/
├── docker-compose.yml
└── Documentation (10+ MD files)
```

## 🚀 Quick Start Commands / 快速启动

### Development / 开发环境
```bash
# Backend / 后端
cd backend
pip install -r requirements.txt
python server.py

# Frontend / 前端
cd frontend
yarn install
yarn start
```

### Production (Docker) / 生产环境
```bash
docker-compose up --build
```

## 🔌 External APIs / 外部 API 集成

### Core Services / 核心服务
- **RapidAPI** - Multiple service integrations / 多服务集成
- **OSINT Industries** - Professional OSINT data / 专业 OSINT 数据
- **Have I Been Pwned** - Data breach detection / 数据泄露检测

### Phone Query Services / 电话查询服务
- **Truecaller** - Global phone number lookup / 全球电话号码查询
- **IPQualityScore** - Phone verification and risk assessment / 电话验证和风险评估
- **AceLogic** - Phone number intelligence / 电话号码情报
- **Melissa** - Phone validation services / 电话验证服务

### Social Media Services / 社交媒体服务
- **WhatsApp** - WhatsApp account queries / WhatsApp 账户查询
- **Telegram** - Telegram user queries / Telegram 用户查询
- **Facebook** - Facebook profile queries / Facebook 档案查询

## 💾 Database Schema / 数据库架构

**Main Tables / 主要表**:
- `users` - User accounts with points / 用户账户和积分
- `sessions` - Login sessions / 登录会话
- `email_queries` - Email lookup history / 邮箱查询历史
- `phone_queries` - Phone lookup history / 电话查询历史
- `points_transactions` - Credit transactions / 积分交易
- `api_usage_logs` - API usage tracking / API 使用追踪

## 🔐 Security Features / 安全特性

- bcrypt password hashing / bcrypt 密码哈希
- Session token authentication / 会话令牌认证
- SQLAlchemy ORM (SQL injection prevention) / SQL 注入防护
- CORS configuration / CORS 跨域配置
- Environment variable protection / 环境变量保护
- API key management / API 密钥管理

## 📊 API Endpoints (40+) / API 端点

### Authentication / 认证
- `POST /api/auth/login`
- `POST /api/auth/verify`
- `POST /api/auth/logout`

### Queries / 查询
- `POST /api/email/query`
- `POST /api/phone/query`
- `GET /api/indonesia/profile/formatted`

### Admin / 管理
- `GET /api/admin/stats`
- `GET /api/admin/users`
- `GET /api/admin/logs/queries`

## 🎨 UI Components / 用户界面组件

- Modern dashboard with dark mode / 现代化深色主题面板
- Real-time loading animations / 实时加载动画
- Profile cards with maps / 带地图的档案卡片
- Admin panel with stats / 统计管理面板
- Error boundaries and fallbacks / 错误边界和回退

## 📦 Dependencies / 依赖项

**Backend**: fastapi, sqlalchemy, httpx, bcrypt, redis, uvicorn
**Frontend**: react, tailwindcss, mapbox-gl, axios, radix-ui

## 🎯 Potential Improvements for Devin / Devin 改进建议

1. **Add rate limiting** to prevent API abuse / 添加速率限制防止 API 滥用
2. **Implement caching layer** for repeated queries / 实现缓存层用于重复查询
3. **Add unit tests** (pytest for backend, Jest for frontend) / 添加单元测试
4. **Optimize Docker images** (multi-stage builds) / 优化 Docker 镜像
5. **Add API documentation** (Swagger/OpenAPI) / 添加 API 文档
6. **Implement WebSocket** for real-time updates / 实现 WebSocket 实时更新
7. **Add export functionality** (PDF reports) / 添加导出功能
8. **Enhance error handling** across all endpoints / 增强错误处理
9. **Add logging aggregation** (ELK stack) / 添加日志聚合
10. **Implement CI/CD pipeline** (GitHub Actions) / 实现 CI/CD 流水线

## 📝 Documentation Files / 文档文件

- `START_HERE.md` - Quick start guide / 快速开始指南
- `PROJECT_OVERVIEW_COMPLETE.md` - Full project overview (717 lines) / 完整项目概览
- `API_ARCHITECTURE.md` - API structure explanation / API 架构说明
- `DOCKER_QUICK_START.md` - Docker deployment / Docker 部署
- `INDONESIA_API_QUICK_START.md` - Indonesia API guide / 印尼 API 指南
- `POINTS_SYSTEM_QUICK_START.md` - Credits system / 积分系统

## 🔗 Repository / 仓库
https://github.com/AX661s/-osint-tracker

---

**Project Status**: ✅ Production Ready / 生产就绪
**Last Updated**: December 7, 2025
**Tech Stack**: Python FastAPI + React + Docker
**Lines of Code**: ~15,000+
