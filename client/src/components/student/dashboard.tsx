import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useAuth } from "@/lib/auth-provider";
//import { Link } from "react-router-dom";
import { ProgressRing } from "@/components/ui/progress-ring";
import ProgressChart from '@/components/student/ProgressChart';
import DailyStreak from '@/components/student/DailyStreak';
import { DashboardMetrics } from '@/components/student/DashboardMetrics';
import ModuleBreakdown from '@/components/student/ModuleBreakdown';
import TimeAllocation from "@/components/student/TimeAllocation";

import {
  CalendarClock,
  Clock,
  PlayCircle,
  PieChart,
  BookOpen
} from "lucide-react";
// Unified bar color for progress bars in course card
const UNIFIED_BAR_COLOR = "bg-gradient-to-r from-yellow-500 to-yellow-400";
import { formatDateTime, formatTimeRemaining } from "@/lib/utils";
import { useState, useEffect } from "react";
import AttendanceCalendar from "@/components/student/AttendanceCalendar";

// Types based on API response from server
interface DashboardData {
  student: {
    id: string;
    name: string;
    pathway: string;
  };
  courseProgress: number;
  completedModules: string;
  watchTime: {
    total: string;
    thisWeek: string;
  };
  certificationProgress: number;
  quizPerformance: number | null;
  dailyWatchTime: Array<{ date: string; minutes: number }>;
  documentsViewed: number;
  watchTimeInMinutes: number;
  watchTimeThisWeekInMinutes: number;
  quizScores: Array<{ title: string; score: number }>;
  course: {
    slug: string;
    title: string;
    type: string;
    progress: number;
    totalModules: number;
    completedModules: number;
    modules: Array<{title:string; percentComplete:number;}>;
    enrollment: {
      enrollDate: string;
      validUntil: string;
    };
  } | null;
  upcomingLiveClasses: Array<{
    _id: string;
    title: string;
    courseSlug: string;
    description: string;
    meetLink: string;
    startTime: string;
    endTime: string;
    status: string;
  }>;
  attendance: { date: string; present: boolean }[];
  weeklyAttendanceRate: number;
}


