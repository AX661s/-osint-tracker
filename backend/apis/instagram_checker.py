"""
Instagram Checker via RapidAPI
当返回结果包含 True（存在账号）时，标记为 found 并返回简单数据结构供前端渲染卡片
"""
from typing import Dict, Any
from .config import RAPIDAPI_KEY, DEFAULT_TIMEOUT
from .base import BaseAPIClient, normalize_phone, mask_key, to_bool


class InstagramAPI(BaseAPIClient):
    """Instagram Checker API 客户端"""
    
    BASE_URL = "https://instagram-checker.p.rapidapi.com/check"
    
    def __init__(self):
        super().__init__("instagram", "Instagram")
    
    async def query(self, phone: str, timeout: int = DEFAULT_TIMEOUT) -> Dict[str, Any]:
        """检查电话号码是否关联 Instagram"""
        if not RAPIDAPI_KEY:
            return self.fail("RAPIDAPI_KEY 未配置")
        
        digits_only = normalize_phone(phone)
        self.log_query("电话", f"+{digits_only}", f"key={mask_key(RAPIDAPI_KEY)}")
        
        try:
            resp = await self.post(
                self.BASE_URL,
                json={"input": f"+{digits_only}"},
                headers={
                    "Content-Type": "application/json",
                    "x-rapidapi-host": "instagram-checker.p.rapidapi.com",
                    "x-rapidapi-key": RAPIDAPI_KEY,
                },
                timeout=timeout
            )
            
            if resp.status_code != 200:
                self.log_warning(f"错误: Status {resp.status_code}")
                return self.fail(f"Status {resp.status_code}: {resp.text[:200]}")
            
            data = resp.json()
            import logging
            logging.info(f"📱 [Instagram] Raw response: {data}")
            
            # 判断是否找到账户
            found = False
            if isinstance(data, dict):
                candidates = [
                    data.get("result"), data.get("exists"), data.get("is_instagram"),
                    data.get("has_instagram"), data.get("valid"), data.get("found"),
                    data.get("instagram"), data.get("status") == "found",
                    data.get("live")  # 🔥 新增：live=True 表示存在 Instagram
                ]
                found = any(to_bool(x) for x in candidates)
            
            return {
                "success": True,
                "data": {"instagram_found": found, "query": f"+{digits_only}"},
                "source": "instagram",
                "module": "instagram",
                "status": "found" if found else "not_found",
            }
            
        except Exception as e:
            self.log_error(f"异常: {str(e)}")
            return self.fail(str(e))


# 保持向后兼容的函数接口
_client = InstagramAPI()


async def query_instagram(phone: str, timeout: int = DEFAULT_TIMEOUT) -> Dict[str, Any]:
    """查询 Instagram 信息（向后兼容接口）"""
    return await _client.query(phone, timeout)