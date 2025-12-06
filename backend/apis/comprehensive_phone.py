"""
Comprehensive Phone Lookup API - 集成 47.253.47.192:5001 的电话查询服务
"""
import httpx
import logging
from urllib.parse import quote

logger = logging.getLogger(__name__)

async def query_comprehensive_phone(phone: str, timeout: int = 30) -> dict:
    """
    从 47.253.47.192:5001 查询电话信息 - 返回全面的用户档案
    
    Args:
        phone: 电话号码 (格式：14126704024 或 +14126704024)
        timeout: 请求超时时间（秒）
    
    Returns:
        {
            'success': bool,
            'data': {
                'user_profile': {...},  # 用户档案信息
                'Records': [...],        # 基础电话信息
                'leak_sources': [...],   # 数据泄露来源
                ...
            },
            'error': str (如果失败)
        }
    """
    
    # 规范化电话号码：移除 + 和 - 符号
    normalized_phone = phone.replace('+', '').replace('-', '').replace(' ', '')
    
    try:
        # 增加超时时间和连接限制以处理大响应
        limits = httpx.Limits(max_keepalive_connections=5, max_connections=10)
        async with httpx.AsyncClient(timeout=httpx.Timeout(timeout, read=60.0), limits=limits) as client:
            logger.info(f"🔍 [Comprehensive] 查询电话: {normalized_phone}")
            
            # 使用正确的 API 端点 - 从 country_code 判断查询类型
            # 美国号码使用 US，其他使用 ID（印尼）
            country_code = "US" if normalized_phone.startswith("1") and len(normalized_phone) == 11 else "ID"
            
            # 构建带 + 号的电话格式（API 需要）
            phone_with_plus = f"+{normalized_phone}" if not normalized_phone.startswith("+") else normalized_phone
            
            # URL编码电话号码（+ 号需要编码为 %2B）
            phone_encoded = quote(phone_with_plus, safe='')
            
            # 构建完整的API URL
            api_url = f"http://47.253.238.111:9999/api/profile?phone={phone_encoded}&country_code={country_code}"
            logger.info(f"🌐 [Comprehensive] 请求URL: {api_url}")
            logger.info(f"🔍 [Comprehensive] 原始电话: {phone_with_plus}, 编码后: {phone_encoded}")
            
            response = await client.get(
                api_url,
                headers={
                    "Accept": "application/json",
                    "Connection": "close"  # 强制关闭长连接，避免连接复用问题
                }
            )
            
            logger.info(f"📥 [Comprehensive] 响应状态码: {response.status_code}")
            
            if response.status_code == 200:
                data = response.json()
                logger.info(f"🔍 [Comprehensive] API响应数据键: {list(data.keys())}")
                
                # 检查是否有有效数据
                # 新API返回格式: basic_info, contact_info, raw_data等
                has_basic_info = 'basic_info' in data and data['basic_info']
                has_raw_data = 'raw_data' in data and data['raw_data']
                # 旧API格式: user_profile, Records
                has_user_profile = 'user_profile' in data and data['user_profile']
                has_records = 'Records' in data and data['Records']
                
                if has_basic_info or has_raw_data or has_user_profile or has_records or data.get('success'):
                    logger.info(f"✅ [Comprehensive] 查询成功: {normalized_phone}")
                    return {
                        'success': True,
                        'data': data,
                        'source': 'comprehensive_phone_lookup'
                    }
                else:
                    logger.warning(f"⚠️ [Comprehensive] API返回失败: {data.get('message', '无有效数据')}")
                    return {
                        'success': False,
                        'error': data.get('message', 'API查询失败'),
                        'source': 'comprehensive_phone_lookup'
                    }
            else:
                logger.warning(f"⚠️ [Comprehensive] 状态码 {response.status_code}")
                return {
                    'success': False,
                    'error': f"HTTP {response.status_code}",
                    'source': 'comprehensive_phone_lookup'
                }
    
    except httpx.TimeoutException:
        logger.warning(f"⚠️ [Comprehensive] 请求超时")
        return {
            'success': False,
            'error': '请求超时',
            'source': 'comprehensive_phone_lookup'
        }
    
    except Exception as e:
        logger.error(f"❌ [Comprehensive] 异常: {str(e)}")
        return {
            'success': False,
            'error': str(e),
            'source': 'comprehensive_phone_lookup'
        }


