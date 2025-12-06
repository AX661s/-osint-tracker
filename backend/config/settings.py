"""
Application settings loaded from environment variables
"""
import os
from dotenv import load_dotenv

# Load environment variables from .env file
load_dotenv()

# MongoDB settings
MONGO_URL = os.getenv("MONGO_URL", "")
DB_NAME = os.getenv("DB_NAME", "osint_tracker")

# API Keys
MELISSA_API_KEY = os.getenv("MELISSA_API_KEY", "")
RAPIDAPI_KEY = os.getenv("RAPIDAPI_KEY", "")
TRUECALLER_RAPIDAPI_KEY = os.getenv("TRUECALLER_RAPIDAPI_KEY", "")
IPQS_API_KEY = os.getenv("IPQS_API_KEY", "")
HIBP_API_KEY = os.getenv("HIBP_API_KEY", "")
OSINT_INDUSTRIES_API_KEY = os.getenv("OSINT_INDUSTRIES_API_KEY", "")
