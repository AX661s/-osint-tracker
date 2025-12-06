import logging
import httpx
from typing import Dict, Any
from .config import ACELOGIC_API_KEY, DEFAULT_TIMEOUT, mask_key

logger = logging.getLogger(__name__)


async def _fetch_info(timeout: int = DEFAULT_TIMEOUT) -> Dict[str, Any]:
    if not ACELOGIC_API_KEY:
        return {"success": False, "error": "ACELOGIC_API_KEY 未配置"}
    url = "https://api.acelogic.cloud/api/info"
    headers = {
        "Content-Type": "application/json",
        "x-api-key": ACELOGIC_API_KEY,
    }
    try:
        logger.info(f"🔍 [AceInfo] 拉取 info, key={mask_key(ACELOGIC_API_KEY)}")
        async with httpx.AsyncClient(timeout=timeout) as client:
            resp = await client.get(url, headers=headers)
        ok = resp.status_code == 200
        data = resp.json() if ok else {"status_code": resp.status_code, "text": resp.text[:200]}
        return {"success": ok, "data": data}
    except Exception as e:
        return {"success": False, "error": str(e)}


async def query_ace_whatsapp_info(timeout: int = DEFAULT_TIMEOUT) -> Dict[str, Any]:
    res = await _fetch_info(timeout=timeout)
    if not res.get("success"):
        return {"success": False, "error": res.get("error") or "Ace info 获取失败", "source": "whatsapp", "module": "whatsapp", "status": "error", "data": {}}
    return {
        "success": True,
        "source": "whatsapp",
        "module": "whatsapp",
        "status": "found",
        "data": {
            "provider": "AceInfo",
            "note": "信息来源 /api/info",
            "raw": res.get("data")
        }
    }


async def query_ace_telegram_info(timeout: int = DEFAULT_TIMEOUT) -> Dict[str, Any]:
    res = await _fetch_info(timeout=timeout)
    if not res.get("success"):
        return {"success": False, "error": res.get("error") or "Ace info 获取失败", "source": "telegram_complete", "module": "telegram_complete", "status": "error", "data": {}}
    return {
        "success": True,
        "source": "telegram_complete",
        "module": "telegram_complete",
        "status": "found",
        "data": {
            "provider": "AceInfo",
            "note": "信息来源 /api/info",
            "telegram_found": True,
            "raw": res.get("data")
        }
    }