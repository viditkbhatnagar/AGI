// Mini Sparkline Area Chart - Enhanced with gradient and smooth animations
import React, { useRef, useEffect } from 'react';
import * as echarts from 'echarts';

interface MiniAreaChartProps {
  data: number[];
  color?: string;
  height?: number;
}

export default function MiniAreaChart({ 
  data, 
  color = '#18548b',
  height = 60 
}: MiniAreaChartProps) {
  const chartRef = useRef<HTMLDivElement>(null);
  const chartInstance = useRef<echarts.ECharts | null>(null);

  useEffect(() => {
    if (!chartRef.current || data.length === 0) return;

    chartInstance.current = echarts.init(chartRef.current);

    const maxVal = Math.max(...data);
    const minVal = Math.min(...data);
    const lastVal = data[data.length - 1];
    const prevVal = data[data.length - 2] || lastVal;
    const isUp = lastVal >= prevVal;

    const option: echarts.EChartsOption = {
      grid: {
        left: 0,
        right: 0,
        top: 5,
        bottom: 0
      },
      xAxis: {
        type: 'category',
        show: false,
        data: data.map((_, i) => i)
      },
      yAxis: {
        type: 'value',
        show: false,
        min: minVal * 0.9,
        max: maxVal * 1.1
      },
      series: [
        // Glow effect layer
        {
          type: 'line',
          data: data,
          smooth: 0.6,
          symbol: 'none',
          lineStyle: {
            color: color,
            width: 6,
            opacity: 0.15
          },
          z: 0
        },
        // Main line
        {
          type: 'line',
          data: data,
          smooth: 0.6,
          symbol: 'none',
          lineStyle: {
            color: new echarts.graphic.LinearGradient(0, 0, 1, 0, [
              { offset: 0, color: color + '80' },
              { offset: 0.5, color: color },
              { offset: 1, color: isUp ? '#8BC34A' : '#ef4444' }
            ]),
            width: 2.5,
            shadowColor: color + '50',
            shadowBlur: 6,
            shadowOffsetY: 3
          },
          areaStyle: {
            color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [
              { offset: 0, color: color + '40' },
              { offset: 0.6, color: color + '15' },
              { offset: 1, color: color + '02' }
            ])
          },
          emphasis: {
            lineStyle: {
              width: 3
            }
          },
          animationDuration: 1500,
          animationEasing: 'cubicOut',
          z: 1
        },
        // End point marker
        {
          type: 'scatter',
          data: [[data.length - 1, lastVal]],
          symbol: 'circle',
          symbolSize: 8,
          itemStyle: {
            color: isUp ? '#8BC34A' : '#ef4444',
            borderColor: '#fff',
            borderWidth: 2,
            shadowColor: (isUp ? '#8BC34A' : '#ef4444') + '50',
            shadowBlur: 6
          },
          z: 2
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
  }, [data, color]);

  if (data.length === 0) {
    return <div style={{ width: '100%', height: `${height}px` }} />;
  }

  return <div ref={chartRef} style={{ width: '100%', height: `${height}px` }} />;
}
