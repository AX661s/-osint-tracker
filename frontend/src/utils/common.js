/**
 * 通用工具函数
 * 消除各个工具类中的重复代码
 */

/**
 * 真值集合
 */
export const TRUE_VALUES = new Set(['true', 'yes', 'found', 'valid', '1', 'y']);

/**
 * 假值集合
 */
export const FALSE_VALUES = new Set(['false', 'no', 'not_found', 'invalid', '0', 'n', 'none']);

/**
 * 通用布尔值转换
 * 支持多种格式: true, "true", "yes", "1", 1 等
 * @param {any} value - 要转换的值
 * @returns {boolean} 布尔值
 */
export function toBoolean(value) {
  if (value === true) return true;
  if (value === false || value === null || value === undefined) return false;
  if (typeof value === 'number') return value === 1;
  if (typeof value === 'string') {
    const normalized = value.trim().toLowerCase();
    if (TRUE_VALUES.has(normalized)) return true;
    if (FALSE_VALUES.has(normalized)) return false;
    return Boolean(value);
  }
  return !!value;
}

/**
 * 规范化值为布尔值（严格模式）
 * 只有明确的真/假值才返回布尔值，否则返回 null
 * @param {any} value - 要规范化的值
 * @returns {boolean|null} 布尔值或null（无法确定）
 */
export function normalizeToBoolean(value) {
  if (typeof value === 'boolean') return value;
  if (typeof value === 'number') return value === 1 ? true : value === 0 ? false : null;
  if (typeof value === 'string') {
    const normalized = value.trim().toLowerCase();
    if (TRUE_VALUES.has(normalized)) return true;
    if (FALSE_VALUES.has(normalized)) return false;
  }
  return null;
}

/**
 * 检查是否为有效的非空字符串
 * @param {any} value - 要检查的值
 * @returns {boolean}
 */
export function isValidString(value) {
  return typeof value === 'string' && value.trim().length > 0;
}

/**
 * 检查是否为有效的非空对象
 * @param {any} value - 要检查的值
 * @returns {boolean}
 */
export function isValidObject(value) {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}

/**
 * 检查是否为非空数组
 * @param {any} value - 要检查的值
 * @returns {boolean}
 */
export function isNonEmptyArray(value) {
  return Array.isArray(value) && value.length > 0;
}

/**
 * 安全获取嵌套属性
 * @param {Object} obj - 对象
 * @param {string} path - 属性路径，如 'data.user.name'
 * @param {any} defaultValue - 默认值
 * @returns {any}
 */
export function getNestedValue(obj, path, defaultValue = undefined) {
  if (!obj || typeof obj !== 'object') return defaultValue;
  
  const keys = path.split('.');
  let current = obj;
  
  for (const key of keys) {
    if (current === null || current === undefined) return defaultValue;
    current = current[key];
  }
  
  return current !== undefined ? current : defaultValue;
}

/**
 * 从平台对象中收集候选数据对象
 * 用于在多个位置查找数据
 * @param {Object} platform - 平台对象
 * @returns {Array<Object>} 候选对象数组
 */
export function collectCandidates(platform) {
  const candidates = [];
  
  if (platform && typeof platform === 'object') {
    candidates.push(platform);
  }
  
  if (platform?.data && typeof platform.data === 'object') {
    candidates.push(platform.data);
  }
  
  if (Array.isArray(platform?.spec_format)) {
    const validItems = platform.spec_format.filter(
      item => item && typeof item === 'object'
    );
    candidates.push(...validItems);
  }
  
  return candidates;
}

/**
 * 递归解包嵌套的 {type, proper_key, value} 结构
 * @param {any} value - 要规范化的值
 * @returns {any} 规范化后的值
 */
export function unwrapValue(value) {
  if (value === null || value === undefined) {
    return value;
  }
  
  if (Array.isArray(value)) {
    return value.map(v => unwrapValue(v));
  }
  
  if (typeof value === 'object') {
    // 如果对象有 value 字段，解包它
    if ('value' in value) {
      return unwrapValue(value.value);
    }
    
    // 递归处理对象的所有字段
    const normalized = {};
    for (const [key, val] of Object.entries(value)) {
      normalized[key] = unwrapValue(val);
    }
    return normalized;
  }
  
  return value;
}

/**
 * 元数据字段列表（用于过滤）
 */
export const METADATA_FIELDS = new Set([
  'module', 'source', 'status', 'platform_name', 'platform_type', 
  'data', 'spec_format', 'error'
]);

/**
 * 检查对象是否有除元数据外的有效数据
 * @param {Object} obj - 要检查的对象
 * @param {Set<string>} excludeFields - 要排除的字段
 * @returns {boolean}
 */
export function hasNonMetadataData(obj, excludeFields = METADATA_FIELDS) {
  if (!obj || typeof obj !== 'object') return false;
  
  const dataKeys = Object.keys(obj).filter(k => !excludeFields.has(k));
  if (dataKeys.length === 0) return false;
  
  return dataKeys.some(k => {
    const val = obj[k];
    if (val === null || val === undefined || val === '') return false;
    if (typeof val === 'object' && 'value' in val) {
      return val.value !== null && val.value !== undefined && val.value !== '';
    }
    return true;
  });
}
