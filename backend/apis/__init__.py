"""
独立的API模块
每个API服务都有自己的文件
"""
from .osint_industries import query_osint_industries
from .hibp import query_hibp
from .caller_id import query_caller_id
from .truecaller import query_truecaller
from .ipqualityscore import query_ipqualityscore
from .osint_deep import query_osint_deep_phone
# from .callapp import query_callapp  # 已删除：失败的API
from .microsoft_phone import query_microsoft_phone
# from .phone_lookup import query_phone_lookup  # 已删除：失败的API
from .data_breach import query_data_breach
from .indonesia_investigate_new import query_indonesia_investigate_new
# from .indonesia_api_8888 import query_indonesia_api_8888  # 已删除：文件不存在
from .indonesia_api_9999 import query_indonesia_api_9999, format_indonesia_profile_9999
from .aggregator import query_phone_comprehensive, query_email_comprehensive
from .models import PhoneQueryResult, EmailQueryResult
from .telegram_username import query_telegram_by_username

# 基础类和工具函数
from .base import BaseAPIClient, APIResult, normalize_phone, format_phone_with_plus, mask_key, to_bool

__all__ = [
    # 基础类和工具
    'BaseAPIClient',
    'APIResult',
    'normalize_phone',
    'format_phone_with_plus',
    'mask_key',
    'to_bool',
    
    # 邮箱API
    'query_osint_industries',
    'query_hibp',
    
    # 电话API
    'query_caller_id',
    'query_truecaller',
    'query_ipqualityscore',
    'query_osint_deep_phone',
    # 'query_callapp',  # 已删除
    'query_microsoft_phone',
    # 'query_phone_lookup',  # 已删除
    'query_data_breach',
    'query_indonesia_investigate_new',
    'query_indonesia_api_8888',
    'query_indonesia_api_9999',
    'format_indonesia_profile_9999',
    
    # 聚合查询
    'query_phone_comprehensive',
    'query_email_comprehensive',
    'query_telegram_by_username',
    
    # 数据模型
    'PhoneQueryResult',
    'EmailQueryResult',
]
