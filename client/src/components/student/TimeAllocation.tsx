// src/components/student/TimeAllocation.tsx
import React, { useRef, useEffect } from 'react';
import * as echarts from 'echarts';

interface TimeAllocationProps {
  data: { name: string; value: number }[];
}

export default function TimeAllocation({ data }: TimeAllocationProps) {
  const chartRef = useRef<HTMLDivElement>(null);
  const chartInstance = useRef<echarts.ECharts | null>(null);

  const total = data.reduce((sum, item) => sum + item.value, 0);

  useEffect(() => {
    if (!chartRef.current) return;

    chartInstance.current = echarts.init(chartRef.current);

    const option: echarts.EChartsOption = {
      tooltip: {
        trigger: 'item',
        formatter: '{b}: {c} ({d}%)',
        backgroundColor: 'rgba(255, 255, 255, 0.95)',
        borderColor: '#e2e8f0',
        borderWidth: 1,
        padding: [8, 12],
        textStyle: {
          color: '#334155'
        }
      },
      series: [
        {
          name: 'Time Allocation',
          type: 'pie',
          radius: ['55%', '80%'],
          center: ['50%', '50%'],
          avoidLabelOverlap: false,
          itemStyle: {
            borderRadius: 6,
            borderColor: '#fff',
            borderWidth: 2
          },
          label: {
            show: false
          },
          emphasis: {
            label: {
              show: false
            },
            scaleSize: 8
          },
          labelLine: {
            show: false
          },
          data: [
            {
              value: data[0]?.value || 0,
              name: data[0]?.name || 'Documents',
              itemStyle: { color: '#18548b' }
            },
            {
              value: data[1]?.value || 0,
              name: data[1]?.name || 'Quizzes',
              itemStyle: { color: '#8BC34A' }
            }
          ],
          animationType: 'scale',
          animationEasing: 'elasticOut',
          animationDuration: 1000
        }
      ]
    };

    chartInstance.current.setOption(option);

    const handleResize = () => {
      chartInstance.current?.resize();
    };
    window.addEventListener('resize', handleResize);

    return () => {
      window.removeEventListener('resize', handleResize);
      chartInstance.current?.dispose();
    };
  }, [data]);

  return (
    <div className="bg-white rounded-xl shadow-sm border border-slate-100 overflow-hidden">
      <div className="px-6 py-4 bg-[#18548b]">
        <h3 className="text-lg font-bold text-white">Time Allocation</h3>
      </div>
      <div className="p-6">
        {/* Chart with center label */}
        <div className="relative flex items-center justify-center mb-4">
          <div ref={chartRef} className="w-full h-[160px]" />
          <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
            <span className="text-2xl font-bold text-slate-800 font-heading">{total}</span>
            <span className="text-xs text-slate-500">Total</span>
          </div>
        </div>

        {/* Legend */}
        <div className="space-y-2">
          <div className="flex items-center justify-between text-sm">
            <div className="flex items-center gap-2">
              <div className="size-3 rounded-full bg-[#18548b]" />
              <span className="text-slate-600">{data[0]?.name || 'Documents'}</span>
            </div>
            <span className="font-bold text-slate-800">
              {total > 0 ? Math.round((data[0]?.value / total) * 100) : 0}%
            </span>
          </div>
          <div className="flex items-center justify-between text-sm">
            <div className="flex items-center gap-2">
              <div className="size-3 rounded-full bg-[#8BC34A]" />
              <span className="text-slate-600">{data[1]?.name || 'Quizzes'}</span>
            </div>
            <span className="font-bold text-slate-800">
              {total > 0 ? Math.round((data[1]?.value / total) * 100) : 0}%
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
