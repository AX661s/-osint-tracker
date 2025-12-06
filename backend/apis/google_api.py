"""
Google API集成模块
提供Google搜索、Gmail、Google Maps等API功能
"""

from fastapi import APIRouter, HTTPException, Query
from pydantic import BaseModel, EmailStr
import httpx
import os
import logging
import json
from typing import Optional, Dict, List, Any
from urllib.parse import quote
import re
from datetime import datetime

# 配置日志
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# 创建路由器
router = APIRouter(prefix="/api/google", tags=["Google API"])

class GoogleSearchRequest(BaseModel):
    query: str
    num_results: Optional[int] = 10
    language: Optional[str] = "zh-CN"

class EmailAnalysisRequest(BaseModel):
    email: EmailStr
    include_social: Optional[bool] = True
    include_maps: Optional[bool] = True

class GoogleAnalysisResponse(BaseModel):
    email: str
    google_account_exists: bool
    profile_info: Dict[str, Any]
    maps_data: Dict[str, Any]
    social_profiles: List[Dict[str, Any]]
    privacy_score: str
    risk_assessment: str
    analysis_timestamp: str

# Google搜索相关配置
GOOGLE_SEARCH_ENGINES = {
    "custom_search": "https://www.googleapis.com/customsearch/v1",
    "serpapi": "https://serpapi.com/search.json",
    "duckduckgo": "https://api.duckduckgo.com/"
}

# GHunt风格的用户代理
USER_AGENTS = [
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/119.0.0.0 Safari/537.36",
    "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/119.0.0.0 Safari/537.36",
    "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/119.0.0.0 Safari/537.36"
]

@router.post("/search")
async def google_search(request: GoogleSearchRequest):
    """
    执行Google搜索
    """
    try:
        logger.info(f"🔍 Performing Google search for: {request.query}")
        
        # 使用DuckDuckGo作为备用搜索引擎（避免Google API配额限制）
        search_results = await perform_duckduckgo_search(
            query=request.query,
            num_results=request.num_results
        )
        
        return {
            "success": True,
            "query": request.query,
            "results": search_results,
            "total_results": len(search_results),
            "timestamp": datetime.utcnow().isoformat()
        }
        
    except Exception as e:
        logger.error(f"❌ Google search error: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Google search failed: {str(e)}")

