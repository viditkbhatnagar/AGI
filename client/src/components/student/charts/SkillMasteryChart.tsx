// Skill Mastery Radar Chart - Enhanced radar showing module mastery levels
import React, { useRef, useEffect } from 'react';
import * as echarts from 'echarts';

interface ModuleData {
  title: string;
  percentComplete: number;
}

interface SkillMasteryChartProps {
  modules: ModuleData[];
}

export default function SkillMasteryChart({ modules }: SkillMasteryChartProps) {
  const chartRef = useRef<HTMLDivElement>(null);
  const chartInstance = useRef<echarts.ECharts | null>(null);

  useEffect(() => {
    if (!chartRef.current || modules.length === 0) return;

    chartInstance.current = echarts.init(chartRef.current);

    // Take first 8 modules for radar chart
    const displayModules = modules.slice(0, 8);
    
    const indicator = displayModules.map(m => ({
      name: m.title.length > 15 ? m.title.slice(0, 15) + '...' : m.title,
      max: 100
    }));

    const values = displayModules.map(m => m.percentComplete);
    const avgValue = values.reduce((a, b) => a + b, 0) / values.length;

    // Create target line (goal of 100%)
    const targetValues = displayModules.map(() => 100);
    
    // Create milestone line (75% milestone)
    const milestoneValues = displayModules.map(() => 75);

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
          if (params.seriesName === 'Your Progress') {
            const idx = params.dataIndex;
            const mod = displayModules[idx];
            if (!mod) return '';
            
            const mastery = mod.percentComplete >= 90 ? 'Master' 
              : mod.percentComplete >= 75 ? 'Proficient'
              : mod.percentComplete >= 50 ? 'Learning'
              : 'Beginner';
            
            const masteryColor = mod.percentComplete >= 90 ? '#8BC34A' 
              : mod.percentComplete >= 75 ? '#3b82f6'
              : mod.percentComplete >= 50 ? '#FF7F11'
              : '#94a3b8';
            
            return `
              <div style="font-weight: 600; margin-bottom: 8px; max-width: 180px;">${mod.title}</div>
              <div style="display: flex; align-items: center; gap: 12px; margin-bottom: 8px;">
                <span style="font-size: 28px; font-weight: 700;">${mod.percentComplete}%</span>
                <span style="padding: 2px 8px; border-radius: 6px; font-size: 10px; font-weight: 600; 
                  background: ${masteryColor}30; color: ${masteryColor};">
                  ${mastery}
                </span>
              </div>
              <div style="width: 100%; height: 6px; background: rgba(255,255,255,0.2); border-radius: 3px; overflow: hidden;">
                <div style="width: ${mod.percentComplete}%; height: 100%; background: linear-gradient(90deg, #18548b, #8BC34A); border-radius: 3px;"></div>
              </div>
            `;
          }
          return '';
        }
      },
      legend: {
        show: true,
        bottom: 0,
        left: 'center',
        itemWidth: 16,
        itemHeight: 8,
        itemGap: 20,
        textStyle: {
          color: '#64748b',
          fontSize: 10
        },
        data: [
          { name: 'Your Progress', icon: 'roundRect' },
          { name: 'Target', icon: 'line' }
        ]
      },
      radar: {
        indicator,
        shape: 'polygon',
        radius: '60%',
        center: ['50%', '48%'],
        splitNumber: 4,
        axisName: {
          color: '#475569',
          fontSize: 9,
          fontWeight: 500,
          padding: [2, 4],
          borderRadius: 4,
          backgroundColor: 'rgba(241, 245, 249, 0.9)'
        },
        splitLine: {
          lineStyle: {
            color: [
              'rgba(148, 163, 184, 0.1)',
              'rgba(148, 163, 184, 0.15)',
              'rgba(148, 163, 184, 0.2)',
              'rgba(148, 163, 184, 0.25)',
              'rgba(148, 163, 184, 0.3)'
            ],
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
              'rgba(24, 84, 139, 0.08)',
              'rgba(139, 195, 74, 0.08)'
            ]
          }
        },
        axisLine: {
          lineStyle: {
            color: 'rgba(148, 163, 184, 0.3)'
          }
        }
      },
      series: [
        // Target line (100%)
        {
          type: 'radar',
          name: 'Target',
          data: [{
            value: targetValues,
            areaStyle: { color: 'transparent' },
            lineStyle: {
              color: 'rgba(139, 195, 74, 0.4)',
              width: 2,
              type: 'dashed'
            },
            symbol: 'none'
          }],
          z: 1
        },
        // Background glow
        {
          type: 'radar',
          name: 'Glow',
          data: [{
            value: values.map(v => v * 1.05),
            areaStyle: {
              color: new echarts.graphic.RadialGradient(0.5, 0.5, 1, [
                { offset: 0, color: 'rgba(24, 84, 139, 0.4)' },
                { offset: 0.7, color: 'rgba(24, 84, 139, 0.1)' },
                { offset: 1, color: 'rgba(24, 84, 139, 0)' }
              ])
            },
            lineStyle: { color: 'transparent' },
            symbol: 'none'
          }],
          silent: true,
          z: 2
        },
        // Main data layer
        {
          type: 'radar',
          name: 'Your Progress',
          data: [
            {
              value: values,
              areaStyle: {
                color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [
                  { offset: 0, color: 'rgba(24, 84, 139, 0.5)' },
                  { offset: 0.5, color: 'rgba(59, 130, 246, 0.3)' },
                  { offset: 1, color: 'rgba(139, 195, 74, 0.1)' }
                ])
              },
              lineStyle: {
                color: new echarts.graphic.LinearGradient(0, 0, 1, 1, [
                  { offset: 0, color: '#18548b' },
                  { offset: 0.5, color: '#3b82f6' },
                  { offset: 1, color: '#8BC34A' }
                ]),
                width: 3,
                shadowColor: 'rgba(24, 84, 139, 0.4)',
                shadowBlur: 10
              },
              itemStyle: {
                color: '#18548b',
                borderColor: '#fff',
                borderWidth: 3,
                shadowColor: 'rgba(24, 84, 139, 0.4)',
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
                }
              }
            }
          ],
          z: 3,
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
      <div className="w-full h-[280px] flex flex-col items-center justify-center text-slate-400">
        <svg className="size-12 mb-2 opacity-40" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
        </svg>
        <p className="text-sm">No module data available</p>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <div ref={chartRef} className="w-full h-[280px]" />
      
      {/* Mastery Legend */}
      <div className="flex flex-wrap justify-center gap-4 text-[10px]">
        {[
          { label: 'Master', range: '90-100%', color: '#8BC34A' },
          { label: 'Proficient', range: '75-89%', color: '#3b82f6' },
          { label: 'Learning', range: '50-74%', color: '#FF7F11' },
          { label: 'Beginner', range: '0-49%', color: '#94a3b8' }
        ].map(level => (
          <div key={level.label} className="flex items-center gap-1.5">
            <div 
              className="size-2 rounded-full"
              style={{ backgroundColor: level.color }}
            />
            <span className="text-slate-600 font-medium">{level.label}</span>
            <span className="text-slate-400">({level.range})</span>
          </div>
        ))}
      </div>
    </div>
  );
}
