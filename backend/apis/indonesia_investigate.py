"""
印尼号码深度调查API
调用 AceLogic Cloud API 进行印尼号码查询
"""
import os
import httpx
import logging
from typing import Dict, Any, Optional

logger = logging.getLogger(__name__)

# 印尼调查API配置
from .config import INDONESIA_API_URL
INDONESIA_API_KEY = os.environ.get('INDONESIA_API_KEY', 'f4f3209b21e73db31eda9a7682177a498bfadd311e1855920c7d83f4388c7046')
DEFAULT_TIMEOUT = 120  # 2分钟超时


async def query_indonesia_investigate(phone: str, timeout: int = DEFAULT_TIMEOUT) -> Dict[str, Any]:
    """
    调用印尼号码深度调查API (AceLogic Cloud)
    
    Args:
        phone: 电话号码（应为 +62 开头的印尼号码）
        timeout: 请求超时时间（秒）
        
    Returns:
        Dict: 包含调查结果的字典
    """
    try:
        # 检查是否为印尼号码
        if not phone.startswith('+62'):
            logger.info(f"⏭️ [Indonesia API] 跳过非印尼号码: {phone}")
            return {
                "success": False,
                "data": None,
                "error": "Not an Indonesian phone number",
                "source": "indonesia_investigate",
                "skipped": True
            }
        
        logger.info(f"🇮🇩 [Indonesia API] 开始查询印尼号码: {phone}")
        
        # 发送GET请求
        async with httpx.AsyncClient(timeout=timeout) as client:
            response = await client.get(
                INDONESIA_API_URL,
                params={"request": phone},
                headers={
                    "Content-Type": "application/json",
                    "x-api-key": INDONESIA_API_KEY
                }
            )
            
            # 检查响应状态
            if response.status_code != 200:
                error_msg = f"HTTP {response.status_code}: {response.text[:200]}"
                logger.error(f"❌ [Indonesia API] API错误: {error_msg}")
                return {
                    "success": False,
                    "data": None,
                    "error": error_msg,
                    "source": "indonesia_investigate"
                }
            
            # 解析响应
            result = response.json()
            
            # 检查是否有数据
            if not result or not result.get("success"):
                error_msg = result.get("error", "No data found") if isinstance(result, dict) else "Empty response"
                logger.warning(f"⚠️ [Indonesia API] 未找到数据: {error_msg}")
                return {
                    "success": False,
                    "data": None,
                    "error": error_msg,
                    "source": "indonesia_investigate"
                }
            
            # 提取数据 - AceLogic返回格式: {success, cached, data: {List: {...}, NumOfDatabase, NumOfResults}}
            data_obj = result.get("data", {})
            data_list = data_obj.get("List", {})
            total_databases = data_obj.get("NumOfDatabase", 0)
            total_records = data_obj.get("NumOfResults", 0)
            
            # 从所有数据库中提取记录
            records = []
            breach_sources = []
            for db_name, db_data in data_list.items():
                breach_sources.append(db_name)
                if isinstance(db_data, dict) and "Data" in db_data:
                    records.extend(db_data.get("Data", []))
            
            # 提取邮箱和其他信息
            emails_found = []
            names_found = []
            personal_info = {
                "Phone": set(),
                "Email": set(),
                "Passport": set(),
                "Gender": set(),
                "Provider": set(),
                "RegDate": set(),
                "BDay": set(),
                "Status": set(),
                "Income": set()
            }
            
            for record in records:
                if isinstance(record, dict):
                    # 提取邮箱
                    if "Email" in record and record["Email"]:
                        email = str(record["Email"]).strip()
                        if email and email not in emails_found:
                            emails_found.append(email)
                            personal_info["Email"].add(email)
                    
                    # 提取电话
                    for phone_field in ["Phone", "Phone2"]:
                        if phone_field in record and record[phone_field]:
                            phone_val = str(record[phone_field]).strip()
                            if phone_val:
                                personal_info["Phone"].add(phone_val)
                    
                    # 提取护照/身份证
                    if "Passport" in record and record["Passport"]:
                        passport = str(record["Passport"]).strip()
                        if passport:
                            personal_info["Passport"].add(passport)
                    
                    # 提取性别
                    if "Gender" in record and record["Gender"]:
                        gender = str(record["Gender"]).strip()
                        if gender:
                            personal_info["Gender"].add(gender)
                    
                    # 提取姓名（多种格式）
                    name_parts = []
                    if "FullName" in record and record["FullName"]:
                        full_name = str(record["FullName"]).strip()
                        if full_name and full_name not in names_found:
                            names_found.append(full_name)
                    
                    if "FirstName" in record and record["FirstName"]:
                        first = str(record["FirstName"]).strip()
                        if first:
                            name_parts.append(first)
                    
                    if "LastName" in record and record["LastName"]:
                        last = str(record["LastName"]).strip()
                        if last:
                            name_parts.append(last)
                    
                    if name_parts:
                        combined_name = " ".join(name_parts)
                        if combined_name not in names_found:
                            names_found.append(combined_name)
                    
                    if "Name" in record and record["Name"]:
                        name = str(record["Name"]).strip()
                        if name and name not in names_found:
                            names_found.append(name)
                    
                    # 提取运营商
                    if "Provider" in record and record["Provider"]:
                        provider = str(record["Provider"]).strip()
                        if provider:
                            personal_info["Provider"].add(provider)
                    
                    # 提取注册日期
                    if "RegDate" in record and record["RegDate"]:
                        reg_date = str(record["RegDate"]).strip()
                        if reg_date:
                            personal_info["RegDate"].add(reg_date)
                    
                    # 提取生日
                    if "BDay" in record and record["BDay"]:
                        bday = str(record["BDay"]).strip()
                        if bday:
                            personal_info["BDay"].add(bday)
                    
                    # 提取状态
                    if "Status" in record and record["Status"]:
                        status = str(record["Status"]).strip()
                        if status:
                            personal_info["Status"].add(status)
                    
                    # 提取收入
                    if "Income" in record and record["Income"]:
                        income = str(record["Income"]).strip()
                        if income:
                            personal_info["Income"].add(income)
            
            # 转换 set 为 list
            for key in personal_info:
                personal_info[key] = sorted(list(personal_info[key]))
            
            logger.info(f"✅ [Indonesia API] 查询完成: 找到 {len(emails_found)} 个邮箱, {total_databases} 个数据库, {total_records} 条记录")
            
            # 格式化返回数据（保持与之前API兼容的格式）
            return {
                "success": True,
                "data": {
                    "phone_number": phone,
                    "investigation_id": f"acelogic_{phone.replace('+', '')}",
                    "message": f"AceLogic查询完成 - 电话号码: {phone}, 数据库: {total_databases}个, 记录: {total_records}条",
                    "step1_phone_investigation": {
                        "phone_number": phone,
                        "emails_found": emails_found,
                        "names_found": names_found,
                        "personal_info": personal_info,
                        "passwords_found": [],
                        "databases": total_databases,
                        "records": total_records,
                        "breach_sources": breach_sources,
                        "investigation_time": "",
                        "api_config": {
                            "api_key_used": INDONESIA_API_KEY[:16] + "..." + INDONESIA_API_KEY[-10:],
                            "endpoint": INDONESIA_API_URL
                        }
                    },
                    "step2_social_media": {},
                    "step3_email_breach": {},
                    "comprehensive_analysis": {
                        "target_phone": phone,
                        "google_emails_found": [e for e in emails_found if "gmail.com" in e.lower()],
                        "total_emails_discovered": len(emails_found),
                        "names_found": names_found,
                        "personal_information": personal_info,
                        "social_media_accounts": {},
                        "passwords_extracted": [],
                        "statistics": {
                            "total_databases_affected": total_databases,
                            "total_records_found": total_records,
                            "passwords_found": 0,
                            "social_accounts_found": 0,
                            "breach_sources": breach_sources
                        },
                        "risk_assessment": {
                            "level": "� 高风险" if total_records > 5 else ("�🟡 中等风险" if total_records > 0 else "🟢 低风险"),
                            "score": min(100, total_records * 20),
                            "factors": [
                                f"找到 {len(emails_found)} 个邮箱账户" if len(emails_found) > 0 else "未发现邮箱",
                                f"涉及 {total_databases} 个数据库",
                                f"发现 {total_records} 条泄露记录",
                                f"数据来源: {', '.join(breach_sources)}"
                            ]
                        }
                    },
                    "investigation_timeline": {
                        "start_time": "",
                        "step1_completed": "✅ AceLogic API查询完成",
                        "report_generated": "✅ 报告生成完成"
                    },
                    "raw_response": result
                },
                "source": "indonesia_investigate",
                "error": None
            }
            
    except httpx.TimeoutException:
        error_msg = f"请求超时（超过{timeout}秒）"
        logger.error(f"⏰ [Indonesia Investigate] {error_msg}")
        return {
            "success": False,
            "data": None,
            "error": error_msg,
            "source": "indonesia_investigate"
        }
        
    except httpx.RequestError as e:
        error_msg = f"网络请求失败: {str(e)}"
        logger.error(f"🌐 [Indonesia Investigate] {error_msg}")
        return {
            "success": False,
            "data": None,
            "error": error_msg,
            "source": "indonesia_investigate"
        }
        
    except Exception as e:
        error_msg = f"调查过程中发生错误: {str(e)}"
        logger.error(f"💥 [Indonesia Investigate] {error_msg}")
        logger.exception("Full exception details:")
        return {
            "success": False,
            "data": None,
            "error": error_msg,
            "source": "indonesia_investigate"
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
    clean_phone = phone.replace(" ", "").replace("-", "").replace("(", "").replace(")", "")
    
    # 检查是否以 +62 或 62 开头
    return clean_phone.startswith("+62") or clean_phone.startswith("62")
