"""
智能联系人过滤器 - 基于数据库上下文的关联性判断
根据 acelogic 数据库中的电话号码和姓名关联来过滤邮箱和电话
"""
import re
from typing import List, Dict, Set, Tuple
import logging

logger = logging.getLogger(__name__)


def extract_first_name(full_name: str) -> str:
    """提取名字（first name）"""
    if not full_name:
        return ""
    
    # 移除多余空格
    name = ' '.join(full_name.split())
    
    # 处理 "LastName, FirstName" 格式
    if ',' in name:
        parts = name.split(',')
        if len(parts) >= 2:
            return parts[1].strip().split()[0].lower()
    
    # 处理 "FirstName LastName" 格式
    parts = name.split()
    if parts:
        return parts[0].lower()
    
    return ""


def extract_last_name(full_name: str) -> str:
    """提取姓氏（last name）"""
    if not full_name:
        return ""
    
    # 移除多余空格
    name = ' '.join(full_name.split())
    
    # 处理 "LastName, FirstName" 格式
    if ',' in name:
        parts = name.split(',')
        if len(parts) >= 1:
            return parts[0].strip().lower()
    
    # 处理 "FirstName LastName" 格式
    parts = name.split()
    if len(parts) >= 2:
        return parts[-1].lower()
    
    return ""


