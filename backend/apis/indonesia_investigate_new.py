"""
新的印尼号码深度调查API
调用新的高质量印尼号码查询端点
API端点: http://47.253.47.192:9999/search/{phone}
"""
import httpx
import logging
from typing import Dict, Any, Optional, List
from datetime import datetime

logger = logging.getLogger(__name__)

# 新的印尼调查API配置
INDONESIA_NEW_API_URL = "http://47.253.238.111:9999/api/profile"
DEFAULT_TIMEOUT = 120  # 2分钟超时


async def query_indonesia_investigate_new(phone: str, timeout: int = DEFAULT_TIMEOUT) -> Dict[str, Any]:
    """
    调用新的印尼号码深度调查API
    
    Args:
        phone: 电话号码（应为印尼号码，如 6285786528303）
        timeout: 请求超时时间（秒）
        
    Returns:
        Dict: 包含调查结果的字典
    """
    try:
        # 清理号码格式 - 移除 + 号和空格
        clean_phone = phone.replace("+", "").replace(" ", "").replace("-", "")
        
        # 检查是否为印尼号码（以62开头）
        if not clean_phone.startswith('62'):
            logger.info(f"⏭️ [Indonesia New API] 跳过非印尼号码: {phone}")
            return {
                "success": False,
                "data": None,
                "error": "Not an Indonesian phone number",
                "source": "indonesia_investigate_new",
                "skipped": True
            }
        
        logger.info(f"🇮🇩 [Indonesia New API] 开始查询印尼号码: {clean_phone}")
        
        # 构建查询参数 (确保带+)
        query_phone = f"+{clean_phone}"
        params = {
            "phone": query_phone,
            "country_code": "ID"
        }
        
        # 发送GET请求
        async with httpx.AsyncClient(timeout=timeout) as client:
            response = await client.get(INDONESIA_NEW_API_URL, params=params)
            
            # 检查响应状态
            if response.status_code != 200:
                error_msg = f"HTTP {response.status_code}: {response.text[:200]}"
                logger.error(f"❌ [Indonesia New API] API错误: {error_msg}")
                return {
                    "success": False,
                    "data": None,
                    "error": error_msg,
                    "source": "indonesia_investigate_new"
                }
            
            # 解析响应
            result = response.json()
            
            # 检查是否有数据
            if not result:
                logger.warning(f"⚠️ [Indonesia New API] 空响应")
                return {
                    "success": False,
                    "data": None,
                    "error": "Empty response",
                    "source": "indonesia_investigate_new"
                }
            
            # 解析新API的响应格式 (适配新结构)
            basic_info = result.get("basic_info", {})
            contact_info = result.get("contact_info", {})
            data_breaches = result.get("data_breaches", {})
            accounts = result.get("accounts", {})
            
            phone_number = basic_info.get("phone_primary", clean_phone)
            full_name = basic_info.get("name")
            
            # 提取邮箱列表
            emails_found = contact_info.get("emails", [])
            
            # 提取姓名列表
            names_found = basic_info.get("all_names", [])
            if full_name and full_name not in names_found:
                names_found.insert(0, full_name)
            
            # 提取地址
            addresses = contact_info.get("addresses", [])
            address = addresses[0] if addresses else None
            
            # 提取数据库泄露信息
            databases_found = data_breaches.get("databases", [])
            total_records = data_breaches.get("total_records", 0)
            
            # 提取社交媒体/账户信息
            social_accounts = {}
            if accounts.get("details"):
                for acc in accounts.get("details", []):
                    platform = acc.get("platform", "Unknown")
                    if platform not in social_accounts:
                        social_accounts[platform] = []
                    social_accounts[platform].append(acc)
            
            # 构建个人信息 (映射到旧结构以便兼容)
            personal_info = {
                "Phone": contact_info.get("phones", [phone_number]),
                "Email": emails_found,
                "FullName": [full_name] if full_name else [],
                "Address": addresses,
                "BirthDate": [basic_info.get("birthday")] if basic_info.get("birthday") else [],
                "Passport": basic_info.get("all_niks", []),
                "Country": [basic_info.get("country")] if basic_info.get("country") else []
            }
            
            logger.info(f"✅ [Indonesia New API] 查询完成: {len(emails_found)} 个邮箱, {len(databases_found)} 个数据库, {total_records} 条记录")
            
            # 格式化返回数据（兼容现有格式）
            return {
                "success": True,
                "data": {
                    "phone_number": phone_number,
                    "investigation_id": f"indonesia_new_{clean_phone}",
                    "message": f"印尼新API查询完成 - 电话号码: {phone_number}, 数据库: {len(databases_found)}个, 记录: {total_records}条",
                    "step1_phone_investigation": {
                        "phone_number": phone_number,
                        "emails_found": emails_found,
                        "names_found": names_found,
                        "personal_info": personal_info,
                        "passwords_found": [], # 新API暂未直接提供密码列表，需从details提取
                        "databases": len(databases_found),
                        "records": total_records,
                        "breach_sources": databases_found,
                        "investigation_time": datetime.now().isoformat(),
                        "api_config": {
                            "endpoint": INDONESIA_NEW_API_URL,
                            "api_version": "new_indonesia_api_v2"
                        }
                    },
                    "step2_social_media": social_accounts,
                    "step3_email_breach": {
                        "databases_found": databases_found,
                        "total_records": total_records
                    },
                    "comprehensive_analysis": {
                        "target_phone": phone_number,
                        "google_emails_found": [e for e in emails_found if "gmail.com" in e.lower()],
                        "total_emails_discovered": len(emails_found),
                        "names_found": names_found,
                        "personal_information": personal_info,
                        "social_media_accounts": social_accounts,
                        "statistics": {
                            "total_databases_affected": len(databases_found),
                            "total_records_found": total_records,
                            "breach_sources": databases_found
                        },
                        "risk_assessment": result.get("summary", {})
                    },
                    "raw_response": result
                },
                "source": "indonesia_investigate_new",
                "error": None
            }
            
    except httpx.TimeoutException:
        error_msg = f"请求超时（超过{timeout}秒）"
        logger.error(f"⏰ [Indonesia New API] {error_msg}")
        return {
            "success": False,
            "data": None,
            "error": error_msg,
            "source": "indonesia_investigate_new"
        }
        
    except httpx.RequestError as e:
        error_msg = f"网络请求失败: {str(e)}"
        logger.error(f"🌐 [Indonesia New API] {error_msg}")
        return {
            "success": False,
            "data": None,
            "error": error_msg,
            "source": "indonesia_investigate_new"
        }
        
    except Exception as e:
        error_msg = f"调查过程中发生错误: {str(e)}"
        logger.error(f"💥 [Indonesia New API] {error_msg}")
        logger.exception("Full exception details:")
        return {
            "success": False,
            "data": None,
            "error": error_msg,
            "source": "indonesia_investigate_new"
        }


# 辅助函数：检查是否为印尼号码
def is_indonesian_number(phone: str) -> bool:
    """
    检查是否为印尼号码
    
    Args:
        phone: 电话号码
        
    Returns:
        bool: 是否为印尼号码
    """
    # 清理号码格式
    clean_phone = phone.replace(" ", "").replace("-", "").replace("(", "").replace(")", "").replace("+", "")
    
    # 检查是否以 62 开头
    return clean_phone.startswith("62")


# 辅助函数：格式化印尼号码
def format_indonesian_phone(phone: str) -> str:
    """
    格式化印尼号码为API所需格式
    
    Args:
        phone: 原始电话号码
        
    Returns:
        str: 格式化后的号码（去除+号和空格）
    """
    return phone.replace("+", "").replace(" ", "").replace("-", "").replace("(", "").replace(")", "")