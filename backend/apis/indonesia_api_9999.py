"""
印尼专属 API (端口 9999)
封装：GET /api/profile?phone=...

示例调用（PowerShell）:
Invoke-RestMethod -Uri "http://47.253.238.111:9999/api/profile?phone=6285786528303" -Method Get
"""
import logging
import re
import json
from typing import Any, Dict
import httpx

logger = logging.getLogger(__name__)

# 使用新的 9999 端口 API
INDO_API_9999_URL = "http://47.253.238.111:9999/api/profile"
DEFAULT_TIMEOUT = 120


async def query_indonesia_api_9999(phone: str, timeout: int = DEFAULT_TIMEOUT) -> Dict[str, Any]:
    """调用 9999 端口的印尼号码查询接口并返回统一结构。

    Args:
        phone: 电话号码，支持 62 开头或以 0 开头的本地号或带 + 的格式。
        timeout: 超时时间（秒）

    Returns:
        Dict: 包含 success, data, error, source 字段
    """
    try:
        if not phone:
            return {"success": False, "error": "empty phone", "source": "indonesia_api_9999"}

        # 清理并格式化为不带 + 的数字（API 使用 62 开头）
        clean = phone.strip().replace(" ", "").replace("-", "")
        if clean.startswith("+"):
            clean = clean[1:]
        # 如果是本地格式 0 开头，转换为 62 开头
        if clean.startswith("0"):
            clean = "62" + clean[1:]

        query = clean
        url = f"{INDO_API_9999_URL}?phone={query}"
        logger.info(f"🇮🇩 [Indonesia 9999] Request URL: {url}")

        limits = httpx.Limits(max_keepalive_connections=5, max_connections=10)
        timeout_cfg = httpx.Timeout(timeout, read=timeout)
        async with httpx.AsyncClient(timeout=timeout_cfg, limits=limits) as client:
            resp = await client.get(url, headers={"User-Agent": "osint-backend/1.0"})
            
            # 检查HTTP状态码
            if resp.status_code != 200:
                logger.error(f"❌ [Indonesia 9999] HTTP {resp.status_code} - {resp.text[:200]}")
                return {
                    "success": False, 
                    "error": f"上游API返回错误: HTTP {resp.status_code}", 
                    "status_code": resp.status_code, 
                    "source": "indonesia_api_9999",
                    "details": resp.text[:500]
                }

            # 获取响应内容
            response_text = resp.text.strip()
            
            # 检查响应是否为空
            if not response_text:
                logger.error(f"❌ [Indonesia 9999] Empty response from upstream API")
                return {
                    "success": False, 
                    "error": "上游API返回空响应", 
                    "source": "indonesia_api_9999",
                    "details": "Response body is empty"
                }
            
            # 检查Content-Type
            content_type = resp.headers.get("Content-Type", "")
            logger.info(f"🔍 [Indonesia 9999] Content-Type: {content_type}")
            logger.debug(f"🇮🇩 [Indonesia 9999] Response preview (first 500 chars): {response_text[:500]}")
            
            # 验证是否为JSON格式
            if "application/json" not in content_type.lower() and not response_text.startswith(("{", "[")):
                logger.error(f"❌ [Indonesia 9999] Response is not JSON format")
                logger.error(f"   Content-Type: {content_type}")
                logger.error(f"   Response starts with: {response_text[:100]}")
                return {
                    "success": False, 
                    "error": "上游API返回非JSON格式数据", 
                    "source": "indonesia_api_9999",
                    "content_type": content_type,
                    "response_preview": response_text[:200]
                }
            
            # 尝试解析JSON
            try:
                parsed_data = json.loads(response_text)
                logger.info(f"✅ [Indonesia 9999] Successfully parsed JSON")
                logger.info(f"🔍 [Indonesia 9999] Data type: {type(parsed_data)}")
                
                # 验证数据结构 - 可能返回对象或数组
                if isinstance(parsed_data, dict):
                    # 直接返回对象
                    result = {
                        "success": True,
                        "data": parsed_data,
                        "source": "indonesia_api_9999",
                        "raw_response": response_text[:1000]  # 保存前1000字符用于调试
                    }
                elif isinstance(parsed_data, list):
                    # 返回数组，取第一个元素或整个数组
                    result = {
                        "success": True,
                        "data": parsed_data[0] if len(parsed_data) > 0 else {},
                        "data_list": parsed_data,  # 保留完整数组
                        "source": "indonesia_api_9999",
                        "raw_response": response_text[:1000]
                    }
                else:
                    logger.error(f"❌ [Indonesia 9999] Unexpected data type: {type(parsed_data)}")
                    return {
                        "success": False,
                        "error": f"意外的数据类型: {type(parsed_data)}",
                        "source": "indonesia_api_9999"
                    }
                
                logger.info(f"✅ [Indonesia 9999] Query successful for {query}")
                return result
                
            except json.JSONDecodeError as je:
                logger.error(f"❌ [Indonesia 9999] JSON decode error: {je}")
                logger.error(f"   Response text: {response_text[:500]}")
                return {
                    "success": False,
                    "error": f"JSON解析失败: {str(je)}",
                    "source": "indonesia_api_9999",
                    "response_preview": response_text[:500]
                }

    except httpx.TimeoutException:
        logger.error(f"⏱️ [Indonesia 9999] Request timeout after {timeout}s")
        return {"success": False, "error": f"请求超时 ({timeout}s)", "source": "indonesia_api_9999"}
    except httpx.RequestError as e:
        logger.error(f"❌ [Indonesia 9999] Request error: {e}")
        return {"success": False, "error": f"请求错误: {str(e)}", "source": "indonesia_api_9999"}
    except Exception as e:
        logger.exception(f"❌ [Indonesia 9999] Unexpected error: {e}")
        return {"success": False, "error": f"未知错误: {str(e)}", "source": "indonesia_api_9999"}


