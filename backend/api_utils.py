"""
API 工具函数 - 统一响应格式和错误处理
"""
from typing import Dict, Any, Optional, Union
from datetime import datetime
import logging
import traceback

logger = logging.getLogger(__name__)

class APIResponse:
    """统一API响应格式"""
    
    @staticmethod
    def success(
        data: Any = None,
        message: str = "操作成功",
        code: int = 200,
        metadata: Optional[Dict] = None
    ) -> Dict[str, Any]:
        """成功响应格式"""
        response = {
            "success": True,
            "code": code,
            "message": message,
            "timestamp": datetime.now().isoformat(),
            "data": data
        }
        
        if metadata:
            response["metadata"] = metadata
            
        return response
    
    @staticmethod
    def error(
        message: str = "操作失败",
        code: int = 400,
        error_details: Optional[str] = None,
        error_type: str = "GeneralError"
    ) -> Dict[str, Any]:
        """错误响应格式"""
        response = {
            "success": False,
            "code": code,
            "message": message,
            "timestamp": datetime.now().isoformat(),
            "error_type": error_type
        }
        
        if error_details:
            response["error_details"] = error_details
            
        return response
    
    @staticmethod
    def validation_error(
        message: str = "数据验证失败",
        errors: Optional[Dict] = None
    ) -> Dict[str, Any]:
        """验证错误响应"""
        return APIResponse.error(
            message=message,
            code=422,
            error_details=str(errors) if errors else None,
            error_type="ValidationError"
        )
    
    @staticmethod
    def not_found(
        message: str = "资源未找到",
        resource_type: str = "Resource"
    ) -> Dict[str, Any]:
        """404错误响应"""
        return APIResponse.error(
            message=message,
            code=404,
            error_type="NotFoundError"
        )
    
    @staticmethod
    def server_error(
        message: str = "服务器内部错误",
        error_details: Optional[str] = None
    ) -> Dict[str, Any]:
        """500错误响应"""
        return APIResponse.error(
            message=message,
            code=500,
            error_details=error_details,
            error_type="ServerError"
        )
    
    @staticmethod
    def unauthorized(
        message: str = "未授权访问"
    ) -> Dict[str, Any]:
        """401错误响应"""
        return APIResponse.error(
            message=message,
            code=401,
            error_type="UnauthorizedError"
        )
    
    @staticmethod
    def forbidden(
        message: str = "权限不足"
    ) -> Dict[str, Any]:
        """403错误响应"""
        return APIResponse.error(
            message=message,
            code=403,
            error_type="ForbiddenError"
        )

class ErrorHandler:
    """统一错误处理器"""
    
    @staticmethod
    def handle_exception(
        e: Exception,
        context: str = "API调用",
        include_traceback: bool = False
    ) -> Dict[str, Any]:
        """处理异常并返回标准错误响应"""
        error_msg = f"{context}时发生错误: {str(e)}"
        
        # 记录错误日志
        logger.error(error_msg)
        if include_traceback:
            logger.error(traceback.format_exc())
        
        # 根据异常类型返回不同的错误响应
        if isinstance(e, ValueError):
            return APIResponse.validation_error(
                message=f"数据格式错误: {str(e)}",
                error_details=str(e)
            )
        elif isinstance(e, KeyError):
            return APIResponse.validation_error(
                message=f"缺少必要字段: {str(e)}",
                error_details=str(e)
            )
        elif isinstance(e, PermissionError):
            return APIResponse.forbidden(
                message=f"权限不足: {str(e)}"
            )
        else:
            return APIResponse.server_error(
                message=error_msg,
                error_details=str(e) if include_traceback else None
            )

def validate_email(email: str) -> bool:
    """验证邮箱格式"""
    import re
    pattern = r'^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$'
    return re.match(pattern, email) is not None

def validate_phone(phone: str) -> bool:
    """验证电话号码格式"""
    import re
    # 支持国际号码格式
    pattern = r'^\+?[\d\s\-\(\)]{7,}$'
    return re.match(pattern, phone) is not None

def sanitize_input(text: str, max_length: int = 1000) -> str:
    """清理输入文本"""
    if not text:
        return ""
    
    # 移除危险字符
    dangerous_chars = ['<', '>', '"', "'", '&', '\x00']
    for char in dangerous_chars:
        text = text.replace(char, '')
    
    # 限制长度
    if len(text) > max_length:
        text = text[:max_length]
    
    return text.strip()

def create_pagination_response(
    data: list,
    page: int = 1,
    page_size: int = 10,
    total: Optional[int] = None
) -> Dict[str, Any]:
    """创建分页响应"""
    if total is None:
        total = len(data)
    
    start_idx = (page - 1) * page_size
    end_idx = start_idx + page_size
    page_data = data[start_idx:end_idx]
    
    total_pages = (total + page_size - 1) // page_size
    
    return APIResponse.success(
        data=page_data,
        message=f"获取第{page}页数据成功",
        metadata={
            "pagination": {
                "current_page": page,
                "page_size": page_size,
                "total_items": total,
                "total_pages": total_pages,
                "has_next": page < total_pages,
                "has_prev": page > 1
            }
        }
    )

def log_api_call(
    endpoint: str,
    method: str,
    user_id: Optional[int] = None,
    request_data: Optional[Dict] = None,
    response_status: str = "success"
):
    """记录API调用日志"""
    log_data = {
        "timestamp": datetime.now().isoformat(),
        "endpoint": endpoint,
        "method": method,
        "user_id": user_id,
        "response_status": response_status
    }
    
    if request_data:
        # 移除敏感信息
        safe_data = {k: v for k, v in request_data.items() 
                    if k not in ['password', 'token', 'session_token']}
        log_data["request_data"] = safe_data
    
    logger.info(f"API调用: {log_data}")

# 常用响应模板
class ResponseTemplates:
    """常用响应模板"""
    
    @staticmethod
    def query_success(data: Any, query_type: str = "查询") -> Dict[str, Any]:
        """查询成功响应"""
        return APIResponse.success(
            data=data,
            message=f"{query_type}成功",
            metadata={"query_type": query_type}
        )
    
    @staticmethod
    def query_failed(message: str, query_type: str = "查询") -> Dict[str, Any]:
        """查询失败响应"""
        return APIResponse.error(
            message=f"{query_type}失败: {message}",
            error_type="QueryError"
        )
    
    @staticmethod
    def auth_success(user_data: Dict, token: str) -> Dict[str, Any]:
        """认证成功响应"""
        return APIResponse.success(
            data={
                "user": user_data,
                "session_token": token
            },
            message="登录成功"
        )
    
    @staticmethod
    def auth_failed(message: str = "用户名或密码错误") -> Dict[str, Any]:
        """认证失败响应"""
        return APIResponse.unauthorized(message)
    
    @staticmethod
    def insufficient_points(required: int, available: int) -> Dict[str, Any]:
        """积分不足响应"""
        return APIResponse.error(
            message=f"积分不足。需要: {required}, 可用: {available}",
            code=402,
            error_type="InsufficientPointsError"
        )
