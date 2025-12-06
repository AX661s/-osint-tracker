from fastapi import FastAPI, APIRouter, HTTPException, Depends, Query, Header, Response, Request
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
import os
import logging
from pathlib import Path
from pydantic import BaseModel, Field, ConfigDict
from typing import List, Optional, Dict, Any
import uuid
from datetime import datetime, timezone
from sqlalchemy.orm import Session
from sqlalchemy import Integer
import httpx

# External APIs flag
HAS_EXTERNAL_SEARCH = False

# LinkedIn头像API
from apis.linkedin_avatar import router as linkedin_avatar_router

# Logo API
from apis.logo_api import router as logo_router

# Google API
from apis.google_api import router as google_router

# Twitter API (RapidAPI)
from apis.twitter_details import router as twitter_details_router

# Configure logging FIRST before using logger
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

# Import database and API modules
from models import init_db, get_db
from db_operations import (
    save_email_query,
    save_phone_query,
    log_search,
    get_cache,
    save_cache
)

# Import authentication modules
from auth_operations import (
    login_user,
    verify_session,
    logout_user,
    init_default_users,
    create_user,
    get_user_info
)

try:
    from apis import (
        query_email_comprehensive, 
        EmailQueryResult,
        PhoneQueryResult
    )
    from apis.aggregator import query_phone_comprehensive as query_platform_apis
    HAS_EXTERNAL_APIS = True
except ImportError:
    HAS_EXTERNAL_APIS = False
    print("[WARNING] external_apis module not found, queries will use mock data")


ROOT_DIR = Path(__file__).parent
def _load_envs():
    paths = [
        ROOT_DIR / '.env',
        ROOT_DIR / '.env.local',
        ROOT_DIR.parent / '.env',
        ROOT_DIR.parent / '.env.local',
        Path.cwd() / '.env',
        Path.cwd() / '.env.local'
    ]
    for p in paths:
        try:
            load_dotenv(p, override=False)
        except Exception:
            pass
_load_envs()

# Initialize SQLite database
try:
    init_db()
    # Initialize default users on startup
    from models import SessionLocal
    db_session = SessionLocal()
    init_default_users(db_session)
    db_session.close()
except Exception as e:
    print(f"[ERROR] Database initialization skipped: {str(e)}")

# MongoDB connection (optional)
try:
    mongo_url = os.environ.get('MONGO_URL')
    if mongo_url:
        client = AsyncIOMotorClient(mongo_url)
        db = client[os.environ.get('DB_NAME', 'jackma_db')]
    else:
        db = None
        client = None
except Exception as e:
    print(f"[WARNING] MongoDB connection skipped: {str(e)}")
    db = None
    client = None

# Lifespan context manager for startup/shutdown events
from contextlib import asynccontextmanager

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup
    logger.info("Server starting up...")
    yield
    # Shutdown
    if client:
        client.close()
        logger.info("MongoDB connection closed")
    logger.info("Server shutdown complete")

# Create the main app with lifespan
app = FastAPI(
    title="OSINT Tracker API",
    description="Comprehensive OSINT data gathering platform",
    version="1.0.0",
    lifespan=lifespan
)

# Create a router with the /api prefix
api_router = APIRouter(prefix="/api")

# CORS middleware is configured at the end of the file


# Define Models
class StatusCheck(BaseModel):
    model_config = ConfigDict(extra="ignore")
    
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    client_name: str
    timestamp: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class StatusCheckCreate(BaseModel):
    client_name: str

# ==================== Authentication Models ====================
class LoginRequest(BaseModel):
    username: str
    password: str

class LoginResponse(BaseModel):
    success: bool
    user_id: Optional[int] = None
    username: Optional[str] = None
    is_admin: Optional[bool] = None
    points: Optional[int] = None
    session_token: Optional[str] = None
    expires_at: Optional[str] = None
    message: str

class VerifySessionRequest(BaseModel):
    session_token: str

class VerifySessionResponse(BaseModel):
    valid: bool
    user_id: Optional[int] = None
    username: Optional[str] = None
    is_admin: Optional[bool] = None
    points: Optional[int] = None
    message: str

class LogoutRequest(BaseModel):
    session_token: str

class UserInfoResponse(BaseModel):
    success: bool
    user_id: Optional[int] = None
    username: Optional[str] = None
    is_admin: Optional[bool] = None
    is_active: Optional[bool] = None
    email: Optional[str] = None
    points: Optional[int] = None
    created_at: Optional[str] = None
    message: Optional[str] = None

# ==================== Query Models ====================
class EmailQueryRequest(BaseModel):
    email: str
    timeout: int = 60
    session_token: Optional[str] = None

class PhoneQueryRequest(BaseModel):
    phone: str
    timeout: int = 60
    session_token: Optional[str] = None

class TelegramUsernameQueryRequest(BaseModel):
    username: str
    timeout: int = 30

# Add your routes to the router instead of directly to app
# ==================== Authentication Routes ====================

@api_router.get("/auth/test")
async def test_endpoint():
    """测试路由是否工作"""
    logger.info("🧪 TEST ENDPOINT CALLED!")
    return {"status": "ok", "message": "Test endpoint is working"}

@api_router.options("/auth/login")
async def login_options():
    """Handle OPTIONS request for login endpoint"""
    return {"message": "OK"}

@api_router.post("/auth/login", response_model=LoginResponse)
async def login(request: LoginRequest, db_session: Session = Depends(get_db)):
    """用户登录 - 验证用户名密码并返回会话token"""
    logger.info(f"🔐 Login API called")
    logger.info(f"🔐 Username: {request.username}")
    logger.info(f"🔐 Password length: {len(request.password)}")
    logger.info(f"🔐 Password (first 10 chars): {request.password[:10]}...")
    
    # 直接测试验证
    from auth_operations import verify_password, hash_password
    from models import User
    test_user = db_session.query(User).filter(User.username == request.username).first()
    if test_user:
        logger.info(f"🔐 User found in DB: ID={test_user.id}")
        logger.info(f"🔐 Stored hash: {test_user.password[:20]}...")
        logger.info(f"🔐 Input hash: {hash_password(request.password)[:20]}...")
        logger.info(f"🔐 Verify result: {verify_password(request.password, test_user.password)}")
    
    result = login_user(db_session, request.username, request.password)
    logger.info(f"🔐 Login result: success={result.get('success')}, message={result.get('message')}")
    return LoginResponse(**result)


@api_router.post("/auth/verify", response_model=VerifySessionResponse)
async def verify_session_endpoint(request: VerifySessionRequest, db_session: Session = Depends(get_db)):
    """验证会话token是否有效"""
    result = verify_session(db_session, request.session_token)
    return VerifySessionResponse(**result)


@api_router.post("/auth/logout")
async def logout(request: LogoutRequest, db_session: Session = Depends(get_db)):
    """用户登出 - 销毁会话"""
    result = logout_user(db_session, request.session_token)
    return result


@api_router.get("/auth/user/{user_id}", response_model=UserInfoResponse)
async def get_user(user_id: int, db_session: Session = Depends(get_db)):
    """获取用户信息"""
    result = get_user_info(db_session, user_id)
    return UserInfoResponse(**result)


@api_router.get("/health")
async def health_check():
    """健康检查端点"""
    return {
        "status": "healthy",
        "service": "osint-backend",
        "timestamp": datetime.now().isoformat()
    }

@api_router.get("/info")
async def api_info():
    return {
        "status": "success",
        "message": "FastAPI OSINT Email Investigation Service",
        "data": {
            "version": "1.0.0",
            "endpoints": [
                "/docs - API文档",
                "/health - 健康检查", 
                "/investigate - 单邮箱调查",
                "/investigate/batch - 批量调查"
            ]
        }
    }

@api_router.post("/status", response_model=StatusCheck)
async def create_status_check(input: StatusCheckCreate):
    status_dict = input.model_dump()
    status_obj = StatusCheck(**status_dict)
    
    # Convert to dict and serialize datetime to ISO string for MongoDB
    doc = status_obj.model_dump()
    doc['timestamp'] = doc['timestamp'].isoformat()
    
    _ = await db.status_checks.insert_one(doc)
    return status_obj

@api_router.get("/status", response_model=List[StatusCheck])
async def get_status_checks():
    # Exclude MongoDB's _id field from the query results
    if not db:
        return []
    status_checks = await db.status_checks.find({}, {"_id": 0}).to_list(1000)
    
    # Convert ISO string timestamps back to datetime objects
    for check in status_checks:
        if isinstance(check['timestamp'], str):
            check['timestamp'] = datetime.fromisoformat(check['timestamp'])
    
    return status_checks

@api_router.post("/email/query")
async def query_email(request: EmailQueryRequest, db_session: Session = Depends(get_db)):
    """
    Query email information using multiple OSINT APIs
    Saves results to SQLite database for history and caching
    Deducts points from user account if session_token provided
    """
    try:
        from models import User
        
        # 清理邮箱地址,去除前后空格
        email = request.email.strip()
        
        # 验证会话并获取用户信息
        user_info = None
        query_cost = 1  # 改为1积分
        if request.session_token:
            session_result = verify_session(db_session, request.session_token)
            if session_result.get('valid') and session_result.get('user_id'):
                user_info = db_session.query(User).filter(User.id == session_result['user_id']).first()
                
                # 检查积分是否足够（查询消耗1积分）
                if user_info and user_info.points < query_cost:
                    return {
                        "success": False,
                        "error": f"Insufficient points. Required: {query_cost}, Available: {user_info.points}"
                    }
        
        # Check cache first
        cache_key = f"email_{email}"
        cached_result = get_cache(db_session, cache_key, "email")
        if cached_result:
            logger.info(f"✅ Cache hit for email: {email}")
            # 即使缓存命中也要扣费（如果有有效用户且不是管理员）
            if user_info and should_deduct_points(user_info):
                user_info.points = max(0, user_info.points - query_cost)
                db_session.commit()
                logger.info(f"✅ Points deducted from cache: {email} by user {user_info.username} (-{query_cost}, remaining: {user_info.points})")
            elif user_info and user_info.is_admin:
                logger.info(f"✅ Admin user {user_info.username} queried email (no points deducted - unlimited)")
            return cached_result
        
        # Query comprehensive email data
        logger.info(f"🔍 Querying email: {email}")
        
        if HAS_EXTERNAL_APIS:
            result = await query_email_comprehensive(email)
            result_dict = result.model_dump() if hasattr(result, 'model_dump') else result
        else:
            result_dict = {"success": True, "email": email, "data": "Mock data"}
        
        # Save to database
        success = result_dict.get('success', False)
        error_msg = result_dict.get('error', None)
        
        save_email_query(
            db=db_session,
            email=email,
            result=result_dict,
            success=success,
            error=error_msg
        )
        
        # Cache the result
        save_cache(
            db=db_session,
            query=email,
            query_type="email",
            result_data=result_dict
        )
        
        # Log search with user_id
        if user_info:
            search_log = SearchHistory(
                query=email,
                query_type="email",
                user_id=user_info.id,
                results_count=1
            )
            db_session.add(search_log)
            db_session.commit()
        else:
            log_search(db_session, request.email, "email", 1)
        
        # 扣除积分（仅在查询成功且有效用户时，且非缓存命中，且不是管理员）
        if user_info and success and should_deduct_points(user_info):
            # 这里 query_cost 已经在前面定义过了
            user_info.points = max(0, user_info.points - query_cost)
            db_session.commit()
            
            # 创建积分交易记录
            from db_operations import create_points_transaction
            create_points_transaction(
                db=db_session,
                user_id=user_info.id,
                amount=-query_cost,
                transaction_type="consumption",
                reason=f"Email search query: {email}",
                operator_id=None
            )
            
            logger.info(f"✅ Points deducted: {request.email} by user {user_info.username} (-{query_cost}, remaining: {user_info.points})")
        elif user_info and success and user_info.is_admin:
            logger.info(f"✅ Admin user {user_info.username} queried email (no points deducted - unlimited)")
        
        logger.info(f"✅ Email query completed for: {request.email}")
        return result_dict
    except Exception as e:
        logger.error(f"❌ Error querying email {request.email}: {str(e)}")
        error_result = {
            "success": False,
            "email": request.email,
            "error": f"Internal error: {str(e)}"
        }
        save_email_query(
            db=db_session,
            email=request.email,
            result={},
            success=False,
            error=str(e)
        )
        return error_result


