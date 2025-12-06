# 🔍 OSINT 情报收集平台 - 完整项目概览

## 📋 项目基本信息

**项目名称**: OSINT Tracker / JackMa OSINT Platform  
**项目类型**: 全栈 Web 应用 - 开源情报收集与分析平台  
**技术栈**: 
- **后端**: Python FastAPI + SQLite + Celery
- **前端**: React + Tailwind CSS + shadcn/ui
- **部署**: Docker + Nginx

**当前状态**: ✅ 生产就绪 (Production Ready)

---

## 🎯 核心功能

### 1. 多源情报查询
- **邮箱查询**: 通过多个 OSINT API 查询邮箱相关信息
  - Have I Been Pwned (数据泄露检测)
  - OSINT Industries (综合情报)
  - 社交媒体关联
  - 域名信息

- **电话号码查询**: 
  - **美国号码**: 专用 API (端口 8888)，Melissa API、综合档案查询
  - **印尼号码**: 专用 API (端口 9999)，包含详细个人档案
  - Truecaller 查询
  - Caller ID (Facebook 关联)
  - 运营商信息

- **社交媒体查询**:
  - Telegram 用户名查询
  - Facebook 档案
  - Twitter/X 档案
  - LinkedIn 头像

### 2. 用户管理系统
- **认证系统**:
  - 用户登录/登出
  - Session Token 管理
  - 密码哈希存储 (bcrypt)
  
- **权限管理**:
  - 普通用户
  - 管理员 (无限积分)
  
- **积分系统**:
  - 查询消耗积分 (1积分/次)
  - 管理员可充值/扣费
  - 积分交易记录

### 3. 管理员面板
- **用户管理**:
  - 查看所有用户
  - 创建/编辑/删除用户
  - 调整用户积分
  - 设置管理员权限

- **系统监控**:
  - 数据库统计
  - API 使用情况
  - 查询日志
  - 活动记录

- **API 密钥管理**:
  - 查看配置的 API 密钥
  - API 使用统计
  - 成功率监控

### 4. 数据展示
- **结构化档案展示**:
  - 基本信息 (姓名、地址、年龄等)
  - 联系方式 (邮箱、电话、地址)
  - 职业信息 (公司、职位、行业)
  - 数据泄露记录
  - 社交媒体账号

- **地图可视化**:
  - Mapbox 地图集成
  - 地理位置标记
  - 卫星视图

- **头像展示**:
  - Google 头像代理
  - Facebook 头像
  - Telegram 头像
  - LinkedIn 头像

---

## 🏗️ 项目架构

### 后端架构 (`backend/`)

```
backend/
├── server.py                 # FastAPI 主服务器
├── models.py                 # SQLAlchemy 数据模型
├── db_operations.py          # 数据库操作
├── auth_operations.py        # 认证相关操作
├── celery_tasks.py          # 异步任务队列
├── requirements.txt         # Python 依赖
├── apis/                    # API 适配器模块
│   ├── __init__.py
│   ├── config.py           # API 密钥配置
│   ├── external_lookup.py  # 综合查询
│   ├── truecaller.py       # Truecaller API
│   ├── caller_id.py        # Caller ID API
│   ├── telegram_complete.py # Telegram API
│   ├── indonesia_api_*.py  # 印尼专用 API
│   ├── linkedin_avatar.py  # LinkedIn 头像
│   ├── logo_api.py         # Logo 服务
│   └── google_api.py       # Google 相关 API
└── osint_tracker.db        # SQLite 数据库

主要数据表:
- users                     # 用户表
- sessions                  # 会话表
- email_queries            # 邮箱查询记录
- phone_queries            # 电话查询记录
- search_history           # 搜索历史
- query_cache              # 查询缓存
- points_transactions      # 积分交易记录
- api_usage_logs          # API 使用日志
```

### 前端架构 (`frontend/`)

```
frontend/
├── public/
│   ├── index.html
│   └── favicon.ico
├── src/
│   ├── App.js              # 主应用组件
│   ├── index.js            # 入口文件
│   ├── components/         # React 组件
│   │   ├── LoginPage.jsx           # 登录页
│   │   ├── SearchPage.jsx          # 搜索页
│   │   ├── ResultsPage.jsx         # 结果页
│   │   ├── AdminPage.jsx           # 管理员页
│   │   ├── USProfileResult.jsx     # 美国档案
│   │   ├── IndonesiaProfileResult_Simple.jsx  # 印尼档案
│   │   ├── LoadingProgress.jsx     # 加载动画
│   │   ├── ErrorBoundary.jsx       # 错误边界
│   │   └── ui/                     # shadcn/ui 组件
│   ├── pages/              # 页面组件
│   │   ├── ComprehensivePhoneLookupPage.jsx
│   │   └── IndonesiaFormattedLookupPage.jsx
│   ├── contexts/           # React Context
│   │   └── ThemeContext.jsx
│   ├── hooks/              # 自定义 Hooks
│   ├── utils/              # 工具函数
│   └── lib/                # 库配置
├── package.json
├── tailwind.config.js
└── craco.config.js
```

