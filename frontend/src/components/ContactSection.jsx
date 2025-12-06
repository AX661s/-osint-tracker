import React from 'react';
import { Mail, Phone, Smartphone, PhoneCall, Home, Building2, UserCircle, Briefcase } from 'lucide-react';

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

const ContactSection = ({ contact, basic_info, mostFrequentEmail }) => {
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
  const displayEmails = filterStrictly(contact.emails, 'email');
  const displayPhones = filterStrictly(contact.phones, 'phone');

  if (!contact.phones && !contact.emails && !basic_info.phone && !basic_info.email && (!contact.usernames || contact.usernames.length === 0)) {
    return null;
  }

  return (
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
          <div className="flex justify-between items-start py-2 border-b border-border last:border-0">
            <span className="text-sm font-medium text-muted-foreground">用户名</span>
            <span className="text-sm text-foreground">{contact.username}</span>
          </div>
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
  );
};

export default ContactSection;
