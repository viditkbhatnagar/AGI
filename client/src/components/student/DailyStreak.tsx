// client/src/components/student/DailyStreak.tsx
import React from 'react';

type Props = { dailyWatchTime: { date: string; minutes: number }[] };

export default function DailyStreak({ dailyWatchTime }: Props) {
  // count backwards from today how many days have minutes > 0
  const today = new Date();
  let streak = 0;
  for (let i = 0; i < 7; i++) {
    const day = new Date(today);
    day.setDate(today.getDate() - i);
    const key = day.toISOString().slice(0, 10);
    if (dailyWatchTime.find((r) => r.date === key && r.minutes > 0)) {
      streak++;
    } else {
      break;
    }
  }

  return (
    <div className="p-4 sm:p-6 bg-gradient-to-br from-yellow-100 to-yellow-50 rounded-lg">
      <div className="flex items-center text-yellow-800">
        <span className="text-2xl sm:text-3xl mr-2">🔥</span>
        <div>
          <div className="text-base sm:text-lg md:text-xl font-semibold">
            {streak}-Day Streak
          </div>
          <div className="text-xs sm:text-sm">Keep it going!</div>
        </div>
      </div>
    </div>
  );
}