def format_indonesia_profile_9999(raw_data: Dict[str, Any]) -> Dict[str, Any]:
    """
    将 9999 API 返回的原始数据格式化为统一的人物档案结构
    
    Args:
        raw_data: 从 9999 API 返回的原始数据
        
    Returns:
        Dict: 格式化后的人物档案数据
    """
    if not raw_data or not isinstance(raw_data, dict):
        return {}
    
    # 提取基本信息
    profile = {
        "source": "indonesia_api_9999",
        "basic_info": {},
        "contact_info": {},
        "social_media": {},
        "professional_info": {},
        "raw_data": raw_data
    }
    
    # 基本信息提取 - 从 raw_data.basic_info
    basic_info_source = raw_data.get("basic_info", {})
    if basic_info_source:
        profile["basic_info"] = {
            "name": basic_info_source.get("name"),
            "phone_primary": basic_info_source.get("phone_primary"),
            "birthday": basic_info_source.get("birthday"),
            "gender": basic_info_source.get("gender"),
            "nik_primary": basic_info_source.get("nik_primary"),
            "all_niks": basic_info_source.get("all_niks", []),
            "addresses": basic_info_source.get("addresses", [])
        }
        
    # 联系信息 - 从 raw_data.contact_info
    contact_info_source = raw_data.get("contact_info", {})
    if contact_info_source:
        profile["contact_info"] = {
            "phones": contact_info_source.get("phones", []),
            "emails": contact_info_source.get("emails", []),
            "addresses": contact_info_source.get("addresses", [])
        }
        
    # 社交媒体 - 从 raw_data.social_media
    social_media_source = raw_data.get("social_media", {})
    if social_media_source:
        profile["social_media"] = {
            "profiles": social_media_source.get("profiles", [])
        }
    
    # 职业信息 - 从 raw_data.professional_info
    professional_info_source = raw_data.get("professional_info", {})
    if professional_info_source:
        profile["professional_info"] = {
            "jobs": professional_info_source.get("jobs", []),
            "companies": professional_info_source.get("companies", []),
            "industries": professional_info_source.get("industries", [])
        }
    
    # 数据泄露信息 - 从 raw_data.data_breaches
    data_breaches_source = raw_data.get("data_breaches", {})
    if data_breaches_source:
        profile["data_breaches"] = data_breaches_source
    
    # Google相关数据 - 从 raw_data
    if raw_data.get("google_email_data"):
        profile["google_email_data"] = raw_data.get("google_email_data")
    
    if raw_data.get("location_info"):
        profile["location_info"] = raw_data.get("location_info")
    
    # Google地图数据（包含头像和评论）
    google_maps = raw_data.get("location_info", {}).get("google_maps", {})
    if google_maps:
        profile["google_maps"] = google_maps
        # 单独提取头像URL方便前端访问
        if google_maps.get("avatar_url"):
            profile["google_avatar_url"] = google_maps.get("avatar_url")
    
    return profile
