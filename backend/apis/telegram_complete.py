"""
Telegram Complete API
完整的Telegram用户信息查询
返回: 用户详情、头像、用户名、最后上线时间等
"""
import httpx
import logging
from typing import Dict, Any
import os
from .config import DEFAULT_TIMEOUT

logger = logging.getLogger(__name__)


async def query_telegram_complete(phone: str, timeout: int = DEFAULT_TIMEOUT) -> Dict[str, Any]:
    """
    Telegram Complete: 完整的Telegram用户信息查询
    
    Args:
        phone: 电话号码
        timeout: 超时时间（秒）
        
    Returns:
        Dict包含:
        - success: bool - 查询是否成功
        - data: dict - 完整的Telegram用户信息
        - source: str - 数据来源标识
        - error: str - 错误信息（如果失败）
    """
    try:
        # 优先使用环境变量指定的端点，其次远程 8084
        url = os.getenv("TELEGRAM_PHONE_API_URL", "http://47.253.47.192:8084/query-phone")
        headers = {
            "Content-Type": "application/json"
        }
        # 发送纯数字的 phone_number 字段（不带+），兼容示例
        digits_only = ''.join(ch for ch in str(phone) if ch.isdigit())
        formatted_phone = phone if phone.startswith('+') else f'+{digits_only}'
        payload = {
            "phone_number": digits_only
        }
        
        logger.info(f"🔍 [Telegram Complete] 查询电话: {phone}")
        
        async with httpx.AsyncClient(timeout=timeout) as client:
            try:
                response = await client.post(url, headers=headers, json=payload)
            except Exception as conn_err:
                logger.warning(f"⚠️ [Telegram Complete] 主接口连接失败，回退远程: {conn_err}")
                url = "http://47.253.47.192:8086/api/check"
                payload = {"phone": formatted_phone}
                response = await client.post(url, headers=headers, json=payload)
            
            if response.status_code != 200:
                logger.warning(f"⚠️ [Telegram Complete] 主接口返回 {response.status_code}，回退远程")
                url = "http://47.253.47.192:8086/api/check"
                payload = {"phone": formatted_phone}
                response = await client.post(url, headers=headers, json=payload)

            if response.status_code == 200:
                data = response.json()

                # 兼容不同返回结构：优先取 data/result 字段，否则用顶层
                core = {}
                if isinstance(data, dict):
                    core = data.get('data') or data.get('result') or data

                # 判断是否找到账号：支持 telegram_found / found / exists / has_account，或出现典型用户字段
                found = (
                    (isinstance(core, dict) and (
                        core.get('telegram_found') or
                        core.get('found') or
                        core.get('exists') or
                        core.get('has_account') or
                        core.get('account_exists')
                    ))
                )
                if not isinstance(found, bool):
                    # 如果没有显式布尔值，根据是否存在用户信息字段进行推断
                    if isinstance(core, dict):
                        user_dict = core.get('user') or core.get('user_info') or core.get('telegram') or core.get('telegram_info') or core
                        # 同时考虑 profile_photo 中的用户名
                        prof = core.get('profile_photo') if isinstance(core, dict) else None
                        username_in_prof = isinstance(prof, dict) and prof.get('username')
                        found = any(k in user_dict for k in ['username', 'id', 'user_id', 'display_name', 'first_name', 'last_name']) or bool(username_in_prof)
                    else:
                        found = False

                if found:
                    # 尝试提取用户信息，支持多种字段命名
                    user_src = None
                    if isinstance(core, dict):
                        user_src = core.get('user') or core.get('user_info') or core.get('telegram') or core.get('telegram_info') or core
                    user_info = {
                        "user_id": (user_src or {}).get('user_id') or (user_src or {}).get('id'),
                        "username": (user_src or {}).get('username'),
                        "display_name": (user_src or {}).get('display_name') or (user_src or {}).get('name'),
                        "first_name": (user_src or {}).get('first_name'),
                        "last_name": (user_src or {}).get('last_name'),
                        "bio": (user_src or {}).get('bio') or (user_src or {}).get('about'),
                        "last_seen": (user_src or {}).get('last_seen'),
                        "status_type": (user_src or {}).get('status_type') or (user_src or {}).get('status'),
                        "verified": (user_src or {}).get('verified', False),
                        "premium": (user_src or {}).get('premium', False),
                        "avatar_url": (user_src or {}).get('avatar_url') or (user_src or {}).get('photo'),
                        "message_link": (user_src or {}).get('message_link') or (user_src or {}).get('link')
                    }

                    # 兼容 profile_photo 节点（例如 { profile_photo: { profile_image: ... } }）
                    try:
                        prof = None
                        if isinstance(core, dict):
                            prof = core.get('profile_photo') or core.get('photo')
                        if isinstance(prof, dict):
                            avatar_hd = prof.get('profile_image_hd') or prof.get('image_hd')
                            avatar_norm = prof.get('profile_image') or prof.get('image') or prof.get('profile_pic_url')
                            if not user_info.get('avatar_url_hd') and avatar_hd:
                                user_info['avatar_url_hd'] = avatar_hd
                            if not user_info.get('avatar_url') and (avatar_hd or avatar_norm):
                                user_info['avatar_url'] = avatar_hd or avatar_norm
                            # 若 display_name 缺失但 profile_photo 提供 name
                            if not user_info.get('display_name') and prof.get('name'):
                                user_info['display_name'] = prof.get('name')
                            # 若 message_link 缺失但提供 send_message_url
                            if not user_info.get('message_link') and prof.get('send_message_url'):
                                user_info['message_link'] = prof.get('send_message_url')
                    except Exception:
                        pass

                    # 如果找到用户名但没有头像，尝试通过 RapidAPI 获取高清头像
                    username = user_info.get('username')
                    if username and not user_info.get('avatar_url'):
                        try:
                            logger.info(f"🖼️ [Telegram Complete] 尝试通过用户名获取头像: {username}")
                            from .telegram_username import query_telegram_by_username
                            avatar_result = await query_telegram_by_username(username, timeout=10)
                            if avatar_result.get('success') and avatar_result.get('data'):
                                avatar_data = avatar_result['data'].get('user_info', {})
                                avatar_url_hd = avatar_data.get('avatar_url_hd')
                                avatar_url = avatar_data.get('avatar_url')
                                if avatar_url_hd or avatar_url:
                                    user_info['avatar_url_hd'] = avatar_url_hd
                                    user_info['avatar_url'] = avatar_url_hd or avatar_url
                                    logger.info(f"✅ [Telegram Complete] 成功获取头像")
                        except Exception as avatar_err:
                            logger.warning(f"⚠️ [Telegram Complete] 获取头像失败: {avatar_err}")

                    processed_data = {
                        "phone": formatted_phone,
                        "telegram_found": True,
                        "user_info": user_info,
                        "processing_time": (core if isinstance(core, dict) else {}).get('processing_time') or (data if isinstance(data, dict) else {}).get('processing_time')
                    }

                    logger.info(f"✅ [Telegram Complete] 查询成功 - 用户: {processed_data['user_info'].get('username')}")
                    return {
                        "success": True,
                        "data": processed_data,
                        "source": "telegram_complete"
                    }
                else:
                    message = None
                    if isinstance(core, dict):
                        message = core.get('message') or core.get('error') or (data if isinstance(data, dict) else {}).get('error') or (data if isinstance(data, dict) else {}).get('message')
                    logger.info(f"📱 [Telegram Complete] 未找到 Telegram 账户")
                    return {
                        "success": True,
                        "data": {
                            "phone": formatted_phone,
                            "telegram_found": False,
                            "message": message or "未找到关联的 Telegram 账户"
                        },
                        "source": "telegram_complete"
                    }
            else:
                error_msg = f"Status {response.status_code}: {response.text}"
                logger.warning(f"⚠️ [Telegram Complete] 错误: {error_msg}")
                return {
                    "success": False,
                    "error": error_msg,
                    "source": "telegram_complete"
                }
                
    except Exception as e:
        error_msg = str(e)
        logger.error(f"❌ [Telegram Complete] 异常: {error_msg}")
        return {
            "success": False,
            "error": error_msg,
            "source": "telegram_complete"
        }