# ==================== 管理员积分系统 ====================

def should_deduct_points(user_info) -> bool:
    """检查是否应该扣除积分（管理员无限积分）"""
    if user_info is None:
        return False
    if user_info.is_admin:
        return False  # 管理员无限积分，不扣费
    return True


def get_user_points_display(user_info) -> str:
    """获取用户积分显示（管理员显示∞）"""
    if user_info is None:
        return "0"
    if user_info.is_admin:
        return "∞ (无限积分)"
    return str(user_info.points)


# ==================== Email Detail Search ====================

@api_router.get("/email/search")
async def email_search(email: str = Query(..., description="邮箱地址"), db_session: Session = Depends(get_db)):
    """
    结构化邮箱查询端点
    
    返回格式化的详细邮箱信息，类似于印尼号码查询的结构
    """
    try:
        logger.info(f"📧 结构化邮箱查询: {email}")
        
        # 验证邮箱格式
        if "@" not in email or "." not in email.split("@")[-1]:
            return {
                "success": False,
                "error": "Invalid email format",
                "email": email
            }
        
        # 检查缓存
        cache_key = f"email_detailed_{email}"
        cached_result = get_cache(db_session, cache_key, "email")
        if cached_result:
            logger.info(f"✅ 邮箱详细查询缓存命中: {email}")
            return cached_result
        
        # 调用综合邮箱查询
        if HAS_EXTERNAL_APIS:
            from apis import query_email_comprehensive
            raw_result = await query_email_comprehensive(email)
            raw_data = raw_result.model_dump() if hasattr(raw_result, 'model_dump') else raw_result
        else:
            raw_data = {"success": True, "email": email, "data": "Mock email data"}
        
        # 格式化邮箱查询结果
        formatted_result = {
            "success": raw_data.get("success", False),
            "email": email,
            "query_id": f"email_{email.replace('@', '_').replace('.', '_')}",
            
            # 基本信息
            "identity": {
                "email": email,
                "domain": email.split("@")[-1],
                "username": email.split("@")[0],
                "email_type": _detect_email_type(email),
                "is_disposable": _is_disposable_email(email),
                "created_date": None,  # 待 API 提供
                "status": "active"  # 默认状态
            },
            
            # 泄露信息
            "breach_data": {
                "total_breaches": 0,
                "breach_count": 0,
                "compromised_sites": [],
                "latest_breach": None,
                "sensitive_breaches": [],
                "verified_breaches": []
            },
            
            # 服务关联
            "services": {
                "google_services": _check_google_services(email),
                "microsoft_services": _check_microsoft_services(email),
                "social_platforms": [],
                "business_services": [],
                "shopping_sites": []
            },
            
            # 技术信息
            "technical": {
                "mx_records": [],
                "domain_info": _get_domain_info(email),
                "security_features": [],
                "email_reputation": "unknown"
            },
            
            # 统计信息
            "statistics": {
                "query_sources": 0,
                "successful_queries": 0,
                "data_points_found": 0,
                "confidence_score": 0
            },
            
            # 原始数据
            "raw_data": raw_data
        }
        
        # 处理原始 API 数据并填充结构化结果
        if raw_data.get("success") and "data" in raw_data:
            api_data = raw_data["data"]
            
            # 处理 HIBP (Have I Been Pwned) 数据
            if isinstance(api_data, list):
                for item in api_data:
                    if isinstance(item, dict) and item.get("source") == "hibp":
                        hibp_data = item.get("data", {})
                        if hibp_data.get("success") and "breaches" in hibp_data:
                            breaches = hibp_data["breaches"]
                            formatted_result["breach_data"]["total_breaches"] = len(breaches)
                            formatted_result["breach_data"]["breach_count"] = len(breaches)
                            formatted_result["breach_data"]["compromised_sites"] = [
                                breach.get("Name", "Unknown") for breach in breaches
                            ]
                            if breaches:
                                # 找到最新的泄露
                                latest = max(breaches, key=lambda x: x.get("BreachDate", ""))
                                formatted_result["breach_data"]["latest_breach"] = {
                                    "name": latest.get("Name"),
                                    "date": latest.get("BreachDate"),
                                    "description": latest.get("Description", "")[:200]
                                }
            
            # 处理 OSINT Industries 数据
            elif isinstance(api_data, dict):
                # 更新统计信息
                formatted_result["statistics"]["query_sources"] = len([
                    item for item in api_data if isinstance(item, dict) and item.get("success")
                ])
        
        # 保存到缓存
        save_cache(
            db=db_session,
            query=email,
            query_type="email",
            result_data=formatted_result
        )
        
        # 保存查询记录
        save_email_query(
            db=db_session,
            email=email,
            result=formatted_result,
            success=formatted_result["success"]
        )
        
        logger.info(f"✅ 邮箱详细查询完成: {email}")
        return formatted_result
        
    except Exception as e:
        logger.error(f"❌ 邮箱详细查询错误 {email}: {str(e)}")
        return {
            "success": False,
            "error": str(e),
            "email": email
        }


def _detect_email_type(email: str) -> str:
    """检测邮箱类型"""
    domain = email.split("@")[-1].lower()
    
    if domain in ["gmail.com", "googlemail.com"]:
        return "Google"
    elif domain in ["outlook.com", "hotmail.com", "live.com", "msn.com"]:
        return "Microsoft"
    elif domain in ["yahoo.com", "yahoo.co.id", "ymail.com"]:
        return "Yahoo"
    elif domain in ["icloud.com", "me.com", "mac.com"]:
        return "Apple"
    else:
        return "Other"


def _is_disposable_email(email: str) -> bool:
    """检查是否为临时邮箱"""
    disposable_domains = [
        "10minutemail.com", "tempmail.org", "guerrillamail.com", 
        "mailinator.com", "throwaway.email"
    ]
    domain = email.split("@")[-1].lower()
    return domain in disposable_domains


def _check_google_services(email: str) -> dict:
    """检查 Google 服务关联"""
    return {
        "gmail": email.endswith("@gmail.com") or email.endswith("@googlemail.com"),
        "google_account": True if "gmail.com" in email else None,
        "youtube": None,  # 需要 API 检查
        "google_drive": None,  # 需要 API 检查
    }


def _check_microsoft_services(email: str) -> dict:
    """检查 Microsoft 服务关联"""
    ms_domains = ["outlook.com", "hotmail.com", "live.com", "msn.com"]
    domain = email.split("@")[-1].lower()
    
    return {
        "outlook": domain in ms_domains,
        "office365": None,  # 需要 API 检查
        "onedrive": None,   # 需要 API 检查
        "xbox": None        # 需要 API 检查
    }


def _get_domain_info(email: str) -> dict:
    """获取域名信息"""
    domain = email.split("@")[-1]
    
    return {
        "domain": domain,
        "is_business": not domain.lower() in [
            "gmail.com", "yahoo.com", "outlook.com", "hotmail.com", 
            "icloud.com", "protonmail.com"
        ],
        "domain_age": None,      # 需要域名 API
        "registrar": None,       # 需要域名 API  
        "country": None          # 需要域名 API
    }


