"""
Database operations helper functions
"""
import json
import hashlib
from datetime import datetime, timedelta
from sqlalchemy.orm import Session
from models import (
    EmailQuery,
    PhoneQuery,
    SearchHistory,
    APIUsageLog,
    CachedResult,
)
from typing import Optional, Dict, Any
import logging

logger = logging.getLogger(__name__)


# ==================== Email Query Operations ====================

def save_email_query(db: Session, email: str, result: Dict[str, Any], success: bool = True, error: str = None):
    """保存或更新邮箱查询结果"""
    try:
        # 检查是否已存在
        existing = db.query(EmailQuery).filter(EmailQuery.email == email).first()
        
        if existing:
            # 更新现有记录
            existing.query_result = json.dumps(result)
            existing.success = success
            existing.error_message = error
            existing.updated_at = datetime.utcnow()
            db.commit()
            db.refresh(existing)
            logger.info(f"✅ Email query updated: {email}")
            return existing
        else:
            # 创建新记录
            db_query = EmailQuery(
                email=email,
                query_result=json.dumps(result),
                success=success,
                error_message=error
            )
            db.add(db_query)
            db.commit()
            db.refresh(db_query)
            logger.info(f"✅ Email query saved: {email}")
            return db_query
    except Exception as e:
        db.rollback()
        logger.error(f"❌ Error saving email query: {str(e)}")
        raise


def get_email_query(db: Session, email: str) -> Optional[EmailQuery]:
    """获取邮箱查询记录"""
    return db.query(EmailQuery).filter(EmailQuery.email == email).first()


def get_email_query_history(db: Session, limit: int = 10) -> list:
    """获取邮箱查询历史"""
    return db.query(EmailQuery).order_by(EmailQuery.created_at.desc()).limit(limit).all()


# ==================== Phone Query Operations ====================

def save_phone_query(db: Session, phone: str, result: Dict[str, Any], success: bool = True, error: str = None):
    """保存或更新手机号查询结果"""
    try:
        # 检查是否已存在
        existing = db.query(PhoneQuery).filter(PhoneQuery.phone == phone).first()
        
        if existing:
            # 更新现有记录
            existing.query_result = json.dumps(result)
            existing.success = success
            existing.error_message = error
            existing.updated_at = datetime.utcnow()
            db.commit()
            db.refresh(existing)
            logger.info(f"✅ Phone query updated: {phone}")
            return existing
        else:
            # 创建新记录
            db_query = PhoneQuery(
                phone=phone,
                query_result=json.dumps(result),
                success=success,
                error_message=error
            )
            db.add(db_query)
            db.commit()
            db.refresh(db_query)
            logger.info(f"✅ Phone query saved: {phone}")
            return db_query
    except Exception as e:
        db.rollback()
        logger.error(f"❌ Error saving phone query: {str(e)}")
        raise


def get_phone_query(db: Session, phone: str) -> Optional[PhoneQuery]:
    """获取手机号查询记录"""
    return db.query(PhoneQuery).filter(PhoneQuery.phone == phone).first()


def get_phone_query_history(db: Session, limit: int = 10) -> list:
    """获取手机号查询历史"""
    return db.query(PhoneQuery).order_by(PhoneQuery.created_at.desc()).limit(limit).all()


# ==================== Search History Operations ====================

def log_search(db: Session, query: str, query_type: str, results_count: int = 0):
    """记录搜索历史"""
    try:
        history = SearchHistory(
            query=query,
            query_type=query_type,
            results_count=results_count
        )
        db.add(history)
        db.commit()
        logger.info(f"✅ Search logged: {query_type} - {query}")
        return history
    except Exception as e:
        db.rollback()
        logger.error(f"❌ Error logging search: {str(e)}")


def get_search_history(db: Session, query_type: Optional[str] = None, limit: int = 50) -> list:
    """获取搜索历史"""
    query = db.query(SearchHistory)
    if query_type:
        query = query.filter(SearchHistory.query_type == query_type)
    return query.order_by(SearchHistory.created_at.desc()).limit(limit).all()


# ==================== API Usage Log Operations ====================

