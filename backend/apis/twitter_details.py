"""
Twitter用户详情API - 使用RapidAPI的Twitter-X API
获取真实的Twitter用户信息、头像、粉丝数等
"""
import httpx
from fastapi import APIRouter, HTTPException
import os
from typing import Optional

router = APIRouter()

# RapidAPI配置
RAPIDAPI_KEY = os.getenv("RAPIDAPI_KEY", "3f4bcf0e74msh2f1e9b5504fd778p10f7c6jsn39111f8fffde")
RAPIDAPI_HOST = "twitter-x.p.rapidapi.com"

@router.get("/api/twitter/details")
async def get_twitter_user_details(username: str):
    """
    获取Twitter用户详情
    
    参数:
        username: Twitter用户名（不带@）
    
    返回:
        {
            "success": True,
            "data": {
                "id": "用户ID",
                "name": "显示名称",
                "screen_name": "用户名",
                "description": "简介",
                "profile_image_url": "头像URL (原始)",
                "profile_image_url_https": "头像URL (HTTPS)",
                "followers_count": 粉丝数,
                "friends_count": 关注数,
                "statuses_count": 推文数,
                "created_at": "创建时间",
                "verified": 是否认证,
                "profile_banner_url": "背景图URL"
            }
        }
    """
    try:
        url = f"https://{RAPIDAPI_HOST}/user/details"
        headers = {
            "x-rapidapi-host": RAPIDAPI_HOST,
            "x-rapidapi-key": RAPIDAPI_KEY
        }
        params = {"username": username}
        
        print(f"🐦 [Twitter API] 查询用户: {username}")
        
        async with httpx.AsyncClient(timeout=30.0) as client:
            response = await client.get(url, headers=headers, params=params)
            
            print(f"🐦 [Twitter API] 状态码: {response.status_code}")
            
            if response.status_code == 200:
                data = response.json()
                
                # 提取关键信息
                if "data" in data and "user" in data["data"]:
                    user = data["data"]["user"]["result"]
                    
                    # 提取legacy字段（包含核心信息）
                    legacy = user.get("legacy", {})
                    
                    # 构建响应
                    user_details = {
                        "id": user.get("rest_id"),
                        "name": legacy.get("name"),
                        "screen_name": legacy.get("screen_name"),
                        "description": legacy.get("description"),
                        "profile_image_url": legacy.get("profile_image_url_https", "").replace("_normal", "_400x400"),  # 获取高清头像
                        "profile_image_url_https": legacy.get("profile_image_url_https"),
                        "followers_count": legacy.get("followers_count"),
                        "friends_count": legacy.get("friends_count"),
                        "statuses_count": legacy.get("statuses_count"),
                        "created_at": legacy.get("created_at"),
                        "verified": user.get("is_blue_verified", False),
                        "profile_banner_url": legacy.get("profile_banner_url"),
                        "location": legacy.get("location"),
                        "url": legacy.get("url")
                    }
                    
                    print(f"✅ [Twitter API] 成功获取 @{user_details['screen_name']} 的信息")
                    print(f"   - 头像: {user_details['profile_image_url']}")
                    print(f"   - 粉丝: {user_details['followers_count']}")
                    
                    return {
                        "success": True,
                        "data": user_details
                    }
                else:
                    # 尝试直接解析数据
                    print(f"⚠️ [Twitter API] 数据结构不匹配，返回原始数据")
                    return {
                        "success": True,
                        "data": data
                    }
            elif response.status_code == 404:
                return {
                    "success": False,
                    "error": "用户不存在",
                    "username": username
                }
            else:
                print(f"❌ [Twitter API] 错误: {response.status_code}")
                print(f"   响应: {response.text[:200]}")
                return {
                    "success": False,
                    "error": f"API错误: {response.status_code}",
                    "detail": response.text[:200]
                }
                
    except httpx.TimeoutException:
        print(f"⏰ [Twitter API] 请求超时")
        raise HTTPException(status_code=504, detail="Twitter API请求超时")
    except Exception as e:
        print(f"❌ [Twitter API] 异常: {str(e)}")
        raise HTTPException(status_code=500, detail=f"获取Twitter信息失败: {str(e)}")


@router.get("/api/twitter/avatar")
async def get_twitter_avatar(username: str, size: Optional[str] = "400x400"):
    """
    快速获取Twitter头像URL
    
    参数:
        username: Twitter用户名
        size: 头像尺寸 (normal=48x48, bigger=73x73, 400x400=高清)
    
    返回:
        {
            "success": True,
            "avatar_url": "头像URL",
            "username": "用户名"
        }
    """
    try:
        details_response = await get_twitter_user_details(username)
        
        if details_response["success"]:
            avatar_url = details_response["data"].get("profile_image_url")
            
            # 根据请求的尺寸调整
            if size == "normal":
                avatar_url = avatar_url.replace("_400x400", "_normal")
            elif size == "bigger":
                avatar_url = avatar_url.replace("_400x400", "_bigger")
            
            return {
                "success": True,
                "avatar_url": avatar_url,
                "username": username
            }
        else:
            return details_response
            
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
