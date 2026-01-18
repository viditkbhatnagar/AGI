// Performance Scorecard - Animated KPI card with score breakdown
import React, { useEffect, useState } from 'react';
import { TrendingUp, TrendingDown, Minus, Award, BookOpen, Clock, Brain } from 'lucide-react';

interface PerformanceScorecardProps {
  courseProgress: number;
  quizAverage: number | null;
  watchTimeMinutes: number;
  modulesCompleted: number;
  totalModules: number;
}

export default function PerformanceScorecard({
  courseProgress,
  quizAverage,
  watchTimeMinutes,
  modulesCompleted,
  totalModules
}: PerformanceScorecardProps) {
  const [animatedScore, setAnimatedScore] = useState(0);

  // Calculate overall performance score (0-100)
  const calculateOverallScore = () => {
    let score = 0;
    let factors = 0;

    // Course progress (weight: 40%)
    score += courseProgress * 0.4;
    factors += 0.4;

    // Quiz performance (weight: 35%)
    if (quizAverage !== null) {
      score += quizAverage * 0.35;
      factors += 0.35;
    }

    // Study dedication - based on average daily study time (weight: 25%)
    // Assuming 30 min/day is good = 100 points
    const avgDailyMinutes = watchTimeMinutes / 30; // rough estimate
    const studyScore = Math.min(100, (avgDailyMinutes / 30) * 100);
    score += studyScore * 0.25;
    factors += 0.25;

    return Math.round((score / factors) * 10) / 10;
  };

  const overallScore = calculateOverallScore();

  // Animate the score on mount
  useEffect(() => {
    const duration = 2000;
    const steps = 60;
    const increment = overallScore / steps;
    let current = 0;
    
    const timer = setInterval(() => {
      current += increment;
      if (current >= overallScore) {
        setAnimatedScore(overallScore);
        clearInterval(timer);
      } else {
        setAnimatedScore(Math.round(current * 10) / 10);
      }
    }, duration / steps);

    return () => clearInterval(timer);
  }, [overallScore]);

  // Get score grade and color
  const getGrade = (score: number) => {
    if (score >= 90) return { grade: 'A+', color: '#10b981', bg: 'from-emerald-500 to-green-400' };
    if (score >= 80) return { grade: 'A', color: '#22c55e', bg: 'from-green-500 to-emerald-400' };
    if (score >= 70) return { grade: 'B', color: '#84cc16', bg: 'from-lime-500 to-green-400' };
    if (score >= 60) return { grade: 'C', color: '#eab308', bg: 'from-yellow-500 to-amber-400' };
    if (score >= 50) return { grade: 'D', color: '#f97316', bg: 'from-orange-500 to-amber-400' };
    return { grade: 'F', color: '#ef4444', bg: 'from-red-500 to-orange-400' };
  };

  const gradeInfo = getGrade(overallScore);

  // Performance breakdown
  const metrics = [
    {
      label: 'Course Progress',
      value: courseProgress,
      icon: BookOpen,
      trend: courseProgress > 50 ? 'up' : courseProgress > 0 ? 'neutral' : 'down',
      color: '#18548b'
    },
    {
      label: 'Quiz Average',
      value: quizAverage ?? 0,
      icon: Brain,
      trend: (quizAverage ?? 0) >= 70 ? 'up' : (quizAverage ?? 0) > 50 ? 'neutral' : 'down',
      color: '#8BC34A'
    },
    {
      label: 'Dedication',
      value: Math.min(100, Math.round((watchTimeMinutes / 300) * 100)),
      icon: Clock,
      trend: watchTimeMinutes > 180 ? 'up' : watchTimeMinutes > 60 ? 'neutral' : 'down',
      color: '#FF7F11'
    }
  ];

  const TrendIcon = ({ trend }: { trend: string }) => {
    if (trend === 'up') return <TrendingUp className="size-3 text-green-500" />;
    if (trend === 'down') return <TrendingDown className="size-3 text-red-500" />;
    return <Minus className="size-3 text-slate-400" />;
  };

  return (
    <div className="space-y-5">
      {/* Main Score Display */}
      <div className="relative">
        {/* Glow effect */}
        <div 
          className="absolute inset-0 rounded-2xl blur-xl opacity-30"
          style={{ background: gradeInfo.color }}
        />
        
        <div className="relative bg-gradient-to-br from-slate-900 to-slate-800 rounded-2xl p-6 text-white overflow-hidden">
          {/* Background decoration */}
          <div className="absolute top-0 right-0 w-32 h-32 bg-white/5 rounded-full blur-2xl -translate-y-1/2 translate-x-1/2" />
          <div className="absolute bottom-0 left-0 w-24 h-24 bg-white/5 rounded-full blur-xl translate-y-1/2 -translate-x-1/2" />
          
          <div className="relative flex items-center justify-between">
            <div>
              <p className="text-slate-400 text-xs font-medium uppercase tracking-wider mb-1">
                Performance Score
              </p>
              <div className="flex items-baseline gap-2">
                <span className="text-5xl font-black tabular-nums">
                  {animatedScore}
                </span>
                <span className="text-slate-400 text-lg">/100</span>
              </div>
              <div className="flex items-center gap-2 mt-2">
                <span 
                  className="px-2 py-0.5 rounded text-xs font-bold"
                  style={{ 
                    backgroundColor: gradeInfo.color + '30',
                    color: gradeInfo.color 
                  }}
                >
                  Grade: {gradeInfo.grade}
                </span>
                <span className="text-slate-500 text-xs">
                  {modulesCompleted}/{totalModules} modules
                </span>
              </div>
            </div>

            {/* Circular progress indicator */}
            <div className="relative size-24">
              <svg className="size-full -rotate-90" viewBox="0 0 100 100">
                {/* Background circle */}
                <circle
                  cx="50"
                  cy="50"
                  r="42"
                  fill="none"
                  stroke="rgba(255,255,255,0.1)"
                  strokeWidth="8"
                />
                {/* Progress circle */}
                <circle
                  cx="50"
                  cy="50"
                  r="42"
                  fill="none"
                  stroke={gradeInfo.color}
                  strokeWidth="8"
                  strokeLinecap="round"
                  strokeDasharray={`${animatedScore * 2.64} 264`}
                  className="transition-all duration-1000"
                  style={{
                    filter: `drop-shadow(0 0 6px ${gradeInfo.color})`
                  }}
                />
              </svg>
              <div className="absolute inset-0 flex items-center justify-center">
                <Award className="size-8" style={{ color: gradeInfo.color }} />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Metrics Breakdown */}
      <div className="grid grid-cols-3 gap-3">
        {metrics.map((metric) => {
          const MetricIcon = metric.icon;
          
          return (
            <div 
              key={metric.label}
              className="bg-white rounded-xl p-3 border border-slate-100 hover:border-slate-200 hover:shadow-sm transition-all"
            >
              <div className="flex items-center justify-between mb-2">
                <div 
                  className="size-7 rounded-lg flex items-center justify-center"
                  style={{ backgroundColor: metric.color + '15' }}
                >
                  <MetricIcon className="size-3.5" style={{ color: metric.color }} />
                </div>
                <TrendIcon trend={metric.trend} />
              </div>
              <p className="text-lg font-bold text-slate-800">{metric.value}%</p>
              <p className="text-[10px] text-slate-400 leading-tight">{metric.label}</p>
            </div>
          );
        })}
      </div>

      {/* Performance tip */}
      <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-xl p-3 border border-blue-100">
        <p className="text-xs text-blue-800">
          💡 <span className="font-medium">Tip:</span>{' '}
          {courseProgress < 50 
            ? "Keep watching videos to boost your progress score!"
            : (quizAverage ?? 0) < 70 
              ? "Practice more quizzes to improve your performance!"
              : "Great job! Maintain your momentum to achieve excellence!"
          }
        </p>
      </div>
    </div>
  );
}