@api_router.post("/phone/query")
async def query_phone(request: PhoneQueryRequest, db_session: Session = Depends(get_db)):
    """
    Query phone number information using multiple OSINT APIs
    Saves results to SQLite database for history and caching
    Deducts points from user account if session_token provided
    """
    try:
        from models import User
        
        # 清理手机号,去除前后空格
        phone = request.phone.strip()
        
        # 验证会话并获取用户信息
        user_info = None
        query_cost = 1  # 改为1积分
        if request.session_token:
            session_result = verify_session(db_session, request.session_token)
            if session_result.get('valid') and session_result.get('user_id'):
                user_info = db_session.query(User).filter(User.id == session_result['user_id']).first()
                
                # 管理员不需要检查积分（无限积分）
                if user_info and not user_info.is_admin:
                    # 检查积分是否足够（查询消耗1积分）
                    if user_info.points < query_cost:
                        return {
                            "success": False,
                            "error": f"Insufficient points. Required: {query_cost}, Available: {user_info.points}"
                        }
        
        # Check cache first
        cache_key = f"phone_{phone}"
        cached_result = get_cache(db_session, cache_key, "phone")
        if cached_result:
            logger.info(f"✅ Cache hit for phone: {phone}")
            # 即使缓存命中也要扣费（如果有有效用户且不是管理员）
            if user_info and should_deduct_points(user_info):
                user_info.points = max(0, user_info.points - query_cost)
                db_session.commit()
                logger.info(f"✅ Points deducted from cache: {phone} by user {user_info.username} (-{query_cost}, remaining: {user_info.points})")
            elif user_info and user_info.is_admin:
                logger.info(f"✅ Admin user {user_info.username} queried phone (no points deducted - unlimited)")
            return cached_result
        
        # Query comprehensive phone data (platform APIs)
        logger.info(f"🔍 Querying phone: {phone}")
        
        # 🇺🇸 检测美国号码并调用专用API
        try:
            from apis.us_profile_lookup import query_us_profile, is_us_phone
            if is_us_phone(phone):
                logger.info(f"🇺🇸 [US Profile] 检测到美国号码，调用专用API: {phone}")
                us_result = await query_us_profile(phone, timeout=120)
                
                if us_result.get("success") and us_result.get("data"):
                    logger.info(f"✅ [US Profile] 美国档案查询成功: {phone}")
                    # 直接返回美国API结果
                    result_dict = us_result
                    
                    # 同时调用平台APIs获取补充数据
                    if HAS_EXTERNAL_APIS:
                        try:
                            platform_result = await query_platform_apis(phone)
                            if hasattr(platform_result, 'data') and platform_result.data:
                                result_dict['platform_data'] = platform_result.data
                        except Exception as e:
                            logger.warning(f"⚠️ [US Profile] 平台API补充查询失败: {str(e)}")
                    
                    # 缓存结果
                    save_cache(
                        db=db_session,
                        query=phone,
                        query_type="phone",
                        result_data=result_dict
                    )
                    
                    # 扣费逻辑
                    if user_info and should_deduct_points(user_info):
                        user_info.points = max(0, user_info.points - query_cost)
                        db_session.commit()
                        logger.info(f"✅ Points deducted: {phone} by user {user_info.username} (-{query_cost}, remaining: {user_info.points})")
                    
                    logger.info(f"✅ US Profile query completed for: {phone}")
                    return result_dict
                else:
                    logger.warning(f"⚠️ [US Profile] 美国API返回空数据，继续使用通用查询: {phone}")
        except ImportError as e:
            logger.warning(f"⚠️ [US Profile] 无法导入美国API模块: {str(e)}")
        except Exception as e:
            logger.error(f"❌ [US Profile] 美国API查询出错: {str(e)}")
        
        # 非美国号码或美国API失败时，使用通用查询
        if HAS_EXTERNAL_APIS:
            result = await query_platform_apis(phone)
            result_dict = result.model_dump() if hasattr(result, 'model_dump') else result
        else:
            result_dict = {"success": True, "phone": phone, "data": "Mock data"}
        
        # 🔥 调用 47.253.238.111:8888 美国号码查询 API
        try:
            async with httpx.AsyncClient(timeout=60.0) as client:
                logger.info(f"🔍 调用美国号码查询 API (47.253.238.111:8888): {phone}")
                api_url = "http://47.253.238.111:8888/api/v1/lookup/profile"
                response = await client.post(
                    api_url,
                    json={"phone": phone},
                    headers={"Content-Type": "application/json"}
                )
                
                if response.status_code == 200:
                    comprehensive_result = response.json()
                    if comprehensive_result and comprehensive_result.get('success'):
                        # 将综合数据直接合并到结果中，用于档案展示
                        result_dict['comprehensive_data'] = comprehensive_result
                        
                        # 🔥 转换数据结构以适配前端 (将 user_profile 映射到前端期望的格式)
                        user_profile = comprehensive_result.get('user_profile', {})
                        if user_profile:
                            # 构造 basic_info
                            result_dict['basic_info'] = {
                                'name': user_profile.get('name', ''),
                                'phone': user_profile.get('phone', phone),
                                'address': user_profile.get('address_full', ''),
                                'city': user_profile.get('city', ''),
                                'state': user_profile.get('state', ''),
                                'country': user_profile.get('country', ''),
                                'postcode': user_profile.get('postcode', ''),
                                'gender': user_profile.get('gender_candidates', ''),
                                'age': user_profile.get('age_year', ''),
                                'birthday': user_profile.get('birthday_fields', ''),
                                'carrier': '',  # 从其他源获取
                                'countryCode': user_profile.get('country', '')
                            }
                            
                            # 构造 contact_info - 直接使用API返回的原始数据
                            emails_raw = user_profile.get('emails_all', '').split(' / ') if user_profile.get('emails_all') else []
                            phones_raw = user_profile.get('phones_all', '').split(' / ') if user_profile.get('phones_all') else []
                            
                            emails_cleaned = [e.strip() for e in emails_raw if e.strip()]
                            phones_cleaned = [p.strip() for p in phones_raw if p.strip()]
                            
                            logger.info(f"� 邮箱数量: {len(emails_cleaned)}个, 电话数量: {len(phones_cleaned)}个")
                            
                            result_dict['contact_info'] = {
                                'emails': emails_cleaned,
                                'phones': phones_cleaned,
                                'addresses': [user_profile.get('address_full', '')] if user_profile.get('address_full') else []
                            }
                            
                            # 构造 professional_info
                            result_dict['professional_info'] = {
                                'company': user_profile.get('company', ''),
                                'position': user_profile.get('position', ''),
                                'industry': user_profile.get('industry', ''),
                                'department': user_profile.get('department', '')
                            }
                            
                            # 构造 data_breaches
                            leak_sources = user_profile.get('leak_sources', '').split(' / ') if user_profile.get('leak_sources') else []
                            result_dict['data_breaches'] = {
                                'total_breaches': user_profile.get('sale_source_count', 0),
                                'sources': [s.strip() for s in leak_sources if s.strip()],
                                'details': comprehensive_result.get('acelogic_name_data', {}).get('raw_data', {}).get('data', {}).get('List', {})
                            }
                            
                            # 添加 summary
                            result_dict['summary'] = {
                                'email_count': len(emails_cleaned),
                                'phone_count': len(phones_cleaned),
                                'address_count': 1 if user_profile.get('address_full') else 0,
                                'breach_count': user_profile.get('sale_source_count', 0),
                                'income': user_profile.get('income', ''),
                                'house_price': user_profile.get('house_price', ''),
                                'credit_capacity': user_profile.get('credit_capacity', ''),
                                'ethnic_code': user_profile.get('ethnic_code', ''),
                                'timezone': user_profile.get('timezone', ''),
                                'latitude': user_profile.get('latitude', ''),
                                'longitude': user_profile.get('longitude', '')
                            }
                        
                        logger.info(f"✅ 综合查询 API 数据已添加并转换")
                    else:
                        logger.warning(f"⚠️ 综合查询 API 返回失败: {comprehensive_result.get('message', 'Unknown')}")
                else:
                    logger.warning(f"⚠️ 综合查询 API HTTP {response.status_code}")
        except Exception as e:
            logger.error(f"❌ 调用综合查询 API 时出错: {str(e)}")
        
        # 🔥 拆分 Data Breach 数组为独立的卡片（8000端口平台验证）
        if 'data' in result_dict and isinstance(result_dict['data'], list):
            expanded_data = []
            for item in result_dict['data']:
                source = item.get('source', '')
                # 检测到 Data Breach 且有数据数组
                if source == 'data_breach' and item.get('success') and 'data' in item:
                    breach_array = item.get('data', [])
                    if isinstance(breach_array, list) and len(breach_array) > 0:
                        logger.info(f"🔥 [Data Breach] 拆分 {len(breach_array)} 个数据库为独立卡片")
                        # 为每个数据库创建独立的平台对象
                        for db in breach_array:
                            expanded_data.append({
                                'success': True,
                                'source': 'data_breach',
                                'platform_name': db.get('database_name', 'Unknown Database'),
                                'data': db  # 单个数据库的详细信息
                            })
                    else:
                        # 空数组，不添加卡片
                        logger.info(f"🔥 [Data Breach] 没有泄露数据，跳过")
                else:
                    # 其他平台直接添加
                    expanded_data.append(item)
            result_dict['data'] = expanded_data
        
        # Save to database
        success = result_dict.get('success', False)
        error_msg = result_dict.get('error', None)
        
        save_phone_query(
            db=db_session,
            phone=phone,
            result=result_dict,
            success=success,
            error=error_msg
        )
        
        # Cache the result
        save_cache(
            db=db_session,
            query=phone,
            query_type="phone",
            result_data=result_dict
        )
        
        # Log search with user_id
        if user_info:
            from models import SearchHistory
            search_log = SearchHistory(
                query=phone,
                query_type="phone",
                user_id=user_info.id,
                results_count=1
            )
            db_session.add(search_log)
            db_session.commit()
        else:
            log_search(db_session, request.phone, "phone", 1)
        
        # 扣除积分（仅在查询成功且有效用户时，且非缓存命中，且不是管理员）
        if user_info and success and should_deduct_points(user_info):
            # 这里 query_cost 已经在前面定义过了
            user_info.points = max(0, user_info.points - query_cost)
            db_session.commit()
            
            # 创建积分交易记录
            from db_operations import create_points_transaction
            create_points_transaction(
                db=db_session,
                user_id=user_info.id,
                amount=-query_cost,
                transaction_type="consumption",
                reason=f"Phone search query: {phone}",
                operator_id=None
            )
            
            logger.info(f"✅ Points deducted: {request.phone} by user {user_info.username} (-{query_cost}, remaining: {user_info.points})")
        elif user_info and success and user_info.is_admin:
            logger.info(f"✅ Admin user {user_info.username} queried phone (no points deducted - unlimited)")
        
        logger.info(f"✅ Phone query completed for: {request.phone}")
        return result_dict
    except Exception as e:
        logger.error(f"❌ Error querying phone {request.phone}: {str(e)}")
        error_result = {
            "success": False,
            "phone": request.phone,
            "error": f"Internal error: {str(e)}"
        }
        save_phone_query(
            db=db_session,
            phone=request.phone,
            result={},
            success=False,
            error=str(e)
        )
        return error_result

# ==================== Google Reviews API ====================

@api_router.get("/google-reviews")
async def get_google_reviews(email: str):
    """
    根据 Gmail 邮箱获取 Google 足跡分析
    前端检测到 Gmail 后调用此接口
    """
    if not email or not email.lower().endswith('@gmail.com'):
        return {'success': False, 'error': '需要 Gmail 邮箱'}
    
    try:
        logger.info(f"🔍 [Google Reviews] Querying for: {email}")
        
        async with httpx.AsyncClient(timeout=httpx.Timeout(30.0)) as client:
            response = await client.get(
                f"http://47.253.47.192:8001/api/lookup-email-reviews?email={email}"
            )
            
            if response.status_code == 200:
                data = response.json()
                logger.info(f"✅ [Google Reviews] Found {len(data.get('reviews', []))} reviews")
                return {
                    'success': True,
                    'email': email,
                    **data
                }
            else:
                logger.warning(f"⚠️ [Google Reviews] API returned {response.status_code}")
                return {'success': False, 'error': f'API 返回 {response.status_code}'}
                
    except Exception as e:
        logger.error(f"❌ [Google Reviews] Error: {e}")
        return {'success': False, 'error': str(e)}

# ==================== Indonesia Phone Query ====================

