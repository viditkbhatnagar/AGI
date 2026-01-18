// Weekly Activity Bar Chart - Enhanced with 3D bars, animations, and data zoom
import React, { useRef, useEffect } from 'react';
import * as echarts from 'echarts';

interface DailyWatchTime {
  date: string;
  minutes: number;
}

interface WeeklyActivityChartProps {
  dailyWatchTimes: DailyWatchTime[];
}

export default function WeeklyActivityChart({ dailyWatchTimes }: WeeklyActivityChartProps) {
  const chartRef = useRef<HTMLDivElement>(null);
  const chartInstance = useRef<echarts.ECharts | null>(null);

  useEffect(() => {
    if (!chartRef.current) return;

    chartInstance.current = echarts.init(chartRef.current);

    // Get last 7 days
    const last7Days = dailyWatchTimes.slice(-7);
    const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    const today = new Date().getDay();
    
    const xAxisData = last7Days.map((d, i) => {
      const date = new Date(d.date);
      const dayName = days[date.getDay()];
      const isToday = date.getDay() === today;
      return isToday ? `${dayName} ★` : dayName;
    });
    
    const values = last7Days.map(d => d.minutes);
    const maxValue = Math.max(...values, 60);
    const avgValue = values.reduce((a, b) => a + b, 0) / values.length;

    const option: echarts.EChartsOption = {
      tooltip: {
        trigger: 'axis',
        axisPointer: {
          type: 'none'
        },
        backgroundColor: 'rgba(15, 23, 42, 0.95)',
        borderColor: 'transparent',
        borderRadius: 12,
        padding: [12, 16],
        textStyle: { color: '#fff', fontSize: 13 },
        formatter: (params: any) => {
          const data = params[0];
          const percent = maxValue > 0 ? Math.round((data.value / maxValue) * 100) : 0;
          return `
            <div style="font-weight: 600; margin-bottom: 8px;">${data.name}</div>
            <div style="display: flex; align-items: center; gap: 12px;">
              <span style="color: #FF7F11; font-size: 24px; font-weight: 700;">${data.value}</span>
              <span style="color: #94a3b8;">minutes</span>
            </div>
            <div style="margin-top: 8px; display: flex; align-items: center; gap: 8px;">
              <div style="flex: 1; height: 4px; background: rgba(255,255,255,0.2); border-radius: 2px; overflow: hidden;">
                <div style="width: ${percent}%; height: 100%; background: linear-gradient(90deg, #FF7F11, #ff9a44); border-radius: 2px;"></div>
              </div>
              <span style="font-size: 11px; color: #94a3b8;">${percent}%</span>
            </div>
          `;
        }
      },
      grid: {
        left: 50,
        right: 20,
        top: 40,
        bottom: 35
      },
      xAxis: {
        type: 'category',
        data: xAxisData,
        axisLine: { 
          show: true,
          lineStyle: { color: '#e2e8f0' }
        },
        axisTick: { show: false },
        axisLabel: {
          color: '#64748b',
          fontSize: 11,
          fontWeight: 600,
          margin: 12
        }
      },
      yAxis: {
        type: 'value',
        max: maxValue + 10,
        splitNumber: 4,
        axisLine: { show: false },
        axisTick: { show: false },
        splitLine: {
          lineStyle: {
            color: '#f1f5f9',
            type: 'dashed'
          }
        },
        axisLabel: {
          color: '#94a3b8',
          fontSize: 10,
          formatter: (value: number) => `${value}m`
        }
      },
      // Average line
      markLine: {
        silent: true,
        symbol: 'none',
        lineStyle: {
          color: '#18548b',
          type: 'dashed',
          width: 2
        },
        data: [{
          yAxis: avgValue,
          label: {
            formatter: `Avg: ${Math.round(avgValue)}m`,
            position: 'end',
            color: '#18548b',
            fontSize: 10,
            fontWeight: 600,
            backgroundColor: 'rgba(24, 84, 139, 0.1)',
            padding: [4, 8],
            borderRadius: 4
          }
        }]
      },
      series: [
        // Shadow bars for 3D effect
        {
          type: 'bar',
          data: values.map(v => v * 0.15),
          barWidth: '55%',
          barGap: '-115%',
          itemStyle: {
            color: 'rgba(0, 0, 0, 0.08)',
            borderRadius: [6, 6, 0, 0]
          },
          animation: false,
          silent: true,
          z: 0
        },
        // Main bars
        {
          type: 'bar',
          data: values.map((v, i) => ({
            value: v,
            itemStyle: {
              color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [
                { offset: 0, color: v > avgValue ? '#FF7F11' : '#18548b' },
                { offset: 0.5, color: v > avgValue ? '#ff9a44' : '#3b82f6' },
                { offset: 1, color: v > avgValue ? '#ffc078' : '#60a5fa' }
              ]),
              borderRadius: [10, 10, 4, 4],
              shadowColor: v > avgValue ? 'rgba(255, 127, 17, 0.4)' : 'rgba(24, 84, 139, 0.3)',
              shadowBlur: 10,
              shadowOffsetY: 5
            }
          })),
          barWidth: '50%',
          emphasis: {
            itemStyle: {
              shadowBlur: 20,
              shadowOffsetY: 8
            }
          },
          animationDuration: 1500,
          animationEasing: 'elasticOut',
          animationDelay: (idx) => idx * 100,
          z: 1
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
  }, [dailyWatchTimes]);

  if (dailyWatchTimes.length === 0) {
    return (
      <div className="w-full h-[200px] flex items-center justify-center text-slate-400 text-sm">
        No activity data
      </div>
    );
  }

  return <div ref={chartRef} className="w-full h-[200px]" />;
}
