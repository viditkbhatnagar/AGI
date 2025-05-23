import React, { useMemo, useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { format, startOfMonth, endOfMonth, startOfWeek, endOfWeek, addDays, formatISO, isAfter, isSameDay } from 'date-fns';
import { CheckCircle, XCircle } from 'lucide-react';

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

  return (
    <Card className="rounded-lg shadow-sm mb-6">
      {/* Header */}
      <div className="flex items-center bg-[#1d2b50] px-6 py-4 rounded-t-lg">
        <img src="/path/to/paper-plane.svg" alt="Attendance" className="w-8 h-8 mr-3" />
        <h2 className="text-2xl font-semibold text-white">Daily Attendance</h2>
      </div>
      <CardContent className="p-4 bg-white flex flex-col lg:flex-row gap-4">
        {/* Today's Attendance Panel */}
        <div className="w-full lg:w-1/4 bg-[#f3f4f6] p-4 rounded-lg shadow-sm">
          <p className="text-lg font-semibold text-gray-800 mb-2">Today: {format(new Date(), 'MMM d, yyyy')}</p>
          {attendance.some(a => a.date === todayKey && a.present) ? (
            <p className="flex items-center text-green-600 font-medium">
              <CheckCircle className="w-5 h-5 mr-2" /> Present
            </p>
          ) : (
            <p className="flex items-center text-red-600 font-medium">
              <XCircle className="w-5 h-5 mr-2" /> Absent
            </p>
          )}
          {/* Attendance Rates */}
          <div className="mt-4 space-y-2">
            <div className="flex justify-between items-center">
              <span className="text-sm font-medium text-gray-600">Weekly Attendance</span>
              <span className="text-lg font-bold text-green-600">{weeklyAttendanceRate}%</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm font-medium text-gray-600">Monthly Attendance</span>
              <span className="text-lg font-bold text-blue-600">{monthlyAttendanceRate}%</span>
            </div>
          </div>
        </div>
        {/* Monthly Calendar Grid */}
        <div className="w-full lg:w-3/4">
          {/* Date Range */}
          <div className="px-2 py-1 bg-white border-b mb-2">
            <h3 className="text-lg font-medium text-gray-800">
              {format(monthStart, 'MMM d')}–{format(monthEnd, 'd, yyyy')}
            </h3>
          </div>
          {/* Weekday labels */}
          <div className="grid grid-cols-7 text-center text-sm text-gray-500 mb-2">
            {['S','M','T','W','T','F','S'].map((d, i) => (
              <div key={i} className="font-medium">{d}</div>
            ))}
          </div>
          {/* Calendar days */}
          <div className="grid grid-cols-7 gap-2">
            {calendarDays.map((day) => {
              const iso = formatISO(day, { representation: 'date' });
              const entry = attendance.find(a => a.date === iso);
              const isCurrentMonth = day >= monthStart && day <= monthEnd;
              const isFuture = isAfter(day, today);
              return (
                <div
                  key={iso}
                  className={`
                    p-2 text-center rounded-lg
                    ${!isCurrentMonth ? 'opacity-50' : ''}
                    ${isFuture ? 'bg-white' : entry?.present ? 'bg-green-100' : 'bg-red-100'}
                  `}
                >
                  {!isFuture && format(day, 'd')}
                  {!isFuture && (
                    <div className="mt-1 flex justify-center">
                      {entry?.present
                        ? <CheckCircle className="w-5 h-5 text-green-600" />
                        : <XCircle className="w-5 h-5 text-red-600" />
                      }
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
