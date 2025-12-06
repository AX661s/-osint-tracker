/**
 * ProfileReport - 人物信息报告组件
 * 样式参考：左侧个人信息+平台验证，右侧联系方式+地址信息
 */

import React, { useMemo, useState, useEffect, useRef } from 'react';
import { 
  ArrowLeft, Phone, MapPin, Mail, User, CheckCircle, XCircle,
  Briefcase, DollarSign, Users, Home, Car, Vote, AlertTriangle,
  Ship, Cat, Dog, Calendar, Globe, Shield, Building, CreditCard, Check, X
} from 'lucide-react';

// 状态显示组件
const StatusValue = ({ positive, value }) => {
  if (positive === true) {
    return <span className="flex items-center gap-1 text-green-400"><Check className="w-4 h-4" /> {value}</span>;
  } else if (positive === false) {
    return <span className="flex items-center gap-1 text-red-400"><X className="w-4 h-4" /> {value}</span>;
  }
  return <span>{value}</span>;
};

// 警告状态组件
const WarningValue = ({ show, value }) => {
  if (show) {
    return <span className="flex items-center gap-1 text-amber-400"><AlertTriangle className="w-4 h-4" /> {value}</span>;
  }
  return null;
};
import mapboxgl from 'mapbox-gl';
import 'mapbox-gl/dist/mapbox-gl.css';
import { createProfileReport } from '../utils/ProfileDataProcessor';

// Mapbox Token
mapboxgl.accessToken = process.env.REACT_APP_MAPBOX_ACCESS_TOKEN || 'pk.eyJ1Ijoic3RlaW4xMjMiLCJhIjoiY21ocTVwam9xMGE4aTJrczd4MW9yNTYzbyJ9.d2rHs6GWcZRkgdD6FAQaMA';

// 平台 Logo 映射
const platformLogos = {
  truecaller: 'https://www.google.com/s2/favicons?domain=truecaller.com&sz=32',
  ipqualityscore: 'https://www.google.com/s2/favicons?domain=ipqualityscore.com&sz=32',
  microsoft: 'https://www.google.com/s2/favicons?domain=microsoft.com&sz=32',
  microsoft_phone: 'https://www.google.com/s2/favicons?domain=microsoft.com&sz=32',
  telegram: 'https://www.google.com/s2/favicons?domain=telegram.org&sz=32',
  telegram_complete: 'https://www.google.com/s2/favicons?domain=telegram.org&sz=32',
  melissa: 'https://www.google.com/s2/favicons?domain=melissa.com&sz=32',
  phone_lookup: 'https://www.google.com/s2/favicons?domain=melissa.com&sz=32',
  whatsapp: 'https://www.google.com/s2/favicons?domain=whatsapp.com&sz=32',
  facebook: 'https://www.google.com/s2/favicons?domain=facebook.com&sz=32',
  caller_id: 'https://www.google.com/s2/favicons?domain=facebook.com&sz=32',
  instagram: 'https://www.google.com/s2/favicons?domain=instagram.com&sz=32',
  snapchat: 'https://www.google.com/s2/favicons?domain=snapchat.com&sz=32',
  acelogic_telegram: 'https://www.google.com/s2/favicons?domain=telegram.org&sz=32',
  acelogic_whatsapp: 'https://www.google.com/s2/favicons?domain=whatsapp.com&sz=32',
};

// 地图组件
const MapSection = ({ coordinates }) => {
  const mapContainer = useRef(null);
  const map = useRef(null);

  useEffect(() => {
    if (!coordinates || coordinates.length === 0) return;
    
    if (map.current) {
      map.current.remove();
      map.current = null;
    }

    const center = coordinates[0];
    map.current = new mapboxgl.Map({
      container: mapContainer.current,
      style: 'mapbox://styles/mapbox/dark-v11',
      center: [center.lng, center.lat],
      zoom: 11
    });

    coordinates.forEach((coord, idx) => {
      const el = document.createElement('div');
      el.className = 'custom-marker';
      el.innerHTML = `<div style="background: #10b981; color: white; padding: 4px 8px; border-radius: 4px; font-size: 12px; font-weight: bold;">📍 位置 ${idx + 1}</div>`;
      
      const popup = new mapboxgl.Popup({ offset: 25 }).setHTML(
        `<div style="color: #000; padding: 8px;">
          <div style="font-weight: 600; margin-bottom: 4px;">地址: ${coord.address || 'N/A'}</div>
          <div style="font-size: 12px; color: #666;">数据来源: ${coord.source || 'Unknown'}</div>
          <div style="font-size: 11px; color: #999; margin-top: 4px;">坐标: ${coord.lat.toFixed(6)}, ${coord.lng.toFixed(6)}</div>
        </div>`
      );

      new mapboxgl.Marker({ color: '#10b981' })
        .setLngLat([coord.lng, coord.lat])
        .setPopup(popup)
        .addTo(map.current);
    });

    map.current.addControl(new mapboxgl.NavigationControl(), 'top-right');

    if (coordinates.length > 1) {
      const bounds = new mapboxgl.LngLatBounds();
      coordinates.forEach(coord => bounds.extend([coord.lng, coord.lat]));
      map.current.fitBounds(bounds, { padding: 50 });
    }

    return () => {
      if (map.current) {
        map.current.remove();
        map.current = null;
      }
    };
  }, [coordinates]);

  return (
    <div className="h-[400px] w-full rounded-lg overflow-hidden border border-border/30">
      <div ref={mapContainer} className="h-full w-full" />
    </div>
  );
};

// 验证标签
const VerifiedBadge = () => (
  <span className="px-2.5 py-1 bg-gradient-to-r from-emerald-500/20 to-green-500/20 text-emerald-400 text-xs font-medium rounded-full border border-emerald-500/30 shadow-[0_0_10px_rgba(16,185,129,0.2)]">
    ✓ 已验证
  </span>
);

// 未验证标签
const UnverifiedBadge = () => (
  <span className="px-2.5 py-1 bg-red-500/10 text-red-400 text-xs font-medium rounded-full border border-red-500/20">
    未找到
  </span>
);

// 平台卡片 - 高级版
const PlatformCard = ({ name, logo, verified, avatar, children }) => (
  <div className="group relative bg-gradient-to-br from-slate-900/80 to-slate-800/50 backdrop-blur-xl rounded-2xl p-5 mb-4 overflow-hidden transition-all duration-500 hover:shadow-[0_8px_32px_rgba(16,185,129,0.15)] hover:scale-[1.02] border border-emerald-500/10 hover:border-emerald-500/30">
    {/* 背景光效 */}
    <div className="absolute inset-0 bg-gradient-to-br from-emerald-500/5 via-transparent to-cyan-500/5 opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
    <div className="absolute top-0 left-0 w-full h-[1px] bg-gradient-to-r from-transparent via-emerald-400/60 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
    <div className="absolute bottom-0 left-0 w-full h-[1px] bg-gradient-to-r from-transparent via-cyan-400/30 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
    {/* 角落装饰 */}
    <div className="absolute top-0 right-0 w-20 h-20 bg-emerald-500/10 rounded-full blur-2xl opacity-0 group-hover:opacity-100 transition-opacity"></div>
    
    <div className="relative flex items-center justify-between mb-4">
      <div className="flex items-center gap-4">
        {avatar ? (
          <div className="relative">
            <div className="absolute inset-0 bg-gradient-to-r from-emerald-500 to-cyan-500 rounded-xl blur-md opacity-40 group-hover:opacity-60 transition-opacity"></div>
            <img src={avatar} alt={name} className="relative w-14 h-14 rounded-xl border-2 border-emerald-500/40 object-cover shadow-xl" />
            <div className="absolute -bottom-1 -right-1 w-4 h-4 bg-emerald-500 rounded-full border-2 border-slate-900 shadow-lg shadow-emerald-500/50"></div>
          </div>
        ) : (
          <div className="relative">
            <div className="absolute inset-0 bg-gradient-to-br from-slate-600 to-slate-700 rounded-xl blur-sm"></div>
            <div className="relative w-14 h-14 rounded-xl bg-gradient-to-br from-slate-700 to-slate-800 flex items-center justify-center shadow-xl border border-slate-600/50">
              <img src={logo} alt={name} className="w-7 h-7 opacity-80 group-hover:opacity-100 transition-opacity" onError={(e) => e.target.style.display = 'none'} />
            </div>
          </div>
        )}
        <div>
          <span className="font-bold text-white text-lg group-hover:text-emerald-300 transition-colors block tracking-wide">{name}</span>
          <span className="text-slate-500 text-xs flex items-center gap-1">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500/50"></span>
            平台验证
          </span>
        </div>
      </div>
      {verified && <VerifiedBadge />}
    </div>
    <div className="relative space-y-1 text-sm pl-1 border-t border-slate-700/30 pt-4">
      {children}
    </div>
  </div>
);

