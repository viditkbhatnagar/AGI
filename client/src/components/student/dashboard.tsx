import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useAuth } from "@/lib/auth-provider";
import { Link } from "wouter";
import { ProgressRing } from "@/components/ui/progress-ring";
import ProgressChart from '@/components/student/ProgressChart';
import DailyStreak from '@/components/student/DailyStreak';
import { DashboardMetrics } from '@/components/student/DashboardMetrics';
import ModuleBreakdown from '@/components/student/ModuleBreakdown';
import TimeAllocation from "@/components/student/TimeAllocation";

import { 
  CalendarClock, 
  Clock, 
  Medal, 
  PlayCircle, 
  School, 
  Target,
  CheckCircle,
  PieChart,
  BookOpen
} from "lucide-react";
import { formatDateTime, formatTimeRemaining } from "@/lib/utils";
import { useState, useEffect } from "react";

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
}


export function StudentDashboard() {
  const { student } = useAuth();
  const [dashboardData, setDashboardData] = useState<DashboardData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
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
  
  useEffect(() => {
    // Function to fetch dashboard data from API
    const fetchDashboardData = async () => {
      const token = localStorage.getItem('token');
      if (!token) {
        setIsLoading(false);
        return;
      }
      setIsLoading(true);
      try {
        const response = await fetch('/api/student/dashboard', {
          headers: {
            'Authorization': `Bearer ${token}`
          }
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
  }, []);
  
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
  } = dashboardData;
  
  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-50 to-white p-4 md:p-6">
      {/* Welcome Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6">
        <h1 className="text-2xl font-bold text-gray-800">
          Welcome back, {student?.name?.split(' ')[0]}!
        </h1>
        <div className="mt-2 md:mt-0">
          {course?.slug && (
            <Link href={`/student/courses/${course.slug}`}>
              <Button>
                <PlayCircle className="mr-2 h-4 w-4" />
                Resume Learning
              </Button>
            </Link>
          )}
        </div>
      </div>
      {/* Dashboard KPI Metrics */}
      {/* <DashboardMetrics
        courseProgress={courseProgress}
        watchTime={watchTime}
        quizPerformance={quizPerformance}
        upcomingLiveClasses={upcomingLiveClasses}
      /> */}
      
      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-6 gap-4 mb-6">
        {/* Course Progress */}
        <Card className="dashboard-card border-l-4 border-indigo-600 bg-gradient-to-r from-indigo-200 to-indigo-100 shadow-sm hover:shadow-lg transition-shadow duration-200 ease-in-out">
          <CardContent className="p-4">
            <div className="flex items-center">
              <div className="p-3 rounded-full bg-indigo-200 text-indigo-600">
                <Target className="h-5 w-5" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-semibold text-gray-500">Course Progress</p>
                <p className="text-lg font-bold text-gray-800">{courseProgress || 0}%</p>
                <div className="w-full h-2 bg-gray-200 rounded-full mt-1">
                  <div 
                    className="h-full bg-primary rounded-full" 
                    style={{ width: `${courseProgress || 0}%` }}
                  />
                  <p className="text-xs font-medium text-gray-500 mt-1">Your overall completion rate</p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Watch Time */}
        <Card className="dashboard-card border-l-4 border-teal-600 bg-gradient-to-r from-teal-200 to-teal-100 shadow-sm hover:shadow-lg transition-shadow duration-200 ease-in-out">
          <CardContent className="p-4">
            <div className="flex items-center">
              <div className="p-3 rounded-full bg-teal-200 text-teal-600">
                <Clock className="h-5 w-5" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-semibold text-gray-500">Watch Time</p>
                <p className="text-lg font-bold text-gray-800">{watchTime?.total || "0h 0m"}</p>
                <p className="text-xs font-medium text-gray-500 mt-1">This week: {watchTime?.thisWeek || "0h 0m"}</p>
                <p className="text-xs font-medium text-gray-500 mt-1">Auto-tracking enabled</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Quiz Performance */}
        <Card className="dashboard-card border-l-4 border-amber-600 bg-gradient-to-r from-amber-200 to-amber-100 shadow-sm hover:shadow-lg transition-shadow duration-200 ease-in-out">
          <CardContent className="p-4">
            <div className="flex items-center">
              <div className="p-3 rounded-full bg-amber-200 text-amber-600">
                <CheckCircle className="h-5 w-5" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-semibold text-gray-500">Quiz Performance</p>
                <p className="text-lg font-bold text-gray-800">
                  {quizPerformance !== null ? `${quizPerformance}%` : 'N/A'}
                </p>
                <p className="text-xs font-medium text-gray-500 mt-1">
                  {quizPerformance !== null ? 'Average score across your quizzes' : 'No quizzes attempted'}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Upcoming Live Classes */}
        <Card className="dashboard-card border-l-4 border-emerald-600 bg-gradient-to-r from-emerald-200 to-emerald-100 shadow-sm hover:shadow-lg transition-shadow duration-200 ease-in-out">
          <CardContent className="p-4">
            <div className="flex items-center">
              <div className="p-3 rounded-full bg-emerald-200 text-emerald-600">
                <CalendarClock className="h-5 w-5" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-semibold text-gray-500">Live Classes</p>
                <p className="text-lg font-bold text-gray-800">
                  {upcomingLiveClasses.length}
                </p>
                <p className="text-xs font-medium text-gray-500 mt-1">Upcoming Live Classes</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Modules Completed */}
        <Card className="dashboard-card border-l-4 border-indigo-600 bg-indigo-50">
  <CardContent className="p-4">
    <div className="flex items-center">
      <CheckCircle className="h-6 w-6 text-indigo-600" />
      <div className="ml-4">
        <p className="text-sm font-semibold text-gray-500">Modules Completed</p>
        <p className="text-lg font-bold text-gray-800">
          {course?.completedModules ?? 0} / {course?.totalModules ?? 0}
        </p>
        <div className="w-full h-2 bg-gray-200 rounded-full mt-1">
          <div
            className="h-full bg-indigo-600 rounded-full"
            style={{
              width: `${Math.round(
                ((course?.completedModules ?? 0) / (course?.totalModules ?? 1)) * 100
              )}%`,
            }}
          />
           <p className="text-xs font-medium text-gray-500 mt-1">Modules you’ve finished so far.</p>
        </div>
      </div>
    </div>
  </CardContent>
