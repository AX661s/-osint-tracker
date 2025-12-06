/**
 * 统一查询服务
 * 整合所有查询逻辑，消除重复代码
 */

import { apiClient } from '../utils/secureApiClient';
import { 
  formatIndonesiaPhone, 
  isIndonesiaPhone,
  formatUSPhone,
  isUSPhone,
  validatePhone
} from '../utils/phoneUtils';
import { 
  ENDPOINTS, 
  QUERY_TYPES,
  API_CONFIG,
  getPageTypeForQuery,
  getUsApiBaseUrl
} from '../config/api';

class QueryService {
  constructor() {
    this.cache = new Map();
    this.pendingRequests = new Map();
  }

  /**
   * 统一的查询入口 - 只调用一次API
   */
  async query(input, options = {}) {
    const {
      searchType = QUERY_TYPES.AUTO,
      sessionToken = null,
      timeout = API_CONFIG.longTimeout,
      useCache = true
    } = options;

    try {
      // 1. 检测查询类型（只执行一次）
      const queryType = this.detectQueryType(input, searchType);
      console.log(`🔍 [QueryService] Query type: ${queryType}`);

      // 2. 验证输入
      const validation = this.validateInput(input, queryType);
      if (!validation.valid) {
        throw new Error(validation.message);
      }

      // 3. 格式化输入（只执行一次）
      const formattedInput = this.formatInput(input, queryType);
      console.log(`📝 [QueryService] Formatted: ${formattedInput}`);

      // 4. 检查缓存
      if (useCache) {
        const cached = this.getFromCache(formattedInput, queryType);
        if (cached) {
          console.log(`✅ [QueryService] Cache hit`);
          return cached;
        }
      }

      // 5. 检查是否有相同请求正在进行（防止重复调用）
      const pendingKey = `${queryType}:${formattedInput}`;
      if (this.pendingRequests.has(pendingKey)) {
        console.log(`⏳ [QueryService] Waiting for pending request`);
        return await this.pendingRequests.get(pendingKey);
      }

      // 6. 执行查询（只调用一次API）
      const queryPromise = this.executeQuery(formattedInput, queryType, sessionToken, timeout);
      this.pendingRequests.set(pendingKey, queryPromise);

      try {
        const result = await queryPromise;
        const processedResult = this.processResult(result, queryType, formattedInput);
        
        // 7. 缓存结果
        if (useCache && processedResult.success) {
          this.saveToCache(formattedInput, queryType, processedResult);
        }
        
        return processedResult;
      } finally {
        this.pendingRequests.delete(pendingKey);
      }

    } catch (error) {
      console.error(`❌ [QueryService] Error:`, error);
      throw error;
    }
  }

  /**
   * 检测查询类型
   */
  detectQueryType(input, searchType) {
    if (searchType !== QUERY_TYPES.AUTO) {
      return searchType;
    }

    const trimmed = input.trim();

    // 检查邮箱
    if (this.isEmail(trimmed)) {
      return QUERY_TYPES.EMAIL;
    }

    // 检查电话
    if (this.isPhone(trimmed)) {
      if (isIndonesiaPhone(trimmed)) {
        return QUERY_TYPES.INDONESIA_PHONE;
      }
      return QUERY_TYPES.PHONE;
    }

    throw new Error('无法识别输入类型');
  }

  /**
   * 验证输入
   */
  validateInput(input, queryType) {
    if (!input || input.trim() === '') {
      return { valid: false, message: '请输入查询内容' };
    }

    switch (queryType) {
      case QUERY_TYPES.EMAIL:
        return this.validateEmail(input);
      case QUERY_TYPES.PHONE:
      case QUERY_TYPES.INDONESIA_PHONE:
        return validatePhone(input);
      default:
        return { valid: true, message: 'OK' };
    }
  }

  /**
   * 格式化输入
   */
  formatInput(input, queryType) {
    switch (queryType) {
      case QUERY_TYPES.INDONESIA_PHONE:
        return formatIndonesiaPhone(input);
      case QUERY_TYPES.PHONE:
        return isUSPhone(input) ? formatUSPhone(input) : input.replace(/\D/g, '');
      case QUERY_TYPES.EMAIL:
        return input.trim().toLowerCase();
      default:
        return input.trim();
    }
  }

  /**
   * 执行查询 - 核心方法，只调用一次API
   */
  async executeQuery(input, queryType, sessionToken, timeout) {
    console.log(`🚀 [QueryService] Executing ${queryType} query`);

    switch (queryType) {
      case QUERY_TYPES.INDONESIA_PHONE:
        return await apiClient.get(
          `${ENDPOINTS.indonesia.profile}?phone=${encodeURIComponent(input)}`
        );

      case QUERY_TYPES.PHONE:
        // 美国号码使用 5000 端口 API
        const usApiBase = getUsApiBaseUrl();
        const phoneEndpoint = `${usApiBase}/phone/query`;
        
        return await fetch(phoneEndpoint, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': sessionToken ? `Bearer ${sessionToken}` : ''
          },
          body: JSON.stringify({
            phone: input,
            timeout,
            session_token: sessionToken
          })
        }).then(res => res.json());

      case QUERY_TYPES.EMAIL:
        return await apiClient.post(ENDPOINTS.query.email, {
          email: input,
          timeout,
          session_token: sessionToken
        });

      default:
        throw new Error(`Unsupported query type: ${queryType}`);
    }
  }

  /**
   * 处理结果
   */
  processResult(result, queryType, input) {
    if (!result || !result.success) {
      throw new Error(result?.error || 'Query failed');
    }

    // 兼容后端可能返回的不同结构
    let finalData = result.data;
    
    // 如果 data 不存在，但存在 profile (后端旧格式)，手动包装
    if (!finalData && result.profile) {
      console.warn('⚠️ [QueryService] Detected legacy backend response format (profile), wrapping in data object');
      finalData = {
        profile: result.profile,
        raw_data: result.raw_data,
        phone: result.phone,
        source: result.source
      };
    }

    return {
      success: true,
      queryType,
      input,
      pageType: getPageTypeForQuery(queryType),
      data: finalData,
      raw: result,
      timestamp: new Date().toISOString()
    };
  }

  /**
   * 缓存管理
   */
  getFromCache(input, queryType) {
    const key = `${queryType}:${input}`;
    const cached = this.cache.get(key);
    
    if (cached && Date.now() - cached.timestamp < API_CONFIG.CACHE_CONFIG?.EMAIL_TTL * 1000) {
      return cached.data;
    }
    
    return null;
  }

  saveToCache(input, queryType, data) {
    const key = `${queryType}:${input}`;
    this.cache.set(key, {
      data,
      timestamp: Date.now()
    });
  }

  clearCache() {
    this.cache.clear();
  }

  /**
   * 辅助方法
   */
  isEmail(input) {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(input);
  }

  isPhone(input) {
    return /^[\d+\-\s()]+$/.test(input) && input.replace(/\D/g, '').length >= 7;
  }

  validateEmail(email) {
    if (!this.isEmail(email)) {
      return { valid: false, message: '邮箱格式无效' };
    }
    return { valid: true, message: 'OK' };
  }
}

// 创建单例
export const queryService = new QueryService();

export default QueryService;