// 信息行 - 高级版
const InfoLine = ({ label, value, className = '', highlight = false, icon }) => {
  if (!value) return null;
  return (
    <div className={`group/line flex justify-between items-center py-2.5 px-3 rounded-xl hover:bg-gradient-to-r hover:from-emerald-500/5 hover:to-transparent transition-all duration-300 ${className}`}>
      <span className="text-slate-400 text-sm flex items-center gap-2 group-hover/line:text-slate-300 transition-colors">
        {icon && <span className="text-emerald-500/60">{icon}</span>}
        {label}
      </span>
      <span className={`text-right font-semibold ${highlight ? 'text-emerald-400 drop-shadow-[0_0_8px_rgba(16,185,129,0.3)]' : 'text-white'}`}>{value}</span>
    </div>
  );
};

// 信息卡片标题 - 高级版
const SectionTitle = ({ icon: Icon, title, count }) => (
  <div className="flex items-center justify-between mb-6">
    <div className="flex items-center gap-3">
      <div className="p-2.5 bg-gradient-to-br from-emerald-500/20 to-cyan-500/10 rounded-xl shadow-lg shadow-emerald-500/10">
        <Icon className="w-5 h-5 text-emerald-400" />
      </div>
      <div>
        <h3 className="text-lg font-bold text-white">{title}</h3>
        <div className="h-0.5 w-12 bg-gradient-to-r from-emerald-500 to-transparent rounded-full mt-1"></div>
      </div>
    </div>
    {count !== undefined && (
      <span className="px-3 py-1.5 bg-emerald-500/10 text-emerald-400 text-xs font-bold rounded-full border border-emerald-500/20">{count}</span>
    )}
  </div>
);

const SummaryTile = ({ title, value, detail, icon: Icon }) => (
  <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-white/5 to-white/5 border border-white/20 shadow-[0_8px_16px_rgba(2,6,23,0.15)] p-5 backdrop-blur-xl">
    <div className="absolute inset-0 bg-gradient-to-br from-cyan-500/5 via-transparent to-emerald-500/5 opacity-40" />
    <div className="relative flex items-center justify-between">
      <div>
        <p className="text-xs uppercase tracking-wider text-slate-400">{title}</p>
        <p className="text-2xl font-black text-white mt-2">{value}</p>
        {detail && <p className="text-xs text-slate-500 mt-1">{detail}</p>}
      </div>
      {Icon && (
        <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-white/10 border border-white/20">
          <Icon className="w-5 h-5 text-emerald-300" />
        </div>
      )}
    </div>
  </div>
);

