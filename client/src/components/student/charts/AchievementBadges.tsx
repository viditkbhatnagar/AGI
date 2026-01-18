// Achievement Badges Component - Gamification element showing earned achievements
import React from 'react';
import { Trophy, Star, Zap, Target, Award, BookOpen, Clock, TrendingUp } from 'lucide-react';

interface Achievement {
  id: string;
  title: string;
  description: string;
  icon: 'trophy' | 'star' | 'zap' | 'target' | 'award' | 'book' | 'clock' | 'trending';
  earned: boolean;
  progress?: number;
  color: string;
}

interface AchievementBadgesProps {
  courseProgress: number;
  modulesCompleted: number;
  totalModules: number;
  watchTimeMinutes: number;
  quizAverage: number | null;
  streakDays: number;
}

const iconMap = {
  trophy: Trophy,
  star: Star,
  zap: Zap,
  target: Target,
  award: Award,
  book: BookOpen,
  clock: Clock,
  trending: TrendingUp,
};

export default function AchievementBadges({
  courseProgress,
  modulesCompleted,
  totalModules,
  watchTimeMinutes,
  quizAverage,
  streakDays
}: AchievementBadgesProps) {
  
  // Generate achievements based on actual progress
  const achievements: Achievement[] = [
    {
      id: 'first-step',
      title: 'First Step',
      description: 'Complete your first module',
      icon: 'star',
      earned: modulesCompleted >= 1,
      progress: Math.min(100, (modulesCompleted / 1) * 100),
      color: '#FFD700'
    },
    {
      id: 'on-fire',
      title: 'On Fire!',
      description: '3+ day learning streak',
      icon: 'zap',
      earned: streakDays >= 3,
      progress: Math.min(100, (streakDays / 3) * 100),
      color: '#FF7F11'
    },
    {
      id: 'halfway',
      title: 'Halfway Hero',
      description: 'Complete 50% of course',
      icon: 'target',
      earned: courseProgress >= 50,
      progress: Math.min(100, (courseProgress / 50) * 100),
      color: '#8BC34A'
    },
    {
      id: 'quiz-master',
      title: 'Quiz Master',
      description: 'Score 80%+ average on quizzes',
      icon: 'award',
      earned: (quizAverage ?? 0) >= 80,
      progress: quizAverage ? Math.min(100, (quizAverage / 80) * 100) : 0,
      color: '#18548b'
    },
    {
      id: 'dedicated',
      title: 'Dedicated',
      description: 'Study for 5+ hours total',
      icon: 'clock',
      earned: watchTimeMinutes >= 300,
      progress: Math.min(100, (watchTimeMinutes / 300) * 100),
      color: '#9333ea'
    },
    {
      id: 'completionist',
      title: 'Completionist',
      description: 'Complete all modules',
      icon: 'trophy',
      earned: modulesCompleted >= totalModules && totalModules > 0,
      progress: totalModules > 0 ? Math.min(100, (modulesCompleted / totalModules) * 100) : 0,
      color: '#FFD700'
    }
  ];

  const earnedCount = achievements.filter(a => a.earned).length;

  return (
    <div className="space-y-4">
      {/* Header with count */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="flex -space-x-1">
            {[...Array(3)].map((_, i) => (
              <div 
                key={i}
                className="size-5 rounded-full border-2 border-white shadow-sm"
                style={{ 
                  background: i < earnedCount 
                    ? `linear-gradient(135deg, #FFD700, #FF7F11)` 
                    : '#e2e8f0' 
                }}
              />
            ))}
          </div>
          <span className="text-sm font-semibold text-slate-700">
            {earnedCount}/{achievements.length} earned
          </span>
        </div>
        <span className="text-xs text-slate-400">Keep going!</span>
      </div>

      {/* Badge Grid */}
      <div className="grid grid-cols-3 gap-3">
        {achievements.map((achievement) => {
          const IconComponent = iconMap[achievement.icon];
          
          return (
            <div
              key={achievement.id}
              className={`
                relative group cursor-pointer rounded-xl p-3 transition-all duration-300
                ${achievement.earned 
                  ? 'bg-gradient-to-br from-white to-slate-50 shadow-lg border border-slate-100 hover:shadow-xl hover:scale-105' 
                  : 'bg-slate-50/50 border border-dashed border-slate-200 opacity-60 hover:opacity-80'
                }
              `}
            >
              {/* Glow effect for earned badges */}
              {achievement.earned && (
                <div 
                  className="absolute inset-0 rounded-xl opacity-20 blur-xl transition-opacity group-hover:opacity-40"
                  style={{ background: achievement.color }}
                />
              )}
              
              <div className="relative flex flex-col items-center text-center">
                {/* Icon */}
                <div 
                  className={`
                    size-10 rounded-full flex items-center justify-center mb-2 transition-transform
                    ${achievement.earned ? 'group-hover:scale-110' : ''}
                  `}
                  style={{ 
                    background: achievement.earned 
                      ? `linear-gradient(135deg, ${achievement.color}20, ${achievement.color}40)`
                      : 'rgba(226, 232, 240, 0.5)'
                  }}
                >
                  <IconComponent 
                    className="size-5"
                    style={{ 
                      color: achievement.earned ? achievement.color : '#94a3b8'
                    }}
                  />
                </div>
                
                {/* Title */}
                <h4 className={`
                  text-[10px] font-bold leading-tight
                  ${achievement.earned ? 'text-slate-800' : 'text-slate-400'}
                `}>
                  {achievement.title}
                </h4>

                {/* Progress bar for unearned */}
                {!achievement.earned && achievement.progress !== undefined && (
                  <div className="w-full h-1 bg-slate-200 rounded-full mt-2 overflow-hidden">
                    <div 
                      className="h-full rounded-full transition-all duration-500"
                      style={{ 
                        width: `${achievement.progress}%`,
                        background: achievement.color 
                      }}
                    />
                  </div>
                )}

                {/* Earned indicator */}
                {achievement.earned && (
                  <div className="absolute -top-1 -right-1 size-4 bg-green-500 rounded-full flex items-center justify-center shadow-sm">
                    <svg className="size-2.5 text-white" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                    </svg>
                  </div>
                )}
              </div>

              {/* Tooltip */}
              <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-10">
                <div className="bg-slate-900 text-white text-[10px] px-2 py-1 rounded-lg whitespace-nowrap shadow-lg">
                  {achievement.description}
                  <div className="absolute top-full left-1/2 -translate-x-1/2 border-4 border-transparent border-t-slate-900" />
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
