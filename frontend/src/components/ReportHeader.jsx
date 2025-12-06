import React from 'react';
import { Shield } from 'lucide-react';

/**
 * 机密档案报告顶部标题栏组件
 */
const ReportHeader = ({ name, riskLevel, riskColorClass }) => {
  const today = new Date().toLocaleDateString('zh-CN', { 
    year: 'numeric', 
    month: 'numeric', 
    day: 'numeric' 
  });

  return (
    <div className="bg-[#0a1628] text-white px-8 py-6 mb-4 rounded-lg flex flex-col md:flex-row justify-between items-start md:items-center gap-4 border border-cyan-900/50 shadow-lg">
      <div>
        <h1 className="text-2xl md:text-3xl font-bold tracking-tight mb-1 text-white">
          {name || '未知目标'} -
        </h1>
        <div className="flex items-center gap-3 text-slate-500 text-sm tracking-wide">
          <span>机密档案报告</span>
          <span className="text-slate-600">•</span>
          <span>{today}</span>
        </div>
      </div>
      <div className={`px-5 py-3 rounded-lg border-2 ${riskColorClass} flex flex-col items-center min-w-[120px]`}>
        <div className="text-xs uppercase tracking-wider font-semibold opacity-90 mb-1">风险评估</div>
        <div className="text-xl font-black flex items-center gap-2">
          <Shield className="w-5 h-5" />
          {riskLevel}
        </div>
      </div>
    </div>
  );
};

export default ReportHeader;