---

## 🔌 API 端点

### 认证相关
- `POST /api/auth/login` - 用户登录
- `POST /api/auth/verify` - 验证会话
- `POST /api/auth/logout` - 用户登出
- `POST /api/auth/create-user` - 创建用户
- `GET /api/auth/user/{user_id}` - 获取用户信息

### 查询相关
- `POST /api/email/query` - 邮箱查询
- `GET /api/email/search` - 结构化邮箱查询
- `POST /api/phone/query` - 电话查询
- `POST /api/phone/comprehensive` - 综合电话查询
- `GET /api/indonesia/profile` - 印尼档案查询
- `GET /api/indonesia/profile/formatted` - 印尼格式化档案
- `POST /api/indonesia/query` - 印尼专用查询 (端口 9989)
- `POST /api/comprehensive/lookup` - 综合查询代理

### 社交媒体
- `GET /api/telegram/username/{username}` - Telegram 查询
- `GET /api/indonesia/social/facebook` - Facebook 查询
- `GET /api/indonesia/social/telegram` - Telegram 查询
- `GET /api/indonesia/social/truecaller` - Truecaller 查询

### 管理员相关
- `GET /api/admin/stats` - 系统统计
- `GET /api/admin/users` - 用户列表
- `PATCH /api/admin/users/{user_id}` - 更新用户
- `DELETE /api/admin/users/{user_id}` - 删除用户
- `GET /api/admin/points/stats` - 积分统计
- `GET /api/admin/points/transactions` - 积分交易记录
- `GET /api/admin/logs/queries` - 查询日志
- `GET /api/admin/logs/activities` - 活动日志
- `GET /api/admin/apikeys` - API 密钥列表
- `GET /api/admin/apikeys/usage` - API 使用统计

### 工具相关
- `GET /api/logo/{domain}` - Logo 代理
- `GET /api/avatar` - 头像代理
- `POST /api/google/avatar` - Google 头像查询
- `GET /api/google-email-lookup` - Google 邮箱查询
- `GET /api/melissa/phone` - Melissa 电话查询

### 健康检查
- `GET /api/health` - 健康检查
- `GET /api/info` - API 信息

---

## 🔐 安全特性

### 1. 认证与授权
- Session Token 机制
- 密码 bcrypt 哈希
- 管理员权限验证
- 会话过期管理

### 2. 数据保护
- SQL 注入防护 (SQLAlchemy ORM)
- XSS 防护 (React 自动转义)
- CSRF 防护 (CORS 配置)
- CSP (Content Security Policy) 头部

### 3. API 安全
- API 密钥管理
- 请求超时控制
- 错误处理
- 日志记录

### 4. 前端安全
- ErrorBoundary 错误捕获
- 输入验证
- 安全的 localStorage 使用
- HTTPS 强制 (生产环境)

---

## 📊 数据流程

### 查询流程
```
用户输入 → 前端验证 → API 请求 → 后端验证
    ↓
检查缓存 → 缓存命中 → 返回结果
    ↓ (未命中)
调用外部 API → 数据聚合 → 保存缓存
    ↓
扣除积分 → 记录日志 → 返回结果
    ↓
前端展示 → 结构化显示
```

### 积分系统流程
```
查询请求 → 验证会话 → 检查积分
    ↓
积分充足 → 执行查询 → 扣除积分
    ↓
记录交易 → 更新余额 → 返回结果
    ↓
管理员: 无限积分，不扣费
```

---

## 🚀 部署方式

### 1. 开发环境

**后端启动**:
```powershell
cd backend
pip install -r requirements.txt
python server.py
# 访问: http://localhost:8000
```

**前端启动**:
```powershell
cd frontend
npm install
npm start
# 访问: http://localhost:3000
```

### 2. 生产环境 (Docker)

**单端口部署** (推荐):
```bash
# 构建前端
cd frontend
npm run build

# 启动后端 (自动服务前端)
cd ../backend
python server.py
# 访问: http://localhost:8000
```

**Docker Compose**:
```bash
docker-compose up -d
# 访问: http://localhost:8000
```

### 3. 环境变量配置

