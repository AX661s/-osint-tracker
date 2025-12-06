/**
 * 数据转换和规范化工具
 * 用于统一处理API返回的数据格式
 */

import { unwrapValue, toBoolean as commonToBoolean } from './common';

export class DataNormalizer {
  /**
   * 规范化值 - 递归解包嵌套的 {type, proper_key, value} 结构
   * @param {any} value - 要规范化的值
   * @returns {any} 规范化后的值
   */
  static normalizeValue(value) {
    return unwrapValue(value);
  }

  /**
   * 规范化平台数据
   * @param {Object} platform - 平台对象
   * @returns {Object} 规范化后的平台对象
   */
  static normalizePlatform(platform) {
    if (!platform || typeof platform !== 'object') {
      return platform;
    }

    const normalized = { ...platform };
    
    // 规范化 data 字段
    if (normalized.data) {
      normalized.data = unwrapValue(normalized.data);
    }
    
    // 规范化 spec_format 数组
    if (Array.isArray(normalized.spec_format)) {
      normalized.spec_format = normalized.spec_format.map(obj => unwrapValue(obj));
    }
    
    // 规范化其他顶层字段
    for (const [key, value] of Object.entries(normalized)) {
      if (key !== 'data' && key !== 'spec_format') {
        normalized[key] = unwrapValue(value);
      }
    }
    
    return normalized;
  }

  /**
   * 转换布尔值
   * @param {any} value - 要转换的值
   * @returns {boolean} 布尔值
   */
  static toBoolean(value) {
    return commonToBoolean(value);
  }
}

export default DataNormalizer;
