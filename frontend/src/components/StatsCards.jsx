import React from 'react';
import { Shield, CheckCircle2, AlertTriangle } from 'lucide-react';
import { GlassCard } from './ui/glass-card';

/**
 * 统计卡片组件
 * 显示查询结果的统计信息
 */
export const StatsCards = ({ regularPlatforms, foundPlatforms, errorPlatforms }) => {
  const total = regularPlatforms.length;
  const found = foundPlatforms.length;
  const errors = errorPlatforms.length;
  const pct = (n) => (total > 0 ? Math.round((n / total) * 100) : 0);

  const Card = ({ icon: Icon, label, value, sub }) => (
    <GlassCard className="p-6" hover={false}>
      <div className="flex items-center justify-between mb-3">
        <span className="text-sm font-medium text-muted-foreground tracking-wide">
          {label}
        </span>
        <div className="p-2 rounded-lg bg-white/5 border border-white/10">
          <Icon className="w-5 h-5 text-primary" />
        </div>
      </div>
      <div className="flex items-end justify-between">
        <div className="text-4xl font-bold bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent">
          {value}
        </div>
        {typeof sub === 'number' && (
          <div className="text-xs text-muted-foreground font-mono">{sub}%</div>
        )}
      </div>
    </GlassCard>
  );

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
      <Card icon={Shield} label="总平台数" value={total} />
      <Card icon={CheckCircle2} label="发现数据" value={found} sub={pct(found)} />
      <Card icon={AlertTriangle} label="错误/限制" value={errors} sub={pct(errors)} />
    </div>
  );
};

export default StatsCards;
