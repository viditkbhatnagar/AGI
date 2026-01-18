// Quiz Performance Horizontal Bar Chart - Shows quiz scores with animated bars
import React, { useRef, useEffect } from 'react';
import * as echarts from 'echarts';

interface QuizScore {
  title: string;
  score: number;
}

interface QuizPerformanceChartProps {
  quizScores: QuizScore[];
  passingScore?: number;
}

export default function QuizPerformanceChart({ 
  quizScores, 
  passingScore = 70 
}: QuizPerformanceChartProps) {
  const chartRef = useRef<HTMLDivElement>(null);
  const chartInstance = useRef<echarts.ECharts | null>(null);

  useEffect(() => {
    if (!chartRef.current || quizScores.length === 0) return;

    chartInstance.current = echarts.init(chartRef.current);

    // Get best score per quiz and take last 6
    const bestScoresMap: Record<string, number> = {};
    quizScores.forEach(({ title, score }) => {
      if (!(title in bestScoresMap) || score > bestScoresMap[title]) {
        bestScoresMap[title] = score;
      }
    });

    const displayData = Object.entries(bestScoresMap)
      .slice(-6)
      .map(([title, score]) => ({
        title: title.length > 20 ? title.slice(0, 20) + '...' : title,
        fullTitle: title,
        score
      }));

    const option: echarts.EChartsOption = {
      tooltip: {
        trigger: 'axis',
        axisPointer: { type: 'shadow' },
        backgroundColor: 'rgba(15, 23, 42, 0.95)',
        borderColor: 'transparent',
        borderRadius: 12,
        padding: [12, 16],
        textStyle: { color: '#fff', fontSize: 13 },
        formatter: (params: any) => {
          const data = params[0];
          const item = displayData[data.dataIndex];
          const passed = data.value >= passingScore;
          return `
            <div style="font-weight: 600; margin-bottom: 8px; max-width: 200px; word-wrap: break-word;">
              ${item.fullTitle}
            </div>
            <div style="display: flex; align-items: center; gap: 12px;">
              <span style="font-size: 28px; font-weight: 700; color: ${passed ? '#8BC34A' : '#ef4444'};">
                ${data.value}%
              </span>
              <span style="padding: 2px 8px; border-radius: 6px; font-size: 11px; font-weight: 600; 
                background: ${passed ? 'rgba(139, 195, 74, 0.2)' : 'rgba(239, 68, 68, 0.2)'}; 
                color: ${passed ? '#8BC34A' : '#ef4444'};">
                ${passed ? 'PASSED' : 'RETRY'}
              </span>
            </div>
          `;
        }
      },
      grid: {
        left: 120,
        right: 50,
        top: 10,
        bottom: 10
      },
      xAxis: {
        type: 'value',
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
      yAxis: {
        type: 'category',
        data: displayData.map(d => d.title),
        axisLine: { show: false },
        axisTick: { show: false },
        axisLabel: {
          color: '#475569',
          fontSize: 11,
          fontWeight: 500,
          width: 100,
          overflow: 'truncate',
          ellipsis: '...'
        }
      },
      series: [
        // Background bars
        {
          type: 'bar',
          data: displayData.map(() => 100),
          barWidth: '60%',
          barGap: '-100%',
          itemStyle: {
            color: 'rgba(226, 232, 240, 0.5)',
            borderRadius: [0, 6, 6, 0]
          },
          silent: true,
          z: 0
        },
        // Passing threshold line
        {
          type: 'bar',
          data: displayData.map(() => passingScore),
          barWidth: '60%',
          barGap: '-100%',
          itemStyle: {
            color: 'transparent',
            borderColor: '#8BC34A',
            borderWidth: 0,
            borderType: 'dashed'
          },
          silent: true,
          z: 1,
          markLine: {
            symbol: 'none',
            silent: true,
            lineStyle: {
              color: '#8BC34A',
              type: 'dashed',
              width: 2
            },
            data: [{ xAxis: passingScore }],
            label: {
              formatter: 'Pass',
              position: 'end',
              color: '#8BC34A',
              fontSize: 10,
              fontWeight: 600
            }
          }
        },
        // Main score bars
        {
          type: 'bar',
          data: displayData.map((d, i) => ({
            value: d.score,
            itemStyle: {
              color: new echarts.graphic.LinearGradient(0, 0, 1, 0, [
                { offset: 0, color: d.score >= passingScore ? '#18548b' : '#ef4444' },
                { offset: 1, color: d.score >= passingScore ? '#8BC34A' : '#f87171' }
              ]),
              borderRadius: [0, 8, 8, 0],
              shadowColor: d.score >= passingScore 
                ? 'rgba(139, 195, 74, 0.3)' 
                : 'rgba(239, 68, 68, 0.3)',
              shadowBlur: 8,
              shadowOffsetX: 3
            }
          })),
          barWidth: '55%',
          label: {
            show: true,
            position: 'right',
            formatter: '{c}%',
            color: '#475569',
            fontSize: 11,
            fontWeight: 600
          },
          emphasis: {
            itemStyle: {
              shadowBlur: 15
            }
          },
          animationDuration: 1500,
          animationEasing: 'elasticOut',
          animationDelay: (idx) => idx * 150,
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
  }, [quizScores, passingScore]);

  if (quizScores.length === 0) {
    return (
      <div className="w-full h-[200px] flex flex-col items-center justify-center text-slate-400">
        <svg className="size-12 mb-2 opacity-40" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
        </svg>
        <p className="text-sm">No quiz attempts yet</p>
        <p className="text-xs mt-1">Complete quizzes to see your scores</p>
      </div>
    );
  }

  return <div ref={chartRef} className="w-full h-[200px]" />;
}
