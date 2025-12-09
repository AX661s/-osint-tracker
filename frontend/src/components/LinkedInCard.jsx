import React, { useState, useEffect } from 'react';
import { ExternalLink, Briefcase, MapPin, Award, Loader2 } from 'lucide-react';

/**
 * LinkedIn 职业信息卡片
 * 显示LinkedIn职业档案
 */
const LinkedInCard = ({ phoneNumber, autoSearch = false }) => {
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
      
      console.log(`🔍 [LinkedInCard] 查询: ${cleanPhone}`);
      
      const response = await fetch(`/api/analyze-contact/${cleanPhone}`);
      const result = await response.json();

      console.log(`💼 [LinkedInCard] 响应:`, result);

      if (result.success && result.data?.step3_linkedin_search) {
        const linkedinStep = result.data.step3_linkedin_search;
        const linkedinData = linkedinStep.best_match || {};
        
        // 如果有LinkedIn数据，保存
        if (linkedinData && Object.keys(linkedinData).length > 0) {
          setData(linkedinData);
          console.log(`✅ [LinkedInCard] 找到LinkedIn数据:`, linkedinData);
        } else {
          setData(null);
          console.log(`ℹ️ [LinkedInCard] LinkedIn数据为空`);
        }
      } else {
        setData(null);
        console.log(`ℹ️ [LinkedInCard] 未找到LinkedIn数据`);
      }
    } catch (err) {
      console.error(`❌ [LinkedInCard] 查询错误:`, err);
      setError(err.message || '查询失败');
    } finally {
      setLoading(false);
    }
  };

  // 如果没有数据且不在加载中，不显示卡片
  if (!loading && !data) {
    return null;
  }

  // 解析技能
  const skills = data?.Skills?.split(',').filter(s => s.trim()).slice(0, 5) || [];

  return (
    <div className="border border-border/50 rounded-lg p-4 bg-card/20 hover:border-primary/30 transition-all">
      {/* 加载状态 */}
      {loading && (
        <div className="flex items-center gap-3 py-2">
          <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />
          <span className="text-sm text-muted-foreground">查询 LinkedIn...</span>
        </div>
      )}

      {/* 成功显示 LinkedIn 信息 */}
      {data && !loading && (
        <div className="space-y-4">
          {/* 头部信息 */}
          <div className="flex items-start justify-between gap-4">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1">
                <img 
                  src="/api/logo/linkedin.com"
                  alt="LinkedIn"
                  className="w-4 h-4 object-contain flex-shrink-0"
                />
                <span className="font-semibold text-foreground capitalize">
                  {data.FullName || '未知'}
                </span>
              </div>
              
              <div className="text-sm text-primary mb-1">
                {data.JobTitle || data.Title || '职位未知'}
              </div>
              
              <div className="text-xs text-muted-foreground">
                {data.JobCompanyName || data.CompanyName || '公司未知'}
              </div>
            </div>

            {/* LinkedIn链接 */}
            {data.LinkedinURL && (
              <a
                href={data.LinkedinURL}
                target="_blank"
                rel="noopener noreferrer"
                className="text-xs text-primary hover:text-primary/80 flex items-center gap-1 flex-shrink-0 transition-colors"
              >
                <ExternalLink className="w-3 h-3" />
                查看档案
              </a>
            )}
          </div>

          {/* 职业信息 */}
          <div className="grid grid-cols-2 gap-3 text-xs">
            {/* 位置 */}
            {data.Location && (
              <div className="flex items-start gap-2">
                <MapPin className="w-3 h-3 text-muted-foreground flex-shrink-0 mt-0.5" />
                <div>
                  <div className="text-muted-foreground">位置</div>
                  <div className="text-foreground">{data.Location}</div>
                </div>
              </div>
            )}

            {/* 行业 */}
            {data.Industry && (
              <div className="flex items-start gap-2">
                <Briefcase className="w-3 h-3 text-muted-foreground flex-shrink-0 mt-0.5" />
                <div>
                  <div className="text-muted-foreground">行业</div>
                  <div className="text-foreground capitalize">{data.Industry}</div>
                </div>
              </div>
            )}

            {/* 入职时间 */}
            {data.JobStartDate && (
              <div className="flex items-start gap-2">
                <Award className="w-3 h-3 text-muted-foreground flex-shrink-0 mt-0.5" />
                <div>
                  <div className="text-muted-foreground">入职时间</div>
                  <div className="text-foreground">{data.JobStartDate}</div>
                </div>
              </div>
            )}

            {/* 性别 */}
            {data.Gender && (
              <div className="flex items-start gap-2">
                <div className="w-3 h-3 flex-shrink-0 mt-0.5"></div>
                <div>
                  <div className="text-muted-foreground">性别</div>
                  <div className="text-foreground capitalize">{data.Gender}</div>
                </div>
              </div>
            )}
          </div>

          {/* 个人简介 */}
          {data.Summary && (
            <div className="text-sm text-muted-foreground leading-relaxed bg-muted/30 rounded-lg p-3 border border-border/30">
              {data.Summary}
            </div>
          )}

          {/* 技能标签 */}
          {skills.length > 0 && (
            <div className="space-y-2">
              <div className="text-xs font-medium text-muted-foreground">
                专业技能
              </div>
              <div className="flex flex-wrap gap-2">
                {skills.map((skill, index) => (
                  <div
                    key={index}
                    className="inline-flex items-center px-2.5 py-1 rounded-md text-xs bg-blue-500/10 text-blue-400 border border-blue-500/20"
                  >
                    {skill.trim()}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* 置信度 */}
          {data._confidence_score && (
            <div className="text-xs text-muted-foreground pt-2 border-t border-border/30">
              匹配置信度: {data._confidence_score}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default LinkedInCard;