// 主组件
export default function ProfileReport({ rawData, query, onBack }) {
  const [showAllPhones, setShowAllPhones] = useState(false);
  const [showAllEmails, setShowAllEmails] = useState(false);

  const report = useMemo(() => {
    if (!rawData) return null;
    return createProfileReport(rawData, query);
  }, [rawData, query]);

  if (!report) {
    return (
      <div className="min-h-screen bg-[#07090F] p-6">
        <button onClick={onBack} className="flex items-center gap-2 text-cyan-400 hover:text-cyan-300 mb-6">
          <ArrowLeft className="w-4 h-4" /> 返回搜索
        </button>
        <div className="text-center py-12 text-slate-400">无法生成报告</div>
      </div>
    );
  }

  const { 
    basicInfo, contactInfo, professionalInfo, financialInfo, familyInfo, 
    housingInfo, vehicleInfo, voterInfo, socialMedia, securityInfo, carrierInfo, identifiers 
  } = report;

  // 准备地图坐标
  const mapCoordinates = [];
  if (contactInfo.coordinates) {
    mapCoordinates.push({
      ...contactInfo.coordinates,
      address: contactInfo.addresses[0]?.full || '',
      source: 'Primary'
    });
  }
  contactInfo.addresses.forEach((addr, idx) => {
    if (addr.lat && addr.lng) {
      mapCoordinates.push({ lat: addr.lat, lng: addr.lng, address: addr.full, source: addr.type });
    }
  });

  // 电话分类
  const phones = contactInfo.phones || [];
  const displayPhones = showAllPhones ? phones : phones.slice(0, 4);

  // 邮箱分类
  const emails = contactInfo.emails || [];
  const personalEmails = emails.filter(e => ['gmail.com', 'yahoo.com', 'hotmail.com', 'outlook.com', 'aol.com', 'icloud.com'].some(d => e.email?.includes(d)));
  const workEmails = emails.filter(e => !personalEmails.includes(e));
  const displayEmails = showAllEmails ? emails : emails.slice(0, 5);

  // 平台验证数据
  const platformVerificationData = rawData?.comprehensive_data?.platform_verification?.data || rawData?.platform_verification?.data || [];
  const platformVerificationPlatforms = rawData?.comprehensive_data?.platform_verification?.platforms || rawData?.platform_verification?.platforms || [];
  
  // 🔥 从 social_profiles 获取 Telegram/WhatsApp 头像和用户名（来自 Truecaller API）
  const socialProfiles = rawData?.comprehensive_data?.social_profiles 
    || rawData?.social_profiles 
    || rawData?.comprehensive_raw?.social_profiles
    || {};
  
  // 过滤掉 telegram_complete，并用 social_profiles 增强 acelogic_telegram/whatsapp
  const filteredVerificationData = platformVerificationData.filter(p => {
    const src = (p.source || '').toLowerCase();
    if (src === 'telegram_complete') return false;
    return true;
  }).map(p => {
    const src = (p.source || '').toLowerCase();
    // 用 social_profiles 增强 Telegram 数据
    if (src === 'acelogic_telegram' && (socialProfiles.telegram_username || socialProfiles.telegram_photo)) {
      return {
        ...p,
        data: {
          ...p.data,
          username: socialProfiles.telegram_username || p.data?.username,
          photo: socialProfiles.telegram_photo || p.data?.photo,
        }
      };
    }
    // 用 social_profiles 增强 WhatsApp 数据
    if (src === 'acelogic_whatsapp' && socialProfiles.whatsapp_photo) {
      return {
        ...p,
        data: {
          ...p.data,
          photo: socialProfiles.whatsapp_photo || p.data?.photo,
        }
      };
    }
    return p;
  });
  
  const filteredVerificationPlatforms = platformVerificationPlatforms.filter(p => {
    const src = (p.source || '').toLowerCase();
    if (src === 'telegram_complete') return false;
    return true;
  });
  
  const platformData = [...filteredVerificationData, ...filteredVerificationPlatforms];

  const leakCount = securityInfo?.totalBreaches || securityInfo?.leakSources?.length || securityInfo?.leakSourceCount || 0;
  const summaryStats = [
    {
      title: '平台验证',
      value: platformData.length,
      detail: '社交 / 工具 / 微数据覆盖',
      icon: Shield
    },
    {
      title: '泄露记录',
      value: leakCount,
      detail: '已发现泄露来源',
      icon: AlertTriangle
    },
    {
      title: '验证邮箱',
      value: emails.length,
      detail: '匹配邮箱',
      icon: Mail
    },
    {
      title: '电话号码',
      value: phones.length,
      detail: '已验证号码',
      icon: Phone
    }
  ];

  // 风险评估
  let riskLevel = '低风险';
  let riskColorClass = 'text-green-500 bg-green-500/10 border-green-500/30';
  
  // 检查是否有数据泄露
  const hasLeaks = securityInfo?.leakSources?.length > 0 || securityInfo?.isLeaked;
  const hasPasswords = securityInfo?.passwords?.length > 0;
  
  if (hasLeaks) {
    riskLevel = '高风险';
    riskColorClass = 'text-orange-500 bg-orange-500/10 border-orange-500/30';
  }
  if (hasPasswords) {
    riskLevel = '极高风险';
    riskColorClass = 'text-red-500 bg-red-500/10 border-red-500/30';
  }

  return (
    <div className="min-h-screen text-white cyber-grid">
      {/* Top Header - 机密档案报告标题栏 */}
      <div className="bg-[#0a1628] text-white px-8 py-6 flex flex-col md:flex-row justify-between items-start md:items-center gap-4 border-b-4 border-cyan-500/50">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold tracking-tight mb-1 text-white">
            {basicInfo.name || query || '未知目标'} -
          </h1>
          <div className="flex items-center gap-3 text-slate-500 text-sm tracking-wide">
            <span>机密档案报告</span>
            <span className="text-slate-600">•</span>
            <span>{new Date().toLocaleDateString('zh-CN')}</span>
          </div>
        </div>
        <div className={`px-5 py-3 rounded-lg border-2 ${riskColorClass} flex flex-col items-center min-w-[120px]`}>
          <div className="text-xs uppercase tracking-wider font-semibold opacity-90 mb-1">风险评估</div>
          <div className="text-xl font-black flex items-center gap-2">
            <Shield className="w-5 h-5" />
            {riskLevel}
          </div>
        </div>
      </div>

      {/* Navigation Header */}
      <div className="px-8 py-4 flex items-center justify-between bg-[#0d1117]/60 backdrop-blur-md border-b border-white/5">
        <button onClick={onBack} className="group flex items-center gap-3 px-4 py-2 bg-gradient-to-r from-emerald-500/10 to-transparent hover:from-emerald-500/20 rounded-xl transition-all duration-300">
          <div className="w-8 h-8 rounded-full bg-emerald-500/20 flex items-center justify-center group-hover:bg-emerald-500/30 transition-colors">
            <ArrowLeft className="w-4 h-4 text-emerald-400" />
          </div>
          <span className="text-slate-300 group-hover:text-white text-sm font-medium transition-colors">返回搜索</span>
        </button>
        
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2 px-4 py-2 bg-slate-800/50 rounded-xl border border-slate-700/50">
            <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></div>
            <span className="text-slate-400 text-xs">实时数据</span>
          </div>
          <div className="text-right">
            <div className="text-slate-500 text-xs uppercase tracking-wider">查询目标</div>
            <div className="text-emerald-400 font-mono text-sm font-bold">{query}</div>
          </div>
        </div>
      </div>

      {/* Summary Tiles */}
      <div className="px-8 pb-6">
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
          {summaryStats.map((stat) => (
            <SummaryTile key={stat.title} title={stat.title} value={stat.value} detail={stat.detail} icon={stat.icon} />
          ))}
        </div>
      </div>

      {/* Main Content */}
      <div className="container mx-auto px-6 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-10 gap-8">
          
          {/* 左列 - 个人信息 + 平台验证 (30%) */}
          <div className="lg:col-span-3 space-y-6">
            
            {/* 个人信息卡片 - 高级版 */}
            <div className="relative bg-gradient-to-br from-slate-900/90 to-slate-800/70 backdrop-blur-xl rounded-2xl p-6 overflow-hidden border border-emerald-500/10 shadow-xl shadow-black/20">
              {/* 装饰光效 */}
              <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-500/10 rounded-full blur-3xl"></div>
              <div className="absolute bottom-0 left-0 w-24 h-24 bg-cyan-500/10 rounded-full blur-2xl"></div>
              {/* 头像和姓名 */}
              <div className="relative flex flex-col items-center mb-8">
                <div className="relative group">
                  {/* 头像光环 */}
                  <div className="absolute inset-0 bg-gradient-to-r from-emerald-500 to-cyan-500 rounded-full blur-xl opacity-30 group-hover:opacity-50 transition-opacity"></div>
                  {basicInfo.avatar ? (
                    <img src={basicInfo.avatar} alt="Avatar" className="relative w-32 h-32 rounded-full border-4 border-emerald-500/40 object-cover shadow-2xl" />
                  ) : (
                    <div className="relative w-32 h-32 rounded-full border-4 border-emerald-500/30 bg-gradient-to-br from-slate-800 to-slate-900 flex items-center justify-center">
                      <User className="w-14 h-14 text-emerald-500/50" />
                    </div>
                  )}
                  {/* 在线状态点 */}
            <div className="absolute bottom-2 right-2 w-5 h-5 bg-emerald-500 rounded-full border-4 border-slate-900 shadow-lg"></div>
                </div>
                <h1 className="text-2xl font-bold text-white mt-6 text-center bg-gradient-to-r from-white to-slate-300 bg-clip-text">{basicInfo.name || '未知姓名'}</h1>
                <div className="flex items-center gap-2 mt-2">
                  <div className="w-2 h-2 rounded-full bg-emerald-500"></div>
                  <span className="text-emerald-400 text-sm font-medium">数据已验证</span>
                </div>
              </div>

              {/* 身份信息 */}
              <div className="relative space-y-4">
                <div className="flex items-center gap-2 pb-3">
                  <div className="p-1.5 bg-gradient-to-br from-emerald-500/20 to-cyan-500/10 rounded-lg">
                    <User className="w-4 h-4 text-emerald-400" />
                  </div>
                  <h3 className="text-white font-bold">身份信息</h3>
                </div>
                
                {/* 使用整齐的两列布局 */}
                <div className="space-y-1 text-sm bg-gradient-to-br from-slate-800/50 to-slate-900/30 rounded-xl p-4 border border-slate-700/30">
                  {/* 年龄 */}
                  {basicInfo.age && (
                    <div className="flex justify-between items-center py-2 px-2 hover:bg-slate-700/30 rounded-lg transition-colors">
                      <span className="text-slate-400">年龄</span>
                      <span className="text-white font-semibold">{basicInfo.age} 岁</span>
                    </div>
                  )}

                  {/* 出生日期 */}
                  {basicInfo.birthDate && (
                    <div className="flex justify-between items-center py-2 px-2 hover:bg-slate-700/30 rounded-lg transition-colors">
                      <span className="text-slate-400">出生日期</span>
                      <span className="text-white font-semibold">{basicInfo.birthDate}</span>
                    </div>
                  )}

                  {/* 性别 */}
                  {basicInfo.gender && (
                    <div className="flex justify-between items-center py-2 px-2 hover:bg-slate-700/30 rounded-lg transition-colors">
                      <span className="text-slate-400">性别</span>
                      <span className="text-white font-semibold">
                        {basicInfo.gender === 'F' || basicInfo.gender === 'female' || basicInfo.gender === 'Female' ? '👩 女' : 
                         basicInfo.gender === 'M' || basicInfo.gender === 'male' || basicInfo.gender === 'Male' ? '👨 男' : 
                         basicInfo.gender}
                      </span>
                    </div>
                  )}

                  {/* 注册日期 */}
                  {basicInfo.regDate && (
                    <div className="flex justify-between items-center py-2 px-2 hover:bg-slate-700/30 rounded-lg transition-colors">
                      <span className="text-slate-400">注册日期</span>
                      <span className="text-white font-semibold">{basicInfo.regDate}</span>
                    </div>
                  )}

                  {/* 最后活跃 */}
                  {basicInfo.lastActive && (
                    <div className="flex justify-between items-center py-2 px-2 hover:bg-slate-700/30 rounded-lg transition-colors">
                      <span className="text-slate-400">最后活跃</span>
                      <span className="text-white font-semibold">{basicInfo.lastActive}</span>
                    </div>
                  )}

                  {/* 种族 */}
                  {basicInfo.ethnicity && (
                    <div className="flex justify-between items-center py-2 px-2 hover:bg-slate-700/30 rounded-lg transition-colors">
                      <span className="text-slate-400">种族</span>
                      <span className="text-white font-semibold">{basicInfo.ethnicity}</span>
                    </div>
                  )}

                  {/* SSN */}
                  {basicInfo.ssn && (
                    <div className="flex justify-between items-center py-2 px-2 bg-red-500/10 rounded-lg border border-red-500/20">
                      <span className="text-red-400">SSN</span>
                      <span className="text-red-400 font-mono font-bold">{basicInfo.ssn}</span>
                    </div>
                  )}
                </div>

                {/* 曾用名 - 单独显示 */}
                {identifiers.names.length > 1 && (
                  <div className="pt-3">
                    <div className="text-slate-400 text-sm mb-2 font-medium">曾用名</div>
                    <div className="flex flex-wrap gap-2">
                      {identifiers.names.slice(1).map((name, idx) => (
                        <span key={idx} className="px-3 py-1 bg-gradient-to-r from-slate-700/50 to-slate-600/50 text-white text-xs rounded-full border border-slate-600/30">{name}</span>
                      ))}
                    </div>
                  </div>
                )}

                {/* 外部资料 */}
                {basicInfo.externalProfiles && basicInfo.externalProfiles.length > 0 && (
                  <div className="pt-2">
                    <div className="text-slate-500 text-sm mb-2">外部资料</div>
                    <div className="flex flex-wrap gap-1">
                      {basicInfo.externalProfiles.map((profile, idx) => {
                        // 提取域名显示
                        let displayName = profile;
                        try {
                          displayName = new URL(profile.startsWith('http') ? profile : `https://${profile}`).hostname.replace('www.', '');
                        } catch {}
                        return (
                          <a key={idx} href={profile.startsWith('http') ? profile : `https://${profile}`} target="_blank" rel="noopener noreferrer" 
                             className="px-2 py-0.5 bg-cyan-500/10 text-cyan-400 text-xs rounded hover:bg-cyan-500/20 transition-colors">
                            {displayName}
                          </a>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>

              {/* 平台验证 - 在同一个卡片内 */}
              <div className="mt-6">
                <h3 className="text-cyan-400 font-semibold border-b border-cyan-500/20 pb-2 mb-4">平台验证</h3>
              
              {/* 数据泄露平台卡片 - 后端已拆分为单独卡片 */}
              {platformData.filter(p => p.source === 'data_breach' && p.success).map((breach, idx) => {
                const platformName = breach.platform_name || '数据泄露';
                // 兼容新旧数据结构
                const rawData = breach.data || {};
                // 新结构: data.domain, 旧结构: data 本身就是泄露数据
                const data = rawData.domain ? rawData : {
                  domain: rawData.domain || `${platformName.toLowerCase().replace(/\s+/g, '')}.com`,
                  breach_date: rawData.breach_date,
                  category: rawData.category,
                  data_classes: rawData.data_classes || [],
                  sources: rawData.sources || []
                };
                const domain = data.domain || `${platformName.toLowerCase().replace(/\s+/g, '')}.com`;
                const logo = `https://www.google.com/s2/favicons?domain=${domain}&sz=32`;
                // 格式化日期
                const breachDate = data.breach_date ? new Date(data.breach_date).toLocaleDateString('zh-CN') : null;
                // 泄露数据类型（最多显示3个）
                const dataClasses = (data.data_classes || []).slice(0, 3).join(', ');
                
                return (
                  <PlatformCard key={`breach-${idx}`} name={platformName} logo={logo} verified>
                    <InfoLine label="域名" value={data.domain} />
                    <InfoLine label="泄露日期" value={breachDate} />
                    <InfoLine label="类别" value={data.category} />
                    <InfoLine label="泄露类型" value={dataClasses || null} />
                    <InfoLine label="数据来源" value={(data.sources || []).join(', ') || null} />
                  </PlatformCard>
                );
              })}

              {platformData.filter(p => {
                // 基本过滤
                if (!p.success) return false;
                if (p.source === 'data_breach' || p.source === 'phone_lookup') return false;
                if (p.source === 'melissa' || p.source?.toLowerCase().includes('melissa')) return false;
                
                // Instagram: 只有关联了才显示
                if (p.source === 'instagram' && !p.data?.instagram_found) return false;
                
                // Snapchat: 只有关联了才显示卡片
                if (p.source === 'snapchat' && !p.data?.snapchat_found) return false;
                
                // Acelogic Telegram: 只要有用户名或姓名就显示
                if (p.source === 'acelogic_telegram' && !p.data?.username && !p.data?.name) return false;
                
                // Acelogic WhatsApp: 只要有姓名就显示
                if (p.source === 'acelogic_whatsapp' && !p.data?.name) return false;
                
                // Telegram: 只有找到用户才显示
                if ((p.source === 'telegram' || p.source === 'telegram_complete')) {
                  const hasUser = p.data?.data?.id || p.data?.telegram_info?.user_id || p.data?.user_info?.user_id || p.data?.user_id || p.data?.telegram_found;
                  if (!hasUser) return false;
                }
                
                return true;
              }).map((platform, idx) => {
                const source = platform.source || '';
                const data = platform.data || {};
                const logo = platformLogos[source.toLowerCase()] || `https://www.google.com/s2/favicons?domain=${source}.com&sz=32`;
                const displayName = platform.platform_name || source.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
                // 获取头像（Telegram/WhatsApp 等）
                const avatar = data.photo || data.avatar || data.image || data.profilePicUrl || null;

                return (
                  <PlatformCard key={idx} name={displayName} logo={logo} verified avatar={avatar}>
                    {source === 'truecaller' && data.data?.[0] && (
                      <>
                        <InfoLine label="姓名" value={data.data[0].name} />
                        <InfoLine label="可信度" value={data.data[0].score !== undefined ? `${Math.round(data.data[0].score * 100)}%` : null} />
                        <InfoLine label="访问权限" value={data.data[0].access} />
                        {data.data[0].enhanced && (
                          <div className="flex justify-between text-sm py-1">
                            <span className="text-slate-400">增强数据</span>
                            <StatusValue positive={true} value="是" />
                          </div>
                        )}
                        <InfoLine label="电话类型" value={data.data[0].type || data.data[0].phoneType} />
                        <InfoLine label="运营商" value={data.data[0].carrier} />
                        <InfoLine label="国家" value={data.data[0].countryCode || data.data[0].country} />
                        <InfoLine label="城市" value={data.data[0].city} />
                        <InfoLine label="地址" value={data.data[0].address} />
                        <InfoLine label="邮箱" value={data.data[0].email} />
                        <InfoLine label="垃圾评分" value={data.data[0].spamScore !== undefined ? `${data.data[0].spamScore}/10` : null} />
                        <InfoLine label="垃圾类型" value={data.data[0].spamType} />
                        {data.data[0].image && (
                          <img src={data.data[0].image} alt="avatar" className="w-10 h-10 rounded-full mt-2" />
                        )}
                      </>
                    )}
                    {source === 'instagram' && (
                      <div className="flex justify-between text-sm py-1">
                        <span className="text-slate-400">状态</span>
                        <StatusValue positive={data.instagram_found} value={data.instagram_found ? '已关联' : '未关联'} />
                      </div>
                    )}
                    {source === 'snapchat' && (
                      <div className="flex justify-between text-sm py-1">
                        <span className="text-slate-400">状态</span>
                        <StatusValue positive={data.snapchat_found} value={data.snapchat_found ? '已关联' : '未关联'} />
                      </div>
                    )}
                    {source === 'acelogic_telegram' && (
                      <>
                        {data.username && (
                          <div className="flex justify-between items-center py-1.5">
                            <span className="text-slate-400">用户名</span>
                            <span className="text-emerald-400 font-medium">{data.username}</span>
                          </div>
                        )}
                        <InfoLine label="姓名" value={data.name} />
                        <InfoLine label="国家" value={data.country} />
                        {data.link && (
                          <div className="flex justify-between items-center py-1.5">
                            <span className="text-slate-400">链接</span>
                            <a href={data.link} target="_blank" rel="noopener noreferrer" 
                               className="text-cyan-400 hover:text-cyan-300 text-sm truncate max-w-[150px]">{data.link}</a>
                          </div>
                        )}
                      </>
                    )}
                    {source === 'acelogic_whatsapp' && (
                      <>
                        <InfoLine label="姓名" value={data.name} />
                        <InfoLine label="国家" value={data.country} />
                        <div className="flex justify-between items-center py-1.5">
                          <span className="text-slate-400">状态</span>
                          <StatusValue positive={true} value="已注册" />
                        </div>
                        {data.link && (
                          <div className="flex justify-between items-center py-1.5">
                            <span className="text-slate-400">链接</span>
                            <a href={data.link} target="_blank" rel="noopener noreferrer" 
                               className="text-cyan-400 hover:text-cyan-300 text-sm truncate max-w-[150px]">{data.link}</a>
                          </div>
                        )}
                      </>
                    )}
                    {source === 'ipqualityscore' && (
                      <>
                        {data.active !== undefined && (
                          <div className="flex justify-between text-sm py-1">
                            <span className="text-slate-400">活跃状态</span>
                            <StatusValue positive={data.active} value={data.active ? '活跃' : '不活跃'} />
                          </div>
                        )}
                        <InfoLine label="欺诈评分" value={data.fraud_score !== undefined ? `${data.fraud_score}/100` : null} />
                        {data.recent_abuse !== undefined && (
                          <div className="flex justify-between text-sm py-1">
                            <span className="text-slate-400">近期滥用</span>
                            {data.recent_abuse ? <WarningValue show={true} value="是" /> : <StatusValue positive={true} value="否" />}
                          </div>
                        )}
                        <InfoLine label="VOIP" value={data.VOIP ? '是' : (data.VOIP === false ? '否' : null)} />
                        <InfoLine label="预付费" value={data.prepaid ? '是' : (data.prepaid === false ? '否' : null)} />
                      </>
                    )}
                    {source === 'microsoft_phone' && (
                      <>
                        <InfoLine label="电话" value={data.input} />
                        {data.exists !== undefined && (
                          <div className="flex justify-between text-sm py-1">
                            <span className="text-slate-400">账户存在</span>
                            <StatusValue positive={data.exists} value={data.exists ? '是' : '否'} />
                          </div>
                        )}
                        <InfoLine label="提供商" value={data.provider || 'Microsoft'} />
                        <InfoLine label="账户类型" value={data.account_type} />
                        {data.xbox && (
                          <div className="flex justify-between text-sm py-1">
                            <span className="text-slate-400">Xbox</span>
                            <StatusValue positive={true} value="关联" />
                          </div>
                        )}
                        {data.skype && (
                          <div className="flex justify-between text-sm py-1">
                            <span className="text-slate-400">Skype</span>
                            <StatusValue positive={true} value="关联" />
                          </div>
                        )}
                      </>
                    )}
                    {(source === 'telegram' || source === 'telegram_complete') && (() => {
                      const tg = data.user_info || data.telegram_info || data.data || data;
                      const userId = tg.user_id || tg.id;
                      const username = tg.username;
                      const firstName = tg.first_name || tg.display_name;
                      const lastName = tg.last_name;
                      const phone = data.phone || data.phone_number || tg.phone;
                      const isPremium = tg.premium || tg.is_premium;
                      const isVerified = tg.verified || tg.is_verified;
                      return (
                        <>
                          <InfoLine label="电话" value={phone} />
                          {userId && <InfoLine label="用户ID" value={userId} />}
                          {username && <InfoLine label="用户名" value={`@${username}`} />}
                          {firstName && <InfoLine label="名字" value={firstName} />}
                          {lastName && <InfoLine label="姓氏" value={lastName} />}
                          {tg.bio && <InfoLine label="简介" value={tg.bio} />}
                          {isPremium !== undefined && (
                            <div className="flex justify-between text-sm py-1">
                              <span className="text-slate-400">Premium</span>
                              <StatusValue positive={isPremium} value={isPremium ? '是' : '否'} />
                            </div>
                          )}
                          {isVerified && (
                            <div className="flex justify-between text-sm py-1">
                              <span className="text-slate-400">已验证</span>
                              <StatusValue positive={true} value="是" />
                            </div>
                          )}
                          {tg.is_bot && (
                            <div className="flex justify-between text-sm py-1">
                              <span className="text-slate-400">机器人</span>
                              <WarningValue show={true} value="是" />
                            </div>
                          )}
                          {tg.is_scam && (
                            <div className="flex justify-between text-sm py-1">
                              <span className="text-slate-400">骗子</span>
                              <WarningValue show={true} value="是" />
                            </div>
                          )}
                          {tg.is_fake && (
                            <div className="flex justify-between text-sm py-1">
                              <span className="text-slate-400">虚假账号</span>
                              <WarningValue show={true} value="是" />
                            </div>
                          )}
                        </>
                      );
                    })()}
                    {source === 'phone_lookup' && (
                      <>
                        <InfoLine label="Version" value={data.melissa_data?.raw_data?.Version} />
                        <InfoLine label="TransmissionReference" value={data.melissa_data?.raw_data?.TransmissionReference} />
                      </>
                    )}
                    {source === 'whatsapp' && (
                      <InfoLine label="状态" value={data.exists ? '已注册' : '未注册'} />
                    )}
                    {source === 'caller_id' && data.data && (
                      <>
                        <InfoLine label="姓名" value={data.data.name} />
                        {data.data.image_url && (
                          <img src={data.data.image_url} alt="avatar" className="w-10 h-10 rounded-full mt-2" />
                        )}
                      </>
                    )}
                  </PlatformCard>
                );
              })}

              {/* Melissa 单独显示 */}
              {carrierInfo.carrier && (
                <PlatformCard name="Melissa Globalphone" logo={platformLogos.melissa} verified>
                  <InfoLine label="来电显示" value={carrierInfo.callerId} />
                  <InfoLine label="运营商" value={carrierInfo.carrier} />
                  <InfoLine label="线路类型" value={carrierInfo.lineType} />
                  <InfoLine label="国际号码" value={carrierInfo.internationalPhone} />
                  <InfoLine label="国家" value={carrierInfo.country} />
                  <InfoLine label="州/省" value={carrierInfo.administrativeArea} />
                  <InfoLine label="城市" value={carrierInfo.locality} />
                  <InfoLine label="邮编" value={carrierInfo.postalCode} />
                  <InfoLine label="时区" value={carrierInfo.utc} />
                </PlatformCard>
              )}
              </div>
            </div>
          </div>

          {/* 右列 - 所有信息在一个框内 (70%) - 高级版 */}
          <div className="lg:col-span-7">
            <div className="relative bg-gradient-to-br from-slate-900/90 to-slate-800/70 backdrop-blur-xl rounded-2xl p-8 overflow-hidden border border-emerald-500/10 shadow-xl shadow-black/20">
              {/* 装饰元素 */}
              <div className="absolute top-0 right-0 w-64 h-64 bg-emerald-500/5 rounded-full blur-3xl"></div>
              <div className="absolute bottom-0 left-1/2 w-48 h-48 bg-cyan-500/5 rounded-full blur-3xl"></div>
              
              {/* 联系方式 */}
              <div className="relative mb-8">
                <div className="flex items-center gap-3 mb-6">
                  <div className="p-2.5 bg-gradient-to-br from-emerald-500/20 to-cyan-500/10 rounded-xl">
                    <Phone className="w-5 h-5 text-emerald-400" />
                  </div>
                  <div>
                    <h3 className="text-lg font-bold text-white">联系方式</h3>
                    <div className="h-0.5 w-12 bg-gradient-to-r from-emerald-500 to-transparent rounded-full mt-1"></div>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* 电话列 */}
                  {phones.length > 0 && (
                    <div>
                      <div className="text-slate-500 text-xs uppercase tracking-wider mb-3">电话号码</div>
                      <div className="space-y-2">
                        {displayPhones.map((p, idx) => (
                          <div key={idx} className="flex items-center gap-2 text-sm">
                            <span className={`w-12 text-center px-1.5 py-0.5 text-xs rounded ${p.type === 'primary' ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30' : 'bg-slate-700/50 text-slate-400'}`}>
                              {p.type === 'primary' ? '主要' : '备用'}
                            </span>
                            <span className="text-white font-mono">{p.phone}</span>
                          </div>
                        ))}
                        {phones.length > 4 && (
                          <button onClick={() => setShowAllPhones(!showAllPhones)} className="text-cyan-400 text-xs mt-1 hover:underline">
                            {showAllPhones ? '收起' : `显示全部 (${phones.length})`}
                          </button>
                        )}
                      </div>
                    </div>
                  )}

                  {/* 邮箱列 */}
                  {emails.length > 0 && (
                    <div>
                      <div className="text-slate-500 text-xs uppercase tracking-wider mb-3">电子邮箱</div>
                      <div className="space-y-2">
                        {displayEmails.map((e, idx) => (
                          <div key={idx} className="flex items-center gap-2 text-sm">
                            <span className={`w-12 text-center px-1.5 py-0.5 text-xs rounded ${
                              personalEmails.includes(e) ? 'bg-cyan-500/20 text-cyan-400 border border-cyan-500/30' : 'bg-amber-500/20 text-amber-400 border border-amber-500/30'
                            }`}>
                              {personalEmails.includes(e) ? '个人' : '工作'}
                            </span>
                            <span className="text-white truncate">{e.email}</span>
                          </div>
                        ))}
                        {emails.length > 5 && (
                          <button onClick={() => setShowAllEmails(!showAllEmails)} className="text-cyan-400 text-xs mt-1 hover:underline">
                            {showAllEmails ? '收起' : `显示全部 (${emails.length})`}
                          </button>
                        )}
                      </div>
                    </div>
                  )}
                </div>

                {/* 用户名 */}
                {(contactInfo.usernames.length > 0 || identifiers.usernames.length > 0) && (
                  <div className="mt-4 pt-4 border-t border-slate-800/50">
                    <div className="text-slate-500 text-xs uppercase tracking-wider mb-3">关联用户名</div>
                    <div className="flex flex-wrap gap-2">
                      {[...new Set([...contactInfo.usernames, ...identifiers.usernames])].map((u, idx) => (
                        <span key={idx} className="px-2 py-1 bg-slate-700/50 text-white text-xs rounded border border-slate-600/50">{u}</span>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* 地址信息 */}
              <div className="relative mb-8 pt-8 border-t border-slate-700/30">
                <div className="flex items-center gap-3 mb-6">
                  <div className="p-2.5 bg-gradient-to-br from-emerald-500/20 to-cyan-500/10 rounded-xl">
                    <MapPin className="w-5 h-5 text-emerald-400" />
                  </div>
                  <div>
                    <h3 className="text-lg font-bold text-white">地址信息</h3>
                    <div className="h-0.5 w-12 bg-gradient-to-r from-emerald-500 to-transparent rounded-full mt-1"></div>
                  </div>
                </div>

                {/* 地图 */}
                {mapCoordinates.length > 0 && (
                  <div className="mb-4 rounded-lg overflow-hidden border border-slate-700/50">
                    <MapSection coordinates={mapCoordinates} />
                  </div>
                )}

                {/* 地址详情 - 整齐的表格样式 */}
                {contactInfo.addresses.length > 0 && (
                  <div className="space-y-2 text-sm">
                    {contactInfo.addresses.slice(0, 1).map((addr, idx) => (
                      <div key={idx} className="space-y-1">
                        {addr.full && (
                          <div className="flex justify-between items-start py-1.5 border-b border-slate-800/50">
                            <span className="text-slate-500">完整地址</span>
                            <span className="text-white text-right max-w-[70%]">{addr.full}</span>
                          </div>
                        )}
                        {addr.city && (
                          <div className="flex justify-between items-center py-1.5 border-b border-slate-800/50">
                            <span className="text-slate-500">城市</span>
                            <span className="text-white">{addr.city}</span>
                          </div>
                        )}
                        {addr.state && (
                          <div className="flex justify-between items-center py-1.5 border-b border-slate-800/50">
                            <span className="text-slate-500">州/省</span>
                            <span className="text-white">{addr.state}</span>
                          </div>
                        )}
                        {addr.zip && (
                          <div className="flex justify-between items-center py-1.5 border-b border-slate-800/50">
                            <span className="text-slate-500">邮编</span>
                            <span className="text-white font-mono">{addr.zip}</span>
                          </div>
                        )}
                        {addr.country && (
                          <div className="flex justify-between items-center py-1.5 border-b border-slate-800/50">
                            <span className="text-slate-500">国家</span>
                            <span className="text-white">{addr.country}</span>
                          </div>
                        )}
                        {contactInfo.timezone && (
                          <div className="flex justify-between items-center py-1.5 border-b border-slate-800/50">
                            <span className="text-slate-500">时区</span>
                            <span className="text-white font-mono">{contactInfo.timezone}</span>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* 职业信息 */}
              {(professionalInfo.company || professionalInfo.position || professionalInfo.industry || professionalInfo.jobHistory?.length > 0) && (
                <div className="relative mb-8 pt-8 border-t border-slate-700/30">
                <div className="flex items-center gap-3 mb-6">
                  <div className="p-2.5 bg-gradient-to-br from-emerald-500/20 to-cyan-500/10 rounded-xl">
                    <Briefcase className="w-5 h-5 text-emerald-400" />
                  </div>
                  <div>
                    <h3 className="text-lg font-bold text-white">职业信息</h3>
                    <div className="h-0.5 w-12 bg-gradient-to-r from-emerald-500 to-transparent rounded-full mt-1"></div>
                  </div>
                </div>
                <div className="space-y-1 text-sm">
                  {professionalInfo.company && (
                    <div className="flex justify-between items-center py-1.5 border-b border-slate-800/50">
                      <span className="text-slate-500">公司</span>
                      <span className="text-white">{professionalInfo.company}</span>
                    </div>
                  )}
                  {professionalInfo.position && (
                    <div className="flex justify-between items-center py-1.5 border-b border-slate-800/50">
                      <span className="text-slate-500">职位</span>
                      <span className="text-white">{professionalInfo.position}</span>
                    </div>
                  )}
                  {professionalInfo.industry && (
                    <div className="flex justify-between items-start py-1.5 border-b border-slate-800/50">
                      <span className="text-slate-500 shrink-0">行业</span>
                      <span className="text-white text-right max-w-[70%] break-words">
                        {professionalInfo.industry.split(' / ')[0]}
                      </span>
                    </div>
                  )}
                  {professionalInfo.category && (
                    <div className="flex justify-between items-center py-1.5 border-b border-slate-800/50">
                      <span className="text-slate-500">业务类别</span>
                      <span className="text-white">{professionalInfo.category}</span>
                    </div>
                  )}
                  {professionalInfo.businessType && (
                    <div className="flex justify-between items-center py-1.5 border-b border-slate-800/50">
                      <span className="text-slate-500">企业类型</span>
                      <span className="text-white">{professionalInfo.businessType}</span>
                    </div>
                  )}
                  {professionalInfo.annualRevenue && (
                    <div className="flex justify-between items-center py-1.5 border-b border-slate-800/50">
                      <span className="text-slate-500">年收入</span>
                      <span className="text-emerald-400">{professionalInfo.annualRevenue}</span>
                    </div>
                  )}
                </div>
                </div>
              )}

              {/* 财务信息 */}
              {(financialInfo.income || financialInfo.housePrice || financialInfo.creditCapacity) && (
                <div className="relative mb-8 pt-8 border-t border-slate-700/30">
                  <div className="flex items-center gap-3 mb-6">
                    <div className="p-2.5 bg-gradient-to-br from-emerald-500/20 to-cyan-500/10 rounded-xl">
                      <DollarSign className="w-5 h-5 text-emerald-400" />
                    </div>
                    <div>
                      <h3 className="text-lg font-bold text-white">财务信息</h3>
                      <div className="h-0.5 w-12 bg-gradient-to-r from-emerald-500 to-transparent rounded-full mt-1"></div>
                    </div>
                  </div>
                  <div className="space-y-1 text-sm">
                    {financialInfo.income && (
                      <div className="flex justify-between items-center py-1.5 border-b border-slate-800/50">
                        <span className="text-slate-500">收入</span>
                        <span className="text-emerald-400">{financialInfo.income}</span>
                      </div>
                    )}
                    {financialInfo.housePrice && (
                      <div className="flex justify-between items-center py-1.5 border-b border-slate-800/50">
                        <span className="text-slate-500">房产价值</span>
                        <span className="text-emerald-400">{financialInfo.housePrice}</span>
                      </div>
                    )}
                    {financialInfo.creditCapacity && (
                      <div className="flex justify-between items-center py-1.5 border-b border-slate-800/50">
                        <span className="text-slate-500">信用额度</span>
                        <span className="text-emerald-400">{financialInfo.creditCapacity}</span>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* 家庭信息 */}
              {(familyInfo?.maritalStatus || familyInfo?.childrenCount || familyInfo?.spouseName || familyInfo?.relatives?.length > 0) && (
                <div className="relative mb-8 pt-8 border-t border-slate-700/30">
                  <div className="flex items-center gap-3 mb-6">
                    <div className="p-2.5 bg-gradient-to-br from-emerald-500/20 to-cyan-500/10 rounded-xl">
                      <Users className="w-5 h-5 text-emerald-400" />
                    </div>
                    <div>
                      <h3 className="text-lg font-bold text-white">家庭信息</h3>
                      <div className="h-0.5 w-12 bg-gradient-to-r from-emerald-500 to-transparent rounded-full mt-1"></div>
                    </div>
                  </div>
                  <div className="space-y-1 text-sm">
                    {familyInfo.maritalStatus && (
                      <div className="flex justify-between items-center py-1.5 border-b border-slate-800/50">
                        <span className="text-slate-500">婚姻状况</span>
                        <span className="text-white">{familyInfo.maritalStatus}</span>
                      </div>
                    )}
                    {familyInfo.childrenCount && (
                      <div className="flex justify-between items-center py-1.5 border-b border-slate-800/50">
                        <span className="text-slate-500">子女数量</span>
                        <span className="text-white">{familyInfo.childrenCount}</span>
                      </div>
                    )}
                    {familyInfo.spouseName && (
                      <div className="flex justify-between items-center py-1.5 border-b border-slate-800/50">
                        <span className="text-slate-500">配偶</span>
                        <span className="text-white">{familyInfo.spouseName}</span>
                      </div>
                    )}
                  </div>
                  {familyInfo.relatives && familyInfo.relatives.length > 0 && (
                    <div className="mt-3">
                      <div className="text-slate-500 text-xs uppercase tracking-wider mb-2">亲属关系</div>
                      <div className="space-y-2">
                        {familyInfo.relatives.map((rel, idx) => (
                          <div key={idx} className="flex items-center justify-between bg-slate-800/50 rounded px-3 py-2">
                            <div className="flex items-center gap-2">
                              <span className="text-white font-medium">{typeof rel === 'object' ? rel.name : rel}</span>
                              {rel.relationship && (
                                <span className="text-xs text-cyan-400 bg-cyan-900/30 px-2 py-0.5 rounded">{rel.relationship}</span>
                              )}
                            </div>
                            {rel.ssn && (
                              <span className="text-slate-400 text-xs font-mono">SSN: {rel.ssn}</span>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* 房产信息 */}
              {(housingInfo?.builtYear || housingInfo?.houseType || housingInfo?.houseValue || housingInfo?.houseNumber || housingInfo?.homeOwner) && (
                <div className="relative mb-8 pt-8 border-t border-slate-700/30">
                  <div className="flex items-center gap-3 mb-6">
                    <div className="p-2.5 bg-gradient-to-br from-emerald-500/20 to-cyan-500/10 rounded-xl">
                      <Home className="w-5 h-5 text-emerald-400" />
                    </div>
                    <div>
                      <h3 className="text-lg font-bold text-white">房产信息</h3>
                      <div className="h-0.5 w-12 bg-gradient-to-r from-emerald-500 to-transparent rounded-full mt-1"></div>
                    </div>
                  </div>
                  <div className="space-y-1 text-sm">
                    {housingInfo.builtYear && (
                      <div className="flex justify-between items-center py-1.5 border-b border-slate-800/50">
                        <span className="text-slate-500">建造年份</span>
                        <span className="text-white">{housingInfo.builtYear}</span>
                      </div>
                    )}
                    {housingInfo.houseType && (
                      <div className="flex justify-between items-center py-1.5 border-b border-slate-800/50">
                        <span className="text-slate-500">房屋类型</span>
                        <span className="text-white">{housingInfo.houseType}</span>
                      </div>
                    )}
                    {housingInfo.houseValue && (
                      <div className="flex justify-between items-center py-1.5 border-b border-slate-800/50">
                        <span className="text-slate-500">房屋价值</span>
                        <span className="text-emerald-400">{housingInfo.houseValue}</span>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* 车辆/资产信息 */}
              {(vehicleInfo?.vehicles?.length > 0 || vehicleInfo?.boatOwner || vehicleInfo?.hasCats || vehicleInfo?.hasDogs) && (
                <div className="relative mb-8 pt-8 border-t border-slate-700/30">
                  <div className="flex items-center gap-3 mb-6">
                    <div className="p-2.5 bg-gradient-to-br from-emerald-500/20 to-cyan-500/10 rounded-xl">
                      <Car className="w-5 h-5 text-emerald-400" />
                    </div>
                    <div>
                      <h3 className="text-lg font-bold text-white">资产/宠物信息</h3>
                      <div className="h-0.5 w-12 bg-gradient-to-r from-emerald-500 to-transparent rounded-full mt-1"></div>
                    </div>
                  </div>
                  <div className="space-y-1 text-sm">
                    {vehicleInfo.boatOwner !== undefined && vehicleInfo.boatOwner !== null && (
                      <div className="flex justify-between items-center py-1.5 border-b border-slate-800/50">
                        <span className="text-slate-500 flex items-center gap-1"><Ship className="w-4 h-4" /> 船主</span>
                        <span className={vehicleInfo.boatOwner ? 'text-emerald-400' : 'text-slate-400'}>{vehicleInfo.boatOwner ? '是' : '否'}</span>
                      </div>
                    )}
                    {vehicleInfo.hasCats !== undefined && vehicleInfo.hasCats !== null && (
                      <div className="flex justify-between items-center py-1.5 border-b border-slate-800/50">
                        <span className="text-slate-500 flex items-center gap-1"><Cat className="w-4 h-4" /> 养猫</span>
                        <span className={(vehicleInfo.hasCats === 'Y' || vehicleInfo.hasCats === true || vehicleInfo.hasCats === 'Yes') ? 'text-emerald-400' : 'text-slate-400'}>
                          {(vehicleInfo.hasCats === 'Y' || vehicleInfo.hasCats === true || vehicleInfo.hasCats === 'Yes') ? '是' : '否'}
                        </span>
                      </div>
                    )}
                    {vehicleInfo.hasDogs !== undefined && vehicleInfo.hasDogs !== null && (
                      <div className="flex justify-between items-center py-1.5 border-b border-slate-800/50">
                        <span className="text-slate-500 flex items-center gap-1"><Dog className="w-4 h-4" /> 养狗</span>
                        <span className={(vehicleInfo.hasDogs === 'Y' || vehicleInfo.hasDogs === true || vehicleInfo.hasDogs === 'Yes') ? 'text-emerald-400' : 'text-slate-400'}>
                          {(vehicleInfo.hasDogs === 'Y' || vehicleInfo.hasDogs === true || vehicleInfo.hasDogs === 'Yes') ? '是' : '否'}
                        </span>
                      </div>
                    )}
                  </div>
                  {vehicleInfo.vehicles && vehicleInfo.vehicles.length > 0 && (
                    <div className="mt-3">
                      <div className="text-slate-500 text-xs uppercase tracking-wider mb-2">车辆信息</div>
                      {vehicleInfo.vehicles.map((v, idx) => (
                        <div key={idx} className="p-2 bg-slate-800/30 rounded border border-slate-700/50 mb-2">
                          <div className="text-white font-medium text-sm">{v.brand} {v.model}</div>
                          <div className="text-slate-500 text-xs mt-1 flex flex-wrap gap-2">
                            {v.year && <span>年份: {v.year}</span>}
                            {v.vin && <span className="font-mono">VIN: {v.vin}</span>}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* 选民/宗教信息 */}
              {(voterInfo?.voterRegDate || voterInfo?.pollingStation || voterInfo?.partyVoted || voterInfo?.religion) && (
                <div className="relative mb-8 pt-8 border-t border-slate-700/30">
                  <div className="flex items-center gap-3 mb-6">
                    <div className="p-2.5 bg-gradient-to-br from-emerald-500/20 to-cyan-500/10 rounded-xl">
                      <Vote className="w-5 h-5 text-emerald-400" />
                    </div>
                    <div>
                      <h3 className="text-lg font-bold text-white">选民/宗教信息</h3>
                      <div className="h-0.5 w-12 bg-gradient-to-r from-emerald-500 to-transparent rounded-full mt-1"></div>
                    </div>
                  </div>
                  <div className="space-y-1 text-sm">
                    {voterInfo.pollingStation && (
                      <div className="flex justify-between items-center py-1.5 border-b border-slate-800/50">
                        <span className="text-slate-500">投票站</span>
                        <span className="text-white">{voterInfo.pollingStation}</span>
                      </div>
                    )}
                    {voterInfo.religion && (
                      <div className="flex justify-between items-center py-1.5 border-b border-slate-800/50">
                        <span className="text-slate-500">宗教</span>
                        <span className="text-white">{voterInfo.religion}</span>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* 数据泄露 */}
              {(securityInfo.totalBreaches > 0 || securityInfo.leakSources?.length > 0) && (
                <div className="relative mb-8 pt-8 border-t border-red-500/20">
                  <div className="flex items-center gap-3 mb-6">
                    <div className="p-2.5 bg-gradient-to-br from-red-500/20 to-orange-500/10 rounded-xl">
                      <AlertTriangle className="w-5 h-5 text-red-400" />
                    </div>
                    <div>
                      <h3 className="text-lg font-bold text-white">数据泄露</h3>
                      <div className="h-0.5 w-12 bg-gradient-to-r from-red-500 to-transparent rounded-full mt-1"></div>
                    </div>
                    <span className="px-3 py-1 bg-red-500/20 text-red-400 text-xs font-bold rounded-full border border-red-500/30">
                      {securityInfo.leakSourceCount || securityInfo.totalBreaches} 条
                    </span>
                  </div>
                  
                  {/* 泄露来源 */}
                  {securityInfo.leakSources && securityInfo.leakSources.length > 0 && (
                    <div className="mb-4">
                      <div className="text-slate-400 text-sm mb-2">泄露来源</div>
                      <div className="flex flex-wrap gap-1">
                        {securityInfo.leakSources.map((src, idx) => (
                          <span key={idx} className="px-2 py-0.5 bg-red-500/20 text-red-300 rounded text-xs">{src}</span>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* 泄露数据库 */}
                  {securityInfo.breachList && securityInfo.breachList.length > 0 && (
                    <div className="space-y-2">
                      {securityInfo.breachList.slice(0, 10).map((breach, idx) => (
                        <div key={idx} className="flex justify-between items-center py-2 border-b border-slate-700/50 last:border-0">
                          <span className="text-white">{breach.name}</span>
                          {breach.recordCount > 0 && (
                            <span className="text-slate-400 text-sm">{breach.recordCount} 条</span>
                          )}
                        </div>
                      ))}
                    </div>
                  )}

                  {/* 登录 IP */}
                  {securityInfo.loginIps && securityInfo.loginIps.length > 0 && (
                    <div className="mt-4">
                      <div className="text-slate-400 text-sm mb-2">登录 IP</div>
                      <div className="flex flex-wrap gap-1">
                        {securityInfo.loginIps.map((ip, idx) => (
                          <span key={idx} className="px-2 py-0.5 bg-slate-700/50 text-slate-300 rounded text-xs font-mono">{ip}</span>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* 泄露密码 */}
                  {securityInfo.passwords && securityInfo.passwords.length > 0 && (
                    <div className="mt-4 p-3 bg-red-500/10 rounded border border-red-500/30">
                      <div className="text-red-400 text-sm font-semibold mb-2 flex items-center gap-1"><AlertTriangle className="w-4 h-4" /> 泄露密码 ({securityInfo.passwords.length})</div>
                      {securityInfo.passwords.slice(0, 10).map((pwd, idx) => (
                        <div key={idx} className="text-white font-mono text-sm py-1 border-b border-red-500/20 last:border-0">
                          {pwd.value} <span className="text-slate-500 text-xs">({pwd.source})</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
