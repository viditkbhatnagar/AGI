// client/src/components/student/DashboardMetrics.tsx
import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { ProgressRing } from '@/components/ui/progress-ring';
import { BookOpen, Clock, CheckCircle, CalendarClock } from 'lucide-react';
import { formatDateTime } from '@/lib/utils';

interface LiveClass {
  _id: string;
  title: string;
  startTime: string;
}

interface DashboardMetricsProps {
  courseProgress: number;
  watchTime: {
    total: string;
    thisWeek: string;
  };
  quizPerformance: number | null;
  upcomingLiveClasses: LiveClass[];
}

export function DashboardMetrics({
  courseProgress,
  watchTime,
  quizPerformance,
  upcomingLiveClasses,
}: DashboardMetricsProps) {
  const nextClass = upcomingLiveClasses[0];

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-6">
      {/* Course Progress */}
      <Card>
        <CardContent className="flex items-center space-x-4">
          <div className="p-2 bg-primary-100 rounded-lg">
            <BookOpen className="h-6 w-6 text-primary" />
          </div>
          <div>
            <h3 className="text-sm font-medium text-gray-500">Course Progress</h3>
            <div className="flex items-center space-x-2 mt-1">
              <ProgressRing value={courseProgress} size={48} strokeWidth={6} />
              <span className="text-lg font-semibold text-gray-800">{courseProgress}%</span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Total Watch Time */}
      <Card>
        <CardContent className="flex items-center space-x-4">
          <div className="p-2 bg-green-100 rounded-lg">
            <Clock className="h-6 w-6 text-green-500" />
          </div>
          <div>
            <h3 className="text-sm font-medium text-gray-500">Total Watch Time</h3>
            <p className="text-lg font-semibold text-gray-800 mt-1">{watchTime.total}</p>
            <p className="text-xs text-gray-500">This week: {watchTime.thisWeek}</p>
          </div>
        </CardContent>
      </Card>

      {/* Quiz Performance */}
      <Card>
        <CardContent className="flex items-center space-x-4">
          <div className="p-2 bg-yellow-100 rounded-lg">
            <CheckCircle className="h-6 w-6 text-yellow-500" />
          </div>
          <div>
            <h3 className="text-sm font-medium text-gray-500">Quiz Performance</h3>
            {quizPerformance !== null ? (
              <p className="text-lg font-semibold text-gray-800 mt-1">
                {quizPerformance}% avg
              </p>
            ) : (
              <p className="text-lg font-semibold text-gray-800 mt-1">No quizzes yet</p>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Upcoming Live Class */}
      <Card>
        <CardContent className="flex items-center space-x-4">
          <div className="p-2 bg-blue-100 rounded-lg">
            <CalendarClock className="h-6 w-6 text-blue-500" />
          </div>
          <div>
            <h3 className="text-sm font-medium text-gray-500">Upcoming Live Class</h3>
            {nextClass ? (
              <>
                <p className="text-lg font-semibold text-gray-800 mt-1">{nextClass.title}</p>
                <p className="text-xs text-gray-500">
                  {formatDateTime(nextClass.startTime)}
                </p>
              </>
            ) : (
              <p className="text-lg font-semibold text-gray-800 mt-1">None scheduled</p>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}