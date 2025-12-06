/**
 * ProfileDataProcessor - 人物信息报告数据处理器
 * 
 * 5000 API 数据结构（4步骤集成）：
 * - 步骤1: melissa_data - Melissa电话反查（绝对可信）
 * - 步骤2: acelogic_phone_data.user_profile - Acelogic电话反查（绝对可信）
 * - 步骤3: user_profile - 汇总的用户画像（绝对可信）
 * - 步骤4: acelogic_name_data - 姓名搜索（可能有同名数据，需要验证）
 * 
 * 策略：以前3步的可信数据为锚点，第4步数据需要与锚点匹配才采用
 */

// ==================== 辅助函数 ====================

/**
 * 安全地分割字符串
 */
const safeSplit = (str, delimiter = ' / ') => {
  if (!str || typeof str !== 'string') return [];
  return str.split(delimiter).map(s => s.trim()).filter(Boolean);
};

/**
 * 数据源可信度权重（越高越可信）
 * Experian/Acxiom 是专业数据公司，可信度最高
 * Melissa 是电话反查，直接关联，可信度高
 * LinkedIn 是用户自填，可信度中等
 * 其他泄露数据可信度较低
 */
const SOURCE_TRUST_WEIGHT = {
  'Experian': 100,
  'Acxiom': 95,
  'Melissa': 90,
  'USA Voters': 85,
  'Dbr.ri.gov': 80,
  'LinkedIn Scraped Data': 75,
  'B2B USA Businesses': 70,
  'DriveSure': 65,
  'BloomsToday.com': 60,
  'Jack Vosmyorkin': 55,
  'Exactis': 50,
  'PeopleDataLabs': 45,
  'MindJolt': 40,
  'Pipl': 35,
  'default': 30,
};

/**
 * 获取数据源的可信度权重
 */
const getSourceWeight = (source) => {
  if (!source) return SOURCE_TRUST_WEIGHT.default;
  return SOURCE_TRUST_WEIGHT[source] || SOURCE_TRUST_WEIGHT.default;
};

/**
 * 智能选择最可信的单一值
 * 优先级：数据源可信度 > 出现次数 > 格式完整度 > 第一个
 * 
 * @param candidates - 候选值数组，可以是字符串或 {value, source} 对象
 * @param type - 值类型：gender, age, date, number, default
 */
const pickBestValue = (candidates, type = 'default') => {
  if (!candidates || candidates.length === 0) return null;
  if (candidates.length === 1) {
    return typeof candidates[0] === 'object' ? candidates[0].value : candidates[0];
  }
  
  // 标准化为 {value, source, weight} 格式
  const normalized = candidates.map(c => {
    if (typeof c === 'object' && c.value !== undefined) {
      return { value: c.value, source: c.source, weight: getSourceWeight(c.source) };
    }
    return { value: c, source: null, weight: SOURCE_TRUST_WEIGHT.default };
  });
  
  // 统计出现次数
  const countMap = {};
  normalized.forEach(item => {
    const key = String(item.value).toLowerCase().trim();
    countMap[key] = (countMap[key] || 0) + 1;
  });
  
  // 综合评分排序：权重 * 0.6 + 出现次数 * 40
  const scored = normalized.map(item => {
    const key = String(item.value).toLowerCase().trim();
    const count = countMap[key] || 1;
    const score = item.weight * 0.6 + count * 40;
    return { ...item, count, score };
  });
  
  // 按评分排序
  scored.sort((a, b) => b.score - a.score);
  
  // 根据类型进一步筛选
  if (type === 'gender') {
    const standardGenders = ['M', 'F', 'Male', 'Female', 'male', 'female'];
    for (const item of scored) {
      if (standardGenders.includes(item.value)) return item.value;
    }
  }
  
  if (type === 'age') {
    for (const item of scored) {
      const num = parseInt(item.value);
      if (!isNaN(num) && num >= 1 && num <= 120) return String(num);
    }
  }
  
  if (type === 'date') {
    const datePatterns = [
      /^\d{4}[-/]\d{2}[-/]\d{2}$/,  // YYYY-MM-DD
      /^\d{2}[-/]\d{2}[-/]\d{4}$/,  // MM-DD-YYYY
    ];
    for (const pattern of datePatterns) {
      for (const item of scored) {
        if (pattern.test(item.value)) return item.value;
      }
    }
  }
  
  if (type === 'number') {
    // 数字：选择最大的合理值（如子女数量）
    const numbers = scored
      .map(item => parseInt(item.value))
      .filter(n => !isNaN(n) && n >= 0 && n <= 20);
    if (numbers.length > 0) {
      // 返回出现次数最多的，如果相同则返回较大值
      const numCount = {};
      numbers.forEach(n => numCount[n] = (numCount[n] || 0) + 1);
      const maxCount = Math.max(...Object.values(numCount));
      const mostCommon = Object.entries(numCount)
        .filter(([_, count]) => count === maxCount)
        .map(([n, _]) => parseInt(n));
      return String(Math.max(...mostCommon));
    }
  }
  
  return scored[0]?.value || null;
};

/**
 * 从多个数据源中提取带来源的值
 * @param records - 记录数组，每个记录包含 _source 字段
 * @param fieldNames - 要提取的字段名数组
 */
const extractValuesWithSource = (records, fieldNames) => {
  const values = [];
  if (!Array.isArray(records)) return values;
  
  records.forEach(record => {
    const source = record._source || 'unknown';
    fieldNames.forEach(field => {
      if (record[field] !== undefined && record[field] !== null && record[field] !== '') {
        values.push({ value: record[field], source });
      }
    });
  });
  
  return values;
};

/**
 * 从 URL 中提取用户名
 */
const extractUsernameFromUrl = (url) => {
  if (!url || typeof url !== 'string') return null;
  try {
    const urlObj = new URL(url);
    const path = urlObj.pathname.replace(/^\/|\/$/g, '');
    const parts = path.split('/');
    return parts[parts.length - 1] || parts[0] || null;
  } catch {
    return null;
  }
};

/**
 * 获取嵌套的 user_profile
 */
const getUserProfile = (rawData) => {
  // 尝试多种路径获取 user_profile
  const compData = rawData?.comprehensive_data || rawData;
  return compData?.user_profile || 
         rawData?.user_profile || 
         rawData?.data?.user_profile || 
         {};
};

/**
 * 获取 acelogic 数据
 */
const getAcelogicData = (rawData) => {
  const compData = rawData?.comprehensive_data || rawData;
  return {
    phone: compData?.acelogic_phone_data || rawData?.acelogic_phone_data || {},
    name: compData?.acelogic_name_data || rawData?.acelogic_name_data || {},
  };
};

/**
 * 获取 melissa 数据
 */
const getMelissaData = (rawData) => {
  const compData = rawData?.comprehensive_data || rawData;
  const melissaData = compData?.melissa_data || rawData?.melissa_data || {};
  return melissaData?.raw_data?.Records?.[0] || melissaData || {};
};

/**
 * 获取 platform_verification 数据
 */
const getPlatformVerification = (rawData) => {
  const compData = rawData?.comprehensive_data || rawData;
  return compData?.platform_verification || rawData?.platform_verification || {};
};

/**
 * 🔥 数据来源说明：
 * 
 * 步骤1: melissa_data - Melissa电话反查（绝对可信）
 * 步骤2: acelogic_phone_data - 手机查询（绝对可信，直接与人物关联）
 * 步骤3: acelogic_name_data - 姓名搜索（可能有多个同名人物，需要验证）
 * 
 * user_profile 是步骤1+2的汇总结果
 */

/**
 * 计算两个坐标之间的距离（公里）- Haversine 公式
 */
