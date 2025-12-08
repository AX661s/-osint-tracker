import React, { useState } from 'react';
import { Phone, Image as ImageIcon, CheckCircle, XCircle, Loader2 } from 'lucide-react';
import './ProfileResultStyles.css';
import './CrystalEnhancements.css';

const SocialMediaCard = ({ phoneNumber, onLookup }) => {
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState(null);
  const [error, setError] = useState(null);
  const [phone, setPhone] = useState(phoneNumber || '');

  const handleLookup = async () => {
    if (!phone.trim()) {
      setError('请输入电话号码');
      return;
    }

    setLoading(true);
    setError(null);
    setData(null);

    try {
      const response = await fetch('/api/profile-picture', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ phone: phone.trim() }),
      });

      const result = await response.json();

      if (result.success && result.data?.success) {
        setData(result.data);
        if (onLookup) {
          onLookup(result.data);
        }
      } else {
        setError(result.message || '未找到该号码的账户信息');
      }
    } catch (err) {
      setError('查询失败，请稍后重试');
    } finally {
      setLoading(false);
    }
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter') {
      handleLookup();
    }
  };

  return (
    <div className="glass-card p-6 fade-in-up hover-lift">
      <div className="flex items-center gap-3 mb-4">
        <div className="icon-container icon-container-blue">
          <Phone className="w-5 h-5" />
        </div>
        <h3 className="text-lg font-bold text-cyan-300">社交媒体账户</h3>
      </div>

      {/* 搜索输入 */}
      <div className="flex gap-2 mb-4">
        <input
          type="text"
          value={phone}
          onChange={(e) => setPhone(e.target.value)}
          onKeyPress={handleKeyPress}
          placeholder="输入电话号码..."
          disabled={loading}
          className="flex-1 px-4 py-2 rounded-lg text-sm"
          style={{
            background: 'rgba(14, 20, 25, 0.6)',
            border: '1px solid rgba(0, 213, 213, 0.3)',
            color: '#67e8f9',
            outline: 'none',
          }}
          onFocus={(e) => {
            e.target.style.borderColor = 'rgba(0, 213, 213, 0.6)';
            e.target.style.boxShadow = '0 0 20px rgba(0, 213, 213, 0.2)';
          }}
          onBlur={(e) => {
            e.target.style.borderColor = 'rgba(0, 213, 213, 0.3)';
            e.target.style.boxShadow = 'none';
          }}
        />
        <button
          onClick={handleLookup}
          disabled={loading}
          className="gradient-button px-6 py-2 text-sm flex items-center gap-2"
        >
          {loading ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              查询中...
            </>
          ) : (
            <>
              <ImageIcon className="w-4 h-4" />
              查询
            </>
          )}
        </button>
      </div>

      {/* 加载状态 */}
      {loading && (
        <div className="flex items-center justify-center py-8">
          <div className="crystal-loader"></div>
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
            <div className="font-semibold text-red-400 mb-1">查询失败</div>
            <div className="text-sm text-gray-400">{error}</div>
          </div>
        </div>
      )}

      {/* 成功显示 */}
      {data && !loading && (
        <div className="social-card p-4 fade-in-up">
          <div className="flex items-start gap-4">
            {/* 头像 */}
            {data.picture_url && (
              <div className="social-avatar" style={{ width: '80px', height: '80px' }}>
                <img
                  src={data.picture_url}
                  alt="Profile"
                  className="w-full h-full object-cover"
                  onError={(e) => {
                    e.target.style.display = 'none';
                    const fallback = e.target.parentElement.querySelector('.fallback-icon');
                    if (fallback) fallback.style.display = 'flex';
                  }}
                />
                <div
                  className="fallback-icon hidden w-full h-full items-center justify-center bg-gradient-to-br from-cyan-100 to-blue-100"
                  style={{ display: 'none' }}
                >
                  <ImageIcon className="w-8 h-8 text-cyan-400/40" />
                </div>
              </div>
            )}

            {/* 信息 */}
            <div className="flex-1">
              <div className="flex items-start justify-between mb-2">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <span className="font-bold text-cyan-300 text-lg">{data.phone}</span>
                    <span className="premium-badge badge-success text-xs">
                      <CheckCircle className="w-3 h-3" /> 已找到
                    </span>
                  </div>
                  <div className="text-sm text-gray-400">{data.message}</div>
                </div>
              </div>

              {/* WhatsApp标识 */}
              <div className="flex items-center gap-2 mt-3">
                <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg" style={{
                  background: 'rgba(0, 230, 115, 0.15)',
                  border: '1px solid rgba(0, 230, 115, 0.3)'
                }}>
                  <div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></div>
                  <span className="text-xs font-semibold text-emerald-400">WhatsApp</span>
                </div>
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
            </div>
          </div>
        </div>
      )}

      {/* 初始提示 */}
      {!data && !loading && !error && (
        <div className="text-center py-8 text-gray-400 text-sm">
          <ImageIcon className="w-12 h-12 mx-auto mb-3 opacity-30" />
          <p>输入电话号码查询社交媒体账户</p>
        </div>
      )}
    </div>
  );
};

export default SocialMediaCard;
