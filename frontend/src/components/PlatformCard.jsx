import React, { useState, useEffect } from 'react';
import { 
  ChevronDown, ChevronUp, Eye, EyeOff, Copy, Check,
  CheckCircle2, XCircle, AlertTriangle, ExternalLink,
  User, Users, Mail, Phone, MapPin, Globe, LinkIcon, Calendar
} from 'lucide-react';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { GlassCard } from './ui/glass-card';
import { PlatformIcon } from './PlatformIcon';
import UniversalLogo from './UniversalLogo';
import AccountCard from './AccountCard';
import { getFieldDisplayName, getModuleDisplayName, extractWebsiteUrl, extractAvatarUrl } from '../utils/fieldMappings';
import ProfileAvatar from './ProfileAvatar';

/**
 * 格式化关注者数量
 */
const formatFollowers = (count) => {
  if (!count) return '0';
  if (typeof count !== 'number') return count.toString();
  
  if (count > 1000000) {
    return `${(count / 1000000).toFixed(1)}M`;
  }
  if (count > 1000) {
    return `${(count / 1000).toFixed(1)}K`;
  }
  return count.toString();
};

/**
 * 格式化数值显示 - 支持链接、邮箱、电话等特殊格式
 */
const formatValue = (value) => {
  if (value === null || value === undefined) {
    return 'N/A';
  }
  
  if (typeof value === 'boolean') {
    return value ? '是' : '否';
  }
  
  if (typeof value === 'number') {
    // 格式化大数字
    if (value > 1000000) {
      return `${(value / 1000000).toFixed(1)}M`;
    }
    if (value > 1000) {
      return `${(value / 1000).toFixed(1)}K`;
    }
    return value.toString();
  }
  
  if (typeof value === 'string') {
    // 检测URL
    if (value.startsWith('http')) {
      return (
        <a 
          href={value} 
          target="_blank" 
          rel="noopener noreferrer"
          className="text-primary hover:underline flex items-center gap-1"
        >
          {value.length > 50 ? `${value.substring(0, 50)}...` : value}
          <ExternalLink className="w-3 h-3" />
        </a>
      );
    }
    
    // 检测邮箱
    if (value.includes('@') && value.includes('.')) {
      return (
        <a 
          href={`mailto:${value}`}
          className="text-primary hover:underline flex items-center gap-1"
        >
          {value}
          <Mail className="w-3 h-3" />
        </a>
      );
    }
    
    // 检测电话号码
    if (/^[\+\-\(\)\s\d]+$/.test(value) && value.length > 6) {
      return (
        <a 
          href={`tel:${value}`}
          className="text-primary hover:underline flex items-center gap-1"
        >
          {value}
          <Phone className="w-3 h-3" />
        </a>
      );
    }
    
    return value;
  }
  
  return JSON.stringify(value);
};

/**
 * 平台卡片组件
 * 展示单个平台的OSINT数据
 */
