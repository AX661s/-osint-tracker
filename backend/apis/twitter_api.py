"""
Twitter/X User Details API via RapidAPI
"""
import httpx
import logging
from typing import Dict, Any

logger = logging.getLogger(__name__)

# RapidAPI Configuration
RAPIDAPI_KEY = "3f4bcf0e74msh2f1e9b5504fd778p10f7c6jsn39111f8fffde"
RAPIDAPI_HOST = "twitter-x.p.rapidapi.com"
TWITTER_API_URL = f"https://{RAPIDAPI_HOST}/user/details"


async def query_twitter_profile(username: str, timeout: int = 30) -> Dict[str, Any]:
    """
    Query Twitter/X user details via RapidAPI
    
    Args:
        username: Twitter username (without @)
        timeout: Request timeout in seconds
        
    Returns:
        Dict containing Twitter user data or error information
    """
    if not username:
        return {
            "success": False,
            "error": "用户名不能为空",
            "source": "twitter_api"
        }
    
    # Remove @ if present
    username = username.lstrip('@')
    
    logger.info(f"🐦 [Twitter API] Querying user: {username}")
    
    headers = {
        "x-rapidapi-host": RAPIDAPI_HOST,
        "x-rapidapi-key": RAPIDAPI_KEY
    }
    
    params = {
        "username": username
    }
    
    try:
        async with httpx.AsyncClient(timeout=timeout) as client:
            response = await client.get(
                TWITTER_API_URL,
                headers=headers,
                params=params
            )
            
            logger.info(f"🐦 [Twitter API] Response status: {response.status_code}")
            
            if response.status_code == 200:
                try:
                    data = response.json()
                    logger.info(f"✅ [Twitter API] Successfully retrieved profile for {username}")
                    
                    return {
                        "success": True,
                        "data": data,
                        "username": username,
                        "source": "twitter_api"
                    }
                    
                except Exception as e:
                    logger.error(f"❌ [Twitter API] JSON parse error: {e}")
                    return {
                        "success": False,
                        "error": f"JSON解析失败: {str(e)}",
                        "source": "twitter_api"
                    }
            
            elif response.status_code == 404:
                logger.warning(f"⚠️ [Twitter API] User not found: {username}")
                return {
                    "success": False,
                    "error": "用户不存在",
                    "username": username,
                    "source": "twitter_api"
                }
            
            elif response.status_code == 429:
                logger.error(f"⏱️ [Twitter API] Rate limit exceeded")
                return {
                    "success": False,
                    "error": "API请求次数超限，请稍后再试",
                    "source": "twitter_api"
                }
            
            else:
                logger.error(f"❌ [Twitter API] HTTP {response.status_code}: {response.text[:200]}")
                return {
                    "success": False,
                    "error": f"HTTP {response.status_code}",
                    "source": "twitter_api"
                }
                
    except httpx.TimeoutException:
        logger.error(f"⏱️ [Twitter API] Request timeout after {timeout}s")
        return {
            "success": False,
            "error": f"请求超时 ({timeout}s)",
            "source": "twitter_api"
        }
    
    except httpx.RequestError as e:
        logger.error(f"❌ [Twitter API] Request error: {e}")
        return {
            "success": False,
            "error": f"请求错误: {str(e)}",
            "source": "twitter_api"
        }
    
    except Exception as e:
        logger.exception(f"❌ [Twitter API] Unexpected error: {e}")
        return {
            "success": False,
            "error": f"未知错误: {str(e)}",
            "source": "twitter_api"
        }