export function StudentDashboard() {
  const { student } = useAuth();
  const [dashboardData, setDashboardData] = useState<DashboardData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  // List of enrolled courses for course picker
  const [courses, setCourses] = useState<{ slug: string; title: string }[]>([]);
  const [selectedCourse, setSelectedCourse] = useState<string | null>(null);
  // Motivational tips
  const TIPS = [
    "Consistency is key—any progress is good progress!",
    "You’re one step closer to mastery every time you log in.",
    "Small daily improvements lead to stunning results.",
    "Hard work beats talent when talent doesn’t work hard.",
    "Don’t watch the clock; do what it does—keep going.",
    "Believe you can and you’re halfway there.",
    "The secret of getting ahead is getting started.",
    "Success is the sum of small efforts repeated day in and day out.",
    "Strive for progress, not perfection.",
    "Your only limit is you. Push yourself.",
    "The more you learn, the more you earn.",
    "Great things are done by a series of small things brought together.",
    "Dream big. Start small. Act now.",
    "Learning never exhausts the mind.",
    "Focus on being productive instead of busy."
  ];
  const [tip, setTip] = useState<string>("");
  useEffect(() => {
    const randomIndex = Math.floor(Math.random() * TIPS.length);
    setTip(TIPS[randomIndex]);
  }, []);
  
  // Load enrolled courses for this student
  useEffect(() => {
    const token = localStorage.getItem('token');
    if (!token) return;
    fetch('/api/student/courses', {
      headers: { Authorization: `Bearer ${token}` }
    })
      .then(res => res.json())
      .then((data: { slug: string; title: string }[]) => {
        setCourses(data);
        // Auto-select the first course when enrollments are loaded
        if (data.length > 0) {
          setSelectedCourse(data[0].slug);
        }
      })
      .catch(console.error);
  }, []);

  useEffect(() => {
    const fetchDashboardData = async () => {
      const token = localStorage.getItem('token');
      if (!token || !selectedCourse) {
        setIsLoading(false);
        return;
      }
      setIsLoading(true);
      try {
        const response = await fetch(`/api/student/dashboard/${selectedCourse}`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        if (!response.ok) {
          throw new Error(`Error ${response.status}: ${response.statusText}`);
        }
        const data = await response.json();
        console.log('Dashboard data:', data);
        setDashboardData(data);
        setError(null);
      } catch (err) {
        console.error('Error fetching dashboard data:', err);
        setError(err instanceof Error ? err : new Error('Failed to fetch dashboard data'));
      } finally {
        setIsLoading(false);
      }
    };
    fetchDashboardData();
  }, [selectedCourse]);
  
  // Display loading skeleton
  if (isLoading) {
    return <DashboardSkeleton />;
  }
  
  // Display error message if fetch failed
  if (error) {
    return (
      <div className="p-6">
        <h1 className="text-2xl font-bold text-gray-800 mb-4">Dashboard</h1>
        <Card>
          <CardContent className="p-6">
            <p className="text-red-500">Error loading dashboard data: {error.message}</p>
          </CardContent>
        </Card>
      </div>
    );
  }
  
  // Display message if no data available
  if (!dashboardData) {
    return (
      <div className="p-6">
        <h1 className="text-2xl font-bold text-gray-800 mb-4">Dashboard</h1>
        <Card>
          <CardContent className="p-6">
            <p className="text-yellow-500">No dashboard data available. Please try again later.</p>
          </CardContent>
        </Card>
      </div>
    );
  }
  
  // Destructure data for easier access
  const {
    courseProgress,
    completedModules,
    watchTime,
    certificationProgress,
    quizPerformance,
    dailyWatchTime,
    quizScores,
    course,
    upcomingLiveClasses,
    attendance,
    weeklyAttendanceRate,
  } = dashboardData;
  
  return (
    <div className="min-h-screen bg-gray-100 p-4 md:p-6">
      {/* Welcome Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6">
        <h1 className="text-[25px] font-bold text-gray-800">
          Welcome back, {student?.name?.split(' ')[0]}!
        </h1>
        {/* <div className="mt-2 md:mt-0">
          {course?.slug && (
            <Link href={`/student/courses/${selectedCourse || course?.slug}`}>
              <Button>
                <PlayCircle className="mr-2 h-4 w-4" />
                Resume Learning
              </Button>
            </Link>
          )}
        </div> */}
      </div>
      {/* Course Picker for multiple enrollments */}
      {courses.length > 1 && (
        <div className="mb-6">
          <label htmlFor="courseSelect" className="mr-2 font-medium">Select Course:</label>
          <select
            id="courseSelect"
            className="border rounded px-3 py-1"
            value={selectedCourse ?? ''}
            onChange={e => setSelectedCourse(e.target.value)}
          >
            <option value="" disabled>
              -- pick a course --
            </option>
            {courses.map(c => (
              <option key={c.slug} value={c.slug}>
                {c.title}
              </option>
            ))}
          </select>
        </div>
      )}
      {/* Dashboard KPI Metrics */}
      {/* <DashboardMetrics
        courseProgress={courseProgress}
        watchTime={watchTime}
        quizPerformance={quizPerformance}
        upcomingLiveClasses={upcomingLiveClasses}
      /> */}


      {/* Unified Course Card */}
      <Card className="rounded-3xl overflow-hidden shadow-lg mb-6">
        <div className="w-full bg-[#2B3A8B] text-[#FAF3E0] p-8 shadow-xl">
          <div className="flex flex-col lg:flex-row">
            {/* Left Column: Course info */}
            <div className="lg:w-1/2 pr-6">
              <h2 className="text-5xl font-semibold mb-2 text-[#FAF3E0]">{course?.title}</h2>
              <div className="space-y-2 text-sm text-[#FAF3E0]/80 mb-4">
                <div className="flex items-center">
                  <CalendarClock className="mr-2 h-5 w-5 stroke-2" />
                  <span>Enrolled: {formatDateTime(course.enrollment.enrollDate)}</span>
                </div>
                <div className="flex items-center">
                  <Clock className="mr-2 h-5 w-5 stroke-2" />
                  <span>Valid until: {formatDateTime(course.enrollment.validUntil)}</span>
                </div>
              </div>
              <p className="text-sm text-[#FAF3E0]/90 mb-6">{course?.description}</p>
              <div className="flex space-x-12 text-base font-semibold text-[#FAF3E0]/90 mb-8">
                <div>Quiz Performance: {quizPerformance !== null ? quizPerformance + '%' : 'N/A'}</div>
                <div>Live Scheduled: {upcomingLiveClasses.length}</div>
                <div>Docs Viewed: {dashboardData.documentsViewed}</div>
              </div>
              <a
  href={`/student/courses/${selectedCourse || course?.slug}`}
  className="mt-6 block"
>
  <Button>
    <PlayCircle className="mr-2 h-5 w-5 text-[#1d2b50]" />
    Continue Learning
  </Button>
</a>
            </div>

            {/* Right Column: 3-metric grid */}
            <div className="lg:w-1/2 mt-6 lg:mt-0">
              <div className="grid grid-cols-3 bg-[#FAF3E0] text-[#1d2b50] divide-x divide-[#1d2b50]/30 gap-0 p-4 rounded-xl">
                <div className="text-center px-4 py-6">
                  <PieChart className="mx-auto h-8 w-8 mb-2" />
                  <div className="text-3xl font-bold">{courseProgress || 0}%</div>
                  <div className="text-xl mt-1">Course Progress</div>
                </div>
                <div className="text-center px-4 py-6">
                  <Clock className="mx-auto h-8 w-8 mb-2" />
                  <div className="text-3xl font-bold">{watchTime.total}</div>
                  <div className="text-xl mt-1">Watch Time</div>
                </div>
                <div className="text-center px-4 py-6">
                  <BookOpen className="mx-auto h-8 w-8 mb-2" />
                  <div className="text-3xl font-bold">{course?.completedModules}/{course?.totalModules}</div>
                  <div className="text-xl mt-1">Modules Completed</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </Card>

        {/* Streak and Tip stacked */}
        <div className="flex flex-col gap-4">
          {/* Tip of the Day */}
          <Card className="shadow-sm hover:shadow-lg transition-shadow duration-200 ease-in-out">
            <div className="px-5 py-4 bg-gradient-to-r from-pink-400 to-pink-300">
              <h2 className="text-lg font-medium text-white">Tip of the Day</h2>
            </div>
            <CardContent className="p-4">
              <div className="flex items-start">
                <div className="p-3 rounded-full bg-pink-200 text-pink-600">
                  <PieChart className="h-5 w-5" />
                </div>
                <div className="ml-4">
                  <p className="text-base text-gray-800">{tip}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Day Wise Streak */}
          <Card className="shadow-sm hover:shadow-lg transition-shadow duration-200 ease-in-out">
            <div className="px-5 py-4 bg-gradient-to-r from-amber-400 to-amber-300">
              <h2 className="text-lg font-medium text-white">Your Day Wise Streak</h2>
            </div>
            <CardContent className="p-5">
              <DailyStreak dailyWatchTime={dashboardData.dailyWatchTime} />
            </CardContent>
          </Card>
        </div>

        {/* Daily Attendance & Watch Time Chart Side by Side */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
          {/* Daily Attendance */}
          <div>
            <AttendanceCalendar
              attendance={dashboardData.attendance}
              weeklyAttendanceRate={dashboardData.weeklyAttendanceRate}
              monthlyAttendanceRate={dashboardData.monthlyAttendanceRate}
            />
          </div>
          {/* Daily Watch Time Chart */}
          <Card className="shadow-sm hover:shadow-lg transition-shadow duration-200 ease-in-out">
            <div className="px-5 py-4 bg-gradient-to-r from-teal-400 to-teal-300">
              <h2 className="text-lg font-medium text-white">Daily Watch Time</h2>
            </div>
            <CardContent className="p-5">
              <ProgressChart data={dashboardData.dailyWatchTime} />
              <div className="ml-4">
                <p className="text-xs font-medium text-gray-500 mt-1">Your Weekly Watch time is <strong>{watchTime?.thisWeek || "0h 0m"}</strong> and your total watch time till date is <strong>{watchTime?.total || "0h 0m"} </strong></p>
              </div>
            </CardContent>
          </Card>
        </div>
    



      {/* Module Progress Breakdown & Time Allocation (side by side) */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
        <div className="md:col-span-1">
          <ModuleBreakdown modules={dashboardData.course?.modules || []} />
        </div>
        <div className="md:col-span-1">
          <TimeAllocation
            data={[
              { name: "Total time in minutes you previewed the documents till date :", value: dashboardData.documentsViewed * 2 },
              { name: "Total time you took to solve the quizzes till date :", value: dashboardData.quizPerformance !== null ? 5 : 0 },
            ]}
          />
        </div>
      </div>
      
      {/* Upcoming Live Classes */}
      <Card className="shadow-sm hover:shadow-lg transition-shadow duration-200 ease-in-out">
        <div className="px-5 py-4 bg-gradient-to-r from-emerald-400 to-emerald-300">
          <h2 className="text-lg font-medium text-white">Upcoming Live Classes</h2>
        </div>
        <CardContent className="p-5">
          {upcomingLiveClasses?.length > 0 ? (
            upcomingLiveClasses.map((liveClass) => (
              <div key={liveClass._id} className="border border-gray-200 rounded-lg p-4 mb-4">
                <div className="flex flex-col md:flex-row md:items-center justify-between">
                  <div>
                    <div className="flex items-center">
                      <CalendarClock className="text-primary mr-2 h-5 w-5" />
                      <h3 className="font-medium text-gray-800">{liveClass.title}</h3>
                    </div>
                    <p className="text-gray-500 text-sm mt-1">Course: {liveClass.courseSlug}</p>
                    <div className="flex items-center mt-2">
                      <span className="text-sm text-gray-600">{formatDateTime(liveClass.startTime)}</span>
                      <span className="mx-2 text-gray-300">|</span>
                      <span className="text-sm text-gray-600">
                        {Math.round((new Date(liveClass.endTime).getTime() - new Date(liveClass.startTime).getTime()) / (1000 * 60))} minutes
                      </span>
                    </div>
                  </div>
                  <div className="mt-4 md:mt-0">
                    {liveClass.meetLink && (
                      <a href={liveClass.meetLink} target="_blank" rel="noopener noreferrer">
                        <Button variant="outline">
                          Join Session
                        </Button>
                      </a>
                    )}
                  </div>
                </div>
              </div>
            ))
          ) : (
            <div className="text-center py-8">
              <CalendarClock className="h-12 w-12 text-gray-300 mx-auto mb-2" />
              <p className="mt-2 text-gray-500">No upcoming live classes</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function DashboardSkeleton() {
  return (
    <div className="p-4 md:p-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6">
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-10 w-36 mt-2 md:mt-0" />
      </div>
      
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6 gap-4 mb-6">
        {[1, 2, 3, 4].map((i) => (
          <Card key={i} className="dashboard-card">
            <CardContent className="p-4">
              <div className="flex items-center">
                <Skeleton className="h-12 w-12 rounded-full" />
                <div className="ml-4 w-full">
                  <Skeleton className="h-4 w-24 mb-2" />
                  <Skeleton className="h-6 w-16 mb-2" />
                  <Skeleton className="h-2 w-full" />
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
      
      <Card className="mb-6">
        <div className="px-5 py-4 border-b border-gray-200">
          <Skeleton className="h-6 w-32" />
        </div>
        <CardContent className="p-5">
          <div className="flex flex-col md:flex-row items-start">
            <Skeleton className="h-20 w-20 rounded-lg mb-4 md:mb-0" />
            <div className="md:ml-6 w-full">
              <Skeleton className="h-6 w-64 mb-2" />
              <Skeleton className="h-4 w-40 mb-4" />
              <Skeleton className="h-2 w-full mb-4" />
              <Skeleton className="h-10 w-36" />
            </div>
          </div>
        </CardContent>
      </Card>
      
      <Card>
        <div className="px-5 py-4 border-b border-gray-200">
          <Skeleton className="h-6 w-48" />
        </div>
        <CardContent className="p-5">
          {[1, 2].map((i) => (
            <div key={i} className="border border-gray-200 rounded-lg p-4 mb-4">
              <div className="flex flex-col md:flex-row justify-between">
                <div className="w-full md:w-2/3">
                  <Skeleton className="h-5 w-48 mb-2" />
                  <Skeleton className="h-4 w-32 mb-2" />
                  <Skeleton className="h-4 w-56" />
                </div>
                <Skeleton className="h-10 w-28 mt-4 md:mt-0" />
              </div>
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}

export default StudentDashboard;
