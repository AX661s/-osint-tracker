import React, { useState, useEffect, useCallback } from 'react';
import { Search, Shield, Database, Filter, Zap, Phone, Mail, User, Settings, Wallet, LogOut, Globe } from 'lucide-react';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Badge } from './ui/badge';
import { Card } from './ui/card';
import { Checkbox } from './ui/checkbox';
import ThemeSwitcher from './ThemeSwitcher';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from './ui/select';
import { toast } from 'sonner';
import CountryFlagSelect from './CountryFlagSelect';

export const SearchPage = ({ onSearch, isAdmin, onAdminClick, onComprehensiveSearch, onLogout, username, points = 0 }) => {
  const [query, setQuery] = useState('');
  const [searchType, setSearchType] = useState('username');
  const [platform, setPlatform] = useState('all');
  const [isSearching, setIsSearching] = useState(false);
  const [agreedToTerms, setAgreedToTerms] = useState(true);
  // 手机搜索时使用的国码（默认印尼 +62）
  const [dialCode, setDialCode] = useState('62');

  // 按国家自动格式化本地手机号输入（不影响提交时的规范化）
  const formatNationalInput = useCallback((raw) => {
    if (!raw) return '';
    // 若用户直接输入国际格式（以 + 开头），保持原样（仅移除多余空格）
    if (raw.startsWith('+')) return raw.replace(/\s+/g, '');
    const digits = raw.replace(/[^\d]/g, '');
    // 美国/加拿大： (XXX) XXX-XXXX （逐步格式化）
    if (dialCode === '1') {
      const a = digits.slice(0, 3);
      const b = digits.slice(3, 6);
      const c = digits.slice(6, 10);
      if (digits.length <= 3) return a;
      if (digits.length <= 6) return `(${a}) ${b}`;
      return `(${a}) ${b}-${c}`;
    }
    // 中国大陆： 3-4-4 分组（逐步格式化）
    if (dialCode === '86') {
      const a = digits.slice(0, 3);
      const b = digits.slice(3, 7);
      const c = digits.slice(7, 11);
      if (digits.length <= 3) return a;
      if (digits.length <= 7) return `${a} ${b}`;
      return `${a} ${b} ${c}`;
    }
    // 印尼： 4-4-4 或 3-4-4 分组（逐步格式化）
    if (dialCode === '62') {
      const a = digits.slice(0, 3);
      const b = digits.slice(3, 7);
      const c = digits.slice(7, 11);
      if (digits.length <= 3) return a;
      if (digits.length <= 7) return `${a}-${b}`;
      return `${a}-${b}-${c}`;
    }
    // 其他国家：简单每 3 位分组显示
    return digits.replace(/(\d{3})(?=\d)/g, '$1 ');
  }, [dialCode]);

  // 构造 E.164 预览（仅本地格式输入时使用）
  const buildE164Preview = (raw) => {
    const nationalDigits = (raw || '').replace(/[^\d]/g, '');
    const trimmed = nationalDigits.replace(/^0+/, '');
    if (!trimmed) return '';
    return `+${dialCode}${trimmed}`;
  };

  // 在国码或搜索类型切换时，重新应用本地格式化（仅在手机号搜索且非 + 开头时）
  useEffect(() => {
    setQuery((prev) => {
      if (searchType === 'phone' && prev && !prev.startsWith('+')) {
        return formatNationalInput(prev);
      }
      return prev;
    });
  }, [dialCode, searchType, formatNationalInput]);

  const handleSubmit = (e) => {
    e.preventDefault();
    const trimmedQuery = query.trim();
    if (!trimmedQuery) {
      toast.error('请输入查询内容');
      return;
    }
    if (!agreedToTerms) {
      toast.error('请同意《使用条款》');
      return;
    }
    
    // 🇮🇩 检测印尼号码 (+62 或 08 开头)
    if (searchType === 'phone' && dialCode === '62') {
      console.log('🇮🇩 [Frontend] 检测到印尼号码，直接调用印尼API');
      
      // 格式化印尼号码
      let indonesiaPhone = trimmedQuery;
      if (trimmedQuery.startsWith('+')) {
        indonesiaPhone = trimmedQuery.substring(1); // 移除 +
      } else {
        // 本地格式 (08xxx)，转换为 62xxx
        const digits = trimmedQuery.replace(/[^\d]/g, '');
        if (digits.startsWith('0')) {
          indonesiaPhone = '62' + digits.substring(1);
        } else if (digits.startsWith('62')) {
          // 已经有 62 前缀
          indonesiaPhone = digits;
        } else {
          // 没有 0 也没有 62 前缀，添加 62
          indonesiaPhone = '62' + digits;
        }
      }
      
      console.log(`🇮🇩 [Frontend] 印尼号码格式化为: ${indonesiaPhone}`);
      
      // 直接调用印尼查询（通过特殊的 searchType）
      onSearch(indonesiaPhone, { searchType: 'indonesia_phone', platform });
      return;
    }
    
    setIsSearching(true);
    toast.success('正在发起深度扫描...');
    setTimeout(() => {
      // 对手机搜索进行 E.164 规范化：若未带 + 则加上所选国码
      let finalQuery = trimmedQuery;
      if (searchType === 'phone') {
        const startsWithPlus = trimmedQuery.startsWith('+');
        if (!startsWithPlus) {
          const nationalDigits = trimmedQuery.replace(/[^\d]/g, '');
          const trimmed = nationalDigits.replace(/^0+/, '');
          finalQuery = `+${dialCode}${trimmed}`;
        } else {
          finalQuery = trimmedQuery.replace(/\s+/g, '');
        }
      }
      onSearch(finalQuery, { searchType, platform });
      setIsSearching(false);
    }, 800);
  };

  // Search type icons
  const searchTypes = [
    { icon: Phone, label: 'Phone', value: 'phone', isNew: false },
    { icon: Mail, label: 'Email', value: 'email', isNew: true },
    { icon: User, label: 'Username', value: 'username', isNew: false },
    { icon: Wallet, label: 'Wallet', value: 'wallet', isNew: true },
    { icon: Shield, label: 'ID', value: 'id', isNew: false },
  ];

  return (
    <div className="min-h-screen flex flex-col">
      {/* Header */}
      <header className="border-b border-border/50 backdrop-blur-sm bg-background/80 sticky top-0 z-50">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="relative">
                <Shield className="w-8 h-8 text-primary" />
                <div className="absolute inset-0 blur-lg bg-primary/30"></div>
              </div>
              <div>
                <h1 className="text-2xl font-bold tracking-tight">
                  <span className="bg-gradient-to-r from-primary via-secondary to-accent bg-clip-text text-transparent">
                    OSINT
                  </span>
                  <span className="text-foreground ml-2">Tracker</span>
                </h1>
                <p className="text-xs text-muted-foreground font-mono">Digital Footprint Intelligence</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <Badge variant="outline" className="border-primary/30 text-primary pulse-glow">
                <div className="w-2 h-2 rounded-full bg-primary mr-2 animate-pulse"></div>
                System Active
              </Badge>
              <span className="text-sm text-muted-foreground">用户: {username}</span>
              <Badge variant="secondary" className="bg-amber-900/30 text-amber-300 border border-amber-700/50">
                💰 积分: {points}
              </Badge>
              {isAdmin && (
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={onAdminClick}
                  className="gap-2 border-primary/50 hover:border-primary hover:bg-primary/10"
                >
                  <Settings className="w-4 h-4" />
                  管理
                </Button>
              )}
              {/* 印尼查询按钮已移除 */}
              {/* 综合查询按钮已移除 */}
              {/* 演示按钮已移除 */}
              <Button 
                variant="ghost" 
                size="sm" 
                onClick={onLogout}
                className="gap-2 hover:bg-destructive/10 hover:text-destructive"
              >
                <LogOut className="w-4 h-4" />
                登出
              </Button>
              <ThemeSwitcher />
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 flex items-center justify-center px-4 py-12">
        <div className="w-full max-w-4xl space-y-8">
          {/* Hero Section */}
          <div className="text-center space-y-4 mb-8">
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 border border-primary/20 mb-4">
              <Zap className="w-4 h-4 text-primary" />
              <span className="text-sm font-medium text-primary">Advanced Intelligence Platform</span>
            </div>
            <h2 className="text-5xl sm:text-6xl lg:text-7xl font-bold tracking-tight leading-tight">
              Uncover Digital
              <br />
              <span className="bg-gradient-to-r from-primary via-secondary to-accent bg-clip-text text-transparent">
                Footprints
              </span>
            </h2>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto leading-relaxed">
              Deep scan across multiple platforms to discover digital traces, social profiles, and online presence.
            </p>
          </div>

          {/* Search Type Icons */}
          <div className="flex justify-center items-center gap-4 mb-6 flex-wrap mx-auto w-fit">
            {searchTypes.map((type, idx) => {
              const Icon = type.icon;
              const isActive = searchType === type.value;
              return (
                <button
                  key={idx}
                  onClick={() => setSearchType(type.value)}
                  className={`relative group flex flex-col items-center gap-2 p-4 rounded-xl border-2 transition-all duration-300 w-24 ${
                    isActive
                      ? 'border-primary bg-primary/10 scale-105'
                      : 'border-border/50 hover:border-primary/50 hover:bg-primary/5'
                  }`}
                >
                  {/* NEW Badge */}
                  {type.isNew && (
                    <div className="absolute -top-2 -right-2 bg-gradient-to-r from-purple-600 to-purple-500 text-white text-xs font-bold px-2 py-1 rounded shadow-lg">
                      NEW
                    </div>
                  )}
                  
                  <Icon
                    className={`w-6 h-6 transition-colors ${
                      isActive ? 'text-primary' : 'text-muted-foreground group-hover:text-primary'
                    }`}
                  />
                  <span
                    className={`text-xs font-medium transition-colors ${
                      isActive ? 'text-primary' : 'text-muted-foreground group-hover:text-foreground'
                    }`}
                  >
                    {type.label}
                  </span>
                </button>
              );
            })}
          </div>

          {/* Search Form */}
          <Card className="relative overflow-hidden border-primary/20 glow-border scan-effect">
            <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent to-accent/5"></div>
            <div className="relative p-8 space-y-6">
              <form onSubmit={handleSubmit} className="space-y-6">
                {/* Main Search Input */}
                <div className="relative flex items-center gap-2">
                  {/* 国旗选择器（仅在手机搜索时显示） */}
                  {searchType === 'phone' && (
                    <CountryFlagSelect value={dialCode} onChange={setDialCode} />
                  )}

                  <div className="flex-1 relative group">
                    <Input
                      type="text"
                      placeholder={searchType === 'phone' ? '输入国内手机号（自动加国码并格式化）' : 'Enter phone, email, username, name or wallet...'}
                      value={query}
                      onChange={(e) => {
                        const raw = e.target.value;
                        if (searchType === 'phone') {
                          setQuery(formatNationalInput(raw));
                        } else {
                          setQuery(raw);
                        }
                      }}
                      className="h-16 text-lg bg-background/50 border-border/50 focus:border-primary/50 transition-all pl-5 pr-24"
                    />
                    {/* Settings icon in input */}
                    <button
                      type="button"
                      className="absolute right-14 top-1/2 -translate-y-1/2 p-2 rounded-lg hover:bg-muted transition-colors"
                    >
                      <Settings className="w-5 h-5 text-muted-foreground hover:text-primary transition-colors" />
                    </button>
                  </div>

                  {/* 本地号输入的 E.164 预览提示 */}
                  {searchType === 'phone' && (
                    <div className="absolute left-0 -bottom-6 text-xs text-muted-foreground font-mono">
                      {query ? (
                        query.startsWith('+') ? (
                          <span>国际格式：{query.replace(/\s+/g, '')}</span>
                        ) : (
                          <span>将以：{buildE164Preview(query)}</span>
                        )
                      ) : (
                        <span>只需输入国内号，系统自动加 +{dialCode}</span>
                      )}
                    </div>
                  )}

                  {/* Search Button */}
                  <Button
                    type="submit"
                    size="lg"
                    className="h-16 px-8 bg-gradient-to-r from-primary via-secondary to-accent hover:opacity-90 transition-all shadow-lg hover:shadow-primary/50"
                    disabled={isSearching}
                  >
                    {isSearching ? (
                      <div className="w-5 h-5 border-2 border-primary-foreground/30 border-t-primary-foreground rounded-full animate-spin"></div>
                    ) : (
                      <Search className="w-6 h-6" />
                    )}
                  </Button>
                </div>

                {/* Terms Checkbox */}
                <div className="flex items-center gap-2 justify-center">
                  <Checkbox
                    id="terms"
                    checked={agreedToTerms}
                    onCheckedChange={setAgreedToTerms}
                    className="border-border data-[state=checked]:bg-primary data-[state=checked]:border-primary"
                  />
                  <label htmlFor="terms" className="text-sm text-muted-foreground cursor-pointer">
                    选择搜索即表示你同意我们的{' '}
                    <a href="#" className="text-primary hover:underline">
                      使用条款
                    </a>
                  </label>
                </div>

                {/* Advanced Filters (collapsible) */}
                <details className="group">
                  <summary className="cursor-pointer text-sm font-medium text-primary flex items-center gap-2 hover:text-primary/80 transition-colors">
                    <Filter className="w-4 h-4" />
                    Advanced Filters
                    <span className="ml-auto text-muted-foreground group-open:rotate-180 transition-transform">▼</span>
                  </summary>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4 pt-4 border-t border-border/50">
                    <div className="space-y-2">
                      <label className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                        <Globe className="w-4 h-4" />
                        Platform
                      </label>
                      <Select value={platform} onValueChange={setPlatform}>
                        <SelectTrigger className="bg-background/50 border-border/50">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all">All Platforms</SelectItem>
                          <SelectItem value="social">Social Media</SelectItem>
                          <SelectItem value="professional">Professional</SelectItem>
                          <SelectItem value="coding">Coding/Dev</SelectItem>
                          <SelectItem value="forum">Forums</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-2">
                      <label className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                        <Database className="w-4 h-4" />
                        Scan Depth
                      </label>
                      <Select defaultValue="deep">
                        <SelectTrigger className="bg-background/50 border-border/50">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="quick">Quick Scan</SelectItem>
                          <SelectItem value="standard">Standard</SelectItem>
                          <SelectItem value="deep">Deep Scan</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                </details>
              </form>
            </div>
          </Card>

          {/* Stats */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {[
              { label: 'Platforms', value: '50+', icon: Globe },
              { label: 'Records', value: '2.5B+', icon: Database },
              { label: 'Speed', value: '<2s', icon: Zap },
              { label: 'Success', value: '99.8%', icon: Shield },
            ].map((stat, idx) => (
              <Card key={idx} className="p-4 text-center border-border/50 bg-card/50 hover:border-primary/30 transition-all">
                <stat.icon className="w-6 h-6 mx-auto mb-2 text-primary" />
                <div className="text-2xl font-bold text-foreground mb-1">{stat.value}</div>
                <div className="text-xs text-muted-foreground">{stat.label}</div>
              </Card>
            ))}
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-border/50 py-6">
        <div className="container mx-auto px-4 text-center text-sm text-muted-foreground">
          <p className="font-mono">Powered by Advanced Intelligence Algorithms • Secure • Encrypted • Real-time</p>
        </div>
      </footer>
    </div>
  );
};

export default SearchPage;
