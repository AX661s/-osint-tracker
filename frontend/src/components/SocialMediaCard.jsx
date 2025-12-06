import React, { useState } from 'react';
import { CheckCircle, AlertCircle, ExternalLink, Eye, EyeOff, Copy, Check } from 'lucide-react';

// 社交媒体平台配置
const PLATFORM_CONFIG = {
  'Facebook': {
    name: 'Facebook',
    logo: 'https://cdn.jsdelivr.net/npm/simple-icons@v9/icons/facebook.svg',
    color: '#1877F2',
    bgColor: '#1877F2/10',
    iconBg: '#1877F2'
  },
  'Instagram': {
    name: 'Instagram', 
    logo: 'https://cdn.jsdelivr.net/npm/simple-icons@v9/icons/instagram.svg',
    color: '#E4405F',
    bgColor: '#E4405F/10',
    iconBg: '#E4405F'
  },
  'Twitter': {
    name: 'Twitter',
    logo: 'https://cdn.jsdelivr.net/npm/simple-icons@v9/icons/twitter.svg', 
    color: '#1DA1F2',
    bgColor: '#1DA1F2/10',
    iconBg: '#1DA1F2'
  },
  'Google': {
    name: 'Google',
    logo: 'https://cdn.jsdelivr.net/npm/simple-icons@v9/icons/google.svg',
    color: '#4285F4', 
    bgColor: '#4285F4/10',
    iconBg: '#4285F4'
  },
  'Zoom': {
    name: 'Zoom',
    logo: 'https://cdn.jsdelivr.net/npm/simple-icons@v9/icons/zoom.svg',
    color: '#2D8CFF',
    bgColor: '#2D8CFF/10', 
    iconBg: '#2D8CFF'
  },
  'Gravatar': {
    name: 'Gravatar',
    logo: 'https://cdn.jsdelivr.net/npm/simple-icons@v9/icons/gravatar.svg',
    color: '#1E8CBE',
    bgColor: '#1E8CBE/10',
    iconBg: '#1E8CBE'
  },
  'LinkedIn': {
    name: 'LinkedIn', 
    logo: 'https://cdn.jsdelivr.net/npm/simple-icons@v9/icons/linkedin.svg',
    color: '#0A66C2',
    bgColor: '#0A66C2/10',
    iconBg: '#0A66C2'
  },
  'TikTok': {
    name: 'TikTok',
    logo: 'https://cdn.jsdelivr.net/npm/simple-icons@v9/icons/tiktok.svg', 
    color: '#000000',
    bgColor: '#000000/10',
    iconBg: '#000000'
  },
  'Snapchat': {
    name: 'Snapchat',
    logo: 'https://cdn.jsdelivr.net/npm/simple-icons@v9/icons/snapchat.svg',
    color: '#FFFC00',
    bgColor: '#FFFC00/10',
    iconBg: '#FFFC00'
  },
  'YouTube': {
    name: 'YouTube',
    logo: 'https://cdn.jsdelivr.net/npm/simple-icons@v9/icons/youtube.svg',
    color: '#FF0000',
    bgColor: '#FF0000/10', 
    iconBg: '#FF0000'
  }
};