@router.post("/analyze")
async def analyze_google_account(request: EmailAnalysisRequest):
    """
    分析Google账户信息 - 使用新的邮箱调查API
    """
    try:
        logger.info(f"🔍 [Google API] Starting investigation for: {request.email}")
        
        # 外部邮箱调查API配置
        INVESTIGATE_API_URL = os.getenv("GOOGLE_EMAIL_API_URL", "http://47.253.47.192:8002/api/email")
        REQUEST_TIMEOUT = 60
        
        # 准备请求数据
        payload = {
            "email": str(request.email)
        }
        
        logger.info(f"🌐 [Google API] Target URL: {INVESTIGATE_API_URL}")
        logger.info(f"📧 [Google API] Email: {request.email}")
        
        # 调用外部调查API
        async with httpx.AsyncClient(timeout=REQUEST_TIMEOUT) as client:
            try:
                headers = {
                    "Content-Type": "application/json",
                    "Accept": "application/json"
                }
                
                # 兼容两种外部接口：8002/api/email 与 8000/api/v1/email/investigate
                if "/api/email" in INVESTIGATE_API_URL:
                    response = await client.post(
                        INVESTIGATE_API_URL,
                        json=payload,
                        headers=headers
                    )
                else:
                    response = await client.post(
                        INVESTIGATE_API_URL,
                        json=payload,
                        headers=headers
                    )
                
                logger.info(f"📡 [Google API] API response status: {response.status_code}")
                
                if response.status_code != 200:
                    error_text = response.text
                    logger.error(f"❌ [Google API] API error {response.status_code}: {error_text}")
                    
                    # 如果外部API失败，返回友好的公开数据搜索结果
                    fallback_data = await fallback_email_investigation(request.email)
                    
                    # 转换为前端期望的格式，标记为公开数据搜索模式
                    return {
                        "email": str(request.email),
                        "step1_registration": {
                            "account_exists": True,  # 标记为存在以显示卡片
                            "gaia_id": None,
                            "status": "public_data_only",  # 特殊状态
                            "note": "外部API不可用，使用公开数据搜索"
                        },
                        "step2_people_info": {
                            "name": fallback_data.get("profile_data", {}).get("name"),
                            "person_id": None,
                            "source_ids": []
                        },
                        "step3_additional_data": {
                            "social_accounts": fallback_data.get("social_accounts", []),
                            "digital_footprint": fallback_data.get("digital_footprint", {}),
                            "profile_data": fallback_data.get("profile_data", {}),
                            "raw_response": fallback_data
                        },
                        "step4_summary": {
                            "total_data_sources": len(fallback_data.get("social_accounts", [])),
                            "privacy_exposure": f"公开数据搜索: 找到{len(fallback_data.get('social_accounts', []))}个相关结果"
                        },
                        "step5_location_analysis": {
                            "location_data": {},
                            "maps_data": {}
                        },
                        "step6_reverse_image": {
                            "avatar_analysis": "使用公开数据搜索",
                            "reverse_search_results": []
                        },
                        "avatar_url": fallback_data.get("profile_data", {}).get("avatar_url", ""),
                        "analysis_timestamp": datetime.utcnow().isoformat(),
                        "privacy_score": "UNKNOWN",
                        "total_data_points": len(fallback_data.get("social_accounts", [])),
                        "overall_risk_level": "UNKNOWN",
                        "api_version": "fallback_v1",
                        "mode": "public_data_search",
                        "external_api_status": "unavailable",
                        "raw_api_response": fallback_data
                    }
                
                # 尝试解析响应
                try:
                    api_data = response.json()
                    logger.info(f"✅ [Google API] Successfully parsed JSON response")
                    logger.info(f"📊 [Google API] Response keys: {list(api_data.keys()) if isinstance(api_data, dict) else 'Not a dict'}")
                except json.JSONDecodeError as json_err:
                    logger.error(f"❌ [Google API] JSON decode error: {str(json_err)}")
                    logger.error(f"📋 [Google API] Raw response: {response.text[:500]}...")
                    
                    # JSON解析失败，返回友好的公开数据搜索结果
                    fallback_data = await fallback_email_investigation(request.email)
                    
                    return {
                        "email": str(request.email),
                        "step1_registration": {
                            "account_exists": True,
                            "gaia_id": None,
                            "status": "public_data_only",
                            "note": "外部API响应格式错误，使用公开数据搜索"
                        },
                        "step2_people_info": {
                            "name": fallback_data.get("profile_data", {}).get("name"),
                            "person_id": None,
                            "source_ids": []
                        },
                        "step3_additional_data": {
                            "social_accounts": fallback_data.get("social_accounts", []),
                            "digital_footprint": fallback_data.get("digital_footprint", {}),
                            "profile_data": fallback_data.get("profile_data", {}),
                            "raw_response": fallback_data
                        },
                        "step4_summary": {
                            "total_data_sources": len(fallback_data.get("social_accounts", [])),
                            "privacy_exposure": f"公开数据搜索: 找到{len(fallback_data.get('social_accounts', []))}个相关结果"
                        },
                        "step5_location_analysis": {
                            "location_data": {},
                            "maps_data": {}
                        },
                        "step6_reverse_image": {
                            "avatar_analysis": "使用公开数据搜索",
                            "reverse_search_results": []
                        },
                        "avatar_url": fallback_data.get("profile_data", {}).get("avatar_url", ""),
                        "analysis_timestamp": datetime.utcnow().isoformat(),
                        "privacy_score": "UNKNOWN",
                        "total_data_points": len(fallback_data.get("social_accounts", [])),
                        "overall_risk_level": "UNKNOWN",
                        "api_version": "fallback_v1",
                        "mode": "public_data_search",
                        "external_api_status": "json_error",
                        "raw_api_response": fallback_data
                    }
                
            except httpx.HTTPStatusError as http_err:
                logger.error(f"❌ [Google API] HTTP error: {str(http_err)}")
                fallback_data = await fallback_email_investigation(request.email)
                return {
                    "email": str(request.email),
                    "step1_registration": {
                        "account_exists": True,
                        "gaia_id": None,
                        "status": "public_data_only",
                        "note": "HTTP错误，使用公开数据搜索"
                    },
                    "step2_people_info": {"name": fallback_data.get("profile_data", {}).get("name"), "person_id": None, "source_ids": []},
                    "step3_additional_data": {"social_accounts": fallback_data.get("social_accounts", []), "digital_footprint": fallback_data.get("digital_footprint", {}), "profile_data": fallback_data.get("profile_data", {}), "raw_response": fallback_data},
                    "step4_summary": {"total_data_sources": len(fallback_data.get("social_accounts", [])), "privacy_exposure": f"公开数据搜索: 找到{len(fallback_data.get('social_accounts', []))}个相关结果"},
                    "step5_location_analysis": {"location_data": {}, "maps_data": {}},
                    "step6_reverse_image": {"avatar_analysis": "使用公开数据搜索", "reverse_search_results": []},
                    "avatar_url": fallback_data.get("profile_data", {}).get("avatar_url", ""),
                    "analysis_timestamp": datetime.utcnow().isoformat(),
                    "privacy_score": "UNKNOWN",
                    "total_data_points": len(fallback_data.get("social_accounts", [])),
                    "overall_risk_level": "UNKNOWN",
                    "api_version": "fallback_v1",
                    "mode": "public_data_search",
                    "external_api_status": "http_error",
                    "raw_api_response": fallback_data
                }
            except Exception as req_err:
                logger.error(f"❌ [Google API] Request error: {str(req_err)}")
                fallback_data = await fallback_email_investigation(request.email)
                return {
                    "email": str(request.email),
                    "step1_registration": {
                        "account_exists": True,
                        "gaia_id": None,
                        "status": "public_data_only",
                        "note": "请求错误，使用公开数据搜索"
                    },
                    "step2_people_info": {"name": fallback_data.get("profile_data", {}).get("name"), "person_id": None, "source_ids": []},
                    "step3_additional_data": {"social_accounts": fallback_data.get("social_accounts", []), "digital_footprint": fallback_data.get("digital_footprint", {}), "profile_data": fallback_data.get("profile_data", {}), "raw_response": fallback_data},
                    "step4_summary": {"total_data_sources": len(fallback_data.get("social_accounts", [])), "privacy_exposure": f"公开数据搜索: 找到{len(fallback_data.get('social_accounts', []))}个相关结果"},
                    "step5_location_analysis": {"location_data": {}, "maps_data": {}},
                    "step6_reverse_image": {"avatar_analysis": "使用公开数据搜索", "reverse_search_results": []},
                    "avatar_url": fallback_data.get("profile_data", {}).get("avatar_url", ""),
                    "analysis_timestamp": datetime.utcnow().isoformat(),
                    "privacy_score": "UNKNOWN",
                    "total_data_points": len(fallback_data.get("social_accounts", [])),
                    "overall_risk_level": "UNKNOWN",
                    "api_version": "fallback_v1",
                    "mode": "public_data_search",
                    "external_api_status": "request_error",
                    "raw_api_response": fallback_data
                }
            
            # 处理调查API的响应数据，转换为兼容格式
            # 外部API返回格式: {status, message, data: {person_id, email, profile_photo, etc}, maps_stats: {reviews, photos, etc}}
            # 统一解析不同API结构
            user_data = api_data.get("data", {}) if isinstance(api_data, dict) else {}
            maps_stats = api_data.get("maps_stats", {}) if isinstance(api_data, dict) else {}
            status = api_data.get("status") if isinstance(api_data, dict) else None

            # 兼容 8002/api/email 返回结构：顶层 PROFILE_CONTAINER
            if isinstance(api_data, dict) and not user_data and "PROFILE_CONTAINER" in api_data:
                pc = api_data.get("PROFILE_CONTAINER", {})
                profile = pc.get("profile", {})
                profile_infos = (profile.get("profileInfos", {}) or {}).get("PROFILE", {})
                apps_info = (profile.get("inAppReachability", {}) or {}).get("PROFILE", {})
                activated_services = []
                if isinstance(profile_infos.get("userTypes"), list):
                    activated_services.extend(profile_infos.get("userTypes") or [])
                if isinstance(apps_info.get("apps"), list):
                    activated_services.extend(apps_info.get("apps") or [])
                maps = pc.get("maps", {})
                maps_stats = maps.get("stats", {})
                photo = (profile.get("profilePhotos", {}) or {}).get("PROFILE", {})
                user_data = {
                    "person_id": profile.get("personId"),
                    "name": None,
                    "profile_photo": photo.get("url"),
                    "activated_services": activated_services,
                    "location_data": {},
                }
                status = "success" if user_data.get("person_id") else status

            has_account = bool(user_data.get("person_id") or user_data.get("name") or status == "success")
            
            result = {
                "email": str(request.email),
                "step1_registration": {
                    "account_exists": has_account,
                    "gaia_id": user_data.get("person_id"),
                    "status": "active" if has_account else "not_found"
                },
                "step2_people_info": {
                    "name": user_data.get("name", ""),
                    "person_id": user_data.get("person_id"),
                    "source_ids": user_data.get("activated_services", [])
                },
                "step3_additional_data": {
                    "social_accounts": user_data.get("activated_services", []),
                    "digital_footprint": maps_stats,
                    "profile_data": user_data,
                    "raw_response": api_data
                },
                "step4_summary": {
                    "total_data_sources": len(user_data.get("activated_services", [])) + (1 if maps_stats else 0),
                    "privacy_exposure": f"Found {len(user_data.get('activated_services', []))} activated services" if has_account else "No account found"
                },
                "step5_location_analysis": {
                    "location_data": user_data.get("location_data", {}),
                    "maps_data": maps_stats
                },
                "step6_reverse_image": {
                    "avatar_analysis": "Profile photo available" if user_data.get("profile_photo") else "No profile photo found",
                    "reverse_search_results": []
                },
                "avatar_url": user_data.get("profile_photo", ""),
                "analysis_timestamp": datetime.utcnow().isoformat(),
                "privacy_score": "HIGH" if has_account and maps_stats else "MEDIUM" if has_account else "LOW",
                "total_data_points": len(user_data.get("activated_services", [])) + sum([maps_stats.get("reviews", 0), maps_stats.get("photos", 0), maps_stats.get("answers", 0)]),
                "overall_risk_level": "HIGH" if isinstance(maps_stats, dict) and (maps_stats.get("Reviews") or maps_stats.get("reviews") or 0) > 0 else "MODERATE" if has_account else "LOW",
                "api_version": "investigate_v1",
                "raw_api_response": api_data
            }
            
            logger.info(f"✅ [Google API] Investigation completed successfully for {request.email}")
            return result
            
    except httpx.TimeoutException:
        error_msg = f"Google邮箱调查请求超时（超过{REQUEST_TIMEOUT}秒）"
        logger.error(f"⏰ [Google API] {error_msg}")
        raise HTTPException(status_code=408, detail=error_msg)
        
    except httpx.RequestError as e:
        error_msg = f"网络请求失败: {str(e)}"
        logger.error(f"🌐 [Google API] {error_msg}")
        raise HTTPException(status_code=503, detail=error_msg)
        
    except Exception as e:
        error_msg = f"Google邮箱调查过程中发生错误: {str(e) if str(e) else '未知错误'}"
        logger.error(f"💥 [Google API] {error_msg}")
        logger.exception("Full exception details:")
        raise HTTPException(status_code=500, detail=error_msg)

