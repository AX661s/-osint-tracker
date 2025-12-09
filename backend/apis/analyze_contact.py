"""
Analyze Contact API
综合分析API - GetContact + LinkedIn
API: http://47.253.47.192:8000/api/v1/analyze/{phone}
"""
import httpx
import logging
from typing import Dict, Any
import os

logger = logging.getLogger(__name__)

DEFAULT_TIMEOUT = 30


async def analyze_contact(phone: str, timeout: int = DEFAULT_TIMEOUT) -> Dict[str, Any]:
    """
    综合分析电话号码 - GetContact + LinkedIn
    
    Args:
        phone: 电话号码（不带+号）
        timeout: 超时时间（秒）
        
    Returns:
        Dict包含:
        - success: bool - 查询是否成功
        - data: dict - 分析数据（包含GetContact和LinkedIn）
        - source: str - 数据来源标识
        - error: str - 错误信息（如果失败）
    """
    try:
        # 清理电话号码（移除特殊字符）
        clean_phone = ''.join(ch for ch in phone if ch.isdigit())
        
        # API端点
        url = f"http://47.253.47.192:8000/api/v1/analyze/{clean_phone}"
        
        logger.info(f"🔍 [Analyze Contact] 综合查询: {clean_phone}")
        
        async with httpx.AsyncClient(timeout=timeout) as client:
            response = await client.get(url)
            
            if response.status_code == 200:
                data = response.json()
                
                if data.get('success'):
                    logger.info(f"✅ [Analyze Contact] 查询成功")
                    
                    return {
                        "success": True,
                        "data": data,
                        "source": "analyze_contact",
                        "phone": clean_phone
                    }
                else:
                    logger.warning(f"⚠️ [Analyze Contact] API返回success=false")
                    return {
                        "success": False,
                        "error": "API returned success=false",
                        "source": "analyze_contact"
                    }
            else:
                logger.error(f"❌ [Analyze Contact] HTTP {response.status_code}: {response.text[:200]}")
                return {
                    "success": False,
                    "error": f"API returned {response.status_code}",
                    "source": "analyze_contact"
                }
                
    except httpx.TimeoutException:
        logger.error(f"⏱️ [Analyze Contact] 请求超时")
        return {
            "success": False,
            "error": "Request timeout",
            "source": "analyze_contact"
        }
    except Exception as e:
        logger.error(f"❌ [Analyze Contact] 错误: {str(e)}")
        return {
            "success": False,
            "error": str(e),
            "source": "analyze_contact"
        }
