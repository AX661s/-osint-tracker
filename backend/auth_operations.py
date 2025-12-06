"""
认证相关的数据库操作函数
"""
from sqlalchemy.orm import Session
from models import User, LoginSession
from datetime import datetime, timedelta, timezone
import uuid
import hashlib
import os
import logging

logger = logging.getLogger(__name__)

# 认证相关配置
SESSION_EXPIRY_HOURS = 24  # 会话有效期24小时
ADMIN_USERNAME = os.getenv('ADMIN_USERNAME', 'admin')
ADMIN_PASSWORD = os.getenv('ADMIN_PASSWORD', 'admin123')
DEFAULT_PASSWORD = os.getenv('DEFAULT_PASSWORD', 'password')


def hash_password(password: str) -> str:
    """哈希密码"""
    return hashlib.sha256(password.encode()).hexdigest()


def verify_password(plain_password: str, hashed_password: str) -> bool:
    """验证密码"""
    return hash_password(plain_password) == hashed_password


def create_session_token() -> str:
    """生成会话token"""
    return str(uuid.uuid4())


def init_default_users(db: Session):
    """初始化默认用户（仅在没有用户时调用）"""
    try:
        # 检查是否已有用户
        existing_user = db.query(User).first()
        if existing_user:
            return
        
        # 创建管理员账户
        admin_user = User(
            username=ADMIN_USERNAME,
            password=hash_password(ADMIN_PASSWORD),
            is_admin=True,
            is_active=True,
            email=None,
            points=0
        )
        db.add(admin_user)
        db.commit()
        logger.info(f"✅ 已创建默认管理员账户: {ADMIN_USERNAME}")
        
    except Exception as e:
        logger.error(f"❌ 创建默认用户失败: {str(e)}")
        db.rollback()


def login_user(db: Session, username: str, password: str, ip_address: str = None, user_agent: str = None) -> dict:
    """
    用户登录 - 验证用户名密码并创建会话
    返回: {'success': bool, 'user_id': int, 'username': str, 'is_admin': bool, 'session_token': str, 'message': str}
    """
    try:
        # 查找用户
        user = db.query(User).filter(User.username == username).first()
        
        if not user:
            return {
                'success': False,
                'message': f'用户 {username} 不存在'
            }
        
        if not user.is_active:
            return {
                'success': False,
                'message': '账户已被禁用'
            }
        
        # 验证密码
        password_matches = verify_password(password, user.password)
        logger.info(f"🔐 Password verification: username={username}, matches={password_matches}")
        
        if not password_matches:
            return {
                'success': False,
                'message': '密码错误'
            }
        
        # 创建会话
        session_token = create_session_token()
        expires_at = datetime.now(timezone.utc) + timedelta(hours=SESSION_EXPIRY_HOURS)
        
        session = LoginSession(
            user_id=user.id,
            username=user.username,
            session_token=session_token,
            is_admin=user.is_admin,
            ip_address=ip_address,
            user_agent=user_agent,
            expires_at=expires_at,
            is_active=True
        )
        db.add(session)
        db.commit()
        
        return {
            'success': True,
            'user_id': user.id,
            'username': user.username,
            'is_admin': user.is_admin,
            'points': user.points or 0,
            'session_token': session_token,
            'expires_at': expires_at.isoformat(),
            'message': f'登录成功，欢迎 {username}'
        }
        
    except Exception as e:
        db.rollback()
        return {
            'success': False,
            'message': f'登录失败: {str(e)}'
        }


def verify_session(db: Session, session_token: str) -> dict:
    """
    验证会话token
    返回: {'valid': bool, 'user_id': int, 'username': str, 'is_admin': bool, 'message': str}
    """
    try:
        # 查找会话
        session = db.query(LoginSession).filter(
            LoginSession.session_token == session_token,
            LoginSession.is_active == True
        ).first()
        
        if not session:
            return {
                'valid': False,
                'message': '会话不存在或已过期'
            }
        
        # 检查会话是否已过期 - 处理时区aware和naive datetime
        now = datetime.now(timezone.utc)
        expires_at = session.expires_at
        
        # 如果expires_at是naive datetime，添加UTC时区
        if expires_at.tzinfo is None:
            expires_at = expires_at.replace(tzinfo=timezone.utc)
        
        if now > expires_at:
            session.is_active = False
            db.commit()
            return {
                'valid': False,
                'message': '会话已过期'
            }
        
        # 获取用户信息以返回积分
        user = db.query(User).filter(User.id == session.user_id).first()
        
        return {
            'valid': True,
            'user_id': session.user_id,
            'username': session.username,
            'is_admin': session.is_admin,
            'points': user.points if user else 0,
            'message': '会话有效'
        }
        
    except Exception as e:
        return {
            'valid': False,
            'message': f'验证失败: {str(e)}'
        }


def logout_user(db: Session, session_token: str) -> dict:
    """
    用户登出 - 销毁会话
    """
    try:
        session = db.query(LoginSession).filter(
            LoginSession.session_token == session_token
        ).first()
        
        if session:
            session.is_active = False
            db.commit()
            return {
                'success': True,
                'message': '登出成功'
            }
        
        return {
            'success': False,
            'message': '会话不存在'
        }
        
    except Exception as e:
        db.rollback()
        return {
            'success': False,
            'message': f'登出失败: {str(e)}'
        }


def create_user(db: Session, username: str, password: str, is_admin: bool = False, email: str = None, points: int = 0) -> dict:
    """创建新用户"""
    try:
        # 检查用户是否已存在
        existing_user = db.query(User).filter(User.username == username).first()
        if existing_user:
            return {
                'success': False,
                'message': f'用户 {username} 已存在'
            }
        
        # 创建用户
        user = User(
            username=username,
            password=hash_password(password),
            is_admin=is_admin,
            is_active=True,
            email=email,
            points=points or 0
        )
        db.add(user)
        db.commit()
        db.refresh(user)
        
        return {
            'success': True,
            'user_id': user.id,
            'username': user.username,
            'is_admin': user.is_admin,
            'email': user.email,
            'points': user.points,
            'message': f'用户 {username} 创建成功'
        }
        
    except Exception as e:
        db.rollback()
        return {
            'success': False,
            'message': f'创建用户失败: {str(e)}'
        }


def get_user_info(db: Session, user_id: int) -> dict:
    """获取用户信息"""
    try:
        user = db.query(User).filter(User.id == user_id).first()
        
        if not user:
            return {
                'success': False,
                'message': '用户不存在'
            }
        
        return {
            'success': True,
            'user_id': user.id,
            'username': user.username,
            'is_admin': user.is_admin,
            'is_active': user.is_active,
            'email': getattr(user, 'email', None),
            'points': getattr(user, 'points', 0),
            'created_at': user.created_at.isoformat()
        }
        
    except Exception as e:
        return {
            'success': False,
            'message': f'获取用户信息失败: {str(e)}'
        }


def delete_expired_sessions(db: Session) -> int:
    """删除过期的会话 - 返回删除数量"""
    try:
        now = datetime.now(timezone.utc)
        deleted = db.query(LoginSession).filter(
            LoginSession.expires_at < now
        ).delete()
        db.commit()
        return deleted
    except Exception as e:
        db.rollback()
        logger.error(f"❌ 删除过期会话失败: {str(e)}")
        return 0