创建 `backend/.env`:
```env
# API Keys
OSINT_INDUSTRIES_API_KEY=your_key_here
RAPIDAPI_KEY=your_key_here
IPQS_API_KEY=your_key_here
HIBP_API_KEY=your_key_here
TRUECALLER_RAPIDAPI_KEY=your_key_here
CALLER_ID_RAPIDAPI_KEY=your_key_here
MELISSA_API_KEY=your_key_here

# Database
DATABASE_URL=sqlite:///./osint_tracker.db

# CORS
CORS_ORIGINS=http://localhost:3000,http://localhost:8000

# MongoDB (可选)
MONGO_URL=mongodb://localhost:27017
DB_NAME=jackma_db
```

---

## 📦 依赖管理

### 后端依赖 (requirements.txt)
```
fastapi==0.104.1
uvicorn[standard]==0.24.0
sqlalchemy==2.0.23
python-dotenv==1.0.0
bcrypt==4.1.1
httpx==0.25.1
motor==3.3.2
celery==5.3.4
redis==5.0.1
pydantic==2.5.0
```

### 前端依赖 (package.json)
```json
{
  "dependencies": {
    "react": "^18.2.0",
    "react-dom": "^18.2.0",
    "axios": "^1.6.0",
    "lucide-react": "^0.292.0",
    "tailwindcss": "^3.3.5",
    "@radix-ui/react-*": "各种 UI 组件",
    "mapbox-gl": "^3.0.0",
    "recharts": "^2.10.0"
  }
}
```

---

## 🔧 配置文件

### 1. Docker 配置 (docker-compose.yml)
```yaml
version: '3.8'
services:
  backend:
    build: ./backend
    ports:
      - "8000:8000"
    environment:
      - DATABASE_URL=sqlite:///./osint_tracker.db
    volumes:
      - ./backend:/app
  
  frontend:
    build: ./frontend
    ports:
      - "3000:3000"
    depends_on:
      - backend
```

### 2. Nginx 配置 (nginx/nginx.conf)
```nginx
server {
    listen 80;
    server_name localhost;
    
    location /api {
        proxy_pass http://backend:8000;
    }
    
    location / {
        root /usr/share/nginx/html;
        try_files $uri /index.html;
    }
}
```

### 3. Tailwind 配置 (tailwind.config.js)
```javascript
module.exports = {
  content: ["./src/**/*.{js,jsx,ts,tsx}"],
  theme: {
    extend: {
      colors: {
        background: "hsl(var(--background))",
        foreground: "hsl(var(--foreground))",
        primary: "hsl(var(--primary))",
        // ... 更多颜色
      }
    }
  },
  plugins: [require("tailwindcss-animate")]
}
```

---

## 📝 数据库模型

### User (用户表)
```python
- id: Integer (主键)
- username: String (唯一)
- password: String (bcrypt 哈希)
- email: String (可选)
- is_admin: Boolean (默认 False)
- is_active: Boolean (默认 True)
- points: Integer (默认 0)
- created_at: DateTime
```

### Session (会话表)
```python
- id: Integer (主键)
- user_id: Integer (外键)
- session_token: String (唯一)
- expires_at: DateTime
- created_at: DateTime
```

### EmailQuery (邮箱查询记录)
```python
- id: Integer (主键)
- email: String
- query_result: Text (JSON)
- success: Boolean
- error: Text (可选)
- created_at: DateTime
```

### PhoneQuery (电话查询记录)
```python
- id: Integer (主键)
- phone: String
- query_result: Text (JSON)
- success: Boolean
- error: Text (可选)
- created_at: DateTime
```

### PointsTransaction (积分交易记录)
```python
- id: Integer (主键)
- user_id: Integer (外键)
- amount: Integer (正数=充值，负数=消费)
- transaction_type: String (recharge/consumption)
- reason: String
- operator_id: Integer (可选，管理员ID)
- created_at: DateTime
```

---

## 🎨 UI/UX 特性

### 1. 响应式设计
- 移动端适配
- 平板适配
- 桌面端优化

### 2. 主题系统
- 深色模式
- 浅色模式
- 自动切换

### 3. 交互反馈
- 加载动画
- Toast 通知
- 错误提示
- 成功提示

### 4. 数据可视化
- 地图展示
- 图表统计
- 时间线
- 卡片布局

---

## 🐛 已知问题与解决方案

### 1. CORS 问题
**问题**: 跨域请求被阻止  
**解决**: 配置 CORS 中间件，允许开发端口

### 2. 缓存问题
**问题**: 前端缓存导致更新不生效  
**解决**: 使用 `npm run build` 重新构建

### 3. API 超时
**问题**: 某些查询超时  
**解决**: 增加超时时间到 120-150 秒

### 4. 积分扣除
**问题**: 缓存命中时未扣费  
**解决**: 修改逻辑，缓存命中也扣费

### 5. 印尼号码识别
**问题**: 08 开头号码未正确识别  
**解决**: 添加自动转换 08 → 62

---

## 📚 文档索引