@api_router.get("/id/search")
async def id_search(phone_number: str = Query(..., description="印尼电话号码")):
    """
    印尼手机号查询代理端点
    
    专门用于处理印尼号码的查询请求，返回格式化的详细信息
    """
    try:
        logger.info(f"🇮🇩 印尼号码查询: {phone_number}")
        
        # 调用新的印尼调查API
        try:
            from apis.indonesia_investigate_new import query_indonesia_investigate_new
            from apis.truecaller import query_truecaller
            
            # 并行调用印尼调查API和Truecaller API
            import asyncio
            raw_result, truecaller_result = await asyncio.gather(
                query_indonesia_investigate_new(phone_number, timeout=120),
                query_truecaller(phone_number, timeout=30),
                return_exceptions=True
            )
            
            # 处理异常情况
            if isinstance(raw_result, Exception):
                logger.error(f"❌ 印尼调查API异常: {str(raw_result)}")
                raw_result = {"success": False, "error": str(raw_result)}
            
            if isinstance(truecaller_result, Exception):
                logger.warning(f"⚠️ Truecaller API异常: {str(truecaller_result)}")
                truecaller_result = {"success": False, "error": str(truecaller_result)}
            
            logger.info(f"✅ 新印尼调查API调用成功: {phone_number}")
            logger.info(f"📞 Truecaller API调用{'成功' if truecaller_result.get('success') else '失败'}: {phone_number}")
            
            if not raw_result.get("success"):
                return raw_result
            
            # 提取和格式化详细信息
            data = raw_result.get("data", {})
            step1 = data.get("step1_phone_investigation", {})
            analysis = data.get("comprehensive_analysis", {})
            personal_info = step1.get("personal_info", {})
            
            # 提取Truecaller数据
            truecaller_data = None
            truecaller_name = None
            truecaller_carrier = None
            truecaller_location = None
            truecaller_avatar = None
            
            if truecaller_result.get("success") and truecaller_result.get("data"):
                truecaller_data = truecaller_result.get("data", {})
                # 提取Truecaller关键字段
                truecaller_name = truecaller_data.get("name")
                truecaller_carrier = truecaller_data.get("carrier") or truecaller_data.get("operator")
                truecaller_location = truecaller_data.get("location") or truecaller_data.get("city")
                truecaller_avatar = truecaller_data.get("avatar") or truecaller_data.get("image")
            
            # 格式化输出结构
            formatted_result = {
                "success": True,
                "phone_number": phone_number,
                "investigation_id": data.get("investigation_id"),
                
                # 唯一身份信息（优先使用Truecaller数据）
                "identity": {
                    "name": truecaller_name or (step1.get("names_found", [None])[0] if step1.get("names_found") else None),
                    "nickname": None,  # 从数据中未找到
                    "gender": _extract_from_set(personal_info.get("Gender", set())),
                    "birthday": _extract_from_set(personal_info.get("BDay", set())),
                    "first_name": None,  # 从数据中未找到
                    "last_name": None,  # 从数据中未找到
                    "document_id": _extract_from_set(personal_info.get("Passport", set())),
                    "address": truecaller_location or _extract_from_set(personal_info.get("Address", set())),
                    "provider": truecaller_carrier or _extract_from_set(personal_info.get("Provider", set())) or "TELKOMSEL",  # 优先使用Truecaller运营商
                    "avatar": truecaller_avatar or (step1.get("emails_found", [None])[0] if step1.get("emails_found") else None)
                },
                
                # 联系方式
                "contact": {
                    "phone": phone_number,
                    "email_count": len(step1.get("emails_found", [])),
                    "email_list": [
                        {
                            "email": email,
                            "is_primary": i == 0,
                            "type": "Gmail" if "gmail.com" in email.lower() else "Other"
                        }
                        for i, email in enumerate(step1.get("emails_found", []))
                    ]
                },
                
                # 统计信息
                "statistics": {
                    "databases": step1.get("databases", 0),
                    "records": step1.get("records", 0),
                    "passwords_found": analysis.get("statistics", {}).get("passwords_found", 0),
                    "breach_sources": step1.get("breach_sources", [])
                },
                
                # 风险评估
                "risk_assessment": analysis.get("risk_assessment", {}),
                
                # 地理信息（包含Truecaller位置）
                "geography": {
                    "city": truecaller_location,
                    "region": None,
                    "district": None,
                    "postal_code": None
                },
                
                # 社交信息（待扩展）
                "social": {
                    "facebook_id": None,
                    "ip_address": _extract_from_set(personal_info.get("IP", set())),
                    "active_services": None,
                    "maps_stats": "评审 0，照片 0，回答 0，评分 0"  # 默认值
                },
                
                # Truecaller数据
                "truecaller": {
                    "success": truecaller_result.get("success", False),
                    "name": truecaller_name,
                    "carrier": truecaller_carrier,
                    "location": truecaller_location,
                    "avatar": truecaller_avatar,
                    "spam_score": truecaller_data.get("spamScore") if truecaller_data else None,
                    "spam_type": truecaller_data.get("spamType") if truecaller_data else None,
                    "raw_data": truecaller_data
                },
                
                # 原始数据（调试用）
                "raw_data": raw_result
            }
            
            return formatted_result
            
        except ImportError:
            logger.warning("⚠️ 印尼调查API模块未找到，返回模拟数据")
            return {
                "success": True,
                "message": f"印尼号码查询: {phone_number}",
                "data": {
                    "phone": phone_number,
                    "country": "Indonesia",
                    "status": "查询完成"
                }
            }
    except Exception as e:
        logger.error(f"❌ 印尼号码查询错误 {phone_number}: {str(e)}")
        return {
            "success": False,
            "error": str(e),
            "phone_number": phone_number
        }


def _extract_from_set(data_set):
    """从集合中提取第一个非空值"""
    if isinstance(data_set, set) and data_set:
        return next(iter(data_set))
    elif isinstance(data_set, list) and data_set:
        return data_set[0]
    return None


# ==================== Telegram Username Query ====================

@api_router.get("/telegram/username/{username}")
async def query_telegram_username(username: str, timeout: int = 30):
    """按用户名查询 Telegram 信息（用于获取高清头像等）"""
    try:
        from apis import query_telegram_by_username
        result = await query_telegram_by_username(username, timeout=timeout)
        return result
    except Exception as e:
        logger.error(f"❌ Error querying Telegram username {username}: {str(e)}")
        return {"success": False, "username": username, "error": str(e)}

# ==================== Indonesia Standalone Data Proxy ====================
@api_router.get("/indonesia/data/{phone}")
async def indonesia_standalone_data(phone: str):
    """Proxy the standalone Indonesia data endpoint to avoid CORS issues.
    Example upstream: http://47.253.47.192:9999/data/{phone}
    Returns upstream JSON as-is with success flag.
    """
    try:
        target = f"http://47.253.47.192:9999/data/{phone}"
        async with httpx.AsyncClient(timeout=20) as client:
            resp = await client.get(target)
        try:
            data = resp.json()
        except Exception:
            data = {"status_code": resp.status_code, "text": resp.text[:400]}
        return {"success": resp.status_code == 200, "data": data, "source": "indonesia_standalone"}
    except Exception as e:
        logger.error(f"❌ Indonesia standalone data error {phone}: {str(e)}")
        return {"success": False, "error": str(e), "source": "indonesia_standalone"}




# ==================== Indonesia 9999 Formatted Profile Proxy ====================
@api_router.get("/indonesia/profile/formatted")
async def indonesia_profile_formatted_proxy(phone: str):
    """Proxy for the Indonesia 9999 formatted profile endpoint.
    Upstream: http://47.253.238.111:9999/api/profile?phone=6285786528303
    Returns formatted profile data with comprehensive person information.
    """
    try:
        # Import adapter from apis package
        from apis import query_indonesia_api_9999, format_indonesia_profile_9999

        logger.info(f"🇮🇩 [Indonesia 9999] Proxying formatted profile for {phone}")
        result = await query_indonesia_api_9999(phone)

        # 如果查询成功，格式化人物档案
        if result.get("success") and result.get("data"):
            # 格式化为统一的人物档案结构
            formatted_profile = format_indonesia_profile_9999(result["data"])
            
            # 返回包含原始数据和格式化档案的完整结果
            return {
                "success": True,
                "phone": phone,
                "profile": formatted_profile,  # 格式化的人物档案
                "raw_data": result.get("data"),  # 原始API数据
                "source": "indonesia_api_9999"
            }
        
        # 如果查询失败，返回错误信息
        return result
        
    except Exception as e:
        logger.error(f"❌ [Indonesia 9999] Proxy error for {phone}: {str(e)}")
        return {"success": False, "error": str(e), "source": "indonesia_api_9999"}


# ==================== Indonesia Social Media APIs ====================
@api_router.get("/indonesia/social/facebook")
async def indonesia_facebook_lookup(phone: str):
    """Facebook lookup via Caller ID API for Indonesia phone numbers."""
    try:
        from apis.caller_id import query_caller_id
        
        # 确保号码格式正确
        digits = ''.join(ch for ch in phone if ch.isdigit())
        if not digits.startswith('62'):
            digits = '62' + digits.lstrip('0')
        
        logger.info(f"📘 [Indonesia Facebook] 查询: {digits}")
        result = await query_caller_id(digits)
        return result
    except Exception as e:
        logger.error(f"❌ [Indonesia Facebook] 错误: {str(e)}")
        return {"success": False, "error": str(e), "source": "caller_id"}


@api_router.get("/indonesia/social/telegram")
async def indonesia_telegram_lookup(phone: str):
    """Telegram lookup for Indonesia phone numbers."""
    try:
        from apis.telegram_complete import query_telegram_complete
        
        # 确保号码格式正确
        digits = ''.join(ch for ch in phone if ch.isdigit())
        if not digits.startswith('62'):
            digits = '62' + digits.lstrip('0')
        
        logger.info(f"📱 [Indonesia Telegram] 查询: {digits}")
        result = await query_telegram_complete(digits)
        return result
    except Exception as e:
        logger.error(f"❌ [Indonesia Telegram] 错误: {str(e)}")
        return {"success": False, "error": str(e), "source": "telegram"}


@api_router.get("/indonesia/social/truecaller")
async def indonesia_truecaller_lookup(phone: str):
    """Truecaller lookup for Indonesia phone numbers."""
    try:
        from apis.truecaller import query_truecaller
        
        # 确保号码格式正确
        digits = ''.join(ch for ch in phone if ch.isdigit())
        if not digits.startswith('62'):
            digits = '62' + digits.lstrip('0')
        
        logger.info(f"📞 [Indonesia Truecaller] 查询: {digits}")
        result = await query_truecaller(digits)
        return result
    except Exception as e:
        logger.error(f"❌ [Indonesia Truecaller] 错误: {str(e)}")
        return {"success": False, "error": str(e), "source": "truecaller"}


@api_router.get("/indonesia/social/truecaller_acelogic")
async def indonesia_truecaller_acelogic_lookup(phone: str):
    """Truecaller Acelogic lookup for Indonesia phone numbers."""
    try:
        from apis.truecaller_acelogic import query_truecaller_acelogic
        
        # 确保号码格式正确
        digits = ''.join(ch for ch in phone if ch.isdigit())
        if not digits.startswith('62'):
            digits = '62' + digits.lstrip('0')
        
        logger.info(f"📞 [Indonesia Truecaller Acelogic] 查询: {digits}")
        result = await query_truecaller_acelogic(digits)
        return result
    except Exception as e:
        logger.error(f"❌ [Indonesia Truecaller Acelogic] 错误: {str(e)}")
        return {"success": False, "error": str(e), "source": "truecaller_acelogic"}


# ==================== 通用社交媒体 API (支持所有国家) ====================

@api_router.get("/social/instagram")
async def instagram_profile_lookup(username: str):
    """Instagram profile lookup by username."""
    try:
        from apis.instagram_api import query_instagram_profile
        
        username = username.lstrip('@').strip()
        if not username:
            return {"success": False, "error": "用户名不能为空", "source": "instagram"}
        
        logger.info(f"📸 [Instagram] 查询用户: {username}")
        result = await query_instagram_profile(username)
        return result
    except Exception as e:
        logger.error(f"❌ [Instagram] 错误: {str(e)}")
        return {"success": False, "error": str(e), "source": "instagram"}


@api_router.get("/social/snapchat")
async def snapchat_phone_lookup(phone: str):
    """Snapchat account lookup by phone number."""
    try:
        from apis.snapchat_checker import check_snapchat
        
        digits = ''.join(ch for ch in phone if ch.isdigit())
        if not digits:
            return {"success": False, "error": "电话号码不能为空", "source": "snapchat"}
        
        logger.info(f"👻 [Snapchat] 查询电话: {digits}")
        result = await check_snapchat(digits)
        return result
    except Exception as e:
        logger.error(f"❌ [Snapchat] 错误: {str(e)}")
        return {"success": False, "error": str(e), "source": "snapchat"}


@api_router.get("/social/telegram")
async def telegram_phone_lookup(phone: str):
    """Telegram lookup by phone number (universal, auto-detect country)."""
    try:
        from apis.telegram_complete import query_telegram_complete
        
        digits = ''.join(ch for ch in phone if ch.isdigit())
        
        # 智能检测国家代码
        if digits.startswith('1') and len(digits) >= 10:
            # 美国/加拿大号码，保持原样
            pass
        elif digits.startswith('62'):
            # 印尼号码，保持原样
            pass
        elif not any(digits.startswith(code) for code in ['1', '62', '86', '44', '81', '82']):
            # 未知国家，尝试添加美国代码
            if len(digits) == 10:
                digits = '1' + digits
        
        logger.info(f"📱 [Telegram Universal] 查询: {digits}")
        result = await query_telegram_complete(digits)
        return result
    except Exception as e:
        logger.error(f"❌ [Telegram Universal] 错误: {str(e)}")
        return {"success": False, "error": str(e), "source": "telegram"}


