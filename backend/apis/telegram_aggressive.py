"""
Telegram Aggressive Check API
激进式Telegram账号检测 - 批量检测电话号码是否注册Telegram
API: http://47.253.47.192:8084/check-aggressive
"""
import httpx
import logging
from typing import Dict, Any, List
import os

logger = logging.getLogger(__name__)

DEFAULT_TIMEOUT = 30


async def check_telegram_aggressive(
    phone_numbers: List[str], 
    timeout: int = DEFAULT_TIMEOUT
) -> Dict[str, Any]:
    """
    Telegram Aggressive Check: 批量检测电话号码是否有Telegram账号
    
    Args:
        phone_numbers: 电话号码列表（支持带+或不带+）
        timeout: 超时时间（秒）
        
    Returns:
        Dict包含:
        - success: bool - 查询是否成功
        - data: dict - Telegram账号信息
        - source: str - 数据来源标识
        - error: str - 错误信息（如果失败）
        
    示例返回:
    {
        "success": true,
        "data": {
            "results": [
                {
                    "phone": "+14403828826",
                    "has_telegram": true,
                    "user_id": "123456789",
                    "username": "johndoe",
                    "first_name": "John",
                    "last_name": "Doe",
                    "photo_url": "https://...",
                    "is_premium": false
                }
            ]
        },
        "source": "telegram_aggressive"
    }
    """
    try:
        # API端点
        url = os.getenv("TELEGRAM_AGGRESSIVE_API_URL", "http://47.253.47.192:8084/check-aggressive")
        
        # 格式化电话号码（确保带+号）
        formatted_phones = []
        for phone in phone_numbers:
            if not phone.startswith('+'):
                # 如果没有+号，添加+号
                digits = ''.join(ch for ch in phone if ch.isdigit())
                formatted_phones.append(f'+{digits}')
            else:
                formatted_phones.append(phone)
        
        payload = {
            "phone_numbers": formatted_phones
        }
        
        logger.info(f"🔍 [Telegram Aggressive] 批量查询 {len(formatted_phones)} 个号码: {formatted_phones}")
        
        async with httpx.AsyncClient(timeout=timeout) as client:
            response = await client.post(
                url,
                json=payload,
                headers={"Content-Type": "application/json"}
            )
            
            if response.status_code == 200:
                data = response.json()
                logger.info(f"✅ [Telegram Aggressive] 查询成功")
                
                return {
                    "success": True,
                    "data": data,
                    "source": "telegram_aggressive",
                    "phone_count": len(formatted_phones)
                }
            else:
                logger.error(f"❌ [Telegram Aggressive] HTTP {response.status_code}: {response.text[:200]}")
                return {
                    "success": False,
                    "error": f"API returned {response.status_code}",
                    "source": "telegram_aggressive"
                }
                
    except httpx.TimeoutException:
        logger.error(f"⏱️ [Telegram Aggressive] 请求超时")
        return {
            "success": False,
            "error": "Request timeout",
            "source": "telegram_aggressive"
        }
    except Exception as e:
        logger.error(f"❌ [Telegram Aggressive] 错误: {str(e)}")
        return {
            "success": False,
            "error": str(e),
            "source": "telegram_aggressive"
        }


async def check_single_telegram_aggressive(phone: str, timeout: int = DEFAULT_TIMEOUT) -> Dict[str, Any]:
    """
    单个电话号码的Telegram Aggressive检测（便捷方法）
    
    Args:
        phone: 单个电话号码
        timeout: 超时时间
        
    Returns:
        Dict包含该号码的Telegram信息
    """
    result = await check_telegram_aggressive([phone], timeout)
    
    if result.get("success") and result.get("data"):
        # 提取第一个结果
        results = result["data"].get("results", [])
        if results and len(results) > 0:
            first_result = results[0]
            return {
                "success": True,
                "data": first_result,
                "source": "telegram_aggressive",
                "has_telegram": first_result.get("has_telegram", False)
            }
    
    return result
