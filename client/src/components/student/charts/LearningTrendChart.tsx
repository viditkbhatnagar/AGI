// Learning Trend Line Chart - Enhanced with gradient area, animation, and data zoom
import React, { useRef, useEffect } from 'react';
import * as echarts from 'echarts';

interface ProgressPoint {
  date: string;
  percentComplete: number;
}

interface LearningTrendChartProps {
  progressData: ProgressPoint[];
}

export default function LearningTrendChart({ progressData }: LearningTrendChartProps) {
  const chartRef = useRef<HTMLDivElement>(null);
  const chartInstance = useRef<echarts.ECharts | null>(null);

  useEffect(() => {
    if (!chartRef.current || progressData.length === 0) return;

    chartInstance.current = echarts.init(chartRef.current);

    const dates = progressData.map(p => {
      const d = new Date(p.date);
      return `${d.getMonth() + 1}/${d.getDate()}`;
    });
    const values = progressData.map(p => p.percentComplete);
    const maxProgress = Math.max(...values);

    const option: echarts.EChartsOption = {
      tooltip: {
        trigger: 'axis',
        axisPointer: {
          type: 'cross',
          crossStyle: {
            color: '#18548b'
          },
          lineStyle: {
            color: '#18548b',
            type: 'dashed'
          }
        },
        backgroundColor: 'rgba(15, 23, 42, 0.95)',
        borderColor: 'transparent',
        borderRadius: 12,
        padding: [12, 16],
        textStyle: { color: '#fff', fontSize: 13 },
        formatter: (params: any) => {
          const data = params[0];
          const prevValue = data.dataIndex > 0 ? values[data.dataIndex - 1] : data.value;
          const change = data.value - prevValue;
          const changeColor = change >= 0 ? '#8BC34A' : '#ef4444';
          const changeIcon = change >= 0 ? '↑' : '↓';
          
          return `
            <div style="font-weight: 600; margin-bottom: 8px; color: #94a3b8;">${data.name}</div>
            <div style="display: flex; align-items: baseline; gap: 8px;">
              <span style="font-size: 28px; font-weight: 700; color: #fff;">${data.value}%</span>
              ${change !== 0 ? `<span style="color: ${changeColor}; font-size: 12px; font-weight: 600;">${changeIcon} ${Math.abs(change)}%</span>` : ''}
            </div>
            <div style="margin-top: 8px; height: 4px; background: rgba(255,255,255,0.2); border-radius: 2px; overflow: hidden;">
              <div style="width: ${data.value}%; height: 100%; background: linear-gradient(90deg, #18548b, #3b82f6); border-radius: 2px;"></div>
            </div>
          `;
        }
      },
      grid: {
        left: 50,
        right: 20,
        top: 30,
        bottom: 50
      },
      xAxis: {
        type: 'category',
        data: dates,
        boundaryGap: false,
        axisLine: {
          lineStyle: { color: '#e2e8f0' }
        },
        axisTick: { show: false },
        axisLabel: {
          color: '#64748b',
          fontSize: 10,
          margin: 12
        }
      },
      yAxis: {
        type: 'value',
        min: 0,
        max: 100,
        splitNumber: 5,
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
          formatter: '{value}%'
        }
      },
      dataZoom: [
        {
          type: 'inside',
          start: 0,
          end: 100,
          zoomOnMouseWheel: true,
          moveOnMouseMove: true
        },
        {
          type: 'slider',
          show: true,
          height: 20,
          bottom: 5,
          start: 0,
          end: 100,
          borderColor: 'transparent',
          backgroundColor: 'rgba(226, 232, 240, 0.5)',
          fillerColor: 'rgba(24, 84, 139, 0.2)',
          handleStyle: {
            color: '#18548b',
            borderColor: '#18548b'
          },
          textStyle: {
            color: '#64748b',
            fontSize: 10
          },
          dataBackground: {
            lineStyle: { color: '#18548b', opacity: 0.3 },
            areaStyle: { color: '#18548b', opacity: 0.1 }
          }
        }
      ],
      series: [
        // Background area for context
        {
          type: 'line',
          data: Array(values.length).fill(100),
          smooth: true,
          symbol: 'none',
          lineStyle: { width: 0 },
          areaStyle: {
            color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [
              { offset: 0, color: 'rgba(139, 195, 74, 0.05)' },
              { offset: 1, color: 'rgba(139, 195, 74, 0)' }
            ])
          },
          z: 0
        },
        // Main progress line
        {
          type: 'line',
          data: values,
          smooth: 0.5,
          symbol: 'circle',
          symbolSize: (value: number, params: any) => {
            // Larger symbol for max progress point
            return value === maxProgress ? 14 : 8;
          },
          lineStyle: {
            color: new echarts.graphic.LinearGradient(0, 0, 1, 0, [
              { offset: 0, color: '#18548b' },
              { offset: 0.5, color: '#3b82f6' },
              { offset: 1, color: '#8BC34A' }
            ]),
            width: 4,
            shadowColor: 'rgba(24, 84, 139, 0.3)',
            shadowBlur: 10,
            shadowOffsetY: 5
          },
          itemStyle: {
            color: '#18548b',
            borderWidth: 3,
            borderColor: '#fff',
            shadowColor: 'rgba(24, 84, 139, 0.4)',
            shadowBlur: 8
          },
          areaStyle: {
            color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [
              { offset: 0, color: 'rgba(24, 84, 139, 0.35)' },
              { offset: 0.5, color: 'rgba(59, 130, 246, 0.15)' },
              { offset: 1, color: 'rgba(139, 195, 74, 0.02)' }
            ])
          },
          emphasis: {
            itemStyle: {
              color: '#FF7F11',
              borderColor: '#fff',
              borderWidth: 4,
              shadowColor: 'rgba(255, 127, 17, 0.5)',
              shadowBlur: 15
            }
          },
          markPoint: {
            symbol: 'pin',
            symbolSize: 50,
            data: [
              { 
                type: 'max', 
                name: 'Peak',
                itemStyle: { color: '#8BC34A' },
                label: {
                  formatter: '{c}%',
                  color: '#fff',
                  fontWeight: 'bold'
                }
              }
            ],
            animationDuration: 500,
            animationDelay: 2000
          },
          animationDuration: 2500,
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
  }, [progressData]);

  if (progressData.length === 0) {
    return (
      <div className="w-full h-[240px] flex items-center justify-center text-slate-400 text-sm">
        No progress data available
      </div>
    );
  }

  return <div ref={chartRef} className="w-full h-[240px]" />;
}