@api_router.get("/social/truecaller")
async def truecaller_phone_lookup(phone: str):
    """Truecaller lookup by phone number (universal)."""
    try:
        from apis.truecaller import query_truecaller
        
        digits = ''.join(ch for ch in phone if ch.isdigit())
        
        # 智能检测国家代码 - 不强制添加62
        if digits.startswith('1') and len(digits) >= 10:
            # 美国/加拿大号码
            pass
        elif digits.startswith('62'):
            # 印尼号码
            pass
        elif len(digits) == 10:
            # 可能是美国号码
            digits = '1' + digits
        
        logger.info(f"📞 [Truecaller Universal] 查询: {digits}")
        result = await query_truecaller(digits)
        return result
    except Exception as e:
        logger.error(f"❌ [Truecaller Universal] 错误: {str(e)}")
        return {"success": False, "error": str(e), "source": "truecaller"}


@api_router.get("/social/twitter")
async def twitter_user_lookup(username: str):
    """
    Twitter/X user details lookup via RapidAPI
    
    Args:
        username: Twitter username (with or without @)
        
    Returns:
        User profile including avatar, bio, followers, etc.
    """
    try:
        from apis.twitter_api import query_twitter_profile
        
        # Remove @ if present
        username = username.lstrip('@').strip()
        
        if not username:
            return {
                "success": False,
                "error": "用户名不能为空",
                "source": "twitter_api"
            }
        
        logger.info(f"🐦 [Twitter API] 查询用户: {username}")
        result = await query_twitter_profile(username)
        
        # 如果成功，提取关键信息
        if result.get("success") and result.get("data"):
            raw_data = result["data"]
            
            # 提取用户信息（根据 RapidAPI 返回的数据结构）
            user_data = raw_data.get("data", {}).get("user", {}).get("result", {})
            legacy = user_data.get("legacy", {})
            
            processed_data = {
                "success": True,
                "username": username,
                "screen_name": legacy.get("screen_name", username),
                "name": legacy.get("name"),
                "bio": legacy.get("description"),
                "avatar_url": legacy.get("profile_image_url_https", "").replace("_normal", "_400x400"),  # 获取高清头像
                "banner_url": legacy.get("profile_banner_url"),
                "followers_count": legacy.get("followers_count", 0),
                "following_count": legacy.get("friends_count", 0),
                "tweets_count": legacy.get("statuses_count", 0),
                "verified": user_data.get("is_blue_verified", False),
                "created_at": legacy.get("created_at"),
                "location": legacy.get("location"),
                "website": legacy.get("url"),
                "source": "twitter_api",
                "raw_data": raw_data  # 保留原始数据
            }
            
            return processed_data
        
        return result
        
    except Exception as e:
        logger.error(f"❌ [Twitter API] 错误: {str(e)}")
        return {
            "success": False,
            "error": str(e),
            "source": "twitter_api"
        }


# ==================== Logo Proxy Endpoint ====================

@api_router.get("/logo/{domain}")
async def get_logo(domain: str):
    """Fetch platform logo via same-origin proxy to display authentic brand icons.
    Tries Clearbit first, then falls back to /favicon.ico on the target domain.
    """
    try:
        dom = (domain or "").strip().lower()
        if dom.startswith("www."):
            dom = dom[4:]
        candidates = [
            # 1) Clearbit 品牌 Logo
            f"https://logo.clearbit.com/{dom}",
            # 2) 站点 favicon
            f"https://{dom}/favicon.ico",
            # 3) DuckDuckGo 图标服务（覆盖率更高）
            f"https://icons.duckduckgo.com/ip3/{dom}.ico",
        ]
        async with httpx.AsyncClient(timeout=5) as client:
            for url in candidates:
                try:
                    resp = await client.get(url)
                    if resp.status_code == 200 and resp.content:
                        media_type = resp.headers.get("Content-Type", "image/png")
                        return Response(content=resp.content, media_type=media_type)
                except Exception:
                    continue
        raise HTTPException(status_code=404, detail="Logo not found")
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Logo fetch error: {str(e)}")


@api_router.get("/avatar")
async def get_avatar(url: str):
    """Proxy external avatar images through same-origin to avoid CSP/CORS/ORB issues.
    Only http/https schemes are allowed.
    """
    try:
        if not url or not (url.startswith("http://") or url.startswith("https://")):
            raise HTTPException(status_code=400, detail="Invalid URL")
        blocked = {"https://cdn1.telesco.pe/file/chItKJW5J0TKqkeWWB55i4ph1xjQ_iBJFNb5_tHhrLYEv_nSm_Xbgd9WXYOitJXr_6AtFkHdCZGhqVpQ7zjelkdlYN_fRNK-LyH9zZ_hqUsOyYEOhUvOM7YGMF3qDGBbRvpjocDZiImxDLWiu4Nh2GwwMbjwKvrjPWwvUy8geGzVT97SyAEiMsg1gXMDhXKaWKcrcemlpW5rQy24gxHXIIy4USNmQalLrP_DZK6_SoicHI3grEA7W7xxzrI3BzqoVEF9bPJah0RXckM69orrDwTFksFcl_q3DZMHvTRlwHya-blSSCweKn17V6_mmFnHM0KYOIKj-hDnyok1gdHqpg.jpg"}
        if url.strip() in blocked:
            raise HTTPException(status_code=404, detail="Avatar blocked")
        async with httpx.AsyncClient(timeout=8, follow_redirects=True) as client:
            resp = await client.get(url)
            if resp.status_code == 200 and resp.content:
                media_type = resp.headers.get("Content-Type", "image/jpeg")
                return Response(content=resp.content, media_type=media_type)
        raise HTTPException(status_code=404, detail="Avatar not found")
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Avatar fetch error: {str(e)}")


@api_router.get("/google-email")
async def google_email_proxy(email: str):
    """Lightweight proxy for Google email lookup (CORS workaround)"""
    try:
        if not email or '@' not in email:
            raise HTTPException(status_code=400, detail="Invalid email")
        
        target_url = "http://47.253.47.192:8082/api/v1/email/lookup"
        async with httpx.AsyncClient(timeout=10.0) as client:
            resp = await client.get(target_url, params={"email": email})
            
            if resp.status_code == 200:
                return resp.json()
            else:
                raise HTTPException(status_code=resp.status_code, detail="API error")
                
    except httpx.TimeoutException:
        raise HTTPException(status_code=504, detail="Timeout")
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@api_router.post("/filter-financial")
async def filter_financial(request: Request):
    """代理金融过滤 API"""
    logger.info("🏦 [Financial Filter] Endpoint called!")
    try:
        body = await request.json()
        email = body.get('email')
        
        if not email:
            return {'success': False, 'error': '需要 email 参数'}
        
        logger.info(f"🏦 [Financial Filter] Querying for email={email}")
        
        async with httpx.AsyncClient(timeout=httpx.Timeout(30.0)) as client:
            response = await client.post(
                "http://47.253.47.192:8087/api/filter-financial",
                json={"email": email},
                headers={"Content-Type": "application/json"}
            )
            
            if response.status_code == 200:
                data = response.json()
                logger.info(f"✅ [Financial Filter] Success: {data.get('stats', {})}")
                return data  # 直接返回 API 响应
            else:
                logger.error(f"❌ [Financial Filter] API returned {response.status_code}")
                return {'success': False, 'error': f'API returned {response.status_code}'}
                
    except Exception as e:
        logger.error(f"❌ [Financial Filter] Error: {e}")
        return {'success': False, 'error': str(e)}

@api_router.get("/filter-financial-test")
async def filter_financial_test():
    """测试路由"""
    logger.info("🧪 [Financial Filter] Test endpoint called!")
    return {"status": "ok", "message": "Filter financial test endpoint is working"}

@api_router.get("/google-email-lookup")
async def google_email_lookup(email: str, type: str = None):
    """Proxy Google email lookup API to avoid CORS issues.
    Fetches Google avatar and location data from email.
    If type=reviews, fetches Google Maps reviews instead.
    """
    try:
        if not email or '@' not in email:
            raise HTTPException(status_code=400, detail="Invalid email")
        
        # 如果请求 reviews，调用 Google Maps Reviews API
        if type == 'reviews':
            logger.info(f"🔍 [Google Maps Reviews] Querying for: {email}")
            target_url = f"http://47.253.47.192:8001/api/lookup-email-reviews"
            # 增加超时到 90 秒，Google 足跡分析查询需要更长时间
            async with httpx.AsyncClient(timeout=httpx.Timeout(90.0, connect=10.0)) as client:
                resp = await client.get(target_url, params={"email": email})
                if resp.status_code == 200:
                    data = resp.json()
                    logger.info(f"✅ [Google Maps Reviews] Found {len(data.get('reviews', []))} reviews")
                    return {'success': True, **data}
                else:
                    return {'success': False, 'error': f'API returned {resp.status_code}'}
        
        # 默认：调用 Google Email Lookup API
        logger.info(f"🔍 [Google Email Lookup] Proxying request for {email}")
        target_url = f"http://47.253.47.192:8082/api/v1/email/lookup"
        async with httpx.AsyncClient(timeout=10.0) as client:
            resp = await client.get(target_url, params={"email": email})
            
            if resp.status_code == 200:
                data = resp.json()
                logger.info(f"✅ [Google Email Lookup] Success for {email}")
                return data
            else:
                logger.error(f"❌ [Google Email Lookup] API returned {resp.status_code}")
                raise HTTPException(status_code=resp.status_code, detail="Upstream API error")
                
    except httpx.TimeoutException:
        logger.error(f"⏱️ [Google Email Lookup] Timeout for {email}")
        raise HTTPException(status_code=504, detail="Request timeout")
    except Exception as e:
        logger.error(f"❌ [Google Email Lookup] Error: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Lookup error: {str(e)}")

# google-maps-reviews 已合并到 google-reviews 端点


# ==================== Admin Routes ====================

def verify_admin_session(session_token: str, db: Session) -> dict:
    """验证管理员会话"""
    result = verify_session(db, session_token)
    logger.info(f"🔍 verify_admin_session - Token: {session_token[:20]}...")
    logger.info(f"🔍 verify_session result: {result}")
    logger.info(f"🔍 valid: {result.get('valid')}, is_admin: {result.get('is_admin')}")
    
    if not result.get('valid'):
        logger.warning(f"⚠️ Session not valid")
        raise HTTPException(status_code=403, detail="Unauthorized: Admin access required")
    
    if not result.get('is_admin'):
        logger.warning(f"⚠️ User is not admin")
        raise HTTPException(status_code=403, detail="Unauthorized: Admin access required")
    
    logger.info(f"✅ Admin session verified successfully")
    return result


