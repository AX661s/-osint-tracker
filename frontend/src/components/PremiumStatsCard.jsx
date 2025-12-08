import React from 'react';
import { TrendingUp, Activity, Award, Shield, Database, Users, Globe } from 'lucide-react';

// 高端统计卡片组件
export const PremiumStatsCard = ({ icon: Icon, title, value, subtitle, color = 'blue', trend }) => {
  const colorClasses = {
    blue: 'icon-container-blue',
    purple: 'icon-container-purple',
    green: 'icon-container-green',
    red: 'icon-container-red'
  };

  return (
    <div className="stat-card">
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <div className="flex items-center gap-3 mb-3">
            <div className={`icon-container ${colorClasses[color]}`}>
              <Icon className="w-5 h-5" />
            </div>
            <div className="text-sm font-medium text-gray-600">{title}</div>
          </div>
          <div className="text-3xl font-bold gradient-text mb-1">
            {value || '0'}
          </div>
          {subtitle && (
            <div className="text-xs text-gray-500">{subtitle}</div>
          )}
        </div>
        {trend && (
          <div className={`flex items-center gap-1 text-xs font-semibold ${trend > 0 ? 'text-green-600' : 'text-red-600'}`}>
            <TrendingUp className="w-3 h-3" />
            {trend > 0 ? '+' : ''}{trend}%
          </div>
        )}
      </div>
    </div>
  );
};

// 统计网格容器
export const StatsGrid = ({ children }) => {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
      {children}
    </div>
  );
};

// 预定义的统计卡片
export const DataBreachStats = ({ count }) => (
  <PremiumStatsCard
    icon={Database}
    title="数据泄露"
    value={count}
    subtitle="发现的泄露事件"
    color="red"
  />
);

export const SocialAccountsStats = ({ count }) => (
  <PremiumStatsCard
    icon={Globe}
    title="社交账号"
    value={count}
    subtitle="已识别平台"
    color="blue"
  />
);

export const EmailsStats = ({ count }) => (
  <PremiumStatsCard
    icon={Users}
    title="邮箱地址"
    value={count}
    subtitle="关联邮箱"
    color="purple"
  />
);

export const RiskScoreStats = ({ score, level }) => {
  const getColor = (level) => {
    if (level === '高风险' || level === 'High') return 'red';
    if (level === '中等' || level === 'Medium') return 'purple';
    return 'green';
  };

  return (
    <PremiumStatsCard
      icon={Shield}
      title="风险评分"
      value={score || level || '低'}
      subtitle="安全评估"
      color={getColor(level)}
    />
  );
};

export default PremiumStatsCard;