@router.post("/investigate")
async def investigate_google_email(request: EmailAnalysisRequest):
    """
    调查Google邮箱信息 - 使用外部调查API
    """
    try:
        logger.info(f"🔍 [Google Investigate] Starting investigation for: {request.email}")
        
        # 外部邮箱调查API配置
        INVESTIGATE_API_URL = "http://47.253.47.192:8000/api/v1/email/investigate"
        REQUEST_TIMEOUT = 60
        
        # 准备请求数据
        payload = {
            "email": str(request.email)
        }
        
        logger.info(f"🌐 [Google Investigate] Target URL: {INVESTIGATE_API_URL}")
        logger.info(f"📧 [Google Investigate] Email: {request.email}")
        
        # 调用外部调查API
        async with httpx.AsyncClient(timeout=REQUEST_TIMEOUT) as client:
            try:
                headers = {
                    "Content-Type": "application/json",
                    "Accept": "application/json"
                }
                
                response = await client.post(
                    INVESTIGATE_API_URL,
                    json=payload,
                    headers=headers
                )
                
                logger.info(f"📡 [Google Investigate] API response status: {response.status_code}")
                
                if response.status_code != 200:
                    error_text = response.text
                    logger.error(f"❌ [Google Investigate] API error {response.status_code}: {error_text}")
                    
                    # 如果外部API失败，返回基本的邮箱检查结果
                    return await fallback_email_investigation(request.email)
                
                # 尝试解析响应
                try:
                    api_data = response.json()
                    logger.info(f"✅ [Google Investigate] Successfully parsed JSON response")
                    logger.info(f"📊 [Google Investigate] Response keys: {list(api_data.keys()) if isinstance(api_data, dict) else 'Not a dict'}")
                except json.JSONDecodeError as json_err:
                    logger.error(f"❌ [Google Investigate] JSON decode error: {str(json_err)}")
                    logger.error(f"📋 [Google Investigate] Raw response: {response.text[:500]}...")
                    
                    # JSON解析失败，使用备用方案
                    return await fallback_email_investigation(request.email)
                
            except httpx.HTTPStatusError as http_err:
                logger.error(f"❌ [Google Investigate] HTTP error: {str(http_err)}")
                return await fallback_email_investigation(request.email)
            except Exception as req_err:
                logger.error(f"❌ [Google Investigate] Request error: {str(req_err)}")
                return await fallback_email_investigation(request.email)
            
            # 处理调查API的响应数据
            result = {
                "email": str(request.email),
                "investigation_status": "completed",
                "data_sources": api_data.get("sources", []),
                "profile_data": api_data.get("profile", {}),
                "social_accounts": api_data.get("social_accounts", []),
                "digital_footprint": api_data.get("digital_footprint", {}),
                "privacy_analysis": {
                    "exposure_level": api_data.get("privacy", {}).get("exposure_level", "unknown"),
                    "risk_score": api_data.get("privacy", {}).get("risk_score", 0),
                    "recommendations": api_data.get("privacy", {}).get("recommendations", [])
                },
                "metadata": {
                    "investigation_timestamp": datetime.utcnow().isoformat(),
                    "api_version": "v1",
                    "processing_time": api_data.get("processing_time", "unknown"),
                    "data_quality": api_data.get("data_quality", "unknown")
                },
                "raw_api_response": api_data
            }
            
            logger.info(f"✅ [Google Investigate] Investigation completed successfully for {request.email}")
            return result
            
    except httpx.TimeoutException:
        error_msg = f"Google邮箱调查请求超时（超过{REQUEST_TIMEOUT}秒）"
        logger.error(f"⏰ [Google Investigate] {error_msg}")
        raise HTTPException(status_code=408, detail=error_msg)
        
    except httpx.RequestError as e:
        error_msg = f"网络请求失败: {str(e)}"
        logger.error(f"🌐 [Google Investigate] {error_msg}")
        raise HTTPException(status_code=503, detail=error_msg)
        
    except Exception as e:
        error_msg = f"Google邮箱调查过程中发生错误: {str(e) if str(e) else '未知错误'}"
        logger.error(f"💥 [Google Investigate] {error_msg}")
        logger.exception("Full exception details:")
        raise HTTPException(status_code=500, detail=error_msg)

