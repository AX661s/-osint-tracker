import logging
import httpx
from typing import Dict, Any
from .config import ACELOGIC_API_KEY, DEFAULT_TIMEOUT, mask_key

logger = logging.getLogger(__name__)


def _safe_get(d: Dict[str, Any], *keys):
    cur = d
    for k in keys:
        if not isinstance(cur, dict):
            return None
        cur = cur.get(k)
    return cur


async def query_phone_lookup_3008(phone: str, timeout: int = DEFAULT_TIMEOUT) -> Dict[str, Any]:
    """
    Query AceLogic Phone Lookup API and normalize into a single platform result.
    Returns a result with source/module 'phone_lookup_3008'.
    """
    if not ACELOGIC_API_KEY:
        err = "ACELOGIC_API_KEY 未配置"
        logger.error(f"❌ [PhoneLookup3008] {err}")
        return {"success": False, "error": err, "source": "phone_lookup_3008", "module": "phone_lookup_3008", "status": "error"}

    url = "https://api.acelogic.cloud/api/phonelookup"
    headers = {
        "Content-Type": "application/json",
        "x-api-key": ACELOGIC_API_KEY,
    }
    payload = {"phone": str(phone)}

    try:
        logger.info(f"🔍 [PhoneLookup3008] 查询: phone={phone}, key={mask_key(ACELOGIC_API_KEY)}")
        async with httpx.AsyncClient(timeout=timeout) as client:
            resp = await client.post(url, headers=headers, json=payload)

        if resp.status_code != 200:
            msg = f"Status {resp.status_code}: {resp.text[:200]}"
            logger.warning(f"⚠️ [PhoneLookup3008] 错误: {msg}")
            return {"success": False, "error": msg, "source": "phone_lookup_3008", "module": "phone_lookup_3008", "status": "error"}

        data = resp.json()

        # Build normalized payload for frontend splitting logic
        platforms: Dict[str, Any] = {}
        platform_names = []

        # Try extract Melissa-like record
        melissa_rec = _safe_get(data, "raw_data", "Records")
        if isinstance(melissa_rec, list) and melissa_rec:
            platforms["melissa"] = melissa_rec[0]
            platform_names.append("melissa")

        # Attach raw response for debugging
        normalized = {
            "platforms": platforms,
            "platform_names": platform_names,
            "raw": data,
        }

        status = "found" if bool(platforms) else "not_found"
        return {
            "success": True,
            "data": normalized,
            "source": "phone_lookup_3008",
            "module": "phone_lookup_3008",
            "status": status,
        }

    except Exception as e:
        msg = str(e)
        logger.error(f"❌ [PhoneLookup3008] 异常: {msg}")
        return {"success": False, "error": msg, "source": "phone_lookup_3008", "module": "phone_lookup_3008", "status": "error"}