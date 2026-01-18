import React from 'react';

type Props = { modules: { title: string; percentComplete: number }[] };

export default function ModuleBreakdown({ modules }: Props) {
  if (modules.length === 0) {
    return (
      <div className="bg-white rounded-xl shadow-sm border border-slate-100 p-6">
        <h3 className="font-heading text-lg font-bold text-slate-800 mb-4">Module Progress</h3>
        <div className="text-center py-8 text-slate-400">
          <p className="text-sm">No module progress data yet</p>
        </div>
      </div>
    );
  }

  // Get color based on percentage
  const getProgressColor = (percent: number) => {
    if (percent >= 90) return { stroke: '#8BC34A', bg: 'bg-green-50' }; // Green
    if (percent >= 75) return { stroke: '#18548b', bg: 'bg-blue-50' }; // Primary blue
    if (percent >= 50) return { stroke: '#FF7F11', bg: 'bg-orange-50' }; // Orange
    if (percent > 0) return { stroke: '#ef4444', bg: 'bg-red-50' }; // Red
    return { stroke: '#e2e8f0', bg: 'bg-slate-50' }; // Gray
  };

  // SVG Progress Ring Component
  const ProgressRing = ({ percent, size = 64, strokeWidth = 4 }: { percent: number; size?: number; strokeWidth?: number }) => {
    const radius = (size - strokeWidth) / 2;
    const circumference = radius * 2 * Math.PI;
    const offset = circumference - (percent / 100) * circumference;
    const colors = getProgressColor(percent);

    return (
      <div className="relative" style={{ width: size, height: size }}>
        <svg width={size} height={size} className="transform -rotate-90">
          {/* Background circle */}
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            fill="none"
            stroke="#e2e8f0"
            strokeWidth={strokeWidth}
          />
          {/* Progress circle */}
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            fill="none"
            stroke={colors.stroke}
            strokeWidth={strokeWidth}
            strokeDasharray={circumference}
            strokeDashoffset={offset}
            strokeLinecap="round"
            className="transition-all duration-700 ease-out"
          />
        </svg>
        <div className="absolute inset-0 flex items-center justify-center">
          <span className="text-sm font-bold text-slate-700">{percent}%</span>
        </div>
      </div>
    );
  };

  return (
    <div className="bg-white rounded-xl shadow-sm border border-slate-100 p-6">
      <h3 className="font-heading text-lg font-bold text-slate-800 mb-4">Module Progress</h3>
      
      {/* Horizontal Scroll Container */}
      <div className="flex gap-4 overflow-x-auto pb-2 scrollbar-hide -mx-2 px-2">
        {modules.map((module, idx) => {
          const colors = getProgressColor(module.percentComplete);
          
          return (
            <div 
              key={idx} 
              className={`min-w-[160px] ${colors.bg} p-4 rounded-xl border border-slate-100 shadow-sm flex flex-col items-center text-center transition-all duration-200 hover:shadow-md hover:scale-[1.02] cursor-default ${module.percentComplete === 0 ? 'opacity-60' : ''}`}
            >
              <ProgressRing percent={module.percentComplete} />
              <h4 className="font-bold text-sm text-slate-800 leading-tight mt-3 mb-1 line-clamp-2">
                {module.title}
              </h4>
              <span className="text-xs text-slate-500">
                {module.percentComplete === 0 ? 'Not Started' : 
                 module.percentComplete === 100 ? 'Completed' : 'In Progress'}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
