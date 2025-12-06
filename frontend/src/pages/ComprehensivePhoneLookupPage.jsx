import React, { useState } from 'react';
import { Search, AlertCircle } from 'lucide-react';
import ComprehensiveProfileResult from '../components/ComprehensiveProfileResult';

/**
 * 综合电话查询页面
 * 允许用户输入电话号码获取完整的个人档案
 */
export default function ComprehensivePhoneLookupPage() {
  const [phoneInput, setPhoneInput] = useState('');
  const [queryResult, setQueryResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [validationError, setValidationError] = useState('');

  // 修复 API 基础 URL
  const API_BASE_URL = (process.env.REACT_APP_API_URL || (process.env.NODE_ENV === 'production' ? '/api' : 'http://localhost:8000/api'));

  // 验证电话号码格式
  const validatePhoneNumber = (phone) => {
    // 移除所有非数字字符
    const cleaned = phone.replace(/\D/g, '');
    
    if (cleaned.length === 0) {
      setValidationError('请输入电话号码');
      return false;
    }
    
    if (cleaned.length < 10) {
      setValidationError('电话号码至少需要10位数字');
      return false;
    }
    
    if (cleaned.length > 15) {
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

    const cleanedPhone = phoneInput.replace(/\D/g, '');
    
    setLoading(true);
    setError('');
    setQueryResult(null);

    try {
      const response = await fetch(`${API_BASE_URL}/phone/comprehensive`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          phone: cleanedPhone
        }),
        credentials: 'include', // 发送 cookies 用于会话
      });

      if (!response.ok) {
        throw new Error(`API 返回错误: ${response.status}`);
      }

      const data = await response.json();
      
      if (data.success) {
        setQueryResult(data);
      } else {
        setError(data.error || '未能获取用户信息，请检查电话号码是否正确');
      }
    } catch (err) {
      console.error('查询错误:', err);
      setError(err.message || '查询失败，请重试');
    } finally {
      setLoading(false);
    }
  };

  // 示例电话号码
  const examplePhone = '14126704024';
  const loadExample = () => {
    setPhoneInput(examplePhone);
  };

  // 如果有结果，显示结果页面
  if (queryResult) {
    return (
      <ComprehensiveProfileResult 
        data={queryResult} 
        query={phoneInput} 
        onBack={() => setQueryResult(null)} 
      />
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 py-12 px-4">
      <div className="max-w-6xl mx-auto">
        {/* 标题 */}
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold text-gray-800 mb-3">
            🔍 综合电话查询
          </h1>
          <p className="text-xl text-gray-600">
            输入电话号码获取详细的个人档案信息
          </p>
        </div>

        {/* 查询表单 */}
        <div className="bg-white rounded-xl shadow-lg p-8 mb-8">
          <form onSubmit={handleQuery} className="space-y-6">
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-3">
                📱 电话号码
              </label>
              <div className="flex gap-3">
                <div className="flex-1 relative">
                  <input
                    type="tel"
                    value={phoneInput}
                    onChange={(e) => setPhoneInput(e.target.value)}
                    placeholder="输入电话号码 (例如: +1-412-670-4024 或 14126704024)"
                    className={`w-full px-4 py-3 border rounded-lg focus:outline-none focus:ring-2 transition ${
                      validationError
                        ? 'border-red-500 focus:ring-red-500'
                        : 'border-gray-300 focus:ring-primary'
                    }`}
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
                  className="px-6 py-3 bg-primary text-white font-semibold rounded-lg hover:bg-primary-dark transition disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                >
                  <Search className="w-5 h-5" />
                  查询
                </button>
              </div>
            </div>

            {/* 帮助文本 */}
            <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg text-sm text-blue-800">
              <p className="mb-2">💡 <strong>提示:</strong></p>
              <ul className="list-disc list-inside space-y-1">
                <li>支持多种格式: +1-412-670-4024, (412) 670-4024, 14126704024</li>
                <li>电话号码必须至少10位数字</li>
                <li>不支持座机号码，仅支持移动电话</li>
              </ul>
              <button
                type="button"
                onClick={loadExample}
                className="mt-3 text-blue-600 hover:text-blue-800 font-medium text-sm"
              >
                📌 加载示例电话
              </button>
            </div>
          </form>
        </div>

        {/* 错误信息 */}
        {error && (
          <div className="mb-8 p-4 bg-red-50 border border-red-300 rounded-lg text-red-800 flex items-start">
            <AlertCircle className="w-5 h-5 mr-3 mt-0.5 flex-shrink-0" />
            <div>
              <p className="font-semibold">查询失败</p>
              <p className="text-sm mt-1">{error}</p>
            </div>
          </div>
        )}

        {/* 加载状态 */}
        {loading && (
          <div className="mt-12 flex flex-col items-center justify-center py-12">
            <div className="animate-spin rounded-full h-16 w-16 border-4 border-blue-200 border-t-blue-600 mb-4"></div>
            <p className="text-gray-600 font-medium">正在全网搜集情报，请稍候...</p>
            <p className="text-gray-400 text-sm mt-2">这可能需要 15-30 秒</p>
          </div>
        )}

        {/* 空状态 */}
        {!loading && !queryResult && !error && (
          <div className="bg-white rounded-xl shadow-lg p-12 text-center">
            <div className="text-6xl mb-4">📞</div>
            <h2 className="text-2xl font-semibold text-gray-700 mb-2">
              准备好查询了吗？
            </h2>
            <p className="text-gray-600 mb-6">
              输入一个电话号码获取完整的个人档案信息，包括联系方式、地址、职业、财务信息等
            </p>
            <button
              onClick={loadExample}
              className="inline-block px-6 py-2 bg-blue-100 text-blue-700 rounded-lg hover:bg-blue-200 transition font-medium"
            >
              试试示例电话
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
