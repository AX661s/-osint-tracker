import React, { useState, useEffect } from 'react';
import { Phone, Image as ImageIcon, CheckCircle, XCircle, Loader2 } from 'lucide-react';
import { apiClient } from '../utils/secureApiClient';
import './ProfileResultStyles.css';
import './CrystalEnhancements.css';

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
    <div className="glass-card p-6 fade-in-up hover-lift">
      <div className="flex items-center gap-3 mb-4">
        <div className="icon-container" style={{
          background: 'linear-gradient(135deg, rgba(0, 230, 115, 0.2), rgba(0, 200, 100, 0.2))',
          border: '1px solid rgba(0, 230, 115, 0.3)'
        }}>
          <Phone className="w-5 h-5 text-green-400" />
        </div>
        <h3 className="text-lg font-bold text-green-300">WhatsApp</h3>
      </div>

      {/* 加载状态 */}
      {loading && (
        <div className="flex items-center justify-center py-8">
          <div className="crystal-loader"></div>
          <span className="ml-3 text-sm text-gray-400">正在查询 WhatsApp 头像...</span>
        </div>
      )}

      {/* 成功显示 WhatsApp 信息（有或没有头像都显示）*/}
      {data && !loading && (
        <div className="social-card p-4 fade-in-up">
          <div className="flex items-start gap-4">
            {/* 头像（始终显示，有图就显示图，没图显示占位符）*/}
            <div className="social-avatar" style={{ width: '80px', height: '80px' }}>
              {data.picture_url ? (
                <img
                  src={data.picture_url}
                  alt="WhatsApp Profile"
                  className="w-full h-full object-cover"
                  onError={(e) => {
                    e.target.style.display = 'none';
                    const fallback = e.target.parentElement.querySelector('.fallback-icon');
                    if (fallback) fallback.style.display = 'flex';
                  }}
                />
              ) : null}
              <div
                className={`fallback-icon w-full h-full items-center justify-center bg-gradient-to-br from-green-500/20 to-emerald-500/20 ${data.picture_url ? 'hidden' : 'flex'}`}
                style={{ display: data.picture_url ? 'none' : 'flex' }}
              >
                <Phone className="w-8 h-8 text-green-400/60" />
              </div>
            </div>

            {/* 信息 */}
            <div className="flex-1">
              <div className="flex items-start justify-between mb-2">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1 flex-wrap">
                    {/* 电话号码 */}
                    <span className="font-bold text-green-300 text-lg">
                      {data.phone || phoneNumber}
                    </span>
                    
                    {/* 已找到标识 */}
                    <span className="premium-badge badge-success text-xs">
                      <CheckCircle className="w-3 h-3" /> 已找到
                    </span>
                  </div>
                  
                  {/* 消息 - 根据是否有头像显示不同信息 */}
                  <div className="text-sm text-gray-400 mb-2">
                    {data.picture_url ? 
                      (data.message || '已找到 WhatsApp 头像') : 
                      '账号已注册，但无公开头像'
                    }
                  </div>
                </div>
              </div>

              {/* WhatsApp 标识和链接 */}
              <div className="flex items-center gap-2 mt-3 flex-wrap">
                <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg" style={{
                  background: 'rgba(0, 230, 115, 0.15)',
                  border: '1px solid rgba(0, 230, 115, 0.3)'
                }}>
                  <div className="w-2 h-2 rounded-full bg-green-400 animate-pulse"></div>
                  <span className="text-xs font-semibold text-green-400">WhatsApp</span>
                </div>
                
                {/* WhatsApp 链接 */}
                {data.phone && (
                  <a
                    href={`https://wa.me/${data.phone.replace(/[^\d]/g, '')}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-xs text-cyan-400 hover:text-cyan-300 underline flex items-center gap-1"
                  >
                    <Phone className="w-3 h-3" />
                    打开 WhatsApp
                  </a>
                )}
                
                {/* 头像链接 */}
                {data.picture_url && (
                  <a
                    href={data.picture_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-xs text-cyan-400 hover:text-cyan-300 underline"
                  >
                    查看原图
                  </a>
                )}
              </div>

              {/* 头像路径 */}
              {data.picture_path && (
                <div className="mt-2 text-xs text-gray-500">
                  本地路径: {data.picture_path}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default WhatsAppProfileCard;
