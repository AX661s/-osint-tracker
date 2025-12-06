# OSINT Tracker - Devin AI 设置说明

## 🚀 快速启动

```bash
# 1. 复制环境配置
cp .env.example .env

# 2. 安装 Python 依赖
cd ~/repos/-osint-tracker/backend
pip install -r requirements.txt

# 3. 启动应用（单端口模式 - 推荐）
python server.py
```

## 📋 访问信息

- **应用地址**: http://localhost:8000
- **默认登录**: 
  - 用户名: `admin999999`
  - 密码: `admin123`

## 🔧 开发模式（可选）

如果需要前端热重载开发：

```bash
# 终端 1: 启动后端
cd ~/repos/-osint-tracker/backend
python server.py

# 终端 2: 启动前端开发服务器
cd ~/repos/-osint-tracker/frontend
yarn start
```

- 前端开发服务器: http://localhost:3000
- 后端 API: http://localhost:8000

## 🔑 API 密钥配置

编辑 `.env` 文件添加您的 API 密钥：

```bash
# 核心服务
RAPIDAPI_KEY=your-rapidapi-key
OSINT_INDUSTRIES_API_KEY=your-osint-industries-api-key
HIBP_API_KEY=your-hibp-api-key

# 电话查询服务
TRUECALLER_RAPIDAPI_KEY=your-truecaller-rapidapi-key
IPQS_API_KEY=your-ipqs-api-key
ACELOGIC_API_KEY=your-acelogic-api-key

# 社交媒体服务
WHATSAPP_API_KEY=your-whatsapp-api-key
WHATSAPP_RAPIDAPI_KEY=your-whatsapp-rapidapi-key
```

## 📁 项目结构

```
/
├── backend/           # Python FastAPI 后端
├── frontend/          # React 前端
├── nginx/            # Nginx 配置
├── .env.example      # 环境变量模板
└── docker-compose.yml # Docker 配置
```

## 🛠️ 故障排除

### 端口冲突
如果端口 8000 被占用：
```bash
# 查看端口占用
lsof -i :8000

# 修改 .env 文件中的 BACKEND_PORT
```

### 依赖问题
```bash
# 重新安装依赖
cd ~/repos/-osint-tracker/backend
pip install --upgrade -r requirements.txt

cd ~/repos/-osint-tracker/frontend
yarn install --force
```

### 数据库重置
```bash
# 删除数据库文件重新初始化
rm ~/repos/-osint-tracker/backend/osint_tracker.db
```

## 📚 相关文档

- [项目概览](PROJECT_OVERVIEW_COMPLETE.md)
- [API 架构](API_ARCHITECTURE.md)
- [Docker 快速开始](DOCKER_QUICK_START.md)
- [快速参考](QUICK_REFERENCE.md)