@api_router.get("/admin/stats")
async def get_admin_stats(
    session_token: Optional[str] = Query(None),
    x_session_token: Optional[str] = Header(None, alias="X-Session-Token"),
    db_session: Session = Depends(get_db)
):
    """获取管理员统计数据"""
    try:
        token = session_token or x_session_token
        if not token:
            raise HTTPException(status_code=401, detail="Session token required")
            
        verify_result = verify_admin_session(token, db_session)
        
        from db_operations import get_database_stats
        stats = get_database_stats(db_session)
        
        return {
            "success": True,
            "data": stats,
            "message": "Statistics retrieved successfully"
        }
    except HTTPException as e:
        raise e
    except Exception as e:
        logger.error(f"❌ Error fetching admin stats: {str(e)}")
        return {
            "success": False,
            "error": str(e),
            "message": "Failed to fetch statistics"
        }


@api_router.get("/admin/users")
async def get_admin_users(
    session_token: Optional[str] = Query(None),
    x_session_token: Optional[str] = Header(None, alias="X-Session-Token"),
    page: int = Query(1, ge=1, description="页码，从1开始"),
    page_size: int = Query(20, ge=1, le=100, description="每页记录数"),
    db_session: Session = Depends(get_db)
):
    """获取用户列表（分页）"""
    try:
        token = session_token or x_session_token
        if not token:
            raise HTTPException(status_code=401, detail="Session token required")
            
        verify_result = verify_admin_session(token, db_session)
        
        from db_operations import get_users_paginated
        result = get_users_paginated(db_session, page=page, page_size=page_size)
        
        user_list = []
        for user in result['users']:
            user_list.append({
                "id": user.id,
                "username": user.username,
                "email": getattr(user, 'email', None),
                "points": getattr(user, 'points', 0),
                "is_admin": user.is_admin,
                "is_active": user.is_active,
                "created_at": user.created_at.isoformat() if user.created_at else None,
            })
        
        return {
            "success": True,
            "data": user_list,
            "page": page,
            "page_size": page_size,
            "total": result['total'],
            "total_pages": result['total_pages'],
            "message": f"Retrieved {len(user_list)} users (page {page}/{result['total_pages']})"
        }
    except HTTPException as e:
        raise e
    except Exception as e:
        logger.error(f"❌ Error fetching users: {str(e)}")
        return {
            "success": False,
            "error": str(e),
            "message": "Failed to fetch users"
        }


class UpdateUserRequest(BaseModel):
    is_admin: Optional[bool] = None
    is_active: Optional[bool] = None
    points: Optional[int] = None


@api_router.patch("/admin/users/{user_id}")
async def update_admin_user(
    user_id: int,
    request: UpdateUserRequest,
    session_token: str = Query(...),
    db_session: Session = Depends(get_db)
):
    """更新用户信息"""
    try:
        verify_result = verify_admin_session(session_token, db_session)
        
        from db_operations import (
            get_user_by_id,
            update_user_admin_status,
            update_user_active_status,
            update_user_points
        )
        
        user = get_user_by_id(db_session, user_id)
        if not user:
            raise HTTPException(status_code=404, detail="User not found")
        
        # Prevent admin from disabling themselves
        if verify_result.get('user_id') == user_id and request.is_active == False:
            raise HTTPException(status_code=400, detail="Cannot disable your own account")
        
        if request.is_admin is not None:
            update_user_admin_status(db_session, user_id, request.is_admin)
        
        if request.is_active is not None:
            update_user_active_status(db_session, user_id, request.is_active)

        if request.points is not None:
            # 传递操作人ID以记录是谁进行的充值/扣费操作
            update_user_points(
                db_session, 
                user_id, 
                int(request.points),
                operator_id=verify_result.get('user_id'),
                reason="Admin manual adjustment"
            )
        
        return {
            "success": True,
            "message": "User updated successfully"
        }
    except HTTPException as e:
        raise e
    except Exception as e:
        logger.error(f"❌ Error updating user: {str(e)}")
        return {
            "success": False,
            "error": str(e),
            "message": "Failed to update user"
        }


@api_router.delete("/admin/users/{user_id}")
async def delete_admin_user(
    user_id: int,
    session_token: str = Query(...),
    db_session: Session = Depends(get_db)
):
    """删除用户"""
    try:
        verify_result = verify_admin_session(session_token, db_session)
        
        # Prevent admin from deleting themselves
        if verify_result.get('user_id') == user_id:
            raise HTTPException(status_code=400, detail="Cannot delete your own account")
        
        from db_operations import delete_user
        success = delete_user(db_session, user_id)
        
        if not success:
            raise HTTPException(status_code=404, detail="User not found")
        
        return {
            "success": True,
            "message": "User deleted successfully"
        }
    except HTTPException as e:
        raise e
    except Exception as e:
        logger.error(f"❌ Error deleting user: {str(e)}")
        return {
            "success": False,
            "error": str(e),
            "message": "Failed to delete user"
        }


# ==================== Points Management APIs ====================

@api_router.get("/admin/points/stats")
async def get_points_stats(
    session_token: Optional[str] = Query(None),
    x_session_token: Optional[str] = Header(None, alias="X-Session-Token"),
    db_session: Session = Depends(get_db)
):
    """获取积分统计数据"""
    try:
        token = session_token or x_session_token
        if not token:
            raise HTTPException(status_code=401, detail="Session token required")
            
        verify_admin_session(token, db_session)
        
        # 使用新的统计函数获取真实数据
        from db_operations import get_points_statistics
        stats = get_points_statistics(db_session)
        
        return {
            "success": True,
            "data": stats,
            "message": "Points statistics retrieved successfully"
        }
    except HTTPException as e:
        raise e
    except Exception as e:
        logger.error(f"❌ Error fetching points stats: {str(e)}")
        return {
            "success": False,
            "error": str(e),
            "message": "Failed to fetch points statistics"
        }


@api_router.get("/admin/points/transactions")
async def get_points_transactions_endpoint(
    session_token: Optional[str] = Query(None),
    x_session_token: Optional[str] = Header(None, alias="X-Session-Token"),
    limit: int = Query(20, ge=1, le=100),
    offset: int = Query(0, ge=0),
    db_session: Session = Depends(get_db)
):
    """获取积分交易记录（从 PointsTransaction 表）"""
    try:
        token = session_token or x_session_token
        if not token:
            raise HTTPException(status_code=401, detail="Session token required")
            
        verify_admin_session(token, db_session)

        # 使用新的交易记录函数
        from db_operations import get_points_transactions
        result = get_points_transactions(db_session, limit=limit, offset=offset)

        return {
            "success": True,
            "data": result["transactions"],
            "total": result["total"],
            "limit": result["limit"],
            "offset": result["offset"],
            "message": "Transactions retrieved successfully"
        }
    except HTTPException as e:
        raise e
    except Exception as e:
        logger.error(f"❌ Error fetching transactions: {str(e)}")
        return {
            "success": False,
            "error": str(e),
            "message": "Failed to fetch transactions"
        }


# ==================== Query Logs APIs ====================

@api_router.get("/admin/logs/queries")
async def get_query_logs(
    session_token: Optional[str] = Query(None),
    x_session_token: Optional[str] = Header(None, alias="X-Session-Token"),
    limit: int = Query(50, ge=1, le=200),
    offset: int = Query(0, ge=0),
    query_type: Optional[str] = Query(None),
    db_session: Session = Depends(get_db)
):
    """获取查询日志"""
    try:
        token = session_token or x_session_token
        if not token:
            raise HTTPException(status_code=401, detail="Session token required")
            
        verify_admin_session(token, db_session)
        
        from models import SearchHistory
        from sqlalchemy import desc
        
        # 构建查询
        query = db_session.query(SearchHistory)
        
        if query_type:
            query = query.filter(SearchHistory.query_type == query_type)
        
        # 获取总数
        total = query.count()
        
        # 应用分页和排序
        logs = query.order_by(desc(SearchHistory.created_at)).offset(offset).limit(limit).all()
        
        from models import User
        
        log_list = []
        for log in logs:
            # 获取用户名
            user = db_session.query(User).filter(User.id == log.user_id).first()
            username = user.username if user else "Unknown"
            
            log_list.append({
                "id": log.id,
                "username": username,
                "query_value": log.query or "N/A",
                "query_type": log.query_type or "unknown",
                "user_id": log.user_id,
                "created_at": log.created_at.isoformat() if log.created_at else None,
            })
        
        return {
            "success": True,
            "data": log_list,
            "total": total,
            "limit": limit,
            "offset": offset,
            "message": "Query logs retrieved successfully"
        }
    except HTTPException as e:
        raise e
    except Exception as e:
        logger.error(f"❌ Error fetching query logs: {str(e)}")
        return {
            "success": False,
            "error": str(e),
            "message": "Failed to fetch query logs"
        }


@api_router.get("/admin/logs/activities")
async def get_activity_logs(
    session_token: Optional[str] = Query(None),
    x_session_token: Optional[str] = Header(None, alias="X-Session-Token"),
    limit: int = Query(50, ge=1, le=200),
    offset: int = Query(0, ge=0),
    db_session: Session = Depends(get_db)
):
    """获取活动日志"""
    try:
        token = session_token or x_session_token
        if not token:
            raise HTTPException(status_code=401, detail="Session token required")
            
        verify_admin_session(token, db_session)
        
        from models import SearchHistory, User
        from sqlalchemy import desc
        
        # 获取最近的搜索活动
        searches = db_session.query(SearchHistory).order_by(desc(SearchHistory.created_at)).limit(limit).all()
        
        activities = []
        for search in searches:
            user = db_session.query(User).filter(User.id == search.user_id).first()
            username = user.username if user else "Unknown"
            
            activities.append({
                "id": search.id,
                "time": search.created_at.strftime("%Y-%m-%d %H:%M:%S") if search.created_at else "Unknown",
                "action": f"{username} queried {search.query_type}: {search.query}",
                "user": username,
                "user_id": search.user_id,
                "type": "query"
            })
        
        return {
            "success": True,
            "data": activities,
            "total": len(activities),
            "limit": limit,
            "offset": offset,
            "message": "Activity logs retrieved successfully"
        }
    except HTTPException as e:
        raise e
    except Exception as e:
        logger.error(f"❌ Error fetching activity logs: {str(e)}")
        return {
            "success": False,
            "error": str(e),
            "message": "Failed to fetch activity logs"
        }


# ==================== Admin Route Aliases (Compatibility) ====================

@api_router.get("/admin/database")
async def get_admin_database_alias(
    session_token: Optional[str] = Query(None),
    x_session_token: Optional[str] = Header(None, alias="X-Session-Token"),
    db_session: Session = Depends(get_db)
):
    """Alias for admin stats (database info) - Compatibility for older frontends"""
    token = session_token or x_session_token
    if not token:
        raise HTTPException(status_code=401, detail="Session token required")
    return await get_admin_stats(token, x_session_token=None, db_session=db_session)

@api_router.get("/admin/credits")
async def get_admin_credits_alias(
    session_token: Optional[str] = Query(None),
    x_session_token: Optional[str] = Header(None, alias="X-Session-Token"),
    db_session: Session = Depends(get_db)
):
    """Alias for points stats - Compatibility for older frontends"""
    token = session_token or x_session_token
    if not token:
        raise HTTPException(status_code=401, detail="Session token required")
    return await get_points_stats(token, db_session)

@api_router.get("/admin/logs")
async def get_admin_logs_alias(
    session_token: Optional[str] = Query(None),
    x_session_token: Optional[str] = Header(None, alias="X-Session-Token"),
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    db_session: Session = Depends(get_db)
):
    """Alias for query logs - Compatibility for older frontends"""
    token = session_token or x_session_token
    if not token:
        raise HTTPException(status_code=401, detail="Session token required")
    return await get_query_logs(token, limit=page_size, offset=(page-1)*page_size, db_session=db_session)