def log_api_call(
    db: Session,
    api_name: str,
    endpoint: str,
    status_code: int,
    response_time_ms: int,
    success: bool = True,
    error: str = None
):
    """记录 API 调用"""
    try:
        log = APIUsageLog(
            api_name=api_name,
            endpoint=endpoint,
            status_code=status_code,
            response_time_ms=response_time_ms,
            success=success,
            error_message=error
        )
        db.add(log)
        db.commit()
        logger.debug(f"✅ API call logged: {api_name} - {status_code}")
        return log
    except Exception as e:
        db.rollback()
        logger.error(f"❌ Error logging API call: {str(e)}")


def get_api_usage_stats(db: Session, api_name: str, hours: int = 24) -> Dict[str, Any]:
    """获取 API 使用统计"""
    time_threshold = datetime.utcnow() - timedelta(hours=hours)
    logs = db.query(APIUsageLog).filter(
        APIUsageLog.api_name == api_name,
        APIUsageLog.created_at >= time_threshold
    ).all()

    if not logs:
        return {
            "api_name": api_name,
            "total_calls": 0,
            "success_count": 0,
            "error_count": 0,
            "avg_response_time_ms": 0
        }

    total_calls = len(logs)
    success_count = sum(1 for log in logs if log.success)
    error_count = total_calls - success_count
    avg_response_time = sum(log.response_time_ms for log in logs) / total_calls

    return {
        "api_name": api_name,
        "total_calls": total_calls,
        "success_count": success_count,
        "error_count": error_count,
        "avg_response_time_ms": round(avg_response_time, 2),
        "success_rate": round((success_count / total_calls * 100), 2)
    }


# ==================== Cache Operations ====================

def generate_query_hash(query: str, query_type: str) -> str:
    """生成查询哈希值"""
    query_string = f"{query_type}:{query}"
    return hashlib.sha256(query_string.encode()).hexdigest()


def save_cache(db: Session, query: str, query_type: str, result_data: Dict[str, Any], ttl_hours: int = 24):
    """保存缓存结果"""
    try:
        query_hash = generate_query_hash(query, query_type)
        expires_at = datetime.utcnow() + timedelta(hours=ttl_hours)

        # 检查是否已存在
        existing = db.query(CachedResult).filter(CachedResult.query_hash == query_hash).first()
        if existing:
            existing.result_data = json.dumps(result_data)
            existing.expires_at = expires_at
            db.commit()
        else:
            cache = CachedResult(
                query_hash=query_hash,
                query_type=query_type,
                result_data=json.dumps(result_data),
                expires_at=expires_at
            )
            db.add(cache)
            db.commit()

        logger.info(f"✅ Cache saved: {query_type} - {query}")
    except Exception as e:
        db.rollback()
        logger.error(f"❌ Error saving cache: {str(e)}")


def get_cache(db: Session, query: str, query_type: str) -> Optional[Dict[str, Any]]:
    """获取缓存结果"""
    try:
        query_hash = generate_query_hash(query, query_type)
        cache = db.query(CachedResult).filter(
            CachedResult.query_hash == query_hash,
            CachedResult.expires_at > datetime.utcnow()
        ).first()

        if cache:
            logger.info(f"✅ Cache hit: {query_type} - {query}")
            return json.loads(cache.result_data)
        
        logger.info(f"❌ Cache miss or expired: {query_type} - {query}")
        return None
    except Exception as e:
        logger.error(f"❌ Error retrieving cache: {str(e)}")
        return None


def clear_expired_cache(db: Session):
    """清理过期缓存"""
    try:
        db.query(CachedResult).filter(CachedResult.expires_at <= datetime.utcnow()).delete()
        db.commit()
        logger.info("✅ Expired cache cleared")
    except Exception as e:
        db.rollback()
        logger.error(f"❌ Error clearing cache: {str(e)}")


# ==================== Statistics ====================

