// components/student/ActivityHeatmap.tsx
import React, { useState, useRef } from 'react';
import clsx from 'clsx';

interface HeatmapProps {
  matrix: number[][];
  label?: string;
}

export default function ActivityHeatmap({ matrix, label }: HeatmapProps) {
  const [tooltip, setTooltip] = useState<{
    visible: boolean;
    value: number;
    x: number;
    y: number;
  }>({ visible: false, value: 0, x: 0, y: 0 });
  const containerRef = useRef<HTMLDivElement>(null);

  const max = Math.max(...matrix.flat(), 1);

  const labelText = label || new Date().toLocaleString('default', {
    month: 'long',
    year: 'numeric',
  });

  // Updated color scheme to match new design
  const getColorClass = (val: number) => {
    if (val === 0) return 'bg-slate-100';
    if (val < max * 0.33) return 'bg-[#8BC34A]/40';
    if (val < max * 0.66) return 'bg-[#18548b]/50';
    return 'bg-[#18548b]';
  };

  return (
    <div ref={containerRef} className="relative w-full flex flex-col items-center">
      {/* Month Label */}
      <div className="text-center text-sm font-medium mb-2 text-[#18548b]">
        Showing activity for {labelText}
      </div>
      <div className="text-center text-xs text-slate-500 mb-4">
        Rows: last 4 weeks (oldest at top); Columns: Sunday–Saturday
      </div>

      {/* Heatmap Grid */}
      <div className="grid grid-cols-7 gap-1 w-full max-w-[280px]">
        {matrix.map((row, r) =>
          row.map((val, c) => (
            <div
              key={r + '-' + c}
              className={clsx(
                'aspect-square rounded-sm cursor-pointer transition-all duration-150 hover:scale-110 hover:shadow-md',
                getColorClass(val)
              )}
              title={`${val} min`}
              onMouseEnter={(e) => {
                const rect = containerRef.current?.getBoundingClientRect();
                setTooltip({
                  visible: true,
                  value: val,
                  x: e.clientX - (rect?.left || 0),
                  y: e.clientY - (rect?.top || 0),
                });
              }}
              onMouseLeave={() => setTooltip((t) => ({ ...t, visible: false }))}
            />
          ))
        )}
      </div>

      {/* Legend */}
      <div className="flex items-center justify-center gap-4 mt-4 text-xs text-slate-600">
        <div className="flex items-center gap-1">
          <span className="w-3 h-3 rounded-sm bg-slate-100" />
          <span>No activity</span>
        </div>
        <div className="flex items-center gap-1">
          <span className="w-3 h-3 rounded-sm bg-[#8BC34A]/40" />
          <span>Low</span>
        </div>
        <div className="flex items-center gap-1">
          <span className="w-3 h-3 rounded-sm bg-[#18548b]/50" />
          <span>Moderate</span>
        </div>
        <div className="flex items-center gap-1">
          <span className="w-3 h-3 rounded-sm bg-[#18548b]" />
          <span>High</span>
        </div>
      </div>

      {/* Tooltip */}
      {tooltip.visible && (
        <div
          className="absolute bg-white text-sm text-slate-700 px-3 py-1.5 rounded-lg shadow-lg border border-slate-100 pointer-events-none z-10 font-medium"
          style={{ top: tooltip.y + 10, left: tooltip.x + 10 }}
        >
          {tooltip.value} min
        </div>
      )}
    </div>
  );
}