# ==================== API Keys Management ====================

@api_router.get("/admin/apikeys")
async def get_api_keys(
    session_token: Optional[str] = Query(None),
    x_session_token: Optional[str] = Header(None, alias="X-Session-Token"),
    db_session: Session = Depends(get_db)
):
    """获取API密钥列表"""
    try:
        token = session_token or x_session_token
        if not token:
            raise HTTPException(status_code=401, detail="Session token required")
            
        verify_admin_session(token, db_session)
        
        # 从配置文件读取API密钥（脱敏显示）
        from apis.config import (
            RAPIDAPI_KEY,
            OSINT_INDUSTRIES_API_KEY,
            IPQS_API_KEY,
            # WHATSAPP_API_KEY,  # 已删除
            HIBP_API_KEY,
            TRUECALLER_RAPIDAPI_KEY,
            CALLER_ID_RAPIDAPI_KEY
        )
        
        def mask_key(key: str) -> str:
            """脱敏显示密钥"""
            if not key or len(key) < 8:
                return "Not configured"
            return f"{key[:8]}...{key[-4:]}"
        
        api_keys = [
            {
                "id": 1,
                "name": "OSINT Industries",
                "key": mask_key(OSINT_INDUSTRIES_API_KEY),
                "status": "active" if OSINT_INDUSTRIES_API_KEY and len(OSINT_INDUSTRIES_API_KEY) > 10 else "inactive",
                "usage": "Email queries",
                "last_used": "2024-01-15 10:30:00"
            },
            {
                "id": 2,
                "name": "RapidAPI (General)",
                "key": mask_key(RAPIDAPI_KEY),
                "status": "active" if RAPIDAPI_KEY and len(RAPIDAPI_KEY) > 10 else "inactive",
                "usage": "Multiple APIs",
                "last_used": "2024-01-15 10:25:00"
            },
            {
                "id": 3,
                "name": "IPQualityScore",
                "key": mask_key(IPQS_API_KEY),
                "status": "active" if IPQS_API_KEY and len(IPQS_API_KEY) > 10 else "inactive",
                "usage": "Phone validation",
                "last_used": "2024-01-15 10:20:00"
            },
            {
                "id": 4,
                "name": "Have I Been Pwned",
                "key": mask_key(HIBP_API_KEY),
                "status": "active" if HIBP_API_KEY and len(HIBP_API_KEY) > 10 else "inactive",
                "usage": "Breach detection",
                "last_used": "2024-01-15 10:10:00"
            },
        ]
        
        active_count = sum(1 for key in api_keys if key["status"] == "active")
        
        return {
            "success": True,
            "data": api_keys,
            "total": len(api_keys),
            "active": active_count,
            "inactive": len(api_keys) - active_count,
            "message": "API keys retrieved successfully"
        }
    except HTTPException as e:
        raise e
    except Exception as e:
        logger.error(f"❌ Error fetching API keys: {str(e)}")
        return {
            "success": False,
            "error": str(e),
            "message": "Failed to fetch API keys"
        }


@api_router.get("/admin/apikeys/usage")
async def get_api_usage(
    session_token: str = Query(...),
    days: int = Query(7, ge=1, le=90),
    db_session: Session = Depends(get_db)
):
    """获取API使用统计"""
    try:
        verify_admin_session(session_token, db_session)
        
        from models import APIUsageLog
        from sqlalchemy import func
        from datetime import datetime, timedelta
        
        # 计算日期范围
        end_date = datetime.utcnow()
        start_date = end_date - timedelta(days=days)
        
        # 查询API使用统计
        usage_stats = db_session.query(
            APIUsageLog.api_name,
            func.count(APIUsageLog.id).label('total_calls'),
            func.sum(func.cast(APIUsageLog.success, Integer)).label('successful_calls'),
            func.avg(APIUsageLog.response_time_ms).label('avg_response_time')
        ).filter(
            APIUsageLog.created_at >= start_date
        ).group_by(APIUsageLog.api_name).all()
        
        usage_list = []
        for stat in usage_stats:
            success_rate = (stat.successful_calls / stat.total_calls * 100) if stat.total_calls > 0 else 0
            usage_list.append({
                "api_name": stat.api_name,
                "total_calls": stat.total_calls,
                "successful_calls": stat.successful_calls or 0,
                "success_rate": round(success_rate, 2),
                "avg_response_time": round(stat.avg_response_time or 0, 2)
            })
        
        # 总计
        total_calls = sum(u["total_calls"] for u in usage_list)
        total_successful = sum(u["successful_calls"] for u in usage_list)
        
        return {
            "success": True,
            "data": usage_list,
            "summary": {
                "total_calls": total_calls,
                "successful_calls": total_successful,
                "success_rate": round((total_successful / total_calls * 100) if total_calls > 0 else 0, 2),
                "period_days": days
            },
            "message": "API usage statistics retrieved successfully"
        }
    except HTTPException as e:
        raise e
    except Exception as e:
        logger.error(f"❌ Error fetching API usage: {str(e)}")
        return {
            "success": False,
            "error": str(e),
            "message": "Failed to fetch API usage statistics"
        }


# 创建用户请求模型
class CreateUserRequest(BaseModel):
    username: str
    password: str
    is_admin: Optional[bool] = False
    email: Optional[str] = None
    points: Optional[int] = 0

@api_router.post("/auth/create-user")
async def create_user_endpoint(
    request: CreateUserRequest,
    session_token: Optional[str] = Query(None),
    db_session: Session = Depends(get_db)
    ):
    """创建新用户（兼容当前前端，无需token；如提供token则校验管理员）"""
    try:
        # 如果提供了session_token，则必须是管理员
        if session_token:
            verify_admin_session(session_token, db_session)

        result = create_user(
            db_session,
            request.username,
            request.password,
            request.is_admin or False,
            email=request.email,
            points=request.points or 0
        )
        if not result.get('success'):
            raise HTTPException(status_code=400, detail=result.get('message', 'Create user failed'))
        return result
    except HTTPException as e:
        raise e
    except Exception as e:
        logger.error(f"❌ Error creating user: {str(e)}")
        return {"success": False, "message": f"创建用户失败: {str(e)}"}


@api_router.get("/melissa/phone")
async def melissa_phone(phone: str = Query(...)):
    """
    Melissa GlobalPhone API endpoint
    调用 melissa_contact_verify 模块
    """
    try:
        from apis.melissa_contact_verify import query_melissa_contact_verify
        result = await query_melissa_contact_verify(phone)
        return result
    except Exception as e:
        logger.error(f"❌ [Melissa Phone] Error: {str(e)}")
        return {"success": False, "data": None, "error": str(e), "source": "melissa_globalphone"}

# Include the router in the main app
app.include_router(api_router)
app.include_router(linkedin_avatar_router)
app.include_router(logo_router)
app.include_router(google_router)
app.include_router(twitter_details_router)

# ==================== Person Summary (External Search) ====================
@app.get("/api/person/summary")
async def get_person_summary(phone: str, timeout: int = 30):
    """调用外部搜索服务并对返回的字段进行去重整合，输出个人信息摘要。"""
    try:
        result = await query_external_search(phone, timeout=timeout) if HAS_EXTERNAL_SEARCH else {"success": False, "error": "External search module not available"}
        if not result.get("success"):
            return {"success": False, "error": result.get("error", "Unknown error")}

        # external_search.py 返回 {"success": True, "data": {...}}
        # data 字段包含所有提取和整合的字段
        data = result.get("data") or {}
        
        # 计算数据源数量
        sources = data.get("sources", [])
        source_count = len(sources) if isinstance(sources, list) else 0
        
        # 如果没有sources字段，尝试从其他字段推断
        if source_count == 0:
            # 从total_sources或total_sources_checked获取
            source_count = data.get("total_sources") or data.get("total_sources_checked") or 0
        
        logger.info(f"📊 [PersonSummary] Extracted {len(data)} fields, {source_count} sources")
        
        return {
            "success": True,
            "phone": phone,
            "summary": data,  # data包含所有提取的字段
            "count": source_count,
            "raw": data,  # 保留完整数据
        }
    except Exception as e:
        logger.error(f"❌ [PersonSummary] Error: {str(e)}")
        return {"success": False, "error": str(e)}


# ==================== GPT-5 OSINT Data Analysis ====================
@app.post("/api/osint/gpt5-analyze")
async def analyze_osint_with_gpt5(
    results: List[Dict[str, Any]],
    query: str,
    main_person: Optional[str] = None
):
    """
    使用 GPT-5 分析 OSINT Industries 数据
    
    Args:
        results: OSINT Industries 返回的结果列表
        query: 查询的邮箱或电话
        main_person: 主要人物姓名（可选）
    
    Returns:
        AI 分析结果，包含提取的字段和摘要
    """
    try:
        from apis.gpt5_analyzer import analyze_osint_data_with_gpt5
        
        logger.info(f"🤖 [GPT-5 Analysis] Analyzing {len(results)} records for {query}")
        
        result = await analyze_osint_data_with_gpt5(results, query, main_person)
        
        if result.get("success"):
            logger.info(f"✅ [GPT-5 Analysis] Analysis completed successfully")
            return {
                "success": True,
                "query": query,
                "main_person": main_person,
                "analyzed_data": result.get("data"),
                "raw_response": result.get("raw_response")
            }
        else:
            logger.error(f"❌ [GPT-5 Analysis] Analysis failed: {result.get('error')}")
            return {
                "success": False,
                "error": result.get("error"),
                "raw_response": result.get("raw_response")
            }
    
    except Exception as e:
        logger.error(f"❌ [GPT-5 Analysis] Error: {str(e)}")
        return {
            "success": False,
            "error": str(e)
        }


# ==================== Celery Task Status ====================
@app.get("/api/tasks/status")
async def get_task_status_endpoint(task_id: str):
    try:
        from celery_tasks import get_task_status
        return get_task_status(task_id)
    except Exception as e:
        logger.error(f"❌ [Tasks] Failed to get status for {task_id}: {str(e)}")
        return {"success": False, "error": str(e), "task_id": task_id}


# ==================== ORPHANED CODE REMOVED ====================
# Removed approximately 366 lines of orphaned code
# that was not contained within any function definition.
#
# The removed code included:
# - Gmail avatar fetching logic
# - Truecaller API integration
# - Platform verification API aggregator
# - Data transformation for frontend
# - Response handling with exception catching
#
# All this functionality should be accessed via existing working endpoints.
# ===============================================================

# ==================== Google Email Avatar API ====================
class GoogleEmailRequest(BaseModel):
    email: str