async def format_user_profile(raw_data: dict) -> dict:
    """
    格式化原始 API 数据为前端友好的格式
    
    Args:
        raw_data: 来自 query_comprehensive_phone 的原始数据
    
    Returns:
        格式化后的用户信息
    """
    
    if not raw_data.get('success'):
        return {'error': raw_data.get('error', '查询失败')}
    
    api_response = raw_data.get('data', {})
    
    # DEBUG LOGGING
    logger.info(f"🔍 [Format Profile] Keys in api_response: {list(api_response.keys())}")
    
    # 检测API格式：新格式使用 basic_info, 旧格式使用 user_profile
    # 2025-11-28 Update: Check for step-based format (step1_phone_query, etc.)
    is_step_format = 'step1_phone_query' in api_response or 'step2_phone_query' in api_response
    is_new_format = 'basic_info' in api_response
    
    if is_step_format:
        logger.info(f"🔍 [Format Profile] 使用步骤式API格式 (step1/step2...)")
        # 步骤式API格式：直接返回原始数据，让前端处理
        return {
            'success': True,
            **api_response
        }
    
    if is_new_format:
        logger.info(f"🔍 [Format Profile] 使用新API格式 (basic_info)")
        # 新API格式：直接返回原始数据，让前端处理
        return {
            'success': True,
            **api_response  # 展开所有字段
        }
    else:
        logger.info(f"🔍 [Format Profile] 使用旧API格式 (user_profile)")
        
    user_profile = api_response.get('user_profile', {})
    records = api_response.get('Records', [])
    
    # 兼容性修复：如果顶层没有Records，尝试从melissa_data中提取
    if not records and 'melissa_data' in api_response:
        try:
            records = api_response.get('melissa_data', {}).get('raw_data', {}).get('Records', [])
        except Exception:
            pass
    
    # 提取主要电话记录信息
    main_record = records[0] if records else {}
    
    # 构建前端显示的数据结构
    formatted = {
        'success': True,
        'Records': records,  # 包含原始记录列表
        'user_profile': user_profile,  # 包含原始用户档案
        'basic_info': {
            'name': user_profile.get('name', 'N/A'),
            'phone': user_profile.get('phone', 'N/A'),
            'email': user_profile.get('email_candidates', '').split(' / ')[0] if user_profile.get('email_candidates') else 'N/A',
            'gender': user_profile.get('gender_candidates', 'N/A'),
            'birthday': user_profile.get('birthday_fields', 'N/A'),
            'age': user_profile.get('age_year', 'N/A'),
        },
        'address': {
            'street': user_profile.get('street', 'N/A'),
            'city': user_profile.get('city', 'N/A'),
            'state': user_profile.get('state', 'N/A'),
            'postcode': user_profile.get('postcode', 'N/A'),
            'country': user_profile.get('country', 'N/A'),
            'full_address': user_profile.get('address_full', 'N/A'),
            'latitude': user_profile.get('latitude', 'N/A'),
            'longitude': user_profile.get('longitude', 'N/A'),
        },
        'contact': {
            'emails': user_profile.get('emails_all', 'N/A'),
            'phones': user_profile.get('phones_all', 'N/A'),
            'username': user_profile.get('username', 'N/A'),
        },
        'professional': {
            'position': user_profile.get('position', 'N/A'),
            'company': user_profile.get('company', 'N/A'),
            'industry': user_profile.get('industry', 'N/A'),
            'position_level': user_profile.get('position_level', 'N/A'),
        },
        'financial': {
            'income': user_profile.get('income', 'N/A'),
            'house_price': user_profile.get('house_price', 'N/A'),
            'credit_capacity': user_profile.get('credit_capacity', 'N/A'),
        },
        'phone_info': {
            'carrier': main_record.get('Carrier', 'N/A'),
            'caller_id': main_record.get('CallerID', 'N/A'),
            'timezone': main_record.get('TimeZoneName', 'N/A'),
            'country': main_record.get('CountryName', 'N/A'),
        },
        'social': {
            'avatar_url': user_profile.get('avatar_url', 'N/A'),
            'external_profiles': user_profile.get('external_profiles', 'N/A'),
        },
        'security': {
            'leak_sources': user_profile.get('leak_sources', 'N/A').split(' / ') if user_profile.get('leak_sources') else [],
            'login_ips': user_profile.get('login_ips', 'N/A'),
        },
        'metadata': {
            'filtered_records_count': user_profile.get('filtered_records_count', 0),
            'email_count': user_profile.get('email_count', 0),
            'sale_source_count': user_profile.get('sale_source_count', 0),
            'last_active': user_profile.get('last_active', 'N/A'),
        }
    }
    
    return formatted
