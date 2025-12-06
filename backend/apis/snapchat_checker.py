"""
Snapchat Checker API - 检查电话号码是否关联 Snapchat 账户
"""
import httpx
import logging

logger = logging.getLogger(__name__)

RAPIDAPI_KEY = "3f4bcf0e74msh2f1e9b5504fd778p10f7c6jsn39111f8fffde"
RAPIDAPI_HOST = "snapchat-checker.p.rapidapi.com"


async def check_snapchat(phone: str) -> dict:
    """
    检查电话号码是否关联 Snapchat 账户
    
    Args:
        phone: 电话号码
        
    Returns:
        dict: 包含 Snapchat 账户信息
    """
    url = "https://snapchat-checker.p.rapidapi.com/check"
    
    headers = {
        "Content-Type": "application/json",
        "x-rapidapi-host": RAPIDAPI_HOST,
        "x-rapidapi-key": RAPIDAPI_KEY
    }
    
    # 清理电话号码
    clean_phone = phone.replace("+", "").replace("-", "").replace(" ", "")
    
    payload = {
        "input": clean_phone
    }
    
    try:
        async with httpx.AsyncClient(timeout=30.0) as client:
            logger.info(f"[Snapchat] Checking phone: {clean_phone}")
            response = await client.post(url, headers=headers, json=payload)
            
            if response.status_code == 200:
                data = response.json()
                logger.info(f"[Snapchat] Response: {data}")
                
                # 检查是否找到账户 - live=True 表示存在
                found = data.get('live', False) or data.get('exists', False) or data.get('found', False)
                
                return {
                    "success": True,
                    "source": "snapchat",
                    "platform_name": "Snapchat",
                    "data": {
                        "snapchat_found": found,
                        "raw": data
                    }
                }
            else:
                logger.warning(f"[Snapchat] API error: {response.status_code} - {response.text}")
                return {
                    "success": False,
                    "source": "snapchat",
                    "error": f"API error: {response.status_code}"
                }
                
    except Exception as e:
        logger.error(f"[Snapchat] Exception: {e}")
        return {
            "success": False,
            "source": "snapchat",
            "error": str(e)
        }


# 测试
if __name__ == "__main__":
    import asyncio
    
    async def test():
        result = await check_snapchat("14403828826")
        print("Result:", result)
    
    asyncio.run(test())
