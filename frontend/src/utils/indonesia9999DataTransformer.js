/**
 * Indonesia 9999 API数据转换器
 * 将 9999 API 返回的数据转换为 ProfileReport 组件可以渲染的格式
 */

/**
 * 转换 9999 API 数据为 ProfileReport 格式
 * @param {Object} raw9999Data - 从 9999 API 返回的原始数据
 * @returns {Object} - ProfileReport 组件所需的格式化数据
 */
export function transform9999ToProfileReport(raw9999Data) {
  console.log('🔄 [Transform] 开始转换 9999 API 数据', raw9999Data);

  if (!raw9999Data || !raw9999Data.success) {
    console.error('❌ [Transform] 数据无效或查询失败');
    return null;
  }

  const data = raw9999Data.profile || raw9999Data.raw_data || raw9999Data.data || {};
  const rawData = raw9999Data.raw_data || data;

  // 基本信息
  const basicInfo = {
    name: data.basic_info?.name || rawData.step1_truecaller?.data?.[0]?.name || 'Unknown',
    age: data.basic_info?.age || null,
    gender: data.basic_info?.gender || null,
    birthday: data.basic_info?.birthday || null,
    occupation: data.basic_info?.occupation || null,
    company: data.basic_info?.company || null,
    education: data.basic_info?.education || null,
  };

  // 联系信息
  const contactInfo = {
    phones: [
      {
        phone: raw9999Data.phone || data.contact_info?.phone || rawData.step1_truecaller?.data?.[0]?.phones || '',
        type: 'primary'
      }
    ],
    emails: [],
    addresses: [],
    usernames: [],
  };

  // 从数据泄露中提取邮箱
  if (rawData.step3_email_queries?.data) {
    rawData.step3_email_queries.data.forEach((emailQuery) => {
      // 这里需要解析邮箱数据
      // 暂时跳过，因为数据结构需要进一步分析
    });
  }

  // 地址信息
  if (data.contact_info?.address) {
    contactInfo.addresses.push({
      full: data.contact_info.address,
      city: data.contact_info.city,
      state: data.contact_info.province,
      postal_code: data.contact_info.postal_code,
      type: 'primary'
    });
  }

  // 社交媒体信息
  const socialMedia = {
    telegram: data.social_media?.telegram || null,
    whatsapp: data.social_media?.whatsapp || null,
    facebook: data.social_media?.facebook || null,
    instagram: data.social_media?.instagram || null,
    twitter: data.social_media?.twitter || null,
  };

  // 平台验证数据
  const platformVerification = {
    data: [],
    platforms: []
  };

  // 添加 Truecaller 数据
  if (rawData.step1_truecaller?.status && rawData.step1_truecaller?.data?.length > 0) {
    const truecallerData = rawData.step1_truecaller.data[0];
    platformVerification.data.push({
      source: 'truecaller',
      success: true,
      data: {
        name: truecallerData.name,
        score: truecallerData.score,
        access: truecallerData.access,
        enhanced: truecallerData.enhanced,
      }
    });
  }

  // 数据泄露信息
  const securityInfo = {
    totalBreaches: 0,
    leakSources: [],
    leakSourceCount: 0,
    passwords: [],
    loginIps: [],
    breachList: []
  };

  // 从 step2_phone_query 提取数据泄露
  if (rawData.step2_phone_query?.success && rawData.step2_phone_query?.data?.List) {
    const breaches = rawData.step2_phone_query.data.List;
    Object.keys(breaches).forEach((sourceName) => {
      const breachData = breaches[sourceName];
      securityInfo.leakSources.push(sourceName);
      securityInfo.breachList.push({
        name: sourceName,
        domain: sourceName.toLowerCase().replace(/\s+/g, ''),
        breach_date: null,
        data_classes: [],
        description: breachData.InfoLeak || ''
      });
    });
    securityInfo.totalBreaches = securityInfo.leakSources.length;
    securityInfo.leakSourceCount = securityInfo.leakSources.length;
  }

  // 从 step4_name_query 添加更多泄露数据
  if (rawData.step4_name_query?.success && rawData.step4_name_query?.data?.List) {
    const nameBreaches = rawData.step4_name_query.data.List;
    Object.keys(nameBreaches).forEach((sourceName) => {
      if (!securityInfo.leakSources.includes(sourceName)) {
        const breachData = nameBreaches[sourceName];
        securityInfo.leakSources.push(sourceName);
        securityInfo.breachList.push({
          name: sourceName,
          domain: sourceName.toLowerCase().replace(/\s+/g, ''),
          breach_date: null,
          data_classes: [],
          description: breachData.InfoLeak || ''
        });
      }
    });
    securityInfo.totalBreaches = securityInfo.leakSources.length;
    securityInfo.leakSourceCount = securityInfo.leakSources.length;
  }

  // 专业信息
  const professionalInfo = {
    occupation: data.basic_info?.occupation || rawData.profile_summary?.inferred_profession || null,
    company: data.basic_info?.company || null,
    industry: rawData.profile_summary?.industry_keywords?.[0] || null,
    title: null
  };

  // 财务信息（从 9999 API 可能没有）
  const financialInfo = {
    estimated_income: null,
    income_range: null
  };

  // 家庭信息（从 9999 API 可能没有）
  const familyInfo = {
    marital_status: null,
    children_count: null,
    relatives: []
  };

  // 住房信息（从 9999 API 可能没有）
  const housingInfo = {
    home_type: null,
    home_value: null,
    year_built: null
  };

  // 车辆信息（从 9999 API 可能没有）
  const vehicleInfo = {
    vehicles: []
  };

  // 选民信息（从 9999 API 可能没有）
  const voterInfo = {
    registered: false,
    registration_date: null,
    polling_station: null
  };

  // 运营商信息
  const carrierInfo = {
    carrier: null,
    lineType: null,
    callerId: basicInfo.name,
    internationalPhone: raw9999Data.phone || '',
    country: 'Indonesia',
    countryCode: 'ID'
  };

  // 标识符
  const identifiers = {
    ssn: null,
    tax_id: null,
    nik: null  // 印尼身份证号
  };

  // 构建最终的 ProfileReport 数据
  const profileReport = {
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
    identifiers,
    
    // 原始数据和平台验证
    rawData: {
      comprehensive_data: {
        platform_verification: platformVerification,
        social_profiles: socialMedia
      }
    },
    
    // 查询元数据
    query_metadata: rawData.query_metadata || {
      query_time: new Date().toISOString(),
      source: 'indonesia_api_9999'
    }
  };

  console.log('✅ [Transform] 转换完成', profileReport);
  return profileReport;
}

/**
 * 检查9999 API返回的数据是否有效
 * @param {Object} data - API返回的数据
 * @returns {boolean}
 */
export function is9999DataValid(data) {
  return !!(data && data.success && (data.profile || data.raw_data || data.data));
}
