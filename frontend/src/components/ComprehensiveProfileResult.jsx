import React from 'react';
import { ArrowLeft, Shield, User, Phone, MapPin, Calendar, FileText, AlertTriangle, Briefcase, Database, Globe, Lock, Mail, Printer, Download, Share2 } from 'lucide-react';

export default function ComprehensiveProfileResult({ data, query, onBack }) {
  console.log('ComprehensiveProfileResult loaded');
  console.log('ComprehensiveProfileResult received data:', data);
  
  // 安全地解构数据
  const profile = React.useMemo(() => {
    try {
      return data?.data || {};
    } catch (e) {
      console.error('Error accessing profile data:', e);
      return {};
    }
  }, [data]);
  
  const success = data?.success;
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

  // 适配通用数据结构
  // 处理新的 API 响应结构 (step1, step2, step3, step4)
  const step1 = profile.step1_phone_query || {};
  const step2 = profile.step2_phone_query || {};
  const step3 = profile.step3_email_queries || {};
  const step4 = profile.step4_name_query || {};

  // 提取基本信息
  const basic_info = profile.basic_info || {};
  
  // 尝试从 step1 (Truecaller) 提取信息
  if (step1.data && Array.isArray(step1.data) && step1.data.length > 0) {
    const tcData = step1.data[0];
    if (!basic_info.name) basic_info.name = tcData.name;
    if (!basic_info.carrier) basic_info.carrier = tcData.phones?.[0]?.carrier;
    if (!basic_info.countryCode) basic_info.countryCode = tcData.phones?.[0]?.countryCode;
    if (!basic_info.address && tcData.addresses?.[0]) {
      const addr = tcData.addresses[0];
      basic_info.address = [addr.city, addr.area, addr.countryCode].filter(Boolean).join(', ');
    }
  }

  // 尝试从 step4 (Name Query) 提取更多信息
  if (step4.data?.List) {
    // 遍历所有数据库寻找最佳匹配
    Object.values(step4.data.List).forEach(db => {
      if (db.Data && Array.isArray(db.Data)) {
        db.Data.forEach(record => {
          if (!basic_info.name && (record.FullName || record.Name)) {
            basic_info.name = record.FullName || record.Name;
          }
          if (!basic_info.address && (record.Address || record.City)) {
            basic_info.address = [record.Address, record.City, record.State, record.PostCode].filter(Boolean).join(', ');
          }
          if (!basic_info.gender && record.Gender) {
            basic_info.gender = record.Gender;
          }
          // 年龄显示已禁用
          // if (!basic_info.age && record.Age) {
          //   basic_info.age = record.Age;
          // }
          if (!basic_info.birthday && (record.BDay || (record.BDayYear && record.BDayMonth && record.BDayDay))) {
            basic_info.birthday = record.BDay || `${record.BDayYear}-${record.BDayMonth}-${record.BDayDay}`;
          }
        });
      }
    });
  }

  const contact_info = profile.contact_info || profile.contact || {};
  const professional_info = profile.professional_info || profile.professional || {};
  
  // 构造 data_breaches 结构以兼容现有 UI
  const data_breaches = profile.data_breaches || {
    total_breaches: (step2.data?.NumOfResults || 0) + (step4.data?.NumOfResults || 0),
    details: {
      ...step2.data?.List,
      ...step4.data?.List
    }
  };

  const accounts = profile.accounts || {};
  const summary = profile.summary || {};
  const truecaller = profile.truecaller || {
    profile: step1.data?.[0] || {}
  };
  const caller_id = profile.caller_id || {};
  const twitter = profile.twitter || {};
  const google_email_data = profile.google_email_data || [];

  // Extract Truecaller data with safety checks
  const tcLinks = React.useMemo(() => {
    try {
      // 适配新的 step1 结构
      if (step1.data?.[0]?.internetAddresses) {
        return step1.data[0].internetAddresses;
      }
      return Array.isArray(truecaller?.reply?.links) ? truecaller.reply.links : [];
    } catch (e) {
      console.error('Error accessing truecaller links:', e);
      return [];
    }
  }, [truecaller, step1]);
  
  const tcProfile = truecaller?.profile || {};
  
  // Use avatar URLs directly
  let avatarUrl = tcProfile.whatsapp_photo || tcProfile.profile_photo || tcProfile.image || null;

  // Fetch Google avatar and location data from email if we have emails
  const [googleAvatarUrl, setGoogleAvatarUrl] = React.useState(null);
  const [googleLocationData, setGoogleLocationData] = React.useState(null);
  const [googleProfileData, setGoogleProfileData] = React.useState(null);
  
  const primaryEmail = React.useMemo(() => {
    // First try contact_info.emails
    if (contact_info?.emails && Array.isArray(contact_info.emails) && contact_info.emails.length > 0) {
      return contact_info.emails[0];
    }
    
    // Fallback: Extract from data_breaches (including new step2/step4 structure)
    if (data_breaches?.details && typeof data_breaches.details === 'object') {
      const allEmails = new Set();
      
      for (const dbInfo of Object.values(data_breaches.details)) {
        if (!dbInfo || !Array.isArray(dbInfo.Data)) continue;
        
        for (const record of dbInfo.Data) {
          if (record && record.Email && typeof record.Email === 'string') {
            const email = record.Email.trim().toLowerCase();
            if (email.includes('@gmail.com')) {
              return email; // Return first Gmail found
            }
            allEmails.add(email);
          }
        }
      }
      
      // If no Gmail, return any email found
      if (allEmails.size > 0) {
        return Array.from(allEmails)[0];
      }
    }
    
    return null;
  }, [contact_info?.emails, data_breaches?.details]);

  // Google email data now comes from main API response (google_email_data array)
  React.useEffect(() => {
    if (google_email_data && Array.isArray(google_email_data) && google_email_data.length > 0) {
      const googleData = google_email_data[0]; // Use first result
      
      setGoogleProfileData(googleData);
      
      // Set Google avatar URL if available
      if (googleData.avatar_url) {
        setGoogleAvatarUrl(googleData.avatar_url);
      }
      
      // Extract location data
      const locationData = googleData.location_data || googleData;
      if (locationData && (locationData.map_view || locationData.coordinates)) {
        setGoogleLocationData(locationData);
      }
    }
  }, [google_email_data]);

  // Extract social media from data breaches
  const extractedSocialMedia = React.useMemo(() => {
    const socialAccounts = [];
    
    if (data_breaches?.details && typeof data_breaches.details === 'object') {
      for (const [breachName, dbInfo] of Object.entries(data_breaches.details)) {
        if (!dbInfo.Data || !Array.isArray(dbInfo.Data)) continue;
        
        for (const record of dbInfo.Data) {
          // Extract Twitter from "Twitter 200M" database
          if (breachName.toLowerCase().includes('twitter')) {
            const getTwitterUsername = (email) => {
              if (!email) return null;
              const username = email.split('@')[0];
              return username.replace(/\./g, '_').replace(/\d+$/, '');
            };
            
            const twitterUsername = getTwitterUsername(record.Email);
            if (twitterUsername) {
              socialAccounts.push({
                platform: 'Twitter',
                url: `https://x.com/${twitterUsername}`,
                username: twitterUsername,
                fullName: record.FullName || record.Name,
                followers: record.Followers,
                source: breachName,
                type: 'twitter_200m'
              });
            }
          }
          
          // Extract Facebook ID
          if (record.FacebookID) {
            socialAccounts.push({
              platform: 'Facebook',
              id: record.FacebookID,
              url: `https://facebook.com/${record.FacebookID}`,
              source: breachName,
              type: 'facebook_id'
            });
          }
          
          // Extract usernames/nicknames that might be social media
          if (record.NickName && record.NickName !== primaryEmail) {
            // Check if it's from Gravatar (usually indicates social media presence)
            if (breachName.toLowerCase().includes('gravatar')) {
              socialAccounts.push({
                platform: 'Gravatar',
                username: record.NickName,
                url: record.Link || `http://gravatar.com/${record.NickName}`,
                avatar: record.Avatar,
                source: breachName,
                type: 'gravatar'
              });
            }
          }
          
          // Extract Instagram/Twitter/Facebook from Application field (Android apps)
          if (record.Application) {
            const app = record.Application.toLowerCase();
            
            // Helper: Generate Twitter username from email
            const getTwitterUsername = (email) => {
              if (!email) return null;
              const username = email.split('@')[0]; 
              return username.replace(/\./g, '_').replace(/\d+$/, ''); 
            };
            
            if (app.includes('instagram')) {
              const instagramUsername = record.NickName || (record.Email ? record.Email.split('@')[0].replace(/\./g, '') : null);
              socialAccounts.push({
                platform: 'Instagram',
                url: instagramUsername ? `https://www.instagram.com/${instagramUsername}/` : 'https://www.instagram.com/',
                username: instagramUsername || record.Email,
                source: breachName,
                type: 'app',
                password: record.Password
              });
            } else if (app.includes('twitter')) {
              const twitterUsername = record.NickName || getTwitterUsername(record.Email);
              socialAccounts.push({
                platform: 'Twitter',
                url: twitterUsername ? `https://x.com/${twitterUsername}` : 'https://twitter.com/',
                username: twitterUsername || record.Email,
                source: breachName,
                type: 'app',
                password: record.Password
              });
            } else if (app.includes('facebook')) {
              socialAccounts.push({
                platform: 'Facebook',
                url: 'https://www.facebook.com/',
                username: record.Email || record.NickName,
                source: breachName,
                type: 'app',
                password: record.Password
              });
            }
          }
          
          // Extract Instagram/Twitter from URLs
          if (record.Url) {
            const url = record.Url.toLowerCase();
            if (url.includes('instagram.com') || url.includes('twitter.com') || url.includes('facebook.com')) {
              const getTwitterUsername = (email) => {
                if (!email) return null;
                const username = email.split('@')[0];
                return username.replace(/\./g, '_').replace(/\d+$/, '');
              };
              
              let platform, finalUrl, username;
              if (url.includes('instagram')) {
                platform = 'Instagram';
                finalUrl = record.Url;
                username = record.NickName || (record.Email ? record.Email.split('@')[0].replace(/\./g, '') : null);
              } else if (url.includes('twitter')) {
                platform = 'Twitter';
                const twitterUsername = record.NickName || getTwitterUsername(record.Email);
                finalUrl = twitterUsername ? `https://x.com/${twitterUsername}` : record.Url;
                username = twitterUsername;
              } else {
                platform = 'Facebook';
                finalUrl = record.Url;
                username = record.NickName || record.Email;
              }
              
              socialAccounts.push({
                platform: platform,
                url: finalUrl,
                username: username || record.Email,
                source: breachName,
                type: 'url',
                password: record.Password
              });
            }
          }
        }
      }
    }
    
    // Remove duplicates: prioritize accounts with more info (prefer facebook_id over app/url)
    const uniqueAccountsMap = new Map();
    for (const account of socialAccounts) {
      const key = account.platform;
      const existing = uniqueAccountsMap.get(key);
      
      // Priority: facebook_id > url > app
      if (!existing) {
        uniqueAccountsMap.set(key, account);
      } else {
        if (account.type === 'facebook_id' || account.type === 'twitter_200m') {
          uniqueAccountsMap.set(key, account);
        } else if (account.type === 'url' && existing.type === 'app') {
          uniqueAccountsMap.set(key, account);
        }
      }
    }
    
    return Array.from(uniqueAccountsMap.values());
  }, [data_breaches, primaryEmail]);

  // Combine all social accounts
  const allSocialAccounts = React.useMemo(() => {
    const combined = [...extractedSocialMedia];
    
    // Add Truecaller links if not already present
    if (tcLinks && tcLinks.length > 0) {
      tcLinks.forEach(link => {
        // Simple check to avoid duplicates
        const isDuplicate = combined.some(acc => 
          (link.url && acc.url && link.url === acc.url) || 
          (link.service && acc.platform && link.service.toLowerCase() === acc.platform.toLowerCase())
        );
        
        if (!isDuplicate) {
          combined.push({
            platform: link.service || 'Unknown',
            url: link.url,
            username: link.email || link.name,
            source: 'Truecaller',
            type: 'truecaller'
          });
        }
      });
    }
    
    return combined;
  }, [extractedSocialMedia, tcLinks]);

  // Helper to format date
  const formatDate = (dateString) => {
    if (!dateString) return '未知';
    try {
      return new Date(dateString).toLocaleDateString('zh-CN', {
        year: 'numeric',
        month: 'long',
        day: 'numeric'
      });
    } catch (e) {
      return dateString;
    }
  };

  // Helper to mask sensitive data
  const maskData = (text, type = 'text') => {
    if (!text) return 'N/A';
    if (type === 'email') {
      const [user, domain] = text.split('@');
      if (!domain) return text;
      return `${user.substring(0, 3)}***@${domain}`;
    }
    if (type === 'phone') {
      return text.replace(/(\d{3})\d{4}(\d{4})/, '$1****$2');
    }
    return text;
  };

  return (
    <div className="min-h-screen bg-background pb-12">
      {/* Header / Navigation */}
      <div className="bg-card border-b border-border sticky top-0 z-10 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center">
              <button 
                onClick={onBack}
                className="mr-4 p-2 rounded-full hover:bg-accent text-muted-foreground hover:text-foreground transition-colors"
              >
                <ArrowLeft className="w-5 h-5" />
              </button>
              <div>
                <h1 className="text-xl font-bold text-foreground flex items-center gap-2">
                  <Shield className="w-5 h-5 text-primary" />
                  综合情报档案
                </h1>
                <p className="text-xs text-muted-foreground">
                  查询对象: {query || '未知'} | 生成时间: {new Date().toLocaleString()}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <button className="p-2 text-muted-foreground hover:text-foreground hover:bg-accent rounded-md transition-colors" title="打印报告">
                <Printer className="w-5 h-5" />
              </button>
              <button className="p-2 text-muted-foreground hover:text-foreground hover:bg-accent rounded-md transition-colors" title="下载数据">
                <Download className="w-5 h-5" />
              </button>
              <button className="p-2 text-muted-foreground hover:text-foreground hover:bg-accent rounded-md transition-colors" title="分享">
                <Share2 className="w-5 h-5" />
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          
          {/* Left Column: Identity Card & Quick Stats */}
          <div className="lg:col-span-4 space-y-6">
            {/* Main Identity Card */}
            <div className="bg-card rounded-xl shadow-sm border border-border overflow-hidden">
              <div className="h-32 bg-gradient-to-r from-blue-600 to-indigo-700 relative">
                <div className="absolute inset-0 bg-black/10"></div>
              </div>
              <div className="px-6 pb-6 relative">
                <div className="flex justify-between items-end -mt-12 mb-4">
                  <div className="relative">
                    <div className="w-24 h-24 rounded-xl border-4 border-card bg-white shadow-md overflow-hidden">
                      {googleAvatarUrl || avatarUrl ? (
                        <img 
                          src={googleAvatarUrl || avatarUrl} 
                          alt="Profile" 
                          className="w-full h-full object-cover"
                          onError={(e) => {
                            e.target.onerror = null;
                            e.target.src = `https://ui-avatars.com/api/?name=${basic_info.name || 'Unknown'}&background=random`;
                          }}
                        />
                      ) : (
                        <div className="w-full h-full bg-gray-100 flex items-center justify-center text-gray-400">
                          <User className="w-10 h-10" />
                        </div>
                      )}
                    </div>
                    {/* Status Indicator */}
                    <div className="absolute bottom-1 right-1 w-4 h-4 bg-green-500 border-2 border-white rounded-full" title="Active"></div>
                  </div>
                  <div className="flex gap-2">
                    {/* Risk Score Badge */}
                    <div className="bg-red-50 text-red-700 px-3 py-1 rounded-full text-xs font-bold border border-red-100 flex items-center gap-1">
                      <AlertTriangle className="w-3 h-3" />
                      高风险
                    </div>
                  </div>
                </div>
                
                <div className="space-y-1">
                  <h2 className="text-2xl font-bold text-foreground">
                    {basic_info.name || tcProfile.name || '未知姓名'}
                  </h2>
                  <div className="flex items-center text-muted-foreground text-sm gap-2">
                    <MapPin className="w-3.5 h-3.5" />
                    {basic_info.address || tcProfile.address || '地址未知'}
                  </div>
                </div>

                <div className="mt-6 pt-6 border-t border-border grid grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <span className="text-xs text-muted-foreground uppercase tracking-wider">性别</span>
                    <p className="font-medium text-foreground">{basic_info.gender || tcProfile.gender || '未知'}</p>
                  </div>
                  <div className="space-y-1">
                    <span className="text-xs text-muted-foreground uppercase tracking-wider">运营商</span>
                    <p className="font-medium text-foreground">{tcProfile.carrier || '未知'}</p>
                  </div>
                  <div className="space-y-1">
                    <span className="text-xs text-muted-foreground uppercase tracking-wider">国家</span>
                    <p className="font-medium text-foreground">{tcProfile.countryCode || '未知'}</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Contact Information */}
            <div className="bg-card rounded-xl shadow-sm border border-border p-6">
              <h3 className="text-lg font-semibold text-foreground mb-4 flex items-center gap-2">
                <Phone className="w-5 h-5 text-primary" />
                联系方式
              </h3>
              <div className="space-y-4">
                <div className="flex items-start gap-3">
                  <div className="w-8 h-8 rounded-lg bg-blue-50 flex items-center justify-center flex-shrink-0 text-blue-600">
                    <Phone className="w-4 h-4" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-foreground">手机号码</p>
                    <p className="text-sm text-muted-foreground truncate">{query}</p>
                  </div>
                  <button className="text-xs text-primary hover:underline">复制</button>
                </div>
                
                {primaryEmail && (
                  <div className="flex items-start gap-3">
                    <div className="w-8 h-8 rounded-lg bg-purple-50 flex items-center justify-center flex-shrink-0 text-purple-600">
                      <Mail className="w-4 h-4" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-foreground">主要邮箱</p>
                      <p className="text-sm text-muted-foreground truncate" title={primaryEmail}>{primaryEmail}</p>
                    </div>
                    <button className="text-xs text-primary hover:underline">复制</button>
                  </div>
                )}

                {contact_info.emails && contact_info.emails.length > 1 && (
                  <div className="pl-11 space-y-2">
                    {contact_info.emails.slice(1).map((email, idx) => (
                      <p key={idx} className="text-sm text-muted-foreground truncate">{email}</p>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Social Media Accounts */}
            <div className="bg-card rounded-xl shadow-sm border border-border p-6">
              <h3 className="text-lg font-semibold text-foreground mb-4 flex items-center gap-2">
                <Globe className="w-5 h-5 text-primary" />
                社交账号 ({allSocialAccounts.length})
              </h3>
              
              {allSocialAccounts.length > 0 ? (
                <div className="space-y-3">
                  {allSocialAccounts.map((acc, idx) => (
                    <a 
                      key={idx} 
                      href={acc.url} 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="flex items-center gap-3 p-2 rounded-lg hover:bg-accent transition-colors group"
                    >
                      <div className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center flex-shrink-0 overflow-hidden">
                        {acc.platform === 'Facebook' && <span className="text-blue-600 font-bold">f</span>}
                        {acc.platform === 'Twitter' && <span className="text-black font-bold">X</span>}
                        {acc.platform === 'Instagram' && <span className="text-pink-600 font-bold">Ig</span>}
                        {acc.platform === 'WhatsApp' && <span className="text-green-600 font-bold">Wa</span>}
                        {!['Facebook', 'Twitter', 'Instagram', 'WhatsApp'].includes(acc.platform) && (
                          <span className="text-gray-500 text-xs">{acc.platform?.[0]}</span>
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-foreground group-hover:text-primary transition-colors">
                          {acc.platform}
                        </p>
                        <p className="text-xs text-muted-foreground truncate">
                          {acc.username || '查看主页'}
                        </p>
                      </div>
                      <div className="text-xs text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity">
                        ↗
                      </div>
                    </a>
                  ))}
                </div>
              ) : (
                <div className="text-center py-6 text-muted-foreground text-sm bg-accent/30 rounded-lg border border-dashed border-border">
                  未发现关联社交账号
                </div>
              )}
            </div>
          </div>

          {/* Right Column: Detailed Information */}
          <div className="lg:col-span-8 space-y-6">
            
            {/* Data Breach Analysis */}
            <div className="bg-card rounded-xl shadow-sm border border-border overflow-hidden">
              <div className="p-6 border-b border-border flex justify-between items-center bg-red-50/30">
                <h3 className="text-lg font-semibold text-foreground flex items-center gap-2">
                  <Database className="w-5 h-5 text-red-600" />
                  数据泄露分析
                </h3>
                <span className="bg-red-100 text-red-700 px-3 py-1 rounded-full text-xs font-bold">
                  {data_breaches?.total_breaches || 0} 次泄露事件
                </span>
              </div>
              
              <div className="p-6">
                {data_breaches?.details && Object.keys(data_breaches.details).length > 0 ? (
                  <div className="space-y-6">
                    {Object.entries(data_breaches.details).map(([name, info], idx) => (
                      <div key={idx} className="border border-border rounded-lg p-4 hover:shadow-md transition-shadow">
                        <div className="flex justify-between items-start mb-3">
                          <div>
                            <h4 className="font-bold text-foreground text-lg">{name}</h4>
                            <p className="text-xs text-muted-foreground mt-1">
                              {info.InfoLeak || '无详细描述'}
                            </p>
                          </div>
                          <span className="text-xs font-mono bg-gray-100 px-2 py-1 rounded text-gray-600">
                            {info.Data?.length || 0} 条记录
                          </span>
                        </div>
                        
                        {/* Breach Data Table */}
                        {info.Data && info.Data.length > 0 && (
                          <div className="mt-4 overflow-x-auto">
                            <table className="w-full text-sm text-left">
                              <thead className="text-xs text-muted-foreground uppercase bg-accent/50">
                                <tr>
                                  <th className="px-3 py-2 rounded-l-md">姓名/邮箱</th>
                                  <th className="px-3 py-2">地址/位置</th>
                                  <th className="px-3 py-2">其他信息</th>
                                </tr>
                              </thead>
                              <tbody className="divide-y divide-border">
                                {info.Data.slice(0, 5).map((record, rIdx) => (
                                  <tr key={rIdx} className="hover:bg-accent/30">
                                    <td className="px-3 py-2 font-medium text-foreground">
                                      <div className="flex flex-col">
                                        <span>{record.FullName || record.Name || record.FirstName ? `${record.FirstName || ''} ${record.LastName || ''}` : '-'}</span>
                                        <span className="text-xs text-muted-foreground">{record.Email || '-'}</span>
                                      </div>
                                    </td>
                                    <td className="px-3 py-2 text-muted-foreground text-xs">
                                      <div className="flex flex-col">
                                        <span>{[record.Address, record.Street ? `${record.House || ''} ${record.Street} ${record.StreetSuffix || ''}` : null].filter(Boolean).join(', ') || '-'}</span>
                                        <span className="text-xs opacity-75">{[record.City, record.State, record.PostCode].filter(Boolean).join(', ')}</span>
                                      </div>
                                    </td>
                                    <td className="px-3 py-2 text-muted-foreground text-xs max-w-xs">
                                      <div className="flex flex-wrap gap-1">
                                        {record.Phone && <span className="bg-blue-50 text-blue-700 px-1.5 py-0.5 rounded border border-blue-100">📞 {record.Phone}</span>}
                                        {record.BDayYear && <span className="bg-purple-50 text-purple-700 px-1.5 py-0.5 rounded border border-purple-100">🎂 {record.BDayYear}</span>}
                                        {record.Income && <span className="bg-green-50 text-green-700 px-1.5 py-0.5 rounded border border-green-100">💰 {record.Income}</span>}
                                        {record.Password && <span className="bg-red-50 text-red-700 px-1.5 py-0.5 rounded border border-red-100">🔑 {record.Password}</span>}
                                        {record['Password(Hash)'] && <span className="bg-red-50 text-red-700 px-1.5 py-0.5 rounded border border-red-100" title={record['Password(Hash)']}>🔑 Hash</span>}
                                      </div>
                                    </td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                            {info.Data.length > 5 && (
                              <div className="text-center mt-2">
                                <button className="text-xs text-primary hover:underline">
                                  查看全部 {info.Data.length} 条记录
                                </button>
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-12 text-muted-foreground">
                    <Shield className="w-12 h-12 mx-auto mb-3 text-green-500 opacity-50" />
                    <p>未发现相关的数据泄露记录</p>
                    <p className="text-xs mt-1">该号码/邮箱似乎未出现在已知的泄露数据库中</p>
                  </div>
                )}
              </div>
            </div>

            {/* Professional Info */}
            {(professional_info.company || professional_info.job_title || professional_info.linkedin_url) && (
              <div className="bg-card rounded-xl shadow-sm border border-border p-6">
                <h3 className="text-lg font-semibold text-foreground mb-4 flex items-center gap-2">
                  <Briefcase className="w-5 h-5 text-primary" />
                  职业信息
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-1">
                    <span className="text-xs text-muted-foreground uppercase tracking-wider">公司</span>
                    <p className="font-medium text-foreground">{professional_info.company || '未知'}</p>
                  </div>
                  <div className="space-y-1">
                    <span className="text-xs text-muted-foreground uppercase tracking-wider">职位</span>
                    <p className="font-medium text-foreground">{professional_info.job_title || '未知'}</p>
                  </div>
                  {professional_info.linkedin_url && (
                    <div className="col-span-2 pt-2">
                      <a 
                        href={professional_info.linkedin_url} 
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-2 text-blue-600 hover:underline text-sm"
                      >
                        <Globe className="w-4 h-4" />
                        查看 LinkedIn 档案
                      </a>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Google Account Info */}
            {googleProfileData && (
              <div className="bg-card rounded-xl shadow-sm border border-border p-6">
                <h3 className="text-lg font-semibold text-foreground mb-4 flex items-center gap-2">
                  <img src="https://www.google.com/favicon.ico" alt="Google" className="w-5 h-5" />
                  Google 账号信息
                </h3>
                
                <div className="flex items-start gap-4">
                  <div className="w-16 h-16 rounded-full bg-gray-100 overflow-hidden flex-shrink-0 border border-gray-200">
                    {googleAvatarUrl ? (
                      <img src={googleAvatarUrl} alt="Google Profile" className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-gray-400">G</div>
                    )}
                  </div>
                  <div className="flex-1">
                    <h4 className="font-medium text-foreground">{googleProfileData.name || 'Google 用户'}</h4>
                    <p className="text-sm text-muted-foreground">{googleProfileData.email}</p>
                    
                    {googleLocationData && googleLocationData.coordinates && googleLocationData.coordinates.length > 0 && (
                      <div className="mt-3 bg-blue-50 p-3 rounded-lg border border-blue-100">
                        <p className="text-xs font-bold text-blue-800 mb-1 flex items-center gap-1">
                          <MapPin className="w-3 h-3" />
                          位置记录
                        </p>
                        <p className="text-xs text-blue-700">
                          {googleLocationData.coordinates[0].address || '未知地址'}
                        </p>
                        <p className="text-xs text-blue-600 mt-1 font-mono">
                          {googleLocationData.coordinates[0].latitude}, {googleLocationData.coordinates[0].longitude}
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}

          </div>
        </div>
      </div>
    </div>
  );
}
