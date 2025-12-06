"""
Have I Been Pwned API
邮箱数据泄露查询
文档: https://haveibeenpwned.com/API/v3
"""
from typing import Dict, Any
from .config import HIBP_API_KEY, DEFAULT_TIMEOUT
from .base import BaseAPIClient


class HIBPAPI(BaseAPIClient):
    """Have I Been Pwned API 客户端"""
    
    BASE_URL = "https://haveibeenpwned.com/api/v3/breachedaccount"
    
    def __init__(self):
        super().__init__("hibp", "HIBP")
    
    async def query(self, email: str, timeout: int = DEFAULT_TIMEOUT) -> Dict[str, Any]:
        """查询邮箱是否出现在数据泄露事件中"""
        self.log_query("邮箱", email)
        
        try:
            resp = await self.get(
                f"{self.BASE_URL}/{email}",
                headers={
                    "hibp-api-key": HIBP_API_KEY,
                    "User-Agent": "OSINT-Tracker"
                },
                timeout=timeout
            )
            
            if resp.status_code == 200:
                data = resp.json()
                self.log_success(f"发现 {len(data)} 个泄露事件")
                return self.ok(data)
            elif resp.status_code == 404:
                self.log_success("未发现数据泄露")
                return self.ok([], message="No breaches found")
            else:
                self.log_warning(f"错误: Status {resp.status_code}")
                return self.fail(f"Status {resp.status_code}")
                
        except Exception as e:
            self.log_error(f"异常: {str(e)}")
            return self.fail(str(e))


# 保持向后兼容的函数接口
_client = HIBPAPI()


async def query_hibp(email: str, timeout: int = DEFAULT_TIMEOUT) -> Dict[str, Any]:
    """查询 HIBP 信息（向后兼容接口）"""
    return await _client.query(email, timeout)
