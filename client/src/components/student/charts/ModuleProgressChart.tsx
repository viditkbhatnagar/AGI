// Module Progress Chart - Interactive horizontal bars with animations
import React, { useRef, useEffect, useState } from 'react';
import * as echarts from 'echarts';

interface ModuleData {
  title: string;
  percentComplete: number;
}

interface ModuleProgressChartProps {
  modules: ModuleData[];
}

export default function ModuleProgressChart({ modules }: ModuleProgressChartProps) {
  const chartRef = useRef<HTMLDivElement>(null);
  const chartInstance = useRef<echarts.ECharts | null>(null);
  const [selectedModule, setSelectedModule] = useState<string | null>(null);

  useEffect(() => {
    if (!chartRef.current || modules.length === 0) return;

    chartInstance.current = echarts.init(chartRef.current);

    // Sort modules by progress for better visualization
    const sortedModules = [...modules].sort((a, b) => b.percentComplete - a.percentComplete);
    const displayModules = sortedModules.slice(0, 8); // Show top 8 modules
    
    const categories = displayModules.map(m => 
      m.title.length > 20 ? m.title.slice(0, 20) + '...' : m.title
    );
    const values = displayModules.map(m => m.percentComplete);
    const fullTitles = displayModules.map(m => m.title);

    const option: echarts.EChartsOption = {
      tooltip: {
        trigger: 'axis',
        axisPointer: {
          type: 'shadow'
        },
        backgroundColor: 'rgba(15, 23, 42, 0.95)',
        borderColor: 'transparent',
        borderRadius: 12,
        padding: [16, 20],
        textStyle: { color: '#fff', fontSize: 13 },
        formatter: (params: any) => {
          const data = params[0];
          const idx = data.dataIndex;
          const fullTitle = fullTitles[idx];
          const value = data.value;
          const status = value >= 100 ? '✅ Completed' : 
                        value >= 75 ? '🔥 Almost there!' : 
                        value >= 50 ? '💪 Good progress' : 
                        value >= 25 ? '📚 Keep going' : '🚀 Just started';
          
          return `
            <div style="max-width: 280px;">
              <div style="font-weight: 700; margin-bottom: 10px; font-size: 14px; line-height: 1.3;">
                ${fullTitle}
              </div>
              <div style="display: flex; align-items: center; gap: 12px; margin-bottom: 12px;">
                <div style="flex: 1; height: 8px; background: rgba(255,255,255,0.15); border-radius: 4px; overflow: hidden;">
                  <div style="width: ${value}%; height: 100%; background: linear-gradient(90deg, ${getProgressColor(value)}); border-radius: 4px; transition: width 0.5s;"></div>
                </div>
                <span style="font-size: 18px; font-weight: 700; min-width: 50px;">${value}%</span>
              </div>
              <div style="color: #94a3b8; font-size: 12px;">${status}</div>
            </div>
          `;
        }
      },
      grid: {
        left: 120,
        right: 60,
        top: 20,
        bottom: 20
      },
      xAxis: {
        type: 'value',
        max: 100,
        axisLine: { show: false },
        axisTick: { show: false },
        splitLine: {
          lineStyle: {
            color: 'rgba(148, 163, 184, 0.15)',
            type: 'dashed'
          }
        },
        axisLabel: {
          color: '#94a3b8',
          fontSize: 10,
          formatter: '{value}%'
        }
      },
      yAxis: {
        type: 'category',
        data: categories,
        inverse: true,
        axisLine: { show: false },
        axisTick: { show: false },
        axisLabel: {
          color: '#475569',
          fontSize: 11,
          fontWeight: 500,
          width: 110,
          overflow: 'truncate',
          ellipsis: '...'
        }
      },
      series: [
        // Background bars
        {
          type: 'bar',
          data: Array(values.length).fill(100),
          barWidth: 16,
          barGap: '-100%',
          itemStyle: {
            color: 'rgba(226, 232, 240, 0.5)',
            borderRadius: 8
          },
          silent: true,
          animation: false,
          z: 0
        },
        // Progress bars
        {
          type: 'bar',
          data: values.map((v, i) => ({
            value: v,
            itemStyle: {
              color: new echarts.graphic.LinearGradient(0, 0, 1, 0, [
                { offset: 0, color: getStartColor(v) },
                { offset: 1, color: getEndColor(v) }
              ]),
              borderRadius: 8,
              shadowColor: getShadowColor(v),
              shadowBlur: 8,
              shadowOffsetX: 2
            }
          })),
          barWidth: 16,
          label: {
            show: true,
            position: 'right',
            formatter: '{c}%',
            color: '#475569',
            fontSize: 11,
            fontWeight: 600,
            distance: 8
          },
          emphasis: {
            itemStyle: {
              shadowBlur: 15,
              shadowOffsetX: 4
            }
          },
          animationDuration: 1500,
          animationEasing: 'elasticOut',
          animationDelay: (idx) => idx * 100,
          z: 1
        },
        // Completion indicators
        {
          type: 'scatter',
          data: values.map((v, i) => v >= 100 ? [100, i] : null).filter(Boolean),
          symbol: 'circle',
          symbolSize: 24,
          itemStyle: {
            color: '#8BC34A',
            shadowColor: 'rgba(139, 195, 74, 0.5)',
            shadowBlur: 10
          },
          label: {
            show: true,
            formatter: '✓',
            color: '#fff',
            fontSize: 12,
            fontWeight: 'bold'
          },
          z: 2
        }
      ]
    };

    chartInstance.current.setOption(option);

    // Add click interaction
    chartInstance.current.on('click', (params: any) => {
      if (params.dataIndex !== undefined) {
        const moduleName = fullTitles[params.dataIndex];
        setSelectedModule(prev => prev === moduleName ? null : moduleName);
      }
    });

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
        <svg className="size-12 mb-3 opacity-30" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
        </svg>
        <p className="text-sm font-medium">No modules available</p>
      </div>
    );
  }

  // Calculate summary stats
  const avgProgress = Math.round(modules.reduce((acc, m) => acc + m.percentComplete, 0) / modules.length);
  const completedCount = modules.filter(m => m.percentComplete >= 100).length;

  return (
    <div>
      {/* Summary stats */}
      <div className="flex items-center gap-4 mb-4 px-2">
        <div className="flex items-center gap-2 px-3 py-1.5 bg-white/60 rounded-lg">
          <div className="size-2 rounded-full bg-[#18548b]" />
          <span className="text-xs text-slate-600">Avg: <strong className="text-[#18548b]">{avgProgress}%</strong></span>
        </div>
        <div className="flex items-center gap-2 px-3 py-1.5 bg-white/60 rounded-lg">
          <div className="size-2 rounded-full bg-[#8BC34A]" />
          <span className="text-xs text-slate-600">Done: <strong className="text-[#8BC34A]">{completedCount}/{modules.length}</strong></span>
        </div>
      </div>
      
      <div ref={chartRef} className="w-full h-[280px]" />
      
      {modules.length > 8 && (
        <p className="text-xs text-slate-400 text-center mt-2">
          Showing top 8 modules • {modules.length - 8} more
        </p>
      )}
    </div>
  );
}

// Helper functions for gradient colors based on progress
function getStartColor(value: number): string {
  if (value >= 100) return '#4CAF50';
  if (value >= 75) return '#8BC34A';
  if (value >= 50) return '#FF7F11';
  if (value >= 25) return '#18548b';
  return '#64748b';
}

function getEndColor(value: number): string {
  if (value >= 100) return '#81C784';
  if (value >= 75) return '#AED581';
  if (value >= 50) return '#FFB74D';
  if (value >= 25) return '#42A5F5';
  return '#94a3b8';
}

function getShadowColor(value: number): string {
  if (value >= 100) return 'rgba(76, 175, 80, 0.4)';
  if (value >= 75) return 'rgba(139, 195, 74, 0.4)';
  if (value >= 50) return 'rgba(255, 127, 17, 0.4)';
  if (value >= 25) return 'rgba(24, 84, 139, 0.4)';
  return 'rgba(100, 116, 139, 0.3)';
}

function getProgressColor(value: number): string {
  if (value >= 100) return '#4CAF50, #81C784';
  if (value >= 75) return '#8BC34A, #AED581';
  if (value >= 50) return '#FF7F11, #FFB74D';
  if (value >= 25) return '#18548b, #42A5F5';
  return '#64748b, #94a3b8';
}
