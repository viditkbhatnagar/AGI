// components/student/ActivityHeatmap.tsx
import React, { useState, useRef } from 'react';
import clsx from 'clsx';

interface HeatmapProps {
  matrix: number[][];
  label?: string;
}
export default function ActivityHeatmap({ matrix, label }: HeatmapProps) {
  // tooltip state
  const [tooltip, setTooltip] = useState<{
    visible: boolean;
    value: number;
    x: number;
    y: number;
  }>({ visible: false, value: 0, x: 0, y: 0 });
  const containerRef = useRef<HTMLDivElement>(null);

  const max = Math.max(...matrix.flat());

  // derive month-year label if not provided
  const labelText =
    label ||
    new Date().toLocaleString('default', {
      month: 'long',
      year: 'numeric',
    });

  // color thresholds
  const getColorClass = (val: number) =>
    val === 0
      ? 'bg-gray-200'
      : val < max * 0.33
      ? 'bg-[#B2E0D6]'
      : val < max * 0.66
      ? 'bg-[#5BC0EB]'
      : 'bg-[#2E96D1]';

  return (
    <div ref={containerRef} className="relative w-full h-full flex flex-col items-center justify-center p-4">
      {/* Month range label */}
      <div className="w-full text-center text-lg font-semibold mb-4 text-[#375BBE]">
        Showing activity for {labelText}
      </div>
      <div className="w-full text-center text-xm text-[#375BBE] mb-4">
        Rows: last 4 weeks (oldest at top); Columns: Sunday–Saturday
      </div>
      {/* Heat‑grid */}
      <div className="grid grid-cols-7 gap-[2px] w-full max-w-[520px]">
        {matrix.map((row, r) =>
          row.map((val, c) => (
            <div
              key={r + '-' + c}
              className={clsx(
                'aspect-square w-full max-w-[42px] rounded-[3px] cursor-pointer transition-opacity duration-150 hover:opacity-75',
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
      <div className="flex items-center space-x-4 mt-4 text-sm">
        <div className="flex items-center space-x-1">
          <span className="w-4 h-4 rounded-sm bg-gray-200" />
          <span>No activity</span>
        </div>
        <div className="flex items-center space-x-1">
          <span className="w-4 h-4 rounded-sm bg-[#B2E0D6]" />
          <span>Low</span>
        </div>
        <div className="flex items-center space-x-1">
          <span className="w-4 h-4 rounded-sm bg-[#5BC0EB]" />
          <span>Moderate</span>
        </div>
        <div className="flex items-center space-x-1">
          <span className="w-4 h-4 rounded-sm bg-[#2E96D1]" />
          <span>High</span>
        </div>
      </div>

      {tooltip.visible && (
        <div
          className="absolute bg-white text-sm text-[#2E3A59] px-2 py-1 rounded shadow-md pointer-events-none"
          style={{ top: tooltip.y + 10, left: tooltip.x + 10 }}
        >
          {tooltip.value} min
        </div>
      )}
    </div>
  );
}