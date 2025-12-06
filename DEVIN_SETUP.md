# OSINT Tracker - Setup Instructions for Devin AI

## 🎯 Quick Setup Summary

### Python Version
**Required**: Python 3.11+
- See `.python-version` file

### Node.js Version
**Required**: Node.js 18.20+
- See `.nvmrc` file

## 📦 Installation Steps

### 1. Backend Setup

```bash
cd backend
python3.11 -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate
pip install -r requirements.txt
```

**Key Backend Dependencies**:
- fastapi>=0.115.2
- uvicorn==0.25.0
- sqlalchemy>=2.0.0
- httpx==0.27.2
- bcrypt==4.1.3
- redis, pymongo, celery

### 2. Frontend Setup

```bash
cd frontend
npm install
# or
yarn install
```

**Key Frontend Dependencies**:
- react ^18.3.1
- tailwindcss
- @radix-ui components
- mapbox-gl ^3.16.0
- axios ^1.8.4

### 3. Environment Configuration

Create `.env.docker` file in root directory:

```bash
# Database
DATABASE_URL=sqlite:///./osint_tracker.db

# Redis
REDIS_URL=redis://redis:6379
REDIS_HOST=redis
REDIS_PORT=6379

# MongoDB
MONGO_URL=mongodb://mongodb:27017

# API Keys (Required for full functionality)
HIBP_API_KEY=your_key_here
OSINT_INDUSTRIES_API_KEY=your_key_here
TRUECALLER_API_KEY=your_key_here
RAPID_API_KEY=your_key_here

# External API Endpoints
US_PHONE_API_URL=http://47.253.47.192:5000
INDONESIA_PHONE_API_URL=http://47.253.238.111:8888

# JWT Secret
JWT_SECRET_KEY=your_secret_key_here

# Server
BACKEND_PORT=8000
FRONTEND_PORT=3000
```

## 🐳 Docker Setup (Recommended)

### Quick Start
```bash
# Windows PowerShell
.\docker-build-and-test-new.ps1

# Linux/Mac
docker-compose up --build
```

### Services
- **Backend**: http://localhost:9000
- **Frontend**: http://localhost:80
- **MongoDB**: localhost:27017
- **Redis**: localhost:6379

## 🚀 Running the Application

### Development Mode

**Backend** (Terminal 1):
```bash
cd backend
python server.py
# Runs on http://localhost:8000
```

**Frontend** (Terminal 2):
```bash
cd frontend
npm start
# Runs on http://localhost:3000
```

### Production Mode (Docker)
```bash
docker-compose -f docker-compose.prod.yml up -d
```

## 📊 Database Initialization

The SQLite database will be automatically created on first run:
- Location: `backend/osint_tracker.db`
- Default admin user will be created automatically
  - Username: `admin`
  - Password: `admin123`

## 🔧 Common Commands

### Backend
```bash
# Create admin user
python backend/create_admin.py

# Check database
python backend/check_db.py

# Reset admin password
python backend/reset_admin_password.py

# Activate all users
python backend/activate_all_users.py
```

### Frontend
```bash
# Development
npm start

# Production build
npm run build

# Test
npm test
```

### Docker
```bash
# Build and start
docker-compose up --build

# Stop all services
docker-compose down

# View logs
docker-compose logs -f

# View specific service logs
docker-compose logs -f backend
```

## 🧪 Testing

### Backend Tests
```bash
cd backend
pytest
```

### Frontend Tests
```bash
cd frontend
npm test
```

## 📝 API Documentation

Once backend is running, visit:
- **Swagger UI**: http://localhost:8000/docs
- **ReDoc**: http://localhost:8000/redoc

## 🔍 Project Structure

```
-osint-tracker/
├── backend/               # Python FastAPI backend
│   ├── server.py         # Main server file
│   ├── models.py         # Database models
│   ├── requirements.txt  # Python dependencies
│   └── apis/            # External API integrations
├── frontend/             # React frontend
│   ├── src/
│   │   ├── App.js       # Main app component
│   │   ├── components/  # React components
│   │   └── pages/       # Page components
│   └── package.json     # Node dependencies
├── docker-compose.yml    # Docker configuration
└── nginx/               # Nginx configuration

```

## ⚠️ Important Notes

1. **API Keys**: Most OSINT features require valid API keys in `.env.docker`
2. **Ports**: Ensure ports 8000, 3000, 27017, 6379 are available
3. **Database**: SQLite is used by default, MongoDB is optional
4. **CORS**: Already configured for localhost development
5. **Security**: Change default admin password in production

## 🐛 Troubleshooting

### Port Already in Use
```bash
# Windows
.\fix-port-conflict.ps1

# Linux/Mac
lsof -ti:8000 | xargs kill -9
lsof -ti:3000 | xargs kill -9
```

### Docker Issues
```bash
# Windows
.\fix-docker-new.ps1

# Restart Docker services
docker-compose down
docker-compose up --build
```

### Database Issues
```bash
# Reset database
rm backend/osint_tracker.db
python backend/server.py  # Will recreate
```

## 📚 Additional Documentation

- `START_HERE.md` - Quick start guide
- `PROJECT_OVERVIEW_COMPLETE.md` - Complete project overview
- `API_ARCHITECTURE.md` - API architecture details
- `DOCKER_QUICK_START.md` - Docker deployment guide
- `DEVIN_PROJECT_BRIEF.md` - Devin AI project summary

## 🎯 Next Steps for Devin

1. ✅ Install Python 3.11+ dependencies
2. ✅ Install Node.js 18+ dependencies
3. ✅ Create `.env.docker` configuration file
4. ✅ Initialize SQLite database
5. ✅ Test backend server (http://localhost:8000)
6. ✅ Test frontend dev server (http://localhost:3000)
7. ✅ Verify Docker setup
8. ✅ Run basic API tests

## 💡 Devin Commands

Ask me to:
- "Install all dependencies"
- "Start the development servers"
- "Run the Docker containers"
- "Test the authentication system"
- "Add unit tests for the backend"
- "Optimize the frontend bundle size"
- "Add rate limiting to APIs"
- "Create a CI/CD pipeline"

---

**Status**: Ready for development ✅
**Tech Stack**: Python FastAPI + React + SQLite + Docker
**Last Updated**: December 7, 2025