def get_database_stats(db: Session) -> Dict[str, Any]:
    """获取数据库统计信息"""
    from models import User, LoginSession
    import os
    
    # Get database file size
    db_file = os.path.join(os.path.dirname(__file__), 'osint_tracker.db')
    db_size = 0
    if os.path.exists(db_file):
        db_size = os.path.getsize(db_file) / (1024 * 1024)  # Convert to MB
    
    return {
        "total_email_queries": db.query(EmailQuery).count(),
        "total_phone_queries": db.query(PhoneQuery).count(),
        "total_searches": db.query(SearchHistory).count(),
        "total_api_calls": db.query(APIUsageLog).count(),
        "cached_results": db.query(CachedResult).filter(
            CachedResult.expires_at > datetime.utcnow()
        ).count(),
        "successful_email_queries": db.query(EmailQuery).filter(EmailQuery.success == True).count(),
        "successful_phone_queries": db.query(PhoneQuery).filter(PhoneQuery.success == True).count(),
        "total_users": db.query(User).count(),
        "active_sessions": db.query(LoginSession).filter(LoginSession.is_active == True).count(),
        "database_size_mb": round(db_size, 2),
    }


# ==================== User Management ====================

def get_all_users(db: Session) -> list:
    """获取所有用户列表"""
    from models import User
    return db.query(User).order_by(User.created_at.desc()).all()


def get_users_paginated(db: Session, page: int = 1, page_size: int = 20) -> dict:
    """获取分页的用户列表
    
    Args:
        db: 数据库会话
        page: 页码（从1开始）
        page_size: 每页记录数
    
    Returns:
        dict: 包含用户列表、总数、总页数等信息
    """
    from models import User
    import math
    
    # 计算偏移量
    offset = (page - 1) * page_size
    
    # 查询总数
    total = db.query(User).count()
    
    # 计算总页数
    total_pages = math.ceil(total / page_size) if total > 0 else 1
    
    # 查询分页数据
    users = db.query(User).order_by(User.created_at.desc()).offset(offset).limit(page_size).all()
    
    return {
        'users': users,
        'total': total,
        'page': page,
        'page_size': page_size,
        'total_pages': total_pages
    }


def get_user_by_id(db: Session, user_id: int):
    """按ID获取用户"""
    from models import User
    return db.query(User).filter(User.id == user_id).first()


def delete_user(db: Session, user_id: int) -> bool:
    """删除用户"""
    from models import User, LoginSession
    try:
        user = db.query(User).filter(User.id == user_id).first()
        if not user:
            return False
        
        # Delete associated sessions
        db.query(LoginSession).filter(LoginSession.user_id == user_id).delete()
        
        # Delete the user
        db.delete(user)
        db.commit()
        logger.info(f"✅ User deleted: {user.username} (ID: {user_id})")
        return True
    except Exception as e:
        db.rollback()
        logger.error(f"❌ Error deleting user: {str(e)}")
        raise


def update_user_admin_status(db: Session, user_id: int, is_admin: bool) -> bool:
    """更新用户管理员状态"""
    from models import User
    try:
        user = db.query(User).filter(User.id == user_id).first()
        if not user:
            return False
        
        user.is_admin = is_admin
        user.updated_at = datetime.utcnow()
        db.commit()
        logger.info(f"✅ User admin status updated: {user.username} -> is_admin={is_admin}")
        return True
    except Exception as e:
        db.rollback()
        logger.error(f"❌ Error updating user admin status: {str(e)}")
        raise


def update_user_active_status(db: Session, user_id: int, is_active: bool) -> bool:
    """更新用户活跃状态"""
    from models import User
    try:
        user = db.query(User).filter(User.id == user_id).first()
        if not user:
            return False
        
        user.is_active = is_active
        user.updated_at = datetime.utcnow()
        db.commit()
        logger.info(f"✅ User active status updated: {user.username} -> is_active={is_active}")
        return True
    except Exception as e:
        db.rollback()
        logger.error(f"❌ Error updating user active status: {str(e)}")
        raise


