import React, { useEffect, useRef } from 'react';
import { ArrowLeft, Shield, User, Phone, MapPin, Calendar, FileText, AlertTriangle, Briefcase, Database, Globe, Lock, Mail, DollarSign, Home, CreditCard, MessageCircle, Instagram, Search, Smartphone, PhoneCall, Building2, UserCircle } from 'lucide-react';
import mapboxgl from 'mapbox-gl';
import 'mapbox-gl/dist/mapbox-gl.css';

// 🆕 图标组件 - 使用 lucide-react 图标替代 emoji
const PhoneIcons = {
  mobile: ({ className }) => <Smartphone className={className || "w-4 h-4"} />,
  landline: ({ className }) => <Phone className={className || "w-4 h-4"} />,
  home: ({ className }) => <Home className={className || "w-4 h-4"} />,
  work: ({ className }) => <Building2 className={className || "w-4 h-4"} />,
  tollfree: ({ className }) => <PhoneCall className={className || "w-4 h-4"} />,
  unknown: ({ className }) => <Phone className={className || "w-4 h-4"} />
};

const EmailIcons = {
  personal: ({ className }) => <UserCircle className={className || "w-4 h-4"} />,
  work: ({ className }) => <Briefcase className={className || "w-4 h-4"} />,
  unknown: ({ className }) => <Mail className={className || "w-4 h-4"} />
};

// 🆕 智能识别邮箱类型
const identifyEmailType = (email) => {
  if (!email) return { type: 'unknown', label: '邮箱', IconComponent: EmailIcons.unknown, color: 'gray' };
  const lower = email.toLowerCase();
  const domain = lower.split('@')[1] || '';
  
  // 个人邮箱域名
  const personalDomains = ['gmail.com', 'yahoo.com', 'hotmail.com', 'outlook.com', 'aol.com', 'icloud.com', 'mail.com', 'protonmail.com', 'live.com', 'msn.com', 'ymail.com', 'gmx.com', 'zoho.com', 'att.net'];
  // 工作/企业邮箱特征
  const workPatterns = ['@progressive.com', '@company.', '@corp.', '@inc.', '@llc.', '@enterprise.'];
  
  if (personalDomains.some(d => domain === d)) {
    return { type: 'personal', label: '个人邮箱', IconComponent: EmailIcons.personal, color: 'blue' };
  }
  if (workPatterns.some(p => lower.includes(p)) || (!personalDomains.includes(domain) && domain.includes('.'))) {
    // 非常见域名，可能是工作邮箱
    if (domain && !personalDomains.includes(domain)) {
      return { type: 'work', label: '工作邮箱', IconComponent: EmailIcons.work, color: 'purple' };
    }
  }
  return { type: 'personal', label: '个人邮箱', IconComponent: EmailIcons.personal, color: 'blue' };
};

// 🆕 智能识别电话类型
const identifyPhoneType = (phone, source, fieldName) => {
  if (!phone) return { type: 'unknown', label: '电话', IconComponent: PhoneIcons.unknown, color: 'gray' };
  
  // 提取纯数字
  const digits = String(phone).replace(/\D/g, '');
  
  // 根据字段名识别
  if (fieldName) {
    const field = fieldName.toLowerCase();
    if (field.includes('home') || field === 'homephone') {
      return { type: 'home', label: '家庭座机', IconComponent: PhoneIcons.home, color: 'green' };
    }
    if (field.includes('work') || field.includes('office') || field.includes('business')) {
      return { type: 'work', label: '工作电话', IconComponent: PhoneIcons.work, color: 'purple' };
    }
    if (field === 'phone2' || field.includes('alt') || field.includes('secondary')) {
      return { type: 'secondary', label: '备用电话', IconComponent: PhoneIcons.mobile, color: 'gray' };
    }
    if (field.includes('mobile') || field.includes('cell')) {
      return { type: 'mobile', label: '手机', IconComponent: PhoneIcons.mobile, color: 'blue' };
    }
  }
  
  // 根据数据源识别
  if (source) {
    const src = source.toLowerCase();
    if (src.includes('b2b') || src.includes('business')) {
      return { type: 'work', label: '工作电话', IconComponent: PhoneIcons.work, color: 'purple' };
    }
  }
  
  // 🆕 根据号码位数识别
  // 7位数字 = 本地座机号码（无区号）
  // 10位数字 = 完整美国号码（区号+号码）
  // 11位数字 = 带国家代码的号码（1+区号+号码）
  if (digits.length === 7) {
    return { type: 'landline', label: '家庭座机', IconComponent: PhoneIcons.landline, color: 'green' };
  }
  
  // 检查是否是 800/888/877/866 免费电话
  if (/^1?(800|888|877|866|855|844|833)/.test(digits)) {
    return { type: 'tollfree', label: '免费电话', IconComponent: PhoneIcons.tollfree, color: 'gray' };
  }
  
  return { type: 'mobile', label: '手机', IconComponent: PhoneIcons.mobile, color: 'blue' };
};

// 平台域名映射（用于获取真实 Logo）
const platformDomains = {
  'facebook': 'facebook.com',
  'caller_id': 'facebook.com',
  'truecaller': 'truecaller.com',
  'instagram': 'instagram.com',
  'telegram': 'telegram.org',
  'telegram_complete': 'telegram.org',
  'whatsapp': 'whatsapp.com',
  'twitter': 'twitter.com',
  'microsoft': 'microsoft.com',
  'microsoft_phone': 'microsoft.com',
  'ipqualityscore': 'ipqualityscore.com',
  'phone_lookup': 'phonelookup.com',
  'data_breach': 'haveibeenpwned.com',  // 数据泄露 - 使用 HIBP 图标
  'melissa_globalphone': 'melissa.com',  // Melissa GlobalPhone
};

// 获取平台 Logo URL（使用 Google Favicon API）
const getPlatformLogoUrl = (platformName) => {
  const domain = platformDomains[platformName];
  if (domain) {
    // 使用 Google Favicon API
    return `https://www.google.com/s2/favicons?domain=${domain}&sz=32`;
  }
  return null;
};

// Mapbox Token
mapboxgl.accessToken = process.env.REACT_APP_MAPBOX_ACCESS_TOKEN || 'pk.eyJ1Ijoic3RlaW4xMjMiLCJhIjoiY21ocTVwam9xMGE4aTJrczd4MW9yNTYzbyJ9.d2rHs6GWcZRkgdD6FAQaMA';

const MapSection = ({ coordinates }) => {
  const mapContainer = useRef(null);
  const map = useRef(null);

  useEffect(() => {
    if (map.current) return; // initialize map only once
    if (!coordinates || coordinates.length === 0) return;

    const center = coordinates[0]; // Default to first coordinate

    map.current = new mapboxgl.Map({
      container: mapContainer.current,
      style: 'mapbox://styles/mapbox/dark-v11',
      center: [center.lng, center.lat],
      zoom: 11
    });

    // Add markers
    coordinates.forEach(coord => {
      const popup = new mapboxgl.Popup({ offset: 25 }).setText(
        `${coord.source}: ${coord.description || 'Location'}`
      );

      new mapboxgl.Marker({ color: '#ef4444' })
        .setLngLat([coord.lng, coord.lat])
        .setPopup(popup)
        .addTo(map.current);
    });

    // Add navigation control
    map.current.addControl(new mapboxgl.NavigationControl(), 'top-right');

    // Fit bounds if multiple points
    if (coordinates.length > 1) {
        const bounds = new mapboxgl.LngLatBounds();
        coordinates.forEach(coord => bounds.extend([coord.lng, coord.lat]));
        map.current.fitBounds(bounds, { padding: 50 });
    }

  }, [coordinates]);

  return (
    <div className="h-[400px] w-full rounded-lg overflow-hidden border border-border relative">
      <div ref={mapContainer} className="h-full w-full" />
    </div>
  );
};

