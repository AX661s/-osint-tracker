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
    <div className="border border-border/50 rounded-lg p-4 bg-card/20 hover:border-primary/30 transition-all">
      {/* 加载状态 */}
      {loading && (
        <div className="flex items-center gap-3 py-2">
          <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />
          <span className="text-sm text-muted-foreground">查询 Telegram...</span>
        </div>
      )}

      {/* 成功显示 Telegram 账号信息 */}
      {data && !loading && (
        <div className="flex items-start gap-4">
          {/* 头像 */}
          <div className="w-12 h-12 rounded-full overflow-hidden flex-shrink-0 border border-border/50">
            {data.has_photo && data.profile_photo_url ? (
              <img
                src={data.profile_photo_url}
                alt={data.first_name || 'Telegram'}
                className="w-full h-full object-cover"
                onError={(e) => {
                  e.target.style.display = 'none';
                  const fallback = e.target.parentElement.querySelector('.fallback-avatar');
                  if (fallback) fallback.style.display = 'flex';
                }}
              />
            ) : null}
            <div
              className={`fallback-avatar w-full h-full items-center justify-center bg-muted ${!data.has_photo ? 'flex' : 'hidden'}`}
              style={{ display: !data.has_photo ? 'flex' : 'none' }}
            >
              <User className="w-6 h-6 text-muted-foreground" />
            </div>
          </div>

          {/* 信息 */}
          <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between gap-2 mb-1">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <img 
                    src="/api/logo/telegram.org"
                    alt="Telegram"
                    className="w-4 h-4 object-contain flex-shrink-0"
                  />
                  <span className="font-semibold text-foreground">
                    {data.first_name || 'Telegram User'}
                    {data.last_name && ` ${data.last_name}`}
                  </span>
                  {data.is_premium && (
                    <span className="text-xs px-1.5 py-0.5 rounded bg-amber-500/10 text-amber-400 border border-amber-500/20">
                      Premium
                    </span>
                  )}
                </div>
                
                {data.username && (
                  <div className="text-sm text-primary mb-0.5">
                    @{data.username}
                  </div>
                )}
                
                <div className="text-xs text-muted-foreground">
                  {data.phone_number || phoneNumber}
                </div>
              </div>
            </div>

            {/* 链接 */}
            <div className="flex items-center gap-3 mt-2">
              {data.username && (
                <a
                  href={`https://t.me/${data.username}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-xs text-primary hover:text-primary/80 flex items-center gap-1 transition-colors"
                >
                  <ExternalLink className="w-3 h-3" />
                  打开
                </a>
              )}
              {data.has_photo && data.profile_photo_url && (
                <a
                  href={data.profile_photo_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-xs text-muted-foreground hover:text-foreground transition-colors"
                >
                  查看头像
                </a>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default TelegramCard;
