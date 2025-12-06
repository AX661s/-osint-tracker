# 🚀 快速开始指南

## ⚠️ 重要提示

由于PowerShell脚本编码问题，请使用以下**新版本**脚本（带`-new`后缀）：

### ✅ 正确的脚本
- ✅ `fix-docker-new.ps1` - Docker修复
- ✅ `verify-env-files-new.ps1` - 环境变量验证
- ✅ `docker-build-and-test-new.ps1` - 完整构建
- ✅ `docker-rebuild-new.ps1` - 快速重建

### ❌ 有编码问题的旧脚本（不要使用）
- ❌ `fix-docker.ps1`
- ❌ `verify-env-files.ps1`
- ❌ `docker-build-and-test.ps1`
- ❌ `docker-rebuild.ps1`

## 🚀 部署步骤

### 步骤0: 修复端口冲突（如果端口被占用）
```powershell
.\fix-port-conflict.ps1
```

这将检查端口 3000, 8000, 27017, 6379 是否被占用，并提供选项来终止占用进程。

### 步骤1: 修复Docker（如果需要）
```powershell
.\fix-docker-new.ps1
```

**预期输出**:
```
Docker Quick Fix
========================================
Docker Desktop is running (PID: ...)
Docker connection OK: Docker version ...
Docker service is ready
Docker Compose OK: Docker Compose version ...
Docker test passed
========================================
Docker fix complete!
```

### 步骤2: 验证环境变量
```powershell
.\verify-env-files-new.ps1
```

**预期输出**:
```
Environment Variable Files Verification
========================================
Checking .env.docker ...
  [OK] HIBP_API_KEY
  [OK] OSINT_INDUSTRIES_API_KEY
  ... (所有配置项显示 [OK])
========================================
All environment variable files verified successfully
```

### 步骤3: 构建和部署
```powershell
.\docker-build-and-test-new.ps1
```

这将：
1. 验证环境文件
2. 停止现有容器
3. 构建Docker镜像（可能需要几分钟）
4. 启动所有容器
5. 显示服务状态

### 步骤4: 访问应用
- 前端: http://localhost:3000
- 后端: http://localhost:8000
- API文档: http://localhost:8000/docs

### 步骤5: 登录
```
用户名: admin
密码: admin123
```

## 🔧 常用命令

### 查看日志
```powershell
docker-compose logs -f
```

### 查看特定服务日志
```powershell
docker-compose logs -f backend
docker-compose logs -f frontend
```

### 重启服务
```powershell
docker-compose restart
```

### 停止服务
```powershell
docker-compose down
```

### 快速重建
```powershell
.\docker-rebuild-new.ps1
```

## 📊 验证部署

### 1. 检查容器状态
```powershell
docker-compose ps
```

应该看到所有服务都是 "Up" 状态。

### 2. 测试后端API
在浏览器访问: http://localhost:8000/docs

### 3. 测试前端
在浏览器访问: http://localhost:3000

### 4. 测试登录
使用 admin/admin123 登录

## 🚨 故障排除

### 问题1: 脚本语法错误
**症状**: `UnexpectedToken` 或 `TerminatorExpectedAtEndOfString`

**解决**: 使用新版本脚本（带`-new`后缀）

### 问题2: Docker连接失败
**解决**:
```powershell
.\fix-docker-new.ps1
```

### 问题3: 端口被占用
**解决**:
```powershell
# 查找占用端口的进程
netstat -ano | findstr "8000"
netstat -ano | findstr "3000"

# 杀死进程
taskkill /PID <PID> /F
```

### 问题4: 环境变量未生效
**解决**:
```powershell
# 验证环境变量
.\verify-env-files-new.ps1

# 重新构建（不使用缓存）
docker-compose build --no-cache
docker-compose up -d
```

## 📚 详细文档

- [完整部署指南.md](./完整部署指南.md) - 完整的中文指南
- [DOCKER_QUICK_START.md](./DOCKER_QUICK_START.md) - Docker快速启动
- [DOCKER_TROUBLESHOOTING.md](./DOCKER_TROUBLESHOOTING.md) - 故障排除
- [API_ARCHITECTURE.md](./API_ARCHITECTURE.md) - API架构说明

## ✅ 部署检查清单

- [ ] Docker Desktop 正在运行
- [ ] 运行 `.\fix-docker-new.ps1` 验证Docker
- [ ] 运行 `.\verify-env-files-new.ps1` 验证环境变量
- [ ] 运行 `.\docker-build-and-test-new.ps1` 构建部署
- [ ] 访问 http://localhost:3000 查看前端
- [ ] 访问 http://localhost:8000/docs 查看API文档
- [ ] 使用 admin/admin123 登录测试

## 🎯 快速命令参考

```powershell
# 完整部署流程
.\fix-docker-new.ps1
.\verify-env-files-new.ps1
.\docker-build-and-test-new.ps1

# 查看状态
docker-compose ps
docker-compose logs -f

# 重启
.\docker-rebuild-new.ps1

# 停止
docker-compose down
```

---

**准备好了吗？开始部署吧！** 🚀

运行: `.\docker-build-and-test-new.ps1`