def filter_contacts_by_database_context(
    comprehensive_data: dict,
    query_phone: str
) -> Tuple[List[str], List[str]]:
    """
    基于数据库上下文智能过滤联系人信息
    
    策略：
    1. 从 acelogic_phone_data 中提取所有与查询电话号码直接关联的邮箱（高置信度）
    2. 从 acelogic_name_data 中提取邮箱，但要验证是否为同一个人
    3. 通过比对姓名来排除明显是其他人的记录
    
    Args:
        comprehensive_data: 5000 API 返回的完整数据
        query_phone: 查询的电话号码
    
    Returns:
        (filtered_emails, filtered_phones): 过滤后的邮箱列表和电话列表
    """
    
    logger.info(f"🔍 开始智能过滤，查询电话: {query_phone}")
    
    # 标准化查询电话号码（移除 + 和 - 等符号）
    normalized_query_phone = re.sub(r'[^\d]', '', query_phone)
    
    # 第一步：从 acelogic_phone_data 获取高置信度数据
    phone_related_emails = set()
    phone_related_names = set()
    main_first_name = None
    main_last_name = None
    
    acelogic_phone_data = comprehensive_data.get('acelogic_phone_data', {})
    if acelogic_phone_data and acelogic_phone_data.get('raw_data'):
        raw = acelogic_phone_data['raw_data']
        if raw.get('success') and raw.get('data', {}).get('List'):
            databases = raw['data']['List']
            
            logger.info(f"📊 检查 acelogic_phone_data: {len(databases)} 个数据库")
            
            for db_name, db_info in databases.items():
                if db_info.get('Data'):
                    for record in db_info['Data']:
                        record_phone = re.sub(r'[^\d]', '', str(record.get('Phone', '')))
                        record_email = record.get('Email', '').strip()
                        record_name = record.get('FullName', '') or \
                                    f"{record.get('FirstName', '')} {record.get('LastName', '')}".strip()
                        
                        # 如果电话号码匹配查询号码
                        if record_phone and normalized_query_phone in record_phone:
                            if record_email:
                                phone_related_emails.add(record_email.lower())
                                logger.info(f"  ✓ 找到关联邮箱: {record_email} (来自 {db_name})")
                            
                            if record_name:
                                phone_related_names.add(record_name.lower())
                                if not main_first_name:
                                    main_first_name = extract_first_name(record_name)
                                    main_last_name = extract_last_name(record_name)
                                    logger.info(f"  👤 主要人物: {main_first_name} {main_last_name}")
    
    logger.info(f"📧 通过电话直接关联的邮箱: {len(phone_related_emails)} 个")
    
    # 第二步：从 acelogic_name_data 获取数据，但需要验证是否同一个人
    name_related_emails = set()
    name_related_phones = set()
    
    acelogic_name_data = comprehensive_data.get('acelogic_name_data', {})
    if acelogic_name_data and acelogic_name_data.get('raw_data'):
        raw = acelogic_name_data['raw_data']
        if raw.get('success') and raw.get('data', {}).get('List'):
            databases = raw['data']['List']
            
            logger.info(f"📊 检查 acelogic_name_data: {len(databases)} 个数据库")
            
            for db_name, db_info in databases.items():
                if db_info.get('Data'):
                    for record in db_info['Data']:
                        record_email = record.get('Email', '').strip()
                        record_phone = record.get('Phone', '')
                        record_name = record.get('FullName', '') or \
                                    f"{record.get('FirstName', '')} {record.get('LastName', '')}".strip()
                        
                        if not record_email:
                            continue
                        
                        # 验证是否为同一个人 - 使用多种策略综合判断
                        is_same_person = False
                        confidence_score = 0
                        
                        # 策略1: 电话号码匹配（最高优先级，+50分）
                        if record_phone:
                            normalized_record_phone = re.sub(r'[^\d]', '', str(record_phone))
                            if normalized_query_phone in normalized_record_phone or \
                               normalized_record_phone in normalized_query_phone:
                                confidence_score += 50
                                logger.debug(f"    [+50] 电话匹配")
                        
                        # 策略2: 完整姓名匹配（+40分）
                        if record_name and record_name.lower() in phone_related_names:
                            confidence_score += 40
                            logger.debug(f"    [+40] 完整姓名匹配")
                        
                        # 策略3: 名字（First Name）匹配（+30分）
                        if main_first_name:
                            record_first_name = extract_first_name(record_name)
                            record_last_name = extract_last_name(record_name)
                            
                            if record_first_name == main_first_name:
                                confidence_score += 30
                                logger.debug(f"    [+30] 名字匹配: {record_first_name}")
                                
                                # 如果姓氏也匹配，再加分
                                if record_last_name and main_last_name and record_last_name == main_last_name:
                                    confidence_score += 10
                                    logger.debug(f"    [+10] 姓氏也匹配: {record_last_name}")
                            elif record_first_name and record_first_name != main_first_name:
                                # 名字不同
                                # 如果只是姓氏相同（如 Kate Brady vs Ines Brady），扣更多分
                                if record_last_name and main_last_name and record_last_name == main_last_name:
                                    confidence_score -= 40
                                    logger.debug(f"    [-40] 同姓不同名: {record_first_name} {record_last_name} != {main_first_name} {main_last_name}")
                                else:
                                    # 完全不同的人
                                    confidence_score -= 30
                                    logger.debug(f"    [-30] 名字不同: {record_first_name} != {main_first_name}")
                        
                        # 策略4: 邮箱包含主要人物的名字（+20分）
                        if main_first_name and main_first_name in record_email.lower():
                            confidence_score += 20
                            logger.debug(f"    [+20] 邮箱包含名字: {main_first_name}")
                        
                        # 策略5: 来自高可信度数据库（特定数据库+10分）
                        high_trust_dbs = ['Apollo', 'Acxiom', 'EatStreet', 'ChatBooks', 'MGM Resorts', 
                                         'Havenly', 'ScentBird', 'StockX', 'Twitter', 'Arteza.com']
                        if db_name in high_trust_dbs:
                            confidence_score += 10
                            logger.debug(f"    [+10] 高信任度数据库: {db_name}")
                        
                        # 判断：置信度 >= 30 分则认为是相关联系人
                        if confidence_score >= 30:
                            name_related_emails.add(record_email.lower())
                            logger.info(f"  ✓ {record_email} [置信度: {confidence_score}] 来自 {db_name}")
                        else:
                            logger.debug(f"  ✗ {record_email} [置信度: {confidence_score}] 不足，跳过")
    
    logger.info(f"📧 通过姓名验证的邮箱: {len(name_related_emails)} 个")
    
    # 合并所有相关邮箱
    all_related_emails = phone_related_emails | name_related_emails
    
    # 从 user_profile 获取原始邮箱列表
    user_profile = comprehensive_data.get('user_profile', {})
    emails_all = user_profile.get('emails_all', '')
    all_emails_raw = [e.strip() for e in emails_all.split(' / ') if e.strip()]
    
    # 过滤邮箱：只保留在关联集合中的邮箱
    filtered_emails = []
    for email in all_emails_raw:
        if email.lower() in all_related_emails:
            filtered_emails.append(email)
        else:
            logger.debug(f"  ✗ 过滤掉不相关邮箱: {email}")
    
    # 过滤电话（暂时保留所有电话）
    phones_all = user_profile.get('phones_all', '')
    filtered_phones = [p.strip() for p in phones_all.split(' / ') if p.strip()]
    
    logger.info(f"✅ 过滤完成: {len(filtered_emails)}/{len(all_emails_raw)} 个邮箱, {len(filtered_phones)} 个电话")
    
    return filtered_emails, filtered_phones