export const PlatformCard = ({ platform, index }) => {
  const [expanded, setExpanded] = useState(false);
  const [copied, setCopied] = useState(false);

  const displayName = getModuleDisplayName(platform.platform_name || platform.module || platform.source || '未知');
  const specArray = Array.isArray(platform.spec_format)
    ? platform.spec_format.filter(v => v && typeof v === 'object' && !Array.isArray(v))
    : [];
  const specItem = specArray[0] || {};
  const hasSpecData = specArray.length > 0;
  let hasData = platform.status === 'found' || hasSpecData;
  const isError = ['error', 'quota_exceeded', 'no_data'].includes(platform.status);
  const isNotFound = platform.status === 'not_found';
  const moduleName = String(platform.platform_name || platform.module || platform.source || '').toLowerCase();
  if (moduleName.includes('telegram') && platform?.data?.telegram_found === false) {
    hasData = false;
  }
  if (moduleName.includes('instagram') && platform?.data?.instagram_found === false) {
    hasData = false;
  }
  
  // 提取网站 URL 用于显示 logo
  let websiteUrl =
    specItem.profile_url || specItem.url || specItem.website || specItem.homepage ||
    platform.url || platform.link || platform.website || platform.homepage ||
    extractWebsiteUrl(platform);
  // 仅接受 http/https 开头的合法URL，其它字符串视为无效以启用品牌兜底
  if (websiteUrl && typeof websiteUrl === 'string' && !/^https?:\/\//i.test(websiteUrl)) {
    websiteUrl = null;
  }
  
  // 如果没有URL但有domain字段,转换为完整URL
  if (!websiteUrl) {
    const domain = specItem.domain || platform.domain || platform.data?.domain;
    if (domain && typeof domain === 'string' && domain.trim()) {
      const d = domain.trim().toLowerCase();
      const dnsOK = /^[a-z0-9.-]+$/.test(d);
      if (d.startsWith('http://') || d.startsWith('https://')) {
        try {
          const u = new URL(d);
          websiteUrl = u.href;
        } catch {}
      } else if (dnsOK) {
        websiteUrl = `https://${d}`;
      }
    }
  }

  // 品牌名兜底：无URL/域名时根据显示名强制使用官方域名
  if (!websiteUrl) {
    const brandFallback = (name) => {
      const n = String(name || '').toLowerCase().trim();
      if (n === 'at&t' || n === 'att') return 'https://www.att.com';
      if (n === 'bureau van dijk' || n === 'orbis') return 'https://www.bvdinfo.com';
      if (n === "moody's" || n === 'moodys') return 'https://www.moodys.com';
      if (n.startsWith('melissa')) return 'https://www.melissa.com';
      return null;
    };
    const forced = brandFallback(displayName);
    if (forced) websiteUrl = forced;
  }

  // Telegram 专用：若无 URL，则根据用户名构造 t.me 链接
  if (!websiteUrl) {
    const isTelegram = (platform.platform_name || platform.module || platform.source || '').toLowerCase().includes('telegram');
    if (isTelegram) {
      const uname = specItem?.username
        || platform?.data?.user_info?.username
        || platform?.data?.profile_photo?.username
        || platform?.data?.telegram_info?.username
        || platform?.username;
      if (uname && typeof uname === 'string' && uname.trim()) {
        websiteUrl = `https://t.me/${uname.replace(/^@/, '')}`;
      }
    }
  }

  // 提取头像 URL（优先高清）- 支持 user_info 嵌套结构
  const avatarUrl = extractAvatarUrl(specItem) || 
                    extractAvatarUrl(platform.data?.user_info) || 
                    extractAvatarUrl(platform.user_info) ||
                    extractAvatarUrl(platform);

  // 平台 Logo（来自 front_schemas 或 spec_format）
  let logoImageUrl = platform.front_schemas?.[0]?.image || specItem.image || specItem.picture_url || null;
  // 若仍无平台Logo，且已确定品牌官网URL，则回退使用站点favicon
  if (!logoImageUrl && websiteUrl && typeof websiteUrl === 'string') {
    try {
      const origin = new URL(websiteUrl).origin;
      logoImageUrl = `${origin}/favicon.ico`;
    } catch {}
  }

  // 如果是 Telegram 且存在用户名，但没有高清头像，尝试后端拉取高清头像
  const [remoteAvatarUrl, setRemoteAvatarUrl] = useState(null);
  useEffect(() => {
    const moduleName = (platform.platform_name || platform.module || platform.source || '').toLowerCase();
    let username = specItem?.username || specItem?.handle || platform?.username;
    // 若未提供 username，尝试从网站链接/个人资料链接解析 t.me 用户名
    if (!username && websiteUrl && typeof websiteUrl === 'string' && websiteUrl.includes('t.me/')) {
      try {
        const u = new URL(websiteUrl);
        if (u.hostname.endsWith('t.me')) {
          const seg = u.pathname.replace(/^\//, '').split('/')[0];
          if (seg) {
            username = seg.replace(/^@/, '');
          }
        }
      } catch (e) {
        // 忽略 URL 解析错误
      }
    }
    const hasHd = !!(specItem?.avatar_url_hd || specItem?.profile_pic_url_hd || (avatarUrl && /_hd\b/.test(avatarUrl)));
    if (!hasHd && username && moduleName.includes('telegram')) {
      const fetchHd = async () => {
        try {
          const API_BASE_URL = (process.env.REACT_APP_API_URL || (process.env.NODE_ENV === 'production' ? '/api' : 'http://localhost:8000/api'));
          const resp = await fetch(`${API_BASE_URL}/telegram/username/${encodeURIComponent(username)}`);
          const json = await resp.json();
          const info = json?.data?.user_info || {};
          const hd = info?.avatar_url_hd || info?.avatar_url || info?.profile_pic_url_hd;
          if (hd && /^https?:\/\//.test(hd)) {
            setRemoteAvatarUrl(hd);
          }
        } catch (e) {
          // 忽略错误，保持现有占位符/普通头像
        }
      };
      fetchHd();
    }
  }, [platform, avatarUrl]);

  // 计算是否为“电话匹配”
  const normalizePhone = (v) => (v || '').toString().replace(/\D/g, '');
  const queryPhone = normalizePhone(platform.phone || platform?.query?.phone);
  const candidatePhones = [];
  const pushCandidate = (v) => { const x = normalizePhone(v); if (x) candidatePhones.push(x); };
  pushCandidate(specItem?.phone);
  pushCandidate(specItem?.phone_number);
  if (specItem && typeof specItem === 'object') {
    Object.entries(specItem).forEach(([k, v]) => {
      if (/phone/i.test(k) && typeof v === 'string') pushCandidate(v);
    });
  }
  const phoneMatched = !!queryPhone && candidatePhones.some(p => p === queryPhone);

  // 复制到剪贴板
  const copyToClipboard = (text) => {
    navigator.clipboard.writeText(text).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  // 获取状态颜色
  const getStatusColor = () => {
    if (hasData) return 'text-green-500';
    if (isError) return 'text-red-500';
    if (isNotFound) return 'text-gray-500';
    return 'text-yellow-500';
  };

  // 获取状态图标
  const getStatusIcon = () => {
    if (hasData) return <CheckCircle2 className="w-4 h-4" />;
    if (isError) return <AlertTriangle className="w-4 h-4" />;
    if (isNotFound) return <XCircle className="w-4 h-4" />;
    return <AlertTriangle className="w-4 h-4" />;
  };

  // 获取状态文本
  const getStatusText = () => {
    if (hasData) return phoneMatched ? '发现数据 · 电话匹配' : '发现数据';
    if (isError) return platform.error || '查询错误';
    if (isNotFound) return '未找到数据';
    return '未知状态';
  };

  // 根据优先级挑选恰好6个字段：先选有值的，再用占位补足
  const pickMainFields = (dataObj) => {
    const src = (dataObj && typeof dataObj === 'object') ? dataObj : {};

    // 解包节点并将值格式化为可显示
    const unwrap = (v) => (v && typeof v === 'object' && ('value' in v)) ? v.value : v;
    const toDisplay = (v) => {
      const x = unwrap(v);
      if (x === null || x === undefined || x === '') return undefined;
      if (typeof x === 'string' || typeof x === 'number' || typeof x === 'boolean') return x;
      try { return JSON.stringify(x); } catch { return String(x); }
    };

    const skipKeys = new Set(['status','source']);
    if (moduleName.includes('telegram')) {
      skipKeys.add('telegram_found');
    }
    const collectFrom = (obj) => {
      if (!obj || typeof obj !== 'object') return [];
      if (Array.isArray(obj)) return [];
      const out = [];
      for (const [k, v] of Object.entries(obj)) {
        if (skipKeys.has(String(k).toLowerCase())) continue;
        const disp = toDisplay(v);
        if (disp !== undefined) {
          out.push({ label: getFieldDisplayName(k), value: disp });
        }
      }
      return out;
    };

    const primary = collectFrom(specItem);
    const secondary = collectFrom(platform.data || platform);

    // Telegram: 进一步从 user_info 抽取关键字段以便主卡展示
    let telegramExtras = [];
    if (moduleName.includes('telegram')) {
      const ui = (platform?.data?.user_info || platform?.user_info || {});
      const ti = (platform?.data?.telegram_info || {});
      const pp = (platform?.data?.profile_photo || {});
      const username = ui.username || ti.username || pp.username || specItem?.username || platform?.username;
      const profileUrl = (specItem?.profile_url || ui.profile_url || platform?.profile_url) || (username ? `https://t.me/${String(username).replace(/^@/, '')}` : undefined);
      const msgLink = ui.message_link || pp.send_message_url;
      const extrasObj = {
        username,
        user_id: ui.user_id || ti.user_id || ti.id,
        name: ui.full_name || ui.name || pp.name,
        phone: ui.phone || ti.phone || platform.phone,
        verified: ui.verified ?? ti.is_verified,
        premium: ui.premium ?? ti.is_premium,
        message_link: msgLink,
        profile_url: profileUrl,
      };
      const keys = ['username','user_id','name','phone','verified','premium','profile_url','message_link'];
      telegramExtras = keys.map(k => ({ label: getFieldDisplayName(k), value: toDisplay(extrasObj[k]) })).filter(it => it.value !== undefined);
    }

    // Truecaller: 从 data.data[0] 提取关键字段
    let truecallerExtras = [];
    if (moduleName.includes('truecaller')) {
      const tc = (platform?.data?.data && Array.isArray(platform.data.data)) ? platform.data.data[0] : null;
      if (tc && typeof tc === 'object') {
        const phoneInfo = (Array.isArray(tc.phones) && tc.phones[0]) ? tc.phones[0] : {};
        const addrInfo = (Array.isArray(tc.addresses) && tc.addresses[0]) ? tc.addresses[0] : {};
        const extrasObj = {
          name: tc.name,
          e164Format: phoneInfo.e164Format,
          nationalFormat: phoneInfo.nationalFormat,
          carrier: phoneInfo.carrier,
          city: addrInfo.city,
          area: addrInfo.area,
          timeZone: addrInfo.timeZone,
          countryCode: phoneInfo.countryCode || addrInfo.countryCode,
          score: tc.score,
          access: tc.access,
          enhanced: tc.enhanced,
        };
        const keys = ['name','e164Format','nationalFormat','carrier','city','area','timeZone','countryCode','score','access','enhanced'];
        truecallerExtras = keys.map(k => ({ label: getFieldDisplayName(k), value: toDisplay(extrasObj[k]) })).filter(it => it.value !== undefined);
      }
    }

    // 关键字段优先
    const keyOrder = ['id','user_id','account_id','profile_id','external_id','username','handle','screen_name','name','display_name','full_name','phone','phone_number','verified','premium','email','language','locale','location','address','city','region','country','profile_url','url','link','homepage'];
    const orderScore = (label) => {
      const raw = label.toLowerCase();
      const idx = keyOrder.findIndex(k => getFieldDisplayName(k).toLowerCase() === raw || k === raw);
      return idx === -1 ? 999 : idx;
    };
    const dedup = (arr) => {
      const seen = new Set();
      const res = [];
      for (const item of arr) {
        const key = `${item.label}|${String(item.value)}`;
        if (!seen.has(key)) { seen.add(key); res.push(item); }
      }
      return res;
    };

    let merged = dedup(primary).sort((a,b) => orderScore(a.label) - orderScore(b.label));
    if (merged.length < 6) {
      const more = dedup(secondary).filter(i => !merged.some(j => j.label === i.label));
      merged = merged.concat(more);
    }
    if (merged.length < 6 && telegramExtras.length > 0) {
      const extras = dedup(telegramExtras).filter(i => !merged.some(j => j.label === i.label));
      merged = merged.concat(extras);
    }
    if (merged.length < 6 && truecallerExtras.length > 0) {
      const extras = dedup(truecallerExtras).filter(i => !merged.some(j => j.label === i.label));
      merged = merged.concat(extras);
    }

    const pickByOrder = (arr, keys) => {
      const labels = keys.map(k => getFieldDisplayName(k).toLowerCase());
      const out = [];
      for (const lbl of labels) {
        const idx = arr.findIndex(x => String(x.label).toLowerCase() === lbl);
        if (idx !== -1) out.push(arr[idx]);
      }
      return out;
    };
    if (moduleName.includes('telegram')) {
      const ordered = pickByOrder(merged, ['username','user_id','name','phone','profile_url','message_link']);
      const rest = merged.filter(x => !ordered.some(y => y.label === x.label));
      merged = ordered.concat(rest).slice(0, 6);
      return merged;
    }
    if (moduleName.includes('truecaller')) {
      skipKeys.add('data');
      const ordered = pickByOrder(merged, ['name','e164Format','nationalFormat','carrier','city','timeZone']);
      const rest = merged.filter(x => !ordered.some(y => y.label === x.label));
      merged = ordered.concat(rest).slice(0, 6);
      return merged;
    }
    return merged.slice(0, 6);
  };

  // 头像组件
  const Avatar = ({ url, name }) => {
    const [imgError, setImgError] = useState(false);
    if (url && !imgError) {
      const proxied = (typeof url === 'string' && url.startsWith('http'))
        ? `/api/avatar?url=${encodeURIComponent(url)}`
        : url;
      return (
        <img
          src={proxied}
          alt={name ? `${name} 头像` : "头像"}
          className="h-24 w-24 rounded-2xl object-cover border border-white/10 shadow"
          onError={() => setImgError(true)}
          loading="lazy"
          decoding="async"
          referrerPolicy="no-referrer"
          crossOrigin="anonymous"
        />
      );
    }
    const mono = (name?.trim()?.[0] ?? "?").toUpperCase();
    return (
      <div className="h-24 w-24 rounded-2xl bg-white/10 border border-white/10 flex items-center justify-center text-2xl font-semibold">
        {mono}
      </div>
    );
  };

  // 递归渲染值（数组与嵌套对象）
  const RenderValue = ({ value }) => {
    const hasNodeValue = (val) => !!(val && typeof val === 'object' && Object.prototype.hasOwnProperty.call(val, 'value'));
    // 解包 spec_format 节点 { type, proper_key, value }
    if (hasNodeValue(value)) {
      value = value.value;
    }
    if (value === null || value === undefined || value === '') {
      return <span className="text-neutral-400">-</span>;
    }
    if (Array.isArray(value)) {
      if (value.length === 0) return <span className="text-neutral-400">-</span>;
      return (
        <div className="space-y-1">
          {value.map((item, idx) => (
            <div key={idx} className="text-xs text-neutral-300 bg-white/[0.04] rounded px-2 py-1 border border-white/10">
              <RenderValue value={hasNodeValue(item) ? item.value : item} />
            </div>
          ))}
        </div>
      );
    }
    if (typeof value === 'object') {
      const entries = Object.entries(value).filter(([k, v]) => v !== null && v !== undefined && v !== '');
      if (entries.length === 0) return <span className="text-neutral-400">-</span>;
      return (
        <div className="space-y-1">
          {entries.map(([k, v]) => (
            <div key={k} className="grid grid-cols-1 gap-1">
              <div className="flex items-start justify-between gap-3 py-1.5 px-2 bg-white/[0.03] rounded-md border border-white/10">
                <div className="text-xs font-medium text-foreground/90 truncate flex items-center gap-1">
                  <div className="w-1.5 h-1.5 rounded-full bg-primary/60"></div>
                  {getFieldDisplayName(k)}
                </div>
                <div className="text-xs text-neutral-300 text-right break-words max-w-[60%]">
                  <RenderValue value={hasNodeValue(v) ? v.value : v} />
                </div>
              </div>
            </div>
          ))}
        </div>
      );
    }
    return <span>{formatValue(value)}</span>;
  };

  const isValidEmail = (s) => {
    const str = String(s || '').trim();
    if (!str) return false;
    const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return re.test(str);
  };

  // 字段的单行展示，仅显示值不显示标签
  const FieldRow = ({ label, value }) => (
    <div className="py-1 px-0">
      <div className="text-xs text-neutral-300 break-words">
        <RenderValue value={( /password|密码/i.test(label || '') ) ? '••••••' : value} />
      </div>
    </div>
  );

  // 渲染数据字段 - 全量递归显示所有字段
  const renderFields = (data, prefix = '') => {
    if (!data || typeof data !== 'object') return null;
    
    return Object.entries(data).map(([key, value]) => {
      const fieldKey = prefix ? `${prefix}.${key}` : key;
      
      if (value === null || value === undefined || value === '') return null;
      
      if (Array.isArray(value)) {
        if (value.length === 0) return null;
        const isEmailField = /email/i.test(key);
        const list = isEmailField ? value.filter(isValidEmail) : value;
        if (list.length === 0) return null;
        return (
          <div key={fieldKey} className="space-y-1">
            <div className="text-xs font-medium text-foreground flex items-center gap-1">
              <div className="w-1.5 h-1.5 rounded-full bg-primary/60"></div>
              {getFieldDisplayName(key)}
            </div>
            <div className="pl-2 space-y-1">
              {list.map((item, idx) => (
                <div key={idx} className="text-xs text-neutral-300 rounded px-2 py-1">
                  <RenderValue value={item} />
                </div>
              ))}
            </div>
          </div>
        );
      }
      
      if (typeof value === 'object') {
        const entries = Object.entries(value).filter(([k, v]) => v !== null && v !== undefined && v !== '');
        if (entries.length === 0) return null;
        return (
          <div key={fieldKey} className="space-y-1">
            <div className="text-xs font-medium text-foreground flex items-center gap-1">
              <div className="w-1.5 h-1.5 rounded-full bg-primary/60"></div>
              {getFieldDisplayName(key)}
            </div>
            <div className="grid grid-cols-1 gap-1">
              {entries.map(([childKey, childVal]) => (
                <FieldRow key={`${fieldKey}.${childKey}`} label={getFieldDisplayName(childKey)} value={(childVal && typeof childVal === 'object' && ('value' in childVal)) ? childVal.value : childVal} />
              ))}
            </div>
          </div>
        );
      }
      
      return (
        <FieldRow
          key={fieldKey}
          label={getFieldDisplayName(key)}
          value={( /email/i.test(key) && !isValidEmail(value) ) ? '-' : value}
        />
      );
    }).filter(Boolean);
  };

  const headerFieldsTruecaller = (moduleName.includes('truecaller')) ? (
    (() => {
      let tc = undefined;
      if (Array.isArray(platform?.data?.data) && platform.data.data[0]) {
        tc = platform.data.data[0];
      } else if (platform?.data && typeof platform.data === 'object') {
        tc = platform.data;
      } else {
        tc = platform;
      }
      const phonesArr = (Array.isArray(tc?.phones) && tc.phones.length > 0) ? tc.phones : [];
      const phoneInfo = phonesArr[0] || {};
      const addressesArr = (Array.isArray(tc?.addresses) && tc.addresses.length > 0) ? tc.addresses : [];
      const addrInfo = addressesArr[0] || {};
      const fields = [
        { label: 'id', value: tc?.id },
        { label: 'name', value: tc?.name },
        { label: 'score', value: tc?.score },
        { label: 'access', value: tc?.access },
        { label: 'enhanced', value: tc?.enhanced ? '是' : (tc?.enhanced === false ? '否' : undefined) },
        { label: 'e164Format', value: phoneInfo?.e164Format || tc?.e164Format },
        { label: 'nationalFormat', value: phoneInfo?.nationalFormat },
        { label: 'carrier', value: phoneInfo?.carrier },
        { label: 'city', value: addrInfo?.city },
      ];
      return fields.filter(f => f.value !== undefined && f.value !== null && f.value !== '');
    })()
  ) : undefined;

  // 计算主要字段 - 优先使用 pickMainFields 的结果，确保 6 个字段
  const computedMainFields = (() => {
    const picked = pickMainFields(specItem || platform);
    return (picked && picked.length > 0) ? picked : [];
  })();

  // 为 TrueCaller 特别处理：确保有数据
  const finalMainFields = (() => {
    if (moduleName.includes('truecaller')) {
      // TrueCaller 优先使用已提取的 truecallerExtras
      if (headerFieldsTruecaller && headerFieldsTruecaller.length > 0) {
        return headerFieldsTruecaller.slice(0, 6);
      }
      // 回退到 computedMainFields
      return computedMainFields.length > 0 ? computedMainFields.slice(0, 6) : [];
    }
    // 其他平台直接使用 computedMainFields
    return computedMainFields.length > 0 ? computedMainFields.slice(0, 6) : [];
  })();

  const headerFieldsSelected = (moduleName.includes('truecaller') && Array.isArray(headerFieldsTruecaller))
    ? headerFieldsTruecaller.filter(f => ['e164Format','nationalFormat','carrier','city'].includes(String(f.label))).slice(0, 4)
    : undefined;

  if (true) {
    return (
      <div className="w-full">
        <AccountCard
          appName={displayName}
          platform={platform.platform_name || platform.module || platform.source}
          websiteUrl={websiteUrl}
          status={(String(platform.platform_name || platform.module || platform.source).toLowerCase().includes('telegram') && platform?.data?.telegram_found === false)
            ? '未找到数据'
            : (hasData ? (phoneMatched ? '发现数据 · 电话匹配' : '发现数据') : isError ? (platform.error || '查询错误') : isNotFound ? '未找到数据' : '未知状态')}
          timestamp={specItem?.timestamp || specItem?.last_updated || platform.last_updated}
          accountId={specItem?.id || specItem?.user_id || specItem?.account_id || specItem?.profile_id || specItem?.external_id || platform.id || platform.user_id}
          name={platform.name 
            || specItem?.display_name 
            || specItem?.full_name 
            || specItem?.name 
            || specItem?.username 
            || specItem?.email 
            || platform?.data?.user_info?.full_name 
            || platform?.data?.user_info?.name 
            || platform?.data?.user_info?.username 
            || platform?.data?.profile_photo?.name 
            || ((Array.isArray(platform?.data?.data) && platform.data.data[0]?.name) ? platform.data.data[0].name : undefined)
          }
          locationIcon={specItem?.location ? '📍' : undefined}
          location={specItem?.location || specItem?.address || specItem?.city || specItem?.region || specItem?.country}
          phone={specItem?.phone || specItem?.phone_number || platform.phone}
          email={specItem?.email || platform.email}
          language={specItem?.language || platform.language || specItem?.locale}
          tags={[...(Array.isArray(specItem?.tags) ? specItem.tags : []), ...(phoneMatched ? ['电话匹配'] : [])]}
          avatarUrl={remoteAvatarUrl || avatarUrl}
          onViewAccount={() => websiteUrl && window.open(websiteUrl, '_blank')}
          onExpand={() => setExpanded(!expanded)}
          headerFields={headerFieldsSelected || (moduleName.includes('whatsapp') ? ([
            { label: 'whatsapp_found', value: platform?.data?.whatsapp_found },
            { label: 'query', value: platform?.data?.query },
          ].filter(f => f.value !== undefined && f.value !== null && f.value !== '')) : undefined)}
          mainFields={finalMainFields && finalMainFields.length > 0 ? finalMainFields : computedMainFields}
          showExpand={true}
        />

        {expanded && (
          <GlassCard className="mt-3" hover={false}>
            <div className="p-4 max-h-96 overflow-y-auto">
              <div className="flex items-center gap-2 mb-4">
                <div className="w-2 h-2 rounded-full bg-primary"></div>
                <span className="font-semibold text-foreground">详细信息</span>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                {specArray.length > 0 ? (
                  specArray.map((obj, idx) => (
                    <div key={idx}>{renderFields(obj, '')}</div>
                  ))
                ) : (
                  renderFields(platform, '')
                )}
              </div>
            </div>
          </GlassCard>
        )}
      </div>
    );
  }
  return (
    <GlassCard className="overflow-hidden w-full h-full" style={{ minHeight: '380px' }}>
      {/* 头部 - 包含头像和基本信息 */}
      <div className="flex items-start gap-4 p-4 border-b border-border/50">
        {/* 头像占位符 */}
        <Avatar url={remoteAvatarUrl || avatarUrl} name={platform.data?.name} />
        
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-2">
            {/* 平台图标（统一徽标选择） */}
            <UniversalLogo
              platform={platform.platform_name || platform.module || platform.source}
              module={platform.platform_name || platform.module || platform.source}
              label={displayName}
              row={{ ...(platform.data || {}), Url: websiteUrl, Email: platform?.data?.email }}
              url={websiteUrl}
              imageUrl={logoImageUrl}
              className="w-6 h-6"
            />
            {hasSpecData && (
              <ProfileAvatar spec={specItem} platformName={displayName} size="h-6 w-6" />
            )}
            <h3 className="text-lg font-semibold tracking-tight text-neutral-100">{displayName}</h3>
            <Badge variant="secondary" className="text-xs bg-white/10 text-neutral-200 border-white/20">
              {platform.source}
            </Badge>
            {/* 状态指示器 */}
            <div className={`w-2 h-2 rounded-full ${
              hasData ? 'bg-green-500' : isError ? 'bg-red-500' : 'bg-gray-500'
            }`}></div>
            {(platform.error || platform.data?.message) && (
              <span className="ml-auto text-[11px] px-2 py-0.5 rounded bg-red-500/20 text-red-300 border border-red-500/30 truncate max-w-[40%]">
                {platform.error || platform.data?.message}
              </span>
            )}
          </div>
          
          <div className="text-xs text-neutral-400 truncate mb-2">
            {platform.name || platform.data?.name || platform.data?.username || platform.data?.email || '未找到用户信息'}
          </div>
          
          <div className="flex items-center gap-3 text-xs text-neutral-300">
            <div className="flex items-center gap-1">
              <MapPin className="w-3 h-3" />
              <span className="truncate">{platform.data?.location || '未知位置'}</span>
            </div>
            <div className="flex items-center gap-1">
              <Users className="w-3 h-3" />
              <span>{formatFollowers(platform.data?.followers)}</span>
            </div>
            {platform.data?.verified && (
              <div className="flex items-center gap-1">
                <CheckCircle2 className="w-3 h-3 text-green-400" />
                <span>已验证</span>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* 页脚按钮 - 黑玻璃风格 */}
      <div className="flex items-center justify-between gap-3 border-t border-border/50 bg-card px-4 py-3 sm:px-5">
      <div className="flex items-center gap-2">
        {hasData && (
          <button
            onClick={() => setExpanded(!expanded)}
            className="inline-flex items-center gap-1 text-sm text-neutral-200 hover:text-white transition"
          >
            <span>{expanded ? '收起' : 'Expand Results'}</span>
          </button>
        )}
      </div>
        {websiteUrl && (
          <button
            onClick={() => window.open(websiteUrl, '_blank')}
            className="inline-flex items-center gap-1 text-sm text-neutral-200 hover:text-white transition"
          >
            <span>访问</span>
            <svg viewBox="0 0 24 24" className="h-4 w-4" fill="currentColor">
              <path d="M7 17 17 7v6h2V5H11v2h6L7 17z" />
            </svg>
          </button>
        )}
      </div>

      {/* 数据预览区域 - 紧凑的关键信息 */}
      {!expanded && (
        <div className="px-4 py-3 border-t border-border/50 bg-card flex-1" style={{ minHeight: '120px' }}>
          <div className="space-y-2">
            {hasData ? (
              <>
                {(() => {
                  const fields = renderFields(specItem || platform);
                  const keyFields = fields ? fields.slice(0, 6) : [];
                  return keyFields.length > 0 ? keyFields : (
                    <div className="text-center text-neutral-400 py-4">
                      <AlertTriangle className="w-5 h-5 mx-auto mb-1 opacity-50" />
                      <p className="text-xs">暂无详细数据</p>
                    </div>
                  );
                })()}
                {(() => {
                  const allFields = renderFields(specItem || platform);
                  if (allFields && allFields.length > 6) {
                    return (
                      <div className="text-center pt-1">
                        <button
                          onClick={() => setExpanded(!expanded)}
                          className="inline-flex items-center gap-1 text-xs h-5 px-2 text-neutral-300 hover:text-white hover:bg-white/10 rounded-md transition"
                        >
                          展开更多 ({allFields.length - 6})
                          <ChevronDown className={`w-2.5 h-2.5 ml-1 transition-transform ${expanded ? 'rotate-180' : ''}`} />
                        </button>
                      </div>
                    );
                  }
                  return null;
                })()}
              </>
            ) : (
              <div className="text-center text-neutral-400 py-4">
                <AlertTriangle className="w-5 h-5 mx-auto mb-1 opacity-50" />
                <p className="text-xs font-medium">{getStatusText()}</p>
                {platform.error && (
                  <p className="text-xs mt-0.5 opacity-70">{platform.error}</p>
                )}
              </div>
            )}
          </div>
        </div>
      )}

      {/* 展开的详细信息 - 放在最下面 */}
      {expanded && hasData && (
        <div className="border-t border-border/50 bg-card flex-1">
          <div className="p-4 max-h-96 overflow-y-auto">
            <div className="flex items-center gap-2 mb-4">
              <div className="w-2 h-2 rounded-full bg-primary"></div>
              <span className="font-semibold text-foreground">详细信息</span>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
              {hasSpecData && renderFields(specItem, '')}
              {!hasSpecData && renderFields(platform, '')}
            </div>
          </div>
        </div>
      )}

      {/* 原始数据视图已移除，应仅显示结构化字段与详情 */}
    </GlassCard>
  );
};

export default PlatformCard;
