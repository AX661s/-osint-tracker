# Docker 快速启动指南

## 🚀 一键部署

### 方法1: 完整构建和测试（推荐）
```powershell
.\docker-build-and-test.ps1
```

这个脚本会：
- ✅ 验证所有环境变量文件
- ✅ 停止旧容器
- ✅ 清理旧镜像
- ✅ 重新构建镜像（包含所有API密钥）
- ✅ 启动服务
- ✅ 自动测试后端API
- ✅ 自动测试登录功能
- ✅ 自动测试前端服务

### 方法2: 快速重建
```powershell
.\docker-rebuild.ps1
```

### 方法3: 手动构建
```powershell
# 停止服务
docker-compose down

# 重新构建
docker-compose build --no-cache

# 启动服务
docker-compose up -d
```

## 📋 环境变量文件清单

已创建的文件：
- ✅ `.env.docker` - Docker Compose环境变量
- ✅ `backend/.env` - 后端开发环境变量
- ✅ `frontend/.env.development` - 前端开发环境变量
- ✅ `frontend/.env.production` - 前端生产环境变量

## 🔍 验证环境变量

运行验证脚本：
```powershell
.\verify-env-files.ps1
```

## 🔑 已配置的API密钥

### 核心服务
- ✅ Have I Been Pwned API
- ✅ OSINT Industries API
- ✅ RapidAPI (Caller ID, Truecaller)
- ✅ IPQualityScore API
- ✅ WhatsApp验证 API
- ✅ CheckLeaked API
- ✅ Mapbox地图服务

### 外部API端点
- ✅ 美国号码查询: `http://47.253.47.192:5000`
- ✅ 印尼号码查询: `http://47.253.238.111:8888`
- ✅ 印尼综合查询: `http://47.253.238.111:9989`

## 🌐 服务访问

部署成功后访问：

| 服务 | 地址 | 说明 |
|------|------|------|
| 前端应用 | http://localhost:3000 | React应用 |
| 后端API | http://localhost:8000 | FastAPI服务 |
| API文档 | http://localhost:8000/docs | Swagger UI |
| MongoDB | localhost:27017 | 数据库 |
| Redis | localhost:6379 | 缓存 |

## 🔐 登录凭据

```
用户名: admin
密码: admin123
```

## 📊 查看服务状态

```powershell
# 查看所有容器状态
docker-compose ps

# 查看实时日志
docker-compose logs -f

# 查看特定服务日志
docker-compose logs -f backend
docker-compose logs -f frontend
```

## 🔧 常用命令

### 启动和停止
```powershell
# 启动所有服务
docker-compose up -d

# 停止所有服务
docker-compose down

# 重启服务
docker-compose restart

# 重启特定服务
docker-compose restart backend
```

### 查看日志
```powershell
# 所有服务日志
docker-compose logs -f

# 后端日志
docker-compose logs -f backend

# 前端日志
docker-compose logs -f frontend

# 最近100行日志
docker-compose logs --tail=100
```

### 进入容器
```powershell
# 进入后端容器
docker exec -it osint-backend bash

# 进入前端容器
docker exec -it osint-frontend sh

# 进入MongoDB
docker exec -it osint-mongodb mongosh
```

## 🧪 测试API

### 健康检查
```powershell
curl http://localhost:8000/api/health
```

### 测试登录
```powershell
curl -X POST http://localhost:8000/api/auth/login `
  -H "Content-Type: application/json" `
  -d '{\"username\":\"admin\",\"password\":\"admin123\"}'
```

### 测试美国号码查询
```powershell
# 需要先登录获取token
$token = "your-session-token"
curl -X POST http://localhost:8000/api/phone/query `
  -H "Content-Type: application/json" `
  -H "Authorization: Bearer $token" `
  -d '{\"phone\":\"+1234567890\"}'
```

## ⚠️ 故障排除

### 问题1: 容器无法启动
```powershell
# 查看详细日志
docker-compose logs backend

# 检查端口占用
netstat -ano | findstr "8000"
netstat -ano | findstr "3000"
```

### 问题2: API密钥未生效
```powershell
# 验证环境变量
.\verify-env-files.ps1

# 重新构建镜像
docker-compose build --no-cache
docker-compose up -d
```

### 问题3: 前端无法连接后端
```powershell
# 检查后端是否运行
docker-compose ps backend

# 检查后端日志
docker-compose logs backend

# 测试后端API
curl http://localhost:8000/api/health
```

### 问题4: 数据库连接失败
```powershell
# 检查MongoDB状态
docker-compose ps mongodb

# 重启MongoDB
docker-compose restart mongodb

# 查看MongoDB日志
docker-compose logs mongodb
```

## 🔄 更新部署

### 代码更新后
```powershell
# 拉取最新代码
git pull

# 重新构建和部署
.\docker-build-and-test.ps1
```

### 仅更新环境变量
```powershell
# 修改 .env.docker 文件
# 然后重启容器
docker-compose down
docker-compose up -d
```

## 💾 数据备份

### 备份数据库
```powershell
# 备份MongoDB
docker exec osint-mongodb mongodump --out /backup

# 备份SQLite
docker cp osint-backend:/app/osint_tracker.db ./backup/
```

### 恢复数据库
```powershell
# 恢复MongoDB
docker exec osint-mongodb mongorestore /backup

# 恢复SQLite
docker cp ./backup/osint_tracker.db osint-backend:/app/
```

## 🧹 清理资源

### 清理容器和镜像
```powershell
# 停止并删除容器
docker-compose down

# 删除数据卷（谨慎！会删除所有数据）
docker-compose down -v

# 清理未使用的镜像
docker image prune -a

# 清理所有未使用的资源
docker system prune -a
```

## 📈 性能监控

### 查看资源使用
```powershell
# 查看容器资源使用
docker stats

# 查看特定容器
docker stats osint-backend osint-frontend
```

## 🔒 安全建议

1. **生产环境**：修改默认密码
2. **API密钥**：定期轮换API密钥
3. **HTTPS**：使用反向代理（Nginx）配置HTTPS
4. **防火墙**：限制端口访问
5. **日志**：定期清理和归档日志

## 📚 相关文档

- [DOCKER_BUILD_GUIDE.md](./DOCKER_BUILD_GUIDE.md) - 详细构建指南
- [API_ARCHITECTURE.md](./API_ARCHITECTURE.md) - API架构说明
- [LOGIN_DIAGNOSIS.md](./LOGIN_DIAGNOSIS.md) - 登录问题诊断

---

**最后更新**: 2025-11-30
**状态**: ✅ 所有配置文件已创建并验证
