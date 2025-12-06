"""
Centralized API and timeout configuration for the `apis` package.
Loads values from backend/.env (if present) and falls back to sensible defaults.
"""
from __future__ import annotations
import os
from pathlib import Path

try:
    from dotenv import load_dotenv  # type: ignore
except Exception:
    # dotenv is optional at runtime if env is already provided
    def load_dotenv(*args, **kwargs):  # type: ignore
        return False

# Try to load backend/.env explicitly to ensure local dev works
BACKEND_DIR = Path(__file__).resolve().parents[1]
ENV_PATH = BACKEND_DIR / ".env"
load_dotenv(ENV_PATH if ENV_PATH.exists() else None)

# -------- Timeouts --------
DEFAULT_TIMEOUT: int = int(os.getenv("DEFAULT_TIMEOUT", "15"))
LONG_TIMEOUT: int = int(os.getenv("LONG_TIMEOUT", "30"))
OSINT_INDUSTRIES_TIMEOUT: int = int(os.getenv("OSINT_INDUSTRIES_TIMEOUT", "110"))

# -------- Core API keys --------
RAPIDAPI_KEY: str = os.getenv("RAPIDAPI_KEY", "")
OSINT_INDUSTRIES_API_KEY: str = os.getenv("OSINT_INDUSTRIES_API_KEY", "")
HIBP_API_KEY: str = os.getenv("HIBP_API_KEY", "")

# -------- Recommended / optional keys --------
IPQS_API_KEY: str = os.getenv("IPQS_API_KEY", "")
TRUECALLER_RAPIDAPI_KEY: str = os.getenv("TRUECALLER_RAPIDAPI_KEY", "") or RAPIDAPI_KEY
CALLER_ID_RAPIDAPI_KEY: str = os.getenv("CALLER_ID_RAPIDAPI_KEY", "") or RAPIDAPI_KEY
ACELOGIC_API_KEY: str = os.getenv("ACELOGIC_API_KEY", "")

# WhatsApp providers
WHATSAPP_API_KEY: str = os.getenv("WHATSAPP_API_KEY", "")
WHATSAPP_RAPIDAPI_KEY: str = os.getenv("WHATSAPP_RAPIDAPI_KEY", "")

# Melissa GlobalPhone API
MELISSA_API_KEY: str = os.getenv("MELISSA_API_KEY", "")

# Indonesia API URL
INDONESIA_API_URL: str = os.getenv("INDONESIA_API_URL", "http://47.253.47.192:9999")

# Expose a helper for masking keys (useful across modules)
def mask_key(key: str) -> str:
    if not key:
        return "Not configured"
    return f"{key[:8]}...{key[-4:]}" if len(key) >= 12 else "Configured"
