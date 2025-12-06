/**
 * App.js - 重构版本
 * 使用统一的 QueryService，消除所有重复代码
 */

import React, { useState, useEffect } from 'react';
import { Shield } from 'lucide-react';
import LoginPage from './components/LoginPage';
import SearchPage from './components/SearchPage';
import ResultsPage from './components/ResultsPage';
import ResultsPageDemo from './components/ResultsPageDemo';
import IndonesiaProfileResult_Simple from './components/IndonesiaProfileResult_Simple';
import USProfileResult from './components/USProfileResult';
import AdminPage from './components/AdminPage';
import ComprehensivePhoneLookupPage from './pages/ComprehensivePhoneLookupPage';
import IndonesiaFormattedLookupPage from './pages/IndonesiaFormattedLookupPage';
import ProfileReport from './components/ProfileReport';
import ErrorBoundary from './components/ErrorBoundary';
import { ThemeProvider } from './contexts/ThemeContext';
import { Toaster } from './components/ui/sonner';

// ✅ 使用新的统一服务和配置
import { queryService } from './services/QueryService';
import { apiClient } from './utils/secureApiClient';
import { QUERY_TYPES, PAGE_TYPES, ENDPOINTS } from './config/api';

function AppContent() {
  // 状态管理
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [sessionToken, setSessionToken] = useState(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [userId, setUserId] = useState(null);
  const [username, setUsername] = useState(null);
  const [points, setPoints] = useState(0);
  const [searchResults, setSearchResults] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [currentPage, setCurrentPage] = useState(PAGE_TYPES.SEARCH);
  // 🔥 新增：根据用户选择的国旗来决定显示哪个结果页
  const [phoneRegion, setPhoneRegion] = useState(null);

  // 从 localStorage 恢复会话
  useEffect(() => {
    const savedToken = localStorage.getItem('session_token');
    const savedIsAdmin = localStorage.getItem('is_admin') === 'true';
    const savedUserId = localStorage.getItem('user_id');
    const savedUsername = localStorage.getItem('username');
    const savedPoints = parseInt(localStorage.getItem('points') || '0', 10);
    
    if (savedToken) {
      verifySessionToken(savedToken, savedIsAdmin, savedUserId, savedUsername, savedPoints);
    }
  }, []);

  // 验证会话
  const verifySessionToken = async (token, isAdminVal, userId, username, savedPoints = 0) => {
    try {
      const data = await apiClient.post(ENDPOINTS.auth.verify, { 
        session_token: token 
      });
      
      if (data.valid) {
        setIsAuthenticated(true);
        setSessionToken(token);
        setIsAdmin(data.is_admin || isAdminVal);
        setUserId(data.user_id || userId);
        setUsername(data.username || username);
        setPoints(data.points || savedPoints);
      }
    } catch (error) {
      console.error('Session verification error:', error);
    }
  };

  // 登录处理
  const handleLogin = (loginData) => {
    localStorage.setItem('session_token', loginData.session_token);
    localStorage.setItem('user_id', loginData.user_id);
    localStorage.setItem('username', loginData.username);
    localStorage.setItem('is_admin', loginData.is_admin);
    localStorage.setItem('points', loginData.points || 0);
    
    setIsAuthenticated(true);
    setSessionToken(loginData.session_token);
    setUserId(loginData.user_id);
    setUsername(loginData.username);
    setIsAdmin(loginData.is_admin);
    setPoints(loginData.points || 0);
    setCurrentPage(PAGE_TYPES.SEARCH);
  };

  // 登出处理
  const handleLogout = () => {
    localStorage.clear();
    setIsAuthenticated(false);
    setSessionToken(null);
    setUserId(null);
    setUsername(null);
    setIsAdmin(false);
    setPoints(0);
    setSearchResults(null);
    setCurrentPage(PAGE_TYPES.SEARCH);
  };

  // ✅ 重构后的搜索处理 - 简洁清晰，只调用一次API
  const handleSearch = async (query, filters) => {
    setSearchQuery(query);
    setIsLoading(true);
    setCurrentPage(PAGE_TYPES.LOADING);
    
    // 🔥 根据用户选择的国旗设置 phoneRegion（用于决定显示哪个结果页）
    if (filters?.dialCode === '62') {
      setPhoneRegion('indonesia');
      console.log('🇮🇩 [App] 用户选择印尼国旗 (+62)，将显示印尼结果页');
    } else if (filters?.dialCode === '1') {
      setPhoneRegion('us');
      console.log('🇺🇸 [App] 用户选择美国国旗 (+1)，将显示美国结果页');
    } else if (filters?.dialCode) {
      setPhoneRegion('other');
      console.log(`🌍 [App] 用户选择其他国家 (+${filters.dialCode})`);
    } else {
      setPhoneRegion(null);
    }
    
    try {
      console.log(`🔍 [App] Starting search for: ${query}`);
      
      // ✅ 使用统一的查询服务 - 只调用一次API
      const result = await queryService.query(query, {
        searchType: filters?.searchType || QUERY_TYPES.AUTO,
        sessionToken,
        useCache: true
      });
      
      console.log(`✅ [App] Query successful, type: ${result.queryType}`);
      
      // ✅ 设置结果和对应的页面类型
      setSearchResults(result);
      setCurrentPage(result.pageType);
      
      // ✅ 刷新用户积分（查询可能扣除积分）
      if (sessionToken) {
        await refreshUserPoints();
      }
      
    } catch (error) {
      console.error('❌ [App] Search error:', error);
      alert(error.message || 'Search failed. Please try again.');
      setCurrentPage(PAGE_TYPES.SEARCH);
    } finally {
      setIsLoading(false);
    }
  };

  // ✅ 刷新用户积分
  const refreshUserPoints = async () => {
    try {
      const result = await apiClient.post(ENDPOINTS.auth.verify, {
        session_token: sessionToken
      });
      
      if (result.valid && result.points !== undefined) {
        setPoints(result.points);
        localStorage.setItem('points', result.points);
      }
    } catch (error) {
      console.error('Failed to refresh points:', error);
    }
  };

  // 页面导航处理
  const handleBack = () => {
    setSearchResults(null);
    setSearchQuery('');
    setCurrentPage(PAGE_TYPES.SEARCH);
  };

  const handleAdminClick = () => {
    if (isAdmin) {
      setCurrentPage(PAGE_TYPES.ADMIN);
    }
  };

  const handleDemo = () => {
    setCurrentPage(PAGE_TYPES.DEMO);
  };

  const handleComprehensiveSearch = () => {
    setCurrentPage(PAGE_TYPES.COMPREHENSIVE);
  };

  const handleIndonesiaFormattedSearch = () => {
    setCurrentPage(PAGE_TYPES.INDONESIA_FORMATTED);
  };

  // 🎯 智能检测号码类型（印尼 vs 美国/其他）
  const detectPhoneRegion = (query) => {
    if (!query) return 'other';
    const digits = query.replace(/\D/g, '');
    // 检测印尼号码（以 62 开头）
    if (digits.startsWith('62')) {
      return 'indonesia';
    }
    // 检测美国号码（以 1 开头，或者是 10 位数字）
    if (digits.startsWith('1') || digits.length === 10) {
      return 'us';
    }
    return 'other';
  };

  // 未登录显示登录页
  if (!isAuthenticated) {
    return <LoginPage onLogin={handleLogin} />;
  }

  // 根据当前页面渲染对应组件
  return (
    <div className="min-h-screen bg-background cyber-grid">
      {currentPage === PAGE_TYPES.ADMIN && isAdmin ? (
        <AdminPage 
          onBack={handleBack} 
          onLogout={handleLogout} 
          username={username}
          sessionToken={sessionToken}
          userId={userId}
        />
      ) : currentPage === PAGE_TYPES.COMPREHENSIVE ? (
        <ComprehensivePhoneLookupPage />
      ) : currentPage === PAGE_TYPES.INDONESIA_FORMATTED ? (
        <IndonesiaProfileResult_Simple 
          data={searchResults}
          query={searchQuery}
          onBack={handleBack}
        />
      ) : currentPage === PAGE_TYPES.INDONESIA_PROFILE ? (
        // 🔥 根据用户选择的国旗来决定显示哪个结果页（phoneRegion 优先，detectPhoneRegion 作为回退）
        (() => {
          const region = phoneRegion || detectPhoneRegion(searchQuery);
          console.log(`🎯 [App] INDONESIA_PROFILE 路由决策: phoneRegion=${phoneRegion}, detectPhoneRegion=${detectPhoneRegion(searchQuery)}, 最终region=${region}`);
          if (region === 'indonesia') {
            console.log('🇮🇩 [App] 渲染 IndonesiaProfileResult_Simple 组件');
            return (
              <IndonesiaProfileResult_Simple 
                data={searchResults}
                query={searchQuery}
                onBack={handleBack}
              />
            );
          } else {
            console.log('🇺🇸 [App] 渲染 USProfileResult 组件');
            return (
              <USProfileResult 
                data={searchResults}
                query={searchQuery}
                onBack={handleBack}
                platformResults={searchResults}
              />
            );
          }
        })()
      ) : currentPage === PAGE_TYPES.LOADING && isLoading ? (
        <div className="fixed inset-0 bg-background/95 backdrop-blur-sm z-50 flex items-center justify-center">
          <div className="text-center space-y-6">
            <div className="relative inline-block">
              <div className="w-20 h-20 border-4 border-primary/30 border-t-primary rounded-full animate-spin"></div>
              <div className="absolute inset-0 flex items-center justify-center">
                <Shield className="w-10 h-10 text-primary animate-pulse" />
              </div>
            </div>
            <div className="space-y-2">
              <h2 className="text-2xl font-bold text-foreground">正在查询中...</h2>
              <p className="text-muted-foreground">
                OSINT API 正在处理您的请求，这可能需要 1-2 分钟
              </p>
              <p className="text-sm text-muted-foreground/70 font-mono">
                请耐心等待，请勿关闭页面
              </p>
            </div>
          </div>
        </div>
      ) : currentPage === PAGE_TYPES.DEMO ? (
        <ResultsPageDemo onBack={handleBack} />
      ) : currentPage === PAGE_TYPES.PROFILE_REPORT ? (
        <ProfileReport 
          rawData={searchResults}
          query={searchQuery}
          onBack={handleBack}
        />
      ) : !searchResults ? (
        <SearchPage 
          onSearch={handleSearch} 
          isAdmin={isAdmin}
          onAdminClick={handleAdminClick}
          onComprehensiveSearch={handleComprehensiveSearch}
          onLogout={handleLogout}
          username={username}
          points={points}
        />
      ) : (
        <ResultsPage 
          results={searchResults} 
          query={searchQuery}
          onBack={handleBack}
          isAdmin={isAdmin}
          onAdminClick={handleAdminClick}
        />
      )}
    </div>
  );
}

export default function App() {
  return (
    <ThemeProvider>
      <Toaster />
      <ErrorBoundary>
        <AppContent />
      </ErrorBoundary>
    </ThemeProvider>
  );
}
