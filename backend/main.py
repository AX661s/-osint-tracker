"""
Main application entry point for the OSINT Tracker API
"""
import logging
from fastapi import FastAPI, HTTPException
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse, Response
from fastapi.middleware.cors import CORSMiddleware
from contextlib import asynccontextmanager
from datetime import datetime
import os
from pathlib import Path

# Import configuration and database
from config.database import init_mongodb, close_mongodb
from models import init_db, SessionLocal

# Import routers
from auth.routes import router as auth_router
from osint.routes import osint_router
from admin.routes import admin_router

# Import external API routers
from apis.linkedin_avatar import router as linkedin_avatar_router
from apis.logo_api import router as logo_router
from apis.google_api import router as google_router

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

# Lifespan context manager
@asynccontextmanager
async def lifespan(app: FastAPI):
    logger.info("🚀 Server starting up...")
    # Initialize databases
    try:
        init_db()
        logger.info("✅ SQLite database initialized")
    except Exception as e:
        logger.error(f"❌ SQLite initialization failed: {str(e)}")

    try:
        await init_mongodb()
        logger.info("✅ MongoDB connection established")
    except Exception as e:
        logger.warning(f"⚠️ MongoDB connection skipped: {str(e)}")

    yield

    # Cleanup
    try:
        await close_mongodb()
        logger.info("✅ MongoDB connection closed")
    except Exception as e:
        logger.error(f"❌ MongoDB cleanup failed: {str(e)}")

    logger.info("🛑 Server shutdown complete")

# Create FastAPI application
app = FastAPI(
    title="OSINT Tracker API",
    description="Comprehensive OSINT data gathering platform",
    version="1.0.0",
    lifespan=lifespan
)

# CORS middleware - Allow all origins for production deployment
CORS_ORIGINS = os.environ.get('CORS_ORIGINS', '*')
if CORS_ORIGINS == '*':
    app.add_middleware(
        CORSMiddleware,
        allow_origins=["*"],
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )
else:
    app.add_middleware(
        CORSMiddleware,
        allow_origins=[o.strip() for o in CORS_ORIGINS.split(',') if o.strip()],
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )

# Include routers
app.include_router(auth_router, prefix="/api/auth", tags=["Authentication"])
app.include_router(osint_router, prefix="/api/osint", tags=["OSINT"])
app.include_router(admin_router, prefix="/api/admin", tags=["Admin"])
app.include_router(linkedin_avatar_router, prefix="/api", tags=["External APIs"])
app.include_router(logo_router, prefix="/api", tags=["External APIs"])
app.include_router(google_router, prefix="/api", tags=["External APIs"])

# Health check endpoint
@app.get("/health")
async def health_check():
    """健康检查"""
    return {
        "status": "healthy",
        "service": "osint-backend",
        "timestamp": datetime.now().isoformat()
    }

# Mount static files and serve frontend
ROOT_DIR = Path(__file__).parent
FRONTEND_BUILD_DIR = ROOT_DIR.parent / "frontend" / "build"

if FRONTEND_BUILD_DIR.exists():
    static_dir = FRONTEND_BUILD_DIR / "static"
    app.mount("/static", StaticFiles(directory=str(static_dir)), name="static")

    @app.get("/favicon.ico")
    async def favicon():
        favicon_path = FRONTEND_BUILD_DIR / "favicon.ico"
        if favicon_path.exists():
            return FileResponse(favicon_path)
        return Response(status_code=204)

    @app.get("/{full_path:path}")
    async def serve_react_app(full_path: str):
        if full_path.startswith("api/"):
            raise HTTPException(status_code=404)
        index_path = FRONTEND_BUILD_DIR / "index.html"
        if index_path.exists():
            return FileResponse(index_path)
        raise HTTPException(status_code=404)

    logger.info(f"✅ Serving frontend from: {FRONTEND_BUILD_DIR}")

if __name__ == "__main__":
    import uvicorn
    logger.info("🚀 Starting OSINT API server...")
    uvicorn.run(
        "main:app",
        host="0.0.0.0",
        port=int(os.environ.get("PORT", "8001")),
        reload=True,
        log_level="info"
    )
