"""
IPQualityScore API
电话号码质量评分、欺诈检测
返回: 有效性、活跃状态、运营商、风险评分
"""
from typing import Dict, Any
from .config import IPQS_API_KEY, DEFAULT_TIMEOUT
from .base import BaseAPIClient


class IPQualityScoreAPI(BaseAPIClient):
    """IPQualityScore API 客户端"""
    
    def __init__(self):
        super().__init__("ipqualityscore", "IPQualityScore")
    
    def _get_url(self, phone: str) -> str:
        return f"https://www.ipqualityscore.com/api/json/phone/{IPQS_API_KEY}/{phone}"
    
    async def query(self, phone: str, timeout: int = DEFAULT_TIMEOUT) -> Dict[str, Any]:
        """查询电话号码质量评分"""
        self.log_query("电话", phone)
        
        try:
            resp = await self.get(self._get_url(phone), timeout=timeout)
            
            if resp.status_code == 200:
                data = resp.json()
                
                # 检查配额错误
                if isinstance(data, dict) and data.get('message'):
                    message = data.get('message', '')
                    if 'exceeded your request quota' in message or 'quota' in message.lower():
                        self.log_warning(f"配额已达上限: {message}")
                        return self.ok({
                            **data,
                            "status": "quota_exceeded",
                            "error_type": "quota_limit"
                        })
                
                return self.ok(data)
            else:
                self.log_warning(f"错误: Status {resp.status_code}")
                return self.fail(f"Status {resp.status_code}")
                
        except Exception as e:
            self.log_error(f"异常: {str(e)}")
            return self.fail(str(e))


# 保持向后兼容的函数接口
_client = IPQualityScoreAPI()


async def query_ipqualityscore(phone: str, timeout: int = DEFAULT_TIMEOUT) -> Dict[str, Any]:
    """查询 IPQualityScore 信息（向后兼容接口）"""
    return await _client.query(phone, timeout)