### 快速开始
- `QUICK_REFERENCE.md` - 快速参考指南
- `快速启动指南.md` - 中文快速启动
- `START_DEV_ENVIRONMENT.md` - 开发环境启动

### 功能文档
- `INDONESIA_API_QUICK_START.md` - 印尼 API 快速开始
- `INDONESIA_API_INTEGRATION_GUIDE.md` - 印尼 API 集成指南
- `POINTS_SYSTEM_QUICK_START.md` - 积分系统快速开始
- `COMPREHENSIVE_API_INTEGRATION.md` - 综合 API 集成

### 部署文档
- `DOCKER_DEPLOYMENT.md` - Docker 部署指南
- `RESTART_GUIDE.md` - 重启指南
- `启动测试环境.ps1` - 测试环境启动脚本

### 测试文档
- `测试指南.md` - 测试指南
- `前后端测试完成报告.md` - 测试完成报告
- `test_comprehensive_api.ps1` - 综合 API 测试

### 问题修复
- `API_FIX_SUMMARY.md` - API 修复总结
- `FINAL_FIX_SUMMARY.md` - 最终修复总结
- `JSON_PARSE_ERROR_FIX.md` - JSON 解析错误修复
- `fix_frontend_cache.md` - 前端缓存修复

---

## 🔄 开发工作流

### 1. 功能开发
```bash
# 1. 创建功能分支
git checkout -b feature/new-feature

# 2. 开发功能
# 后端: 修改 backend/apis/ 或 backend/server.py
# 前端: 修改 frontend/src/components/

# 3. 测试功能
npm test  # 前端测试
pytest    # 后端测试

# 4. 提交代码
git add .
git commit -m "feat: add new feature"
git push origin feature/new-feature
```

### 2. Bug 修复
```bash
# 1. 创建修复分支
git checkout -b fix/bug-description

# 2. 修复 bug
# 定位问题 → 修改代码 → 测试验证

# 3. 提交修复
git commit -m "fix: resolve bug description"
```

### 3. 代码审查
- 检查代码质量
- 验证功能完整性
- 测试边界情况
- 更新文档

---

## 🎯 未来规划

### 短期目标 (1-3 个月)
- [ ] 添加更多 OSINT 数据源
- [ ] 优化查询性能
- [ ] 增强缓存机制
- [ ] 改进 UI/UX

### 中期目标 (3-6 个月)
- [ ] 支持批量查询
- [ ] 添加数据导出功能
- [ ] 实现查询历史管理
- [ ] 增加数据可视化

### 长期目标 (6-12 个月)
- [ ] AI 辅助分析
- [ ] 自动化报告生成
- [ ] 多语言支持
- [ ] 移动应用开发

---

## 👥 团队与贡献

### 核心开发者
- GitHub Copilot (AI 辅助开发)
- BLACKBOXAI (代码生成与优化)

### 贡献指南
1. Fork 项目
2. 创建功能分支
3. 提交更改
4. 发起 Pull Request
5. 等待代码审查

### 代码规范
- Python: PEP 8
- JavaScript: ESLint + Prettier
- 提交信息: Conventional Commits

---

## 📞 支持与联系

### 技术支持
- 查看文档: `README_INDEX.md`
- 问题反馈: GitHub Issues
- 功能建议: GitHub Discussions

### 常见问题
1. **如何重置管理员密码?**
   - 运行 `python backend/reset_admin_password.py`

2. **如何添加新用户?**
   - 使用管理员面板或运行 `python backend/create_admin.py`

3. **如何配置 API 密钥?**
   - 编辑 `backend/.env` 文件

4. **如何清理缓存?**
   - 删除 `backend/osint_tracker.db` 中的 `query_cache` 表

---

## 📊 项目统计

```
总代码行数:     ~50,000 行
后端文件:       ~80 个
前端文件:       ~60 个
API 端点:       ~50 个
数据表:         ~10 个
文档文件:       ~40 个
测试脚本:       ~20 个
```

---

## ⚖️ 许可证

本项目采用 MIT 许可证。详见 LICENSE 文件。

---

## 🙏 致谢

感谢以下开源项目和服务:
- FastAPI - 现代化的 Python Web 框架
- React - 用户界面库
- Tailwind CSS - 实用优先的 CSS 框架
- shadcn/ui - 精美的 React 组件库
- Mapbox - 地图服务
- OSINT Industries - 情报数据源
- Have I Been Pwned - 数据泄露检测

---

**最后更新**: 2024-01-15  
**项目版本**: 1.0.0  
**文档版本**: 1.0.0

---

## 📖 快速链接

- [项目指南](./PROJECT_GUIDE.md)
- [文档索引](./README_INDEX.md)
- [快速参考](./QUICK_REFERENCE.md)
- [部署指南](./DOCKER_DEPLOYMENT.md)
- [测试指南](./测试指南.md)
