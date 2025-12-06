/**
 * 电话号码工具函数
 * 统一的号码格式化和验证逻辑
 */

/**
 * 格式化印尼电话号码
 * @param {string} phone - 原始电话号码
 * @returns {string} 格式化后的号码（62开头）
 */
export const formatIndonesiaPhone = (phone) => {
  if (!phone) return '';
  
  // 移除所有非数字字符
  let digits = String(phone).replace(/\D/g, '');
  
  // 处理不同的输入格式
  if (digits.startsWith('08')) {
    // 08xxx -> 62xxx
    digits = '62' + digits.substring(1);
  } else if (digits.startsWith('8') && digits.length >= 9) {
    // 8xxx -> 62xxx
    digits = '62' + digits;
  } else if (digits.startsWith('620')) {
    // 620xxx -> 62xxx (移除多余的0)
    digits = '62' + digits.substring(3);
  }
  
  return digits;
};

/**
 * 检查是否为印尼电话号码
 * @param {string} phone - 电话号码
 * @returns {boolean} 是否为印尼号码
 */
export const isIndonesiaPhone = (phone) => {
  const digits = formatIndonesiaPhone(phone);
  return digits.startsWith('62') && digits.length >= 10 && digits.length <= 15;
};

/**
 * 格式化美国电话号码
 * @param {string} phone - 原始电话号码
 * @returns {string} 格式化后的号码（1开头或10位）
 */
export const formatUSPhone = (phone) => {
  if (!phone) return '';
  
  let digits = String(phone).replace(/\D/g, '');
  
  // 移除开头的+号
  if (digits.startsWith('1') && digits.length === 11) {
    // 已经是正确格式
    return digits;
  } else if (digits.length === 10) {
    // 添加国家代码
    return '1' + digits;
  }
  
  return digits;
};

/**
 * 检查是否为美国电话号码
 * @param {string} phone - 电话号码
 * @returns {boolean} 是否为美国号码
 */
export const isUSPhone = (phone) => {
  const digits = String(phone).replace(/\D/g, '');
  return (digits.length === 10 || (digits.length === 11 && digits.startsWith('1')));
};

/**
 * 检查是否为有效的电话号码（任何国家）
 * @param {string} phone - 电话号码
 * @returns {boolean} 是否为有效号码
 */
export const isValidPhone = (phone) => {
  if (!phone) return false;
  const digits = String(phone).replace(/\D/g, '');
  return digits.length >= 7 && digits.length <= 15;
};

/**
 * 自动检测电话号码类型
 * @param {string} phone - 电话号码
 * @returns {string} 'indonesia' | 'us' | 'other' | 'invalid'
 */
export const detectPhoneType = (phone) => {
  if (!isValidPhone(phone)) return 'invalid';
  
  if (isIndonesiaPhone(phone)) return 'indonesia';
  if (isUSPhone(phone)) return 'us';
  
  return 'other';
};

/**
 * 格式化电话号码用于显示
 * @param {string} phone - 电话号码
 * @param {string} type - 号码类型
 * @returns {string} 格式化后的显示文本
 */
export const formatPhoneForDisplay = (phone, type = null) => {
  if (!phone) return '';
  
  const phoneType = type || detectPhoneType(phone);
  const digits = String(phone).replace(/\D/g, '');
  
  switch (phoneType) {
    case 'indonesia':
      // +62 812-3456-7890
      if (digits.startsWith('62') && digits.length >= 10) {
        return `+62 ${digits.substring(2, 5)}-${digits.substring(5, 9)}-${digits.substring(9)}`;
      }
      break;
      
    case 'us':
      // +1 (234) 567-8900
      if (digits.length === 11 && digits.startsWith('1')) {
        return `+1 (${digits.substring(1, 4)}) ${digits.substring(4, 7)}-${digits.substring(7)}`;
      } else if (digits.length === 10) {
        return `(${digits.substring(0, 3)}) ${digits.substring(3, 6)}-${digits.substring(6)}`;
      }
      break;
  }
  
  // 默认格式
  return phone;
};

/**
 * 验证电话号码格式
 * @param {string} phone - 电话号码
 * @returns {{valid: boolean, message: string, type: string}}
 */
export const validatePhone = (phone) => {
  if (!phone || phone.trim() === '') {
    return {
      valid: false,
      message: '请输入电话号码',
      type: 'invalid'
    };
  }
  
  const type = detectPhoneType(phone);
  
  if (type === 'invalid') {
    return {
      valid: false,
      message: '电话号码格式无效（需要7-15位数字）',
      type: 'invalid'
    };
  }
  
  return {
    valid: true,
    message: '电话号码格式正确',
    type
  };
};

export default {
  formatIndonesiaPhone,
  isIndonesiaPhone,
  formatUSPhone,
  isUSPhone,
  isValidPhone,
  detectPhoneType,
  formatPhoneForDisplay,
  validatePhone
};
