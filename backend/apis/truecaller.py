"""Truecaller API via RapidAPI (truecaller4)
电话号码详细信息查询（替换旧 Truecaller 自托管端点）
返回: 姓名、运营商、位置、垃圾评分等
"""
from typing import Dict, Any
from .config import TRUECALLER_RAPIDAPI_KEY, DEFAULT_TIMEOUT
from .base import BaseAPIClient, normalize_phone, mask_key


class TruecallerAPI(BaseAPIClient):
    """Truecaller API 客户端"""
    
    BASE_URL = "https://truecaller4.p.rapidapi.com/api/v1/getDetails"
    
    def __init__(self):
        super().__init__("truecaller", "Truecaller")
    
    async def query(self, phone: str, timeout: int = DEFAULT_TIMEOUT) -> Dict[str, Any]:
        """查询电话号码详细信息"""
        if not TRUECALLER_RAPIDAPI_KEY:
            return self.fail("TRUECALLER_RAPIDAPI_KEY 未配置")
        
        digits_only = normalize_phone(phone)
        self.log_query("电话", digits_only, f"key={mask_key(TRUECALLER_RAPIDAPI_KEY)}")
        
        try:
            resp = await self.get(
                self.BASE_URL,
                params={"phone": digits_only, "countryCode": "US"},
                headers={
                    "x-rapidapi-host": "truecaller4.p.rapidapi.com",
                    "x-rapidapi-key": TRUECALLER_RAPIDAPI_KEY,
                },
                timeout=timeout
            )
            
            if resp.status_code == 200:
                return self.ok(resp.json())
            else:
                self.log_warning(f"错误: Status {resp.status_code}")
                return self.fail(f"Status {resp.status_code}: {resp.text[:200]}")
                
        except Exception as e:
            self.log_error(f"异常: {str(e)}")
            return self.fail(str(e))


# 保持向后兼容的函数接口
_client = TruecallerAPI()


async def query_truecaller(phone: str, timeout: int = DEFAULT_TIMEOUT) -> Dict[str, Any]:
    """查询 Truecaller 电话信息（向后兼容接口）"""
    return await _client.query(phone, timeout)