def update_user_points(db: Session, user_id: int, points: int, operator_id: int = None, reason: str = None) -> bool:
    """更新用户积分并创建交易记录
    
    Args:
        db: 数据库会话
        user_id: 用户ID
        points: 新的积分值
        operator_id: 操作人ID（管理员充值时使用）
        reason: 交易原因
    
    Returns:
        bool: 是否成功
    """
    from models import User
    try:
        user = db.query(User).filter(User.id == user_id).first()
        if not user:
            return False

        old_points = user.points
        new_points = int(points or 0)
        delta = new_points - old_points
        
        # 更新积分
        user.points = new_points
        user.updated_at = datetime.utcnow()
        db.commit()
        
        # 创建交易记录（如果有变动）
        if delta != 0:
            # 判断交易类型
            if delta > 0:
                transaction_type = "recharge"  # 充值
                if not reason:
                    reason = f"Admin recharge: +{delta} points"
            else:
                transaction_type = "deduction"  # 扣除
                if not reason:
                    reason = f"Admin deduction: {delta} points"
            
            create_points_transaction(
                db=db,
                user_id=user_id,
                amount=delta,
                transaction_type=transaction_type,
                reason=reason,
                operator_id=operator_id
            )
        
        logger.info(f"✅ User points updated: {user.username} -> points={user.points} (delta: {delta})")
        return True
    except Exception as e:
        db.rollback()
        logger.error(f"❌ Error updating user points: {str(e)}")
        raise


# ==================== Points Transaction Operations ====================

def create_points_transaction(
    db: Session,
    user_id: int,
    amount: int,
    transaction_type: str,
    reason: str = None,
    operator_id: int = None
) -> bool:
    """创建积分交易记录
    
    Args:
        db: 数据库会话
        user_id: 用户ID
        amount: 积分变动量（正数为增加，负数为减少）
        transaction_type: 交易类型 (recharge/consumption/reward/deduction)
        reason: 交易原因
        operator_id: 操作人ID（管理员操作时使用）
    
    Returns:
        bool: 是否成功
    """
    from models import User, PointsTransaction
    try:
        # 获取用户当前积分
        user = db.query(User).filter(User.id == user_id).first()
        if not user:
            logger.error(f"❌ User not found: {user_id}")
            return False
        
        balance_after = user.points
        
        # 创建交易记录
        transaction = PointsTransaction(
            user_id=user_id,
            amount=amount,
            transaction_type=transaction_type,
            reason=reason,
            operator_id=operator_id,
            balance_after=balance_after
        )
        db.add(transaction)
        db.commit()
        
        logger.info(f"✅ Points transaction created: user_id={user_id}, amount={amount}, type={transaction_type}")
        return True
    except Exception as e:
        db.rollback()
        logger.error(f"❌ Error creating points transaction: {str(e)}")
        return False


def get_points_statistics(db: Session) -> Dict[str, Any]:
    """获取积分统计数据
    
    Returns:
        dict: 包含各项统计数据
    """
    from models import PointsTransaction, User
    from sqlalchemy import func
    
    try:
        # 累计充值（管理员充值总额）
        total_recharge = db.query(func.sum(PointsTransaction.amount)).filter(
            PointsTransaction.transaction_type == 'recharge',
            PointsTransaction.amount > 0
        ).scalar() or 0
        
        # 累计查询消耗（用户查询消耗总额）
        total_consumption = db.query(func.sum(PointsTransaction.amount)).filter(
            PointsTransaction.transaction_type == 'consumption',
            PointsTransaction.amount < 0
        ).scalar() or 0
        total_consumption = abs(total_consumption)  # 转为正数显示
        
        # 今日查询消耗
        today_start = datetime.utcnow().replace(hour=0, minute=0, second=0, microsecond=0)
        today_consumption = db.query(func.sum(PointsTransaction.amount)).filter(
            PointsTransaction.transaction_type == 'consumption',
            PointsTransaction.amount < 0,
            PointsTransaction.created_at >= today_start
        ).scalar() or 0
        today_consumption = abs(today_consumption)
        
        # 累计奖励
        total_rewards = db.query(func.sum(PointsTransaction.amount)).filter(
            PointsTransaction.transaction_type == 'reward',
            PointsTransaction.amount > 0
        ).scalar() or 0
        
        # 当前总积分
        total_points = db.query(func.sum(User.points)).scalar() or 0
        
        # 平均积分
        avg_points = db.query(func.avg(User.points)).scalar() or 0
        
        # 有积分的用户数
        users_with_points = db.query(func.count(User.id)).filter(User.points > 0).scalar() or 0
        
        return {
            "total_recharge": int(total_recharge),
            "total_consumption": int(total_consumption),
            "today_consumption": int(today_consumption),
            "total_rewards": int(total_rewards),
            "total_points": int(total_points),
            "avg_points": round(float(avg_points), 2),
            "users_with_points": users_with_points
        }
    except Exception as e:
        logger.error(f"❌ Error getting points statistics: {str(e)}")
        return {
            "total_recharge": 0,
            "total_consumption": 0,
            "today_consumption": 0,
            "total_rewards": 0,
            "total_points": 0,
            "avg_points": 0,
            "users_with_points": 0
        }


