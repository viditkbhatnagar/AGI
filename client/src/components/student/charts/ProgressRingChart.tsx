// Progress Ring Chart - Animated concentric rings showing multiple metrics
import React, { useRef, useEffect } from 'react';
import * as echarts from 'echarts';

interface ProgressRingData {
  name: string;
  value: number;
  max: number;
  color: string;
}

interface ProgressRingChartProps {
  data: ProgressRingData[];
}

export default function ProgressRingChart({ data }: ProgressRingChartProps) {
  const chartRef = useRef<HTMLDivElement>(null);
  const chartInstance = useRef<echarts.ECharts | null>(null);

  useEffect(() => {
    if (!chartRef.current || data.length === 0) return;

    chartInstance.current = echarts.init(chartRef.current);

    const series: echarts.PieSeriesOption[] = [];
    const baseRadius = 85;
    const ringWidth = 15;
    const gap = 5;

    data.forEach((item, index) => {
      const percentage = item.max > 0 ? (item.value / item.max) * 100 : 0;
      const outerRadius = baseRadius - index * (ringWidth + gap);
      const innerRadius = outerRadius - ringWidth;

      // Background ring
      series.push({
        type: 'pie',
        radius: [`${innerRadius}%`, `${outerRadius}%`],
        center: ['50%', '50%'],
        silent: true,
        label: { show: false },
        data: [{
          value: 100,
          itemStyle: { color: 'rgba(226, 232, 240, 0.5)' }
        }],
        animation: false
      });

      // Progress ring
      series.push({
        type: 'pie',
        radius: [`${innerRadius}%`, `${outerRadius}%`],
        center: ['50%', '50%'],
        startAngle: 90,
        label: { show: false },
        data: [
          {
            value: percentage,
            name: item.name,
            itemStyle: {
              color: new echarts.graphic.LinearGradient(0, 0, 1, 1, [
                { offset: 0, color: item.color },
                { offset: 1, color: adjustColor(item.color, 30) }
              ]),
              shadowColor: item.color + '50',
              shadowBlur: 10,
              borderRadius: 10
            }
          },
          {
            value: 100 - percentage,
            itemStyle: { color: 'transparent' }
          }
        ],
        animationType: 'scale',
        animationEasing: 'elasticOut',
        animationDuration: 2000,
        animationDelay: index * 200
      });
    });

    const option: echarts.EChartsOption = {
      tooltip: {
        trigger: 'item',
        backgroundColor: 'rgba(15, 23, 42, 0.95)',
        borderColor: 'transparent',
        borderRadius: 12,
        padding: [12, 16],
        textStyle: { color: '#fff', fontSize: 13 },
        formatter: (params: any) => {
          const item = data.find(d => d.name === params.name);
          if (!item) return '';
          const percentage = item.max > 0 ? ((item.value / item.max) * 100).toFixed(1) : 0;
          return `
            <div style="display: flex; align-items: center; gap: 8px; margin-bottom: 8px;">
              <div style="width: 12px; height: 12px; border-radius: 3px; background: ${item.color};"></div>
              <span style="font-weight: 600;">${item.name}</span>
            </div>
            <div style="font-size: 24px; font-weight: 700;">${percentage}%</div>
            <div style="color: #94a3b8; font-size: 12px; margin-top: 4px;">
              ${item.value} / ${item.max}
            </div>
          `;
        }
      },
      series
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

  if (data.length === 0) {
    return (
      <div className="w-full h-[200px] flex items-center justify-center text-slate-400 text-sm">
        No data available
      </div>
    );
  }

  return (
    <div className="relative">
      <div ref={chartRef} className="w-full h-[200px]" />
      {/* Center stats */}
      <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
        <div className="text-center">
          <p className="text-2xl font-bold text-slate-800">
            {data.length}
          </p>
          <p className="text-xs text-slate-500">Metrics</p>
        </div>
      </div>
    </div>
  );
}

// Helper function to lighten colors
function adjustColor(color: string, percent: number): string {
  const num = parseInt(color.replace('#', ''), 16);
  const amt = Math.round(2.55 * percent);
  const R = (num >> 16) + amt;
  const G = (num >> 8 & 0x00FF) + amt;
  const B = (num & 0x0000FF) + amt;
  return '#' + (
    0x1000000 +
    (R < 255 ? (R < 1 ? 0 : R) : 255) * 0x10000 +
    (G < 255 ? (G < 1 ? 0 : G) : 255) * 0x100 +
    (B < 255 ? (B < 1 ? 0 : B) : 255)
  ).toString(16).slice(1);
}
