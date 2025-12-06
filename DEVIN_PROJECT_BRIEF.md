# OSINT Tracker - Devin AI Project Brief

## 🎯 Project Overview
**OSINT Tracker** is a full-stack intelligence gathering platform for phone numbers and email lookup across multiple OSINT APIs.

## 🏗️ Architecture

### Backend
- **Framework**: FastAPI (Python 3.9+)
- **Database**: SQLite with SQLAlchemy ORM
- **Cache**: Redis
- **Task Queue**: Celery
- **Port**: 8000 (dev), 9000 (prod)

### Frontend
- **Framework**: React 18.3
- **UI Library**: Tailwind CSS + shadcn/ui
- **Maps**: Mapbox GL
- **Port**: 3000 (dev), 80 (prod)

### Infrastructure
- **Containerization**: Docker + Docker Compose
- **Web Server**: Nginx (production)
- **Services**: Backend, Frontend, MongoDB, Redis

## 🔑 Key Features

1. **Multi-Source Intelligence**
   - Email breach detection (Have I Been Pwned)
   - Phone number lookup (US & Indonesia)
   - Social media tracking (Telegram, Facebook, Twitter)
   - TrueCaller integration

2. **User Management**
   - Authentication system (Session tokens)
   - Points-based credit system
   - Admin dashboard
   - Role-based permissions

3. **Data Visualization**
   - Profile cards with structured data
   - Interactive maps (Mapbox)
   - Avatar aggregation
   - Historical query logs

## 📁 Directory Structure

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

## 🚀 Quick Start Commands

### Development
```bash
# Backend
cd backend
pip install -r requirements.txt
python server.py

# Frontend
cd frontend
npm install
npm start
```

### Production (Docker)
```bash
docker-compose up --build
```

## 🔌 External APIs

- **US Phone Lookup**: http://47.253.47.192:5000
- **Indonesia Lookup**: http://47.253.238.111:8888
- **TrueCaller, HIBP, OSINT Industries, etc.**

## 💾 Database Schema

**Main Tables**:
- `users` - User accounts with points
- `sessions` - Login sessions
- `email_queries` - Email lookup history
- `phone_queries` - Phone lookup history
- `points_transactions` - Credit transactions
- `api_usage_logs` - API usage tracking

## 🔐 Security Features

- bcrypt password hashing
- Session token authentication
- SQLAlchemy ORM (SQL injection prevention)
- CORS configuration
- Environment variable protection
- API key management

## 📊 API Endpoints (40+)

### Authentication
- `POST /api/auth/login`
- `POST /api/auth/verify`
- `POST /api/auth/logout`

### Queries
- `POST /api/email/query`
- `POST /api/phone/query`
- `GET /api/indonesia/profile/formatted`

### Admin
- `GET /api/admin/stats`
- `GET /api/admin/users`
- `GET /api/admin/logs/queries`

## 🎨 UI Components

- Modern dashboard with dark mode
- Real-time loading animations
- Profile cards with maps
- Admin panel with stats
- Error boundaries and fallbacks

## 📦 Dependencies

**Backend**: fastapi, sqlalchemy, httpx, bcrypt, redis, celery
**Frontend**: react, tailwindcss, mapbox-gl, axios, shadcn/ui

## 🐛 Known Issues / TODOs

1. Need to configure external API keys in `.env.docker`
2. MongoDB integration (currently using SQLite)
3. Rate limiting for API calls
4. Pagination for query history

## 🎯 Potential Improvements for Devin

1. **Add rate limiting** to prevent API abuse
2. **Implement caching layer** for repeated queries
3. **Add unit tests** (pytest for backend, Jest for frontend)
4. **Optimize Docker images** (multi-stage builds)
5. **Add API documentation** (Swagger/OpenAPI)
6. **Implement WebSocket** for real-time updates
7. **Add export functionality** (PDF reports)
8. **Enhance error handling** across all endpoints
9. **Add logging aggregation** (ELK stack)
10. **Implement CI/CD pipeline** (GitHub Actions)

## 📝 Documentation Files

- `START_HERE.md` - Quick start guide
- `PROJECT_OVERVIEW_COMPLETE.md` - Full project overview (717 lines)
- `API_ARCHITECTURE.md` - API structure explanation
- `DOCKER_QUICK_START.md` - Docker deployment
- `INDONESIA_API_QUICK_START.md` - Indonesia API guide
- `POINTS_SYSTEM_QUICK_START.md` - Credits system

## 🔗 Repository
https://github.com/AX661s/-osint-tracker

## 💡 Devin Tasks Suggestions

Ask Devin to:
1. "Review the codebase and suggest security improvements"
2. "Add comprehensive unit tests for backend APIs"
3. "Optimize Docker build times"
4. "Implement rate limiting middleware"
5. "Add API documentation using FastAPI's built-in Swagger"
6. "Create CI/CD pipeline with GitHub Actions"
7. "Refactor frontend components for better reusability"
8. "Add pagination to admin dashboard queries"
9. "Implement WebSocket for real-time notifications"
10. "Create automated backup system for SQLite database"

---

**Project Status**: ✅ Production Ready
**Last Updated**: December 7, 2025
**Tech Stack**: Python FastAPI + React + Docker
**Lines of Code**: ~15,000+
