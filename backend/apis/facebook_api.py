"""
Facebook Profile Lookup API
Uses RapidAPI Axesso Facebook Data Service
"""
import httpx
import logging
from typing import Dict, Any, Optional
from urllib.parse import quote

logger = logging.getLogger(__name__)

# RapidAPI Configuration
RAPIDAPI_KEY = "3f4bcf0e74msh2f1e9b5504fd778p10f7c6jsn39111f8fffde"
RAPIDAPI_HOST = "axesso-facebook-data-service.p.rapidapi.com"
FACEBOOK_API_URL = f"https://{RAPIDAPI_HOST}/fba/facebook-lookup-posts"


async def query_facebook_profile(username: str, timeout: int = 30) -> Dict[str, Any]:
    """
    Query Facebook profile information via RapidAPI
    
    Args:
        username: Facebook username or profile URL
        timeout: Request timeout in seconds
        
    Returns:
        Dict containing profile data or error information
    """
    if not username:
        return {
            "success": False,
            "error": "用户名不能为空",
            "source": "facebook_api"
        }
    
    # Remove @ if present
    username = username.lstrip('@')
    
    # Construct Facebook URL
    if username.startswith('http'):
        facebook_url = username
    else:
        facebook_url = f"https://www.facebook.com/{username}"
    
    logger.info(f"📘 [Facebook API] Querying profile for: {facebook_url}")
    
    headers = {
        "x-rapidapi-host": RAPIDAPI_HOST,
        "x-rapidapi-key": RAPIDAPI_KEY
    }
    
    params = {
        "url": facebook_url
    }
    
    try:
        async with httpx.AsyncClient(timeout=timeout) as client:
            response = await client.get(
                FACEBOOK_API_URL,
                headers=headers,
                params=params
            )
            
            logger.info(f"📘 [Facebook API] Response status: {response.status_code}")
            
            if response.status_code == 200:
                try:
                    data = response.json()
                    logger.info(f"✅ [Facebook API] Successfully retrieved profile for {username}")
                    
                    return {
                        "success": True,
                        "data": data,
                        "username": username,
                        "source": "facebook_api"
                    }
                    
                except Exception as e:
                    logger.error(f"❌ [Facebook API] JSON parse error: {e}")
                    return {
                        "success": False,
                        "error": f"JSON解析失败: {str(e)}",
                        "source": "facebook_api"
                    }
            
            elif response.status_code == 404:
                logger.warning(f"⚠️ [Facebook API] Profile not found: {username}")
                return {
                    "success": False,
                    "error": "用户不存在",
                    "username": username,
                    "source": "facebook_api"
                }
            
            elif response.status_code == 429:
                logger.error(f"⏱️ [Facebook API] Rate limit exceeded")
                return {
                    "success": False,
                    "error": "API请求次数超限，请稍后再试",
                    "source": "facebook_api"
                }
            
            else:
                logger.error(f"❌ [Facebook API] HTTP {response.status_code}: {response.text[:200]}")
                return {
                    "success": False,
                    "error": f"HTTP {response.status_code}",
                    "source": "facebook_api"
                }
                
    except httpx.TimeoutException:
        logger.error(f"⏱️ [Facebook API] Request timeout after {timeout}s")
        return {
            "success": False,
            "error": f"请求超时 ({timeout}s)",
            "source": "facebook_api"
        }
    
    except httpx.RequestError as e:
        logger.error(f"❌ [Facebook API] Request error: {e}")
        return {
            "success": False,
            "error": f"请求错误: {str(e)}",
            "source": "facebook_api"
        }
    
    except Exception as e:
        logger.exception(f"❌ [Facebook API] Unexpected error: {e}")
        return {
            "success": False,
            "error": f"未知错误: {str(e)}",
            "source": "facebook_api"
        }


def extract_facebook_username_from_profile(profile_data: Dict[str, Any]) -> Optional[str]:
    """
    从印尼档案数据中提取 Facebook 用户名
    
    Args:
        profile_data: 印尼档案数据
        
    Returns:
        Facebook 用户名，如果没有则返回 None
    """
    try:
        # 检查 social_media_profiles
        if 'social_media_profiles' in profile_data:
            profiles = profile_data['social_media_profiles']
            if isinstance(profiles, list):
                for profile in profiles:
                    if isinstance(profile, dict) and profile.get('platform') == 'facebook':
                        return profile.get('username')
        
        # 检查 social_media
        if 'social_media' in profile_data:
            social_media = profile_data['social_media']
            if isinstance(social_media, dict):
                if 'facebook' in social_media:
                    return social_media['facebook']
                if 'profiles' in social_media:
                    profiles = social_media['profiles']
                    if isinstance(profiles, list):
                        for profile in profiles:
                            if isinstance(profile, dict) and profile.get('platform') == 'facebook':
                                return profile.get('username')
        
        # 检查 raw_data 中的社交媒体信息
        if 'raw_data' in profile_data:
            return extract_facebook_username_from_profile(profile_data['raw_data'])
        
        return None
        
    except Exception as e:
        logger.error(f"❌ [Facebook] Error extracting username: {e}")
        return None
