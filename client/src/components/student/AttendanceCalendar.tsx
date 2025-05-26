import React, { useMemo, useState } from 'react';
import { format, startOfMonth, endOfMonth, startOfWeek, endOfWeek, addDays, formatISO, isAfter, isSameDay } from 'date-fns';
import { CheckCircle, XCircle } from 'lucide-react';
import { Card, CardContent } from "@/components/ui/card";

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
    <Card className="rounded-3xl shadow-sm hover:shadow-lg transition-shadow bg-[#FEFDF7]">
      {/* Header */}
      <div className="flex items-center bg-[#375BBE] px-6 py-4 rounded-t-3xl">
        <h2 className="text-2xl font-semibold text-white">Daily Attendance</h2>
      </div>
      <CardContent className="p-4 flex flex-col lg:flex-row gap-4">
      {/* Today's Attendance Panel */}
      <div className="w-full lg:w-1/4 bg-[#f3f4f6] p-4 rounded-lg shadow-sm">
        <p className="text-lg font-semibold text-[#FF7F50] mb-2">Today: {format(new Date(), 'MMM d, yyyy')}</p>
        {attendance.some(a => a.date === todayKey && a.present) ? (
          <p className="flex items-center font-medium">
            <CheckCircle className="w-5 h-5 text-[#5BC0EB] mr-2" /> Present
          </p>
        ) : (
          <p className="flex items-center font-medium">
            <XCircle className="w-5 h-5 text-[#E63946] mr-2" /> Absent
          </p>
        )}
        {/* Attendance Rates */}
        <div className="mt-4 space-y-2">
          <div className="flex justify-between items-center">
            <span className="text-sm font-medium text-[#2E3A59]">Weekly-</span>
            <span className="text-lg font-bold text-[#5BC0EB]">{weeklyAttendanceRate}%</span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-sm font-medium text-[#2E3A59]">Monthly-</span>
            <span className="text-lg font-bold text-[#5BC0EB]">{monthlyAttendanceRate}%</span>
          </div>
        </div>
      </div>
        {/* Monthly Calendar Grid */}
        <div className="w-full lg:w-3/4">
          {/* Date Range */}
          <div className="px-2 py-1 bg-white border-b mb-2 text-[#2E3A59]">
            <h3 className="text-lg font-medium">
              {format(monthStart, 'MMM d')}–{format(monthEnd, 'd, yyyy')}
            </h3>
          </div>
          {/* Weekday labels */}
          <div className="grid grid-cols-7 text-center text-sm mb-2 text-[#2E3A59]">
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
                    ${isFuture ? '' : entry?.present ? 'bg-[#5BC0EB]/20' : 'bg-[#FF7F50]/20'}
                  `}
                >
                  {!isFuture && (
                    <>
                      {format(day, 'd')}
                      <div className="mt-1 flex justify-center">
                        {entry?.present
                          ? <CheckCircle className="w-5 h-5 text-[#5BC0EB]" />
                          : <XCircle className="w-5 h-5 text-[#FF7F50]" />
                        }
                      </div>
                    </>
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
