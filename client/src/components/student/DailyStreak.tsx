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
    <div className="rounded-lg overflow-hidden">
      <div className="p-6 bg-[#FEFDF7] text-center">
        <div className="text-4xl font-bold text-[#375BBE]">{streak} days 🔥 </div>
      </div>
    </div>
  );
}

//[#FEFDF7] text-[#2E3A59]