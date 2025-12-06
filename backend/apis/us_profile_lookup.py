"""
美国号码深度档案查询API
调用美国人物档案查询端点
API端点: http://47.253.238.111:8888/api/v1/lookup/profile
"""
import httpx
import logging
from typing import Dict, Any, Optional
from datetime import datetime

logger = logging.getLogger(__name__)

# 美国档案API配置
US_PROFILE_API_URL = "http://47.253.238.111:8888/api/v1/lookup/profile"
DEFAULT_TIMEOUT = 120  # 2分钟超时


def is_us_phone(phone: str) -> bool:
    """
    判断是否为美国号码
    美国号码: 以1开头，共11位数字 (如 14403828826)
    或 10位纯数字 (如 4403828826)
    """
    digits = ''.join(ch for ch in phone if ch.isdigit())
    
    # 11位以1开头
    if len(digits) == 11 and digits.startswith('1'):
        return True
    # 10位数字 (美国本地号码)
    if len(digits) == 10:
        return True
    # 带+1前缀
    if digits.startswith('1') and len(digits) >= 10:
        return True
        
    return False


def normalize_us_phone(phone: str) -> str:
    """
    规范化美国号码格式
    返回11位格式: 1XXXXXXXXXX
    """
    digits = ''.join(ch for ch in phone if ch.isdigit())
    
    # 如果是10位，添加1前缀
    if len(digits) == 10:
        return '1' + digits
    # 如果已经是11位且以1开头，直接返回
    if len(digits) == 11 and digits.startswith('1'):
        return digits
    # 其他情况，尝试提取最后10位并加1
    if len(digits) > 11:
        return '1' + digits[-10:]
    
    return digits


async def query_us_profile(phone: str, timeout: int = DEFAULT_TIMEOUT) -> Dict[str, Any]:
    """
    调用美国人物档案API
    
    Args:
        phone: 电话号码
        timeout: 请求超时时间（秒）
        
    Returns:
        Dict: 包含档案结果的字典
    """
    try:
        # 规范化号码
        clean_phone = normalize_us_phone(phone)
        
        # 验证是否为美国号码
        if not is_us_phone(phone):
            logger.info(f"⏭️ [US Profile API] 跳过非美国号码: {phone}")
            return {
                "success": False,
                "data": None,
                "error": "Not a US phone number",
                "source": "us_profile_lookup",
                "skipped": True
            }
        
        logger.info(f"🇺🇸 [US Profile API] 开始查询美国号码: {clean_phone}")
        
        # 发送POST请求
        async with httpx.AsyncClient(timeout=timeout) as client:
            response = await client.post(
                US_PROFILE_API_URL,
                json={"phone": clean_phone},
                headers={"Content-Type": "application/json"}
            )
            
            # 检查响应状态
            if response.status_code != 200:
                error_msg = f"HTTP {response.status_code}: {response.text[:200]}"
                logger.error(f"❌ [US Profile API] API错误: {error_msg}")
                return {
                    "success": False,
                    "data": None,
                    "error": error_msg,
                    "source": "us_profile_lookup"
                }
            
            # 解析响应
            result = response.json()
            
            # 检查是否成功
            if not result or not result.get("success"):
                error_msg = result.get("error", "Unknown error") if result else "Empty response"
                logger.warning(f"⚠️ [US Profile API] 查询失败: {error_msg}")
                return {
                    "success": False,
                    "data": None,
                    "error": error_msg,
                    "source": "us_profile_lookup"
                }
            
            # 转换为前端期望的格式
            formatted_result = format_us_profile_result(result, clean_phone)
            
            logger.info(f"✅ [US Profile API] 查询成功: {clean_phone}")
            return formatted_result
            
    except httpx.TimeoutException:
        logger.error(f"❌ [US Profile API] 请求超时: {phone}")
        return {
            "success": False,
            "data": None,
            "error": "Request timeout",
            "source": "us_profile_lookup"
        }
    except Exception as e:
        logger.error(f"❌ [US Profile API] 查询出错: {str(e)}")
        return {
            "success": False,
            "data": None,
            "error": str(e),
            "source": "us_profile_lookup"
        }