@app.post("/api/google/avatar")
async def get_google_avatar(request: GoogleEmailRequest):
    """
    获取Google邮箱头像
    
    Args:
        email: Gmail邮箱地址
        
    Returns:
        Dict: Google账户信息包括头像URL
    """
    email = request.email.strip()
    
    # 验证是否为Gmail邮箱
    if not email.endswith('@gmail.com'):
        raise HTTPException(status_code=400, detail="只支持Gmail邮箱")
    
    logger.info(f"📧 [Google Avatar] Querying email: {email}")
    
    try:
        async with httpx.AsyncClient(timeout=30.0) as client:
            response = await client.post(
                "http://47.253.47.192:8002/api/email",
                json={"email": email},
                headers={"Content-Type": "application/json"}
            )
            
            if response.status_code == 200:
                data = response.json()
                logger.info(f"✅ [Google Avatar] Query successful for {email}")
                
                # 提取头像URL
                avatar_url = None
                try:
                    profile = data.get('PROFILE_CONTAINER', {}).get('profile', {})
                    profile_photos = profile.get('profilePhotos', {}).get('PROFILE', {})
                    avatar_url = profile_photos.get('url')
                    is_default = profile_photos.get('isDefault', True)
                    
                    person_id = profile.get('personId')
                    
                    logger.info(f"🖼️ [Google Avatar] Found avatar: {avatar_url}, isDefault: {is_default}")
                except Exception as e:
                    logger.warning(f"⚠️ [Google Avatar] Error extracting avatar: {str(e)}")
                
                return {
                    "success": True,
                    "email": email,
                    "avatar_url": avatar_url,
                    "is_default": is_default if avatar_url else True,
                    "person_id": person_id,
                    "raw_data": data
                }
            else:
                logger.error(f"❌ [Google Avatar] API returned status {response.status_code}")
                raise HTTPException(
                    status_code=response.status_code,
                    detail=f"Google API错误: {response.text}"
                )
        
    except httpx.TimeoutException:
        logger.error(f"⏱️ [Google Avatar] Timeout for email: {email}")
        raise HTTPException(status_code=504, detail="查询超时")
    except httpx.RequestError as e:
        logger.error(f"❌ [Google Avatar] Network error: {str(e)}")
        raise HTTPException(status_code=503, detail=f"网络错误: {str(e)}")
    except Exception as e:
        logger.error(f"❌ [Google Avatar] Error: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


# ==================== New Indonesia API Test ====================
@app.get("/api/indonesia/test")
async def test_new_indonesia_api(phone: str):
    """
    测试新的印尼号码API端点
    
    Args:
        phone: 印尼电话号码（如：6285786528303）
        
    Returns:
        Dict: 新印尼API的查询结果
    """
    try:
        from apis.indonesia_investigate_new import query_indonesia_investigate_new
        
        logger.info(f"🇮🇩 [Test New Indonesia API] Testing phone: {phone}")
        
        # 调用新的印尼API
        result = await query_indonesia_investigate_new(phone, timeout=120)
        
        logger.info(f"✅ [Test New Indonesia API] Query completed: {result.get('success', False)}")
        
        return {
            "success": True,
            "phone": phone,
            "api_result": result,
            "message": "新印尼API测试完成"
        }
        
    except Exception as e:
        logger.error(f"❌ [Test New Indonesia API] Error: {str(e)}")
        return {
            "success": False,
            "phone": phone,
            "error": str(e),
            "message": "新印尼API测试失败"
        }

# ==================== AI Analysis (ChatGPT) ====================
@app.get("/api/person/ai-analysis")
async def get_ai_analysis(phone: str, timeout: int = 120):
    """
    使用AI分析OSINT数据，提取主要人物资料
    
    流程:
    1. 调用外部搜索获取OSINT数据
    2. 使用ChatGPT API分析数据
    3. 提取结构化的人物档案
    """
    try:
        # 1. 获取OSINT数据
        logger.info(f"🔍 [AI Analysis] Step 1: Fetching OSINT data for {phone}")
        osint_result = await query_external_search(phone, timeout=60) if HAS_EXTERNAL_SEARCH else {"success": False, "error": "External search module not available"}
        
        if not osint_result.get("success"):
            return {
                "success": False,
                "error": f"Failed to fetch OSINT data: {osint_result.get('error', 'Unknown error')}"
            }
        
        osint_data = {
            "summary": osint_result.get("data", {})
        }
        
        # 2. 使用AI分析数据
        logger.info(f"🤖 [AI Analysis] Step 2: Analyzing data with ChatGPT")
        from apis.ai_analyzer import analyze_person_data, generate_person_summary
        
        ai_result = await analyze_person_data(osint_data)
        
        if not ai_result.get("success"):
            return {
                "success": False,
                "error": f"AI analysis failed: {ai_result.get('error', 'Unknown error')}",
                "osint_data": osint_data  # 返回原始数据以便调试
            }
        
        # 3. 生成简洁摘要
        person_profile = ai_result.get("person_profile", {})
        summary_text = await generate_person_summary(person_profile)
        
        logger.info(f"✅ [AI Analysis] Analysis completed successfully")
        
        return {
            "success": True,
            "phone": phone,
            "ai_analysis": ai_result.get("analysis"),  # AI的完整分析文本
            "person_profile": person_profile,  # 结构化的人物档案
            "summary": summary_text,  # 简洁的中文摘要
            "osint_data": osint_data,  # 原始OSINT数据
            "raw_response": ai_result.get("raw_response")  # ChatGPT原始响应
        }
        
    except Exception as e:
        logger.error(f"❌ [AI Analysis] Error: {str(e)}")
        return {
            "success": False,
            "error": str(e)
        }

# ==================== Security Headers: Content-Security-Policy ====================
# 为前端构建（React）统一添加 CSP，允许 Mapbox/Esri、data/blob 资源，以及 mapbox-gl 需要的 unsafe-eval 与 worker/blob。
@app.middleware("http")
async def add_csp_headers(request, call_next):
    response = await call_next(request)
    csp = "; ".join([
        "default-src 'self'",
        # Mapbox 样式与事件上报、Esri 影像、同源接口、Google头像API
        "connect-src 'self' http://localhost:* ws://localhost:* https://api.mapbox.com https://events.mapbox.com https://*.tiles.mapbox.com https://server.arcgisonline.com https://assets.emergent.sh https://unpkg.com https://d2adkz2s9zrlge.cloudfront.net http://47.253.47.192:8001 http://47.253.47.192:8082 http://47.253.47.192:8087 https://browserstack-frontend-extensions-assets-stag-euc1.s3.amazonaws.com",
        # 图片允许 data/blob 以及地图相关域、WhatsApp 头像、Facebook图片、LinkedIn头像、Twitter头像、Logo服务等
        "img-src 'self' data: blob: https://*.mapbox.com https://*.tiles.mapbox.com https://server.arcgisonline.com https://staticmap.openstreetmap.de https://cdn.simpleicons.org https://pps.whatsapp.net https://whatsapp-db.checkleaked.com https://avatars.githubusercontent.com https://graph.facebook.com https://*.fbcdn.net https://*.xx.fbcdn.net https://ui-avatars.com https://logo.clearbit.com https://icons.duckduckgo.com https://pbs.twimg.com https://unavatar.io https://abs.twimg.com https://*",
        # 样式允许行内（Tailwind/动态注入）以及 Mapbox CSS、Leaflet CSS
        "style-src 'self' 'unsafe-inline' https://api.mapbox.com https://fonts.googleapis.com https://cdn.jsdelivr.net https://unpkg.com",
        # 字体来源
        "font-src 'self' data: https://fonts.gstatic.com",
        # Mapbox GL 需要的 unsafe-eval（内部使用 new Function/worker bootstrap），谨慎开启
        "script-src 'self' 'unsafe-eval' 'unsafe-inline' blob: https://api.mapbox.com https://assets.emergent.sh https://unpkg.com https://d2adkz2s9zrlge.cloudfront.net https://cdn.jsdelivr.net",
        # 允许跨域 iframe 嵌入 Mapbox/OSM 预览 - 修复：添加所有Mapbox子域名
        "frame-src 'self' https://*.mapbox.com https://api.mapbox.com https://www.openstreetmap.org",
        # Web Worker 允许 blob:
        "worker-src 'self' blob:",
        # 媒体允许 data/blob
        "media-src 'self' data: blob:",
        # 禁用不必要对象资源
        "object-src 'none'",
    ])
    response.headers["Content-Security-Policy"] = csp
    # 其它安全头（可选）
    response.headers.setdefault("X-Content-Type-Options", "nosniff")
    response.headers.setdefault("X-Frame-Options", "SAMEORIGIN")
    response.headers.setdefault("Referrer-Policy", "strict-origin-when-cross-origin")
    return response

# CORS middleware - Allow all localhost ports for development
app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origin_regex=r"http://(localhost|127\.0\.0\.1|0\.0\.0\.0):\d+",
    allow_methods=["*"],
    allow_headers=["*"],
)

# Mount static files for production (frontend build)
FRONTEND_BUILD_DIR = ROOT_DIR.parent / "frontend" / "build"
logger.info(f"🔍 [Static Files] ROOT_DIR: {ROOT_DIR}")
logger.info(f"🔍 [Static Files] FRONTEND_BUILD_DIR: {FRONTEND_BUILD_DIR}")
logger.info(f"🔍 [Static Files] Directory exists: {FRONTEND_BUILD_DIR.exists()}")
if FRONTEND_BUILD_DIR.exists():
    static_dir = FRONTEND_BUILD_DIR / "static"
    logger.info(f"🔍 [Static Files] static directory: {static_dir}")
    logger.info(f"🔍 [Static Files] static exists: {static_dir.exists()}")
    # Mount static assets (JS, CSS, images, etc.)
    app.mount("/static", StaticFiles(directory=str(static_dir)), name="static")
    
    # Serve other static files (favicon, manifest, etc.)
    @app.get("/favicon.ico")
    async def favicon():
        from fastapi import Response
        favicon_path = FRONTEND_BUILD_DIR / "favicon.ico"
        if favicon_path.exists():
            return FileResponse(favicon_path)
        # 返回 204 No Content，避免控制台 404 噪音
        return Response(status_code=204)
    
    @app.get("/manifest.json")
    async def manifest():
        manifest_path = FRONTEND_BUILD_DIR / "manifest.json"
        if manifest_path.exists():
            return FileResponse(manifest_path)
        raise HTTPException(status_code=404)
    
    @app.get("/logo192.png")
    async def logo192():
        logo_path = FRONTEND_BUILD_DIR / "logo192.png"
        if logo_path.exists():
            return FileResponse(logo_path)
        raise HTTPException(status_code=404)
    
    @app.get("/logo512.png")
    async def logo512():
        logo_path = FRONTEND_BUILD_DIR / "logo512.png"
        if logo_path.exists():
            return FileResponse(logo_path)
        raise HTTPException(status_code=404)
    
    # Catch-all route for React Router (SPA support)
    # This must be the last route to avoid conflicts with API routes
    @app.get("/{full_path:path}")
    async def serve_react_app(full_path: str):
        """
        Serve the React app for all non-API routes.
        This enables client-side routing to work properly.
        """
        # Don't serve index.html for API routes
        if full_path.startswith("api/"):
            raise HTTPException(status_code=404)
        
        index_path = FRONTEND_BUILD_DIR / "index.html"
        if index_path.exists():
            return FileResponse(index_path)
        raise HTTPException(status_code=404, detail="Frontend build not found. Please run 'npm run build' in the frontend directory.")
    
    logger.info(f"✅ Serving frontend from: {FRONTEND_BUILD_DIR}")
else:
    logger.warning(f"⚠️ Frontend build directory not found at: {FRONTEND_BUILD_DIR}")
    logger.warning("⚠️ Please run 'yarn build' in the frontend directory to enable single-port deployment")

if __name__ == "__main__":
    import uvicorn
    logger.info("🚀 Starting OSINT API server...")
    uvicorn.run(
        "server:app",
        host="0.0.0.0",
        port=8000,
        reload=True,
        log_level="info"
    )

