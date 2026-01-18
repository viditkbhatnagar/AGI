// client/src/components/student/ProgressChart.tsx
import React, { useRef, useEffect } from 'react';
import * as echarts from 'echarts';

export interface DailyWatch {
  date: string;
  minutes: number;
}

interface WatchTime {
  thisWeek: string;
  total: string;
}

interface ProgressChartProps {
  data: DailyWatch[];
  watchTime: WatchTime;
}

export default function ProgressChart({ data, watchTime }: ProgressChartProps) {
  const chartRef = useRef<HTMLDivElement>(null);
  const chartInstance = useRef<echarts.ECharts | null>(null);

  useEffect(() => {
    if (!chartRef.current) return;

    // Initialize chart
    chartInstance.current = echarts.init(chartRef.current);

    // Get last 7 days of data
    const last7Days = data.slice(-7);
    const dayLabels = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
    
    // Map data to days of week
    const chartData = last7Days.map((item, index) => ({
      name: dayLabels[index] || item.date.slice(5),
      value: item.minutes,
      isWeekend: index >= 5
    }));

    const option: echarts.EChartsOption = {
      tooltip: {
        trigger: 'axis',
        axisPointer: {
          type: 'shadow'
        },
        formatter: (params: any) => {
          const data = params[0];
          return `<div class="font-medium">${data.name}</div>
                  <div class="text-[#18548b] font-bold">${data.value} minutes</div>`;
        },
        backgroundColor: 'rgba(255, 255, 255, 0.95)',
        borderColor: '#e2e8f0',
        borderWidth: 1,
        padding: [8, 12],
        textStyle: {
          color: '#334155'
        }
      },
      grid: {
        left: '3%',
        right: '4%',
        bottom: '12%',
        top: '8%',
        containLabel: true
      },
      xAxis: {
        type: 'category',
        data: chartData.map(d => d.name),
        axisLine: {
          lineStyle: {
            color: '#e2e8f0'
          }
        },
        axisTick: {
          show: false
        },
        axisLabel: {
          color: '#64748b',
          fontSize: 12,
          fontWeight: 500
        }
      },
      yAxis: {
        type: 'value',
        axisLine: {
          show: false
        },
        axisTick: {
          show: false
        },
        splitLine: {
          lineStyle: {
            color: '#f1f5f9',
            type: 'dashed'
          }
        },
        axisLabel: {
          color: '#94a3b8',
          fontSize: 11
        }
      },
      series: [
        {
          name: 'Watch Time',
          type: 'bar',
          barWidth: '60%',
          data: chartData.map(d => ({
            value: d.value,
            itemStyle: {
              color: d.isWeekend ? '#8BC34A' : '#18548b',
              borderRadius: [4, 4, 0, 0]
            }
          })),
          emphasis: {
            itemStyle: {
              color: '#FF7F11'
            }
          },
          animationDuration: 1000,
          animationEasing: 'cubicOut'
        }
      ]
    };

    chartInstance.current.setOption(option);

    // Handle resize
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
    <div className="w-full">
      <div ref={chartRef} className="w-full h-[280px]" />
      <div className="mt-4 flex items-center justify-between text-sm">
        <p className="text-slate-500">
          Weekly: <span className="font-bold text-[#18548b]">{watchTime.thisWeek}</span>
        </p>
        <p className="text-slate-500">
          Total: <span className="font-bold text-[#FF7F11]">{watchTime.total}</span>
        </p>
      </div>
    </div>
  );
}