const SocialMediaCard = ({ platform, accounts }) => {
  const [showPasswords, setShowPasswords] = useState({});
  const [copiedFields, setCopiedFields] = useState({});
  
  const config = PLATFORM_CONFIG[platform] || {
    name: platform,
    logo: null,
    color: '#6B7280',
    bgColor: '#6B7280/10',
    iconBg: '#6B7280'
  };

  const togglePassword = (accountIndex) => {
    setShowPasswords(prev => ({
      ...prev,
      [accountIndex]: !prev[accountIndex]
    }));
  };

  const copyToClipboard = async (text, fieldKey) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedFields(prev => ({ ...prev, [fieldKey]: true }));
      setTimeout(() => {
        setCopiedFields(prev => ({ ...prev, [fieldKey]: false }));
      }, 2000);
    } catch (err) {
      console.error('复制失败:', err);
    }
  };

  // 格式化URL，确保有正确的协议前缀
  const formatUrl = (url) => {
    if (!url) return null;
    if (url.startsWith('http://') || url.startsWith('https://')) {
      return url;
    }
    return `https://${url}`;
  };

  // 生成平台特定的个人资料链接
  const generateProfileLinks = (account, platform) => {
    const links = [];
    
    // 如果有直接URL，添加它
    if (account.url) {
      links.push({
        label: '登录页面',
        url: formatUrl(account.url),
        type: 'login'
      });
    }

    // 根据平台生成额外的有用链接
    if (account.username) {
      switch (platform) {
        case 'Gravatar':
          links.push({
            label: '个人资料',
            url: `https://gravatar.com/${account.username}`,
            type: 'profile'
          });
          break;
        case 'Facebook':
          links.push({
            label: '搜索用户',
            url: `https://www.facebook.com/search/people/?q=${encodeURIComponent(account.email || account.username)}`,
            type: 'search'
          });
          break;
        case 'Instagram':
          if (account.username) {
            links.push({
              label: '个人资料',
              url: `https://www.instagram.com/${account.username}`,
              type: 'profile'
            });
          }
          break;
        case 'Twitter':
          if (account.username) {
            links.push({
              label: '个人资料',
              url: `https://twitter.com/${account.username}`,
              type: 'profile'
            });
          }
          break;
      }
    }

    // 如果有邮箱，添加邮箱相关链接
    if (account.email && !account.url) {
      switch (platform) {
        case 'Google':
          links.push({
            label: 'Google账户',
            url: 'https://accounts.google.com/',
            type: 'service'
          });
          break;
        case 'Facebook':
          links.push({
            label: 'Facebook搜索',
            url: `https://www.facebook.com/search/people/?q=${encodeURIComponent(account.email)}`,
            type: 'search'
          });
          break;
      }
    }

    return links;
  };

  if (!accounts || accounts.length === 0) {
    return null;
  }

  return (
    <div className="bg-card border border-border rounded-lg overflow-hidden">
      {/* 平台头部 */}
      <div 
        className="p-4 flex items-center gap-3"
        style={{ backgroundColor: config.bgColor }}
      >
        {config.logo ? (
          <div 
            className="w-10 h-10 rounded-full flex items-center justify-center"
            style={{ backgroundColor: config.iconBg }}
          >
            <img 
              src={config.logo} 
              alt={config.name}
              className="w-6 h-6 filter invert"
              style={{ filter: config.name === 'Google' ? 'none' : 'invert(1)' }}
            />
          </div>
        ) : (
          <div 
            className="w-10 h-10 rounded-full flex items-center justify-center text-white font-bold"
            style={{ backgroundColor: config.iconBg }}
          >
            {platform.substring(0, 2).toUpperCase()}
          </div>
        )}
        
        <div className="flex-1">
          <div className="flex items-center gap-2">
            <h3 className="font-bold text-lg" style={{ color: config.color }}>
              {config.name}
            </h3>
            <CheckCircle className="w-5 h-5 text-green-500" />
          </div>
          <p className="text-sm text-muted-foreground">
            发现 {accounts.length} 个账户
          </p>
        </div>
      </div>

      {/* 账户详情 */}
      <div className="p-4 space-y-3">
        {accounts.map((account, index) => (
          <div key={index} className="bg-muted/30 rounded-lg p-3 space-y-2">
            {/* 邮箱 */}
            {account.email && (
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="text-sm text-muted-foreground">邮箱:</span>
                  <span className="font-mono text-sm">{account.email}</span>
                </div>
                <button
                  onClick={() => copyToClipboard(account.email, `email-${index}`)}
                  className="p-1 hover:bg-muted rounded"
                >
                  {copiedFields[`email-${index}`] ? (
                    <Check className="w-4 h-4 text-green-500" />
                  ) : (
                    <Copy className="w-4 h-4" />
                  )}
                </button>
              </div>
            )}

            {/* 用户名 */}
            {account.username && (
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="text-sm text-muted-foreground">用户名:</span>
                  <span className="font-mono text-sm">{account.username}</span>
                </div>
                <button
                  onClick={() => copyToClipboard(account.username, `username-${index}`)}
                  className="p-1 hover:bg-muted rounded"
                >
                  {copiedFields[`username-${index}`] ? (
                    <Check className="w-4 h-4 text-green-500" />
                  ) : (
                    <Copy className="w-4 h-4" />
                  )}
                </button>
              </div>
            )}

            {/* 密码 */}
            {account.password && (
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="text-sm text-muted-foreground">密码:</span>
                  <span className="font-mono text-sm">
                    {showPasswords[index] ? account.password : '••••••••'}
                  </span>
                </div>
                <div className="flex gap-1">
                  <button
                    onClick={() => togglePassword(index)}
                    className="p-1 hover:bg-muted rounded"
                  >
                    {showPasswords[index] ? (
                      <EyeOff className="w-4 h-4" />
                    ) : (
                      <Eye className="w-4 h-4" />
                    )}
                  </button>
                  <button
                    onClick={() => copyToClipboard(account.password, `password-${index}`)}
                    className="p-1 hover:bg-muted rounded"
                  >
                    {copiedFields[`password-${index}`] ? (
                      <Check className="w-4 h-4 text-green-500" />
                    ) : (
                      <Copy className="w-4 h-4" />
                    )}
                  </button>
                </div>
              </div>
            )}

            {/* 相关链接 */}
            {(() => {
              const links = generateProfileLinks(account, platform);
              if (links.length === 0) return null;
              
              return (
                <div className="space-y-2">
                  <span className="text-sm text-muted-foreground">相关链接:</span>
                  {links.map((link, linkIndex) => (
                    <div key={linkIndex} className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="text-xs px-2 py-1 bg-blue-100 text-blue-700 rounded">
                          {link.label}
                        </span>
                        <a 
                          href={link.url} 
                          target="_blank" 
                          rel="noopener noreferrer"
                          className="text-blue-500 hover:underline font-mono text-sm break-all"
                        >
                          {link.url.length > 50 ? link.url.substring(0, 50) + '...' : link.url}
                        </a>
                      </div>
                      <div className="flex gap-1">
                        <button
                          onClick={() => copyToClipboard(link.url, `link-${index}-${linkIndex}`)}
                          className="p-1 hover:bg-muted rounded"
                          title="复制链接"
                        >
                          {copiedFields[`link-${index}-${linkIndex}`] ? (
                            <Check className="w-4 h-4 text-green-500" />
                          ) : (
                            <Copy className="w-4 h-4" />
                          )}
                        </button>
                        <ExternalLink className="w-4 h-4 text-muted-foreground" />
                      </div>
                    </div>
                  ))}
                </div>
              );
            })()}

            {/* 头像 */}
            {account.avatar && (
              <div className="flex items-center gap-2">
                <span className="text-sm text-muted-foreground">头像:</span>
                <img 
                  src={account.avatar} 
                  alt="Avatar"
                  className="w-8 h-8 rounded-full"
                  onError={(e) => {
                    e.target.style.display = 'none';
                  }}
                />
              </div>
            )}

            {/* Facebook ID */}
            {account.facebook_id && (
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="text-sm text-muted-foreground">Facebook ID:</span>
                  <span className="font-mono text-sm">{account.facebook_id}</span>
                </div>
                <button
                  onClick={() => copyToClipboard(account.facebook_id, `fbid-${index}`)}
                  className="p-1 hover:bg-muted rounded"
                >
                  {copiedFields[`fbid-${index}`] ? (
                    <Check className="w-4 h-4 text-green-500" />
                  ) : (
                    <Copy className="w-4 h-4" />
                  )}
                </button>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
};

export default SocialMediaCard;