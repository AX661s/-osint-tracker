import React, { useState, useEffect } from 'react';
import { ExternalLink, User, Loader2 } from 'lucide-react';
import { apiClient } from '../utils/secureApiClient';
import { ENDPOINTS } from '../config/api';

/**
 * Telegram 账号卡片组件
 * 使用 Telegram Aggressive API 检测电话号码是否注册了 Telegram
 */
const TelegramCard = ({ phoneNumber, autoSearch = false }) => {
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (autoSearch && phoneNumber) {
      handleLookup();
    }
  }, [phoneNumber, autoSearch]);

  const handleLookup = async () => {
    if (!phoneNumber || !phoneNumber.trim()) {
      setError('请提供有效的电话号码');
      return;
    }

    setLoading(true);
    setError(null);
    setData(null);

    try {
      console.log(`🔍 [TelegramCard] 查询电话号码: ${phoneNumber}`);
      
      const response = await apiClient.post(ENDPOINTS.telegram.aggressive, {
        phone_numbers: [phoneNumber]
      });

      console.log(`📱 [TelegramCard] 响应:`, response);

      if (response.success && response.data?.results?.length > 0) {
        const result = response.data.results[0];
        
        // 检查是否存在 Telegram 账号
        if (result.exists) {
          setData(result);
          console.log(`✅ [TelegramCard] 找到 Telegram 账号:`, result);
        } else {
          setError('该号码未注册 Telegram');
          console.log(`ℹ️ [TelegramCard] 号码未注册 Telegram`);
        }
      } else {
        setError('未找到 Telegram 账号信息');
        console.log(`ℹ️ [TelegramCard] API 返回空结果`);
      }
    } catch (err) {
      console.error(`❌ [TelegramCard] 查询错误:`, err);
      setError(err.message || '查询失败，请稍后重试');
    } finally {
      setLoading(false);
    }
  };

  // 如果没有数据且不在加载中，不显示卡片（除非有错误）
  if (!loading && !data && !error) {
    return null;
  }

  return (
    <div className="glass-card p-6 fade-in-up hover-lift">
      <div className="flex items-center gap-3 mb-4">
        <div className="icon-container" style={{
          background: 'linear-gradient(135deg, rgba(37, 168, 224, 0.2), rgba(33, 150, 243, 0.2))',
          border: '1px solid rgba(37, 168, 224, 0.3)'
        }}>
          <img 
            src="/api/logo/telegram.org"
            alt="Telegram"
            className="w-5 h-5 object-contain"
            onError={(e) => {
              e.target.style.display = 'none';
              e.target.nextElementSibling.style.display = 'block';
            }}
          />
          <Send className="w-5 h-5 text-blue-400" style={{ display: 'none' }} />
        </div>
        <h3 className="text-lg font-bold text-blue-300">Telegram</h3>
      </div>

      {/* 加载状态 */}
      {loading && (
        <div className="flex items-center justify-center py-8">
          <div className="crystal-loader"></div>
          <span className="ml-3 text-sm text-gray-400">正在查询 Telegram...</span>
        </div>
      )}

      {/* 错误状态 */}
      {error && !loading && (
        <div className="info-card-premium p-4 flex items-start gap-3" style={{
          background: 'rgba(239, 68, 68, 0.1)',
          borderColor: 'rgba(239, 68, 68, 0.3)'
        }}>
          <XCircle className="w-5 h-5 text-red-400 flex-shrink-0 mt-0.5" />
          <div>
            <div className="font-semibold text-red-400 mb-1">未找到账号</div>
            <div className="text-sm text-gray-400">{error}</div>
          </div>
        </div>
      )}

      {/* 成功显示 Telegram 账号信息 */}
      {data && !loading && (
        <div className="social-card p-4 fade-in-up">
          <div className="flex items-start gap-4">
            {/* 头像 */}
            <div className="social-avatar" style={{ width: '80px', height: '80px' }}>
              {data.has_photo && data.profile_photo_url ? (
                <img
                  src={data.profile_photo_url}
                  alt={data.first_name || 'Telegram User'}
                  className="w-full h-full object-cover"
                  onError={(e) => {
                    e.target.style.display = 'none';
                    const fallback = e.target.parentElement.querySelector('.fallback-icon');
                    if (fallback) fallback.style.display = 'flex';
                  }}
                />
              ) : null}
              <div
                className={`fallback-icon w-full h-full items-center justify-center bg-gradient-to-br from-blue-500/20 to-cyan-500/20 ${!data.has_photo ? 'flex' : 'hidden'}`}
                style={{ display: !data.has_photo ? 'flex' : 'none' }}
              >
                <User className="w-8 h-8 text-blue-400/60" />
              </div>
            </div>

            {/* 信息 */}
            <div className="flex-1">
              <div className="flex items-start justify-between mb-2">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1 flex-wrap">
                    {/* 姓名 */}
                    <span className="font-bold text-blue-300 text-lg">
                      {data.first_name || 'Telegram User'}
                      {data.last_name && ` ${data.last_name}`}
                    </span>
                    
                    {/* 已验证标识 */}
                    <span className="premium-badge badge-success text-xs">
                      <CheckCircle className="w-3 h-3" /> 已注册
                    </span>
                    
                    {/* Premium 标识 */}
                    {data.is_premium && (
                      <span className="premium-badge text-xs" style={{
                        background: 'linear-gradient(135deg, rgba(255, 215, 0, 0.2), rgba(255, 193, 7, 0.2))',
                        borderColor: 'rgba(255, 215, 0, 0.4)'
                      }}>
                        <Crown className="w-3 h-3 text-yellow-400" /> Premium
                      </span>
                    )}
                  </div>
                  
                  {/* 用户名 */}
                  {data.username && (
                    <div className="text-sm text-cyan-400 mb-1">
                      @{data.username}
                    </div>
                  )}
                  
                  {/* 电话号码 */}
                  <div className="text-sm text-gray-400">
                    {data.phone_number || phoneNumber}
                  </div>
                </div>
              </div>

              {/* Telegram 标识和链接 */}
              <div className="flex items-center gap-2 mt-3 flex-wrap">
                <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg" style={{
                  background: 'rgba(37, 168, 224, 0.15)',
                  border: '1px solid rgba(37, 168, 224, 0.3)'
                }}>
                  <div className="w-2 h-2 rounded-full bg-blue-400 animate-pulse"></div>
                  <span className="text-xs font-semibold text-blue-400">Telegram</span>
                </div>
                
                {/* 用户ID */}
                {data.user_id && (
                  <div className="text-xs text-gray-500">
                    ID: {data.user_id}
                  </div>
                )}
                
                {/* Telegram 链接 */}
                {data.username && (
                  <a
                    href={`https://t.me/${data.username}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-xs text-cyan-400 hover:text-cyan-300 underline flex items-center gap-1"
                  >
                    <Send className="w-3 h-3" />
                    打开 Telegram
                  </a>
                )}
                
                {/* 头像链接 */}
                {data.has_photo && data.profile_photo_url && (
                  <a
                    href={data.profile_photo_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-xs text-cyan-400 hover:text-cyan-300 underline"
                  >
                    查看头像
                  </a>
                )}
              </div>

              {/* Bot 标识 */}
              {data.is_bot && (
                <div className="mt-3 px-3 py-1.5 rounded-lg inline-flex items-center gap-2" style={{
                  background: 'rgba(156, 163, 175, 0.15)',
                  border: '1px solid rgba(156, 163, 175, 0.3)'
                }}>
                  <span className="text-xs font-semibold text-gray-400">🤖 Bot 账号</span>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default TelegramCard;
