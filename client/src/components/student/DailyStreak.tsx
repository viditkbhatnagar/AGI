import React from 'react';
import { Flame } from 'lucide-react';

type Props = { dailyWatchTime: { date: string; minutes: number }[] };

export default function DailyStreak({ dailyWatchTime }: Props) {
  // Count backwards from today how many days have minutes > 0
  const today = new Date();
  let streak = 0;
  for (let i = 0; i < 30; i++) {
    const day = new Date(today);
    day.setDate(today.getDate() - i);
    const key = day.toISOString().slice(0, 10);
    if (dailyWatchTime.find((r) => r.date === key && r.minutes > 0)) {
      streak++;
    } else {
      break;
    }
  }

  // Calculate progress towards a goal (e.g., 30 days)
  const goal = 30;
  const progress = Math.min((streak / goal) * 100, 100);

  return (
    <div className="bg-gradient-to-br from-[#121920] to-[#1e293b] rounded-xl p-6 shadow-lg text-white relative overflow-hidden">
      {/* Background Icon */}
      <div className="absolute top-0 right-0 p-4 opacity-10">
        <Flame className="w-24 h-24" />
      </div>

      <div className="relative z-10 flex flex-col items-center text-center">
        {/* Icon Container */}
        <div className="bg-white/10 p-4 rounded-full mb-3 backdrop-blur-sm border border-white/10">
          <Flame className="w-10 h-10 text-[#FF7F11]" />
        </div>

        {/* Streak Count */}
        <h3 className="text-4xl font-heading font-bold mb-1">{streak} Days</h3>
        <p className="text-slate-400 text-sm mb-4">Learning Streak</p>

        {/* Progress Bar */}
        <div className="w-full bg-slate-700/50 h-1.5 rounded-full overflow-hidden">
          <div 
            className="bg-[#FF7F11] h-full rounded-full transition-all duration-500 shadow-[0_0_10px_rgba(255,127,17,0.5)]"
            style={{ width: `${progress}%` }}
          />
        </div>

        <p className="text-xs text-slate-500 mt-2">
          {streak >= goal ? '🎉 Goal reached!' : `Keep it up to reach ${goal} days!`}
        </p>
      </div>
    </div>
  );
}