@router.get("/maps/reviews")
async def get_maps_reviews(
    gaia_id: str = Query(..., description="Google Gaia ID"),
    max_reviews: int = Query(10, description="Maximum number of reviews to fetch")
):
    """
    获取用户的Google Maps评论
    """
    try:
        logger.info(f"🗺️ Fetching Google Maps reviews for Gaia ID: {gaia_id}")
        
        # 构建Google Maps API请求
        reviews_data = await fetch_google_maps_reviews(gaia_id, max_reviews)
        
        return {
            "success": True,
            "gaia_id": gaia_id,
            "reviews": reviews_data,
            "total_reviews": len(reviews_data),
            "timestamp": datetime.utcnow().isoformat()
        }
        
    except Exception as e:
        logger.error(f"❌ Google Maps reviews error: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Failed to fetch Google Maps reviews: {str(e)}")

@router.get("/profile/avatar")
async def get_google_avatar(
    email: str = Query(..., description="Email address"),
    size: int = Query(200, description="Avatar size in pixels")
):
    """
    获取Google账户头像
    """
    try:
        logger.info(f"👤 Fetching Google avatar for: {email}")
        
        # 尝试获取Google头像
        avatar_info = await fetch_google_avatar(email, size)
        
        return {
            "success": True,
            "email": email,
            "avatar_url": avatar_info.get("url"),
            "is_default": avatar_info.get("is_default", True),
            "size": size,
            "timestamp": datetime.utcnow().isoformat()
        }
        
    except Exception as e:
        logger.error(f"❌ Google avatar error: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Failed to fetch Google avatar: {str(e)}")