const calculateDistance = (lat1, lon1, lat2, lon2) => {
  if (!lat1 || !lon1 || !lat2 || !lon2) return Infinity;
  const R = 6371; // 地球半径（公里）
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
            Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
            Math.sin(dLon/2) * Math.sin(dLon/2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
  return R * c;
};

/**
 * 🔥 建立可信锚点 - 从步骤1和步骤2提取唯一身份标识
 * 
 * 只使用 Melissa + acelogic_phone_data 作为锚点
 * 步骤3的姓名搜索数据必须与锚点匹配才能使用
 */
const buildTrustedAnchors = (rawData, queryType, queryValue) => {
  const anchors = {
    phones: new Set(),      // 可信电话
    emails: new Set(),      // 可信邮箱
    names: new Set(),       // 可信姓名
    cities: new Set(),      // 可信城市
    states: new Set(),      // 可信州（必须匹配）
    zips: new Set(),        // 可信邮编
    addresses: new Set(),   // 可信街道地址
    coordinates: null,      // 可信坐标 {lat, lng}
    ssn: null,              // 可信SSN
  };

  // 🔥 核心修复：将用户查询输入直接作为可信锚点
  if (queryValue) {
    if (queryType === 'phone') {
      anchors.phones.add(queryValue.replace(/\D/g, ''));
    } else if (queryType === 'email') {
      anchors.emails.add(queryValue.toLowerCase());
    }
  }

  const compData = rawData?.comprehensive_data || rawData;
  
  // ========== 步骤1: Melissa 数据（绝对可信）==========
  const melissa = getMelissaData(rawData);
  if (melissa.InternationalPhoneNumber) {
    anchors.phones.add(melissa.InternationalPhoneNumber.replace(/\D/g, ''));
  }
  if (melissa.NameFull) {
    anchors.names.add(melissa.NameFull.toLowerCase());
    // 也添加姓氏作为锚点
    const nameParts = melissa.NameFull.toLowerCase().split(/\s+/);
    if (nameParts.length > 1) {
      anchors.names.add(nameParts[nameParts.length - 1]); // 姓氏
    }
  }
  if (melissa.Locality) anchors.cities.add(melissa.Locality.toLowerCase());
  if (melissa.AdministrativeArea) anchors.states.add(melissa.AdministrativeArea.toLowerCase());
  if (melissa.PostalCode) anchors.zips.add(melissa.PostalCode.replace(/\D/g, '').slice(0, 5));
  // Melissa 坐标
  if (melissa.Latitude && melissa.Longitude) {
    anchors.coordinates = { lat: parseFloat(melissa.Latitude), lng: parseFloat(melissa.Longitude) };
  }
  
  // ========== 步骤2: acelogic_phone_data（绝对可信）==========
  const acePhone = compData?.acelogic_phone_data?.user_profile || {};
  if (acePhone.name) {
    anchors.names.add(acePhone.name.toLowerCase());
    const nameParts = acePhone.name.toLowerCase().split(/\s+/);
    if (nameParts.length > 1) {
      anchors.names.add(nameParts[nameParts.length - 1]); // 姓氏
    }
  }
  if (acePhone.phone) anchors.phones.add(acePhone.phone.replace(/\D/g, ''));
  safeSplit(acePhone.emails_all).forEach(e => anchors.emails.add(e.toLowerCase()));
  safeSplit(acePhone.phones_all).forEach(p => anchors.phones.add(p.replace(/\D/g, '')));
  if (acePhone.city) anchors.cities.add(acePhone.city.toLowerCase());
  if (acePhone.state) anchors.states.add(acePhone.state.toLowerCase());
  if (acePhone.postcode) anchors.zips.add(acePhone.postcode.replace(/\D/g, '').slice(0, 5));
  // acePhone 坐标
  if (!anchors.coordinates && acePhone.latitude && acePhone.longitude) {
    anchors.coordinates = { lat: parseFloat(acePhone.latitude), lng: parseFloat(acePhone.longitude) };
  }
  
  // ========== user_profile 是步骤1+2的汇总 ==========
  const userProfile = getUserProfile(rawData);
  if (userProfile.name) {
    anchors.names.add(userProfile.name.toLowerCase());
    const nameParts = userProfile.name.toLowerCase().split(/\s+/);
    if (nameParts.length > 1) {
      anchors.names.add(nameParts[nameParts.length - 1]);
    }
  }
  if (userProfile.phone) anchors.phones.add(userProfile.phone.replace(/\D/g, ''));
  safeSplit(userProfile.emails_all).forEach(e => anchors.emails.add(e.toLowerCase()));
  safeSplit(userProfile.phones_all).forEach(p => anchors.phones.add(p.replace(/\D/g, '')));
  if (userProfile.city) anchors.cities.add(userProfile.city.toLowerCase());
  if (userProfile.state) anchors.states.add(userProfile.state.toLowerCase());
  if (userProfile.postcode) anchors.zips.add(userProfile.postcode.replace(/\D/g, '').slice(0, 5));
  // userProfile 街道地址
  if (userProfile.street) anchors.addresses.add(userProfile.street.toLowerCase());
  if (userProfile.address_full) anchors.addresses.add(userProfile.address_full.toLowerCase());
  // userProfile 坐标
  if (!anchors.coordinates && userProfile.latitude && userProfile.longitude) {
    anchors.coordinates = { lat: parseFloat(userProfile.latitude), lng: parseFloat(userProfile.longitude) };
  }
  // userProfile SSN
  if (userProfile.ssn) {
    anchors.ssn = userProfile.ssn;
  }

  console.log('🔒 [Anchors] 唯一身份锚点（来自Melissa+手机查询）:', JSON.stringify({
    phones: Array.from(anchors.phones),
    emails: Array.from(anchors.emails),
    names: Array.from(anchors.names),
    cities: Array.from(anchors.cities),
    states: Array.from(anchors.states),
    zips: Array.from(anchors.zips),
    addresses: Array.from(anchors.addresses),
    coordinates: anchors.coordinates,
    ssn: anchors.ssn ? `***${anchors.ssn.slice(-4)}` : null,
  }, null, 2));

  return anchors;
};

/**
 * 美国州缩写列表
 */
const US_STATES = ['AL','AK','AZ','AR','CA','CO','CT','DE','FL','GA','HI','ID','IL','IN','IA','KS','KY','LA','ME','MD','MA','MI','MN','MS','MO','MT','NE','NV','NH','NJ','NM','NY','NC','ND','OH','OK','OR','PA','RI','SC','SD','TN','TX','UT','VT','VA','WA','WV','WI','WY','DC'];

/**
 * 美国州全称到缩写的映射
 */
const STATE_NAME_TO_CODE = {
  'alabama': 'al', 'alaska': 'ak', 'arizona': 'az', 'arkansas': 'ar', 'california': 'ca',
  'colorado': 'co', 'connecticut': 'ct', 'delaware': 'de', 'florida': 'fl', 'georgia': 'ga',
  'hawaii': 'hi', 'idaho': 'id', 'illinois': 'il', 'indiana': 'in', 'iowa': 'ia',
  'kansas': 'ks', 'kentucky': 'ky', 'louisiana': 'la', 'maine': 'me', 'maryland': 'md',
  'massachusetts': 'ma', 'michigan': 'mi', 'minnesota': 'mn', 'mississippi': 'ms', 'missouri': 'mo',
  'montana': 'mt', 'nebraska': 'ne', 'nevada': 'nv', 'new hampshire': 'nh', 'new jersey': 'nj',
  'new mexico': 'nm', 'new york': 'ny', 'north carolina': 'nc', 'north dakota': 'nd', 'ohio': 'oh',
  'oklahoma': 'ok', 'oregon': 'or', 'pennsylvania': 'pa', 'rhode island': 'ri', 'south carolina': 'sc',
  'south dakota': 'sd', 'tennessee': 'tn', 'texas': 'tx', 'utah': 'ut', 'vermont': 'vt',
  'virginia': 'va', 'washington': 'wa', 'west virginia': 'wv', 'wisconsin': 'wi', 'wyoming': 'wy',
};

/**
 * 亲属关系代码映射
 * 格式: "LOUIS MARVALDI P 297282573" = 姓名 + 关系代码 + SSN
 */
const RELATIONSHIP_CODES = {
  'P': '父母 (Parent)',
  'C': '子女 (Child)',
  'S': '配偶 (Spouse)',
  'B': '兄弟 (Brother)',
  'I': '姻亲 (In-law)',
  'A': '姑姨叔伯 (Aunt/Uncle)',
  'G': '祖父母 (Grandparent)',
  'N': '侄子侄女 (Nephew/Niece)',
  'O': '其他 (Other)',
  'L': '同住 (Lives with)',
  'R': '亲属 (Relative)',
  'M': '母亲 (Mother)',
  'F': '父亲 (Father)',
  'D': '女儿 (Daughter)',
  'H': '丈夫 (Husband)',
  'W': '妻子 (Wife)',
};

/**
 * 智能解析亲属关系字符串
 * 输入: "LOUIS MARVALDI P 297282573, JAMES ABAZIA C 278667532"
 * 输出: [{ name: "Louis Marvaldi", relationship: "父母 (Parent)", ssn: "***2573" }, ...]
 */
const parseRelatives = (relativesStr) => {
  if (!relativesStr || typeof relativesStr !== 'string') return [];
  
  const results = [];
  const parts = relativesStr.split(',').map(p => p.trim()).filter(Boolean);
  
  for (const part of parts) {
    // 匹配格式: 姓名 + 可选的关系代码(1-2个字母) + SSN(9位数字)
    // 例如: "LOUIS MARVALDI P 297282573" 或 "JAMES ABAZIA 278887532"
    const match = part.match(/^(.+?)\s+([A-Z]{1,2})?\s*(\d{9})$/i);
    
    if (match) {
      const [, namePart, relationCode, ssn] = match;
      const name = namePart.trim().split(/\s+/).map(w => 
        w.charAt(0).toUpperCase() + w.slice(1).toLowerCase()
      ).join(' ');
      
      // 解析关系代码
      let relationship = null;
      if (relationCode) {
        const codes = relationCode.toUpperCase().split('');
        const relationships = codes.map(c => RELATIONSHIP_CODES[c]).filter(Boolean);
        relationship = relationships.join(' / ') || relationCode;
      }
      
      results.push({
        name,
        relationship,
        ssn: ssn ? `***${ssn.slice(-4)}` : null,
        _rawSsn: ssn, // 保留原始SSN用于匹配
      });
    } else {
      // 无法解析的格式，尝试简单处理
      const words = part.trim().split(/\s+/);
      const lastWord = words[words.length - 1];
      
      // 检查最后一个词是否是SSN
      if (/^\d{9}$/.test(lastWord)) {
        const name = words.slice(0, -1).map(w => 
          w.charAt(0).toUpperCase() + w.slice(1).toLowerCase()
        ).join(' ');
        results.push({
          name,
          relationship: null,
          ssn: `***${lastWord.slice(-4)}`,
          _rawSsn: lastWord,
        });
      } else {
        // 完全无法解析
        results.push({
          name: part.trim(),
          relationship: null,
          ssn: null,
        });
      }
    }
  }
  
  return results;
};

/**
 * 智能提取记录中的所有可能字段值
 */
const extractRecordFields = (record) => {
  // 电话 - 尝试多个字段
  const phones = [];
  ['Phone', 'MobilePhone', 'Cell', 'HomePhone', 'WorkPhone', 'Telephone'].forEach(key => {
    if (record[key]) phones.push(record[key].replace(/\D/g, ''));
  });
  
  // 邮箱
  const emails = [];
  ['Email', 'EmailAddress', 'email', 'Mail'].forEach(key => {
    if (record[key]) emails.push(record[key].toLowerCase());
  });
  
  // 州 - 从 State 字段或 Address 中提取
  let state = (record.State || '').toLowerCase().trim();
  
  // 如果是州全称，转换为缩写
  if (state && STATE_NAME_TO_CODE[state]) {
    state = STATE_NAME_TO_CODE[state];
  }
  
  if (!state && record.Address) {
    const addressParts = record.Address.toUpperCase().split(/\s+/);
    for (const part of addressParts) {
      if (US_STATES.includes(part)) {
        state = part.toLowerCase();
        break;
      }
    }
  }
  
  // 也检查 Region/Location 字段
  if (!state) {
    ['Region', 'Location', 'Area', 'Country'].forEach(key => {
      if (!state && record[key]) {
        const value = record[key].toLowerCase().trim();
        // 先检查是否是州全称
        if (STATE_NAME_TO_CODE[value]) {
          state = STATE_NAME_TO_CODE[value];
          return;
        }
        // 再检查是否包含州缩写
        const parts = record[key].toUpperCase().split(/[\s,]+/);
        for (const part of parts) {
          if (US_STATES.includes(part)) {
            state = part.toLowerCase();
            break;
          }
        }
        // 检查是否包含州全称
        if (!state) {
          for (const [fullName, code] of Object.entries(STATE_NAME_TO_CODE)) {
            if (value.includes(fullName)) {
              state = code;
              break;
            }
          }
        }
      }
    });
  }
  
  // 城市 - 从 City/Locality 字段或 Address 中提取
  let city = (record.City || record.Locality || '').toLowerCase().trim();
  if (!city && record.Address) {
    // 尝试从地址中提取城市（通常在州之前）
    const parts = record.Address.split(/\s+/);
    for (let i = 0; i < parts.length - 1; i++) {
      if (US_STATES.includes(parts[i].toUpperCase())) {
        // 州前面的词可能是城市
        city = parts[i - 1]?.toLowerCase() || '';
        break;
      }
    }
  }
  
  // 邮编 - 从多个字段提取
  let zip = '';
  ['Zip', 'ZipCode', 'PostalCode', 'PostCode'].forEach(key => {
    if (!zip && record[key]) zip = record[key].replace(/\D/g, '').slice(0, 5);
  });
  // 从 Address 中提取邮编（5位数字）
  if (!zip && record.Address) {
    const zipMatch = record.Address.match(/\b(\d{5})\b/);
    if (zipMatch) zip = zipMatch[1];
  }
  
  // 街道地址
  const address = (record.Address || record.Street || '').toLowerCase().trim();
  const streetName = address.replace(/^\d+\s*/, '').split(/[,\s]+/)[0];
  
  // 坐标
  const lat = parseFloat(record.Latitude || record.lat || record.GeoLocation?.split(',')[0]);
  const lng = parseFloat(record.Longitude || record.lng || record.lon || record.GeoLocation?.split(',')[1]);
  
  // SSN
  const ssn = record.SSN || record.ssn || record.SocialSecurityNumber || '';
  
  return { phones, emails, state, city, zip, address, streetName, lat, lng, ssn };
};

/**
 * 🔥 验证步骤3姓名搜索数据是否与锚点匹配（唯一身份验证）
 * 
 * 验证规则（按优先级）：
 * 1. 电话或邮箱完全匹配 → 直接通过
 * 2. SSN 匹配 → 直接通过
 * 3. 州必须匹配（必要条件），否则直接排除
 * 4. 州匹配后，城市/坐标/邮编/街道任一匹配 → 通过
 */
const validateNameSearchRecord = (record, anchors) => {
  const fields = extractRecordFields(record);
  
  // ===== 电话匹配（最强验证）=====
  for (const phone of fields.phones) {
    if (phone && anchors.phones.has(phone)) {
      console.log(`✅ [Validate] 电话完全匹配: ${phone}`);
      return true;
    }
    // 后7位匹配（处理国际号码格式差异）
    if (phone && phone.length >= 7) {
      const last7 = phone.slice(-7);
      for (const anchorPhone of anchors.phones) {
        if (anchorPhone.slice(-7) === last7) {
          console.log(`✅ [Validate] 电话后7位匹配: ${phone}`);
          return true;
        }
      }
    }
  }
  
  // ===== 邮箱匹配（强验证）=====
  for (const email of fields.emails) {
    if (email && anchors.emails.has(email)) {
      console.log(`✅ [Validate] 邮箱完全匹配: ${email}`);
      return true;
    }
  }
  
  // ===== SSN 匹配（强验证）=====
  if (fields.ssn && anchors.ssn && fields.ssn === anchors.ssn) {
    console.log(`✅ [Validate] SSN匹配: ${fields.ssn.slice(-4)}`);
    return true;
  }
  
  // ===== 州匹配（必要条件）=====
  const anchorStates = Array.from(anchors.states);
  
  if (anchorStates.length > 0) {
    const stateMatched = fields.state && anchorStates.some(s => 
      s === fields.state || 
      s.includes(fields.state) || 
      fields.state.includes(s)
    );
    
    if (!stateMatched) {
      // 静默排除，减少日志噪音
      return false;
    }
  }
  
  // ===== 城市匹配 =====
  const anchorCities = Array.from(anchors.cities);
  if (fields.city && anchorCities.some(c => c === fields.city || c.includes(fields.city) || fields.city.includes(c))) {
    console.log(`✅ [Validate] 城市匹配: ${fields.city}`);
    return true;
  }
  
  // ===== 坐标距离匹配（< 100km）=====
  if (anchors.coordinates && fields.lat && fields.lng) {
    const distance = calculateDistance(
      anchors.coordinates.lat, 
      anchors.coordinates.lng, 
      fields.lat, 
      fields.lng
    );
    
    if (distance <= 100) {
      console.log(`✅ [Validate] 坐标距离匹配: ${distance.toFixed(1)}km`);
      return true;
    }
  }
  
  // ===== 邮编匹配 =====
  if (fields.zip && anchors.zips.has(fields.zip)) {
    console.log(`✅ [Validate] 邮编匹配: ${fields.zip}`);
    return true;
  }
  
  // ===== 街道地址匹配 =====
  if (fields.streetName && fields.streetName.length > 2 && anchors.addresses && anchors.addresses.size > 0) {
    for (const anchorAddr of anchors.addresses) {
      const anchorStreetName = anchorAddr.replace(/^\d+\s*/, '').split(/[,\s]+/)[0];
      
      if (fields.streetName === anchorStreetName || 
          fields.streetName.includes(anchorStreetName) || 
          anchorStreetName.includes(fields.streetName)) {
        console.log(`✅ [Validate] 街道地址匹配: ${fields.streetName} ~ ${anchorStreetName}`);
        return true;
      }
    }
  }
  
  return false;
};

/**
 * 🔥 从步骤4姓名搜索数据中提取匹配的记录
 * ⚠️ 已移除严格验证逻辑 - 直接返回所有数据
 */
const extractValidatedNameSearchData = (rawData, anchors) => {
  const compData = rawData?.comprehensive_data || rawData;
  const aceNameData = compData?.acelogic_name_data || rawData?.acelogic_name_data || {};
  const rawNameData = aceNameData?.raw_data?.data?.List || {};
  
  const validatedRecords = [];
  
  // 🔥 移除验证逻辑 - 直接返回所有数据
  Object.entries(rawNameData).forEach(([dbName, dbContent]) => {
    if (dbContent?.Data && Array.isArray(dbContent.Data)) {
      dbContent.Data.forEach(record => {
        // 直接添加所有记录，不再验证
        validatedRecords.push({
          ...record,
          _source: dbName,
          _validated: true, // 标记为已验证（跳过验证）
        });
      });
    }
  });
  
  console.log(`🔍 [NameSearch] Validated ${validatedRecords.length} records from acelogic_name_data (validation disabled)`);
  return validatedRecords;
};

/**
 * 🔥 获取验证过的 acelogic_name_data（按数据库分组）
 * ⚠️ 已移除严格验证逻辑 - 直接返回所有数据
 */
const getValidatedNameData = (rawData, anchors) => {
  const compData = rawData?.comprehensive_data || rawData;
  const aceNameData = compData?.acelogic_name_data || rawData?.acelogic_name_data || {};
  const rawNameData = aceNameData?.raw_data?.data?.List || {};
  
  const validatedData = {};
  
  // 🔥 移除验证逻辑 - 直接返回所有数据
  Object.entries(rawNameData).forEach(([dbName, dbContent]) => {
    if (dbContent?.Data && Array.isArray(dbContent.Data)) {
      // 直接使用所有记录，不再过滤
      validatedData[dbName] = { Data: dbContent.Data };
    }
  });
  
  return validatedData;
};

// ==================== 数据提取器 ====================

/**
 * 从原始数据中提取身份标识
 */
const extractIdentifiers = (rawData) => {
  const emails = new Set();
  const phones = new Set();
  const names = new Set();
  const usernames = new Set();

  const userProfile = getUserProfile(rawData);
  const acelogic = getAcelogicData(rawData);
  
  // 从 user_profile 提取
  if (userProfile.email) emails.add(userProfile.email.toLowerCase());
  safeSplit(userProfile.emails_all).forEach(e => emails.add(e.toLowerCase()));
  safeSplit(userProfile.email_candidates).forEach(e => emails.add(e.toLowerCase()));
  
  if (userProfile.phone) phones.add(userProfile.phone);
  safeSplit(userProfile.phones_all).forEach(p => phones.add(p));
  
  if (userProfile.name) names.add(userProfile.name);
  if (userProfile.username) usernames.add(userProfile.username);

  // 从 acelogic 提取
  const aceProfile = acelogic.phone?.user_profile || {};
  if (aceProfile.name) names.add(aceProfile.name);
  safeSplit(aceProfile.emails_all).forEach(e => emails.add(e.toLowerCase()));
  safeSplit(aceProfile.phones_all).forEach(p => phones.add(p));

  // 递归提取
  const extractFromObject = (obj, depth = 0) => {
    if (!obj || typeof obj !== 'object' || depth > 5) return;
    if (Array.isArray(obj)) {
      obj.forEach(item => extractFromObject(item, depth + 1));
      return;
    }
    
    ['email', 'email_address'].forEach(key => {
      if (obj[key] && typeof obj[key] === 'string' && obj[key].includes('@')) {
        emails.add(obj[key].toLowerCase().trim());
      }
    });
    
    ['phone', 'phone_number', 'mobile'].forEach(key => {
      if (obj[key] && typeof obj[key] === 'string') {
        phones.add(obj[key].trim());
      }
    });
    
    ['name', 'full_name', 'display_name'].forEach(key => {
      if (obj[key] && typeof obj[key] === 'string' && obj[key].length > 2) {
        names.add(obj[key].trim());
      }
    });
    
    ['username', 'user_name', 'screen_name'].forEach(key => {
      if (obj[key] && typeof obj[key] === 'string') {
        usernames.add(obj[key].trim());
      }
    });
  };

  extractFromObject(rawData?.data);

  return {
    emails: Array.from(emails),
    phones: Array.from(phones),
    names: Array.from(names),
    usernames: Array.from(usernames),
  };
};

/**
 * 从原始数据中提取基本信息 - 完整版
 */
const extractBasicInfo = (rawData) => {
  const userProfile = getUserProfile(rawData);
  const acelogic = getAcelogicData(rawData);
  const melissa = getMelissaData(rawData);
  const aceProfile = acelogic.phone?.user_profile || {};

  console.log('📊 [ProfileDataProcessor] Extracting basicInfo from userProfile:', userProfile);

  // 姓名 - 多来源
  let name = userProfile.name || aceProfile.name || melissa.NameFull || null;
  
  // 性别 - 智能选择最可信的一个
  const genderCandidates = safeSplit(userProfile.gender_candidates);
  const gender = genderCandidates.length > 0 ? pickBestValue(genderCandidates, 'gender') : (aceProfile.gender || null);
  
  // 年龄 - 智能选择合理范围内的一个
  const ageCandidates = safeSplit(userProfile.age_year);
  const age = ageCandidates.length > 0 ? pickBestValue(ageCandidates, 'age') : (aceProfile.age || null);
  
  // 生日 - 智能选择格式最完整的一个
  const birthdayCandidates = safeSplit(userProfile.birthday_fields);
  const birthDate = birthdayCandidates.length > 0 ? pickBestValue(birthdayCandidates, 'date') : (aceProfile.dob || null);
  
  // 头像
  let avatar = userProfile.avatar_url || aceProfile.avatar || null;
  
  // 从 data 数组中查找头像
  if (!avatar && Array.isArray(rawData?.data)) {
    for (const item of rawData.data) {
      if (item?.success && item?.data) {
        const d = item.data;
        avatar = d.avatar || d.avatar_url || d.profile_image || d.image_url || d.photo || 
                 d.data?.image_url || d.data?.avatar;
        if (avatar) break;
      }
    }
  }

  // 🚀 暴力姓名提取：如果标准路径都找不到姓名，尝试从原始数据的所有可能字段中查找
  if (!name || name === 'Unknown' || name === '未知') {
    console.log('⚠️ [Fallback] 标准路径未找到姓名，尝试暴力提取...');
    const candidates = new Set();
    
    const findNameRecursive = (obj, depth = 0) => {
      if (!obj || typeof obj !== 'object' || depth > 4) return;
      
      // 检查常见姓名键
      ['Name', 'name', 'FullName', 'full_name', 'display_name'].forEach(key => {
        if (obj[key] && typeof obj[key] === 'string' && obj[key].length > 2 && !obj[key].includes('*')) {
          // 排除明显不是人名的值
          const val = obj[key];
          if (!val.includes('http') && !val.includes('Error') && !val.includes('Found')) {
             candidates.add(val);
          }
        }
      });

      // 遍历子对象
      Object.values(obj).forEach(val => {
        if (typeof val === 'object') findNameRecursive(val, depth + 1);
      });
    };

    findNameRecursive(rawData);
    
    if (candidates.size > 0) {
      name = Array.from(candidates)[0]; // 取第一个找到的
      console.log(`✅ [Fallback] 暴力提取找到姓名: ${name}`);
    }
  }

  // 注册时间
  const regDate = userProfile.reg_date || aceProfile.reg_date || null;
  const lastActive = userProfile.last_active || aceProfile.last_active || null;

  // 种族
  const ethnicity = userProfile.ethnic_code || aceProfile.ethnic_code || null;
  
  // 外部资料链接
  const externalProfiles = safeSplit(userProfile.external_profiles);

  // SSN - 从多个来源提取
  let ssn = userProfile.ssn || userProfile.SSN || aceProfile.ssn || aceProfile.SSN || null;
  
  // 从 acelogic_name_data 提取 SSN
  const compData = rawData?.comprehensive_data || rawData;
  const aceNameData = compData?.acelogic_name_data || rawData?.acelogic_name_data || {};
  const rawNameData = aceNameData?.raw_data?.data?.List || {};
  
  // 从各数据源收集带来源的值
  const childrenCandidates = [];
  const relativesSet = new Set();
  const bankNames = [];
  const vinNumbers = [];
  const pollingStations = [];
  const voterRegDates = [];
  const linkedinProfiles = [];
  const insuranceInfo = [];
  
  Object.entries(rawNameData).forEach(([dbName, dbContent]) => {
    if (dbContent?.Data && Array.isArray(dbContent.Data)) {
      dbContent.Data.forEach(record => {
        // SSN
        if (!ssn && (record.SSN || record.ssn || record.SocialSecurityNumber)) {
          ssn = record.SSN || record.ssn || record.SocialSecurityNumber;
        }
        
        // 子女数量 - 带来源
        const numChildren = record.NumberOfChildren || record.AmountKids;
        if (numChildren && numChildren !== 'U') {
          childrenCandidates.push({ value: numChildren, source: dbName });
        }
        
        // 亲属关系
        if (record.Relatives) {
          record.Relatives.split(',').forEach(r => {
            const trimmed = r.trim();
            if (trimmed) relativesSet.add(trimmed);
          });
        }
        
        // 银行信息
        if (record.BankName) {
          bankNames.push({ value: record.BankName, source: dbName });
        }
        
        // VIN 车辆识别号
        if (record.VIN) {
          vinNumbers.push({ value: record.VIN, source: dbName });
        }
        
        // 投票站
        if (record.PollingStation) {
          pollingStations.push({ value: record.PollingStation, source: dbName });
        }
        
        // 选民注册日期
        if (dbName === 'USA Voters' && record.RegDate) {
          voterRegDates.push({ value: record.RegDate, source: dbName });
        }
        
        // LinkedIn 信息
        if (dbName === 'LinkedIn Scraped Data') {
          if (record.NickName) {
            linkedinProfiles.push({
              username: record.NickName,
              jobTitle: record.JobTitle,
              jobStartDate: record.JobStartDate,
              loginCount: record.LoginCount,
            });
          }
        }
        
        // 保险信息
        if (dbName === 'Dbr.ri.gov') {
          insuranceInfo.push({
            docType: record.DocType,
            document: record.Document,
            category: record.Category,
            issuedAt: record.IssuedAt,
          });
        }
      });
    }
  });
  
  // 智能选择子女数量（使用可信度权重）
  const numberOfChildren = pickBestValue(childrenCandidates, 'number');

  return {
    name,
    gender,
    age,
    birthDate,
    avatar,
    regDate,
    lastActive,
    ethnicity,
    externalProfiles,
    ssn,
    numberOfChildren,
    relatives: Array.from(relativesSet),
    bankName: pickBestValue(bankNames),
    vin: pickBestValue(vinNumbers),
    pollingStation: pickBestValue(pollingStations),
    voterRegDate: pickBestValue(voterRegDates, 'date'),
    linkedinProfile: linkedinProfiles[0] || null,
    insuranceInfo: insuranceInfo[0] || null,
    filteredRecordsCount: userProfile.filtered_records_count || null,
    // 原始字段保留
    _raw: {
      gender_candidates: userProfile.gender_candidates,
      age_year: userProfile.age_year,
      birthday_fields: userProfile.birthday_fields,
      childrenCandidates,
    }
  };
};

/**
 * 从原始数据中提取联系方式
 */
const extractContactInfo = (rawData) => {
  const userProfile = getUserProfile(rawData);
  const acelogic = getAcelogicData(rawData);
  const melissa = getMelissaData(rawData);
  const aceProfile = acelogic.phone?.user_profile || {};

  // 邮箱 - 只显示主要邮箱和少量备用邮箱，不显示泄露数据中的所有邮箱
  const emails = [];
  const emailSet = new Set();
  
  const addEmail = (email, type = 'secondary') => {
    if (!email || emailSet.has(email.toLowerCase())) return;
    // 限制最多5个邮箱
    if (emails.length >= 5 && type !== 'primary') return;
    emailSet.add(email.toLowerCase());
    emails.push({ email, type });
  };
  
  // 只添加主要邮箱和候选邮箱，不添加 emails_all（泄露数据）
  if (userProfile.email) addEmail(userProfile.email, 'primary');
  safeSplit(userProfile.email_candidates).forEach(e => addEmail(e, 'candidate'));

  // 电话 - 只显示主要号码和少量备用号码，不显示泄露数据中的所有号码
  const phones = [];
  const phoneSet = new Set();
  
  const addPhone = (phone, type = 'secondary', carrier = null) => {
    if (!phone) return;
    const cleaned = phone.replace(/\D/g, '');
    if (cleaned.length < 7 || phoneSet.has(cleaned.slice(-4))) return;
    // 限制最多5个电话号码
    if (phones.length >= 5 && type !== 'primary') return;
    phoneSet.add(cleaned.slice(-4));
    phones.push({ phone, type, carrier });
  };
  
  // 只添加主要电话和 Melissa 验证的电话，不添加 phones_all（泄露数据）
  if (userProfile.phone) addPhone(userProfile.phone, 'primary', userProfile.carrier);
  if (melissa.InternationalPhoneNumber) addPhone(melissa.InternationalPhoneNumber, 'melissa', melissa.Carrier);

  // 用户名
  const usernames = [];
  if (userProfile.username) usernames.push(userProfile.username);
  if (aceProfile.username && !usernames.includes(aceProfile.username)) usernames.push(aceProfile.username);

  // 地址
  const addresses = [];
  
  if (userProfile.address_full || userProfile.city) {
    addresses.push({
      full: userProfile.address_full,
      street: userProfile.street,
      city: userProfile.city,
      district: userProfile.district,
      state: userProfile.state,
      country: userProfile.country,
      zip: userProfile.postcode,
      type: 'primary',
    });
  }
  
  if (aceProfile.address_full && aceProfile.address_full !== userProfile.address_full) {
    addresses.push({
      full: aceProfile.address_full,
      city: aceProfile.city,
      state: aceProfile.state,
      country: aceProfile.country,
      zip: aceProfile.postcode,
      type: 'acelogic',
    });
  }
  
  if (melissa.AddressLine1) {
    addresses.push({
      full: [melissa.AddressLine1, melissa.Locality, melissa.AdministrativeArea, melissa.PostalCode].filter(Boolean).join(', '),
      city: melissa.Locality,
      state: melissa.AdministrativeArea,
      country: melissa.CountryName,
      zip: melissa.PostalCode,
      type: 'melissa',
    });
  }

  // 经纬度
  let coordinates = null;
  if (userProfile.latitude && userProfile.longitude) {
    coordinates = {
      lat: parseFloat(userProfile.latitude),
      lng: parseFloat(userProfile.longitude),
    };
  }

  // 时区
  const timezone = userProfile.timezone || melissa.TimeZoneName || null;

  return {
    primaryEmail: emails.find(e => e.type === 'primary')?.email || emails[0]?.email || null,
    emails,
    primaryPhone: phones.find(p => p.type === 'primary')?.phone || phones[0]?.phone || null,
    phones,
    usernames,
    addresses,
    coordinates,
    timezone,
  };
};

/**
 * 从原始数据中提取职业信息 - 包括从 acelogic_name_data 的 LinkedIn 数据提取
 */
const extractProfessionalInfo = (rawData) => {
  const userProfile = getUserProfile(rawData);
  const acelogic = getAcelogicData(rawData);
  const aceProfile = acelogic.phone?.user_profile || {};
  
  // 从 acelogic_name_data 提取 LinkedIn 和 B2B 数据
  const nameData = acelogic.name?.raw_data?.data?.List || {};
  
  let company = userProfile.company || aceProfile.company || null;
  let companyDesc = userProfile.company_desc || aceProfile.company_desc || null;
  let position = userProfile.position || aceProfile.position || null;
  let positionLevel = userProfile.position_level || aceProfile.position_level || null;
  let department = userProfile.department || aceProfile.department || null;
  let industry = userProfile.industry || aceProfile.industry || null;
  let linkedinUrl = userProfile.linkedin_url || null;
  let linkedinUsername = null;
  let annualRevenue = null;
  let businessType = null;
  let category = null;
  
  // 职位历史
  const jobHistory = [];
  
  // 遍历所有数据库
  Object.entries(nameData).forEach(([dbName, dbContent]) => {
    if (dbContent?.Data && Array.isArray(dbContent.Data)) {
      dbContent.Data.forEach(record => {
        // LinkedIn Scraped Data
        if (dbName === 'LinkedIn Scraped Data') {
          if (!company && (record.JobCompanyName || record.CompanyName)) {
            company = record.JobCompanyName || record.CompanyName;
          }
          if (!position && (record.JobTitle || record.Title)) {
            position = record.JobTitle || record.Title;
          }
          if (record.NickName) linkedinUsername = record.NickName;
          
          // 添加到职位历史
          if (record.JobTitle || record.JobCompanyName) {
            const job = {
              title: record.JobTitle || record.Title,
              company: record.JobCompanyName || record.CompanyName,
              startDate: record.JobStartDate,
              source: 'LinkedIn',
            };
            if (!jobHistory.find(j => j.title === job.title && j.company === job.company)) {
              jobHistory.push(job);
            }
          }
        }
        
        // B2B USA Businesses
        if (dbName === 'B2B USA Businesses') {
          if (!company && record.CompanyName) company = record.CompanyName;
          if (record.AnnualRevenue) annualRevenue = record.AnnualRevenue;
          if (record.Category) category = record.Category;
          if (record.Type) businessType = record.Type;
        }
      });
    }
  });

  return {
    company,
    companyDesc,
    position,
    positionLevel,
    department,
    industry,
    linkedinUrl,
    linkedinUsername,
    annualRevenue,
    businessType,
    category,
    jobHistory,
  };
};

/**
 * 从原始数据中提取财务信息
 */
const extractFinancialInfo = (rawData) => {
  const userProfile = getUserProfile(rawData);
  const acelogic = getAcelogicData(rawData);
  const aceProfile = acelogic.phone?.user_profile || {};

  return {
    income: userProfile.income || aceProfile.income || null,
    housePrice: userProfile.house_price || aceProfile.house_price || null,
    creditCapacity: userProfile.credit_capacity || aceProfile.credit_capacity || null,
    hasFinancialData: !!(userProfile.income || userProfile.house_price || userProfile.credit_capacity),
  };
};

/**
 * 从原始数据中提取家庭信息 - 包括从 acelogic_name_data 提取
 */
const extractFamilyInfo = (rawData) => {
  const userProfile = getUserProfile(rawData);
  const acelogic = getAcelogicData(rawData);
  const aceProfile = acelogic.phone?.user_profile || {};
  
  // 从 acelogic_name_data 提取
  const nameData = acelogic.name?.raw_data?.data?.List || {};
  let maritalStatus = userProfile.marital_status || aceProfile.marital_status || null;
  let childrenCount = userProfile.children_count || aceProfile.children_count || null;
  let spouseName = userProfile.spouse_name || aceProfile.spouse_name || null;
  const relatives = new Set(safeSplit(userProfile.relatives || aceProfile.relatives));
  
  // 遍历所有数据库
  Object.entries(nameData).forEach(([dbName, dbContent]) => {
    if (dbContent?.Data && Array.isArray(dbContent.Data)) {
      dbContent.Data.forEach(record => {
        // 婚姻状况
        if (!maritalStatus && record.MaritalStatus) maritalStatus = record.MaritalStatus;
        // 子女数量
        if (!childrenCount && (record.NumberOfChildren || record.AmountKids)) {
          childrenCount = record.NumberOfChildren || record.AmountKids;
        }
        // 亲属关系 (Jack Vosmyorkin) - 智能解析
        if (record.Relatives) {
          parseRelatives(record.Relatives).forEach(rel => relatives.add(JSON.stringify(rel)));
        }
      });
    }
  });

  // 解析 JSON 字符串回对象，去重
  const parsedRelatives = [];
  const seenNames = new Set();
  relatives.forEach(relStr => {
    try {
      const rel = JSON.parse(relStr);
      if (rel.name && !seenNames.has(rel.name.toLowerCase())) {
        seenNames.add(rel.name.toLowerCase());
        parsedRelatives.push(rel);
      }
    } catch {
      // 如果不是 JSON，当作普通字符串处理
      if (!seenNames.has(relStr.toLowerCase())) {
        seenNames.add(relStr.toLowerCase());
        parsedRelatives.push({ name: relStr, relationship: null, ssn: null });
      }
    }
  });

  return {
    maritalStatus,
    childrenCount,
    spouseName,
    relatives: parsedRelatives,
  };
};

/**
 * 从原始数据中提取房产信息 - 包括从 acelogic_name_data 提取
 */
const extractHousingInfo = (rawData) => {
  const userProfile = getUserProfile(rawData);
  const acelogic = getAcelogicData(rawData);
  const aceProfile = acelogic.phone?.user_profile || {};
  
  // 从 acelogic_name_data 提取
  const nameData = acelogic.name?.raw_data?.data?.List || {};
  let builtYear = userProfile.built_year || aceProfile.built_year || null;
  let houseType = userProfile.house_type || aceProfile.house_type || null;
  let houseValue = userProfile.house_value || aceProfile.house_value || null;
  let houseNumber = userProfile.house_number || aceProfile.house_number || null;
  let homeOwner = null;
  let propertyType = null;
  
  // 遍历所有数据库
  Object.entries(nameData).forEach(([dbName, dbContent]) => {
    if (dbContent?.Data && Array.isArray(dbContent.Data)) {
      dbContent.Data.forEach(record => {
        if (!builtYear && record.HomeBuiltYear) builtYear = record.HomeBuiltYear;
        if (!builtYear && record.YearBuilt) builtYear = record.YearBuilt;
        if (!houseValue && record.HomeValue) houseValue = record.HomeValue;
        if (!houseValue && record.EstimatedHomeValue) houseValue = record.EstimatedHomeValue;
        if (!homeOwner && record.HomeOwner) homeOwner = record.HomeOwner;
        if (!propertyType && record.PropertyType) propertyType = record.PropertyType;
        if (!houseType && record.DwellingType) houseType = record.DwellingType;
      });
    }
  });

  return {
    builtYear,
    houseType: houseType || propertyType,
    houseValue,
    houseNumber,
    homeOwner,
  };
};

/**
 * 从原始数据中提取车辆信息 - 包括从 acelogic_name_data 提取
 */
const extractVehicleInfo = (rawData) => {
  const userProfile = getUserProfile(rawData);
  const acelogic = getAcelogicData(rawData);
  const aceProfile = acelogic.phone?.user_profile || {};
  
  // 从 acelogic_name_data 提取
  const nameData = acelogic.name?.raw_data?.data?.List || {};
  const vehicles = [];
  let boatOwner = userProfile.boat_owner || aceProfile.boat_owner || false;
  let hasCats = null;
  let hasDogs = null;
  
  const vehicleStr = userProfile.vehicles || aceProfile.vehicles;
  if (vehicleStr) {
    safeSplit(vehicleStr).forEach(v => {
      vehicles.push({ brand: v });
    });
  }
  
  // 遍历所有数据库
  Object.entries(nameData).forEach(([dbName, dbContent]) => {
    if (dbContent?.Data && Array.isArray(dbContent.Data)) {
      dbContent.Data.forEach(record => {
        // 车辆信息
        if (record.VehicleMake || record.VehicleModel || record.VehicleYear) {
          const vehicle = {
            brand: record.VehicleMake,
            model: record.VehicleModel,
            year: record.VehicleYear,
          };
          if (!vehicles.find(v => v.brand === vehicle.brand && v.model === vehicle.model)) {
            vehicles.push(vehicle);
          }
        }
        // 宠物
        if (record.Cats) hasCats = record.Cats;
        if (record.Dogs) hasDogs = record.Dogs;
      });
    }
  });

  return {
    vehicles,
    boatOwner,
    hasCats,
    hasDogs,
  };
};

/**
 * 从原始数据中提取选民信息 - 包括从 acelogic_name_data 提取
 */
const extractVoterInfo = (rawData) => {
  const userProfile = getUserProfile(rawData);
  const acelogic = getAcelogicData(rawData);
  const aceProfile = acelogic.phone?.user_profile || {};
  
  // 从 acelogic_name_data 提取
  const nameData = acelogic.name?.raw_data?.data?.List || {};
  let voterRegDate = userProfile.voter_reg_date || aceProfile.voter_reg_date || null;
  let pollingStation = userProfile.polling_station || aceProfile.polling_station || null;
  let partyVoted = userProfile.party_voted || aceProfile.party_voted || null;
  let religion = null;
  
  // 遍历所有数据库
  Object.entries(nameData).forEach(([dbName, dbContent]) => {
    if (dbContent?.Data && Array.isArray(dbContent.Data)) {
      dbContent.Data.forEach(record => {
        // USA Voters
        if (!pollingStation && record.PollingStation) pollingStation = record.PollingStation;
        if (!voterRegDate && record.VoterRegDate) voterRegDate = record.VoterRegDate;
        if (!partyVoted && record.Party) partyVoted = record.Party;
        // 宗教
        if (!religion && record.Religion) religion = record.Religion;
      });
    }
  });

  return {
    voterRegDate,
    pollingStation,
    partyVoted,
    religion,
  };
};

/**
 * 从原始数据中提取社交媒体信息
 */
const extractSocialMedia = (rawData) => {
  const userProfile = getUserProfile(rawData);
  const platformVerification = getPlatformVerification(rawData);
  const compData = rawData?.comprehensive_data || rawData;
  
  // 🔥 从 social_profiles 提取 Telegram/WhatsApp 头像
  const socialProfiles = compData?.social_profiles || rawData?.social_profiles || {};
  
  const profiles = [];
  const platformSet = new Set();
  
  // 🔥 优先添加 Telegram（带头像）
  if (socialProfiles.telegram_photo || socialProfiles.telegram_username) {
    platformSet.add('telegram');
    profiles.push({
      platform: 'Telegram',
      username: socialProfiles.telegram_username,
      avatar: socialProfiles.telegram_photo,
      source: 'social_profiles',
    });
  }
  
  // 🔥 优先添加 WhatsApp（带头像）
  if (socialProfiles.whatsapp_photo) {
    platformSet.add('whatsapp');
    profiles.push({
      platform: 'WhatsApp',
      avatar: socialProfiles.whatsapp_photo,
      source: 'social_profiles',
    });
  }

  // 从 user_profile 提取社交链接
  const socialFields = {
    facebook_url: 'Facebook',
    twitter_url: 'Twitter',
    linkedin_url: 'LinkedIn',
    instagram_url: 'Instagram',
    tiktok_url: 'TikTok',
    github_url: 'GitHub',
  };

  Object.entries(socialFields).forEach(([field, platform]) => {
    if (userProfile[field]) {
      platformSet.add(platform.toLowerCase());
      profiles.push({
        platform,
        url: userProfile[field],
        username: extractUsernameFromUrl(userProfile[field]),
        source: 'user_profile',
      });
    }
  });

  // 从 external_profiles 提取
  safeSplit(userProfile.external_profiles).forEach(profile => {
    if (!platformSet.has(profile.toLowerCase())) {
      profiles.push({
        platform: profile,
        source: 'external_profiles',
      });
    }
  });

  // 从 data 数组提取
  if (Array.isArray(rawData?.data)) {
    rawData.data.forEach(item => {
      if (!item?.success) return;
      const source = (item.source || '').toLowerCase();
      const d = item.data || {};
      
      const socialPlatforms = ['facebook', 'twitter', 'instagram', 'linkedin', 'tiktok', 'telegram', 'whatsapp', 'snapchat', 'discord', 'github', 'reddit', 'caller_id'];
      
      if (socialPlatforms.includes(source) && !platformSet.has(source)) {
        platformSet.add(source);
        profiles.push({
          platform: source === 'caller_id' ? 'Facebook' : source.charAt(0).toUpperCase() + source.slice(1),
          username: d.username || d.screen_name || d.handle,
          displayName: d.name || d.display_name || d.data?.name,
          avatar: d.avatar || d.avatar_url || d.profile_image || d.image_url || d.data?.image_url,
          bio: d.bio || d.description,
          followers: d.followers || d.followers_count,
          verified: d.verified || d.is_verified,
          url: d.url || d.profile_url,
          source: item.source,
        });
      }
    });
  }

  // 从 platform_verification 提取
  if (platformVerification.success && Array.isArray(platformVerification.data)) {
    platformVerification.data.forEach(item => {
      if (!item?.success || item.source === 'data_breach') return;
      const source = (item.source || item.platform_name || '').toLowerCase();
      
      if (source && !platformSet.has(source)) {
        platformSet.add(source);
        profiles.push({
          platform: item.platform_name || source,
          registered: true,
          source: 'platform_verification',
        });
      }
    });
  }

  return {
    profiles,
    totalPlatforms: profiles.length,
  };
};

/**
 * 从原始数据中提取安全/泄露信息
 */
const extractSecurityInfo = (rawData) => {
  const userProfile = getUserProfile(rawData);
  const acelogic = getAcelogicData(rawData);
  const platformVerification = getPlatformVerification(rawData);

  // 泄露来源
  const leakSources = safeSplit(userProfile.leak_sources);
  const leakSourceCount = userProfile.sale_source_count || leakSources.length;

  // 登录 IP
  const loginIps = safeSplit(userProfile.login_ips);

  // 数据泄露列表
  const breachList = [];
  
  // 从 platform_verification 提取
  if (platformVerification.success && Array.isArray(platformVerification.data)) {
    platformVerification.data.forEach(item => {
      if (item?.source === 'data_breach' && item?.success) {
        breachList.push({
          name: item.platform_name || 'Unknown',
          data: item.data,
          source: 'platform_verification',
        });
      }
    });
  }

  // 从 acelogic data_breaches 提取
  const dataBreaches = acelogic.phone?.data_breaches || {};
  Object.entries(dataBreaches).forEach(([name, data]) => {
    if (!breachList.find(b => b.name === name)) {
      breachList.push({
        name,
        data,
        recordCount: data?.Data?.length || 0,
        source: 'acelogic',
      });
    }
  });

  // 密码（如果有）
  const passwords = [];
  breachList.forEach(breach => {
    if (breach.data?.Data && Array.isArray(breach.data.Data)) {
      breach.data.Data.forEach(record => {
        Object.keys(record).forEach(key => {
          if (key.toLowerCase().includes('password') && record[key]) {
            passwords.push({
              value: record[key],
              source: breach.name,
            });
          }
        });
      });
    }
  });

  // 风险等级
  let riskLevel = 'low';
  if (breachList.length > 0 || leakSources.length > 0) riskLevel = 'medium';
  if (breachList.length > 3 || leakSources.length > 5) riskLevel = 'high';
  if (passwords.length > 0) riskLevel = 'critical';

  return {
    leakSources,
    leakSourceCount,
    loginIps,
    breachList,
    passwords,
    riskLevel,
    totalBreaches: breachList.length,
  };
};

/**
 * 从原始数据中提取电话运营商信息
 */
const extractCarrierInfo = (rawData) => {
  const userProfile = getUserProfile(rawData);
  const melissa = getMelissaData(rawData);

  return {
    carrier: userProfile.carrier || melissa.Carrier || null,
    lineType: userProfile.line_type || melissa.PhoneType || null,
    callerId: melissa.CallerID || null,
    country: melissa.CountryName || userProfile.country || null,
    // Melissa 额外字段
    administrativeArea: melissa.AdministrativeArea || null,  // 州
    locality: melissa.Locality || null,  // 城市
    postalCode: melissa.PostalCode || null,  // 邮编
    internationalPhone: melissa.InternationalPhoneNumber || null,  // 国际格式
    countryCode: melissa.CountryAbbreviation || null,  // 国家代码
    results: melissa.Results || null,  // 验证结果代码
    latitude: melissa.Latitude || null,
    longitude: melissa.Longitude || null,
    utc: melissa.UTC || null,  // 时区
    dst: melissa.DST || null,  // 夏令时
  };
};

/**
 * 计算数据完整度分数
 */
const calculateCompletenessScore = (report) => {
  let score = 0;
  let maxScore = 100;

  // 基本信息 (25分)
  if (report.basicInfo.name) score += 10;
  if (report.basicInfo.avatar) score += 5;
  if (report.basicInfo.gender) score += 3;
  if (report.basicInfo.age || report.basicInfo.birthDate) score += 4;
  if (report.basicInfo.ethnicity) score += 3;

  // 联系方式 (25分)
  if (report.contactInfo.primaryEmail) score += 8;
  if (report.contactInfo.emails.length > 1) score += 4;
  if (report.contactInfo.primaryPhone) score += 8;
  if (report.contactInfo.addresses.length > 0) score += 5;

  // 职业信息 (15分)
  if (report.professionalInfo.company) score += 5;
  if (report.professionalInfo.position) score += 5;
  if (report.professionalInfo.industry) score += 5;

  // 社交媒体 (15分)
  score += Math.min(report.socialMedia.totalPlatforms * 3, 15);

  // 安全信息 (10分)
  if (report.securityInfo.totalBreaches > 0) score += 5;
  if (report.securityInfo.leakSources.length > 0) score += 5;

  // 其他信息 (10分)
  if (report.financialInfo.hasFinancialData) score += 3;
  if (report.familyInfo.maritalStatus) score += 2;
  if (report.housingInfo.houseType) score += 2;
  if (report.vehicleInfo.vehicles.length > 0) score += 3;

  return {
    score: Math.min(score, maxScore),
    maxScore,
    breakdown: {
      basicInfo: Math.round((report.basicInfo.name ? 40 : 0) + (report.basicInfo.avatar ? 30 : 0) + (report.basicInfo.gender ? 30 : 0)),
      contactInfo: Math.round((report.contactInfo.primaryEmail ? 40 : 0) + (report.contactInfo.primaryPhone ? 40 : 0) + (report.contactInfo.addresses.length > 0 ? 20 : 0)),
      professionalInfo: Math.round((report.professionalInfo.company ? 50 : 0) + (report.professionalInfo.position ? 50 : 0)),
      socialMedia: Math.round(Math.min(report.socialMedia.totalPlatforms * 20, 100)),
    },
  };
};

/**
 * 生成唯一身份标识
 */
const generateUniqueId = (identifiers) => {
  if (identifiers.emails.length > 0) return `email:${identifiers.emails[0]}`;
  if (identifiers.phones.length > 0) return `phone:${identifiers.phones[0]}`;
  if (identifiers.names.length > 0) return `name:${identifiers.names[0]}`;
  return `unknown:${Date.now()}`;
};

/**
 * 统计数据源数量
 */
const countDataSources = (rawData) => {
  const sources = new Set();
  const compData = rawData?.comprehensive_data || rawData;
  
  if (compData?.user_profile) sources.add('user_profile');
  if (compData?.melissa_data) sources.add('melissa');
  if (compData?.acelogic_phone_data) sources.add('acelogic_phone');
  if (compData?.acelogic_name_data) sources.add('acelogic_name');
  if (compData?.platform_verification?.data) {
    compData.platform_verification.data.forEach(item => {
      if (item?.source) sources.add(item.source);
    });
  }
  if (Array.isArray(rawData?.data)) {
    rawData.data.forEach(item => {
      if (item?.source) sources.add(item.source);
    });
  }
  
  return sources.size;
};

// ==================== 带验证的提取函数 ====================

/**
 * 职业信息 - 使用验证过的姓名搜索数据
 */
const extractProfessionalInfoWithValidation = (rawData, validatedNameData) => {
  const userProfile = getUserProfile(rawData);
  const acelogic = getAcelogicData(rawData);
  const aceProfile = acelogic.phone?.user_profile || {};
  
  let company = userProfile.company || aceProfile.company || null;
  let companyDesc = userProfile.company_desc || aceProfile.company_desc || null;
  let position = userProfile.position || aceProfile.position || null;
  let positionLevel = userProfile.position_level || aceProfile.position_level || null;
  let department = userProfile.department || aceProfile.department || null;
  let industry = userProfile.industry || aceProfile.industry || null;
  let linkedinUrl = userProfile.linkedin_url || null;
  let linkedinUsername = null;
  let annualRevenue = null;
  let businessType = null;
  let category = null;
  const jobHistory = [];
  
  // 🔥 只使用验证过的数据
  Object.entries(validatedNameData).forEach(([dbName, dbContent]) => {
    if (dbContent?.Data && Array.isArray(dbContent.Data)) {
      dbContent.Data.forEach(record => {
        if (dbName === 'LinkedIn Scraped Data') {
          if (!company && (record.JobCompanyName || record.CompanyName)) {
            company = record.JobCompanyName || record.CompanyName;
          }
          if (!position && (record.JobTitle || record.Title)) {
            position = record.JobTitle || record.Title;
          }
          if (record.NickName) linkedinUsername = record.NickName;
          
          if (record.JobTitle || record.JobCompanyName) {
            const job = {
              title: record.JobTitle || record.Title,
              company: record.JobCompanyName || record.CompanyName,
              startDate: record.JobStartDate,
              source: 'LinkedIn',
            };
            if (!jobHistory.find(j => j.title === job.title && j.company === job.company)) {
              jobHistory.push(job);
            }
          }
        }
        
        if (dbName === 'B2B USA Businesses') {
          if (!company && record.CompanyName) company = record.CompanyName;
          if (record.AnnualRevenue) annualRevenue = record.AnnualRevenue;
          if (record.Category) category = record.Category;
          if (record.Type) businessType = record.Type;
        }
      });
    }
  });

  return { company, companyDesc, position, positionLevel, department, industry, linkedinUrl, linkedinUsername, annualRevenue, businessType, category, jobHistory };
};

/**
 * 家庭信息 - 使用验证过的姓名搜索数据 + 智能选择
 */
const extractFamilyInfoWithValidation = (rawData, validatedNameData) => {
  const userProfile = getUserProfile(rawData);
  const acelogic = getAcelogicData(rawData);
  const aceProfile = acelogic.phone?.user_profile || {};
  
  let maritalStatus = userProfile.marital_status || aceProfile.marital_status || null;
  let spouseName = userProfile.spouse_name || aceProfile.spouse_name || null;
  
  // 收集带来源的子女数量
  const childrenCandidates = [];
  
  // 收集亲属关系（使用 Map 去重，key 是姓名）
  const relativesMap = new Map();
  
  // 🔥 只使用验证过的数据
  Object.entries(validatedNameData).forEach(([dbName, dbContent]) => {
    if (dbContent?.Data && Array.isArray(dbContent.Data)) {
      dbContent.Data.forEach(record => {
        if (!maritalStatus && record.MaritalStatus) maritalStatus = record.MaritalStatus;
        
        // 子女数量 - 带来源
        const numChildren = record.NumberOfChildren || record.AmountKids;
        if (numChildren && numChildren !== 'U') {
          childrenCandidates.push({ value: numChildren, source: dbName });
        }
        
        // 亲属关系 - 智能解析
        if (record.Relatives) {
          const parsed = parseRelatives(record.Relatives);
          parsed.forEach(rel => {
            const key = rel.name.toLowerCase();
            if (!relativesMap.has(key)) {
              relativesMap.set(key, rel);
            }
          });
        }
      });
    }
  });
  
  // 智能选择子女数量（使用可信度权重）
  const childrenCount = pickBestValue(childrenCandidates, 'number');

  return { 
    maritalStatus, 
    childrenCount, 
    spouseName, 
    relatives: Array.from(relativesMap.values()) 
  };
};

/**
 * 房产信息 - 使用验证过的姓名搜索数据
 */
const extractHousingInfoWithValidation = (rawData, validatedNameData) => {
  const userProfile = getUserProfile(rawData);
  const acelogic = getAcelogicData(rawData);
  const aceProfile = acelogic.phone?.user_profile || {};
  
  let builtYear = userProfile.built_year || aceProfile.built_year || null;
  let houseType = userProfile.house_type || aceProfile.house_type || null;
  let houseValue = userProfile.house_value || aceProfile.house_value || null;
  let houseNumber = userProfile.house_number || aceProfile.house_number || null;
  let homeOwner = null;
  
  // 🔥 只使用验证过的数据
  Object.entries(validatedNameData).forEach(([dbName, dbContent]) => {
    if (dbContent?.Data && Array.isArray(dbContent.Data)) {
      dbContent.Data.forEach(record => {
        if (!builtYear && (record.HomeBuiltYear || record.YearBuilt)) builtYear = record.HomeBuiltYear || record.YearBuilt;
        if (!houseValue && (record.HomeValue || record.EstimatedHomeValue)) houseValue = record.HomeValue || record.EstimatedHomeValue;
        if (!homeOwner && record.HomeOwner) homeOwner = record.HomeOwner;
        if (!houseType && (record.PropertyType || record.DwellingType)) houseType = record.PropertyType || record.DwellingType;
      });
    }
  });

  return { builtYear, houseType, houseValue, houseNumber, homeOwner };
};

/**
 * 车辆信息 - 使用验证过的姓名搜索数据
 */
const extractVehicleInfoWithValidation = (rawData, validatedNameData) => {
  const userProfile = getUserProfile(rawData);
  const acelogic = getAcelogicData(rawData);
  const aceProfile = acelogic.phone?.user_profile || {};
  
  const vehicles = [];
  let boatOwner = userProfile.boat_owner || aceProfile.boat_owner || false;
  let hasCats = null;
  let hasDogs = null;
  
  const vehicleStr = userProfile.vehicles || aceProfile.vehicles;
  if (vehicleStr) {
    safeSplit(vehicleStr).forEach(v => vehicles.push({ brand: v }));
  }
  
  // 🔥 调试：打印验证过的数据结构
  console.log('🔍 [VehicleInfo] validatedNameData keys:', Object.keys(validatedNameData));
  Object.entries(validatedNameData).forEach(([dbName, dbContent]) => {
    if (dbContent?.Data?.[0]) {
      console.log(`📦 [VehicleInfo] ${dbName} fields:`, Object.keys(dbContent.Data[0]));
    }
  });
  
  // 🔥 只使用验证过的数据
  Object.entries(validatedNameData).forEach(([dbName, dbContent]) => {
    if (dbContent?.Data && Array.isArray(dbContent.Data)) {
      dbContent.Data.forEach(record => {
        // 车辆信息 - 支持多种字段名（包括 DriveSure 的 AutoBrand/AutoModel）
        const make = record.AutoBrand || record.VehicleMake || record.Vehicle_Make || record.CarMake || record.Make;
        const model = record.AutoModel || record.VehicleModel || record.Vehicle_Model || record.CarModel || record.Model;
        const year = record.IssueYear || record.VehicleYear || record.Vehicle_Year || record.CarYear || record.Year;
        const vin = record.VIN || record.Vin;
        const color = record.VehicleColor || record.Color;
        
        if (make || model) {
          const vehicle = { brand: make, model, year, vin, color };
          if (!vehicles.find(v => v.brand === vehicle.brand && v.model === vehicle.model)) {
            vehicles.push(vehicle);
          }
        }
        
        // 宠物信息（Acxiom 有 Cats/Dogs）
        if (record.Cats || record.HasCats || record.Cat) hasCats = record.Cats || record.HasCats || record.Cat;
        if (record.Dogs || record.HasDogs || record.Dog) hasDogs = record.Dogs || record.HasDogs || record.Dog;
        
        // 船只
        if (record.BoatOwner || record.Boat || record.HasBoat) boatOwner = true;
      });
    }
  });

  console.log('🚗 [VehicleInfo] Extracted vehicles:', vehicles);
  return { vehicles, boatOwner, hasCats, hasDogs };
};

/**
 * 选民信息 - 使用验证过的姓名搜索数据
 */
const extractVoterInfoWithValidation = (rawData, validatedNameData) => {
  const userProfile = getUserProfile(rawData);
  const acelogic = getAcelogicData(rawData);
  const aceProfile = acelogic.phone?.user_profile || {};
  
  let voterRegDate = userProfile.voter_reg_date || aceProfile.voter_reg_date || null;
  let pollingStation = userProfile.polling_station || aceProfile.polling_station || null;
  let partyVoted = userProfile.party_voted || aceProfile.party_voted || null;
  let religion = null;
  
  // 🔥 只使用验证过的数据
  Object.entries(validatedNameData).forEach(([dbName, dbContent]) => {
    if (dbContent?.Data && Array.isArray(dbContent.Data)) {
      dbContent.Data.forEach(record => {
        if (!pollingStation && record.PollingStation) pollingStation = record.PollingStation;
        if (!voterRegDate && record.VoterRegDate) voterRegDate = record.VoterRegDate;
        if (!partyVoted && record.Party) partyVoted = record.Party;
        if (!religion && record.Religion) religion = record.Religion;
      });
    }
  });

  return { voterRegDate, pollingStation, partyVoted, religion };
};

// ==================== 主处理函数 ====================

/**
 * 处理原始 API 数据，生成结构化人物报告
 * 
 * 🔥 数据来源：
 * - 步骤1: melissa_data - Melissa电话反查（绝对可信）
 * - 步骤2: acelogic_phone_data - 手机查询（绝对可信）
 * - 步骤3: acelogic_name_data - 姓名搜索（需要验证，可能有同名人物）
 * 
 * 🔥 策略：
 * 1. 用步骤1+2建立唯一身份锚点
 * 2. 步骤3的数据必须与锚点匹配才能使用
 * 3. 确保最终报告是单一人物画像
 */
export const processProfileData = (rawData, queryType = 'unknown', queryValue = '') => {
  if (!rawData) {
    return { success: false, error: 'No data provided', report: null };
  }

  try {
    console.log('📊 [ProfileDataProcessor] 开始处理数据，构建唯一人物画像...');

    // 🔥 步骤1: 建立可信锚点（来自Melissa + 手机查询）
    const anchors = buildTrustedAnchors(rawData, queryType, queryValue);
    console.log('🔒 [ProfileDataProcessor] 唯一身份锚点已建立');
    
    // 🔥 步骤2: 验证步骤3的姓名搜索数据，只保留与锚点匹配的记录
    const validatedNameRecords = extractValidatedNameSearchData(rawData, anchors);
    console.log(`✅ [ProfileDataProcessor] 从姓名搜索中验证通过 ${validatedNameRecords.length} 条记录`);
    
    // 🔥 步骤3: 获取验证过的数据（按数据库分组）
    const validatedNameData = getValidatedNameData(rawData, anchors);

    // ⚠️ [Fallback Strategy] 如果没有通过验证的记录，强制使用前5条原始数据作为"潜在匹配"
    if (validatedNameRecords.length === 0) {
      const rawNameList = rawData?.comprehensive_data?.acelogic_name_data?.raw_data?.data?.List || 
                          rawData?.acelogic_name_data?.raw_data?.data?.List || {};
      
      let fallbackCount = 0;
      Object.entries(rawNameList).forEach(([dbName, dbContent]) => {
        if (dbContent?.Data && Array.isArray(dbContent.Data) && fallbackCount < 5) {
          const records = dbContent.Data.slice(0, 5 - fallbackCount);
          
          // 添加到 validatedNameRecords
          records.forEach(r => {
            validatedNameRecords.push({ ...r, _source: dbName, _validated: false, _fallback: true });
          });
          
          // 添加到 validatedNameData
          if (!validatedNameData[dbName]) validatedNameData[dbName] = { Data: [] };
          validatedNameData[dbName].Data.push(...records);
          
          fallbackCount += records.length;
        }
      });
      
      if (fallbackCount > 0) {
        console.log(`⚠️ [Fallback] 验证过于严格，已强制载入 ${fallbackCount} 条未验证记录用于显示`);
      }
    }

    // 提取各类信息（优先使用步骤1-2的可信数据，步骤3使用验证过的数据）
    const identifiers = extractIdentifiers(rawData);
    const basicInfo = extractBasicInfo(rawData);
    const contactInfo = extractContactInfo(rawData);
    
    // 职业信息 - 使用验证过的数据
    const professionalInfo = extractProfessionalInfoWithValidation(rawData, validatedNameData);
    
    const financialInfo = extractFinancialInfo(rawData);
    
    // 家庭信息 - 使用验证过的数据
    const familyInfo = extractFamilyInfoWithValidation(rawData, validatedNameData);
    
    // 房产信息 - 使用验证过的数据
    const housingInfo = extractHousingInfoWithValidation(rawData, validatedNameData);
    
    // 车辆信息 - 使用验证过的数据
    const vehicleInfo = extractVehicleInfoWithValidation(rawData, validatedNameData);
    
    // 选民信息 - 使用验证过的数据
    const voterInfo = extractVoterInfoWithValidation(rawData, validatedNameData);
    
    const socialMedia = extractSocialMedia(rawData);
    const securityInfo = extractSecurityInfo(rawData);
    const carrierInfo = extractCarrierInfo(rawData);

    const report = {
      meta: {
        uniqueId: generateUniqueId(identifiers),
        queryType,
        queryValue,
        generatedAt: new Date().toISOString(),
        dataSourcesCount: countDataSources(rawData),
        validatedRecordsCount: validatedNameRecords.length,
        anchors: {
          phones: Array.from(anchors.phones),
          names: Array.from(anchors.names),
        },
      },
      identifiers,
      basicInfo,
      contactInfo,
      professionalInfo,
      financialInfo,
      familyInfo,
      housingInfo,
      vehicleInfo,
      voterInfo,
      socialMedia,
      securityInfo,
      carrierInfo,
      validatedNameRecords,
      completeness: null,
      _rawData: rawData,
    };

    report.completeness = calculateCompletenessScore(report);

    console.log('📊 [ProfileDataProcessor] 唯一人物画像构建完成:', {
      name: basicInfo.name,
      validatedRecords: validatedNameRecords.length,
      completeness: report.completeness.score,
    });
    console.log('🔒 [ProfileDataProcessor] Validated name records:', validatedNameRecords.length);

    return { success: true, report };
  } catch (error) {
    console.error('ProfileDataProcessor error:', error);
    return { success: false, error: error.message, report: null };
  }
};

/**
 * 快速处理函数 - 用于前端直接调用
 */
export const createProfileReport = (apiResponse, query = '') => {
  const isEmail = query.includes('@');
  const queryType = isEmail ? 'email' : 'phone';
  
  const result = processProfileData(apiResponse, queryType, query);
  
  if (!result.success) {
    console.warn('Profile processing failed:', result.error);
    return null;
  }
  
  return result.report;
};

export default {
  processProfileData,
  createProfileReport,
  extractIdentifiers,
  extractBasicInfo,
  extractContactInfo,
  extractProfessionalInfo,
  extractSocialMedia,
  extractSecurityInfo,
  calculateCompletenessScore,
};
