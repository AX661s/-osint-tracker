/**
 * 工具函数统一导出
 */

// 通用工具函数
export {
  toBoolean,
  normalizeToBoolean,
  isValidString,
  isValidObject,
  isNonEmptyArray,
  getNestedValue,
  collectCandidates,
  unwrapValue,
  hasNonMetadataData,
  METADATA_FIELDS,
  TRUE_VALUES,
  FALSE_VALUES
} from './common';

// 数据转换器
export { DataNormalizer } from './dataTransformers';

// 标志检测器
export { FlagDetector } from './flagDetector';

// 平台识别器
export { PlatformIdentifier } from './platformIdentifier';

// 平台过滤器
export { PlatformFilter } from './platformFilter';

// 平台提取器
export { PlatformExtractor } from './platformExtractor';

// 姓名提取器
export { NameExtractor } from './nameExtractor';