# ==================== 辅助函数 ====================

async def perform_duckduckgo_search(query: str, num_results: int = 10) -> List[Dict[str, Any]]:
    """
    使用DuckDuckGo执行搜索
    """
    try:
        async with httpx.AsyncClient(timeout=30.0) as client:
            # DuckDuckGo即时搜索API
            url = "https://api.duckduckgo.com/"
            params = {
                "q": query,
                "format": "json",
                "no_html": "1",
                "skip_disambig": "1"
            }
            
            headers = {
                "User-Agent": USER_AGENTS[0]
            }
            
            response = await client.get(url, params=params, headers=headers)
            response.raise_for_status()
            
            data = response.json()
            results = []
            
            # 处理相关主题
            for topic in data.get("RelatedTopics", [])[:num_results]:
                if isinstance(topic, dict) and "Text" in topic:
                    results.append({
                        "title": topic.get("Text", "").split(" - ")[0] if " - " in topic.get("Text", "") else topic.get("Text", ""),
                        "description": topic.get("Text", ""),
                        "url": topic.get("FirstURL", ""),
                        "source": "DuckDuckGo"
                    })
            
            return results[:num_results]
            
    except Exception as e:
        logger.error(f"DuckDuckGo search error: {str(e)}")
        return []

async def check_google_account_existence(email: str) -> Dict[str, Any]:
    """
    检查Google账户是否存在
    """
    try:
        async with httpx.AsyncClient(timeout=30.0) as client:
            # 使用Google账户恢复页面检查账户存在性
            url = "https://accounts.google.com/signin/v2/lookup"
            
            data = {
                "Email": email,
                "continue": "https://accounts.google.com/",
                "service": "accountsettings"
            }
            
            headers = {
                "User-Agent": USER_AGENTS[0],
                "Content-Type": "application/x-www-form-urlencoded"
            }
            
            response = await client.post(url, data=data, headers=headers, follow_redirects=True)
            
            # 分析响应来确定账户是否存在
            account_exists = "identifier" not in response.text.lower() or "doesn't exist" not in response.text.lower()
            
            return {
                "exists": account_exists,
                "email": email,
                "gaia_id": None,  # 需要进一步API调用获取
                "status": "active" if account_exists else "not_found"
            }
            
    except Exception as e:
        logger.error(f"Google account check error: {str(e)}")
        return {"exists": False, "email": email, "error": str(e)}

