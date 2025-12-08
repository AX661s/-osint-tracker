/**
 * API 配置文件
 * 统一管理所有 API 相关配置
 */

/**
 * 获取 API 基础 URL
 * @returns {string} API 基础 URL
 */
export const getApiBaseUrl = () => {
  return process.env.REACT_APP_API_URL || 
    (process.env.NODE_ENV === 'production' ? '/api' : 'http://localhost:8000/api');
};

/**
 * 获取美国 API 基础 URL
 * @returns {string} 美国 API 基础 URL
 */
export const getUsApiBaseUrl = () => {
  return process.env.REACT_APP_US_API_URL || 
    (process.env.NODE_ENV === 'production' ? '/api' : 'http://localhost:8000/api/osint');
};

/**
 * API 配置
 */
export const API_CONFIG = {
  baseURL: getApiBaseUrl(),
  timeout: 30000,           // 30秒超时
  retryAttempts: 3,         // 重试3次
  retryDelay: 1000,         // 重试延迟1秒
  longTimeout: 120000,      // 长查询超时120秒
  maxTimeout: 150000        // 最大超时150秒
};

/**
 * API 端点定义
 */
export const ENDPOINTS = {
  // 认证相关
  auth: {
    login: '/auth/login',
    verify: '/auth/verify',
    logout: '/auth/logout',
    createUser: '/auth/create-user',
    user: (userId) => `/auth/user/${userId}`
  },
  
  // 查询相关
  query: {
    email: '/email/query',
    phone: '/phone/query',
    comprehensive: '/phone/comprehensive',
    emailSearch: '/email/search'
  },
  
  // 印尼专用
  indonesia: {
    profile: '/indonesia/profile/formatted',
    data: (phone) => `/indonesia/data/${phone}`,
    query: '/indonesia/query',
    test: '/indonesia/test',
    social: {
      facebook: '/indonesia/social/facebook',
      telegram: '/indonesia/social/telegram',
      truecaller: '/indonesia/social/truecaller'
    }
  },
  
  // Telegram
  telegram: {
    username: (username) => `/telegram/username/${username}`,
    aggressive: '/social/telegram/aggressive',
    aggressiveSingle: (phone) => `/social/telegram/aggressive/${phone}`
  },
  
  // Google
  google: {
    avatar: '/google/avatar',
    emailLookup: '/google-email-lookup',
    reviews: '/google-reviews'
  },
  
  // 管理员相关
  admin: {
    stats: '/admin/stats',
    users: '/admin/users',
    user: (userId) => `/admin/users/${userId}`,
    points: {
      stats: '/admin/points/stats',
      transactions: '/admin/points/transactions'
    },
    logs: {
      queries: '/admin/logs/queries',
      activities: '/admin/logs/activities'
    },
    apiKeys: '/admin/apikeys',
    apiUsage: '/admin/apikeys/usage'
  },
  
  // 代理端点
  proxy: {
    logo: (domain) => `/logo/${domain}`,
    avatar: '/avatar',
    filterFinancial: '/filter-financial'
  },
  
  // 健康检查
  health: '/health',
  info: '/info'
};

/**
 * 查询类型映射
 */
export const QUERY_TYPES = {
  EMAIL: 'email',
  PHONE: 'phone',
  INDONESIA_PHONE: 'indonesia_phone',
  USERNAME: 'username',
  WALLET: 'wallet',
  ID: 'id',
  AUTO: 'auto'
};

/**
 * 页面类型映射
 */
export const PAGE_TYPES = {
  SEARCH: 'search',
  RESULTS: 'results',
  LOADING: 'loading',
  ADMIN: 'admin',
  DEMO: 'demo',
  INDONESIA_PROFILE: 'indonesia_profile',
  INDONESIA_FORMATTED: 'indonesia_formatted',
  PROFILE_REPORT: 'profile_report',
  COMPREHENSIVE: 'comprehensive'
};

/**
 * HTTP 状态码
 */