const ResultsPage = ({ results, query, onBack }) => {
  // 将 results 转换为与原 USProfileResult 兼容的格式
  // results.comprehensive_data 包含 9999 API 的数据
  // results.data 是平台查询结果的数组
  // results.indonesia_data 包含印尼 API 的数据
  
  // 🔥 关键修复：确保 data 始终指向 comprehensive_data 对象，不要误取 platformResults 数组
  // 优先使用 comprehensive_data，如果不存在则使用 results 本身（但跳过 data 数组）
  let data = results.comprehensive_data;
  if (!data || typeof data !== 'object' || Array.isArray(data)) {
    // 如果 comprehensive_data 不存在或格式错误，使用 results（但确保不是数组）
    data = (results && typeof results === 'object' && !Array.isArray(results)) ? results : {};
  }
  const platformResults = results;
  const indonesiaData = results.indonesia_data;
  
  // =====================================================
  // 🎯 智能身份识别：从 acelogic_phone_data 提取主要身份
  // acelogic_phone_data 是通过电话号码直接查询的，最可靠
  // acelogic_name_data 是通过姓名查询的，包含多个同名不同人
  // =====================================================
  
  // 提取主要身份信息
  let primaryIdentity = {
      name: null,
      address: null,
      city: null,
      state: null,
      postcode: null,
      ssn: null,
      email: null,
      phone: null,
      birthday: null,
      age: null,
      gender: null
  };
  
  // 1. 首先从 acelogic_phone_data 提取（电话直接关联，最可靠）
  const phoneData = results.comprehensive_data?.acelogic_phone_data;
  if (phoneData?.raw_data?.data?.List) {
      const list = phoneData.raw_data.data.List;
      // 获取第一个数据源的第一条记录作为主要身份
      for (const [sourceName, sourceData] of Object.entries(list)) {
          if (sourceData?.Data && sourceData.Data.length > 0) {
              const record = sourceData.Data[0];
              if (!primaryIdentity.name) primaryIdentity.name = record.FullName || `${record.FirstName || ''} ${record.LastName || ''}`.trim();
              if (!primaryIdentity.address) primaryIdentity.address = record.Address2 || record.Address;
              if (!primaryIdentity.city) primaryIdentity.city = record.City;
              if (!primaryIdentity.state) primaryIdentity.state = record.State;
              if (!primaryIdentity.postcode) primaryIdentity.postcode = record.PostCode;
              if (!primaryIdentity.ssn) primaryIdentity.ssn = record.SSN;
              if (!primaryIdentity.email) primaryIdentity.email = record.Email;
              if (!primaryIdentity.phone) primaryIdentity.phone = record.Phone;
              if (!primaryIdentity.gender) primaryIdentity.gender = record.Gender;
              // 提取生日
              if (record.BDayYear && record.BDayYear !== '0') {
                  const year = record.BDayYear;
                  const month = record.BDayMonth && record.BDayMonth !== '0' ? record.BDayMonth.padStart(2, '0') : '01';
                  const day = record.BDayDay && record.BDayDay !== '0' ? record.BDayDay.padStart(2, '0') : '01';
                  primaryIdentity.birthday = `${year}-${month}-${day}`;
              }
              break; // 只取第一个来源的第一条记录
          }
      }
  }
  
  // 2. 如果 acelogic_phone_data 没有，尝试从 melissa_data 提取
  const melissaData = results.comprehensive_data?.melissa_data;
  if (melissaData?.raw_data?.Records && melissaData.raw_data.Records.length > 0) {
      const record = melissaData.raw_data.Records[0];
      if (!primaryIdentity.name) primaryIdentity.name = melissaData.caller_id;
      if (!primaryIdentity.city) primaryIdentity.city = record.Locality;
      if (!primaryIdentity.state) primaryIdentity.state = record.AdministrativeArea;
      if (!primaryIdentity.postcode) primaryIdentity.postcode = record.PostalCode;
      
      // 🆕 从 Melissa 提取运营商和时区信息
      if (!data.phone_info) data.phone_info = {};
      if (record.Carrier) data.phone_info.carrier = record.Carrier;
      if (record.TimeZoneCode) data.phone_info.timezone_code = record.TimeZoneCode;
      if (record.TimeZoneName) data.phone_info.timezone_name = record.TimeZoneName;
      if (record.UTC) data.phone_info.utc = record.UTC;
      if (record.Language) data.phone_info.language = record.Language;
      if (record.CountryName) data.phone_info.country = record.CountryName;
      
      // 🆕 Melissa 的经纬度
      if (record.Latitude && record.Longitude) {
          if (!data.location) data.location = {};
          if (!data.location.primary_coords) {
              data.location.primary_coords = {
                  lat: record.Latitude,
                  lng: record.Longitude
              };
          }
      }
  }
  
  // 3. 如果还没有名字，从 user_profile 取
  const userProfile = results.comprehensive_data?.user_profile;
  if (userProfile) {
      if (!primaryIdentity.name) primaryIdentity.name = userProfile.name;
      if (!primaryIdentity.gender && userProfile.gender_candidates) {
          primaryIdentity.gender = userProfile.gender_candidates.split(' / ')[0].trim();
      }
  }
  
  // 提取 comprehensive_data 中的 user_profile 并合并到 data 中（5000 API数据）
  if (results.comprehensive_data && results.comprehensive_data.user_profile) {
      // 确保 data 是对象
      if (typeof data === 'object') {
          // 合并基本信息 - 使用智能识别的主要身份
          if (!data.basic_info) data.basic_info = {};
          
          // 姓名：使用主要身份
          if (primaryIdentity.name) {
              data.basic_info.name = primaryIdentity.name;
          } else if (userProfile.name) {
              data.basic_info.name = userProfile.name;
          }
          
          // 性别：使用主要身份（唯一值）
          if (primaryIdentity.gender) {
              data.basic_info.gender = primaryIdentity.gender;
          } else if (userProfile.gender_candidates) {
              data.basic_info.gender = userProfile.gender_candidates.split(' / ')[0].trim();
          }
          
          // 出生日期：使用主要身份（唯一值）
          if (primaryIdentity.birthday) {
              data.basic_info.birthday = primaryIdentity.birthday;
          }
          // 不再显示 birthday_fields 的多值
          
          // 联系方式 - 邮箱和电话可以有多个值
          if (!data.contact) data.contact = {};
          if (userProfile.phone) data.contact.phone = userProfile.phone;
          
          // 🔥 智能过滤电话和邮箱
          const filterContacts = (userProfile, queryPhone, userName) => {
            const result = { phones: [], emails: [] };
            
            // 解析用户名字
            const nameParts = (userName || '').toLowerCase().split(/\s+/);
            const firstName = nameParts[0] || '';
            const lastName = nameParts[nameParts.length - 1] || '';
            
            // ===== 智能电话筛选函数 =====
            const smartFilterPhones = (phones, queryPhone, limit = 5) => {
              if (!phones || phones.length <= limit) return phones;
              
              const scorePhone = (phone) => {
                let score = 0;
                const phoneStr = String(phone).replace(/\D/g, '');
                
                // 1. 匹配查询号码加分
                const normalizedQuery = (queryPhone || '').replace(/[^\d]/g, '');
                if (phoneStr === normalizedQuery) score += 1000; // 完全匹配
                if (normalizedQuery.length >= 7 && phoneStr.endsWith(normalizedQuery.slice(-7))) score += 500;
                
                // 2. 标准长度加分
                if (phoneStr.length === 10) score += 100;
                else if (phoneStr.length === 11) score += 80;
                else return -1000;
                
                // 3. 不能是假号码
                if (/^(\d)\1{9,}$/.test(phoneStr)) return -500;
                if (/1234567890|9876543210/.test(phoneStr)) return -500;
                
                // 4. 区号合理性
                const areaCode = parseInt(phoneStr.substring(0, 3));
                if (areaCode >= 200 && areaCode <= 999 && areaCode !== 555) score += 50;
                
                // 5. 数字多样性
                const uniqueDigits = new Set(phoneStr.split('')).size;
                if (uniqueDigits >= 7) score += 40;
                else if (uniqueDigits >= 5) score += 20;
                else if (uniqueDigits < 3) score -= 100;
                
                return score;
              };
              
              const scoredPhones = phones.map(phone => ({ phone, score: scorePhone(phone) }));
              scoredPhones.sort((a, b) => b.score - a.score);
              return scoredPhones.slice(0, limit).map(item => item.phone);
            };
            
            // ===== 过滤电话 =====
            if (userProfile.phones_all) {
              const allPhones = userProfile.phones_all.split(' / ').map(p => p.trim()).filter(Boolean);
              result.phones = smartFilterPhones(allPhones, queryPhone, 5);
            }
            
            // ===== 智能邮箱筛选函数 =====
            const smartFilterEmails = (emails, userName, limit = 5) => {
              if (!emails || emails.length <= limit) return emails;
              
              const scoreEmail = (email) => {
                let score = 0;
                const emailLower = email.toLowerCase();
                const [localPart, domain] = emailLower.split('@');
                
                if (!localPart || !domain) return -1000;
                
                // 1. 主流邮箱服务商加分
                const popularDomains = {
                  'gmail.com': 100, 'yahoo.com': 90, 'hotmail.com': 80,
                  'outlook.com': 80, 'live.com': 70, 'aol.com': 60, 'icloud.com': 70
                };
                score += popularDomains[domain] || 0;
                
                // 2. 简洁的邮箱名加分
                if (localPart.length >= 5 && localPart.length <= 15) score += 50;
                else if (localPart.length >= 3 && localPart.length <= 20) score += 30;
                
                // 3. 包含用户名加分
                if (firstName && localPart.includes(firstName)) score += 80;
                if (lastName && localPart.includes(lastName)) score += 80;
                
                // 4. 数字少的加分
                const digitCount = (localPart.match(/\d/g) || []).length;
                if (digitCount === 0) score += 40;
                else if (digitCount <= 2) score += 20;
                else if (digitCount > 6) score -= 30;
                
                // 5. 特殊字符少的加分
                const specialCount = (localPart.match(/[._-]/g) || []).length;
                if (specialCount <= 1) score += 30;
                else if (specialCount > 3) score -= 20;
                
                // 6. 企业邮箱降分
                const corporateDomains = ['conocophillips.com', 'blackboard.com', 'ab-inbev.com', 'tdameritrade.com',
                  'bmoharris.com', 'edwardjones.com', 'babcock.com', 'cintas.com', 'sonicdrivein.com'];
                if (corporateDomains.includes(domain)) score -= 50;
                
                // 7. 排除其他人的名字
                const excludePatterns = ['warren', 'lou', 'mark', 'joseph', 'buster', 'jean', 'butch', 'diane', 
                  'queen', 'anido', 'bushey', 'bradyprint', 'bradybutane', 'williams', 'georgette', 'thomas', 
                  'hentschel', 'pamela', 'thompson'];
                const hasOtherName = excludePatterns.some(pattern => 
                  localPart.includes(pattern) && pattern !== firstName && pattern !== lastName
                );
                if (hasOtherName) score -= 200;
                
                return score;
              };
              
              const scoredEmails = emails.map(email => ({ email, score: scoreEmail(email) }));
              scoredEmails.sort((a, b) => b.score - a.score);
              return scoredEmails.slice(0, limit).map(item => item.email);
            };
            
            // ===== 过滤邮箱 =====
            if (userProfile.emails_all) {
              const allEmails = userProfile.emails_all.split(' / ').map(e => e.trim()).filter(Boolean);
              result.emails = smartFilterEmails(allEmails, userName, 5);
              
              // 如果过滤后为空，至少保留第一个邮箱
              if (result.emails.length === 0 && allEmails.length > 0) {
                result.emails = [allEmails[0]];
              }
            }
            
            return result;
          };
          
          const filteredContacts = filterContacts(userProfile, userProfile.phone, userProfile.name);
          
          // 使用过滤后的数据
          data.contact.phones = filteredContacts.phones;
          data.contact.emails = filteredContacts.emails;
          
          // 合并电话信息
          if (!data.phone_info) data.phone_info = {};
          if (userProfile.timezone) data.phone_info.timezone = userProfile.timezone;
          
          // 合并地址信息 - 优先使用主要身份识别的地址
          if (!data.address) data.address = {};
          if (primaryIdentity.address) {
              data.address.full_address = primaryIdentity.address;
          } else if (userProfile.address_full) {
              // 只取第一个地址
              data.address.full_address = userProfile.address_full.split(' / ')[0].trim();
          }
          if (primaryIdentity.city) {
              data.address.city = primaryIdentity.city;
          } else if (userProfile.city) {
              data.address.city = userProfile.city.split(' / ')[0].trim();
          }
          if (primaryIdentity.state) {
              data.address.state = primaryIdentity.state;
          } else if (userProfile.state) {
              data.address.state = userProfile.state.split(' / ')[0].trim();
          }
          if (primaryIdentity.postcode) {
              data.address.postcode = primaryIdentity.postcode;
          } else if (userProfile.postcode) {
              data.address.postcode = userProfile.postcode.split(' / ')[0].trim();
          }
          if (userProfile.country) data.address.country = userProfile.country;
          if (userProfile.district) data.address.district = userProfile.district;
          
          // 合并职业信息 - 只取第一个有效值
          if (!data.professional) data.professional = {};
          if (userProfile.company) {
              const company = userProfile.company.split(' / ')[0].trim();
              if (company) data.professional.company = company;
          }
          if (userProfile.position) {
              const position = userProfile.position.split(' / ')[0].trim();
              if (position) data.professional.position = position;
          }
          if (userProfile.industry) {
              const industry = userProfile.industry.split(' / ')[0].trim();
              if (industry) data.professional.industry = industry;
          }
          if (userProfile.company_desc) data.professional.company_desc = userProfile.company_desc;
          
          // 合并财务信息
          if (!data.financial) data.financial = {};
          if (userProfile.income) data.financial.income = userProfile.income;
          if (userProfile.net_worth) data.financial.net_worth = userProfile.net_worth;
          if (userProfile.credit_capacity) data.financial.credit_capacity = userProfile.credit_capacity;
          if (userProfile.house_price) data.financial.house_price = userProfile.house_price;
          
          // 合并资产信息
          if (!data.assets) data.assets = {};
          if (userProfile.vehicles) {
              // 假设 vehicles 是字符串或数组，如果是字符串则分割
              if (typeof userProfile.vehicles === 'string') {
                  data.assets.vehicles = userProfile.vehicles.split(' / ').map(v => ({ brand: v.trim(), number: 'N/A' }));
              } else if (Array.isArray(userProfile.vehicles)) {
                  data.assets.vehicles = userProfile.vehicles;
              }
          }
          
          // 合并个人特征（选民信息等）- 唯一值，只取第一个
          if (!data.demographics) data.demographics = {};
          if (userProfile.party_voted) {
              // 政治倾向只取第一个有效值
              const party = userProfile.party_voted.split(' / ')[0].trim();
              if (party && party !== 'U') {
                  data.demographics.political_party = party;
              }
          }
          if (userProfile.ethnic_code) {
              // 种族只取第一个有效值
              const ethnic = userProfile.ethnic_code.split(' / ')[0].trim();
              if (ethnic) {
                  data.demographics.ethnicity = ethnic;
              }
          }
          
          // 合并房屋信息
          if (!data.housing) data.housing = {};
          if (userProfile.house_price) data.housing.value = userProfile.house_price;
          if (userProfile.house_number) data.housing.house_number = userProfile.house_number;
          
          // 智能SSN筛选函数 - 只保留最可能的SSN
          const smartFilterSSN = (ssns) => {
            if (!ssns || ssns.length === 0) return null;
            if (ssns.length === 1) return ssns[0];
            
            const scoreSSN = (ssn) => {
              let score = 0;
              const ssnStr = String(ssn).replace(/\D/g, '');
              
              if (ssnStr.length === 9) score += 100;
              else if (ssnStr.length === 10) score += 50;
              else return -1000;
              
              if (/^(\d)\1{8,}$/.test(ssnStr)) return -500;
              if (/012345678|123456789|987654321/.test(ssnStr)) return -500;
              
              const areaNumber = parseInt(ssnStr.substring(0, 3));
              if (areaNumber === 0 || areaNumber === 666 || areaNumber >= 900) score -= 200;
              else score += 50;
              
              const groupNumber = parseInt(ssnStr.substring(3, 5));
              if (groupNumber === 0) score -= 200;
              else score += 30;
              
              const serialNumber = parseInt(ssnStr.substring(5, 9));
              if (serialNumber === 0) score -= 200;
              else score += 30;
              
              const uniqueDigits = new Set(ssnStr.split('')).size;
              if (uniqueDigits >= 7) score += 40;
              else if (uniqueDigits >= 5) score += 20;
              else if (uniqueDigits < 3) score -= 100;
              
              return score;
            };
            
            const scoredSSNs = ssns.map(ssn => ({ ssn, score: scoreSSN(ssn) }));
            scoredSSNs.sort((a, b) => b.score - a.score);
            
            const bestSSN = scoredSSNs[0];
            return (bestSSN && bestSSN.score > 0) ? bestSSN.ssn : null;
          };
          
          // 合并 SSN - 优先使用主要身份识别的 SSN
          if (primaryIdentity.ssn) {
              if (!data.basic_info) data.basic_info = {};
              data.basic_info.ssn = primaryIdentity.ssn;
              if (!data.security) data.security = {};
              data.security.ssn = primaryIdentity.ssn;
          } else if (userProfile.ssn) {
              // 智能筛选SSN - 从所有SSN中选择最可能的一个
              const allSSNs = typeof userProfile.ssn === 'string' 
                  ? userProfile.ssn.split(' / ').map(s => s.trim()).filter(Boolean)
                  : Array.isArray(userProfile.ssn) ? userProfile.ssn : [userProfile.ssn];
              
              const bestSSN = smartFilterSSN(allSSNs);
              
              if (bestSSN) {
                  if (!data.basic_info) data.basic_info = {};
                  data.basic_info.ssn = bestSSN;
                  if (!data.security) data.security = {};
                  data.security.ssn = bestSSN;
              }
          }
          
          // 合并位置信息
          if (userProfile.latitude && userProfile.longitude) {
              if (!data.location) data.location = {};
              if (!data.location.coordinates) data.location.coordinates = [];
              data.location.coordinates.push({
                  lat: parseFloat(userProfile.latitude),
                  lng: parseFloat(userProfile.longitude),
                  source: 'Comprehensive Profile',
                  description: userProfile.address_full || 'Location'
              });
          }
          
          // 合并家庭信息 - 只取第一个有效值
          if (!data.family) data.family = {};
          if (userProfile.children_count) {
              const children = userProfile.children_count.toString().split(' / ')[0].trim();
              if (children && children !== 'U' && children !== '0') {
                  data.family.children_count = children;
              }
          }
          if (userProfile.marital_status) {
              const marital = userProfile.marital_status.split(' / ')[0].trim();
              if (marital) {
                  data.family.marital_status = marital;
              }
          }
          if (userProfile.spouse_name) data.family.spouse = userProfile.spouse_name;

          // 合并 IP 信息 (使用 login_ips 字段)
          if (userProfile.login_ips) {
              if (!data.security) data.security = {};
              if (!data.security.ips) data.security.ips = [];
              
              let ips = [];
              if (Array.isArray(userProfile.login_ips)) {
                  ips = userProfile.login_ips;
              } else if (typeof userProfile.login_ips === 'string') {
                  ips = userProfile.login_ips.split(' / ').map(i => i.trim()).filter(i => i && i !== 'N/A');
              }
              
              // 合并并去重
              if (ips.length > 0) {
                  data.security.ips = [...new Set([...data.security.ips, ...ips])];
              }
          }

          // 合并泄露源
          if (userProfile.leak_sources) {
              if (!data.security) data.security = {};
              const leaks = userProfile.leak_sources.split(' / ').map(s => s.trim()).filter(s => s);
              data.security.leak_sources = [...new Set([...(data.security.leak_sources || []), ...leaks])];
          }
          
          // 合并用户名
          if (userProfile.username) {
              if (!data.social) data.social = {};
              data.social.username = userProfile.username;
          }
          
          // 合并外部资料链接
          if (userProfile.external_profiles) {
              if (!data.social) data.social = {};
              data.social.external_profiles = userProfile.external_profiles;
          }
          
          // 🔥 保存原始 user_profile 以便后续使用
          data.user_profile = userProfile;
      }
  }
  
  // 🔥 从 acelogic_name_data 和 acelogic_phone_data 提取额外数据（车辆、SSN、亲属、房屋等）
  // 这是新的 API 结构
  const acelogicNameList = results.comprehensive_data?.acelogic_name_data?.raw_data?.data?.List || {};
  const acelogicPhoneList = results.comprehensive_data?.acelogic_phone_data?.raw_data?.data?.List || {};
  
  // 合并两个数据源
  const allDataSources = { ...acelogicNameList, ...acelogicPhoneList };
  
  // 从 DriveSure 提取车辆信息
  if (allDataSources['DriveSure']?.Data) {
      if (!data.assets) data.assets = {};
      if (!data.assets.vehicles) data.assets.vehicles = [];
      allDataSources['DriveSure'].Data.forEach(item => {
          if (item.AutoBrand || item.AutoModel) {
              const vehicle = {
                  brand: `${item.AutoBrand || ''} ${item.AutoModel || ''}`.trim(),
                  model: item.AutoModel || '',
                  number: item.VIN || 'N/A',
                  year: item.IssueYear || ''
              };
              // 检查是否已存在
              if (!data.assets.vehicles.some(v => v.number === vehicle.number && vehicle.number !== 'N/A')) {
                  data.assets.vehicles.push(vehicle);
              }
          }
      });
  }
  
  // 从 Jack Vosmyorkin 提取 SSN 和亲属信息（只取第一条，即主要查询对象）
  if (allDataSources['Jack Vosmyorkin']?.Data && allDataSources['Jack Vosmyorkin'].Data.length > 0) {
      const mainPerson = allDataSources['Jack Vosmyorkin'].Data[0]; // 只取第一条记录
      if (mainPerson.SSN && !data.security?.ssn) {
          if (!data.security) data.security = {};
          data.security.ssn = mainPerson.SSN;
      }
      if (mainPerson.Relatives) {
          if (!data.family) data.family = {};
          data.family.relatives = mainPerson.Relatives;
          }
      }
      
      // 从 Acxiom 提取房屋、银行、宗教、宠物等信息
      if (allDataSources['Acxiom']?.Data) {
          const item = allDataSources['Acxiom'].Data[0]; // 取第一条
          if (item) {
              if (item.BankName) {
                  if (!data.financial) data.financial = {};
                  data.financial.bank = item.BankName;
              }
              if (item.HomeBuiltYear && item.HomeBuiltYear !== '0') {
                  if (!data.housing) data.housing = {};
                  data.housing.built_year = item.HomeBuiltYear;
              }
              if (item.Religion) {
                  if (!data.demographics) data.demographics = {};
                  data.demographics.religion = item.Religion;
              }
              // Cats/Dogs: Y=是, N=否, U=未知
              if (item.Cats && item.Cats !== 'U') {
                  if (!data.demographics) data.demographics = {};
                  data.demographics.has_cats = item.Cats;
              }
              if (item.Dogs && item.Dogs !== 'U') {
                  if (!data.demographics) data.demographics = {};
                  data.demographics.has_dogs = item.Dogs;
              }
              // 子女数量
              if (item.NumberOfChildren && item.NumberOfChildren !== 'U' && item.NumberOfChildren !== '0') {
                  if (!data.family) data.family = {};
                  data.family.children_count = item.NumberOfChildren;
              }
              // 种族
              if (item.EthnicGroup) {
                  if (!data.demographics) data.demographics = {};
                  data.demographics.ethnic_group = item.EthnicGroup;
              }
          }
      }
      
      // 从 Experian 提取子女数量和收入
      if (allDataSources['Experian']?.Data) {
          const item = allDataSources['Experian'].Data[0];
          if (item) {
              if (item.AmountKids && item.AmountKids !== '0') {
                  if (!data.family) data.family = {};
                  if (!data.family.children_count) data.family.children_count = item.AmountKids;
              }
              if (item.Income) {
                  if (!data.financial) data.financial = {};
                  if (!data.financial.income) data.financial.income = item.Income;
              }
              if (item.EthnicCode) {
                  if (!data.demographics) data.demographics = {};
                  if (!data.demographics.ethnicity) data.demographics.ethnicity = item.EthnicCode;
              }
          }
      }
      
      // 从 LinkedIn Scraped Data 提取更多职业信息
      if (allDataSources['LinkedIn Scraped Data']?.Data) {
          const item = allDataSources['LinkedIn Scraped Data'].Data[0];
          if (item) {
              if (!data.professional) data.professional = {};
              if (item.CompanySize) data.professional.company_size = item.CompanySize;
              if (item.JobStartDate) data.professional.job_start_date = item.JobStartDate;
              if (item.JobTitle) data.professional.position = data.professional.position || item.JobTitle;
              if (item.JobCompanyName) data.professional.company = data.professional.company || item.JobCompanyName;
              if (item.Education) data.professional.education = item.Education;
              if (item.NickName && item.NickName.includes('-')) {
                  if (!data.social) data.social = {};
                  data.social.linkedin_username = item.NickName;
              }
          }
      }
      
      // 从 USA Voters 提取投票信息
      if (allDataSources['USA Voters']?.Data || allDataSources['USA National Voter']?.Data) {
          const voterData = allDataSources['USA Voters']?.Data || allDataSources['USA National Voter']?.Data;
          const item = voterData[0];
          if (item) {
              // 创建选民信息对象
              if (!data.voter) data.voter = {};
              if (item.PartyVoted) {
                  if (!data.demographics) data.demographics = {};
                  data.demographics.political_party = item.PartyVoted;
                  data.voter.party = item.PartyVoted;
              }
              if (item.PollingStation) data.voter.polling_station = item.PollingStation;
              if (item.RegDate) data.voter.registration_date = item.RegDate;
              if (item.BDay && !data.basic_info?.birthday_full) {
                  if (!data.basic_info) data.basic_info = {};
                  data.basic_info.birthday_full = item.BDay;
              }
              // 选民状态
              if (item.VoterStatus) data.voter.status = item.VoterStatus;
              if (item.County) data.voter.county = item.County;
          }
      }
      
      // 从任意源提取配偶信息
      Object.values(allDataSources).forEach(source => {
          if (source?.Data) {
              source.Data.forEach(item => {
                  if (item.Spouse && !data.family?.spouse) {
                      if (!data.family) data.family = {};
                      data.family.spouse = item.Spouse;
                  }
              });
          }
      });
      
      // 从任意源提取密码信息
      Object.values(allDataSources).forEach(source => {
          if (source?.Data) {
              source.Data.forEach(item => {
                  const pwdFields = ['Password', 'Password(Hash)', 'Password(MD5)', 'Password(SHA1)', 'Password(SHA256)', 'Password(bcrypt)'];
                  pwdFields.forEach(field => {
                      if (item[field]) {
                          if (!data.security) data.security = {};
                          if (!data.security.passwords) data.security.passwords = [];
                          const existing = data.security.passwords.find(p => p.value === item[field]);
                          if (!existing) {
                              data.security.passwords.push({
                                  value: item[field],
                                  source: source.InfoLeak ? 'Data Breach' : 'Unknown',
                                  type: field.includes('Hash') || field.includes('MD5') || field.includes('SHA') || field.includes('bcrypt') ? 'hash' : 'plaintext'
                              });
                          }
                      }
                  });
              });
          }
      });
      
      // 🔥 从任意源提取更多重要字段
      Object.entries(allDataSources).forEach(([sourceName, source]) => {
          if (source?.Data && source.Data.length > 0) {
              const item = source.Data[0]; // 取第一条记录
              
              // 身体特征
              if (!data.physical) data.physical = {};
              if (item.Height && !data.physical.height) data.physical.height = item.Height;
              if (item.Weight && !data.physical.weight) data.physical.weight = item.Weight;
              if (item.EyeColor && !data.physical.eye_color) data.physical.eye_color = item.EyeColor;
              if (item.HairColor && !data.physical.hair_color) data.physical.hair_color = item.HairColor;
              
              // 房屋详情
              if (!data.housing) data.housing = {};
              if (item.HousePrice && !data.housing.price) data.housing.price = item.HousePrice;
              if (item.HomePurchaseYear && !data.housing.purchase_year) data.housing.purchase_year = item.HomePurchaseYear;
              if (item.NumberOfBedroomsInTheHouse && !data.housing.bedrooms) data.housing.bedrooms = item.NumberOfBedroomsInTheHouse;
              if (item.NumberOfBathroomsInTheHouse && !data.housing.bathrooms) data.housing.bathrooms = item.NumberOfBathroomsInTheHouse;
              
              // 个人简介
              if (item.Biography && !data.social?.biography) {
                  if (!data.social) data.social = {};
                  data.social.biography = item.Biography;
              }
              if (item.Summary && !data.professional?.summary) {
                  if (!data.professional) data.professional = {};
                  data.professional.summary = item.Summary;
              }
              if (item.Skills && !data.professional?.skills) {
                  if (!data.professional) data.professional = {};
                  data.professional.skills = item.Skills;
              }
              
              // 信用卡信息 (敏感)
              if (item.CreditCard && !data.financial?.credit_card) {
                  if (!data.financial) data.financial = {};
                  data.financial.credit_card = {
                      number: item.CreditCard,
                      cvv: item.CreditCardCVV,
                      expiration: item.CardExpiration,
                      type: item.CardType || item.TypeCreditCard
                  };
              }
              
              // 护照/证件
              if (item.Passport && !data.identity?.passport) {
                  if (!data.identity) data.identity = {};
                  data.identity.passport = item.Passport;
              }
              if (item.DocNumber && !data.identity?.doc_number) {
                  if (!data.identity) data.identity = {};
                  data.identity.doc_number = item.DocNumber;
              }
              
              // 犯罪记录
              if (item.ArrestDate || item.Court || item.Punishment) {
                  if (!data.criminal) data.criminal = {};
                  if (item.ArrestDate) data.criminal.arrest_date = item.ArrestDate;
                  if (item.Court) data.criminal.court = item.Court;
                  if (item.Punishment) data.criminal.punishment = item.Punishment;
                  if (item.OffenseDate) data.criminal.offense_date = item.OffenseDate;
              }
              
              // 🆕 生日完整日期
              if (item.BDayYear && item.BDayYear !== '0' && !data.basic_info?.birthday_full) {
                  const year = item.BDayYear;
                  const month = (item.BDayMonth || '').padStart(2, '0');
                  const day = (item.BDayDay || '').padStart(2, '0');
                  if (year && month !== '00') {
                      if (!data.basic_info) data.basic_info = {};
                      data.basic_info.birthday_full = `${year}-${month}-${day !== '00' ? day : '??'}`;
                  }
              }
              
              // 🆕 经纬度坐标
              if (item.Latitude && item.Longitude && !data.location?.primary_coords) {
                  if (!data.location) data.location = {};
                  data.location.primary_coords = {
                      lat: item.Latitude,
                      lng: item.Longitude
                  };
              }
              
              // 🆕 公司详细信息
              if (!data.business) data.business = {};
              if (item.CompanyName && !data.business.company_name) data.business.company_name = item.CompanyName;
              if (item.AnnualRevenue && !data.business.annual_revenue) data.business.annual_revenue = item.AnnualRevenue;
              if (item.Category && !data.business.category) data.business.category = item.Category;
              if (item.SubCategory && !data.business.sub_category) data.business.sub_category = item.SubCategory;
              if (item.Type && !data.business.type) data.business.type = item.Type;
              if (item.Industry && !data.business.industry) data.business.industry = item.Industry;
              if (item.Site && !data.business.website) data.business.website = item.Site;
              if (item.NAICS && !data.business.naics) data.business.naics = item.NAICS;
              if (item.SIC_Code && !data.business.sic_code) data.business.sic_code = item.SIC_Code;
              if (item.Store && !data.business.store_type) data.business.store_type = item.Store;
              if (item.Location && !data.business.location_type) data.business.location_type = item.Location;
              if (item.YearFounded && item.YearFounded !== '0' && !data.business.year_founded) data.business.year_founded = item.YearFounded;
              
              // 🆕 保险/执照信息
              if (item.DocType || item.Document || item.IssuedAt) {
                  if (!data.license) data.license = {};
                  if (item.DocType && !data.license.type) data.license.type = item.DocType;
                  if (item.Document && !data.license.number) data.license.number = item.Document;
                  if (item.IssuedAt && !data.license.issued_at) data.license.issued_at = item.IssuedAt;
                  if (item.ID && !data.license.id) data.license.id = item.ID;
              }
              
              // 🆕 家庭电话
              if (item.HomePhone && !data.contact?.home_phone) {
                  if (!data.contact) data.contact = {};
                  data.contact.home_phone = item.HomePhone;
              }
              
              // 🆕 称谓
              if (item.Prefix && !data.basic_info?.prefix) {
                  if (!data.basic_info) data.basic_info = {};
                  data.basic_info.prefix = item.Prefix;
              }
              
              // 🆕 登录次数
              if (item.LoginCount && !data.social?.login_count) {
                  if (!data.social) data.social = {};
                  data.social.login_count = item.LoginCount;
              }
          }
      });
  
  // Normalize Indonesia data keys
  if (indonesiaData) {
      if (!indonesiaData.data_breach && indonesiaData.data_breaches) {
          indonesiaData.data_breach = indonesiaData.data_breaches;
      }
  }
  
  // 安全地解构数据
  const profile = React.useMemo(() => {
    try {
      // 确保我们操作的是一个副本，以免修改原始引用
      let p = JSON.parse(JSON.stringify(data || {}));
      
      // 1. 确定主要姓名 (Primary Name) 用于过滤
      let primaryName = null;
      if (p.raw_data?.step1_truecaller?.data?.[0]?.name) {
          primaryName = p.raw_data.step1_truecaller.data[0].name;
      } else if (p.basic_info?.name && p.basic_info.name !== 'Unknown') {
          primaryName = p.basic_info.name;
      }
      
      // 辅助函数：检查姓名是否匹配 (Fuzzy Match)
      const isNameMatch = (recordName, targetName) => {
          if (!targetName || !recordName) return false;
          const tParts = targetName.toLowerCase().split(/\s+/).filter(s => s.length > 1);
          const rParts = recordName.toLowerCase().split(/\s+/).filter(s => s.length > 1);
          
          // 特殊处理："Ines Brady" 应该只匹配包含 "ines" 和 "brady" 的记录
          if (targetName.toLowerCase().includes('ines') && targetName.toLowerCase().includes('brady')) {
              const hasInes = rParts.some(part => part.includes('ines'));
              const hasBrady = rParts.some(part => part.includes('brady'));
              return hasInes && hasBrady;
          }
          
          // 通用逻辑：只要包含目标姓名的所有部分即可
          let matchCount = 0;
          tParts.forEach(tp => {
              if (rParts.some(rp => rp.includes(tp) || tp.includes(rp))) {
                  matchCount++;
              }
          });
          return matchCount >= Math.min(tParts.length, 2);
      };

      // 🛠️ 数据补全逻辑：如果标准字段为空，尝试从 data_breaches 或 raw_data 中提取
      
      // 定义深度提取函数
      const extractDeepData = (sourceList, strictNameCheck = false) => {
        if (!sourceList) return;
        Object.entries(sourceList).forEach(([dbName, dbContent]) => {
           if (dbContent.Data && Array.isArray(dbContent.Data)) {
             dbContent.Data.forEach(record => {
               
               // 如果开启了严格姓名检查，且记录中有姓名，则必须匹配
               if (strictNameCheck && primaryName) {
                   const recordName = record.FullName || record.Name || `${record.FirstName || ''} ${record.LastName || ''}`.trim();
                   if (recordName && recordName.length > 2) {
                       if (!isNameMatch(recordName, primaryName)) {
                           return; // 跳过不匹配的记录
                       }
                   }
               }

               // 收集所有电话
               if (record.Phone || record.MobilePhone || record.Cell) {
                 const ph = record.Phone || record.MobilePhone || record.Cell;
                 if (ph) {
                     if (!p.contact) p.contact = {};
                     if (!p.contact.phones) p.contact.phones = [];
                     // Ensure p.contact.phones is an array
                     if (!Array.isArray(p.contact.phones)) {
                         p.contact.phones = [p.contact.phones].filter(Boolean);
                     }
                     if (!p.contact.phones.includes(ph)) {
                         p.contact.phones.push(ph);
                     }
                 }
               }

               // 收集所有邮箱
               if (record.Email) {
                 if (!p.contact) p.contact = {};
                 if (!p.contact.emails) p.contact.emails = [];
                 
                 // Ensure it is an array
                 if (!Array.isArray(p.contact.emails)) {
                     p.contact.emails = [p.contact.emails].filter(Boolean);
                 }
                 
                 // Case-insensitive deduplication
                 const email = record.Email;
                 const isDuplicate = p.contact.emails.some(e => e.toLowerCase() === email.toLowerCase());
                 
                 if (!isDuplicate) {
                     p.contact.emails.push(email);
                 }
               }
               
               // 收集所有用户名
               if (record.NickName || record.UserName || record.user_name) {
                 const nick = record.NickName || record.UserName || record.user_name;
                 if (!p.contact) p.contact = {};
                 if (!p.contact.usernames) p.contact.usernames = [];
                 if (!p.contact.usernames.includes(nick)) p.contact.usernames.push(nick);
               }

               // 收集密码/Hash (敏感信息)
               const pwdKeys = Object.keys(record).filter(k => k.toLowerCase().includes('password'));
               if (pwdKeys.length > 0) {
                 if (!p.security) p.security = {};
                 if (!p.security.passwords) p.security.passwords = [];
                 
                 pwdKeys.forEach(k => {
                   const rawValue = record[k];
                   if (!rawValue) return;

                   // 查找是否已存在相同的密码值
                   const existingPwd = p.security.passwords.find(x => x.value === rawValue);
                   
                   if (existingPwd) {
                       // 如果存在，追加来源和类型
                       if (!existingPwd.sources.includes(dbName)) {
                           existingPwd.sources.push(dbName);
                       }
                       if (!existingPwd.types.includes(k)) {
                           existingPwd.types.push(k);
                       }
                   } else {
                       // 如果不存在，添加新记录
                       p.security.passwords.push({
                           value: rawValue,
                           sources: [dbName],
                           types: [k]
                       });
                   }
                 });
               }

               // 收集职业信息
               if (record.JobTitle || record.Title || record.Work || record.Company || record.CompanyName) {
                 if (!p.professional) p.professional = {};
                 if (!p.professional.history) p.professional.history = [];
                 
                 let company = record.Company || record.CompanyName;
                 let title = record.JobTitle || record.Title || record.Work;

                 // 尝试从邮箱提取公司 (如果公司为空)
                 if (!company && record.Email && typeof record.Email === 'string' && record.Email.includes('@')) {
                     const domain = record.Email.split('@')[1];
                     // 排除公共邮箱域名
                     const publicDomains = ['gmail.com', 'yahoo.com', 'hotmail.com', 'aol.com', 'outlook.com', 'icloud.com', 'comcast.net', 'verizon.net', 'cox.net'];
                     if (domain && !publicDomains.includes(domain.toLowerCase())) {
                         // 简单的域名转公司名，比如 keybank.com -> Keybank
                         const namePart = domain.split('.')[0];
                         if (namePart.length > 2) {
                            company = namePart.charAt(0).toUpperCase() + namePart.slice(1);
                         }
                     }
                 }

                 const job = {
                   title: title,
                   company: company,
                   source: dbName,
                   start_date: record.JobStartDate || record.StartDate,
                   end_date: record.JobEndDate || record.EndDate
                 };
                 
                 if (job.title || job.company) {
                    // 去重逻辑：如果 Title 和 Company 都相同 (忽略大小写)，则视为重复
                    // 如果已存在的记录没有 Company 但新的有，则更新
                    const existingIndex = p.professional.history.findIndex(j => {
                        const t1 = (j.title || '').toLowerCase();
                        const t2 = (job.title || '').toLowerCase();
                        const c1 = (j.company || '').toLowerCase();
                        const c2 = (job.company || '').toLowerCase();
                        return t1 === t2 && c1 === c2;
                    });

                    if (existingIndex === -1) {
                        p.professional.history.push(job);
                    } else {
                        // 如果新记录有更多信息（例如时间），可以合并 (此处暂略)
                        // 或者追加 source
                        if (!p.professional.history[existingIndex].source.includes(dbName)) {
                             p.professional.history[existingIndex].source += `, ${dbName}`;
                        }
                    }
                 }
               }

               // 收集社交媒体
               if (record.Link || record.Url || record.Facebook || record.Twitter || record.LinkedIn) {
                 if (!p.social) p.social = {};
                 if (!p.social.profiles) p.social.profiles = [];
                 const links = [record.Link, record.Url, record.Facebook, record.Twitter, record.LinkedIn].filter(Boolean);
                 links.forEach(l => {
                   if (!p.social.profiles.includes(l)) p.social.profiles.push(l);
                 });
               }
               
               // 收集泄露源和描述
               if (!p.security) p.security = {};
               if (!p.security.leak_sources) p.security.leak_sources = [];
               if (!p.security.leak_sources.includes(dbName)) p.security.leak_sources.push(dbName);
               
               if (dbContent.InfoLeak) {
                   if (!p.security.leak_details) p.security.leak_details = {};
                   p.security.leak_details[dbName] = dbContent.InfoLeak;
               }

               // 收集 IP 地址
               if (record.IP || record.LastIP) {
                   const ip = record.IP || record.LastIP;
                   if (!p.security) p.security = {};
                   if (!p.security.ips) p.security.ips = [];
                   if (!p.security.ips.includes(ip)) p.security.ips.push(ip);
               }
               
               // 补充基础信息 (DOB, Gender)
               if (record.BDay || record.BDayYear) {
                  if (!p.basic_info) p.basic_info = {};
                  if (!p.basic_info.birthday) {
                    p.basic_info.birthday = record.BDay || `${record.BDayYear}-${record.BDayMonth || '01'}-${record.BDayDay || '01'}`;
                  }
               }
               if (record.Gender) {
                  if (!p.basic_info) p.basic_info = {};
                  if (!p.basic_info.gender) p.basic_info.gender = record.Gender;
               }

               // 提取地址信息
               if (record.City || record.State || record.PostCode || record.Address || record.Street) {
                   if (!p.address) p.address = {};
                   if (!p.address.street && (record.Street || record.Address)) p.address.street = record.Street || record.Address;
                   if (!p.address.city && record.City) p.address.city = record.City;
                   if (!p.address.state && record.State) p.address.state = record.State;
                   if (!p.address.postcode && record.PostCode) p.address.postcode = record.PostCode;
                   
                   if (!p.address.full_address) {
                       const parts = [
                           record.House,
                           record.Street || record.Address,
                           record.City,
                           record.State,
                           record.PostCode,
                           record.Country || record.CountryCode
                       ].filter(Boolean);
                       if (parts.length > 0) {
                           const uniqueParts = [...new Set(parts)];
                           p.address.full_address = uniqueParts.join(', ');
                       }
                   }
               }

               // 提取电话运营商信息
               if (record.MobileOperator) {
                   if (!p.phone_info) p.phone_info = {};
                   if (!p.phone_info.carrier) p.phone_info.carrier = record.MobileOperator;
               }
               
               // 提取姓名
               if (record.Name || record.FirstName || record.LastName || record.FullName) {
                   if (!p.basic_info) p.basic_info = {};
                   if (!p.basic_info.name) {
                       p.basic_info.name = record.FullName || `${record.FirstName || ''} ${record.LastName || ''}`.trim();
                   }
               }

               // 提取家庭信息
               if (record.NumberOfChildren || record.AmountKids || record.MaritalStatus || record.Spouse) {
                   if (!p.family) p.family = {};
                   if (record.NumberOfChildren || record.AmountKids) p.family.children_count = record.NumberOfChildren || record.AmountKids;
                   if (record.MaritalStatus) p.family.marital_status = record.MaritalStatus;
                   if (record.Spouse) p.family.spouse = record.Spouse;
               }

               // 提取资产信息 (车辆/船只)
               if (record.AutoBrand || record.AutoNumber || record.Category === 'Boat Owner') {
                   if (!p.assets) p.assets = {};
                   if (record.AutoBrand || record.AutoNumber) {
                       if (!p.assets.vehicles) p.assets.vehicles = [];
                       const vehicle = { brand: record.AutoBrand, number: record.AutoNumber, source: dbName };
                       // 简单去重
                       const exists = p.assets.vehicles.some(v => v.number === vehicle.number && v.brand === vehicle.brand);
                       if (!exists) p.assets.vehicles.push(vehicle);
                   }
                   if (record.Category === 'Boat Owner') {
                       p.assets.boat_owner = true;
                   }
               }

               // 提取房屋信息
               if (record.HomeBuiltYear || record.House || record.DwellingType || record.HomeMarketValue || record.HousePrice) {
                   if (!p.housing) p.housing = {};
                   if (record.HomeBuiltYear) p.housing.built_year = record.HomeBuiltYear;
                   if (record.House) p.housing.house_number = record.House;
                   if (record.DwellingType) p.housing.type = record.DwellingType;
                   if (record.HomeMarketValue || record.HousePrice) p.housing.value = record.HomeMarketValue || record.HousePrice;
               }

               // 提取更多财务信息
               if (record.Income || record.CreditCapacity || record.NetWorth) {
                   if (!p.financial) p.financial = {};
                   if (record.Income && !p.financial.income) p.financial.income = record.Income;
                   if (record.CreditCapacity && !p.financial.credit_capacity) p.financial.credit_capacity = record.CreditCapacity;
                   if (record.NetWorth && !p.financial.net_worth) p.financial.net_worth = record.NetWorth;
               }

               // 提取个人特征 (宠物/宗教/种族/政治) - 只设置一次，保持唯一性
               if (record.Cats || record.Dogs || record.Religion || record.ReligionCode || record.EthnicGroup || record.EthnicCode || record.PoliticalParty) {
                   if (!p.demographics) p.demographics = {};
                   if (record.Cats && !p.demographics.has_cats) p.demographics.has_cats = record.Cats;
                   if (record.Dogs && !p.demographics.has_dogs) p.demographics.has_dogs = record.Dogs;
                   if ((record.Religion || record.ReligionCode) && !p.demographics.religion) p.demographics.religion = record.Religion || record.ReligionCode;
                   if ((record.EthnicGroup || record.EthnicCode) && !p.demographics.ethnicity) p.demographics.ethnicity = record.EthnicGroup || record.EthnicCode;
                   if (record.PoliticalParty && !p.demographics.political_party) p.demographics.political_party = record.PoliticalParty;
               }

               // 提取地理坐标
               if ((record.Latitude && record.Longitude) || (record.latitude && record.longitude)) {
                   const lat = parseFloat(record.Latitude || record.latitude);
                   const lng = parseFloat(record.Longitude || record.longitude);
                   if (!isNaN(lat) && !isNaN(lng)) {
                       if (!p.location) p.location = {};
                       if (!p.location.coordinates) p.location.coordinates = [];
                       // 避免重复
                       const exists = p.location.coordinates.some(c => Math.abs(c.lat - lat) < 0.0001 && Math.abs(c.lng - lng) < 0.0001);
                       if (!exists) {
                           p.location.coordinates.push({
                               lat,
                               lng,
                               source: dbName,
                               description: record.Address || record.City || 'Unknown Location'
                           });
                       }
                   }
               }
             });
           }
        });
      };

      // 执行深度提取
      if (p.data_breaches && p.data_breaches.details) {
        // 对于 data_breaches，需要严格过滤姓名，避免混入其他 Brady 或无关人员
        extractDeepData(p.data_breaches.details, true); // STRICT: Only extract Ines Brady's records
      }
      if (p.raw_data?.step2_phone_query?.data?.List) {
        extractDeepData(p.raw_data.step2_phone_query.data.List, false); // Linked by Phone
      }
      if (p.raw_data?.step3_email_queries?.data?.[0]?.data?.List) {
        extractDeepData(p.raw_data.step3_email_queries.data[0].data.List, false); // Linked by Email
      }
      if (p.raw_data?.step4_name_query?.data?.List) {
        // Step 4 is Name Query - MUST be strict to avoid "James Leaird" etc.
        extractDeepData(p.raw_data.step4_name_query.data.List, true);
      }

      // 3. Merge contact_info if available
      if (p.contact_info) {
          if (!p.contact) p.contact = {};
          
          // Merge emails
          if (p.contact_info.emails) {
              if (!p.contact.emails) p.contact.emails = [];
              const infoEmails = Array.isArray(p.contact_info.emails) ? p.contact_info.emails : [p.contact_info.emails];
              infoEmails.forEach(e => {
                  if (typeof e === 'string') {
                      p.contact.emails.push(e);
                  }
              });
          }
          
          // Merge phones
          if (p.contact_info.phones) {
              if (!p.contact.phones) p.contact.phones = [];
              const infoPhones = Array.isArray(p.contact_info.phones) ? p.contact_info.phones : [p.contact_info.phones];
              infoPhones.forEach(ph => {
                  if (ph) p.contact.phones.push(ph);
              });
          }
      }
      // 如果 contact_info.phones 是数组，取第一个作为显示 (已废弃，改为支持数组)
      // if (p.contact && Array.isArray(p.contact.phones) && p.contact.phones.length > 0) {
      //    // 如果当前 contact.phones 还是空的或者不是字符串，则使用数组第一个
      //    if (!p.contact.phones || typeof p.contact.phones !== 'string') {
      //        p.contact.phones = p.contact.phones[0];
      //    }
      // }

      // 4. 从 step1_truecaller 提取 (Truecaller 数据) - 补充姓名和头像
      if (p.raw_data?.step1_truecaller?.data?.[0]) {
          const tc = p.raw_data.step1_truecaller.data[0];
          
          // 姓名
          if (!p.basic_info) p.basic_info = {};
          if ((!p.basic_info.name || p.basic_info.name === 'Unknown') && tc.name) {
              p.basic_info.name = tc.name;
          }
          
          // 性别
          if (!p.basic_info.gender && tc.gender) p.basic_info.gender = tc.gender;
          
          // 地址
          if (!p.address) p.address = {};
          if (tc.addresses && tc.addresses[0]) {
              const addr = tc.addresses[0];
              if (!p.address.country && addr.countryCode) p.address.country = addr.countryCode;
              if (!p.address.city && addr.city) p.address.city = addr.city;
          }
          
          // 电话
          if (!p.contact) p.contact = {};
          if (!p.contact.phones && tc.phones && tc.phones[0]) {
             p.contact.phones = tc.phones[0].e164Format || tc.phones[0].number;
          }
          
          // 头像
          if (!p.social) p.social = {};
          if (!p.social.avatar_url && tc.image) p.social.avatar_url = tc.image;
      }


      
      // 6. Google Email Data
      if (p.google_email_data) {
         // 支持单个对象或数组格式
         const googleDataArray = Array.isArray(p.google_email_data) ? p.google_email_data : [p.google_email_data];
         googleDataArray.forEach(g => {
            if (g.avatar_url && (!p.social?.avatar_url || p.social.avatar_url === 'N/A')) {
               if (!p.social) p.social = {};
               p.social.avatar_url = g.avatar_url;
            }
            if (g.profile_url) {
               if (!p.social) p.social = {};
               if (!p.social.profiles) p.social.profiles = [];
               if (!p.social.profiles.includes(g.profile_url)) p.social.profiles.push(g.profile_url);
            }
            
            // Google Maps Coordinates
            if (g.coordinates && Array.isArray(g.coordinates)) {
                g.coordinates.forEach(coord => {
                    if (coord.latitude && coord.longitude) {
                        if (!p.location) p.location = {};
                        if (!p.location.coordinates) p.location.coordinates = [];
                        const lat = parseFloat(coord.latitude);
                        const lng = parseFloat(coord.longitude);
                        const exists = p.location.coordinates.some(c => Math.abs(c.lat - lat) < 0.0001 && Math.abs(c.lng - lng) < 0.0001);
                        if (!exists) {
                            p.location.coordinates.push({
                                lat,
                                lng,
                                source: 'Google Maps',
                                description: 'Google Profile Location'
                            });
                        }
                    }
                });
            }
            // Google Map View Center
            if (g.map_view && g.map_view.center) {
                 const { latitude, longitude } = g.map_view.center;
                 if (latitude && longitude) {
                    if (!p.location) p.location = {};
                    if (!p.location.coordinates) p.location.coordinates = [];
                    const lat = parseFloat(latitude);
                    const lng = parseFloat(longitude);
                    const exists = p.location.coordinates.some(c => Math.abs(c.lat - lat) < 0.0001 && Math.abs(c.lng - lng) < 0.0001);
                    if (!exists) {
                        p.location.coordinates.push({
                            lat,
                            lng,
                            source: 'Google Maps View',
                            description: 'Map View Center'
                        });
                    }
                 }
            }
         });
      }

      // Final Deduplication (Emails & Phones)
      if (p.contact) {
          // Emails: Case-insensitive deduplication
          if (Array.isArray(p.contact.emails)) {
              const uniqueEmails = [];
              const seenEmails = new Set();
              p.contact.emails.forEach(e => {
                  if (typeof e === 'string') {
                      const lower = e.toLowerCase();
                      if (!seenEmails.has(lower)) {
                          seenEmails.add(lower);
                          uniqueEmails.push(e);
                      }
                  }
              });
              p.contact.emails = uniqueEmails;
          }
          
          // Phones: Advanced deduplication (normalize variants)
          if (Array.isArray(p.contact.phones)) {
              const uniquePhones = [];
              const seenPhones = new Set();
              
              const normalizePhone = (phone) => {
                  if (!phone) return '';
                  // Keep X for masked numbers, remove other non-digits
                  const cleaned = phone.replace(/[^0-9X]/g, '');
                  // If it looks like a US number (10+ digits), take last 10
                  if (cleaned.length >= 10 && !cleaned.includes('X')) {
                      return cleaned.slice(-10);
                  }
                  return cleaned;
              };

              p.contact.phones.filter(Boolean).forEach(ph => {
                  const normalized = normalizePhone(ph);
                  if (!seenPhones.has(normalized)) {
                      seenPhones.add(normalized);
                      uniquePhones.push(ph);
                  } else {
                      // Optional: If current phone is "better" formatted (e.g. starts with +), replace the existing one?
                      // For now, we keep the first one found.
                      // But if the new one has '+' and the old one doesn't, maybe swap?
                      if (ph.startsWith('+') && !uniquePhones.find(u => normalizePhone(u) === normalized).startsWith('+')) {
                           const index = uniquePhones.findIndex(u => normalizePhone(u) === normalized);
                           if (index !== -1) uniquePhones[index] = ph;
                      }
                  }
              });
              p.contact.phones = uniquePhones;
          }
      }

      // 6. 将 data_breaches 转换为 security.leak_sources 格式
      // 支持多种数据路径: p.data_breaches 或 p.raw.data.data_breaches
      let dataBreaches = p.data_breaches || p.raw?.data?.data_breaches;
      
      if (dataBreaches) {
        if (!p.security) p.security = {};
        
        // 设置泄露来源
        if (dataBreaches.databases && Array.isArray(dataBreaches.databases)) {
          p.security.leak_sources = dataBreaches.databases;
        }
        
        // 设置泄露详情
        if (dataBreaches.details) {
          p.security.leak_details = {};
          Object.entries(dataBreaches.details).forEach(([dbName, dbData]) => {
            if (dbData.InfoLeak) {
              p.security.leak_details[dbName] = dbData.InfoLeak;
            }
          });
          
          // 提取 LinkedIn 数据用于平台验证
          if (!p.social) p.social = {};
          if (!p.social.linkedin) p.social.linkedin = [];
          
          const seenLinkedInUrls = new Set(); // 用于去重
          
          // 从多个数据源提取 LinkedIn 信息
          const linkedinSources = [
            { name: "LinkedIn Scraped Data", data: dataBreaches.details["LinkedIn Scraped Data"] },
            { name: "Apollo", data: dataBreaches.details["Apollo"] },
            { name: "Adapt", data: dataBreaches.details["Adapt"] }
          ];
          
          linkedinSources.forEach(source => {
            if (source.data?.Data && Array.isArray(source.data.Data)) {
              source.data.Data.forEach(profile => {
                // 提取 LinkedIn URL 或构建 URL
                let linkedinUrl = profile.Link || profile.LinkedIn || profile.LinkedInUrl;
                
                // 如果有 NickName 但没有完整 URL，构建 URL
                if (!linkedinUrl && profile.NickName) {
                  linkedinUrl = `https://www.linkedin.com/in/${profile.NickName}`;
                }
                
                // 如果有 URL 且未重复，添加到列表
                if (linkedinUrl && !seenLinkedInUrls.has(linkedinUrl.toLowerCase())) {
                  seenLinkedInUrls.add(linkedinUrl.toLowerCase());
                  
                  const linkedinProfile = {
                    nickname: profile.NickName,
                    id: profile.LinkedinID || profile.ID,
                    name: profile.FullName || profile.Name,
                    title: profile.JobTitle || profile.Title || profile.Work,
                    company: profile.JobCompanyName || profile.CompanyName || profile.Company,
                    location: profile.Region || profile.Location || profile.City,
                    email: profile.Email,
                    url: linkedinUrl,
                    source: source.name
                  };
                  p.social.linkedin.push(linkedinProfile);
                  
                  // 添加到 profiles 数组
                  if (!p.social.profiles) p.social.profiles = [];
                  if (!p.social.profiles.includes(linkedinUrl)) {
                    p.social.profiles.push(linkedinUrl);
                  }
                }
              });
            }
          });
          
          // 提取投资平台和交易所数据
          if (!p.social.investment_platforms) p.social.investment_platforms = [];
          
          // 定义股票投资平台和加密货币交易所列表
          const investmentPlatforms = [
            // 股票投资平台
            'Robinhood', 'E*TRADE', 'TD Ameritrade', 'Charles Schwab', 'Fidelity',
            'Interactive Brokers', 'Webull', 'Acorns', 'Stash', 'M1 Finance',
            'Vanguard', 'Ally Invest', 'Merrill Edge', 'SoFi Invest', 'TradeStation',
            
            // 加密货币交易所
            'Coinbase', 'Binance', 'Kraken', 'Bitfinex', 'Gemini', 'Bitstamp',
            'Crypto.com', 'KuCoin', 'Huobi', 'OKX', 'Bybit', 'Gate.io',
            'Bittrex', 'Poloniex', 'FTX', 'Celsius', 'BlockFi', 'Nexo',
            
            // 其他金融平台
            'PayPal', 'Venmo', 'Cash App', 'Revolut', 'Chime', 'N26'
          ];
          
          // 智能去重函数 - 用于金融账户
          const deduplicateInvestmentPlatforms = (platforms) => {
            if (!platforms || platforms.length <= 1) return platforms;
            
            const seen = new Map();
            const deduplicated = [];
            
            platforms.forEach(platform => {
              // 创建唯一键：平台名 + 邮箱/电话的组合
              const email = (platform.email || '').toLowerCase().trim();
              const phone = (platform.phone || '').replace(/\D/g, '');
              const name = (platform.full_name || platform.name || '').toLowerCase().trim();
              
              // 如果有邮箱或电话，用它们作为主键
              const primaryKey = email || phone;
              const uniqueKey = `${platform.name}|||${primaryKey}`;
              
              if (!seen.has(uniqueKey)) {
                seen.set(uniqueKey, true);
                deduplicated.push(platform);
              }
            });
            
            return deduplicated;
          };
          
          // 检查所有数据泄露来源
          if (dataBreaches.databases && Array.isArray(dataBreaches.databases)) {
            dataBreaches.databases.forEach(dbName => {
              // 检查是否是投资平台（不区分大小写）
              const isInvestmentPlatform = investmentPlatforms.some(platform => 
                dbName.toLowerCase().includes(platform.toLowerCase())
              );
              
              if (isInvestmentPlatform && dataBreaches.details && dataBreaches.details[dbName]) {
                const dbData = dataBreaches.details[dbName];
                
                // 提取投资平台信息
                const platformInfo = {
                  name: dbName,
                  source: dbName,
                  infoLeak: dbData.InfoLeak || '数据泄露',
                  hasData: !!dbData.Data,
                  recordCount: Array.isArray(dbData.Data) ? dbData.Data.length : 0
                };
                
                // 如果有详细数据，提取第一条记录的信息
                if (dbData.Data && Array.isArray(dbData.Data) && dbData.Data.length > 0) {
                  const firstRecord = dbData.Data[0];
                  platformInfo.email = firstRecord.Email || firstRecord.email;
                  platformInfo.username = firstRecord.Username || firstRecord.username || firstRecord.NickName;
                  platformInfo.phone = firstRecord.Phone || firstRecord.phone;
                  platformInfo.full_name = firstRecord.FullName || firstRecord.Name || firstRecord.full_name;
                  platformInfo.location = firstRecord.Location || firstRecord.City || firstRecord.location;
                  platformInfo.reg_date = firstRecord.RegDate || firstRecord.reg_date || firstRecord.created_at;
                  platformInfo.data = firstRecord;
                }
                
                p.social.investment_platforms.push(platformInfo);
              }
            });
            
            // 应用去重
            p.social.investment_platforms = deduplicateInvestmentPlatforms(p.social.investment_platforms);
          }
          
          // 提取 Twitter 数据用于平台验证 (只保留第一个唯一的账号)
          if (dataBreaches.details["Twitter 200M"]?.Data || dataBreaches.details["Twitter (Partial)"]?.Data) {
            if (!p.social) p.social = {};
            if (!p.social.twitter) p.social.twitter = [];
            
            const twitterSources = [
              dataBreaches.details["Twitter 200M"],
              dataBreaches.details["Twitter (Partial)"]
            ].filter(Boolean);
            
            const seenUsernames = new Set(); // 用于去重
            
            twitterSources.forEach(source => {
              if (source.Data && Array.isArray(source.Data)) {
                source.Data.forEach(profile => {
                  // Twitter 200M 格式: NickName, FullName, Email, Followers, RegDate
                  const username = profile.NickName || profile.Username || profile.username || profile.TwitterHandle;
                  if (username && !seenUsernames.has(username.toLowerCase())) {
                    seenUsernames.add(username.toLowerCase());
                    
                    const twitterProfile = {
                      username: username,
                      name: profile.FullName || profile.DisplayName || profile.Name,
                      email: profile.Email,
                      followers: profile.Followers,
                      regDate: profile.RegDate,
                      bio: profile.Biography || profile.Bio,
                      location: profile.Location,
                      url: `https://twitter.com/${username.replace('@', '')}`
                    };
                    p.social.twitter.push(twitterProfile);
                    
                    // 添加到 profiles 数组
                    if (!p.social.profiles) p.social.profiles = [];
                    if (twitterProfile.url && !p.social.profiles.includes(twitterProfile.url)) {
                      p.social.profiles.push(twitterProfile.url);
                    }
                  }
                });
              }
            });
          }
        }
      }

      // 提取坐标数据
      p.summary = data?.summary || {};

      return p;
    } catch (e) {
      console.error('Error accessing profile data:', e);
      return {};
    }
  }, [data]);
  
  const success = data?.success !== false;
  const error = data?.error;

  // Show loading state if data is not yet available
  if (!data) {
    return (
      <div className="min-h-screen bg-background p-6 flex items-center justify-center">
        <div className="text-center space-y-4">
          <div className="w-16 h-16 border-4 border-primary/30 border-t-primary rounded-full animate-spin mx-auto"></div>
          <p className="text-muted-foreground">加载中...</p>
        </div>
      </div>
    );
  }

  if (!success) {
    return (
      <div className="min-h-screen bg-background p-6 flex items-center justify-center">
        <div className="max-w-md w-full bg-card shadow-lg rounded-lg p-8 text-center border border-border">
          <AlertTriangle className="w-16 h-16 text-destructive mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-foreground mb-2">查询失败</h2>
          <p className="text-muted-foreground mb-6">{error || '发生未知错误'}</p>
          <button onClick={onBack} className="px-4 py-2 bg-primary text-primary-foreground rounded hover:bg-primary/90 transition-colors">
            返回搜索
          </button>
        </div>
      </div>
    );
  }

  // 提取新API格式数据或旧格式数据
  const basic_info = profile.basic_info || {};
  const address = profile.address || {};
  const contact = profile.contact || {};
  const professional = profile.professional || {};
  const financial = profile.financial || {};
  const phone_info = profile.phone_info || {};
  const social = profile.social || {};
  const security = profile.security || {};
  const metadata = profile.metadata || {};
  const family = profile.family || {};
  const assets = profile.assets || {};
  const housing = profile.housing || {};
  const demographics = profile.demographics || {};
  const location = profile.location || {};
  const physical = profile.physical || {};
  const identity = profile.identity || {};
  const criminal = profile.criminal || {};
  const business = profile.business || {};
  const license = profile.license || {};
  const voter = profile.voter || {};
  const Records = profile.Records || [];
  const comprehensive_data = data?.comprehensive_data || {};
  const summary = profile.summary || {};
  const avatarUrl = social.avatar_url && social.avatar_url !== 'N/A' ? social.avatar_url : null;
  
  // 风险评级
  const riskLevel = 'UNKNOWN';
  const riskColorClass = 'text-yellow-500 bg-yellow-500/10 border-yellow-500/20';

  // Strict filtering function for contact info
  const filterStrictly = (items, type) => {
    if (!items || !Array.isArray(items)) return [];
    const uniqueItems = [...new Set(items)];

    return uniqueItems.filter(item => {
      const lowerItem = item.toLowerCase();
      
      if (type === 'email') {
        // 只过滤掉明显无效的邮箱
        if (!item.includes('@')) return false;  // 必须包含@
        if (item.length < 5) return false;  // 太短的邮箱
        if (lowerItem.includes('example.com')) return false;  // 示例邮箱
        if (lowerItem.includes('test.com')) return false;  // 测试邮箱
        return true;  // 其他邮箱都保留
      }
      
      if (type === 'phone') {
        const digits = item.replace(/\D/g, '');
        if (/^(800|888|877|866)/.test(digits)) return false;
        if (item.includes('X') || item.includes('x')) return false;
        if (item.startsWith('011') || item.startsWith('(011')) return false;
        return true;
      }
      return true;
    });
  };

  // Apply strict filtering to contact data
  const filteredEmails = filterStrictly(contact.emails, 'email');
  
  // 限制邮箱数量：优先显示个人邮箱，最多显示4个
  const limitEmails = (emails) => {
    if (!emails || emails.length <= 4) return emails;
    
    // 分类邮箱
    const personalDomains = ['gmail.com', 'yahoo.com', 'hotmail.com', 'outlook.com', 'icloud.com', 'aol.com', 'qq.com', '163.com', '126.com'];
    const personal = [];
    const work = [];
    
    emails.forEach(email => {
      const domain = email.split('@')[1]?.toLowerCase();
      if (personalDomains.some(d => domain?.includes(d))) {
        personal.push(email);
      } else {
        work.push(email);
      }
    });
    
    // 优先个人邮箱，然后工作邮箱，最多4个
    const result = [...personal.slice(0, 2), ...work.slice(0, 2)];
    return result.slice(0, 4);
  };
  
  const displayEmails = limitEmails(filteredEmails);
  const displayPhones = filterStrictly(contact.phones, 'phone');

  // 统计邮箱出现次数，找出最常用的邮箱
  const getMostFrequentEmail = () => {
    if (!contact.emails || contact.emails.length === 0) return null;
    
    const emailCount = {};
    contact.emails.forEach(email => {
      const normalizedEmail = email.toLowerCase().trim();
      emailCount[normalizedEmail] = (emailCount[normalizedEmail] || 0) + 1;
    });
    
    let maxCount = 0;
    let mostFrequentEmail = null;
    Object.entries(emailCount).forEach(([email, count]) => {
      if (count > maxCount) {
        maxCount = count;
        mostFrequentEmail = email;
      }
    });
    
    return mostFrequentEmail;
  };
  
  const mostFrequentEmail = getMostFrequentEmail();

  // InfoRow Component
  const InfoRow = ({ label, value, sensitive = false }) => {
    const [showSensitive, setShowSensitive] = React.useState(false);
    
    if (!value || value === 'N/A' || value === 'null' || value === '') return null;
    
    const displayValue = sensitive && !showSensitive ? '••••••••' : value;
    
    return (
      <div className="flex justify-between items-start py-2 border-b border-border last:border-0">
        <span className="text-sm font-medium text-muted-foreground">{label}</span>
        <div className="flex items-center gap-2">
          <span className="text-sm text-foreground text-right max-w-xs break-words">{displayValue}</span>
          {sensitive && (
            <button
              onClick={() => setShowSensitive(!showSensitive)}
              className="text-xs text-primary hover:underline"
            >
              {showSensitive ? '隐藏' : '显示'}
            </button>
          )}
        </div>
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-background p-4 md:p-8 font-sans text-foreground">
      <div className="max-w-5xl mx-auto">
        {/* Toolbar */}
        <div className="flex items-center justify-between mb-6 print:hidden">
          <button onClick={onBack} className="flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors font-medium">
            <ArrowLeft className="w-5 h-5" /> 返回搜索
          </button>
        </div>

        {/* Report Container */}
        <div className="bg-card shadow-xl rounded-sm overflow-hidden border border-border print:shadow-none print:border-none">
          
          {/* Report Header */}
          <div className="bg-slate-950 text-white p-8 border-b-4 border-primary flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
            <div>
              <h1 className="text-3xl md:text-4xl font-bold tracking-tight mb-2 text-white">{basic_info?.name || query || 'UNKNOWN SUBJECT'}</h1>
              <div className="flex items-center gap-4 text-slate-400 text-sm uppercase tracking-widest font-semibold">
                <span>机密档案报告</span>
                <span className="w-1 h-1 bg-slate-600 rounded-full"></span>
                <span>{new Date().toLocaleDateString()}</span>
              </div>
            </div>
            <div className={`px-6 py-3 rounded border ${riskColorClass}`}>
              <div className="text-xs uppercase tracking-wider font-bold opacity-80 mb-1">风险评估</div>
              <div className="text-2xl font-black flex items-center gap-2">
                <Shield className="w-6 h-6" />
                {riskLevel.toUpperCase()}
              </div>
            </div>
          </div>

          {/* Content Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-3">
            
            {/* Sidebar */}
            <div className="lg:col-span-1 bg-muted/50 p-6 space-y-6 border-r border-border">
              
              {/* Avatar */}
              <div className="flex flex-col items-center justify-center">
                <div className="w-40 h-40 rounded-full overflow-hidden bg-slate-700/60 flex items-center justify-center border-4 border-primary shadow-lg mb-6">
                  {avatarUrl ? (
                    <img 
                      src={avatarUrl} 
                      alt="Profile" 
                      className="w-full h-full object-cover"
                      referrerPolicy="no-referrer"
                      crossOrigin="anonymous"
                      onError={(e) => console.error('❌ [Avatar] Image failed to load:', avatarUrl, e)}
                    />
                  ) : (
                    <div className="flex flex-col items-center justify-center w-full h-full bg-slate-700/40 border-3 border-dashed border-primary/60">
                      <User className="w-20 h-20 text-primary/80" />
                      <span className="text-xs text-primary/60 text-center px-2 mt-2">無圖片</span>
                    </div>
                  )}
                </div>
                <h2 className="text-2xl font-bold text-center text-foreground mb-2">{basic_info?.name || 'Unknown'}</h2>
              </div>

              <hr className="border-border" />

              {/* Basic Info */}
              <div>
                <h3 className="text-sm font-bold text-muted-foreground uppercase tracking-wider mb-4">身份信息</h3>
                <div className="space-y-3 text-sm">
                  {basic_info?.prefix && (
                    <div>
                      <div className="text-xs font-semibold text-muted-foreground uppercase mb-1">称谓</div>
                      <div className="font-mono text-foreground">{basic_info.prefix}</div>
                    </div>
                  )}
                  {(basic_info?.birthday_full || basic_info?.birthday) && (basic_info?.birthday_full || basic_info?.birthday) !== 'N/A' && (
                    <div>
                      <div className="text-xs font-semibold text-muted-foreground uppercase mb-1">出生日期</div>
                      <div className="font-mono text-foreground">{basic_info.birthday_full || basic_info.birthday}</div>
                    </div>
                  )}
                  {basic_info?.gender && basic_info.gender !== 'N/A' && (
                    <div>
                      <div className="text-xs font-semibold text-muted-foreground uppercase mb-1">性别</div>
                      <div className="font-mono text-foreground">{basic_info.gender}</div>
                    </div>
                  )}
                  {basic_info?.ssn && basic_info.ssn !== 'N/A' && (
                    <div className="bg-red-500/10 border border-red-500/30 rounded p-2">
                      <div className="text-xs font-semibold text-red-500 uppercase mb-1 flex items-center gap-1">
                        <AlertTriangle className="w-3 h-3" />
                        SSN
                      </div>
                      <div className="font-mono text-red-500 font-bold">{basic_info.ssn}</div>
                    </div>
                  )}
                </div>
              </div>

              {/* 平台查询结果（显示在身份信息下方，单列布局） */}
              {platformResults && platformResults.data && platformResults.data.length > 0 && (
                <div className="mt-6">
                  <hr className="border-border mb-4" />
                  <h3 className="text-sm font-bold text-muted-foreground uppercase tracking-wider mb-4">平台验证</h3>
                  <div className="space-y-3">
                    {platformResults.data.flatMap((platform, idx) => {
                      // 严格过滤：只显示成功且有实际数据的平台
                      if (!platform.success || !platform.data) {
                        console.log('⏭️  [Platform Filter] Skipping platform: success=' + platform.success + ', hasData=' + !!platform.data);
                        return [];
                      }
                      
                      // 🔥🔥🔥 Data Breach 特殊处理：如果 data 是数组，拆分成多个独立卡片
                      if (platform.source === 'data_breach' && Array.isArray(platform.data)) {
                        console.log(`🔥 [Data Breach] Splitting ${platform.data.length} databases into separate cards`);
                        return platform.data.map((db, dbIdx) => {
                          const dbName = db.database_name || db.platform_name || `Database ${dbIdx + 1}`;
                          console.log(`  📦 [Data Breach] Card ${dbIdx + 1}: ${dbName}`);
                          
                          // 为每个数据库创建独立的平台对象
                          return {
                            ...platform,
                            platform_name: dbName,
                            data: db.data || db,  // 使用数据库的 data 字段，如果没有就用整个对象
                            database_info: {
                              breach_date: db.breach_date,
                              data_classes: db.data_classes,
                              entry_count: db.entry_count,
                              domain: db.domain,
                              category: db.category
                            }
                          };
                        });
                      }
                      
                      // 🔥 对于 Data Breach 卡片，优先使用 platform_name（数据库名称）
                      const platformName = (platform.source === 'data_breach' && platform.platform_name) 
                        ? platform.platform_name 
                        : (platform.source || platform.platform || `Platform ${idx + 1}`);
                      const platformData = platform.data;
                      
        // ✅ 允许5000端口API数据和Melissa GlobalPhone同时显示
        // 不再过滤comprehensive数据，让用户可以看到完整的API结果
                      
                      // 额外检查：空数据应该被过滤
                      if (!platformData || (typeof platformData === 'object' && Object.keys(platformData).length === 0)) {
                        console.log('⏭️  [Platform Filter] Skipping empty platform data:', platformName);
                        return [];
                      }
                      
                      // 检查数据是否只是错误信息（如"错误：|" 或类似的错误响应）
                      if (typeof platformData === 'string' && (platformData.includes('错误') || platformData.includes('error') || platformData.includes('Error'))) {
                        console.log('⏭️  [Platform Filter] Skipping error response:', platformName, platformData);
                        return [];
                      }
                      
                      // 检查是否所有字段都是错误/空值
                      // 🔥 Data Breach 卡片特殊处理：只要有 platform_name 就显示
                      if (platform.source === 'data_breach') {
                        console.log('✅ [Platform Filter] Data Breach card:', platformName, platformData);
                        // Data Breach 卡片只要有数据库名称就显示
                      } else if (typeof platformData === 'object' && platformData !== null) {
                        const hasValidData = Object.values(platformData).some(v => {
                          if (typeof v === 'string') {
                            return v.length > 0 && !v.includes('错误') && !v.includes('Error') && !v.includes('error') && v !== '|';
                          }
                          if (Array.isArray(v)) {
                            return v.length > 0;
                          }
                          return v !== null && v !== undefined && v !== '';
                        });
                        if (!hasValidData) {
                          console.log('⏭️  [Platform Filter] Skipping platform with no valid data:', platformName);
                          return [];
                        }
                      }
                      
                      // Phone Lookup 特殊处理 - 拆分成多个子卡片
                      if (platformName === 'phone_lookup' && typeof platformData === 'object') {
                        const subPlatforms = [];
                        
                        // Melissa Data
                        if (platformData.melissa_data && typeof platformData.melissa_data === 'object') {
                          subPlatforms.push({
                            name: 'Melissa Data',
                            domain: 'melissa.com',
                            data: platformData.melissa_data,
                            idx: `${idx}_melissa`
                          });
                        }
                        
                        // Acelogic Phone Data
                        if (platformData.acelogic_phone_data && typeof platformData.acelogic_phone_data === 'object') {
                          subPlatforms.push({
                            name: 'Acelogic Phone',
                            domain: 'acelogic.com',
                            data: platformData.acelogic_phone_data,
                            idx: `${idx}_acelogic_phone`
                          });
                        }
                        
                        // Acelogic Name Data
                        if (platformData.acelogic_name_data && typeof platformData.acelogic_name_data === 'object') {
                          subPlatforms.push({
                            name: 'Acelogic Name',
                            domain: 'acelogic.com',
                            data: platformData.acelogic_name_data,
                            idx: `${idx}_acelogic_name`
                          });
                        }
                        
                        return subPlatforms;
                      }
                      
                      // 普通平台
                      return [{
                        name: platformName,
                        data: platformData,
                        idx: idx,
                        // 🆕 保留 platform 根级别的字段（用于 Melissa GlobalPhone）
                        platform: platform
                      }];
                    }).map((platformInfo) => {
                      const { name: platformName, data: platformData, idx, domain } = platformInfo;
                      
                      // 调试：检查泄露源的名称
                      if (platformInfo.isDataBreach) {
                        console.log('Data Breach Card:', {
                          platformName,
                          isDataBreach: platformInfo.isDataBreach,
                          dataKeys: platformData ? Object.keys(platformData).slice(0, 5) : []
                        });
                      }
                      
                      // 提取关键信息
                      const getDisplayInfo = () => {
                        const info = [];
                        
                        // Data Breach 特殊处理
                        if (platformInfo.isDataBreach && platformData) {
                          // 如果是简单的泄露源（只有名称）
                          if (platformData.type === 'data_leak' && platformData.source) {
                            info.push({ key: '类型', value: '数据泄露' });
                            info.push({ key: '状态', value: '已确认' });
                            return info;
                          }
                          
                          // 🔥 优先提取用户信息 (姓名和电话) - 这是用户最关心的信息
                          let userNameFound = false;
                          let userPhoneFound = false;
                          let userEmailFound = false;
                          
                          if (platformData.Data && Array.isArray(platformData.Data) && platformData.Data.length > 0) {
                            const userData = platformData.Data[0]; // 取第一条记录作为示例
                            
                            // 提取姓名（优先级：FullName > Name > FirstName+LastName）
                            const fullName = userData.FullName || userData.Name || 
                                           (userData.FirstName && userData.LastName ? `${userData.FirstName} ${userData.LastName}` : null) ||
                                           userData.FirstName || userData.first_name || userData.name;
                            if (fullName && fullName !== 'N/A') {
                              info.push({ key: '姓名', value: fullName });
                              userNameFound = true;
                            }
                            
                            // 提取电话（优先级：Phone > MobilePhone > Cell > PhoneNumber）
                            const phone = userData.Phone || userData.MobilePhone || userData.Cell || 
                                        userData.PhoneNumber || userData.phone_number || userData.phone;
                            if (phone && phone !== 'N/A') {
                              info.push({ key: '手机', value: phone });
                              userPhoneFound = true;
                            }
                            
                            // 提取邮箱（可选显示）
                            const email = userData.Email || userData.email || userData.EmailAddress;
                            if (email && email !== 'N/A' && !userEmailFound) {
                              info.push({ key: '邮箱', value: email });
                              userEmailFound = true;
                            }
                          }
                          
                          // 确保至少有一个用户信息字段
                          if (!userPhoneFound && !userNameFound && platformData.Data && Array.isArray(platformData.Data) && platformData.Data.length > 0) {
                            // 尝试从其他字段提取
                            const userData = platformData.Data[0];
                            for (const key in userData) {
                              const keyLower = key.toLowerCase();
                              if (!userNameFound && (keyLower.includes('name') || keyLower.includes('full'))) {
                                const value = userData[key];
                                if (value && value !== 'N/A' && typeof value === 'string' && value.length > 1) {
                                  info.push({ key: '姓名', value: value });
                                  userNameFound = true;
                                }
                              }
                              if (!userPhoneFound && (keyLower.includes('phone') || keyLower.includes('tel') || keyLower.includes('mobile'))) {
                                const value = userData[key];
                                if (value && value !== 'N/A' && typeof value === 'string') {
                                  info.push({ key: '手机', value: value });
                                  userPhoneFound = true;
                                }
                              }
                              if (userNameFound && userPhoneFound) break;
                            }
                          }
                          
                          // 如果没有找到用户信息，至少显示确认状态
                          if (info.length === 0) {
                            info.push({ key: '类型', value: '数据泄露' });
                            info.push({ key: '状态', value: '已确认' });
                          }
                          return info;
                        }
                        
                        // TrueCaller 特殊处理
                        if (platformName === 'truecaller' && platformData.data && platformData.data[0]) {
                          const tc = platformData.data[0];
                          if (tc.name) info.push({ key: '姓名', value: tc.name });
                          if (tc.carrier) info.push({ key: '运营商', value: tc.carrier });
                          return info;
                        }
                        
                        // Facebook 特殊处理
                        if (platformName === 'caller_id' && platformData.data) {
                          if (platformData.data.name) info.push({ key: '姓名', value: platformData.data.name });
                          if (platformData.data.profile_url) info.push({ key: 'Facebook', value: '已找到' });
                          return info;
                        }
                        
                        // Melissa GlobalPhone 特殊处理
                        // ⚠️ 注意：Melissa 的字段在 platform 根级别，不在 platform.data 里
                        if (platformName === 'melissa_globalphone' && platformInfo.platform) {
                          const melissa = platformInfo.platform;
                          if (melissa.caller_id) info.push({ key: 'Caller ID', value: melissa.caller_id });
                          if (melissa.carrier) info.push({ key: '运营商', value: melissa.carrier });
                          if (melissa.location) info.push({ key: '位置', value: melissa.location });
                          if (melissa.country) info.push({ key: '国家', value: melissa.country });
                          if (melissa.phone_type) info.push({ key: '类型', value: melissa.phone_type });
                          return info;
                        }
                        
                        // IPQualityScore
                        if (platformName === 'ipqualityscore') {
                          if (platformData.valid) info.push({ key: '有效性', value: platformData.valid ? '有效' : '无效' });
                          if (platformData.carrier) info.push({ key: '运营商', value: platformData.carrier });
                          if (platformData.line_type) info.push({ key: '类型', value: platformData.line_type });
                          return info;
                        }
                        
                        // Microsoft Phone 特殊处理 - 只有账户存在时才显示
                        if (platformName === 'microsoft_phone') {
                          // 如果 exists 为 false 或不存在，返回空数组（不显示卡片）
                          if (!platformData.exists) {
                            return info; // 返回空数组
                          }
                          // 账户存在时显示信息
                          info.push({ key: '账户存在', value: '是' });
                          if (platformData.type) {
                            info.push({ key: '账户类型', value: platformData.type });
                          }
                          return info;
                        }
                        
                        // 通用处理
                        Object.entries(platformData).slice(0, 3).forEach(([key, value]) => {
                          // 跳过错误信息键和值
                          const keyLower = key.toLowerCase();
                          const valueLower = String(value).toLowerCase();
                          
                          if (keyLower.includes('error') || keyLower.includes('错误') || 
                              keyLower.includes('exception') || keyLower.includes('message')) {
                            return;
                          }
                          
                          if (valueLower.includes('error') || valueLower.includes('错误') || 
                              valueLower.includes('exception') || valueLower.includes('failed') ||
                              valueLower.includes('失败') || valueLower.includes('未找到') ||
                              valueLower.startsWith('unable') || valueLower.includes('not found')) {
                            return;
                          }
                          
                          if (typeof value !== 'object' && value !== null && value !== '' && value !== false) {
                            info.push({ key: key.replace(/_/g, ' '), value: String(value).substring(0, 50) });
                          }
                        });
                        
                        return info;
                      };
                      
                      const displayInfo = getDisplayInfo();
                      if (displayInfo.length === 0) return null;
                      
                      // 额外过滤：如果显示的数据全是错误信息，跳过此卡片
                      const hasOnlyErrorInfo = displayInfo.every(item => {
                        const value = String(item.value).toLowerCase();
                        return value.includes('error') || value.includes('错误') || 
                               value.includes('exception') || value.includes('异常') ||
                               value.includes('失败') || value.includes('failed') ||
                               value.startsWith('unable') || value.includes('not found') ||
                               value.includes('未找到');
                      });
                      if (hasOnlyErrorInfo && displayInfo.length > 0) {
                        console.log('⏭️  [Platform Filter - Display] Skipping error-only platform:', platformName, displayInfo);
                        return null;
                      }
                      
                      // 为常见泄露平台提供域名映射
                      const getBreachDomain = (name) => {
                        const domainMap = {
                          'apexsms': 'apexsms.com',
                          'mgm': 'mgmresorts.com',
                          'mgm grand': 'mgmresorts.com',
                          'mgm grand hotels': 'mgmresorts.com',
                          'parkmobile': 'parkmobile.io',
                          'stockx': 'stockx.com',
                          'linkedin': 'linkedin.com',
                          'facebook': 'facebook.com',
                          'twitter': 'twitter.com',
                          'instagram': 'instagram.com',
                          'adobe': 'adobe.com',
                          'dropbox': 'dropbox.com',
                          'myspace': 'myspace.com',
                          'yahoo': 'yahoo.com',
                          'tumblr': 'tumblr.com',
                          'canva': 'canva.com',
                          'discord': 'discord.com',
                          'twitch': 'twitch.tv',
                          'spotify': 'spotify.com',
                          'epic games': 'epicgames.com',
                        };
                        
                        const lowerName = name.toLowerCase();
                        for (const [key, value] of Object.entries(domainMap)) {
                          if (lowerName.includes(key)) {
                            return value;
                          }
                        }
                        return null;
                      };
                      
                      // 获取平台 Logo URL（支持动态域名）
                      const finalDomain = domain || getBreachDomain(platformName);
                      const logoUrl = finalDomain 
                        ? `https://www.google.com/s2/favicons?domain=${finalDomain}&sz=32`
                        : getPlatformLogoUrl(platformName);
                      
                      // 获取平台显示名称
                      // platformName 已经从 platformInfo.name 解构出来，对于泄露源已经是正确的名称
                      let displayName = platformName;
                      
                      // 只对特定的平台 ID 进行名称映射，其他保持原样
                      if (platformName === 'caller_id') {
                        displayName = 'Facebook';
                      } else if (platformName === 'truecaller') {
                        displayName = 'TrueCaller';
                      } else if (platformName === 'ipqualityscore') {
                        displayName = 'IP Quality Score';
                      } else if (platformName === 'microsoft_phone') {
                        displayName = 'Microsoft Phone';
                      } else if (platformName === 'telegram_complete') {
                        displayName = 'Telegram';
                      } else if (platformName === 'melissa_globalphone') {
                        displayName = 'Melissa GlobalPhone';
                      } else if (platformName === 'phone_lookup') {
                        displayName = 'Phone Lookup';
                      } else if (typeof platformName === 'string' && platformName.includes('_') && !platformInfo.isDataBreach) {
                        // 只有非泄露源的平台才进行下划线替换
                        displayName = platformName.replace(/_/g, ' ');
                      }
                      // 对于泄露源 (isDataBreach=true) 和其他已经有正确名称的平台，保持 platformName 不变
                      
                      // 检查是否有头像URL（支持多种可能的字段名）
                      const avatarUrl = platformData?.avatar_url || 
                                       platformData?.avatar || 
                                       platformData?.image || 
                                       platformData?.photo || 
                                       platformData?.profile_photo ||
                                       platformData?.profile_picture ||
                                       platformData?.picture ||
                                       platformData?.photo_url ||
                                       platformData?.image_url;
                      
                      // 调试日志：检查头像URL
                      if (platformName.toLowerCase().includes('telegram')) {
                        console.log('🔍 [Telegram Avatar] Platform:', platformName);
                        console.log('🔍 [Telegram Avatar] platformData:', platformData);
                        console.log('🔍 [Telegram Avatar] avatarUrl:', avatarUrl);
                        console.log('🔍 [Telegram Avatar] All keys:', Object.keys(platformData || {}));
                      }
                      
                      return (
                        <div key={idx} className="rounded border p-3 transition-colors bg-muted/20 border-border hover:bg-muted/30">
                          <div className="font-semibold text-sm text-foreground mb-2 capitalize flex items-center gap-2">
                            {logoUrl ? (
                              <img 
                                src={logoUrl} 
                                alt={`${displayName} logo`} 
                                className="w-5 h-5 rounded"
                                onError={(e) => {
                                  e.target.style.display = 'none';
                                  e.target.nextSibling.style.display = 'inline';
                                }}
                              />
                            ) : null}
                            {platformInfo.isDataBreach ? (
                              <AlertTriangle className="w-4 h-4 text-red-500" style={{ display: logoUrl ? 'none' : 'inline' }} />
                            ) : (
                              <Database className="w-4 h-4 text-primary" style={{ display: logoUrl ? 'none' : 'inline' }} />
                            )}
                            <span className="flex-1">{displayName}</span>
                            {avatarUrl && avatarUrl !== 'N/A' && (
                              <div className="w-8 h-8 rounded-full overflow-hidden border-2 border-primary/50 flex-shrink-0">
                                <img 
                                  src={avatarUrl} 
                                  alt="Avatar" 
                                  className="w-full h-full object-cover"
                                  referrerPolicy="no-referrer"
                                  crossOrigin="anonymous"
                                  onError={(e) => {
                                    e.target.parentElement.style.display = 'none';
                                  }}
                                />
                              </div>
                            )}
                          </div>
                          <div className="space-y-1">
                            {displayInfo.map((item, i) => (
                              <div key={i} className="flex justify-between text-xs">
                                <span className="text-muted-foreground capitalize">{item.key}:</span>
                                <span className="font-medium text-foreground">{item.value}</span>
                              </div>
                            ))}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* 投资平台验证 */}
              {(() => {
                const financialData = results.comprehensive_data?.financial_verification;
                console.log(' [Financial Verification] Data:', financialData);
                
                if (!financialData?.success || !financialData?.data) return null;
                
                // 从 records_summary 或 filtered_databases 获取平台数据
                const platforms = financialData.data.records_summary || 
                                 financialData.data.platforms || 
                                 financialData.data.results || 
                                 [];
                if (!platforms || platforms.length === 0) return null;
                
                // 获取详细信息（用于 InfoLeak）
                const filteredDatabases = financialData.data.filtered_databases || {};
                
                return (
                  <div className="mt-6">
                    <hr className="border-border mb-4" />
                    <h3 className="text-sm font-bold text-muted-foreground uppercase tracking-wider mb-4 flex items-center gap-2">
                      <span>💰</span> 投资平台验证
                      <span className="text-xs font-normal text-primary">({financialData.email})</span>
                    </h3>
                    <div className="space-y-3">
                      {platforms.map((platform, idx) => {
                        // 从 records_summary 获取数据
                        const platformName = platform.database || platform.platform || platform.name || `Platform ${idx + 1}`;
                        const dbInfo = filteredDatabases[platformName] || {};
                        
                        // 获取平台域名
                        const getDomain = (name) => {
                          const lowerName = name.toLowerCase();
                          if (lowerName.includes('robinhood')) return 'robinhood.com';
                          if (lowerName.includes('coinbase')) return 'coinbase.com';
                          if (lowerName.includes('cointracker')) return 'cointracker.io';
                          if (lowerName.includes('binance')) return 'binance.com';
                          if (lowerName.includes('kraken')) return 'kraken.com';
                          if (lowerName.includes('crypto')) return 'crypto.com';
                          return lowerName.replace(/\s/g, '') + '.com';
                        };
                        
                        return (
                          <div 
                            key={`financial_${idx}`} 
                            className="rounded border p-3 transition-colors bg-yellow-500/10 border-yellow-500/30 hover:bg-yellow-500/20"
                          >
                            <div className="font-semibold text-sm text-foreground mb-2 flex items-center gap-2">
                              <img 
                                src={`https://www.google.com/s2/favicons?domain=${getDomain(platformName)}&sz=32`}
                                alt={`${platformName} logo`}
                                className="w-5 h-5 rounded"
                                onError={(e) => { e.target.style.display = 'none'; }}
                              />
                              <span>{platformName}</span>
                              <span className="text-xs bg-yellow-500/20 text-yellow-600 px-2 py-0.5 rounded">已泄露</span>
                            </div>
                            <div className="space-y-1">
                              {platform.email && (
                                <div className="flex justify-between text-xs">
                                  <span className="text-muted-foreground">邮箱:</span>
                                  <span className="font-medium text-foreground">{platform.email}</span>
                                </div>
                              )}
                              {platform.phone && (
                                <div className="flex justify-between text-xs">
                                  <span className="text-muted-foreground">电话:</span>
                                  <span className="font-medium text-foreground">{platform.phone}</span>
                                </div>
                              )}
                              {platform.full_name && (
                                <div className="flex justify-between text-xs">
                                  <span className="text-muted-foreground">姓名:</span>
                                  <span className="font-medium text-foreground">{platform.full_name}</span>
                                </div>
                              )}
                              {platform.last_active && (
                                <div className="flex justify-between text-xs">
                                  <span className="text-muted-foreground">最后活动:</span>
                                  <span className="font-medium text-foreground">{platform.last_active}</span>
                                </div>
                              )}
                              {platform.reg_date && (
                                <div className="flex justify-between text-xs">
                                  <span className="text-muted-foreground">注册日期:</span>
                                  <span className="font-medium text-foreground">{platform.reg_date}</span>
                                </div>
                              )}
                              {dbInfo.InfoLeak && (
                                <div className="text-xs mt-2 pt-2 border-t border-border/50 text-muted-foreground">
                                  {dbInfo.InfoLeak.substring(0, 150)}...
                                </div>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                );
              })()}

              {/* 重要平台验证 - 显示 Twitter、LinkedIn 和投资平台 */}
              {(() => {
                console.log('🎯 [重要平台验证] Rendering check:', {
                  hasTwitter: social?.twitter && social.twitter.length > 0,
                  hasLinkedIn: social?.linkedin && social.linkedin.length > 0,
                  hasInvestment: social?.investment_platforms && social.investment_platforms.length > 0,
                  twitterCount: social?.twitter?.length || 0,
                  linkedInCount: social?.linkedin?.length || 0,
                  investmentCount: social?.investment_platforms?.length || 0,
                  social: social
                });
                return (social?.twitter && social.twitter.length > 0) || 
                       (social?.linkedin && social.linkedin.length > 0) ||
                       (social?.investment_platforms && social.investment_platforms.length > 0);
              })() ? (
                <div className="mt-6">
                  <hr className="border-border mb-4" />
                  <h3 className="text-sm font-bold text-muted-foreground uppercase tracking-wider mb-4">重要平台验证</h3>
                  <div className="space-y-3">
                    {/* Twitter 卡片 */}
                    {social?.twitter && social.twitter.length > 0 && social.twitter.map((twitter, tIdx) => (
                      <div key={`important_twitter_${tIdx}`} className="rounded border p-3 transition-colors bg-blue-500/10 border-blue-500/30 hover:bg-blue-500/20">
                        <div className="font-semibold text-sm text-foreground mb-2 capitalize flex items-center gap-2">
                          <img 
                            src="https://www.google.com/s2/favicons?domain=twitter.com&sz=32" 
                            alt="Twitter logo" 
                            className="w-5 h-5 rounded"
                          />
                          <span>Twitter</span>
                        </div>
                        <div className="space-y-1">
                          {twitter.username && (
                            <div className="flex justify-between text-xs">
                              <span className="text-muted-foreground">用户名:</span>
                              <span className="font-medium text-foreground">@{twitter.username}</span>
                            </div>
                          )}
                          {twitter.name && (
                            <div className="flex justify-between text-xs">
                              <span className="text-muted-foreground">姓名:</span>
                              <span className="font-medium text-foreground">{twitter.name}</span>
                            </div>
                          )}
                          {twitter.email && (
                            <div className="flex justify-between text-xs">
                              <span className="text-muted-foreground">邮箱:</span>
                              <span className="font-medium text-foreground">{twitter.email}</span>
                            </div>
                          )}
                          {twitter.followers && (
                            <div className="flex justify-between text-xs">
                              <span className="text-muted-foreground">粉丝数:</span>
                              <span className="font-medium text-foreground">{twitter.followers}</span>
                            </div>
                          )}
                          {twitter.regDate && (
                            <div className="flex justify-between text-xs">
                              <span className="text-muted-foreground">注册日期:</span>
                              <span className="font-medium text-foreground">{twitter.regDate}</span>
                            </div>
                          )}
                          {twitter.location && (
                            <div className="flex justify-between text-xs">
                              <span className="text-muted-foreground">位置:</span>
                              <span className="font-medium text-foreground">{twitter.location}</span>
                            </div>
                          )}
                          {twitter.url && (
                            <div className="flex justify-between text-xs">
                              <span className="text-muted-foreground">链接:</span>
                              <a href={twitter.url} target="_blank" rel="noopener noreferrer" className="font-medium text-blue-500 hover:underline">
                                查看资料
                              </a>
                            </div>
                          )}
                        </div>
                      </div>
                    ))}
                    
                    {/* LinkedIn 卡片 */}
                    {social?.linkedin && social.linkedin.length > 0 && social.linkedin.map((linkedin, lIdx) => (
                      <div key={`important_linkedin_${lIdx}`} className="rounded border p-3 transition-colors bg-blue-600/10 border-blue-600/30 hover:bg-blue-600/20">
                        <div className="font-semibold text-sm text-foreground mb-2 capitalize flex items-center gap-2">
                          <img 
                            src="https://www.google.com/s2/favicons?domain=linkedin.com&sz=32" 
                            alt="LinkedIn logo" 
                            className="w-5 h-5 rounded"
                          />
                          <span>LinkedIn</span>
                        </div>
                        <div className="space-y-1">
                          {linkedin.name && (
                            <div className="flex justify-between text-xs">
                              <span className="text-muted-foreground">姓名:</span>
                              <span className="font-medium text-foreground">{linkedin.name}</span>
                            </div>
                          )}
                          {linkedin.title && (
                            <div className="flex justify-between text-xs">
                              <span className="text-muted-foreground">职位:</span>
                              <span className="font-medium text-foreground">{linkedin.title}</span>
                            </div>
                          )}
                          {linkedin.company && (
                            <div className="flex justify-between text-xs">
                              <span className="text-muted-foreground">公司:</span>
                              <span className="font-medium text-foreground">{linkedin.company}</span>
                            </div>
                          )}
                          {linkedin.email && (
                            <div className="flex justify-between text-xs">
                              <span className="text-muted-foreground">邮箱:</span>
                              <span className="font-medium text-foreground">{linkedin.email}</span>
                            </div>
                          )}
                          {linkedin.location && (
                            <div className="flex justify-between text-xs">
                              <span className="text-muted-foreground">位置:</span>
                              <span className="font-medium text-foreground">{linkedin.location}</span>
                            </div>
                          )}
                          {linkedin.url && (
                            <div className="flex justify-between text-xs">
                              <span className="text-muted-foreground">链接:</span>
                              <a href={linkedin.url} target="_blank" rel="noopener noreferrer" className="font-medium text-blue-600 hover:underline">
                                查看资料
                              </a>
                            </div>
                          )}
                        </div>
                      </div>
                    ))}
                    
                    {/* 投资平台和交易所卡片 */}
                    {social?.investment_platforms && social.investment_platforms.length > 0 && social.investment_platforms.map((platform, pIdx) => {
                      // 获取平台域名用于Logo
                      const getPlatformDomain = (name) => {
                        const lowerName = name.toLowerCase();
                        if (lowerName.includes('robinhood')) return 'robinhood.com';
                        if (lowerName.includes('coinbase')) return 'coinbase.com';
                        if (lowerName.includes('binance')) return 'binance.com';
                        if (lowerName.includes('kraken')) return 'kraken.com';
                        if (lowerName.includes('gemini')) return 'gemini.com';
                        if (lowerName.includes('crypto.com')) return 'crypto.com';
                        if (lowerName.includes('etrade') || lowerName.includes('e*trade')) return 'etrade.com';
                        if (lowerName.includes('schwab')) return 'schwab.com';
                        if (lowerName.includes('fidelity')) return 'fidelity.com';
                        if (lowerName.includes('td ameritrade')) return 'tdameritrade.com';
                        if (lowerName.includes('webull')) return 'webull.com';
                        if (lowerName.includes('paypal')) return 'paypal.com';
                        if (lowerName.includes('venmo')) return 'venmo.com';
                        return null;
                      };
                      
                      const domain = getPlatformDomain(platform.name);
                      const logoUrl = domain ? `https://www.google.com/s2/favicons?domain=${domain}&sz=32` : null;
                      
                      return (
                      <div key={`important_investment_${pIdx}`} className="rounded border p-3 transition-colors bg-green-600/10 border-green-600/30 hover:bg-green-600/20">
                        <div className="font-semibold text-sm text-foreground mb-2 capitalize flex items-center gap-2">
                          {logoUrl ? (
                            <img 
                              src={logoUrl} 
                              alt={`${platform.name} logo`} 
                              className="w-5 h-5 rounded"
                              onError={(e) => {
                                e.target.style.display = 'none';
                                e.target.nextSibling.style.display = 'inline';
                              }}
                            />
                          ) : null}
                          <AlertTriangle className="w-4 h-4 text-green-600" style={{ display: logoUrl ? 'none' : 'inline' }} />
                          <span>{platform.name}</span>
                        </div>
                        <div className="space-y-1">
                          <div className="flex justify-between text-xs">
                            <span className="text-muted-foreground">平台类型:</span>
                            <span className="font-medium text-foreground">
                              {platform.name.toLowerCase().includes('coinbase') || 
                               platform.name.toLowerCase().includes('binance') || 
                               platform.name.toLowerCase().includes('crypto') ||
                               platform.name.toLowerCase().includes('kraken') ? '加密货币交易所' : '投资平台'}
                            </span>
                          </div>
                          {platform.email && (
                            <div className="flex justify-between text-xs">
                              <span className="text-muted-foreground">邮箱:</span>
                              <span className="font-medium text-foreground">{platform.email}</span>
                            </div>
                          )}
                          {platform.username && (
                            <div className="flex justify-between text-xs">
                              <span className="text-muted-foreground">用户名:</span>
                              <span className="font-medium text-foreground">{platform.username}</span>
                            </div>
                          )}
                          {platform.phone && (
                            <div className="flex justify-between text-xs">
                              <span className="text-muted-foreground">手机:</span>
                              <span className="font-medium text-foreground">{platform.phone}</span>
                            </div>
                          )}
                          {platform.full_name && (
                            <div className="flex justify-between text-xs">
                              <span className="text-muted-foreground">姓名:</span>
                              <span className="font-medium text-foreground">{platform.full_name}</span>
                            </div>
                          )}
                          {platform.location && (
                            <div className="flex justify-between text-xs">
                              <span className="text-muted-foreground">位置:</span>
                              <span className="font-medium text-foreground">{platform.location}</span>
                            </div>
                          )}
                          {platform.reg_date && (
                            <div className="flex justify-between text-xs">
                              <span className="text-muted-foreground">注册日期:</span>
                              <span className="font-medium text-foreground">{platform.reg_date}</span>
                            </div>
                          )}
                          {platform.recordCount > 0 && (
                            <div className="flex justify-between text-xs">
                              <span className="text-muted-foreground">泄露记录数:</span>
                              <span className="font-medium text-foreground">{platform.recordCount}</span>
                            </div>
                          )}
                          {platform.infoLeak && (
                            <div className="text-xs mt-2 pt-2 border-t border-border/50">
                              <span className="text-muted-foreground">{platform.infoLeak}</span>
                            </div>
                          )}
                        </div>
                      </div>
                      );
                    })}
                  </div>
                </div>
              ) : null}

              {/* 邮箱重点投资泄露 */}
              {comprehensive_data?.email_investment_leaks && comprehensive_data.email_investment_leaks.length > 0 && (
                <div className="mt-6">
                  <hr className="border-border mb-4" />
                  <h3 className="text-sm font-bold text-muted-foreground uppercase tracking-wider mb-4">邮箱重点投资泄露</h3>
                  <div className="space-y-3">
                    {comprehensive_data.email_investment_leaks.map((leak, idx) => {
                      const displayInfo = [];
                      
                      if (leak.email) displayInfo.push({ key: '邮箱', value: leak.email });
                      if (leak.source) displayInfo.push({ key: '来源', value: leak.source });
                      if (leak.leak_date) displayInfo.push({ key: '泄露日期', value: leak.leak_date });
                      if (leak.investment_type) displayInfo.push({ key: '投资类型', value: leak.investment_type });
                      if (leak.amount) displayInfo.push({ key: '金额', value: leak.amount });
                      
                      if (displayInfo.length === 0) return null;
                      
                      return (
                        <div key={idx} className="rounded border p-3 transition-colors bg-yellow-500/10 border-yellow-500/30 hover:bg-yellow-500/20">
                          <div className="font-semibold text-sm text-foreground mb-2 capitalize flex items-center gap-2">
                            <AlertTriangle className="w-4 h-4 text-yellow-500" />
                            <span>{leak.platform || leak.source || '投资平台泄露'}</span>
                          </div>
                          <div className="space-y-1">
                            {displayInfo.map((item, i) => (
                              <div key={i} className="flex justify-between text-xs">
                                <span className="text-muted-foreground capitalize">{item.key}:</span>
                                <span className="font-medium text-foreground">{item.value}</span>
                              </div>
                            ))}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>

            {/* Main Content */}
            <div className="lg:col-span-2 p-6 md:p-8 space-y-6">
              
              {/* Contact Info Section */}
              {(contact.phones || contact.emails || basic_info.phone || basic_info.email || (contact.usernames && contact.usernames.length > 0)) && (
                <div className="border-b border-border pb-6">
                  <h2 className="text-lg font-bold mb-4 flex items-center gap-2">
                    <Mail className="w-5 h-5 text-primary" />
                    联系方式
                  </h2>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {(basic_info.phone || displayPhones.length > 0) && (
                      <div className="md:col-span-2">
                         <div className="flex justify-between items-start py-2 border-b border-border last:border-0">
                            <span className="text-sm font-medium text-muted-foreground">电话</span>
                            <div className="text-right flex flex-col gap-1">
                               {displayPhones.length > 0 ? (
                                  displayPhones.map((ph, i) => {
                                    // 智能识别电话类型
                                    const isHomePhone = contact.home_phone && ph === contact.home_phone;
                                    const phoneInfo = isHomePhone 
                                      ? { type: 'home', label: '家庭座机', IconComponent: PhoneIcons.home, color: 'green' }
                                      : identifyPhoneType(ph, null, null);
                                    const IconComp = phoneInfo.IconComponent;
                                    return (
                                      <span key={i} className={`text-sm text-foreground px-2 py-1 rounded font-mono flex items-center gap-2 ${
                                        phoneInfo.type === 'home' || phoneInfo.type === 'landline' ? 'bg-green-500/10 border border-green-500/30' : 
                                        phoneInfo.type === 'work' ? 'bg-purple-500/10 border border-purple-500/30' : 
                                        phoneInfo.type === 'tollfree' ? 'bg-gray-500/10 border border-gray-500/30' :
                                        'bg-blue-500/10 border border-blue-500/30'
                                      }`}>
                                        <IconComp className={`w-4 h-4 ${
                                          phoneInfo.type === 'home' || phoneInfo.type === 'landline' ? 'text-green-500' : 
                                          phoneInfo.type === 'work' ? 'text-purple-500' : 
                                          phoneInfo.type === 'tollfree' ? 'text-gray-500' :
                                          'text-blue-500'
                                        }`} />
                                        {ph}
                                        <span className={`text-[10px] font-bold uppercase px-1.5 py-0.5 rounded ${
                                          phoneInfo.type === 'home' || phoneInfo.type === 'landline' ? 'text-green-600 bg-green-600/20' : 
                                          phoneInfo.type === 'work' ? 'text-purple-600 bg-purple-600/20' : 
                                          phoneInfo.type === 'tollfree' ? 'text-gray-600 bg-gray-600/20' :
                                          'text-blue-600 bg-blue-600/20'
                                        }`}>
                                          {phoneInfo.label}
                                        </span>
                                      </span>
                                    );
                                  })
                               ) : (
                                  <span className="text-sm text-foreground bg-blue-500/10 border border-blue-500/30 px-2 py-1 rounded font-mono">{basic_info.phone || '无有效电话'}</span>
                               )}
                            </div>
                         </div>
                      </div>
                    )}
                    {(basic_info.email || displayEmails.length > 0) && (
                      <div className="md:col-span-2">
                         <div className="flex justify-between items-start py-2 border-b border-border last:border-0">
                            <span className="text-sm font-medium text-muted-foreground">邮箱</span>
                            <div className="text-right flex flex-col gap-1">
                               {displayEmails.length > 0 ? (
                                  displayEmails.map((e, i) => {
                                    const isMainEmail = mostFrequentEmail && e.toLowerCase().trim() === mostFrequentEmail;
                                    const emailInfo = identifyEmailType(e);
                                    const EmailIcon = emailInfo.IconComponent;
                                    return (
                                      <span key={i} className={`text-sm text-foreground px-2 py-1 rounded font-mono flex items-center gap-2 ${
                                        isMainEmail ? 'bg-green-600/20 border-2 border-green-600/50' : 
                                        emailInfo.type === 'work' ? 'bg-purple-500/10 border border-purple-500/30' : 
                                        'bg-blue-500/10 border border-blue-500/30'
                                      }`}>
                                        <EmailIcon className={`w-4 h-4 ${emailInfo.type === 'work' ? 'text-purple-500' : 'text-blue-500'}`} />
                                        {e}
                                        <span className={`text-[10px] font-bold uppercase px-1.5 py-0.5 rounded ${emailInfo.type === 'work' ? 'text-purple-600 bg-purple-600/20' : 'text-blue-600 bg-blue-600/20'}`}>
                                          {emailInfo.label}
                                        </span>
                                        {isMainEmail && (
                                          <span className="text-[10px] font-bold text-green-600 uppercase bg-green-600/20 px-1.5 py-0.5 rounded">主邮箱</span>
                                        )}
                                      </span>
                                    );
                                  })
                               ) : (
                                  <span className="text-sm text-foreground bg-green-500/10 border border-green-500/30 px-2 py-1 rounded font-mono">{basic_info.email || '无有效邮箱'}</span>
                               )}
                            </div>
                         </div>
                      </div>
                    )}
                    {contact.username && contact.username !== 'N/A' && (
                      <InfoRow label="用户名" value={contact.username} />
                    )}
                    {contact.usernames && contact.usernames.length > 0 && (
                       <div className="md:col-span-2">
                         <div className="flex justify-between items-start py-2 border-b border-border last:border-0">
                            <span className="text-sm font-medium text-muted-foreground">关联用户名</span>
                            <div className="text-right flex flex-wrap justify-end gap-2">
                               {contact.usernames.map((u, i) => (
                                  <span key={i} className="text-xs bg-muted px-2 py-1 rounded text-foreground">{u}</span>
                               ))}
                            </div>
                         </div>
                       </div>
                    )}
                    {contact.home_phone && !displayPhones.includes(contact.home_phone) && (
                      <div className="md:col-span-2">
                        <div className="flex justify-between items-start py-2 border-b border-border last:border-0">
                          <span className="text-sm font-medium text-muted-foreground">家庭座机</span>
                          <span className="text-sm text-foreground bg-green-500/10 border border-green-500/30 px-2 py-1 rounded font-mono flex items-center gap-2">
                            <Phone className="w-4 h-4 text-green-500" />
                            {contact.home_phone}
                            <span className="text-[10px] font-bold uppercase px-1.5 py-0.5 rounded text-green-600 bg-green-600/20">家庭座机</span>
                          </span>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Address Section */}
              {(address.full_address || address.city || address.state || (location.coordinates && location.coordinates.length > 0)) && (
                <div className="border-b border-border pb-6">
                  <h2 className="text-lg font-bold mb-4 flex items-center gap-2">
                    <MapPin className="w-5 h-5 text-primary" />
                    地址信息
                  </h2>
                  
                  {/* Map Display */}
                  {location.coordinates && location.coordinates.length > 0 && (
                      <div className="mb-6">
                          <MapSection coordinates={location.coordinates} />
                      </div>
                  )}

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {address.full_address && address.full_address !== 'N/A' && (
                      <div className="md:col-span-2">
                        <InfoRow label="完整地址" value={address.full_address} />
                      </div>
                    )}
                    <InfoRow label="城市" value={address.city} />
                    <InfoRow label="州" value={address.state} />
                    <InfoRow label="邮编" value={address.postcode} />
                    <InfoRow label="行政区" value={address.district} />
                    <InfoRow label="国家" value={address.country} />
                    {/* Display coordinates from data.user_profile */}
                    {(() => {
                      const userProfile = data?.user_profile || {};
                      const lat = userProfile.latitude;
                      const lon = userProfile.longitude;
                      
                      if (lat || lon) {
                        return (
                          <div className="md:col-span-2">
                            <InfoRow 
                              label="坐标经纬度" 
                              value={
                                <span className="flex items-center gap-2">
                                  <span>纬度: {lat}, 经度: {lon}</span>
                                  {lat && lon && (
                                    <a 
                                      href={`https://www.google.com/maps?q=${lat},${lon}&t=k`}
                                      target="_blank"
                                      rel="noopener noreferrer"
                                      className="text-primary hover:underline text-sm"
                                      title="在 Google 卫星地图中查看"
                                    >
                                      (🛰️ 卫星地图查看)
                                    </a>
                                  )}
                                </span>
                              }
                            />
                          </div>
                        );
                      }
                      return null;
                    })()}
                  </div>
                </div>
              )}

              {/* Phone Carrier Info */}
              {(phone_info.carrier || phone_info.caller_id || phone_info.timezone_code) && (
                <div className="border-b border-border pb-6">
                  <h2 className="text-lg font-bold mb-4 flex items-center gap-2">
                    <Phone className="w-5 h-5 text-primary" />
                    电话运营商
                  </h2>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <InfoRow label="运营商" value={phone_info.carrier} />
                    <InfoRow label="来电显示" value={phone_info.caller_id} />
                    <InfoRow label="时区" value={phone_info.timezone_code ? `${phone_info.timezone_code} (${phone_info.utc || ''})` : phone_info.timezone} />
                    <InfoRow label="时区名称" value={phone_info.timezone_name} />
                    <InfoRow label="国家" value={phone_info.country} />
                    <InfoRow label="语言" value={phone_info.language} />
                  </div>
                </div>
              )}

              {/* IP 地址信息 - 放在电话运营商下面 */}
              {((security.ips && security.ips.length > 0) || data.user_profile?.login_ips) && (
                <div className="border-b border-border pb-6">
                  <h2 className="text-lg font-bold mb-4 flex items-center gap-2">
                    <Globe className="w-5 h-5 text-primary" />
                    IP 地址信息
                  </h2>
                  <div className="flex flex-wrap gap-2">
                    {(() => {
                      let displayIps = security.ips || [];
                      // 尝试从 user_profile.login_ips 获取 IP
                      const loginIps = data.user_profile?.login_ips;
                      if (loginIps && loginIps !== 'N/A') {
                        const compIps = Array.isArray(loginIps) 
                          ? loginIps 
                          : loginIps.split(' / ').map(i => i.trim()).filter(i => i && i !== 'N/A');
                        displayIps = [...new Set([...displayIps, ...compIps])];
                      }
                      return displayIps.map((ip, idx) => (
                        <span key={idx} className="px-3 py-1.5 bg-orange-500/10 text-orange-600 border border-orange-500/30 text-sm font-mono rounded flex items-center gap-2">
                          <Globe className="w-3 h-3" />
                          {ip}
                        </span>
                      ));
                    })()}
                  </div>
                </div>
              )}

              {/* Professional Info */}
              {(professional.company || professional.position || professional.company_size || professional.job_start_date || professional.education || professional.skills || professional.summary || (professional.history && professional.history.length > 0)) && (
                <div className="border-b border-border pb-6">
                  <h2 className="text-lg font-bold mb-4 flex items-center gap-2">
                    <Briefcase className="w-5 h-5 text-primary" />
                    职业信息
                  </h2>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <InfoRow label="公司" value={professional.company} />
                    <InfoRow label="职位" value={professional.position} />
                    <InfoRow label="行业" value={professional.industry} />
                    <InfoRow label="职级" value={professional.position_level} />
                    <InfoRow label="公司规模" value={professional.company_size} />
                    <InfoRow label="入职日期" value={professional.job_start_date} />
                    <InfoRow label="学历" value={professional.education} />
                    {professional.skills && (
                      <div className="md:col-span-2">
                        <InfoRow label="技能" value={professional.skills} />
                      </div>
                    )}
                    {professional.summary && (
                      <div className="md:col-span-2">
                        <InfoRow label="简介" value={professional.summary} />
                      </div>
                    )}
                    {professional.company_desc && (
                      <div className="md:col-span-2">
                        <InfoRow label="公司描述" value={professional.company_desc} />
                      </div>
                    )}
                  </div>
                  {professional.history && professional.history.length > 0 && (
                    <div className="mt-4 space-y-2">
                      <div className="text-sm font-semibold text-muted-foreground">工作经历记录</div>
                      {professional.history.map((job, idx) => (
                        <div key={idx} className="text-sm p-3 bg-muted/20 rounded border border-border/50 flex justify-between items-start gap-2">
                          <div className="flex-1">
                              <div className="font-medium text-foreground">{job.title || '未知职位'}</div>
                              {job.company && (
                                  <div className="text-muted-foreground text-xs mt-0.5 font-semibold">
                                      {job.company}
                                  </div>
                              )}
                              {(job.start_date || job.end_date) && (
                                  <div className="text-[10px] text-muted-foreground mt-1">
                                      {job.start_date || '?'} - {job.end_date || 'Present'}
                                  </div>
                              )}
                          </div>
                          <div className="text-[10px] text-muted-foreground opacity-60 bg-muted px-1.5 py-0.5 rounded whitespace-nowrap max-w-[100px] truncate" title={job.source}>
                              {job.source}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* Business Info - 公司详细信息 */}
              {(business.company_name || business.annual_revenue || business.category || business.website || business.naics || business.industry) && (
                <div className="border-b border-border pb-6">
                  <h2 className="text-lg font-bold mb-4 flex items-center gap-2">
                    <Building2 className="w-5 h-5 text-primary" />
                    公司详细信息
                  </h2>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {business.company_name && (
                      <div className="md:col-span-2">
                        <InfoRow label="公司名称" value={business.company_name} />
                      </div>
                    )}
                    {business.website && (
                      <div className="md:col-span-2">
                        <div className="flex justify-between items-start py-2 border-b border-border last:border-0">
                          <span className="text-sm font-medium text-muted-foreground">公司网站</span>
                          <a href={business.website.startsWith('http') ? business.website : `https://${business.website}`} 
                             target="_blank" 
                             rel="noopener noreferrer"
                             className="text-sm text-blue-500 hover:text-blue-600 hover:underline flex items-center gap-1">
                            <Globe className="w-4 h-4" />
                            {business.website}
                          </a>
                        </div>
                      </div>
                    )}
                    <InfoRow label="年收入" value={business.annual_revenue} />
                    <InfoRow label="行业" value={business.industry} />
                    <InfoRow label="类别" value={business.category} />
                    <InfoRow label="子类别" value={business.sub_category} />
                    <InfoRow label="业务类型" value={business.type} />
                    <InfoRow label="店铺类型" value={business.store_type} />
                    <InfoRow label="门店类型" value={business.location_type} />
                    <InfoRow label="NAICS代码" value={business.naics} />
                    <InfoRow label="SIC代码" value={business.sic_code} />
                    {business.year_founded && business.year_founded !== '0' && (
                      <InfoRow label="成立年份" value={business.year_founded} />
                    )}
                  </div>
                </div>
              )}

              {/* License Info - 执照/许可信息 */}
              {(license.type || license.number || license.issued_at) && (
                <div className="border-b border-border pb-6">
                  <h2 className="text-lg font-bold mb-4 flex items-center gap-2">
                    <FileText className="w-5 h-5 text-primary" />
                    执照/许可信息
                  </h2>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <InfoRow label="类型" value={license.type} />
                    <InfoRow label="证件号" value={license.number} />
                    <InfoRow label="ID" value={license.id} />
                    <InfoRow label="颁发日期" value={license.issued_at} />
                  </div>
                </div>
              )}

              {/* Family Info */}
              {(family.children_count || family.marital_status || family.spouse || family.relatives) && (
                <div className="border-b border-border pb-6">
                  <h2 className="text-lg font-bold mb-4 flex items-center gap-2">
                    <User className="w-5 h-5 text-primary" />
                    家庭信息
                  </h2>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <InfoRow label="婚姻状况" value={family.marital_status} />
                    <InfoRow label="子女数量" value={family.children_count} />
                    {family.spouse && family.spouse !== 'N/A' && (
                      <div className="md:col-span-2">
                        <div className="flex justify-between items-start py-2 border-b border-border last:border-0">
                          <span className="text-sm font-medium text-muted-foreground">配偶姓名</span>
                          <span className="text-sm text-foreground bg-purple-500/10 border border-purple-500/30 px-3 py-1.5 rounded font-medium">
                            {family.spouse}
                          </span>
                        </div>
                      </div>
                    )}
                    {family.relatives && (
                      <div className="md:col-span-2">
                        <div className="text-sm font-medium text-muted-foreground mb-2">亲属关系</div>
                        <div className="text-sm text-foreground bg-muted/30 p-3 rounded border border-border/50 break-words">
                          {family.relatives}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Housing Info */}
              {(housing.built_year || housing.type || housing.value || housing.house_number || housing.price || housing.purchase_year || housing.bedrooms || housing.bathrooms) && (
                <div className="border-b border-border pb-6">
                  <h2 className="text-lg font-bold mb-4 flex items-center gap-2">
                    <Home className="w-5 h-5 text-primary" />
                    房屋信息
                  </h2>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <InfoRow label="建造年份" value={housing.built_year} />
                    <InfoRow label="购买年份" value={housing.purchase_year} />
                    <InfoRow label="房屋类型" value={housing.type} />
                    <InfoRow label="房屋价值" value={housing.value || housing.price} sensitive={true} />
                    <InfoRow label="卧室数量" value={housing.bedrooms} />
                    <InfoRow label="浴室数量" value={housing.bathrooms} />
                    <InfoRow label="门牌号" value={housing.house_number} />
                  </div>
                </div>
              )}

              {/* Assets Info */}
              {((assets.vehicles && assets.vehicles.length > 0) || assets.boat_owner) && (
                <div className="border-b border-border pb-6">
                  <h2 className="text-lg font-bold mb-4 flex items-center gap-2">
                    <CreditCard className="w-5 h-5 text-primary" />
                    资产信息
                  </h2>
                  {assets.boat_owner && (
                      <div className="mb-2">
                          <span className="px-2 py-1 bg-blue-100 text-blue-800 text-xs font-bold rounded">船主 (Boat Owner)</span>
                      </div>
                  )}
                  {assets.vehicles && assets.vehicles.length > 0 && (
                    <div className="space-y-2">
                      <div className="text-sm font-semibold text-muted-foreground">车辆信息 ({assets.vehicles.length})</div>
                      {assets.vehicles.map((v, idx) => (
                        <div key={idx} className="text-sm p-3 bg-muted/20 rounded border border-border/50">
                          <div className="flex justify-between items-center">
                            <span className="font-medium text-foreground">{v.brand}</span>
                            {v.year && <span className="text-xs bg-primary/10 text-primary px-2 py-0.5 rounded">{v.year}年</span>}
                          </div>
                          {v.number && v.number !== 'N/A' && (
                            <div className="mt-1 text-xs text-muted-foreground font-mono">
                              VIN: {v.number}
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* Demographics Info */}
              {(demographics.religion || demographics.ethnicity || demographics.ethnic_group || demographics.political_party || demographics.has_cats || demographics.has_dogs) && (
                <div className="border-b border-border pb-6">
                  <h2 className="text-lg font-bold mb-4 flex items-center gap-2">
                    <User className="w-5 h-5 text-primary" />
                    个人特征
                  </h2>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <InfoRow label="宗教" value={demographics.religion} />
                    <InfoRow label="种族" value={demographics.ethnic_code || demographics.ethnicity || demographics.ethnic_group} />
                    <InfoRow label="政治倾向" value={demographics.party_voted || demographics.political_party} />
                    {(demographics.has_cats || demographics.has_dogs) && (
                        <div className="md:col-span-2 flex gap-2 mt-2">
                            {demographics.has_cats === 'Y' && <span className="px-2 py-1 bg-orange-100 text-orange-800 text-xs rounded">🐱 养猫</span>}
                            {demographics.has_cats === 'N' && <span className="px-2 py-1 bg-gray-100 text-gray-600 text-xs rounded">不养猫</span>}
                            {demographics.has_dogs === 'Y' && <span className="px-2 py-1 bg-amber-100 text-amber-800 text-xs rounded">🐶 养狗</span>}
                            {demographics.has_dogs === 'N' && <span className="px-2 py-1 bg-gray-100 text-gray-600 text-xs rounded">不养狗</span>}
                        </div>
                    )}
                  </div>
                </div>
              )}

              {/* Voter Info - 选民信息 */}
              {(voter.polling_station || voter.registration_date || voter.party || voter.status) && (
                <div className="border-b border-border pb-6">
                  <h2 className="text-lg font-bold mb-4 flex items-center gap-2">
                    <FileText className="w-5 h-5 text-primary" />
                    选民信息
                  </h2>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <InfoRow label="投票站" value={voter.polling_station} />
                    <InfoRow label="注册日期" value={voter.registration_date} />
                    <InfoRow label="政党" value={voter.party} />
                    <InfoRow label="选民状态" value={voter.status} />
                    <InfoRow label="所在县" value={voter.county} />
                  </div>
                </div>
              )}

              {/* Financial Info */}
              {(financial.income || financial.house_price || financial.credit_capacity || financial.net_worth || financial.bank) && (
                <div className="border-b border-border pb-6">
                  <h2 className="text-lg font-bold mb-4 flex items-center gap-2">
                    <DollarSign className="w-5 h-5 text-primary" />
                    财务信息
                  </h2>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <InfoRow label="收入" value={financial.income} sensitive={true} />
                    <InfoRow label="净资产" value={financial.net_worth} sensitive={true} />
                    <InfoRow label="房产价值" value={financial.house_price} sensitive={true} />
                    <InfoRow label="信用额度" value={financial.credit_capacity} sensitive={true} />
                    <InfoRow label="银行" value={financial.bank} />
                  </div>
                </div>
              )}

              {/* Social Media */}
              {((social.external_profiles && social.external_profiles !== 'N/A') || (social.profiles && social.profiles.length > 0) || social.username || social.linkedin_username) && (
                <div className="border-b border-border pb-6">
                  <h2 className="text-lg font-bold mb-4 flex items-center gap-2">
                    <Globe className="w-5 h-5 text-primary" />
                    社交媒体
                  </h2>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-2">
                    <InfoRow label="用户名" value={social.username} />
                    {social.linkedin_username && (
                      <div className="flex justify-between items-start py-2 border-b border-border last:border-0">
                        <span className="text-sm font-medium text-muted-foreground">LinkedIn</span>
                        <a href={`https://linkedin.com/in/${social.linkedin_username}`} target="_blank" rel="noopener noreferrer" className="text-sm text-primary hover:underline">
                          {social.linkedin_username}
                        </a>
                      </div>
                    )}
                  </div>
                  <InfoRow label="外部资料" value={social.external_profiles} />
                  {social.profiles && social.profiles.length > 0 && (
                    <div className="mt-2 flex flex-col gap-2">
                      {social.profiles.map((url, idx) => (
                        <a key={idx} href={url} target="_blank" rel="noopener noreferrer" className="text-sm text-primary hover:underline truncate block">
                          {url}
                        </a>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* Security Info */}
              {(security.leak_sources || security.login_ips || security.passwords || security.ips || security.ssn || data.user_profile?.login_ips) && (
                <div className="border-b border-border pb-6">
                  <h2 className="text-lg font-bold mb-4 flex items-center gap-2">
                    <Lock className="w-5 h-5 text-destructive" />
                    安全信息
                  </h2>
                  
                  {/* SSN - 只显示主要查询对象的 */}
                  {security.ssn && (
                    <div className="mb-6 p-3 bg-red-500/10 border border-red-500/30 rounded">
                      <div className="text-sm font-semibold text-red-500 mb-1">社会安全号码 (SSN)</div>
                      <div className="font-mono text-lg text-red-600">{security.ssn}</div>
                    </div>
                  )}
                  
                  {/* Leak Sources & Details */}
                  {Array.isArray(security.leak_sources) && security.leak_sources.length > 0 && (
                    <div className="mb-6">
                      <div className="text-sm font-semibold text-muted-foreground mb-3">数据泄露来源 ({security.leak_sources.length})</div>
                      <div className="space-y-3">
                        {security.leak_sources.map((source, idx) => (
                          <div key={idx} className="p-3 bg-muted/20 rounded border border-border/50">
                            <div className="flex items-center justify-between mb-1">
                                <span className="font-bold text-destructive text-sm">{source}</span>
                            </div>
                            {security.leak_details && security.leak_details[source] && (
                                <p className="text-xs text-muted-foreground leading-relaxed">
                                    {security.leak_details[source]}
                                </p>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Passwords */}
                  {security.passwords && security.passwords.length > 0 && (
                    <div className="mb-6">
                      <div className="text-sm font-semibold text-muted-foreground mb-2">泄露凭证 ({security.passwords.length})</div>
                      <div className="space-y-2 max-h-60 overflow-y-auto pr-2 custom-scrollbar">
                        {security.passwords.map((pwd, idx) => {
                          // 判断是否为 Hash
                          const isHash = pwd.value.length > 30 || pwd.value.startsWith('$') || /^[a-f0-9]{32,}$/i.test(pwd.value);
                          const displayType = isHash ? 'HASH' : 'PLAINTEXT';
                          const typeColor = isHash ? 'bg-orange-100 text-orange-800' : 'bg-red-100 text-red-800';
                          
                          return (
                            <div key={idx} className="flex flex-col sm:flex-row sm:justify-between sm:items-start text-sm p-2 bg-muted/30 rounded gap-2">
                              <div className="flex flex-col gap-1 min-w-[120px]">
                                  <div className="flex flex-wrap gap-1">
                                      {pwd.sources && pwd.sources.map((src, sIdx) => (
                                          <span key={sIdx} className="text-[10px] px-1 bg-muted text-muted-foreground rounded border border-border">{src}</span>
                                      ))}
                                      {!pwd.sources && <span className="text-xs text-muted-foreground">{pwd.source}</span>}
                                  </div>
                              </div>
                              <div className="flex flex-col items-end gap-1 flex-1 min-w-0 w-full">
                                 <div className="flex items-center gap-2 w-full justify-end">
                                     <span className={`font-mono text-[10px] px-1.5 py-0.5 rounded whitespace-nowrap ${typeColor}`}>{displayType}</span>
                                     <span className="font-mono text-destructive text-xs break-all text-right">{pwd.value}</span>
                                 </div>
                                 {pwd.types && (
                                     <div className="text-[10px] text-muted-foreground opacity-70">
                                         {pwd.types.join(', ')}
                                     </div>
                                 )}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Physical Characteristics */}
              {(physical.height || physical.weight || physical.eye_color || physical.hair_color) && (
                <div className="border-b border-border pb-6">
                  <h2 className="text-lg font-bold mb-4 flex items-center gap-2">
                    <User className="w-5 h-5 text-primary" />
                    身体特征
                  </h2>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <InfoRow label="身高" value={physical.height} />
                    <InfoRow label="体重" value={physical.weight} />
                    <InfoRow label="眼睛颜色" value={physical.eye_color} />
                    <InfoRow label="头发颜色" value={physical.hair_color} />
                  </div>
                </div>
              )}

              {/* Credit Card Info - Sensitive */}
              {financial.credit_card && financial.credit_card.number && (
                <div className="border-b border-border pb-6">
                  <h2 className="text-lg font-bold mb-4 flex items-center gap-2 text-red-500">
                    <CreditCard className="w-5 h-5" />
                    信用卡信息 (敏感)
                  </h2>
                  <div className="p-4 bg-red-500/10 border border-red-500/30 rounded">
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                      <div>
                        <div className="text-xs font-semibold text-red-400 uppercase mb-1">卡号</div>
                        <div className="font-mono text-red-500">{financial.credit_card.number}</div>
                      </div>
                      {financial.credit_card.cvv && (
                        <div>
                          <div className="text-xs font-semibold text-red-400 uppercase mb-1">CVV</div>
                          <div className="font-mono text-red-500">{financial.credit_card.cvv}</div>
                        </div>
                      )}
                      {financial.credit_card.expiration && (
                        <div>
                          <div className="text-xs font-semibold text-red-400 uppercase mb-1">有效期</div>
                          <div className="font-mono text-red-500">{financial.credit_card.expiration}</div>
                        </div>
                      )}
                      {financial.credit_card.type && (
                        <div>
                          <div className="text-xs font-semibold text-red-400 uppercase mb-1">类型</div>
                          <div className="font-mono text-red-500">{financial.credit_card.type}</div>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )}

              {/* Identity Documents */}
              {(identity.passport || identity.doc_number) && (
                <div className="border-b border-border pb-6">
                  <h2 className="text-lg font-bold mb-4 flex items-center gap-2 text-orange-500">
                    <FileText className="w-5 h-5" />
                    身份证件 (敏感)
                  </h2>
                  <div className="p-4 bg-orange-500/10 border border-orange-500/30 rounded">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {identity.passport && (
                        <div>
                          <div className="text-xs font-semibold text-orange-400 uppercase mb-1">护照号码</div>
                          <div className="font-mono text-orange-500">{identity.passport}</div>
                        </div>
                      )}
                      {identity.doc_number && (
                        <div>
                          <div className="text-xs font-semibold text-orange-400 uppercase mb-1">证件号码</div>
                          <div className="font-mono text-orange-500">{identity.doc_number}</div>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )}

              {/* Criminal Records */}
              {(criminal.arrest_date || criminal.court || criminal.punishment) && (
                <div className="border-b border-border pb-6">
                  <h2 className="text-lg font-bold mb-4 flex items-center gap-2 text-purple-500">
                    <AlertTriangle className="w-5 h-5" />
                    犯罪记录
                  </h2>
                  <div className="p-4 bg-purple-500/10 border border-purple-500/30 rounded">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {criminal.arrest_date && (
                        <div>
                          <div className="text-xs font-semibold text-purple-400 uppercase mb-1">逮捕日期</div>
                          <div className="font-mono text-purple-500">{criminal.arrest_date}</div>
                        </div>
                      )}
                      {criminal.offense_date && (
                        <div>
                          <div className="text-xs font-semibold text-purple-400 uppercase mb-1">犯罪日期</div>
                          <div className="font-mono text-purple-500">{criminal.offense_date}</div>
                        </div>
                      )}
                      {criminal.court && (
                        <div>
                          <div className="text-xs font-semibold text-purple-400 uppercase mb-1">法院</div>
                          <div className="font-mono text-purple-500">{criminal.court}</div>
                        </div>
                      )}
                      {criminal.punishment && (
                        <div className="md:col-span-2">
                          <div className="text-xs font-semibold text-purple-400 uppercase mb-1">判决</div>
                          <div className="font-mono text-purple-500">{criminal.punishment}</div>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )}

              {/* Statistics */}
              {metadata.filtered_records_count > 0 && (
                <div className="border-b border-border pb-6">
                  <h2 className="text-lg font-bold mb-4 flex items-center gap-2">
                    <Database className="w-5 h-5 text-primary" />
                    统计信息
                  </h2>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <InfoRow label="记录数" value={metadata.filtered_records_count} />
                    <InfoRow label="邮箱数" value={metadata.email_count} />
                    <InfoRow label="数据源" value={metadata.sale_source_count} />
                    <InfoRow label="最后活动" value={metadata.last_active} />
                  </div>
                </div>
              )}

              {/* Raw Records */}
              {Records && Records.length > 0 && (
                <div>
                  <h2 className="text-lg font-bold mb-4 flex items-center gap-2">
                    <FileText className="w-5 h-5 text-primary" />
                    原始记录 ({Records.length})
                  </h2>
                  <div className="space-y-3">
                    {Records.slice(0, 5).map((record, idx) => (
                      <div key={idx} className="p-4 bg-muted/20 rounded border border-border">
                        <div className="grid grid-cols-2 gap-2 text-xs">
                          {Object.entries(record).map(([key, value]) => (
                            <div key={key}>
                              <div className="text-muted-foreground font-semibold uppercase mb-1">{key}</div>
                              <div className="text-foreground font-mono break-all">{String(value)}</div>
                            </div>
                          ))}
                        </div>
                      </div>
                    ))}
                    {Records.length > 5 && (
                      <div className="text-center text-sm text-muted-foreground">
                        还有 {Records.length - 5} 条记录未显示
                      </div>
                    )}
                  </div>
                </div>
              )}

            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ResultsPage;
// 触发热重载