async def get_google_profile_info(email: str) -> Dict[str, Any]:
    """
    获取Google公开资料信息
    """
    try:
        # 搜索Google+资料信息（虽然Google+已关闭，但某些数据可能仍然可访问）
        profile_search = await perform_duckduckgo_search(f'"{email}" site:plus.google.com OR site:profiles.google.com')
        
        profile_info = {
            "name": None,
            "avatar_url": None,
            "last_seen": None,
            "public_info": profile_search
        }
        
        # 尝试从搜索结果中提取信息
        for result in profile_search:
            if "google" in result.get("url", "").lower():
                # 提取可能的姓名信息
                text = result.get("description", "")
                name_match = re.search(r'([A-Z][a-z]+ [A-Z][a-z]+)', text)
                if name_match and not profile_info["name"]:
                    profile_info["name"] = name_match.group(1)
        
        return profile_info
        
    except Exception as e:
        logger.error(f"Google profile info error: {str(e)}")
        return {"error": str(e)}

async def get_google_maps_data(gaia_id: Optional[str]) -> Dict[str, Any]:
    """
    获取Google Maps相关数据
    """
    if not gaia_id:
        return {"error": "No Gaia ID provided"}
    
    try:
        maps_data = {
            "profile_url": f"https://www.google.com/maps/contrib/{gaia_id}/reviews",
            "reviews_count": 0,
            "photos_count": 0,
            "places_visited": [],
            "reviews": []
        }
        
        # 这里需要实际的Google Maps API调用
        # 目前返回模拟数据结构
        
        return maps_data
        
    except Exception as e:
        logger.error(f"Google Maps data error: {str(e)}")
        return {"error": str(e)}