def format_us_profile_result(raw_result: Dict[str, Any], phone: str) -> Dict[str, Any]:
    """
    将API原始结果转换为前端期望的格式
    🔥 格式与印尼页面 (IndonesiaProfileResult_Simple) 兼容
    """
    identity = raw_result.get("identity", {})
    contact = raw_result.get("contact", {})
    location = raw_result.get("location", {})
    career = raw_result.get("career", {})
    financial = raw_result.get("financial", {})
    property_info = raw_result.get("property", {})
    family = raw_result.get("family", {})
    physical = raw_result.get("physical", {})
    social_media = raw_result.get("social_media", {})
    criminal = raw_result.get("criminal", {})
    external = raw_result.get("external", {})
    data_sources = raw_result.get("data_sources", {})
    vehicles = raw_result.get("vehicles", {})
    education = raw_result.get("education", {})
    
    # 提取主要地址
    primary_address = location.get("primary_address", {})
    full_address = primary_address.get("full", "")
    
    # 提取坐标
    coordinates = []
    if primary_address.get("coordinates"):
        coords = primary_address["coordinates"]
        lat = coords.get("latitude")
        lng = coords.get("longitude")
        if lat and lng:
            try:
                coordinates.append({
                    "lat": float(lat),
                    "lng": float(lng),
                    "source": "Primary Address",
                    "description": full_address
                })
            except (ValueError, TypeError):
                pass
    
    # 从geo_locations提取额外坐标
    for geo_loc in location.get("geo_locations", []):
        if geo_loc and "," in geo_loc:
            try:
                lat_str, lng_str = geo_loc.split(",")
                coordinates.append({
                    "lat": float(lat_str.strip()),
                    "lng": float(lng_str.strip()),
                    "source": "Additional Location",
                    "description": ""
                })
            except (ValueError, TypeError):
                pass
    
    # 提取所有电话和邮箱
    all_phones = list(set(filter(None, [
        contact.get("primary_phone"),
        *contact.get("phones", []),
        *contact.get("other_phones", [])
    ])))
    
    all_emails = list(set(filter(None, [
        contact.get("primary_email"),
        *contact.get("emails", []),
        *contact.get("other_emails", [])
    ])))
    
    # 提取所有地址
    all_addresses = list(set(filter(None, [
        full_address,
        *location.get("addresses", [])
    ])))
    
    # 构建职业列表 (jobs 格式与印尼页面兼容)
    jobs = []
    current_career = career.get("current", {})
    if current_career.get("current_company") or current_career.get("current_position"):
        jobs.append({
            "title": current_career.get("current_position", ""),
            "company": current_career.get("current_company", ""),
            "industry": current_career.get("industry", ""),
            "department": current_career.get("department"),
            "level": current_career.get("level"),
            "source": "US Profile API",
            "match_score": 10
        })
    
    # 🔥 格式化结果 - 与印尼页面兼容的结构
    formatted = {
        "success": True,
        "phone": phone,
        "source": "us_profile_lookup",
        "timestamp": datetime.now().isoformat(),
        "data": {
            # 🔥 basic_info - 印尼页面期望的格式
            "basic_info": {
                "name": identity.get("name", ""),
                "phone": phone,
                "phone_primary": phone,
                "ssn": identity.get("ssn", ""),
                "birthday": identity.get("birthday"),
                "age": identity.get("age"),
                "gender": identity.get("gender", ""),
                "nationality": "United States",
                "country_code": "US",
                "confidence_score": identity.get("confidence_score", 0),
                "identity_warning": identity.get("analysis", {}).get("warning"),
                "identity_status": identity.get("analysis", {}).get("status"),
                "identity_cluster_count": identity.get("analysis", {}).get("cluster_count"),
                "identity_total_records": identity.get("analysis", {}).get("total_records_analyzed"),
                "identity_main_cluster_size": identity.get("analysis", {}).get("main_cluster_size"),
            },
            
            # 🔥 contact_info - 印尼页面期望的格式 (不是 contact)
            "contact_info": {
                "phones": all_phones,
                "emails": all_emails,
                "addresses": all_addresses,
                "ip_addresses": contact.get("ip_addresses", []),
                "primary_phone": contact.get("primary_phone", phone),
                "primary_email": contact.get("primary_email", all_emails[0] if all_emails else None),
            },
            
            # 🔥 professional_info - 印尼页面期望的格式 (不是 professional)
            "professional_info": {
                "company": current_career.get("current_company", ""),
                "position": current_career.get("current_position", ""),
                "industry": current_career.get("industry", ""),
                "level": current_career.get("level", ""),
                "department": current_career.get("department", ""),
                "jobs": jobs,  # 印尼页面期望的 jobs 数组
            },
            
            # 地址信息 (保留兼容性)
            "address": {
                "street": primary_address.get("street", ""),
                "city": primary_address.get("city", ""),
                "state": primary_address.get("state", ""),
                "postcode": primary_address.get("postcode", ""),
                "country": primary_address.get("country", "United States"),
                "full_address": full_address,
            },
            
            # 位置坐标
            "location": {
                "coordinates": coordinates,
                "other_addresses": location.get("addresses", []),
                "cities": location.get("cities", []),
                "states": location.get("states", []),
                "zip_codes": location.get("zip_codes", []),
                "geo_locations": location.get("geo_locations", []),
            },
            
            # 财务信息 - 完整字段
            "financial_info": {
                "income": financial.get("income_levels", [None])[0] if financial.get("income_levels") else None,
                "income_levels": financial.get("income_levels", []),
                "net_worth": financial.get("net_worth", [None])[0] if financial.get("net_worth") else None,
                "net_worth_all": financial.get("net_worth", []),
                "credit_score": financial.get("credit_scores", [None])[0] if financial.get("credit_scores") else None,
                "credit_scores": financial.get("credit_scores", []),
                "credit_cards": financial.get("credit_cards", []),
                "bank_accounts": financial.get("bank_accounts", []),
            },
            
            # 房产信息
            "housing_info": {
                "properties": property_info.get("properties", []),
                "home_values": property_info.get("home_values", []),
                "property_types": property_info.get("property_types", []),
            },
            
            # 家庭信息 - 完整字段
            "family_info": {
                "children_count": family.get("number_of_children", [None])[0] if family.get("number_of_children") else None,
                "number_of_children": family.get("number_of_children", []),
                "marital_status": family.get("marital_status", [None])[0] if family.get("marital_status") else None,
                "marital_status_all": family.get("marital_status", []),
                "household_size": family.get("household_size", [None])[0] if family.get("household_size") else None,
                "household_size_all": family.get("household_size", []),
            },
            
            # 社交关系
            "social_relations": {
                "relatives": raw_result.get("social", {}).get("relatives", []),
                "neighbors": raw_result.get("social", {}).get("neighbors", []),
                "associates": raw_result.get("social", {}).get("associates", []),
            },
            
            # 政治倾向
            "political_info": {
                "political_party": raw_result.get("political", {}).get("political_party", []),
                "voter_registration": raw_result.get("political", {}).get("voter_registration", []),
            },
            
            # 物理特征 - 完整字段
            "physical_info": {
                "ethnicity": physical.get("ethnicity", [None])[0] if physical.get("ethnicity") else None,
                "ethnicity_all": physical.get("ethnicity", []),
                "race": physical.get("race", [None])[0] if physical.get("race") else None,
                "race_all": physical.get("race", []),
                "height": physical.get("height", []),
                "weight": physical.get("weight", []),
                "hair_color": physical.get("hair_color", []),
                "eye_color": physical.get("eye_color", []),
                "scars_marks": physical.get("scars_marks", []),
            },
            
            # 车辆信息 - 完整字段
            "vehicle_info": {
                "vehicles": [
                    {"brand": b, "model": m}
                    for b, m in zip(
                        vehicles.get("vehicle_brands", []),
                        vehicles.get("vehicle_models", [])
                    )
                ] if vehicles.get("vehicle_brands") else [],
                "vehicle_brands": vehicles.get("vehicle_brands", []),
                "vehicle_models": vehicles.get("vehicle_models", []),
                "vehicle_vins": vehicles.get("vehicle_vins", []),
                "vehicle_numbers": vehicles.get("vehicle_numbers", []),
            },
            
            # 🔥 accounts - 社交媒体账号 (完整字段)
            "accounts": {
                "facebook": social_media.get("facebook_ids", []),
                "linkedin": social_media.get("linkedin_ids", []),
                "twitter": social_media.get("twitter_handles", []),
                "instagram": social_media.get("instagram_handles", []),
                "tiktok": social_media.get("tiktok_handles", []),
                "nicknames": social_media.get("nicknames", []),
                "avatar_urls": social_media.get("avatar_urls", []),
                "profiles": external.get("profile_urls", []),
                "websites": external.get("websites", []),
            },
            
            # 教育信息 - 完整字段
            "education_info": {
                "levels": education.get("education_levels", []),
                "schools": education.get("schools", []),
                "degrees": education.get("degrees", []),
                "graduation_years": education.get("graduation_years", []),
            },
            
            # 犯罪记录 (如有)
            "criminal_info": {
                "arrest_dates": criminal.get("arrest_dates", []),
                "crime_descriptions": criminal.get("crime_descriptions", []),
                "crime_types": criminal.get("crime_types", []),
                "courts": criminal.get("courts", []),
                "punishments": criminal.get("punishments", []),
            } if any(criminal.get(k) for k in ["arrest_dates", "crime_descriptions", "crime_types"]) else None,
            
            # 🔥 data_breaches - 印尼页面期望的格式
            "data_breaches": {
                "total_databases": data_sources.get("total_databases", 0),
                "total_records": data_sources.get("total_records", 0),
                "databases": data_sources.get("databases", []),
                "sources": [db.get("name", "") for db in data_sources.get("databases", [])],
            },
            
            # 安全信息
            "security_info": {
                "has_ssn": data_sources.get("data_quality", {}).get("has_ssn", False),
                "confidence_score": identity.get("confidence_score", 0),
            },
            
            # 🔥 summary - 印尼页面期望的格式
            "summary": {
                "name": identity.get("name", ""),
                "phone": phone,
                "email": all_emails[0] if all_emails else None,
                "address": full_address,
                "company": current_career.get("current_company", ""),
                "position": current_career.get("current_position", ""),
                "data_sources_count": data_sources.get("total_databases", 0),
            },
        },
        
        # 原始数据 (用于调试)
        "raw_data": raw_result,
    }
    
    return formatted


# 导出函数
__all__ = ['query_us_profile', 'is_us_phone', 'normalize_us_phone', 'format_us_profile_result']
