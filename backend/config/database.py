"""
Database configuration and connection management
"""
import logging
from motor.motor_asyncio import AsyncIOMotorClient
from .settings import MONGO_URL, DB_NAME

logger = logging.getLogger(__name__)

# Global database connections
mongo_client: AsyncIOMotorClient = None
mongo_db = None

def init_mongodb():
    """Initialize MongoDB connection"""
    global mongo_client, mongo_db

    if mongo_client is not None:
        return mongo_db

    if MONGO_URL:
        try:
            mongo_client = AsyncIOMotorClient(MONGO_URL)
            mongo_db = mongo_client[DB_NAME]
            logger.info("✅ MongoDB connection established")
            return mongo_db
        except Exception as e:
            logger.warning(f"⚠️ MongoDB connection failed: {str(e)}")
            mongo_client = None
            mongo_db = None
    else:
        logger.info("ℹ️ MongoDB URL not configured, skipping connection")

    return None

def close_mongodb():
    """Close MongoDB connection"""
    global mongo_client, mongo_db
    if mongo_client:
        mongo_client.close()
        mongo_client = None
        mongo_db = None
        logger.info("✅ MongoDB connection closed")

def get_mongodb():
    """Get MongoDB database instance"""
    return mongo_db
