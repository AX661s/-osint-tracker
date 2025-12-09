import React, { useState, useEffect } from 'react';
import { User, Loader2, MapPin, Briefcase } from 'lucide-react';

/**
 * GetContact 客户画像卡片
 * 显示客户画像和标签信息
 */
const GetContactCard = ({ phoneNumber, autoSearch = false }) => {
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
      const cleanPhone = phoneNumber.replace(/[^\d]/g, '');
      
      console.log(`🔍 [GetContactCard] 查询: ${cleanPhone}`);
      
      const response = await fetch(`/api/analyze-contact/${cleanPhone}`);
      const result = await response.json();

      console.log(`📊 [GetContactCard] 响应:`, result);

      if (result.success && result.data?.step1_getcontact?.status) {
        const gcData = result.data.step1_getcontact.data;
        setData({
          ...gcData,
          primary_name: result.data.primary_name,
          gpt_analysis: result.data.step2_gpt_analysis
        });
        console.log(`✅ [GetContactCard] 找到GetContact数据`);
      } else {
        setData(null);
        console.log(`ℹ️ [GetContactCard] 未找到GetContact数据`);
      }
    } catch (err) {
      console.error(`❌ [GetContactCard] 查询错误:`, err);
      setError(err.message || '查询失败');
    } finally {
      setLoading(false);
    }
  };

  // 如果没有数据且不在加载中，不显示卡片
  if (!loading && !data) {
    return null;
  }

  // 提取位置信息
  const extractLocation = (summary) => {
    if (!summary) return null;
    const locationMatch = summary.match(/(?:domisili|berada di|lokasi).*?([A-Z][a-zA-Z\s,]+)/i);
    return locationMatch ? locationMatch[1].trim() : null;
  };

  // 提取职业信息
  const extractOccupation = (summary) => {
    if (!summary) return null;
    const occupationMatch = summary.match(/(?:bisnis|pekerjaan|profesi|terlibat dalam).*?([a-zA-Z\s]+)/i);
    return occupationMatch ? occupationMatch[1].trim() : null;
  };

  const location = data ? extractLocation(data.summary) : null;
  const occupation = data ? extractOccupation(data.summary) : null;

  // 获取前10个标签
  const topTags = data?.tags?.slice(0, 10) || [];

  return (
    <div className="border border-border/50 rounded-lg p-4 bg-card/20 hover:border-primary/30 transition-all">
      {/* 加载状态 */}
      {loading && (
        <div className="flex items-center gap-3 py-2">
          <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />
          <span className="text-sm text-muted-foreground">分析客户画像...</span>
        </div>
      )}

      {/* 成功显示 GetContact 信息 */}
      {data && !loading && (
        <div className="space-y-4">
          {/* 头部信息 */}
          <div className="flex items-start gap-4">
            {/* 头像 */}
            <div className="w-12 h-12 rounded-full overflow-hidden flex-shrink-0 border border-border/50">
              {data.gc_pic ? (
                <img
                  src={data.gc_pic}
                  alt="GetContact"
                  className="w-full h-full object-cover"
                  onError={(e) => {
                    e.target.style.display = 'none';
                    const fallback = e.target.parentElement.querySelector('.fallback-avatar');
                    if (fallback) fallback.style.display = 'flex';
                  }}
                />
              ) : null}
              <div
                className={`fallback-avatar w-full h-full items-center justify-center bg-muted ${!data.gc_pic ? 'flex' : 'hidden'}`}
                style={{ display: !data.gc_pic ? 'flex' : 'none' }}
              >
                <User className="w-6 h-6 text-muted-foreground" />
              </div>
            </div>

            {/* 基本信息 */}
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1">
                <span className="font-semibold text-foreground text-base">
                  {data.primary_name || data.primary || '未知'}
                </span>
              </div>
              
              <div className="text-xs text-muted-foreground mb-2">
                GetContact 客户画像
              </div>

              {/* 位置和职业 */}
              <div className="flex flex-wrap gap-2 text-xs">
                {location && (
                  <div className="flex items-center gap-1 text-muted-foreground">
                    <MapPin className="w-3 h-3" />
                    <span>{location}</span>
                  </div>
                )}
                {occupation && (
                  <div className="flex items-center gap-1 text-muted-foreground">
                    <Briefcase className="w-3 h-3" />
                    <span>{occupation}</span>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* 摘要 */}
          {data.summary && (
            <div className="text-sm text-muted-foreground leading-relaxed bg-muted/30 rounded-lg p-3 border border-border/30">
              {data.summary}
            </div>
          )}

          {/* 标签云 */}
          {topTags.length > 0 && (
            <div className="space-y-2">
              <div className="text-xs font-medium text-muted-foreground">
                常用标签 (前10)
              </div>
              <div className="flex flex-wrap gap-2">
                {topTags.map((tag, index) => (
                  <div
                    key={index}
                    className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs bg-primary/10 text-primary border border-primary/20"
                  >
                    <span className="font-medium">{tag.value}</span>
                    <span className="text-muted-foreground">({tag.count})</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default GetContactCard;
