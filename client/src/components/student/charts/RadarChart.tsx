// Module Coverage Radar Chart - Enhanced with animations and interactive highlights
import React, { useRef, useEffect, useState } from 'react';
import * as echarts from 'echarts';

interface ModuleData {
  title: string;
  percentComplete: number;
}

interface RadarChartProps {
  modules: ModuleData[];
}

export default function RadarChart({ modules }: RadarChartProps) {
  const chartRef = useRef<HTMLDivElement>(null);
  const chartInstance = useRef<echarts.ECharts | null>(null);
  const [hoveredModule, setHoveredModule] = useState<string | null>(null);

  useEffect(() => {
    if (!chartRef.current || modules.length === 0) return;

    chartInstance.current = echarts.init(chartRef.current);

    // Take first 6 modules for radar chart
    const displayModules = modules.slice(0, 6);
    
    const indicator = displayModules.map(m => ({
      name: m.title.length > 12 ? m.title.slice(0, 12) + '...' : m.title,
      max: 100
    }));

    const values = displayModules.map(m => m.percentComplete);

    const option: echarts.EChartsOption = {
      tooltip: {
        trigger: 'item',
        backgroundColor: 'rgba(15, 23, 42, 0.95)',
        borderColor: 'transparent',
        borderRadius: 12,
        padding: [12, 16],
        textStyle: { 
          color: '#fff',
          fontSize: 13
        },
        formatter: (params: any) => {
          const idx = params.dataIndex;
          const mod = displayModules[idx];
          if (!mod) return '';
          return `
            <div style="font-weight: 600; margin-bottom: 4px;">${mod.title}</div>
            <div style="display: flex; align-items: center; gap: 8px;">
              <div style="width: 60px; height: 6px; background: rgba(255,255,255,0.2); border-radius: 3px; overflow: hidden;">
                <div style="width: ${mod.percentComplete}%; height: 100%; background: linear-gradient(90deg, #8BC34A, #4CAF50); border-radius: 3px;"></div>
              </div>
              <span style="font-weight: 700;">${mod.percentComplete}%</span>
            </div>
          `;
        }
      },
      radar: {
        indicator,
        shape: 'circle',
        radius: '65%',
        splitNumber: 4,
        center: ['50%', '52%'],
        axisName: {
          color: '#475569',
          fontSize: 11,
          fontWeight: 500,
          padding: [3, 5],
          borderRadius: 4,
          backgroundColor: 'rgba(241, 245, 249, 0.8)'
        },
        splitLine: {
          lineStyle: {
            color: Array(5).fill('rgba(148, 163, 184, 0.3)'),
            width: 1
          }
        },
        splitArea: {
          show: true,
          areaStyle: {
            color: [
              'rgba(24, 84, 139, 0.02)',
              'rgba(24, 84, 139, 0.04)',
              'rgba(24, 84, 139, 0.06)',
              'rgba(24, 84, 139, 0.08)'
            ]
          }
        },
        axisLine: {
          lineStyle: {
            color: 'rgba(148, 163, 184, 0.4)'
          }
        }
      },
      series: [
        // Outer glow effect
        {
          type: 'radar',
          data: [{
            value: values,
            areaStyle: {
              color: new echarts.graphic.RadialGradient(0.5, 0.5, 1, [
                { offset: 0, color: 'rgba(24, 84, 139, 0.6)' },
                { offset: 0.7, color: 'rgba(24, 84, 139, 0.2)' },
                { offset: 1, color: 'rgba(24, 84, 139, 0.05)' }
              ])
            },
            lineStyle: {
              color: 'transparent'
            },
            symbol: 'none'
          }],
          z: 1
        },
        // Main data layer
        {
          type: 'radar',
          data: [
            {
              value: values,
              name: 'Module Progress',
              areaStyle: {
                color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [
                  { offset: 0, color: 'rgba(24, 84, 139, 0.4)' },
                  { offset: 1, color: 'rgba(24, 84, 139, 0.1)' }
                ])
              },
              lineStyle: {
                color: '#18548b',
                width: 3,
                shadowColor: 'rgba(24, 84, 139, 0.5)',
                shadowBlur: 10
              },
              itemStyle: {
                color: '#18548b',
                borderColor: '#fff',
                borderWidth: 3,
                shadowColor: 'rgba(24, 84, 139, 0.5)',
                shadowBlur: 8
              },
              symbol: 'circle',
              symbolSize: 10,
              emphasis: {
                itemStyle: {
                  color: '#FF7F11',
                  borderColor: '#fff',
                  borderWidth: 3,
                  shadowColor: 'rgba(255, 127, 17, 0.6)',
                  shadowBlur: 15
                },
                areaStyle: {
                  color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [
                    { offset: 0, color: 'rgba(255, 127, 17, 0.3)' },
                    { offset: 1, color: 'rgba(255, 127, 17, 0.05)' }
                  ])
                }
              }
            }
          ],
          z: 2,
          animationDuration: 2000,
          animationEasing: 'elasticOut'
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
  }, [modules]);

  if (modules.length === 0) {
    return (
      <div className="w-full h-[220px] flex items-center justify-center text-slate-400 text-sm">
        No module data available
      </div>
    );
  }

  return <div ref={chartRef} className="w-full h-[220px]" />;
}
