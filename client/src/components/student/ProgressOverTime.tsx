// components/student/ProgressOverTime.tsx
import React, { useRef, useEffect } from 'react';
import * as echarts from 'echarts';

interface ProgressOverTimeProps {
  dates: { date: string; percent: number }[];
}

export default function ProgressOverTime({ dates }: ProgressOverTimeProps) {
  const chartRef = useRef<HTMLDivElement>(null);
  const chartInstance = useRef<echarts.ECharts | null>(null);

  useEffect(() => {
    if (!chartRef.current || dates.length === 0) return;

    chartInstance.current = echarts.init(chartRef.current);

    const option: echarts.EChartsOption = {
      tooltip: {
        trigger: 'axis',
        formatter: (params: any) => {
          const data = params[0];
          return `<div class="font-medium">${data.name}</div>
                  <div class="text-[#18548b] font-bold">${data.value}%</div>`;
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
        left: '8%',
        right: '5%',
        bottom: '12%',
        top: '10%',
        containLabel: true
      },
      xAxis: {
        type: 'category',
        data: dates.map(d => d.date),
        boundaryGap: false,
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
          fontSize: 11
        }
      },
      yAxis: {
        type: 'value',
        min: 0,
        max: 100,
        interval: 25,
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
          fontSize: 11,
          formatter: '{value}%'
        }
      },
      series: [
        {
          name: 'Progress',
          type: 'line',
          data: dates.map(d => d.percent),
          smooth: true,
          symbol: 'circle',
          symbolSize: 8,
          lineStyle: {
            color: '#18548b',
            width: 3
          },
          itemStyle: {
            color: '#18548b',
            borderColor: '#fff',
            borderWidth: 2
          },
          areaStyle: {
            color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [
              { offset: 0, color: 'rgba(24, 84, 139, 0.3)' },
              { offset: 1, color: 'rgba(24, 84, 139, 0.05)' }
            ])
          },
          emphasis: {
            itemStyle: {
              color: '#FF7F11',
              borderColor: '#fff',
              borderWidth: 2,
              shadowColor: 'rgba(255, 127, 17, 0.3)',
              shadowBlur: 10
            }
          },
          animationDuration: 1500,
          animationEasing: 'cubicOut'
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
  }, [dates]);

  if (dates.length === 0) {
    return (
      <div className="w-full h-[240px] flex items-center justify-center text-slate-400 text-sm">
        No data available for selected date range
      </div>
    );
  }

  return <div ref={chartRef} className="w-full h-[240px]" />;
}
