import React, { useMemo } from 'react';
import { format, startOfMonth, endOfMonth, startOfWeek, endOfWeek, addDays, formatISO, isAfter } from 'date-fns';
import { CheckCircle, XCircle, Calendar } from 'lucide-react';

type AttendanceEntry = { date: string; present: boolean };

interface AttendanceCalendarProps {
  attendance: AttendanceEntry[];
  weeklyAttendanceRate: number;
  monthlyAttendanceRate: number;
}

export default function AttendanceCalendar({ attendance, weeklyAttendanceRate, monthlyAttendanceRate }: AttendanceCalendarProps) {
  const today = new Date();
  const monthStart = useMemo(() => startOfMonth(today), []);
  const monthEnd = useMemo(() => endOfMonth(monthStart), [monthStart]);
  const calendarStart = useMemo(() => startOfWeek(monthStart, { weekStartsOn: 0 }), [monthStart]);
  const calendarEnd = useMemo(() => endOfWeek(monthEnd, { weekStartsOn: 0 }), [monthEnd]);
  
  const calendarDays = useMemo(() => {
    const daysArray: Date[] = [];
    let curr = calendarStart;
    while (curr <= calendarEnd) {
      daysArray.push(curr);
      curr = addDays(curr, 1);
    }
    return daysArray;
  }, [calendarStart, calendarEnd]);

  const todayKey = formatISO(today, { representation: 'date' });
  const isPresent = attendance.some(a => a.date === todayKey && a.present);

  return (
    <div className="rounded-2xl bg-gradient-to-br from-sky-50 via-blue-50/80 to-indigo-50 border border-sky-100/50 shadow-sm overflow-hidden">
      {/* Header */}
      <div className="px-5 py-4 flex items-center justify-between border-b border-sky-100/50">
        <div className="flex items-center gap-2">
          <Calendar className="size-4 text-sky-600" />
          <h3 className="font-heading text-base font-bold text-slate-800">Attendance</h3>
        </div>
        <span className="text-xs text-slate-500">{format(monthStart, 'MMM yyyy')}</span>
      </div>
      
      <div className="p-4">
        {/* Today's Status */}
        <div className="flex items-center justify-between mb-4 p-3 bg-white/60 rounded-xl backdrop-blur-sm">
          <div>
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Today</p>
            <p className="text-sm font-semibold text-slate-700">{format(today, 'EEE, MMM d')}</p>
          </div>
          <div className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold ${
            isPresent 
              ? 'bg-emerald-100 text-emerald-700' 
              : 'bg-red-100 text-red-600'
          }`}>
            {isPresent ? (
              <>
                <CheckCircle className="size-3.5" />
                Present
              </>
            ) : (
              <>
                <XCircle className="size-3.5" />
                Absent
              </>
            )}
          </div>
        </div>

        {/* Attendance Rates */}
        <div className="grid grid-cols-2 gap-3 mb-4">
          <div className="text-center p-3 bg-white/60 rounded-xl backdrop-blur-sm">
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Weekly</p>
            <p className="text-xl font-bold text-[#18548b]">{weeklyAttendanceRate}%</p>
          </div>
          <div className="text-center p-3 bg-white/60 rounded-xl backdrop-blur-sm">
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Monthly</p>
            <p className="text-xl font-bold text-[#8BC34A]">{monthlyAttendanceRate}%</p>
          </div>
        </div>

        {/* Weekday Labels */}
        <div className="grid grid-cols-7 text-center mb-1">
          {['S', 'M', 'T', 'W', 'T', 'F', 'S'].map((d, i) => (
            <div key={i} className="text-[10px] font-bold text-slate-400 py-1">{d}</div>
          ))}
        </div>

        {/* Calendar Grid */}
        <div className="grid grid-cols-7 gap-0.5">
          {calendarDays.map((day) => {
            const iso = formatISO(day, { representation: 'date' });
            const entry = attendance.find(a => a.date === iso);
            const isCurrentMonth = day >= monthStart && day <= monthEnd;
            const isFuture = isAfter(day, today);
            const isToday = iso === todayKey;

            return (
              <div
                key={iso}
                className={`
                  relative aspect-square flex items-center justify-center rounded-lg text-xs transition-all
                  ${!isCurrentMonth ? 'opacity-25' : ''}
                  ${isToday ? 'ring-2 ring-[#18548b] ring-offset-1 bg-white shadow-sm' : ''}
                  ${!isFuture && entry?.present && !isToday ? 'bg-emerald-100' : ''}
                  ${!isFuture && !entry?.present && isCurrentMonth && !isToday ? 'bg-red-100' : ''}
                  ${isFuture && isCurrentMonth ? 'bg-white/40' : ''}
                `}
              >
                <span className={`font-semibold ${
                  isToday 
                    ? 'text-[#18548b]' 
                    : !isFuture && entry?.present 
                      ? 'text-emerald-700' 
                      : !isFuture && !entry?.present && isCurrentMonth
                        ? 'text-red-600'
                        : 'text-slate-500'
                }`}>
                  {format(day, 'd')}
                </span>
              </div>
            );
          })}
        </div>

        {/* Legend */}
        <div className="flex justify-center gap-4 mt-3 pt-3 border-t border-sky-100/50">
          <div className="flex items-center gap-1.5">
            <div className="size-3 rounded bg-emerald-100" />
            <span className="text-[10px] text-slate-500">Present</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="size-3 rounded bg-red-100" />
            <span className="text-[10px] text-slate-500">Absent</span>
          </div>
        </div>
      </div>
    </div>
  );
}
