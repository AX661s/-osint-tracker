"""Microsoft Phone Checker API
微软电话验证、企业账户检测
返回: 微软账户、Xbox、Skype、企业账户信息
"""
from typing import Dict, Any
from .config import DEFAULT_TIMEOUT
from .base import BaseAPIClient, format_phone_with_plus


class MicrosoftPhoneAPI(BaseAPIClient):
    """Microsoft Phone API 客户端"""
    
    BASE_URL = "https://ms-roan-chi.vercel.app/api/check/phone"
    
    def __init__(self):
        super().__init__("microsoft_phone", "Microsoft Phone")
    
    async def query(self, phone: str, timeout: int = DEFAULT_TIMEOUT) -> Dict[str, Any]:
        """查询微软账户信息"""
        formatted_phone = format_phone_with_plus(phone)
        self.log_query("电话", phone)
        
        try:
            resp = await self.get(
                self.BASE_URL,
                params={"value": formatted_phone},
                timeout=timeout
            )
            
            if resp.status_code == 200:
                return self.ok(resp.json())
            else:
                self.log_warning(f"错误: Status {resp.status_code}")
                return self.fail(f"Status {resp.status_code}")
                
        except Exception as e:
            self.log_error(f"异常: {str(e)}")
            return self.fail(str(e))


# 保持向后兼容的函数接口
_client = MicrosoftPhoneAPI()


async def query_microsoft_phone(phone: str, timeout: int = DEFAULT_TIMEOUT) -> Dict[str, Any]:
    """查询 Microsoft Phone 信息（向后兼容接口）"""
    return await _client.query(phone, timeout)