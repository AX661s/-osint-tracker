# API 架构说明

## 当前API调用流程

### 1. 印尼号码查询 (Indonesia)

**前端调用**:
```javascript
// App.js 中
endpoint = `${API_BASE_URL}/indonesia/profile/formatted`;
// API_BASE_URL = http://localhost:8000/api
```

**后端路由**: `GET /api/indonesia/profile/formatted`
- **文件**: `backend/server.py`
- **函数**: `indonesia_profile_formatted_proxy()`
- **外部API**: `http://47.253.238.111:8888/api/profile`
- **适配器**: `backend/apis/indonesia_api_8888.py`

**数据流**:
```
前端 → http://localhost:8000/api/indonesia/profile/formatted
     → 后端代理 → http://47.253.238.111:8888/api/profile
     → 返回格式化的印尼号码数据
```

---

### 2. 美国号码查询 (USA)

**前端调用**:
```javascript
// App.js 中
endpoint = `${API_BASE_URL}/phone/query`;
payload = { phone: query, timeout: 120, session_token: sessionToken };
```

**后端路由**: `POST /api/phone/query`
- **文件**: `backend/server.py`
- **函数**: `query_phone()`
- **外部API**: `http://47.253.47.192:5000/api/v1/lookup/comprehensive`
- **调用位置**: 在 `query_phone()` 函数内部

**数据流**:
```
前端 → http://localhost:8000/api/phone/query
     → 后端处理:
        1. 检查缓存
        2. 调用 http://47.253.47.192:5000/api/v1/lookup/comprehensive
        3. 转换数据格式 (user_profile → basic_info, contact_info等)
        4. 保存到数据库
        5. 返回格式化数据
```

---

## API端点总结

### 后端提供的端点 (localhost:8000)

#### 认证相关
- `POST /api/auth/login` - 用户登录
- `POST /api/auth/verify` - 验证会话
- `POST /api/auth/logout` - 用户登出
- `POST /api/auth/create-user` - 创建用户

#### 查询相关
- `POST /api/email/query` - 邮箱查询
- `POST /api/phone/query` - 电话查询（美国号码，内部调用5000 API）
- `GET /api/indonesia/profile/formatted` - 印尼号码查询（代理到8888 API）
- `POST /api/phone/comprehensive` - 综合电话查询（从数据库读取）

#### 管理员相关
- `GET /api/admin/stats` - 统计数据
- `GET /api/admin/users` - 用户列表
- `GET /api/admin/points/stats` - 积分统计
- `GET /api/admin/logs/queries` - 查询日志

---

## 外部API服务

### 1. 美国号码综合查询 API (5000端口)
- **地址**: `http://47.253.47.192:5000`
- **端点**: `/api/v1/lookup/comprehensive`
- **方法**: POST
- **用途**: 查询美国电话号码的综合信息
- **返回**: user_profile, acelogic_name_data等

### 2. 印尼号码格式化API (8888端口)
- **地址**: `http://47.253.238.111:8888`
- **端点**: `/api/profile`
- **方法**: GET
- **用途**: 查询印尼电话号码的格式化信息
- **返回**: 结构化的印尼号码数据

---

## 前端配置

### API Base URL
```javascript
const API_BASE_URL = process.env.REACT_APP_API_URL || 
  (process.env.NODE_ENV === 'production' ? '/api' : 'http://localhost:8000/api');
```

### 开发环境
- 前端: `http://localhost:随机端口` (如 22612)
- 后端: `http://localhost:8000`
- API前缀: `/api`

### 生产环境
- 前端和后端同源部署
- API前缀: `/api`

---

## CORS配置

### 当前配置（已修复）
```python
app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origin_regex=r"http://(localhost|127\.0\.0\.1|0\.0\.0\.0):\d+",
    allow_methods=["*"],
    allow_headers=["*"],
)
```

**说明**: 允许所有localhost端口，解决前端随机端口问题

---

## 数据转换

### 美国号码 (5000 API)
后端在 `query_phone()` 中进行数据转换：
```python
# 原始数据: comprehensive_result['user_profile']
# 转换为:
result_dict['basic_info'] = {...}
result_dict['contact_info'] = {...}
result_dict['professional_info'] = {...}
result_dict['data_breaches'] = {...}
result_dict['summary'] = {...}
```

### 印尼号码 (8888 API)
通过 `indonesia_api_8888.py` 适配器处理，返回格式化数据

---

## 验证状态

✅ 后端已正确配置外部API调用
✅ 前端已正确使用后端端点
✅ CORS已修复支持所有localhost端口
✅ 数据转换逻辑已实现

---

## 测试建议

### 测试美国号码
```bash
curl -X POST http://localhost:8000/api/phone/query \
  -H "Content-Type: application/json" \
  -d '{"phone": "14403828826", "timeout": 120}'
```

### 测试印尼号码
```bash
curl http://localhost:8000/api/indonesia/profile/formatted?phone=6281348395025
```

---

**生成时间**: 2025-11-30
**状态**: ✅ 所有API已正确配置和连接
