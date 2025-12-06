"""
Truecaller API via Acelogic Cloud
"""
import httpx
import logging
from typing import Dict, Any

logger = logging.getLogger(__name__)

# Acelogic API Configuration
ACELOGIC_API_KEY = "f4f3209b21e73db31eda9a7682177a498bfadd311e1855920c7d83f4388c7046"
TRUECALLER_API_URL = "https://api.acelogic.cloud/api/truecaller"


async def query_truecaller_acelogic(phone: str, timeout: int = 30) -> Dict[str, Any]:
    """
    Query Truecaller information via Acelogic Cloud API
    
    Args:
        phone: Phone number (with country code, e.g., +6285786528303)
        timeout: Request timeout in seconds
        
    Returns:
        Dict containing Truecaller data or error information
    """
    if not phone:
        return {
            "success": False,
            "error": "电话号码不能为空",
            "source": "truecaller_acelogic"
        }
    
    # Ensure phone has + prefix
    if not phone.startswith('+'):
        phone = '+' + phone
    
    logger.info(f"📞 [Truecaller Acelogic] Querying phone: {phone}")
    
    headers = {
        "x-api-key": ACELOGIC_API_KEY,
        "Content-Type": "application/json"
    }
    
    payload = {
        "phone": phone
    }
    
    try:
        async with httpx.AsyncClient(timeout=timeout) as client:
            response = await client.post(
                TRUECALLER_API_URL,
                headers=headers,
                json=payload
            )
            
            logger.info(f"📞 [Truecaller Acelogic] Response status: {response.status_code}")
            
            if response.status_code == 200:
                try:
                    data = response.json()
                    logger.info(f"✅ [Truecaller Acelogic] Successfully retrieved data for {phone}")
                    
                    return {
                        "success": True,
                        "data": data,
                        "phone": phone,
                        "source": "truecaller_acelogic"
                    }
                    
                except Exception as e:
                    logger.error(f"❌ [Truecaller Acelogic] JSON parse error: {e}")
                    return {
                        "success": False,
                        "error": f"JSON解析失败: {str(e)}",
                        "source": "truecaller_acelogic"
                    }
            
            elif response.status_code == 404:
                logger.warning(f"⚠️ [Truecaller Acelogic] Phone not found: {phone}")
                return {
                    "success": False,
                    "error": "号码未找到",
                    "phone": phone,
                    "source": "truecaller_acelogic"
                }
            
            elif response.status_code == 401:
                logger.error(f"🔒 [Truecaller Acelogic] Unauthorized - Invalid API key")
                return {
                    "success": False,
                    "error": "API密钥无效",
                    "source": "truecaller_acelogic"
                }
            
            elif response.status_code == 429:
                logger.error(f"⏱️ [Truecaller Acelogic] Rate limit exceeded")
                return {
                    "success": False,
                    "error": "API请求次数超限，请稍后再试",
                    "source": "truecaller_acelogic"
                }
            
            else:
                logger.error(f"❌ [Truecaller Acelogic] HTTP {response.status_code}: {response.text[:200]}")
                return {
                    "success": False,
                    "error": f"HTTP {response.status_code}",
                    "source": "truecaller_acelogic"
                }
                
    except httpx.TimeoutException:
        logger.error(f"⏱️ [Truecaller Acelogic] Request timeout after {timeout}s")
        return {
            "success": False,
            "error": f"请求超时 ({timeout}s)",
            "source": "truecaller_acelogic"
        }
    
    except httpx.RequestError as e:
        logger.error(f"❌ [Truecaller Acelogic] Request error: {e}")
        return {
            "success": False,
            "error": f"请求错误: {str(e)}",
            "source": "truecaller_acelogic"
        }
    
    except Exception as e:
        logger.exception(f"❌ [Truecaller Acelogic] Unexpected error: {e}")
        return {
            "success": False,
            "error": f"未知错误: {str(e)}",
            "source": "truecaller_acelogic"
        }