</Card>

        {/* Documents Viewed */}
        <Card className="dashboard-card border-l-4 border-fuchsia-600 bg-gradient-to-r from-fuchsia-200 to-fuchsia-100 shadow-sm hover:shadow-lg transition-shadow duration-200 ease-in-out">
          <CardContent className="p-4">
            <div className="flex items-center">
              <div className="p-3 rounded-full bg-fuchsia-200 text-fuchsia-600">
                <BookOpen className="h-5 w-5" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-semibold text-gray-500">Documents Viewed</p>
                <p className="text-lg font-bold text-gray-800">{dashboardData.documentsViewed ?? 0}</p>
                <p className="text-xs font-medium text-gray-500 mt-1">Resources you’ve opened.</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
      
      {/* My Course & Streak/Tip & Daily Watch Time (3-column layout) */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        {/* My Course */}
        {course && (
          <Card className="shadow-sm hover:shadow-lg transition-shadow duration-200 ease-in-out">
            <div className="px-5 py-4 border-b border-gray-200">
              <h2 className="text-lg font-medium text-gray-800">My Course</h2>
            </div>
            <CardContent className="p-5">
              {/* existing My Course content */}
              <div className="flex flex-col md:flex-row items-start md:items-center">
                <div className="flex-shrink-0 mb-4 md:mb-0">
                  <div className="bg-primary-100 rounded-lg p-4 text-primary text-center">
                    <School className="h-10 w-10 mx-auto" />
                  </div>
                </div>
                <div className="md:ml-6">
                  <h3 className="text-xl font-medium text-gray-800">{course.title}</h3>
                  <p className="text-gray-500 text-sm mt-1">Type: <span className="capitalize font-medium">{course.type}</span></p>
                  <div className="mt-2">
                    <div className="flex items-center">
                      <span className="text-sm font-medium text-gray-500">Overall Progress:</span>
                      <div className="flex-1 mx-2">
                        <div className="w-full h-2 bg-gray-200 rounded-full">
                          <div 
                            className="h-full bg-primary rounded-full" 
                            style={{ width: `${courseProgress || 0}%` }}
                          />
                        </div>
                      </div>
                      <span className="text-sm font-medium text-gray-800">{courseProgress || 0}%</span>
                    </div>
                  </div>
                  <ul className="mt-4 text-xs text-gray-500 list-disc list-inside space-y-1">
                    <li>📅 Enrolled: {formatDateTime(course.enrollment.enrollDate)}</li>
                    <li>⏳ Expires: {formatDateTime(course.enrollment.validUntil)}</li>
                    <li>📚 Total Modules: {course.totalModules}</li>
                    <li>✅ Completed Modules: {course.completedModules}</li>
                  </ul>
                  <div className="mt-4">
                    <Link href={`/student/courses/${course.slug}`}>
                      <Button>
                        <PlayCircle className="mr-2 h-4 w-4" />
                        Continue Course
                      </Button>
                    </Link>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Streak and Tip stacked */}
        <div className="flex flex-col gap-4">
          {/* Day Wise Streak */}
          <Card className="shadow-sm hover:shadow-lg transition-shadow duration-200 ease-in-out">
            <div className="px-5 py-4 border-b border-gray-200">
              <h2 className="text-lg font-medium text-gray-800">Your Day Wise Streak</h2>
            </div>
            <CardContent className="p-5">
              <DailyStreak dailyWatchTime={dashboardData.dailyWatchTime} />
            </CardContent>
          </Card>

          {/* Tip of the Day */}
          <Card className="shadow-sm hover:shadow-lg transition-shadow duration-200 ease-in-out">
            <div className="px-5 py-4 border-b border-gray-200">
              <h2 className="text-lg font-medium text-gray-800">Tip of the Day</h2>
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
        </div>

        {/* Daily Watch Time Chart */}
        <Card className="shadow-sm hover:shadow-lg transition-shadow duration-200 ease-in-out">
          <div className="px-5 py-4 border-b border-gray-200">
            <h2 className="text-lg font-medium text-gray-800">Daily Watch Time</h2>
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
      <div className="grid grid-cols-1 md:grid-cols-10 gap-4 mb-6">
        <div className="md:col-span-10">
          <ModuleBreakdown modules={dashboardData.course?.modules || []} />
        </div>
        <div className="md:col-span-10">
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
        <div className="px-5 py-4 border-b border-gray-200">
          <h2 className="text-lg font-medium text-gray-800">Upcoming Live Classes</h2>
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
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
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
