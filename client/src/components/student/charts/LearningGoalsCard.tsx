// Learning Goals Card - Shows daily/weekly study goals with animated progress
import React from 'react';
import { Target, Flame, TrendingUp, CheckCircle2 } from 'lucide-react';

interface LearningGoalsCardProps {
  dailyGoalMinutes?: number;
  weeklyGoalMinutes?: number;
  todayMinutes: number;
  weekMinutes: number;
  streakDays: number;
}

export default function LearningGoalsCard({
  dailyGoalMinutes = 30,
  weeklyGoalMinutes = 150,
  todayMinutes,
  weekMinutes,
  streakDays
}: LearningGoalsCardProps) {
  
  const dailyProgress = Math.min(100, (todayMinutes / dailyGoalMinutes) * 100);
  const weeklyProgress = Math.min(100, (weekMinutes / weeklyGoalMinutes) * 100);
  const dailyCompleted = dailyProgress >= 100;
  const weeklyCompleted = weeklyProgress >= 100;

  const goals = [
    {
      id: 'daily',
      label: 'Daily Goal',
      current: todayMinutes,
      target: dailyGoalMinutes,
      progress: dailyProgress,
      completed: dailyCompleted,
      icon: Target,
      color: '#18548b',
      gradient: 'from-blue-500 to-cyan-400'
    },
    {
      id: 'weekly',
      label: 'Weekly Goal',
      current: weekMinutes,
      target: weeklyGoalMinutes,
      progress: weeklyProgress,
      completed: weeklyCompleted,
      icon: TrendingUp,
      color: '#8BC34A',
      gradient: 'from-green-500 to-emerald-400'
    }
  ];

  return (
    <div className="space-y-4">
      {/* Streak Banner */}
      {streakDays > 0 && (
        <div className="flex items-center gap-3 p-3 rounded-xl bg-gradient-to-r from-orange-50 to-amber-50 border border-orange-100">
          <div className="size-10 rounded-full bg-gradient-to-br from-orange-400 to-amber-500 flex items-center justify-center shadow-lg shadow-orange-200">
            <Flame className="size-5 text-white" />
          </div>
          <div>
            <p className="text-xs text-orange-600 font-medium">Current Streak</p>
            <p className="text-lg font-bold text-orange-700">
              {streakDays} day{streakDays > 1 ? 's' : ''} 🔥
            </p>
          </div>
          <div className="ml-auto flex -space-x-1">
            {[...Array(Math.min(streakDays, 7))].map((_, i) => (
              <div 
                key={i}
                className="size-3 rounded-full bg-gradient-to-br from-orange-400 to-amber-500 border border-white"
                style={{ 
                  opacity: 1 - (i * 0.1),
                  transform: `scale(${1 - (i * 0.05)})`
                }}
              />
            ))}
          </div>
        </div>
      )}

      {/* Goal Cards */}
      <div className="space-y-3">
        {goals.map((goal) => {
          const GoalIcon = goal.icon;
          
          return (
            <div 
              key={goal.id}
              className={`
                relative overflow-hidden rounded-xl p-4 transition-all duration-300
                ${goal.completed 
                  ? 'bg-gradient-to-r from-green-50 to-emerald-50 border border-green-200' 
                  : 'bg-white border border-slate-100 hover:border-slate-200 hover:shadow-sm'
                }
              `}
            >
              {/* Celebration effect when completed */}
              {goal.completed && (
                <div className="absolute top-0 right-0 w-24 h-24 bg-green-400/10 rounded-full blur-2xl -translate-y-1/2 translate-x-1/2" />
              )}

              <div className="relative">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <div 
                      className={`
                        size-8 rounded-lg flex items-center justify-center
                        ${goal.completed 
                          ? 'bg-green-500' 
                          : 'bg-slate-100'
                        }
                      `}
                    >
                      {goal.completed ? (
                        <CheckCircle2 className="size-4 text-white" />
                      ) : (
                        <GoalIcon className="size-4" style={{ color: goal.color }} />
                      )}
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-slate-800">{goal.label}</p>
                      <p className="text-[10px] text-slate-400">
                        {goal.current} / {goal.target} min
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className={`
                      text-lg font-bold
                      ${goal.completed ? 'text-green-600' : 'text-slate-700'}
                    `}>
                      {Math.round(goal.progress)}%
                    </p>
                    {goal.completed && (
                      <span className="text-[10px] text-green-600 font-medium">
                        ✓ Complete!
                      </span>
                    )}
                  </div>
                </div>

                {/* Progress Bar */}
                <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                  <div 
                    className={`
                      h-full rounded-full transition-all duration-1000 ease-out
                      ${goal.completed 
                        ? 'bg-gradient-to-r from-green-500 to-emerald-400' 
                        : `bg-gradient-to-r ${goal.gradient}`
                      }
                    `}
                    style={{ 
                      width: `${goal.progress}%`,
                      boxShadow: goal.completed 
                        ? '0 0 10px rgba(16, 185, 129, 0.4)' 
                        : `0 0 10px ${goal.color}40`
                    }}
                  />
                </div>

                {/* Milestone markers */}
                <div className="relative h-1 mt-1">
                  {[25, 50, 75, 100].map((milestone) => (
                    <div
                      key={milestone}
                      className={`
                        absolute top-0 w-0.5 h-1 rounded-full
                        ${goal.progress >= milestone ? 'bg-slate-400' : 'bg-slate-200'}
                      `}
                      style={{ left: `${milestone}%`, transform: 'translateX(-50%)' }}
                    />
                  ))}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Motivational Message */}
      <div className="text-center pt-2">
        <p className="text-xs text-slate-400">
          {dailyCompleted && weeklyCompleted 
            ? "🎉 Amazing! You've crushed all your goals!"
            : dailyCompleted 
              ? "Great job today! Keep the momentum going!"
              : `Just ${dailyGoalMinutes - todayMinutes} more minutes to reach your daily goal!`
          }
        </p>
      </div>
    </div>
  );
}
