# 🤖 Devin AI Setup Instructions

## 📋 Quick Setup for Devin

### Step 1: Copy Environment File
```bash
cp .env.example .env
```

### Step 2: Install Backend Dependencies
```bash
cd ~/repos/-osint-tracker/backend
pip install -r requirements.txt
```

### Step 3: Install Frontend Dependencies (Optional)
```bash
cd ~/repos/-osint-tracker/frontend
npm install
```

### Step 4: Start the Application

#### Option A: Backend Only (Serves both frontend and backend)
```bash
cd ~/repos/-osint-tracker/backend
python server.py
```
- 🌐 Application: http://localhost:8000
- 📚 API Docs: http://localhost:8000/docs

#### Option B: Full Development Mode
**Terminal 1 - Backend:**
```bash
cd ~/repos/-osint-tracker/backend
python server.py
```

**Terminal 2 - Frontend:**
```bash
cd ~/repos/-osint-tracker/frontend
npm start
```
- 🎨 Frontend: http://localhost:3000
- 🔧 Backend: http://localhost:8000

### Step 5: Login
```
Username: admin999999
Password: admin123
```

---

## 🐍 Python Version Requirements

**Required**: Python 3.9 or higher
**Recommended**: Python 3.11

Check version:
```bash
python --version
```

---

## 📦 Key Dependencies

### Backend
- `fastapi>=0.115.2` - Web framework
- `uvicorn==0.25.0` - ASGI server
- `sqlalchemy>=2.0.0` - ORM
- `bcrypt==4.1.3` - Password hashing
- `httpx==0.27.2` - HTTP client
- `redis`, `celery` - Task queue (optional)

### Frontend
- `react@18.3.1` - UI framework
- `axios@1.8.4` - HTTP client
- `tailwindcss` - CSS framework
- `mapbox-gl@3.16.0` - Maps

---

## 🗄️ Database

**Default**: SQLite (auto-created at `backend/osint_tracker.db`)
- No setup required
- Automatically initializes on first run
- Creates default admin user

**Optional**: MongoDB (for advanced features)
- Configure `MONGO_URL` in `.env`

---

## 🔑 Environment Variables

### Minimal Setup (for testing)
Only these are required for basic functionality:
```bash
DATABASE_URL=sqlite:///./osint_tracker.db
BACKEND_PORT=8000
ENVIRONMENT=development
DEBUG=true
```

### Full Setup (for production)
Edit `.env` and configure:
1. **Admin credentials**: `ADMIN_USERNAME`, `ADMIN_PASSWORD`
2. **API keys**: See `.env.example` for all available services
3. **External APIs**: HIBP, OSINT Industries, TrueCaller, etc.

---

## 🚀 Docker Setup (Alternative)

If you prefer Docker:
```bash
# Build and start
docker-compose up --build

# Access
# Frontend: http://localhost:80
# Backend: http://localhost:9000
```

---

## 🧪 Testing the Setup

### 1. Check Backend Health
```bash
curl http://localhost:8000/api/health
```

Expected response:
```json
{"status": "healthy", "version": "1.0.0"}
```

### 2. Test Login
```bash
curl -X POST http://localhost:8000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username":"admin999999","password":"admin123"}'
```

### 3. Access API Documentation
Open browser: http://localhost:8000/docs

---

## 📁 Project Structure

```
-osint-tracker/
├── backend/
│   ├── server.py              # Main FastAPI server
│   ├── models.py              # Database models
│   ├── requirements.txt       # Python dependencies
│   └── apis/                  # API integrations
├── frontend/
│   ├── src/
│   │   ├── App.js            # Main React component
│   │   └── components/       # UI components
│   └── package.json          # Node dependencies
├── .env.example              # Environment template
└── docker-compose.yml        # Docker configuration
```

---

## 🔧 Common Issues & Solutions

### Issue 1: Port Already in Use
```bash
# Find and kill process on port 8000
lsof -ti:8000 | xargs kill -9
```

### Issue 2: SQLite Permission Error
```bash
# Give write permissions to backend directory
chmod 777 backend/
```

### Issue 3: Missing Dependencies
```bash
# Reinstall all dependencies
pip install -r backend/requirements.txt --force-reinstall
```

### Issue 4: Frontend Build Errors
```bash
# Clear cache and reinstall
cd frontend
rm -rf node_modules package-lock.json
npm install
```

---

## 🎯 Devin Tasks

Once setup is complete, you can ask Devin to:

1. **Code Review**
   - "Review the authentication system in `backend/auth_operations.py`"
   - "Analyze the API architecture in `backend/server.py`"

2. **Add Features**
   - "Add rate limiting to prevent API abuse"
   - "Implement pagination for query history"
   - "Add export functionality for search results"

3. **Testing**
   - "Create unit tests for authentication endpoints"
   - "Add integration tests for phone lookup APIs"

4. **Optimization**
   - "Optimize Docker build times"
   - "Add caching layer for repeated queries"
   - "Refactor frontend components for better performance"

5. **Documentation**
   - "Generate API documentation from FastAPI endpoints"
   - "Create user guide for admin dashboard"

---

## 📊 Database Schema

### Main Tables
- **users** - User accounts (id, username, password, points, is_admin)
- **sessions** - Login sessions (token, user_id, created_at)
- **email_queries** - Email lookup history
- **phone_queries** - Phone lookup history
- **points_transactions** - Credit system transactions

### Auto-Created Admin User
```
Username: admin999999
Password: admin123
Points: 999999 (unlimited)
Is Admin: true
```

---

## 🔐 Security Notes

### Development Mode
- SQLite database with default admin credentials
- CORS allows localhost origins
- Debug mode enabled

### Production Deployment
Before deploying to production:
1. ✅ Change `ADMIN_PASSWORD` in `.env`
2. ✅ Set `DEBUG=false`
3. ✅ Configure proper `ALLOWED_ORIGINS`
4. ✅ Use environment-specific secrets
5. ✅ Enable HTTPS
6. ✅ Set up proper database backups

---

## 📚 Additional Documentation

- `START_HERE.md` - Quick start guide
- `PROJECT_OVERVIEW_COMPLETE.md` - Full project documentation
- `API_ARCHITECTURE.md` - API design details
- `DOCKER_QUICK_START.md` - Docker deployment guide

---

## 🆘 Getting Help

If you encounter issues:
1. Check the logs: `tail -f backend/logs/*.log`
2. Verify environment: `cat .env`
3. Test database: `sqlite3 backend/osint_tracker.db ".tables"`
4. Check API docs: http://localhost:8000/docs

---

**Setup Time**: ~5 minutes
**First Run**: Application auto-initializes database and creates admin user
**Default URL**: http://localhost:8000
**Status**: ✅ Ready for Development
