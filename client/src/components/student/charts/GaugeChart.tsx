// Course Progress Gauge Chart - Enhanced with 3D effect and animations
import React, { useRef, useEffect } from 'react';
import * as echarts from 'echarts';

interface GaugeChartProps {
  progress: number;
  title?: string;
}

export default function GaugeChart({ progress, title = "Course Progress" }: GaugeChartProps) {
  const chartRef = useRef<HTMLDivElement>(null);
  const chartInstance = useRef<echarts.ECharts | null>(null);

  useEffect(() => {
    if (!chartRef.current) return;

    chartInstance.current = echarts.init(chartRef.current);

    const option: echarts.EChartsOption = {
      series: [
        // Background ring with subtle glow
        {
          type: 'gauge',
          center: ['50%', '55%'],
          startAngle: 220,
          endAngle: -40,
          min: 0,
          max: 100,
          splitNumber: 10,
          pointer: { show: false },
          progress: { show: false },
          axisLine: {
            lineStyle: {
              width: 25,
              color: [[1, 'rgba(226, 232, 240, 0.8)']]
            },
            roundCap: true
          },
          axisTick: { show: false },
          splitLine: { show: false },
          axisLabel: { show: false },
          detail: { show: false },
          data: []
        },
        // Main progress arc with gradient
        {
          type: 'gauge',
          center: ['50%', '55%'],
          startAngle: 220,
          endAngle: -40,
          min: 0,
          max: 100,
          splitNumber: 10,
          itemStyle: {
            color: new echarts.graphic.LinearGradient(0, 0, 1, 0, [
              { offset: 0, color: '#18548b' },
              { offset: 0.4, color: '#3b82f6' },
              { offset: 0.7, color: '#FF7F11' },
              { offset: 1, color: '#8BC34A' }
            ]),
            shadowColor: 'rgba(24, 84, 139, 0.4)',
            shadowBlur: 15,
            shadowOffsetY: 5
          },
          progress: {
            show: true,
            width: 25,
            roundCap: true
          },
          pointer: {
            show: true,
            length: '55%',
            width: 8,
            offsetCenter: [0, '-5%'],
            itemStyle: {
              color: '#18548b',
              shadowColor: 'rgba(24, 84, 139, 0.5)',
              shadowBlur: 10
            }
          },
          axisLine: {
            lineStyle: {
              width: 25,
              color: [[1, 'transparent']]
            },
            roundCap: true
          },
          axisTick: {
            show: true,
            distance: -35,
            length: 8,
            lineStyle: {
              color: '#cbd5e1',
              width: 2
            },
            splitNumber: 2
          },
          splitLine: {
            show: true,
            distance: -40,
            length: 14,
            lineStyle: {
              color: '#94a3b8',
              width: 3
            }
          },
          axisLabel: {
            show: true,
            distance: -55,
            color: '#64748b',
            fontSize: 10,
            fontWeight: 600,
            formatter: (value: number) => {
              if (value % 25 === 0) return `${value}`;
              return '';
            }
          },
          anchor: {
            show: true,
            size: 18,
            itemStyle: {
              color: '#18548b',
              borderColor: '#fff',
              borderWidth: 4,
              shadowColor: 'rgba(0, 0, 0, 0.2)',
              shadowBlur: 8
            }
          },
          title: {
            show: false
          },
          detail: {
            valueAnimation: true,
            width: '60%',
            lineHeight: 40,
            borderRadius: 8,
            offsetCenter: [0, '35%'],
            fontSize: 36,
            fontWeight: 'bold',
            formatter: '{value}%',
            color: '#18548b',
            fontFamily: 'system-ui, -apple-system, sans-serif'
          },
          data: [{ value: progress }],
          animationDuration: 2000,
          animationEasing: 'elasticOut'
        }
      ]
    };

    chartInstance.current.setOption(option);

    // Add hover interaction
    chartInstance.current.on('mouseover', () => {
      chartInstance.current?.setOption({
        series: [{}, {
          itemStyle: {
            shadowBlur: 25,
            shadowColor: 'rgba(24, 84, 139, 0.6)'
          }
        }]
      });
    });

    chartInstance.current.on('mouseout', () => {
      chartInstance.current?.setOption({
        series: [{}, {
          itemStyle: {
            shadowBlur: 15,
            shadowColor: 'rgba(24, 84, 139, 0.4)'
          }
        }]
      });
    });

    const handleResize = () => {
      chartInstance.current?.resize();
    };
    window.addEventListener('resize', handleResize);

    return () => {
      window.removeEventListener('resize', handleResize);
      chartInstance.current?.dispose();
    };
  }, [progress]);

  return (
    <div className="flex flex-col items-center">
      <div ref={chartRef} className="w-full h-[220px]" />
      <p className="text-sm font-semibold text-slate-600 -mt-2">{title}</p>
    </div>
  );
}
