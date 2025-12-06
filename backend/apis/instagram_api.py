"""
Instagram Profile Lookup API
Uses RapidAPI Instagram Looter2
"""
import httpx
import logging
from typing import Dict, Any, Optional

logger = logging.getLogger(__name__)

# RapidAPI Configuration
RAPIDAPI_KEY = "3f4bcf0e74msh2f1e9b5504fd778p10f7c6jsn39111f8fffde"
RAPIDAPI_HOST = "instagram-looter2.p.rapidapi.com"
INSTAGRAM_API_URL = f"https://{RAPIDAPI_HOST}/profile"


async def query_instagram_profile(username: str, timeout: int = 30) -> Dict[str, Any]:
    """
    Query Instagram profile information via RapidAPI
    
    Args:
        username: Instagram username (without @)
        timeout: Request timeout in seconds
        
    Returns:
        Dict containing profile data or error information
    """
    if not username:
        return {
            "success": False,
            "error": "用户名不能为空",
            "source": "instagram_api"
        }
    
    # Remove @ if present
    username = username.lstrip('@')
    
    logger.info(f"📸 [Instagram API] Querying profile for username: {username}")
    
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
                INSTAGRAM_API_URL,
                headers=headers,
                params=params
            )
            
            logger.info(f"📸 [Instagram API] Response status: {response.status_code}")
            
            if response.status_code == 200:
                try:
                    data = response.json()
                    logger.info(f"✅ [Instagram API] Successfully retrieved profile for {username}")
                    
                    return {
                        "success": True,
                        "data": data,
                        "username": username,
                        "source": "instagram_api"
                    }
                    
                except Exception as e:
                    logger.error(f"❌ [Instagram API] JSON parse error: {e}")
                    return {
                        "success": False,
                        "error": f"JSON解析失败: {str(e)}",
                        "source": "instagram_api"
                    }
            
            elif response.status_code == 404:
                logger.warning(f"⚠️ [Instagram API] Profile not found: {username}")
                return {
                    "success": False,
                    "error": "用户不存在",
                    "username": username,
                    "source": "instagram_api"
                }
            
            elif response.status_code == 429:
                logger.error(f"⏱️ [Instagram API] Rate limit exceeded")
                return {
                    "success": False,
                    "error": "API请求次数超限，请稍后再试",
                    "source": "instagram_api"
                }
            
            else:
                logger.error(f"❌ [Instagram API] HTTP {response.status_code}: {response.text[:200]}")
                return {
                    "success": False,
                    "error": f"HTTP {response.status_code}",
                    "source": "instagram_api"
                }
                
    except httpx.TimeoutException:
        logger.error(f"⏱️ [Instagram API] Request timeout after {timeout}s")
        return {
            "success": False,
            "error": f"请求超时 ({timeout}s)",
            "source": "instagram_api"
        }
    
    except httpx.RequestError as e:
        logger.error(f"❌ [Instagram API] Request error: {e}")
        return {
            "success": False,
            "error": f"请求错误: {str(e)}",
            "source": "instagram_api"
        }
    
    except Exception as e:
        logger.exception(f"❌ [Instagram API] Unexpected error: {e}")
        return {
            "success": False,
            "error": f"未知错误: {str(e)}",
            "source": "instagram_api"
        }


def extract_instagram_username_from_profile(profile_data: Dict[str, Any]) -> Optional[str]:
    """
    从印尼档案数据中提取 Instagram 用户名
    
    Args:
        profile_data: 印尼档案数据
        
    Returns:
        Instagram 用户名，如果没有则返回 None
    """
    try:
        # 检查 social_media_profiles
        if 'social_media_profiles' in profile_data:
            profiles = profile_data['social_media_profiles']
            if isinstance(profiles, list):
                for profile in profiles:
                    if isinstance(profile, dict) and profile.get('platform') == 'instagram':
                        return profile.get('username')
        
        # 检查 social_media
        if 'social_media' in profile_data:
            social_media = profile_data['social_media']
            if isinstance(social_media, dict):
                if 'instagram' in social_media:
                    return social_media['instagram']
                if 'profiles' in social_media:
                    profiles = social_media['profiles']
                    if isinstance(profiles, list):
                        for profile in profiles:
                            if isinstance(profile, dict) and profile.get('platform') == 'instagram':
                                return profile.get('username')
        
        # 检查 raw_data 中的社交媒体信息
        if 'raw_data' in profile_data:
            return extract_instagram_username_from_profile(profile_data['raw_data'])
        
        return None
        
    except Exception as e:
        logger.error(f"❌ [Instagram] Error extracting username: {e}")
        return None
