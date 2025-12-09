import React, { useState, useEffect } from 'react';
import { ExternalLink, Phone, Loader2 } from 'lucide-react';

/**
 * WhatsApp Profile Card 组件
 * 使用 Profile Picture API 获取 WhatsApp 头像
 */
const WhatsAppProfileCard = ({ phoneNumber, autoSearch = false }) => {
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
      // 清理电话号码（移除+和其他特殊字符）
      const cleanPhone = phoneNumber.replace(/[^\d]/g, '');
      
      console.log(`📸 [WhatsAppProfileCard] 查询电话号码: ${cleanPhone}`);
      
      const response = await fetch('/api/profile-picture', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ phone: cleanPhone }),
      });

      const result = await response.json();

      console.log(`📸 [WhatsAppProfileCard] 响应:`, result);

      // 检查是否成功获取数据
      if (result.success && result.data?.success) {
        // 账号存在，保存数据（即使没有头像也显示）
        setData(result.data);
        console.log(`✅ [WhatsAppProfileCard] 找到 WhatsApp 账号:`, result.data);
      } else if (result.data?.success === false) {
        // 账号不存在，不显示卡片（不设置error，直接返回null）
        console.log(`ℹ️ [WhatsAppProfileCard] 号码未注册 WhatsApp，不显示卡片`);
        setData(null);
        setError(null);
      } else {
        // 其他错误情况
        setError(result.data?.message || result.message || '查询失败');
        console.log(`❌ [WhatsAppProfileCard] 查询失败`);
      }
    } catch (err) {
      console.error(`❌ [WhatsAppProfileCard] 查询错误:`, err);
      setError(err.message || '查询失败，请稍后重试');
    } finally {
      setLoading(false);
    }
  };

  // 如果没有数据且不在加载中，不显示卡片
  // 注意：不显示错误状态（账号不存在时直接隐藏）
  if (!loading && !data) {
    return null;
  }

  return (
    <div className="border border-border/50 rounded-lg p-4 bg-card/20 hover:border-primary/30 transition-all">
      {/* 加载状态 */}
      {loading && (
        <div className="flex items-center gap-3 py-2">
          <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />
          <span className="text-sm text-muted-foreground">查询 WhatsApp...</span>
        </div>
      )}

      {/* 成功显示 WhatsApp 信息 */}
      {data && !loading && (
        <div className="flex items-start gap-4">
          {/* 头像 */}
          <div className="w-12 h-12 rounded-full overflow-hidden flex-shrink-0 border border-border/50">
            {data.picture_url ? (
              <img
                src={data.picture_url}
                alt="WhatsApp"
                className="w-full h-full object-cover"
                onError={(e) => {
                  e.target.style.display = 'none';
                  const fallback = e.target.parentElement.querySelector('.fallback-avatar');
                  if (fallback) fallback.style.display = 'flex';
                }}
              />
            ) : null}
            <div
              className={`fallback-avatar w-full h-full items-center justify-center bg-muted ${data.picture_url ? 'hidden' : 'flex'}`}
              style={{ display: data.picture_url ? 'none' : 'flex' }}
            >
              <Phone className="w-6 h-6 text-muted-foreground" />
            </div>
          </div>

          {/* 信息 */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <img 
                src="/api/logo/whatsapp.com"
                alt="WhatsApp"
                className="w-4 h-4 object-contain flex-shrink-0"
              />
              <span className="font-semibold text-foreground">
                {data.phone || phoneNumber}
              </span>
            </div>
            
            <div className="text-xs text-muted-foreground mb-2">
              {data.picture_url ? 
                '已找到 WhatsApp 头像' : 
                '账号已注册'
              }
            </div>

            {/* 链接 */}
            <div className="flex items-center gap-3 mt-2">
              {data.phone && (
                <a
                  href={`https://wa.me/${data.phone.replace(/[^\d]/g, '')}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-xs text-primary hover:text-primary/80 flex items-center gap-1 transition-colors"
                >
                  <ExternalLink className="w-3 h-3" />
                  打开
                </a>
              )}
              {data.picture_url && (
                <a
                  href={data.picture_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-xs text-muted-foreground hover:text-foreground transition-colors"
                >
                  查看原图
                </a>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default WhatsAppProfileCard;