async def search_social_profiles(email: str) -> List[Dict[str, Any]]:
    """
    搜索社交媒体资料
    """
    try:
        social_platforms = [
            "linkedin.com", "facebook.com", "twitter.com", "instagram.com", 
            "github.com", "youtube.com", "pinterest.com"
        ]
        
        social_profiles = []
        
        for platform in social_platforms:
            # 搜索特定平台上的资料
            search_query = f'"{email}" site:{platform}'
            platform_results = await perform_duckduckgo_search(search_query, num_results=3)
            
            for result in platform_results:
                if platform in result.get("url", ""):
                    social_profiles.append({
                        "platform": platform.replace(".com", "").title(),
                        "url": result["url"],
                        "title": result["title"],
                        "description": result["description"]
                    })
        
        return social_profiles
        
    except Exception as e:
        logger.error(f"Social profiles search error: {str(e)}")
        return []

async def fetch_google_maps_reviews(gaia_id: str, max_reviews: int) -> List[Dict[str, Any]]:
    """
    获取Google Maps评论
    """
    try:
        # 这里需要实际的Google Maps API实现
        # 目前返回模拟数据
        reviews = [
            {
                "id": f"review_{i}",
                "rating": 4,
                "text": f"Sample review {i}",
                "date": "2024-01-01",
                "place_name": f"Location {i}",
                "place_id": f"place_{i}"
            }
            for i in range(min(max_reviews, 5))
        ]
        
        return reviews
        
    except Exception as e:
        logger.error(f"Google Maps reviews fetch error: {str(e)}")
        return []

async def fetch_google_avatar(email: str, size: int) -> Dict[str, Any]:
    """
    获取Google账户头像
    """
    try:
        # 尝试构建Google头像URL
        # 注意：这可能不总是有效，取决于账户隐私设置
        
        # 方法1: 尝试Gravatar（许多Google账户也使用Gravatar）
        import hashlib
        email_hash = hashlib.md5(email.lower().encode()).hexdigest()
        gravatar_url = f"https://www.gravatar.com/avatar/{email_hash}?s={size}&d=404"
        
        async with httpx.AsyncClient(timeout=10.0) as client:
            response = await client.head(gravatar_url)
            if response.status_code == 200:
                return {
                    "url": gravatar_url,
                    "is_default": False,
                    "source": "gravatar"
                }
        
        # 方法2: 生成默认头像
        initials = email.split("@")[0][:2].upper()
        default_avatar = f"https://ui-avatars.com/api/?name={initials}&background=4285f4&color=ffffff&size={size}"
        
        return {
            "url": default_avatar,
            "is_default": True,
            "source": "generated"
        }
        
    except Exception as e:
        logger.error(f"Google avatar fetch error: {str(e)}")
        return {
            "url": None,
            "is_default": True,
            "error": str(e)
        }

async def fallback_google_analysis(email: str) -> Dict[str, Any]:
    """
    备用Google分析方案 - 当外部API不可用时使用
    """
    try:
        logger.info(f"🔄 [Google API] Using fallback analysis for: {email}")
        
        # 执行基本的Google账户检查
        account_info = await check_google_account_existence(email)
        profile_info = await get_google_profile_info(email)
        social_profiles = await search_social_profiles(email)
        
        # 生成头像URL
        avatar_info = await fetch_google_avatar(email, 200)
        
        # 评估隐私风险
        risk_assessment = assess_privacy_risk(
            account_info, profile_info, {}, social_profiles
        )
        
        # 构建备用响应
        result = {
            "email": email,
            "step1_registration": {
                "account_exists": account_info.get("exists", False),
                "gaia_id": account_info.get("gaia_id"),
                "status": account_info.get("status", "unknown")
            },
            "step2_people_info": {
                "name": profile_info.get("name"),
                "public_profiles": profile_info.get("public_info", [])
            },
            "step3_additional_data": {
                "social_profiles": social_profiles,
                "profile_count": len(social_profiles)
            },
            "step4_summary": {
                "total_data_sources": len(social_profiles) + (1 if account_info.get("exists") else 0),
                "privacy_exposure": "Basic analysis based on available data"
            },
            "step5_location_analysis": {
                "location_data": "External API unavailable, location data not accessible",
                "maps_data": {}
            },
            "step6_reverse_image": {
                "avatar_analysis": "Basic avatar generation",
                "reverse_search_results": []
            },
            "avatar_url": avatar_info.get("url"),
            "analysis_timestamp": datetime.utcnow().isoformat(),
            "privacy_score": risk_assessment.get("score", "UNKNOWN"),
            "total_data_points": risk_assessment.get("risk_factors", 0),
            "overall_risk_level": risk_assessment.get("risk_level", "UNKNOWN"),
            "fallback_mode": True,
            "external_api_status": "unavailable - using local analysis"
        }
        
        logger.info(f"✅ [Google API] Fallback analysis completed for {email}")
        return result
        
    except Exception as e:
        logger.error(f"❌ [Google API] Fallback analysis failed: {str(e)}")
        # 返回最小化的错误响应
        return {
            "email": email,
            "error": "Analysis failed",
            "error_detail": str(e),
            "fallback_mode": True,
            "analysis_timestamp": datetime.utcnow().isoformat(),
            "external_api_status": "unavailable"
        }

