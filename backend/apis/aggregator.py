"""
API聚合器
整合多个API的查询结果
"""
import asyncio
import logging
from typing import List, Dict, Any
from .models import PhoneQueryResult, EmailQueryResult
from .osint_industries import query_osint_industries
from .hibp import query_hibp
# from .caller_id import query_caller_id  # 删除：超出配额 (429)
from .truecaller import query_truecaller
# from .phone_lookup_3008 import query_phone_lookup_3008  # 删除：ACELOGIC_API_KEY 未配置
from .instagram_checker import query_instagram
# from .ace_info import query_ace_whatsapp_info, query_ace_telegram_info  # 删除：ACELOGIC_API_KEY 未配置
# from .ace_truecaller_whatsapp import query_ace_truecaller_whatsapp  # 删除：冗余
from .ipqualityscore import query_ipqualityscore
# from .callapp import query_callapp  # 删除：失败的 API
from .microsoft_phone import query_microsoft_phone
# from .phone_lookup import query_phone_lookup  # 删除：失败的 API
from .data_breach import query_data_breach
# from .telegram_complete import query_telegram_complete
# from .external_lookup import query_external_lookup  # 删除：远程服务器 503 错误
from .indonesia_investigate import query_indonesia_investigate
from .indonesia_investigate_new import query_indonesia_investigate_new, is_indonesian_number
# from .melissa_contact_verify import query_melissa_contact_verify  # ✅ Melissa GlobalPhone API (已验证可用)
from .snapchat_checker import check_snapchat  # ✅ Snapchat Checker API
from .acelogic_truecaller import query_acelogic_truecaller  # ✅ Acelogic Truecaller API
from .config import OSINT_INDUSTRIES_API_KEY

logger = logging.getLogger(__name__)


async def query_phone_comprehensive(phone: str) -> PhoneQueryResult:
    """
    综合电话号码查询（使用多个API）
    
    Args:
        phone: 电话号码
        
    Returns:
        PhoneQueryResult: 包含所有成功API的结果
    """
    try:
        logger.info(f"📞 开始综合电话查询: {phone}")
        results = []
        
        
        # 如果是印尼号码，只调用新的印尼API
        if is_indonesian_number(phone):
            logger.info(f"🇮🇩 检测到印尼号码，只调用新的印尼深度调查API")
            tasks = [
                query_indonesia_investigate_new(phone, timeout=120)  # 只调用新的印尼深度调查API
            ]
        else:
            # 对于非印尼号码，并行运行所有其他电话API
            tasks = [
                # ✅ 成功的平台验证 API (7个) - 冗余 API 已移除
                query_truecaller(phone),
                query_instagram(phone),
                query_ipqualityscore(phone),
                query_microsoft_phone(phone),
                query_data_breach(phone, timeout=120),
                check_snapchat(phone),  # ✅ Snapchat Checker
                query_acelogic_truecaller(phone),  # ✅ Acelogic Truecaller
                
                # ❌ 已删除的冗余失败 API
                # query_phone_lookup_3008(phone),  # 删除：ACELOGIC_API_KEY 未配置
                # query_ace_whatsapp_info(),  # 删除：ACELOGIC_API_KEY 未配置
                # query_ace_telegram_info(),  # 删除：ACELOGIC_API_KEY 未配置
                # query_ace_truecaller_whatsapp(phone),  # 删除：冗余，已有 truecaller
                # query_external_lookup(phone, mode="medium", timeout=120),  # 删除：远程服务器 503 错误
                # query_caller_id(phone),  # 删除：超出配额 (429)
                # query_callapp(phone),  # 删除：失败
                # query_phone_lookup(phone),  # 删除：失败
            ]
        
        api_results = await asyncio.gather(*tasks, return_exceptions=True)
        
        # 收集所有结果（包括失败的）
        for result in api_results:
            if isinstance(result, list):
                # Acelogic API 返回列表（Telegram + WhatsApp）
                for item in result:
                    if isinstance(item, dict):
                        results.append(item)
            elif isinstance(result, dict):
                # 添加所有结果，不管成功与否
                results.append(result)
            elif isinstance(result, Exception):
                # 如果有异常，转换为失败结果
                results.append({
                    "success": False,
                    "data": None,
                    "error": str(result),
                    "source": "unknown"
                })
        
        successful_count = len([r for r in results if r.get("success", False)])
        logger.info(f"✅ 电话查询完成: {successful_count}/{len(results)} 个API返回成功")
        
        return PhoneQueryResult(
            success=len(results) > 0,
            phone=phone,
            data=results if results else None,
            error=None if results else "所有API查询均失败"
        )
        
    except Exception as e:
        error_msg = str(e)
        logger.error(f"❌ 综合电话查询异常: {error_msg}")
        return PhoneQueryResult(
            success=False,
            phone=phone,
            data=None,
            error=error_msg
        )


async def query_email_comprehensive(email: str) -> EmailQueryResult:
    """
    综合邮箱查询（仅使用 OSINT Industries API）
    
    Args:
        email: 邮箱地址
        
    Returns:
        EmailQueryResult: 查询结果
    """
    try:
        logger.info(f"📧 开始邮箱查询: {email}")
        
        # 检查 API 密钥是否配置
        if not OSINT_INDUSTRIES_API_KEY or len(OSINT_INDUSTRIES_API_KEY) < 10:
            error_msg = "OSINT Industries API key 未配置。请在 .env 文件中添加 OSINT_INDUSTRIES_API_KEY。"
            logger.error(f"❌ {error_msg}")
            return EmailQueryResult(
                success=False,
                email=email,
                data=None,
                error=error_msg
            )
        
        # 调用 OSINT Industries API
        result = await query_osint_industries(email, query_type="email")
        
        if result.get("success"):
            logger.info(f"✅ 邮箱查询成功: {email}")
            return EmailQueryResult(
                success=True,
                email=email,
                data=[result],
                error=None
            )
        else:
            error_msg = result.get("error", "未知错误")
            
            # 如果是 401 错误，提供更详细的说明
            if "401" in str(error_msg):
                error_msg = "API认证失败 (401)。API密钥可能无效、过期，或账户已达到使用限制。请检查您的 OSINT Industries 账户: https://osint.industries/"
            
            logger.warning(f"⚠️ 邮箱查询失败 {email}: {error_msg}")
            return EmailQueryResult(
                success=False,
                email=email,
                data=None,
                error=error_msg
            )
            
    except Exception as e:
        error_msg = str(e)
        logger.error(f"❌ 邮箱查询异常 {email}: {error_msg}")
        return EmailQueryResult(
            success=False,
            email=email,
            data=None,
            error=error_msg
        )
