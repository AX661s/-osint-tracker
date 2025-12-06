"""
Acelogic Truecaller API 客户端
返回 Telegram 和 WhatsApp 两个独立结果
"""
import httpx
import logging
import re
from typing import Optional, Dict, Any, List

logger = logging.getLogger(__name__)

ACELOGIC_API_KEY = "f4f3209b21e73db31eda9a7682177a498bfadd311e1855920c7d83f4388c7046"
ACELOGIC_TRUECALLER_URL = "https://api.acelogic.cloud/api/truecaller"


def parse_text_info(text: str) -> Dict[str, Any]:
    """从返回的文本中解析信息"""
    result = {
        "country": None,
        "truecaller_name": None,
        "unknown_name": None,
        "carrier": None
    }
    
    if not text:
        return result
    
    # 解析国家
    country_match = re.search(r'Country:\s*(.+?)(?:\n|$)', text)
    if country_match:
        result["country"] = country_match.group(1).strip()
    
    # 解析 TrueCaller 名字
    tc_match = re.search(r'TrueCaller Says:\s*\n\s*Name:\s*(.+?)(?:\n|$)', text)
    if tc_match:
        name = tc_match.group(1).strip()
        if name != "Not Found":
            result["truecaller_name"] = name
    
    # 解析 Unknown 名字
    unknown_match = re.search(r'Unknown Says:\s*\n\s*Name:\s*(.+?)(?:\n|$)', text)
    if unknown_match:
        result["unknown_name"] = unknown_match.group(1).strip()
    
    # 解析运营商
    carrier_match = re.search(r'Carrier:\s*(.+?)(?:\n|$)', text)
    if carrier_match:
        carrier = carrier_match.group(1).strip()
        if carrier:
            result["carrier"] = carrier
    
    return result


async def query_acelogic_truecaller(phone: str, timeout: int = 30) -> List[Dict[str, Any]]:
    """
    查询 Acelogic Truecaller API
    返回 Telegram 和 WhatsApp 两个独立结果
    
    Args:
        phone: 电话号码（带国家代码，如 +14403828826）
        timeout: 超时时间（秒）
    
    Returns:
        包含 Telegram 和 WhatsApp 结果的列表
    """
    # 确保号码格式正确
    if not phone.startswith('+'):
        phone = f'+{phone}'
    
    headers = {
        "Content-Type": "application/json",
        "x-api-key": ACELOGIC_API_KEY
    }
    
    payload = {
        "phone": phone
    }
    
    results = []
    
    try:
        async with httpx.AsyncClient(timeout=timeout) as client:
            response = await client.post(
                ACELOGIC_TRUECALLER_URL,
                headers=headers,
                json=payload
            )
            
            if response.status_code == 200:
                data = response.json()
                logger.info(f"[AcelogicTruecaller] 成功查询: {phone}")
                
                # 检查是否有数据
                if data.get("ok") and data.get("data", {}).get("matched"):
                    inner_data = data.get("data", {})
                    reply = inner_data.get("reply", {})
                    profile = inner_data.get("profile", {})
                    
                    # 解析文本信息
                    text_info = parse_text_info(reply.get("text", ""))
                    
                    # 获取名字（优先 truecaller，其次 unknown）
                    name = text_info.get("truecaller_name") or text_info.get("unknown_name")
                    
                    # Telegram 结果
                    telegram_username = profile.get("telegram_username")
                    telegram_photo = profile.get("profile_photo")
                    if telegram_username or telegram_photo:
                        results.append({
                            "success": True,
                            "source": "acelogic_telegram",
                            "platform_name": "Telegram",
                            "phone": phone,
                            "found": True,
                            "data": {
                                "telegram_found": True,
                                "username": telegram_username,
                                "name": name,
                                "country": text_info.get("country"),
                                "photo": telegram_photo,
                                "link": f"https://t.me/{telegram_username}" if telegram_username else None
                            }
                        })
                    
                    # WhatsApp 结果
                    whatsapp_photo = profile.get("whatsapp_photo")
                    if whatsapp_photo:
                        results.append({
                            "success": True,
                            "source": "acelogic_whatsapp",
                            "platform_name": "WhatsApp",
                            "phone": phone,
                            "found": True,
                            "data": {
                                "whatsapp_found": True,
                                "name": name,
                                "country": text_info.get("country"),
                                "photo": whatsapp_photo,
                                "link": f"https://wa.me/{phone}"
                            }
                        })
                
                return results
            else:
                logger.warning(f"[AcelogicTruecaller] API 返回错误: {response.status_code}")
                return []
                
    except httpx.TimeoutException:
        logger.error(f"[AcelogicTruecaller] 请求超时: {phone}")
        return []
    except Exception as e:
        logger.error(f"[AcelogicTruecaller] 请求失败: {e}")
        return []


# 测试函数
if __name__ == "__main__":
    import asyncio
    import json
    
    async def test():
        results = await query_acelogic_truecaller("+14403828826")
        print("Results:", json.dumps(results, indent=2, ensure_ascii=False))
    
    asyncio.run(test())