def assess_privacy_risk(account_info: Dict, profile_info: Dict, maps_data: Dict, social_profiles: List) -> Dict[str, str]:
    """
    评估隐私风险
    """
    risk_factors = 0
    
    # 账户存在性
    if account_info.get("exists"):
        risk_factors += 1
    
    # 公开资料信息
    if profile_info.get("name"):
        risk_factors += 1
    
    if profile_info.get("avatar_url"):
        risk_factors += 1
    
    # Maps数据
    if maps_data.get("reviews_count", 0) > 0:
        risk_factors += 2
    
    # 社交媒体资料
    risk_factors += len(social_profiles)
    
    # 评估风险等级
    if risk_factors == 0:
        score = "VERY_LOW"
        risk_level = "MINIMAL"
    elif risk_factors <= 2:
        score = "LOW" 
        risk_level = "LOW"
    elif risk_factors <= 5:
        score = "MEDIUM"
        risk_level = "MODERATE"
    elif risk_factors <= 8:
        score = "HIGH"
        risk_level = "HIGH"
    else:
        score = "VERY_HIGH"
        risk_level = "CRITICAL"
    
    return {
        "score": score,
        "risk_level": risk_level,
        "risk_factors": risk_factors
    }

async def fallback_email_investigation(email: str) -> Dict[str, Any]:
    """
    备用邮箱调查方案 - 当外部API不可用时使用
    """
    try:
        logger.info(f"🔄 [Google Investigate] Using fallback investigation for: {email}")
        
        # 执行基本的Google账户检查
        account_info = await check_google_account_existence(email)
        profile_info = await get_google_profile_info(email)
        social_profiles = await search_social_profiles(email)
        
        # 生成头像URL
        avatar_info = await fetch_google_avatar(email, 200)
        
        # 构建备用响应
        result = {
            "email": email,
            "investigation_status": "fallback_completed",
            "data_sources": ["basic_google_check", "profile_search", "social_search"],
            "profile_data": {
                "account_exists": account_info.get("exists", False),
                "name": profile_info.get("name"),
                "avatar_url": avatar_info.get("url"),
                "public_profiles": profile_info.get("public_info", [])
            },
            "social_accounts": social_profiles,
            "digital_footprint": {
                "search_results_count": len(profile_info.get("public_info", [])),
                "social_presence_count": len(social_profiles)
            },
            "privacy_analysis": {
                "exposure_level": "basic_analysis",
                "risk_score": len(social_profiles) * 10,  # 简单评分
                "recommendations": [
                    "审查社交媒体隐私设置",
                    "定期检查公开可见的个人信息",
                    "考虑使用隐私保护工具"
                ]
            },
            "metadata": {
                "investigation_timestamp": datetime.utcnow().isoformat(),
                "api_version": "fallback_v1",
                "processing_time": "local_processing",
                "data_quality": "basic"
            },
            "external_api_status": "unavailable - using local analysis"
        }
        
        logger.info(f"✅ [Google Investigate] Fallback investigation completed for {email}")
        return result
        
    except Exception as e:
        logger.error(f"❌ [Google Investigate] Fallback investigation failed: {str(e)}")
        # 返回最小化的错误响应
        return {
            "email": email,
            "investigation_status": "failed",
            "error": "Investigation failed",
            "error_detail": str(e),
            "fallback_mode": True,
            "investigation_timestamp": datetime.utcnow().isoformat(),
            "external_api_status": "unavailable"
        }