def get_points_transactions(
    db: Session,
    limit: int = 20,
    offset: int = 0,
    user_id: int = None
) -> Dict[str, Any]:
    """获取积分交易记录（分页）
    
    Args:
        db: 数据库会话
        limit: 每页记录数
        offset: 偏移量
        user_id: 用户ID（可选，用于筛选特定用户）
    
    Returns:
        dict: 包含交易记录列表和总数
    """
    from models import PointsTransaction, User
    
    try:
        # 构建查询
        query = db.query(PointsTransaction)
        if user_id:
            query = query.filter(PointsTransaction.user_id == user_id)
        
        # 获取总数
        total = query.count()
        
        # 获取分页数据
        transactions = query.order_by(PointsTransaction.created_at.desc()).offset(offset).limit(limit).all()
        
        # 格式化数据
        result_list = []
        for trans in transactions:
            # 获取用户名
            user = db.query(User).filter(User.id == trans.user_id).first()
            username = user.username if user else "Unknown"
            
            # 获取操作人名称
            operator_name = "system"
            if trans.operator_id:
                operator = db.query(User).filter(User.id == trans.operator_id).first()
                operator_name = operator.username if operator else "Unknown"
            
            result_list.append({
                "id": trans.id,
                "time": trans.created_at.isoformat() if trans.created_at else None,
                "user": username,
                "user_id": trans.user_id,
                "delta": f"{'+' if trans.amount > 0 else ''}{trans.amount}",
                "type": trans.transaction_type,
                "reason": trans.reason or "",
                "balance": trans.balance_after,
                "operator": operator_name
            })
        
        return {
            "transactions": result_list,
            "total": total,
            "limit": limit,
            "offset": offset
        }
    except Exception as e:
        logger.error(f"❌ Error getting points transactions: {str(e)}")
        return {
            "transactions": [],
            "total": 0,
            "limit": limit,
            "offset": offset
        }


def get_search_logs_with_users(
    db: Session,
    limit: int = 50,
    offset: int = 0,
    query_type: str = None
) -> Dict[str, Any]:
    """获取带用户信息的搜索日志
    
    Args:
        db: 数据库会话
        limit: 每页记录数
        offset: 偏移量
        query_type: 查询类型（可选）
    
    Returns:
        dict: 包含搜索日志列表和总数
    """
    from models import SearchHistory, User
    
    try:
        # 构建查询
        query = db.query(SearchHistory)
        if query_type:
            query = query.filter(SearchHistory.query_type == query_type)
        
        # 获取总数
        total = query.count()
        
        # 获取分页数据
        logs = query.order_by(SearchHistory.created_at.desc()).offset(offset).limit(limit).all()
        
        # 格式化数据
        result_list = []
        for log in logs:
            # 获取用户名
            user = db.query(User).filter(User.id == log.user_id).first() if log.user_id else None
            username = user.username if user else "Unknown"
            
            result_list.append({
                "id": log.id,
                "time": log.created_at.strftime("%Y-%m-%d %H:%M:%S") if log.created_at else "Unknown",
                "username": username,
                "user_id": log.user_id,
                "query_value": log.query or "N/A",
                "query_type": log.query_type or "unknown",
                "results_count": log.results_count or 0
            })
        
        return {
            "logs": result_list,
            "total": total,
            "limit": limit,
            "offset": offset
        }
    except Exception as e:
        logger.error(f"❌ Error getting search logs: {str(e)}")
        return {
            "logs": [],
            "total": 0,
            "limit": limit,
            "offset": offset
        }
