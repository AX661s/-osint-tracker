import logging
import httpx
from typing import Dict, Any
from .config import ACELOGIC_API_KEY, DEFAULT_TIMEOUT, mask_key

logger = logging.getLogger(__name__)


def _to_bool(v) -> bool:
    if v is True:
        return True
    if isinstance(v, str):
        return v.strip().lower() in {"true", "yes", "y", "1"}
    if isinstance(v, (int, float)):
        return v == 1
    return False


async def query_ace_truecaller_whatsapp(phone: str, timeout: int = DEFAULT_TIMEOUT) -> Dict[str, Any]:
    if not ACELOGIC_API_KEY:
        return {"success": False, "error": "ACELOGIC_API_KEY 未配置", "source": "whatsapp", "module": "whatsapp", "status": "error"}
    url = "https://api.acelogic.cloud/api/truecaller"
    headers = {"Content-Type": "application/json", "x-api-key": ACELOGIC_API_KEY}
    digits = ''.join(ch for ch in str(phone) if ch.isdigit())
    payload = {"phone": phone if str(phone).startswith('+') else f"+{digits}"}
    try:
        logger.info(f"🔍 [Ace Truecaller] 查询: phone={payload['phone']}, key={mask_key(ACELOGIC_API_KEY)}")
        async with httpx.AsyncClient(timeout=timeout) as client:
            resp = await client.post(url, headers=headers, json=payload)
        if resp.status_code != 200:
            msg = f"Status {resp.status_code}: {resp.text[:200]}"
            logger.warning(f"⚠️ [Ace Truecaller] 错误: {msg}")
            return {"success": False, "error": msg, "source": "whatsapp", "module": "whatsapp", "status": "error"}
        data = resp.json()
        found = False
        if isinstance(data, dict):
            candidates = [
                data.get("whatsapp"), data.get("wa"), data.get("has_whatsapp"), data.get("whatsapp_found"), data.get("whatsappExists")
            ]
            found = any(_to_bool(x) for x in candidates)
        result = {
            "whatsapp_found": bool(found),
            "query": payload['phone'],
            "raw": data,
        }
        return {
            "success": True,
            "data": result,
            "source": "whatsapp",
            "module": "whatsapp",
            "status": "found" if found else "not_found",
        }
    except Exception as e:
        msg = str(e)
        logger.error(f"❌ [Ace Truecaller] 异常: {msg}")
        return {"success": False, "error": msg, "source": "whatsapp", "module": "whatsapp", "status": "error"}