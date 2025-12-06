/**
 * Indonesia Formatted Profile Fetcher (API 8888)
 * 
 * 调用后端新增的印尼号码查询代理路由
 * GET /api/indonesia/profile/formatted?phone=...
 * 
 * 该函数负责：
 * 1. 号码格式化（移除非数字字符）
 * 2. 调用后端 /api/indonesia/profile/formatted 路由
 * 3. 处理错误和超时
 * 4. 返回标准化的结果格式
 */

const API_BASE_URL = process.env.REACT_APP_API_URL || 
  (process.env.NODE_ENV === 'production' ? '/api' : 'http://localhost:8000/api');

/**
 * 获取印尼号码的格式化档案数据
 * @param {string} phone - 电话号码（任意格式）
 * @param {Object} options - 配置选项
 * @param {number} options.timeout - 请求超时时间（默认 60000ms）
 * @returns {Promise<Object>} 格式化的档案数据
 */
export const fetchIndonesiaFormattedProfile = async (phone, options = {}) => {
  const { timeout = 60000 } = options;

  try {
    if (!phone || typeof phone !== 'string') {
      throw new Error('Invalid phone number: must be a non-empty string');
    }

    // 清理号码：移除所有非数字字符和 + 号
    const cleanedPhone = phone.replace(/[^\d+]/g, '');
    
    if (!cleanedPhone) {
      throw new Error('Phone number contains no digits');
    }

    console.log(`🇮🇩 [Indonesia Formatted] Fetching profile for: ${phone} (cleaned: ${cleanedPhone})`);

    // 调用后端代理路由
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeout);

    try {
      const response = await fetch(
        `${API_BASE_URL}/indonesia/profile/formatted?phone=${encodeURIComponent(cleanedPhone)}`,
        {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
          },
          signal: controller.signal,
          credentials: 'include',
        }
      );

      clearTimeout(timeoutId);

      // 解析响应
      const data = await response.json();

      if (!response.ok) {
        console.error(
          `❌ [Indonesia Formatted] API returned ${response.status}:`,
          data
        );
        return {
          success: false,
          error: `API 返回错误: ${response.status}`,
          source: 'indonesia_api_8888',
          phone: cleanedPhone,
          httpStatus: response.status,
        };
      }

      console.log(`✅ [Indonesia Formatted] Success for ${cleanedPhone}`);
      console.log(`🔍 [Indonesia Formatted] Response keys:`, Object.keys(data));

      return {
        ...data,
        phone: cleanedPhone, // 确保返回清理后的号码
        source: 'indonesia_api_8888',
      };
    } catch (fetchErr) {
      clearTimeout(timeoutId);
      
      if (fetchErr.name === 'AbortError') {
        console.error(`⏱️ [Indonesia Formatted] Request timeout after ${timeout}ms`);
        return {
          success: false,
          error: `请求超时 (${timeout}ms)`,
          source: 'indonesia_api_8888',
          phone: cleanedPhone,
          isTimeout: true,
        };
      }

      throw fetchErr;
    }
  } catch (error) {
    console.error(`❌ [Indonesia Formatted] Error:`, error);
    
    return {
      success: false,
      error: error.message || '未知错误',
      source: 'indonesia_api_8888',
      phone: phone || '',
      isError: true,
    };
  }
};

/**
 * 快速查询印尼号码（简化版）
 * @param {string} phone - 电话号码
 * @returns {Promise<Object>} 档案数据或错误对象
 */
export const queryIndonesiaPhone = async (phone) => {
  return fetchIndonesiaFormattedProfile(phone, { timeout: 60000 });
};

/**
 * 批量查询多个印尼号码
 * @param {string[]} phones - 电话号码数组
 * @param {Object} options - 配置选项
 * @returns {Promise<Object[]>} 结果数组
 */
export const queryIndonesiaPhoneBatch = async (phones, options = {}) => {
  const { concurrency = 3, timeout = 60000 } = options;

  if (!Array.isArray(phones)) {
    throw new Error('phones must be an array');
  }

  console.log(`🇮🇩 [Indonesia Batch] Querying ${phones.length} phone numbers (concurrency: ${concurrency})`);

  const results = [];
  const queue = [...phones];

  // 并发控制
  const activeRequests = [];

  while (queue.length > 0 || activeRequests.length > 0) {
    // 补充并发请求到达上限
    while (activeRequests.length < concurrency && queue.length > 0) {
      const phone = queue.shift();
      const promise = fetchIndonesiaFormattedProfile(phone, { timeout })
        .then((result) => {
          results.push(result);
          return result;
        })
        .catch((error) => {
          results.push({
            success: false,
            error: error.message,
            phone,
            source: 'indonesia_api_8888',
          });
        });

      activeRequests.push(promise);
    }

    // 等待至少一个请求完成
    if (activeRequests.length > 0) {
      await Promise.race(activeRequests);
      activeRequests.splice(
        activeRequests.findIndex((p) => p.resolved),
        1
      );
    }
  }

  return results;
};

export default {
  fetchIndonesiaFormattedProfile,
  queryIndonesiaPhone,
  queryIndonesiaPhoneBatch,
};
