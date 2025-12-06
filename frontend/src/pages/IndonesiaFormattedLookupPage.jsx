/**
 * Indonesia Formatted Profile Lookup Page
 * 
 * 使用新的后端代理路由：GET /api/indonesia/profile/formatted?phone=...
 * 提供简单易用的印尼号码查询界面
 */

import React, { useState } from 'react';
import { Search, AlertCircle, Phone, ArrowLeft } from 'lucide-react';
import { Card } from '../components/ui/card';
import { Badge } from '../components/ui/badge';
import IndonesiaProfileResult from '../components/IndonesiaProfileResult_Simple';
import ProfileReport from '../components/ProfileReport';
import { queryIndonesiaPhone } from '../utils/indonesiaFormattedProfileFetcher';
import { transform9999ToProfileReport, is9999DataValid } from '../utils/indonesia9999DataTransformer';

const API_BASE_URL = process.env.REACT_APP_API_URL || 
  (process.env.NODE_ENV === 'production' ? '/api' : 'http://localhost:8000/api');

export default function IndonesiaFormattedLookupPage() {
  const [phoneInput, setPhoneInput] = useState('');
  const [queryResult, setQueryResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [validationError, setValidationError] = useState('');

  // 验证电话号码格式
  const validatePhoneNumber = (phone) => {
    // 移除所有非数字字符
    const cleaned = phone.replace(/\D/g, '');
    
    if (cleaned.length === 0) {
      setValidationError('请输入电话号码');
      return false;
    }
    
    // 检查是否为印尼号码（62 开头或 08 开头）
    let normalizedPhone = cleaned;
    if (cleaned.startsWith('08')) {
      normalizedPhone = '62' + cleaned.substring(1);
    }
    
    if (!normalizedPhone.startsWith('62')) {
      setValidationError('请输入印尼电话号码 (08xxx 或 62xxx 格式)');
      return false;
    }
    
    if (normalizedPhone.length < 10) {
      setValidationError('电话号码格式不正确，至少需要10位数字');
      return false;
    }
    
    if (normalizedPhone.length > 15) {
      setValidationError('电话号码不能超过15位数字');
      return false;
    }
    
    setValidationError('');
    return true;
  };

  // 执行查询
  const handleQuery = async (e) => {
    e.preventDefault();
    
    if (!validatePhoneNumber(phoneInput)) {
      return;
    }

    let cleanedPhone = phoneInput.replace(/\D/g, '');
    // 转换 08 开头为 62 开头
    if (cleanedPhone.startsWith('08')) {
      cleanedPhone = '62' + cleanedPhone.substring(1);
    }
    
    setLoading(true);
    setError('');
    setQueryResult(null);

    try {
      console.log(`🔍 [Frontend] Starting query for: ${cleanedPhone}`);
      
      // 使用新的工具函数调用后端
      const result = await queryIndonesiaPhone(cleanedPhone);
      
      console.log(`📊 [Frontend] Query result:`, result);
      
      if (result && result.success) {
        console.log(`✅ [Frontend] Query succeeded`);
        setQueryResult(result);
      } else {
        console.error(`❌ [Frontend] Query failed:`, result);
        setError(result?.error || '未能获取用户信息，请检查电话号码是否正确');
      }
    } catch (err) {
      console.error('Query error:', err);
      setError(err.message || '查询失败，请重试');
    } finally {
      setLoading(false);
    }
  };

  // 示例电话号码
  const examplePhone = '6281348395025'; // 示例印尼号码
  const loadExample = () => {
    setPhoneInput(examplePhone);
    setValidationError('');
  };

  // 如果有结果，显示结果页面
  if (queryResult) {
    // 检查是否是 9999 API 的数据，如果是则使用 ProfileReport
    if (is9999DataValid(queryResult)) {
      console.log('🎨 [Indonesia] 使用 ProfileReport 渲染 9999 数据');
      const transformedData = transform9999ToProfileReport(queryResult);
      
      return (
        <ProfileReport 
          report={transformedData}
          rawData={queryResult}
          query={phoneInput}
          onBack={() => setQueryResult(null)}
        />
      );
    }
    
    // 否则使用旧的简单结果页面
    console.log('🎨 [Indonesia] 使用 IndonesiaProfileResult 渲染数据');
    return (
      <IndonesiaProfileResult 
        data={queryResult} 
        query={phoneInput} 
        onBack={() => setQueryResult(null)} 
      />
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 py-12 px-4">
      <div className="max-w-4xl mx-auto">
        {/* 标题 */}
        <div className="text-center mb-12">
          <div className="inline-flex items-center justify-center gap-2 mb-4">
            <Phone className="w-8 h-8 text-primary" />
            <h1 className="text-4xl font-bold text-gray-800">
              🇮🇩 印尼号码查询
            </h1>
          </div>
          <p className="text-xl text-gray-600">
            输入印尼电话号码获取详细的个人档案信息（使用新的 API 9999 - 动态渲染）
          </p>
        </div>

        {/* 查询表单 */}
        <Card className="bg-white rounded-xl shadow-lg p-8 mb-8">
          <form onSubmit={handleQuery} className="space-y-6">
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-3">
                📱 印尼电话号码
              </label>
              <div className="flex gap-3">
                <div className="flex-1 relative">
                  <input
                    type="tel"
                    value={phoneInput}
                    onChange={(e) => setPhoneInput(e.target.value)}
                    placeholder="输入印尼电话号码 (例如: 6281348395025 或 08-1348-395025)"
                    className={`w-full px-4 py-3 border rounded-lg focus:outline-none focus:ring-2 transition ${
                      validationError
                        ? 'border-red-500 focus:ring-red-500'
                        : 'border-gray-300 focus:ring-blue-500'
                    }`}
                    disabled={loading}
                  />
                  {validationError && (
                    <p className="text-red-500 text-xs mt-2 flex items-center">
                      <AlertCircle className="w-4 h-4 mr-1" />
                      {validationError}
                    </p>
                  )}
                </div>
                <button
                  type="submit"
                  disabled={loading || !phoneInput.trim()}
                  className="px-6 py-3 bg-blue-600 text-white font-semibold rounded-lg hover:bg-blue-700 transition disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 whitespace-nowrap"
                >
                  <Search className="w-5 h-5" />
                  {loading ? '查询中...' : '查询'}
                </button>
              </div>
            </div>

            {/* 错误提示 */}
            {error && (
              <div className="p-4 bg-red-50 border border-red-200 rounded-lg flex gap-3">
                <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
                <div className="flex-1">
                  <h3 className="font-semibold text-red-800">查询失败</h3>
                  <p className="text-red-700 text-sm mt-1">{error}</p>
                </div>
              </div>
            )}

            {/* 加载状态 */}
            {loading && (
              <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg flex gap-3 items-center">
                <div className="w-5 h-5 border-2 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
                <p className="text-blue-700">正在查询数据，请稍候...</p>
              </div>
            )}

            {/* 示例和提示 */}
            <div className="border-t pt-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-semibold text-gray-700">💡 快速选项</h3>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <button
                  type="button"
                  onClick={loadExample}
                  className="p-4 border border-gray-300 rounded-lg hover:bg-gray-50 transition text-left"
                >
                  <p className="text-sm text-gray-600">示例号码</p>
                  <p className="font-mono font-semibold text-gray-800 mt-1">{examplePhone}</p>
                </button>
                <div className="p-4 border border-gray-300 rounded-lg bg-gray-50">
                  <p className="text-sm text-gray-600">支持格式</p>
                  <p className="text-xs text-gray-700 mt-2">
                    • 08xxxxxxxxx<br/>
                    • 62xxxxxxxxx<br/>
                    • +6281xxxxxxxx
                  </p>
                </div>
              </div>
            </div>
          </form>
        </Card>

        {/* 功能说明 */}
        <Card className="bg-white rounded-xl shadow-lg p-8">
          <h2 className="text-xl font-bold text-gray-800 mb-4">📋 功能说明</h2>
          <div className="space-y-3 text-gray-700">
            <div className="flex gap-3">
              <Badge className="bg-blue-100 text-blue-800 flex-shrink-0 mt-1">API 8888</Badge>
              <p>使用新的格式化档案数据 API 获取更准确的印尼用户信息</p>
            </div>
            <div className="flex gap-3">
              <Badge className="bg-green-100 text-green-800 flex-shrink-0 mt-1">快速响应</Badge>
              <p>专门针对印尼号码优化，查询速度更快、数据更完整</p>
            </div>
            <div className="flex gap-3">
              <Badge className="bg-purple-100 text-purple-800 flex-shrink-0 mt-1">详细档案</Badge>
              <p>获取基本信息、联系方式、职业信息、数据泄露记录等多维度数据</p>
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
}
