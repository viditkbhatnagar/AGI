// Activity Polar Chart - Shows activity distribution by day with polar coordinates
import React, { useRef, useEffect } from 'react';
import * as echarts from 'echarts';

interface DailyWatchTime {
  date: string;
  minutes: number;
}

interface ActivityPolarChartProps {
  dailyWatchTimes: DailyWatchTime[];
}

export default function ActivityPolarChart({ dailyWatchTimes }: ActivityPolarChartProps) {
  const chartRef = useRef<HTMLDivElement>(null);
  const chartInstance = useRef<echarts.ECharts | null>(null);

  useEffect(() => {
    if (!chartRef.current || dailyWatchTimes.length === 0) return;

    chartInstance.current = echarts.init(chartRef.current);

    // Aggregate by day of week
    const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    const dayTotals = Array(7).fill(0);
    const dayCounts = Array(7).fill(0);

    dailyWatchTimes.forEach(({ date, minutes }) => {
      const d = new Date(date);
      const day = d.getDay();
      dayTotals[day] += minutes;
      dayCounts[day]++;
    });

    const avgByDay = dayTotals.map((total, i) => 
      dayCounts[i] > 0 ? Math.round(total / dayCounts[i]) : 0
    );

    const maxAvg = Math.max(...avgByDay);

    const option: echarts.EChartsOption = {
      tooltip: {
        trigger: 'axis',
        axisPointer: {
          type: 'cross',
          crossStyle: { color: '#18548b' }
        },
        backgroundColor: 'rgba(15, 23, 42, 0.95)',
        borderColor: 'transparent',
        borderRadius: 12,
        padding: [12, 16],
        textStyle: { color: '#fff', fontSize: 13 },
        formatter: (params: any) => {
          const data = params[0];
          const dayIndex = dayNames.indexOf(data.name);
          const total = dayTotals[dayIndex];
          return `
            <div style="font-weight: 600; margin-bottom: 8px;">${data.name}</div>
            <div style="display: flex; align-items: baseline; gap: 6px;">
              <span style="font-size: 24px; font-weight: 700; color: #8BC34A;">${data.value}</span>
              <span style="color: #94a3b8;">avg min/day</span>
            </div>
            <div style="margin-top: 6px; color: #64748b; font-size: 11px;">
              Total: ${total} minutes
            </div>
          `;
        }
      },
      polar: {
        radius: ['20%', '75%']
      },
      radiusAxis: {
        type: 'value',
        max: maxAvg * 1.2,
        axisLine: { show: false },
        axisTick: { show: false },
        axisLabel: { show: false },
        splitLine: {
          lineStyle: {
            color: 'rgba(148, 163, 184, 0.2)',
            type: 'dashed'
          }
        }
      },
      angleAxis: {
        type: 'category',
        data: dayNames,
        boundaryGap: true,
        axisLine: { 
          lineStyle: { 
            color: 'rgba(148, 163, 184, 0.3)' 
          } 
        },
        axisTick: { show: false },
        axisLabel: {
          color: '#64748b',
          fontSize: 11,
          fontWeight: 600
        },
        splitLine: { show: false }
      },
      series: [
        // Background bars
        {
          type: 'bar',
          coordinateSystem: 'polar',
          data: Array(7).fill(maxAvg * 1.2),
          barWidth: '60%',
          itemStyle: {
            color: 'rgba(226, 232, 240, 0.4)',
            borderRadius: 4
          },
          silent: true,
          z: 0
        },
        // Main bars with gradient
        {
          type: 'bar',
          coordinateSystem: 'polar',
          data: avgByDay.map((val, i) => ({
            value: val,
            itemStyle: {
              color: new echarts.graphic.LinearGradient(0, 0, 1, 0, [
                { offset: 0, color: val === maxAvg ? '#FF7F11' : '#18548b' },
                { offset: 1, color: val === maxAvg ? '#ff9a44' : '#3b82f6' }
              ]),
              shadowColor: val === maxAvg ? 'rgba(255, 127, 17, 0.4)' : 'rgba(24, 84, 139, 0.3)',
              shadowBlur: 10,
              borderRadius: 6
            }
          })),
          barWidth: '55%',
          emphasis: {
            itemStyle: {
              shadowBlur: 20
            }
          },
          animationDuration: 2000,
          animationEasing: 'elasticOut',
          animationDelay: (idx) => idx * 150,
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
