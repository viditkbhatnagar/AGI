// Study Streak Card - Premium design with calm colors and elegant animations
import React, { useEffect, useState } from 'react';
import { Flame, TrendingUp, Target, Zap, Star, Sparkles } from 'lucide-react';

interface StudyStreakCardProps {
  currentStreak: number;
  longestStreak: number;
  todayCompleted: boolean;
}

export default function StudyStreakCard({ 
  currentStreak, 
  longestStreak,
  todayCompleted 
}: StudyStreakCardProps) {
  const streakPercentage = longestStreak > 0 
    ? Math.min((currentStreak / longestStreak) * 100, 100) 
    : 0;
  
  const [animatedStreak, setAnimatedStreak] = useState(0);
  
  // Animate streak number on mount
  useEffect(() => {
    const duration = 1500;
    const steps = 30;
    const increment = currentStreak / steps;
    let current = 0;
    
    const timer = setInterval(() => {
      current += increment;
      if (current >= currentStreak) {
        setAnimatedStreak(currentStreak);
        clearInterval(timer);
      } else {
        setAnimatedStreak(Math.floor(current));
      }
    }, duration / steps);
    
    return () => clearInterval(timer);
  }, [currentStreak]);

  // Determine streak level for messaging
  const streakLevel = currentStreak >= 30 ? 'legendary' : 
                       currentStreak >= 14 ? 'epic' : 
                       currentStreak >= 7 ? 'great' : 'normal';

  return (
    <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-slate-50 via-white to-blue-50 p-5 border border-slate-200/60 shadow-sm">
      {/* Subtle decorative elements */}
      <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-[#18548b]/5 to-transparent rounded-full blur-2xl -translate-y-1/2 translate-x-1/2" />
      <div className="absolute bottom-0 left-0 w-24 h-24 bg-gradient-to-tr from-emerald-100/50 to-transparent rounded-full blur-xl translate-y-1/2 -translate-x-1/2" />
      
      <div className="relative z-10">
        {/* Header with streak icon */}
        <div className="flex items-start justify-between mb-5">
          <div className="flex items-center gap-3">
            <div className="relative">
              <div className="size-12 rounded-2xl bg-gradient-to-br from-[#18548b]/10 to-[#18548b]/5 flex items-center justify-center border border-[#18548b]/10">
                <Flame className="size-6 text-[#18548b]" />
              </div>
              {/* Subtle pulse animation */}
              {todayCompleted && (
                <div className="absolute -top-1 -right-1 size-4 bg-emerald-500 rounded-full flex items-center justify-center ring-2 ring-white">
                  <svg className="size-2.5 text-white" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                  </svg>
                </div>
              )}
            </div>
            <div>
              <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-0.5">Current Streak</p>
              <div className="flex items-baseline gap-1.5">
                <span className="text-3xl font-bold text-[#18548b] tracking-tight">
                  {animatedStreak}
                </span>
                <span className="text-sm font-medium text-slate-500">days</span>
              </div>
            </div>
          </div>
          
          {/* Status badge */}
          <div className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold ${
            todayCompleted 
              ? 'bg-emerald-50 text-emerald-600 border border-emerald-200/60' 
              : 'bg-amber-50 text-amber-600 border border-amber-200/60'
          }`}>
            {todayCompleted ? (
              <>
                <Sparkles className="size-3.5" />
                Done today
              </>
            ) : (
              <>
                <Zap className="size-3.5" />
                Study now
              </>
            )}
          </div>
        </div>

        {/* Progress section */}
        <div className="mb-4">
          <div className="flex items-center justify-between text-xs mb-2">
            <span className="text-slate-500 font-medium">Progress to best streak</span>
            <span className="font-semibold text-slate-700 flex items-center gap-1">
              <Star className="size-3 text-amber-400" />
              {longestStreak} days
            </span>
          </div>
          
          {/* Elegant progress bar */}
          <div className="relative h-2.5 bg-slate-100 rounded-full overflow-hidden">
            <div 
              className="absolute inset-y-0 left-0 bg-gradient-to-r from-[#18548b] via-[#3b82f6] to-[#8BC34A] rounded-full transition-all duration-1000 ease-out"
              style={{ width: `${streakPercentage}%` }}
            />
            {/* Shimmer effect */}
            <div 
              className="absolute inset-y-0 left-0 bg-gradient-to-r from-transparent via-white/40 to-transparent rounded-full"
              style={{ 
                width: `${streakPercentage}%`,
                animation: 'shimmer 2s infinite'
              }}
            />
          </div>
          
          {/* Progress markers */}
          <div className="flex justify-between mt-1.5 px-0.5">
            {[0, 25, 50, 75, 100].map((mark) => (
              <div 
                key={mark} 
                className={`text-[10px] ${streakPercentage >= mark ? 'text-[#18548b] font-semibold' : 'text-slate-300'}`}
              >
                {mark === 0 ? '0' : mark === 100 ? longestStreak : ''}
              </div>
            ))}
          </div>
        </div>

        {/* Stats row */}
        <div className="flex items-center gap-3">
          <div className="flex-1 flex items-center gap-2 px-3 py-2.5 bg-slate-50 rounded-xl border border-slate-100">
            <Target className="size-4 text-slate-400" />
            <div className="flex flex-col">
              <span className="text-[10px] text-slate-400 uppercase tracking-wider">Best</span>
              <span className="text-sm font-bold text-slate-700">{longestStreak} days</span>
            </div>
          </div>
          
          <div className="flex-1 flex items-center gap-2 px-3 py-2.5 bg-slate-50 rounded-xl border border-slate-100">
            <TrendingUp className="size-4 text-slate-400" />
            <div className="flex flex-col">
              <span className="text-[10px] text-slate-400 uppercase tracking-wider">Status</span>
              <span className="text-sm font-bold text-slate-700 truncate">
                {currentStreak >= longestStreak ? 'Record!' : 
                 currentStreak >= longestStreak * 0.8 ? 'Close!' : 
                 'Growing'}
              </span>
            </div>
          </div>
        </div>
        
        {/* Achievement badge for milestones */}
        {streakLevel !== 'normal' && (
          <div className="mt-4 pt-3 border-t border-slate-100">
            <div className="flex items-center justify-center gap-2 py-2 px-3 bg-gradient-to-r from-[#18548b]/5 via-[#18548b]/10 to-[#18548b]/5 rounded-xl">
              <span className="text-lg">
                {streakLevel === 'legendary' ? '🏆' : streakLevel === 'epic' ? '⭐' : '🔥'}
              </span>
              <span className="text-xs font-semibold text-[#18548b]">
                {streakLevel === 'legendary' ? 'Legendary Learner' :
                 streakLevel === 'epic' ? 'Epic Dedication' : 'Great Progress'}
              </span>
            </div>
          </div>
        )}
      </div>
      
      {/* Shimmer animation style */}
      <style>{`
        @keyframes shimmer {
          0% { transform: translateX(-100%); }
          100% { transform: translateX(200%); }
        }
      `}</style>
    </div>
  );
}
