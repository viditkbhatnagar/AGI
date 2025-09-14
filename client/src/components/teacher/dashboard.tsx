import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { 
  BookOpen, 
  Users, 
  Video, 
  Calendar,
  Clock,
  GraduationCap,
  FileText,
  BarChart3,
  TrendingUp
} from 'lucide-react';
import { formatDate, formatTime } from '@/lib/utils';

export function TeacherDashboard() {
  const { data: dashboardData, isLoading } = useQuery({
    queryKey: ['/api/teacher/dashboard'],
  });

  if (isLoading) {
    return (
      <div className="p-6">
        <div className="animate-pulse space-y-6">
          <div className="h-8 bg-gray-200 rounded w-64"></div>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="h-32 bg-gray-200 rounded"></div>
            ))}
          </div>
          <div className="h-64 bg-gray-200 rounded"></div>
        </div>
      </div>
    );
  }

  const {
    courses = [],
    enrollments = [],
    upcomingLiveClasses = [],
    recentRecordings = [],
    stats = {}
  } = dashboardData || {};

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-800">Teacher Dashboard</h1>
          <p className="text-gray-600 mt-1">Welcome back! Here's an overview of your teaching activities.</p>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card className="border-l-4 border-l-blue-500">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Assigned Courses</p>
                <p className="text-3xl font-bold text-gray-900">{stats.totalCourses || 0}</p>
              </div>
              <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
                <BookOpen className="h-6 w-6 text-blue-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-green-500">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Total Students</p>
                <p className="text-3xl font-bold text-gray-900">{stats.totalStudents || 0}</p>
              </div>
              <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center">
                <Users className="h-6 w-6 text-green-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-purple-500">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Live Classes</p>
                <p className="text-3xl font-bold text-gray-900">{stats.totalLiveClasses || 0}</p>
              </div>
              <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center">
                <Video className="h-6 w-6 text-purple-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-orange-500">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Upcoming Classes</p>
                <p className="text-3xl font-bold text-gray-900">{stats.totalUpcoming || 0}</p>
              </div>
              <div className="w-12 h-12 bg-orange-100 rounded-lg flex items-center justify-center">
                <Calendar className="h-6 w-6 text-orange-600" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Assigned Courses */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <GraduationCap className="h-5 w-5" />
              Your Assigned Courses
            </CardTitle>
          </CardHeader>
          <CardContent>
            {courses.length > 0 ? (
              <div className="space-y-3">
                {courses.map((course, index) => (
                  <div key={course.slug || index} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                    <div>
                      <h3 className="font-medium text-gray-900">{course.title}</h3>
                      <p className="text-sm text-gray-600">{course.slug}</p>
                    </div>
                    <Badge variant="outline">{course.type || 'Course'}</Badge>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8 text-gray-500">
                <GraduationCap className="h-12 w-12 mx-auto mb-3 text-gray-300" />
                <p>No courses assigned yet</p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Upcoming Live Classes */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Calendar className="h-5 w-5" />
              Upcoming Live Classes
            </CardTitle>
          </CardHeader>
          <CardContent>
            {upcomingLiveClasses.length > 0 ? (
              <div className="space-y-3">
                {upcomingLiveClasses.slice(0, 5).map((liveClass, index) => (
                  <div key={liveClass._id || index} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                    <div className="flex-1">
                      <h3 className="font-medium text-gray-900">{liveClass.title}</h3>
                      <p className="text-sm text-gray-600">{liveClass.courseSlug}</p>
                      <div className="flex items-center gap-2 mt-1">
                        <Clock className="h-3 w-3 text-gray-400" />
                        <span className="text-xs text-gray-500">
                          {formatDate(liveClass.startTime)} at {formatTime(liveClass.startTime)}
                        </span>
                      </div>
                    </div>
                    {liveClass.meetLink && (
                      <Button size="sm" variant="outline" asChild>
                        <a href={liveClass.meetLink} target="_blank" rel="noopener noreferrer">
                          Join
                        </a>
                      </Button>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8 text-gray-500">
                <Calendar className="h-12 w-12 mx-auto mb-3 text-gray-300" />
                <p>No upcoming live classes</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Recent Activities */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent Students */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="h-5 w-5" />
              Recent Student Activity
            </CardTitle>
          </CardHeader>
          <CardContent>
            {enrollments.length > 0 ? (
              <div className="space-y-3">
                {enrollments.slice(0, 5).map((enrollment, index) => {
                  const student = enrollment.studentId;
                  return (
                    <div key={student?._id || index} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                      <div>
                        <h3 className="font-medium text-gray-900">{student?.name || 'Unknown Student'}</h3>
                        <p className="text-sm text-gray-600">{enrollment.courseSlug}</p>
                        <div className="flex items-center gap-2 mt-1">
                          <Badge variant="secondary" className="text-xs">
                            {student?.pathway || 'Unknown'}
                          </Badge>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="text-center py-8 text-gray-500">
                <Users className="h-12 w-12 mx-auto mb-3 text-gray-300" />
                <p>No student enrollments</p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Recent Recordings */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5" />
              Recent Recordings
            </CardTitle>
          </CardHeader>
          <CardContent>
            {recentRecordings.length > 0 ? (
              <div className="space-y-3">
                {recentRecordings.slice(0, 5).map((recording, index) => (
                  <div key={recording._id || index} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                    <div className="flex-1">
                      <h3 className="font-medium text-gray-900">{recording.title}</h3>
                      <p className="text-sm text-gray-600">{recording.courseSlug}</p>
                      <div className="flex items-center gap-2 mt-1">
                        <Clock className="h-3 w-3 text-gray-400" />
                        <span className="text-xs text-gray-500">
                          {formatDate(recording.classDate)}
                        </span>
                      </div>
                    </div>
                    <Badge variant={recording.isVisible ? 'default' : 'secondary'}>
                      {recording.isVisible ? 'Visible' : 'Hidden'}
                    </Badge>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8 text-gray-500">
                <FileText className="h-12 w-12 mx-auto mb-3 text-gray-300" />
                <p>No recent recordings</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}