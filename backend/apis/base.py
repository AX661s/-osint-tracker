"""
API 基础模块
提供通用的 API 调用封装，消除重复代码
"""
import httpx
import logging
from typing import Dict, Any, Optional, Callable, TypeVar
from functools import wraps
from abc import ABC, abstractmethod

logger = logging.getLogger(__name__)

# 类型变量
T = TypeVar('T')


class APIResult:
    """统一的 API 返回结果"""
    
    def __init__(
        self,
        success: bool,
        source: str,
        data: Any = None,
        error: Optional[str] = None,
        status: Optional[str] = None,
        **extra
    ):
        self.success = success
        self.source = source
        self.data = data
        self.error = error
        self.status = status
        self.extra = extra
    
    def to_dict(self) -> Dict[str, Any]:
        """转换为字典格式"""
        result = {
            "success": self.success,
            "source": self.source,
        }
        if self.data is not None:
            result["data"] = self.data
        if self.error is not None:
            result["error"] = self.error
        if self.status is not None:
            result["status"] = self.status
        result.update(self.extra)
        return result
    
    @classmethod
    def ok(cls, source: str, data: Any, **extra) -> "APIResult":
        """创建成功结果"""
        return cls(success=True, source=source, data=data, **extra)
    
    @classmethod
    def fail(cls, source: str, error: str, **extra) -> "APIResult":
        """创建失败结果"""
        return cls(success=False, source=source, error=error, **extra)


def api_handler(source: str, log_prefix: Optional[str] = None):
    """
    API 处理装饰器 - 统一处理异常、日志和返回格式
    
    Args:
        source: API 来源标识
        log_prefix: 日志前缀（默认使用 source）
    
    Usage:
        @api_handler("truecaller")
        async def query_truecaller(phone: str) -> Dict[str, Any]:
            # 只需要实现核心逻辑
            response = await client.get(url)
            return {"data": response.json()}
    """
    prefix = log_prefix or source.replace("_", " ").title()
    
    def decorator(func: Callable) -> Callable:
        @wraps(func)
        async def wrapper(*args, **kwargs) -> Dict[str, Any]:
            try:
                result = await func(*args, **kwargs)
                
                # 如果返回的已经是完整格式，直接返回
                if isinstance(result, dict) and "success" in result:
                    return result
                
                # 如果返回的是 APIResult，转换为字典
                if isinstance(result, APIResult):
                    return result.to_dict()
                
                # 否则包装为成功结果
                return {
                    "success": True,
                    "data": result.get("data") if isinstance(result, dict) else result,
                    "source": source
                }
                
            except httpx.TimeoutException as e:
                error_msg = f"请求超时: {str(e)}"
                logger.error(f"⏱️ [{prefix}] {error_msg}")
                return {"success": False, "error": error_msg, "source": source}
                
            except httpx.HTTPStatusError as e:
                error_msg = f"HTTP错误 {e.response.status_code}: {str(e)}"
                logger.error(f"⚠️ [{prefix}] {error_msg}")
                return {"success": False, "error": error_msg, "source": source}
                
            except Exception as e:
                error_msg = str(e)
                logger.error(f"❌ [{prefix}] 异常: {error_msg}")
                return {"success": False, "error": error_msg, "source": source}
        
        return wrapper
    return decorator


class BaseAPIClient:
    """
    API 客户端基类
    提供通用的 HTTP 请求方法和日志记录
    """
    
    def __init__(self, source: str, log_prefix: Optional[str] = None):
        self.source = source
        self.prefix = log_prefix or source.replace("_", " ").title()
    
    def log_query(self, query_type: str, query: str, extra: str = ""):
        """记录查询日志"""
        msg = f"🔍 [{self.prefix}] 查询{query_type}: {query}"
        if extra:
            msg += f" {extra}"
        logger.info(msg)
    
    def log_success(self, message: str = "查询成功"):
        """记录成功日志"""
        logger.info(f"✅ [{self.prefix}] {message}")
    
    def log_warning(self, message: str):
        """记录警告日志"""
        logger.warning(f"⚠️ [{self.prefix}] {message}")
    
    def log_error(self, message: str):
        """记录错误日志"""
        logger.error(f"❌ [{self.prefix}] {message}")
    
    def ok(self, data: Any, **extra) -> Dict[str, Any]:
        """返回成功结果"""
        self.log_success()
        result = {"success": True, "data": data, "source": self.source}
        result.update(extra)
        return result
    
    def fail(self, error: str, **extra) -> Dict[str, Any]:
        """返回失败结果"""
        result = {"success": False, "error": error, "source": self.source}
        result.update(extra)
        return result
    
    async def get(
        self,
        url: str,
        params: Optional[Dict] = None,
        headers: Optional[Dict] = None,
        timeout: int = 15
    ) -> httpx.Response:
        """发送 GET 请求"""
        async with httpx.AsyncClient(timeout=timeout) as client:
            return await client.get(url, params=params, headers=headers)
    
    async def post(
        self,
        url: str,
        json: Optional[Dict] = None,
        data: Optional[Dict] = None,
        headers: Optional[Dict] = None,
        timeout: int = 15
    ) -> httpx.Response:
        """发送 POST 请求"""
        async with httpx.AsyncClient(timeout=timeout) as client:
            return await client.post(url, json=json, data=data, headers=headers)


# 通用工具函数
def normalize_phone(phone: str) -> str:
    """规范化电话号码为纯数字"""
    return ''.join(ch for ch in str(phone) if ch.isdigit())


def format_phone_with_plus(phone: str) -> str:
    """格式化电话号码（带+号）"""
    digits = normalize_phone(phone)
    return f"+{digits}" if not phone.startswith('+') else phone


def mask_key(key: str) -> str:
    """遮蔽 API 密钥"""
    if not key:
        return "未配置"
    return f"{key[:8]}...{key[-4:]}" if len(key) >= 12 else "已配置"


def to_bool(value: Any) -> bool:
    """
    通用布尔值转换
    支持多种格式: True, "true", "yes", "1", 1 等
    """
    if value is True:
        return True
    if value is False or value is None:
        return False
    if isinstance(value, (int, float)):
        return value == 1
    if isinstance(value, str):
        return value.strip().lower() in {"true", "yes", "y", "1", "found", "valid"}
    return bool(value)
