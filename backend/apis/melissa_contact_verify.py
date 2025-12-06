"""
Melissa GlobalPhone API
使用 globalphone.melissadata.net GlobalPhone 服务进行电话验证
支持 CallerID 和 Premium Phone Verification
"""
import httpx
import logging
from typing import Dict, Any
from .config import MELISSA_API_KEY, DEFAULT_TIMEOUT, mask_key

logger = logging.getLogger(__name__)


async def query_melissa_contact_verify(phone: str, timeout: int = 30) -> Dict[str, Any]:
    """
    查询 Melissa GlobalPhone API (Phone + CallerID)
    
    Args:
        phone: 电话号码 (例如: +14403828826 or 14403828826)
        timeout: 请求超时时间（秒）
        
    Returns:
        Dict: 包含 success, data, error, source 字段
        
    Example Response:
        {
            "success": True,
            "data": {
                "Version": "9.4.0.1281",
                "TransmissionReference": "Test",
                "Records": [{
                    "RecordID": "1",
                    "Results": "PS01,PS07,PS18,PS22",
                    "PhoneNumber": "4403828826",
                    "AdministrativeArea": "Ohio",
                    "CountryAbbreviation": "US",
                    "CountryName": "United States",
                    "Carrier": "T-Mobile USA",
                    "CallerID": "ABAZIA JAMES",
                    "InternationalPhoneNumber": "+14403828826",
                    ...
                }]
            },
            "error": None,
            "source": "melissa_globalphone"
        }
    """
    try:
        # API Key (从config读取)
        api_key = MELISSA_API_KEY
        if not api_key:
            logger.warning("⚠️ [Melissa GlobalPhone] MELISSA_API_KEY 未配置，跳过查询")
            return {
                "success": False,
                "data": None,
                "error": "MELISSA_API_KEY not configured",
                "source": "melissa_globalphone"
            }
        
        # Melissa GlobalPhone API endpoint
        url = "https://globalphone.melissadata.net/V4/WEB/GlobalPhone/doGlobalPhone"
        
        # 清理电话号码 (去除 + 号和空格)
        clean_phone = phone.replace("+", "").replace(" ", "").replace("-", "").replace("(", "").replace(")", "")
        
        # API 请求参数 (GlobalPhone 格式 - 按照用户提供的 PowerShell 示例)
        params = {
            "id": api_key,
            "Phone": clean_phone,
            "Country": "US",  # 默认美国
            "opt": "CallerID:True,VerifyPhone:Premium",  # 启用 CallerID 和 Premium 验证
            "t": "Test"
        }
        
        logger.info(f"📞 [Melissa GlobalPhone] 查询电话: {phone}")
        logger.info(f"🔗 [Melissa GlobalPhone] URL: {url}")
        logger.info(f"📋 [Melissa GlobalPhone] Params: Phone={clean_phone}, Country=US")
        
        async with httpx.AsyncClient(timeout=timeout) as client:
            response = await client.get(url, params=params)
            
            logger.info(f"📡 [Melissa GlobalPhone] HTTP Status: {response.status_code}")
            logger.info(f"📡 [Melissa GlobalPhone] Response: {response.text[:500]}")
            
            if response.status_code == 200:
                try:
                    data = response.json()
                    
                    # 检查是否有有效记录
                    records = data.get("Records", [])
                    if records and len(records) > 0:
                        first_record = records[0]

                        # 检查结果代码 - PE11 表示电话未找到或无数据
                        results_code = first_record.get("Results", "")
                        if "PE11" in results_code:
                            logger.warning(f"⚠️ [Melissa GlobalPhone] 电话未找到 (PE11): {phone}")
                            return {
                                "success": False,
                                "data": data,
                                "error": "Phone number not found in database",
                                "source": "melissa_globalphone"
                            }

                        caller_id = first_record.get("CallerID", "")
                        carrier = first_record.get("Carrier", "")
                        locality = first_record.get("Locality", "")
                        state = first_record.get("AdministrativeArea", "")

                        # 检查是否有实际数据（不仅仅是空字符串）
                        has_data = bool(caller_id.strip() or carrier.strip() or locality.strip() or state.strip())

                        if has_data:
                            logger.info(
                                f"✅ [Melissa GlobalPhone] 成功: "
                                f"CallerID={caller_id}, Carrier={carrier}, "
                                f"Location={locality}, {state}"
                            )

                            return {
                                "success": True,
                                "data": data,
                                "error": None,
                                "source": "melissa_globalphone",
                                # 提取关键字段便于前端使用
                                "caller_id": caller_id,
                                "carrier": carrier,
                                "location": f"{locality}, {state}",
                                "country": first_record.get("CountryName", ""),
                                "phone_type": first_record.get("PhoneTypeDescription", "")
                            }
                        else:
                            logger.warning(f"⚠️ [Melissa GlobalPhone] 返回记录但无有效数据: {phone}")
                            return {
                                "success": False,
                                "data": data,
                                "error": "No data available for this phone number",
                                "source": "melissa_globalphone"
                            }
                    else:
                        logger.warning(f"⚠️ [Melissa GlobalPhone] 无记录返回")
                        return {
                            "success": False,
                            "data": data,
                            "error": "No records found",
                            "source": "melissa_globalphone"
                        }
                        
                except Exception as parse_error:
                    logger.error(f"❌ [Melissa GlobalPhone] JSON解析失败: {parse_error}")
                    return {
                        "success": False,
                        "data": None,
                        "error": f"JSON parse error: {str(parse_error)}",
                        "source": "melissa_globalphone"
                    }
            else:
                error_text = response.text[:200]
                logger.error(
                    f"❌ [Melissa GlobalPhone] HTTP错误 {response.status_code}: {error_text}"
                )
                return {
                    "success": False,
                    "data": None,
                    "error": f"HTTP {response.status_code}: {error_text}",
                    "source": "melissa_globalphone"
                }
                
    except httpx.TimeoutException:
        logger.error(f"⏱️ [Melissa GlobalPhone] 请求超时 ({timeout}秒)")
        return {
            "success": False,
            "data": None,
            "error": f"Request timeout after {timeout}s",
            "source": "melissa_globalphone"
        }
    except Exception as e:
        logger.error(f"❌ [Melissa GlobalPhone] 异常: {str(e)}")
        return {
            "success": False,
            "data": None,
            "error": str(e),
            "source": "melissa_globalphone"
        }


# 测试函数
async def test_melissa_contact_verify():
    """测试 Melissa GlobalPhone API"""
    test_phone = "+14403828826"
    print(f"Testing Melissa GlobalPhone API with: {test_phone}\n")
    
    result = await query_melissa_contact_verify(test_phone)
    
    print(f"Success: {result['success']}")
    print(f"Source: {result['source']}")
    
    if result['success']:
        print(f"Caller ID: {result.get('caller_id')}")
        print(f"Carrier: {result.get('carrier')}")
        print(f"Location: {result.get('location')}")
        print(f"Country: {result.get('country')}")
        print(f"\nFull Data:")
        import json
        print(json.dumps(result['data'], indent=2))
    else:
        print(f"Error: {result['error']}")


if __name__ == "__main__":
    import asyncio
    asyncio.run(test_melissa_contact_verify())
