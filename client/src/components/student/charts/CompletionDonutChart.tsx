// Enhanced Donut Chart with 3D effect, nightingale rose, and animations
import React, { useRef, useEffect } from 'react';
import * as echarts from 'echarts';

interface ChartDataItem {
  name: string;
  value: number;
  color: string;
}

interface CompletionDonutChartProps {
  data: ChartDataItem[];
  centerText?: string;
  centerSubtext?: string;
}

export default function CompletionDonutChart({ 
  data, 
  centerText,
  centerSubtext 
}: CompletionDonutChartProps) {
  const chartRef = useRef<HTMLDivElement>(null);
  const chartInstance = useRef<echarts.ECharts | null>(null);

  useEffect(() => {
    if (!chartRef.current || data.length === 0) return;

    chartInstance.current = echarts.init(chartRef.current);

    const total = data.reduce((acc, item) => acc + item.value, 0);

    const option: echarts.EChartsOption = {
      tooltip: {
        trigger: 'item',
        backgroundColor: 'rgba(15, 23, 42, 0.95)',
        borderColor: 'transparent',
        borderRadius: 12,
        padding: [12, 16],
        textStyle: { color: '#fff', fontSize: 13 },
        formatter: (params: any) => {
          const percent = total > 0 ? ((params.value / total) * 100).toFixed(1) : 0;
          return `
            <div style="display: flex; align-items: center; gap: 8px; margin-bottom: 8px;">
              <div style="width: 12px; height: 12px; border-radius: 3px; background: ${params.color};"></div>
              <span style="font-weight: 600;">${params.name}</span>
            </div>
            <div style="display: flex; align-items: baseline; gap: 6px;">
              <span style="font-size: 24px; font-weight: 700;">${params.value}</span>
              <span style="color: #94a3b8; font-size: 12px;">(${percent}%)</span>
            </div>
          `;
        }
      },
      legend: {
        show: false
      },
      series: [
        // Outer glow ring
        {
          type: 'pie',
          radius: ['75%', '78%'],
          center: ['50%', '50%'],
          silent: true,
          label: { show: false },
          data: data.map(item => ({
            value: item.value,
            itemStyle: { 
              color: item.color + '30',
              borderWidth: 0
            }
          })),
          animation: false
        },
        // Main donut
        {
          type: 'pie',
          radius: ['50%', '72%'],
          center: ['50%', '50%'],
          avoidLabelOverlap: false,
          itemStyle: {
            borderRadius: 8,
            borderColor: '#fff',
            borderWidth: 4,
            shadowColor: 'rgba(0, 0, 0, 0.15)',
            shadowBlur: 15,
            shadowOffsetY: 5
          },
          label: {
            show: false
          },
          emphasis: {
            scale: true,
            scaleSize: 12,
            itemStyle: {
              shadowBlur: 25,
              shadowColor: 'rgba(0, 0, 0, 0.3)'
            }
          },
          data: data.map((item, index) => ({
            value: item.value,
            name: item.name,
            itemStyle: { 
              color: new echarts.graphic.LinearGradient(0, 0, 1, 1, [
                { offset: 0, color: item.color },
                { offset: 1, color: adjustColor(item.color, 20) }
              ])
            }
          })),
          animationType: 'scale',
          animationEasing: 'elasticOut',
          animationDuration: 2000,
          animationDelay: (idx) => idx * 200
        },
        // Center decoration ring
        {
          type: 'pie',
          radius: ['42%', '46%'],
          center: ['50%', '50%'],
          silent: true,
          label: { show: false },
          data: [{
            value: 1,
            itemStyle: { 
              color: new echarts.graphic.LinearGradient(0, 0, 1, 1, [
                { offset: 0, color: 'rgba(24, 84, 139, 0.1)' },
                { offset: 1, color: 'rgba(24, 84, 139, 0.05)' }
              ])
            }
          }],
          animation: false
        }
      ],
      graphic: centerText ? [
        {
          type: 'group',
          left: 'center',
          top: 'center',
          children: [
            {
              type: 'text',
              style: {
                text: centerText,
                fill: '#18548b',
                fontSize: 32,
                fontWeight: 'bold',
                textAlign: 'center',
                fontFamily: 'system-ui, -apple-system, sans-serif'
              },
              left: 'center',
              top: -12
            },
            {
              type: 'text',
              style: {
                text: centerSubtext || '',
                fill: '#64748b',
                fontSize: 12,
                fontWeight: 500,
                textAlign: 'center'
              },
              left: 'center',
              top: 18
            }
          ]
        }
      ] : []
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
  }, [data, centerText, centerSubtext]);

  return <div ref={chartRef} className="w-full h-[200px]" />;
}

// Helper function to lighten/darken colors
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