export const HTTP_STATUS = {
  OK: 200,
  CREATED: 201,
  NO_CONTENT: 204,
  BAD_REQUEST: 400,
  UNAUTHORIZED: 401,
  FORBIDDEN: 403,
  NOT_FOUND: 404,
  TIMEOUT: 408,
  TOO_MANY_REQUESTS: 429,
  INTERNAL_ERROR: 500,
  SERVICE_UNAVAILABLE: 503,
  GATEWAY_TIMEOUT: 504
};

/**
 * 错误消息
 */
export const ERROR_MESSAGES = {
  NETWORK_ERROR: '网络连接失败，请检查网络',
  TIMEOUT: '请求超时，请稍后重试',
  UNAUTHORIZED: '未授权，请重新登录',
  FORBIDDEN: '权限不足',
  NOT_FOUND: '请求的资源不存在',
  SERVER_ERROR: '服务器错误，请稍后重试',
  SERVICE_UNAVAILABLE: '服务暂时不可用',
  INVALID_INPUT: '输入格式无效',
  INSUFFICIENT_POINTS: '积分不足',
  RATE_LIMIT: '请求过于频繁，请稍后重试'
};

/**
 * 查询成本配置
 */
export const QUERY_COSTS = {
  EMAIL: 1,
  PHONE: 1,
  INDONESIA_PHONE: 1,
  COMPREHENSIVE: 2
};

/**
 * 缓存配置
 */
export const CACHE_CONFIG = {
  EMAIL_TTL: 3600,          // 邮箱查询缓存1小时
  PHONE_TTL: 3600,          // 电话查询缓存1小时
  INDONESIA_TTL: 1800,      // 印尼查询缓存30分钟
  USER_INFO_TTL: 300        // 用户信息缓存5分钟
};

/**
 * 构建完整的 API URL
 * @param {string} endpoint - 端点路径
 * @param {Object} params - 查询参数
 * @returns {string} 完整的 URL
 */
export const buildApiUrl = (endpoint, params = {}) => {
  const baseUrl = getApiBaseUrl();
  const url = new URL(endpoint, baseUrl);
  
  Object.keys(params).forEach(key => {
    if (params[key] !== undefined && params[key] !== null) {
      url.searchParams.append(key, params[key]);
    }
  });
  
  return url.toString();
};

/**
 * 获取查询端点
 * @param {string} queryType - 查询类型
 * @returns {string} 端点路径
 */
export const getQueryEndpoint = (queryType) => {
  switch (queryType) {
    case QUERY_TYPES.EMAIL:
      return ENDPOINTS.query.email;
    case QUERY_TYPES.PHONE:
      return ENDPOINTS.query.phone;
    case QUERY_TYPES.INDONESIA_PHONE:
      return ENDPOINTS.indonesia.profile;
    default:
      throw new Error(`Unknown query type: ${queryType}`);
  }
};

/**
 * 获取页面类型映射
 * @param {string} queryType - 查询类型
 * @returns {string} 页面类型
 */
export const getPageTypeForQuery = (queryType) => {
  const mapping = {
    [QUERY_TYPES.EMAIL]: PAGE_TYPES.RESULTS,
    // 🔥 美国号码也使用印尼风格的结果页面
    [QUERY_TYPES.PHONE]: PAGE_TYPES.INDONESIA_PROFILE,
    [QUERY_TYPES.INDONESIA_PHONE]: PAGE_TYPES.INDONESIA_PROFILE
  };
  
  return mapping[queryType] || PAGE_TYPES.RESULTS;
};

export default {
  API_CONFIG,
  ENDPOINTS,
  QUERY_TYPES,
  PAGE_TYPES,
  HTTP_STATUS,
  ERROR_MESSAGES,
  QUERY_COSTS,
  CACHE_CONFIG,
  getApiBaseUrl,
  getUsApiBaseUrl,
  buildApiUrl,
  getQueryEndpoint,
  getPageTypeForQuery
};
