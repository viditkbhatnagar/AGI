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
import ProgressOverTime from '@/components/student/ProgressOverTime';
import ActivityHeatmap from '@/components/student/ActivityHeatmap';

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
import { useState, useEffect, useMemo } from "react";
import AttendanceCalendar from "@/components/student/AttendanceCalendar";
import FinalExamScoresChart from "@/components/student/FinalExamScoresChart";
import { Trophy } from "lucide-react";
import { useLocation } from "wouter";

// Types based on API response from server
interface DashboardData {
  monthlyAttendanceRate: number;
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
    description: string; // Add description field
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
  finalExamStatus?: {
    available: boolean;
    eligible: boolean;
    canAttempt: boolean;
    attempts: number;
    maxAttempts: number;
    bestScore: number | null;
    passed: boolean;
  };
  finalExamScores?: Array<{
    score: number;
    maxScore: number;
    percentage: number;
    passed: boolean;
    attemptedAt: string;
    attemptNumber: number;
  }>;
}


export function StudentDashboard() {
  const { student } = useAuth();
  const [dashboardData, setDashboardData] = useState<DashboardData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  // List of enrolled courses for course picker
  const [courses, setCourses] = useState<{ slug: string; title: string }[]>([]);
  const [selectedCourse, setSelectedCourse] = useState<string | null>(null);
  // useLocation returns [currentPath, setLocation]. We alias setLocation as navigate for clarity.
  const [, navigate] = useLocation();
  // Motivational tips
  // derive quizScores array safely before any returns
  const quizScoresArray = dashboardData?.quizScores ?? [];

  // compute quiz performance as average of best scores per module
  const computedQuizPerformance = useMemo(() => {
    if (quizScoresArray.length === 0) return null;
    // Group scores by quiz title and take the best (highest) per module
    const bestScoresMap: Record<string, number> = {};
    quizScoresArray.forEach(({ title, score }) => {
      if (
        !(title in bestScoresMap) ||
        score > bestScoresMap[title]
      ) {
        bestScoresMap[title] = score;
      }
    });
    const bestScores = Object.values(bestScoresMap);
    const totalBest = bestScores.reduce((sum, s) => sum + s, 0);
    const avgBest = totalBest / bestScores.length;
    return Number(avgBest.toFixed(2));
  }, [quizScoresArray]);

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
  // ----------- Progress‑over‑time date range (defaults to last 3 days) -----------
  const todayISO = new Date().toISOString().slice(0, 10);
  const threeDaysAgoISO = new Date(Date.now() - 2 * 24 * 60 * 60 * 1000)
    .toISOString()
    .slice(0, 10);

  const [startDate, setStartDate] = useState<string>(threeDaysAgoISO);
  const [endDate, setEndDate] = useState<string>(todayISO);
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
    dailyWatchTime,
    // quizScores, // No longer destructured, use quizScoresArray if needed
    course,
    upcomingLiveClasses,
    attendance,
    weeklyAttendanceRate,
    watchTimeInMinutes,
  } = dashboardData;

  // Build cumulative % series for the Progress‑over‑time line chart
  const progressSeries = (() => {
    const sorted = [...dailyWatchTime].sort(
      (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()
    );
    let running = 0;
    const total = watchTimeInMinutes || sorted.reduce((s, d) => s + d.minutes, 0);
    return sorted.map(({ date, minutes }) => {
      running += minutes;
      return {
        date: date.slice(5),     // label "MM‑DD" for the chart
        iso: date,               // full YYYY‑MM‑DD for range filtering
        percent: total ? Math.min(100, Math.round((running / total) * 100)) : 0,
      };
    });
  })();

  const filteredSeries = progressSeries.filter(
    (p) => p.iso >= startDate && p.iso <= endDate
  );

  // ---------------- Activity heat‑map matrix (last 4 weeks) ----------------
  const heatmapMatrix = (() => {
    // 4 rows (weeks) × 7 cols (days), most‑recent week is row 0
    const matrix = Array.from({ length: 4 }, () => Array(7).fill(0));
    dailyWatchTime.forEach(({ date, minutes }) => {
      const d = new Date(date);
      if (isNaN(d.getTime())) return;
      const day = d.getDay(); // 0 = Sun
      const weeksAgo = Math.floor(
        (Date.now() - d.getTime()) / (7 * 24 * 60 * 60 * 1000)
      );
      if (weeksAgo >= 0 && weeksAgo < 4) {
        matrix[weeksAgo][day] += minutes;
      }
    });
    return matrix.reverse(); // oldest on top, newest on bottom
  })();
  
  return (
    <div className="min-h-screen bg-[#FEFDF7] p-4 md:p-6">
      {/* Welcome Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6">
        <h1 className="text-[25px] font-bold text-gray-800">
          Welcome back, {student?.name?.split(' ')[0]}!
        </h1>
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
      <Card className="rounded-3xl overflow-hidden shadow-lg mb-6" style={{ background: "#FEFDF7" }}>
        <div className="w-full bg-[#375BBE] text-white p-8 shadow-xl">
          <div className="flex flex-col lg:flex-row">
            {/* Left Column: Course info */}
            <div className="lg:w-1/2 pr-6">
              <h2 className="text-3xl sm:text-4xl md:text-5xl font-semibold mb-2 break-words">
                {course?.title}
              </h2>
              <div className="space-y-2 text-sm mb-4">
                <div className="flex items-center">
                  <CalendarClock className="mr-2 h-5 w-5 stroke-2 text-[#FF7F50]" />
                  <span><strong>Enrolled:</strong> {course && course.enrollment && formatDateTime(course.enrollment.enrollDate)}</span>
                </div>
                <div className="flex items-center">
                  <Clock className="mr-2 h-5 w-5 stroke-2 text-[#FF7F50]" />
                  <span><strong>Valid until:</strong> {course && course.enrollment ? formatDateTime(course.enrollment.validUntil) : 'N/A'}</span>
                </div>
              </div>
              <p className="text-sm mb-6">{course?.description}</p>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-base font-semibold mb-8">
                <div>Live Classes Scheduled : {upcomingLiveClasses.length}</div>
                <div>Documents Viewed : {dashboardData.documentsViewed}</div>
              </div>
              <a
                href={`/student/courses/${selectedCourse || course?.slug}`}
                className="mt-6 block"
              >
                <Button className="bg-[#FF7F50] text-white rounded-lg py-3 px-6 text-xl">
                  Continue Learning
                </Button>
              </a>
            </div>

            {/* Right Column: 3-metric grid */}
            <div className="lg:w-1/2 mt-6 lg:mt-0">
            <div className="grid grid-cols-1 sm:grid-cols-3 bg-[#FAF3E0] text-[#2E3A59] divide-y sm:divide-y-0 sm:divide-x divide-[#2E3A59]/30 gap-0 p-4 rounded-xl">
                <div className="text-center px-4 py-6">
                  <PieChart className="mx-auto h-8 w-8 mb-2 text-[#2E3A59]" />
                  <div className="text-3xl font-bold">{courseProgress || 0}%</div>
                  <div className="text-xl mt-1">Course Progress</div>
                </div>
                <div className="text-center px-4 py-6">
                  <Clock className="mx-auto h-8 w-8 mb-2 text-[#2E3A59]" />
                  <div className="text-3xl font-bold">{watchTime.total}</div>
                  <div className="text-xl mt-1">Watch Time</div>
                </div>
                <div className="text-center px-4 py-6">
                  <BookOpen className="mx-auto h-8 w-8 mb-2 text-[#2E3A59]" />
                  <div className="text-3xl font-bold">{course?.completedModules}/{course?.totalModules}</div>
                  <div className="text-xl mt-1">Modules Completed</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </Card>

        {/* Three‑column dashboard section */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          {/* Column 1: Daily Watch Time Chart */}
          <Card className="rounded-3xl shadow-sm hover:shadow-lg transition-shadow duration-200 ease-in-out bg-[#FEFDF7] text-[#6D0016]">
            <div className="px-5 py-4 bg-[#375BBE] rounded-t-3xl">
              <h2 className="text-2xl font-semibold text-white">Daily Watch Time Analysis</h2>
            </div>
            <CardContent className="p-5">
              <ProgressChart
                data={dashboardData.dailyWatchTime}
                watchTime={dashboardData.watchTime}
              />
              {/* Removed inline header as per instructions */}
              <p className="mt-2 text-xl font-large text-[#FF7F50]">
                Your Weekly Watch time is <strong>{dashboardData.watchTime.thisWeek}</strong> and your total watch time till date is <strong>{dashboardData.watchTime.total}</strong>
              </p>
            </CardContent>
          </Card>

          {/* Column 2: Upcoming Live Classes */}
          <Card className="rounded-3xl overflow-hidden shadow-sm hover:shadow-lg transition-shadow bg-[#FEFDF7]">
            <div className="px-6 py-3 bg-[#375BBE] text-white rounded-t-3xl">
              <h2 className="text-[22px] font-bold text-white">Upcoming Live Classes</h2>
            </div>
            <CardContent className="p-6 text-[#2E3A59] bg-[#FEFDF7] rounded-b-3xl">
              {upcomingLiveClasses?.length > 0 ? (
                upcomingLiveClasses.map((liveClass) => (
                  <div key={liveClass._id} className="border border-gray-200 rounded-lg p-4 mb-4">
                    <div className="flex flex-col md:flex-row md:items-center justify-between">
                      <div>
                        <div className="flex items-center">
                          <CalendarClock className="text-[#2E3A59] mr-2 h-5 w-5" />
                          <h3 className="font-medium text-[#2E3A59]">{liveClass.title}</h3>
                        </div>
                        <p className="text-sm mt-1 text-[#2E3A59]">Course: {liveClass.courseSlug}</p>
                        <div className="flex items-center mt-2">
                          <span className="text-sm text-[#2E3A59]">{formatDateTime(liveClass.startTime)}</span>
                          <span className="mx-2 text-gray-300">|</span>
                          <span className="text-sm text-[#2E3A59]">
                            {Math.round((new Date(liveClass.endTime).getTime() - new Date(liveClass.startTime).getTime()) / (1000 * 60))} minutes
                          </span>
                        </div>
                      </div>
                      <div className="mt-4 md:mt-0">
                        {(() => {
                          const now = new Date();
                          const start = new Date(liveClass.startTime);
                          const end = new Date(liveClass.endTime);
                          const isActive =
                            now >= new Date(start.getTime() - 15 * 60000) &&
                            now <= new Date(end.getTime() + 15 * 60000);
                          if (!liveClass.meetLink) return null;
                          return isActive ? (
                            <a
                              href={liveClass.meetLink}
                              target="_blank"
                              rel="noopener noreferrer"
                            >
                              <Button className="bg-[#FF7F50] text-white rounded-lg py-2 px-4">
                                Join Session
                              </Button>
                            </a>
                          ) : (
                            <Button
                              disabled
                              className="bg-gray-300 text-white rounded-lg py-2 px-4 cursor-not-allowed"
                            >
                              Join Session
                            </Button>
                          );
                        })()}
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

          {/* Column 3: Daily Attendance */}
            <AttendanceCalendar
              attendance={dashboardData.attendance}
              weeklyAttendanceRate={dashboardData.weeklyAttendanceRate}
              monthlyAttendanceRate={dashboardData.monthlyAttendanceRate}
            />
        </div>

      {/* Module Breakdown, Day Wise Streak, and Time Allocation */}
      <div className="grid grid-cols-1 md:grid-cols-[65%_35%] gap-4 mb-6">
        <ModuleBreakdown modules={dashboardData.course?.modules || []} />
        <div className="flex flex-col gap-4">
          <Card className="shadow-sm hover:shadow-lg transition-shadow rounded-3xl overflow-hidden">
            <div className="px-5 py-4" style={{ backgroundColor: "#375BBE" }}>
              <h2 className="text-2xl font-medium text-white">Streak Counter</h2>
            </div>
            <div className="rounded-b-3xl">
              <DailyStreak dailyWatchTime={dashboardData.dailyWatchTime} />
            </div>
          </Card>
          <Card className="shadow-sm hover:shadow-lg transition-shadow rounded-3xl overflow-hidden bg-[#FEFDF7]">
            <div className="px-5 py-4 bg-[#375BBE] rounded-t-3xl">
              <h2 className="text-2xl font-semibold text-white">Tip of the Day</h2>
            </div>
            <CardContent className="p-6 text-[#2E3A59] bg-[#FEFDF7] rounded-b-3xl">
              <p className="text-base italic">"{tip}"</p>
            </CardContent>
          </Card>
          <TimeAllocation
            data={[
              { name: "Total time previews", value: dashboardData.documentsViewed },
              { name: "Total quiz time", value: dashboardData.quizScores.reduce((sum, q) => sum + q.score, 0) }
            ]}
          />
        </div>
      </div>
      {/* Bottom row: Progress‑over‑time + placeholder */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
        {/* Progress Over Time */}
        <Card className="rounded-3xl overflow-hidden shadow-sm hover:shadow-lg transition-shadow bg-[#FEFDF7]">
          <div className="px-5 py-4 bg-[#375BBE] rounded-t-3xl flex flex-col md:flex-row md:items-center md:justify-between">
            <h2 className="text-2xl font-semibold text-white mb-3 md:mb-0">Progress Over Time</h2>
            {/* Date range picker */}
            <div className="flex items-center space-x-2 text-[#FEFDF7]">
              <input
                type="date"
                value={startDate}
                max={endDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="rounded px-2 py-1 text-[#2E3A59]"
              />
              <span className="text-white">to</span>
              <input
                type="date"
                value={endDate}
                min={startDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="rounded px-2 py-1 text-[#2E3A59]"
              />
            </div>
          </div>
          <CardContent className="p-6 bg-[#FEFDF7]">
            <ProgressOverTime dates={filteredSeries.map(({ date, percent }) => ({ date, percent }))} />
          </CardContent>
        </Card>

        {/* Activity Heatmap */}
        <Card className="rounded-3xl overflow-hidden shadow-sm hover:shadow-lg transition-shadow bg-[#FEFDF7]">
          <div className="px-5 py-4 bg-[#375BBE] rounded-t-3xl">
            <h2 className="text-2xl font-semibold text-white">Activity Heatmap</h2>
          </div>
          <CardContent className="p-6 bg-[#FEFDF7] flex justify-center">
            <ActivityHeatmap matrix={heatmapMatrix} />
          </CardContent>
        </Card>
      </div>

      {/* Final Examination Section */}
      {dashboardData.finalExamStatus && dashboardData.finalExamStatus.available && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
          {/* Final Exam Status Card */}
          <Card className="rounded-3xl overflow-hidden shadow-sm hover:shadow-lg transition-shadow bg-[#FEFDF7]">
            <div className="px-5 py-4 bg-[#375BBE] rounded-t-3xl">
              <h2 className="text-2xl font-semibold text-white">Final Examination</h2>
            </div>
            <CardContent className="p-6 bg-[#FEFDF7]">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center">
                  <Trophy className="h-12 w-12 text-yellow-500 mr-4" />
                  <div>
                    <h3 className="text-xl font-semibold text-[#2E3A59]">
                      {dashboardData.finalExamStatus.passed ? 'Passed!' : 'Ready for Final Exam'}
                    </h3>
                    <p className="text-sm text-gray-600">
                      {dashboardData.finalExamStatus.eligible 
                        ? `${dashboardData.finalExamStatus.attempts} of ${dashboardData.finalExamStatus.maxAttempts} attempts used`
                        : 'Complete all modules to unlock'}
                    </p>
                  </div>
                </div>
              </div>

              {dashboardData.finalExamStatus.eligible ? (
                <div className="space-y-4">
                  {dashboardData.finalExamStatus.bestScore !== null && (
                    <div className="bg-gray-100 p-4 rounded-lg">
                      <p className="text-sm text-gray-600">Best Score</p>
                      <p className="text-2xl font-bold text-[#2E3A59]">
                        {dashboardData.finalExamStatus.bestScore}%
                      </p>
                    </div>
                  )}
                  
                  {dashboardData.finalExamStatus.canAttempt && (
                    <Button 
                      className="w-full bg-[#FF7F50] text-white rounded-lg py-3 text-lg font-semibold"
                      onClick={() => navigate(`/student/courses/${selectedCourse || course?.slug}?showFinalExam=true`)}
                    >
                      {dashboardData.finalExamStatus.attempts > 0 ? 'Retake Final Exam' : 'Take Final Exam'}
                    </Button>
                  )}
                  
                  {!dashboardData.finalExamStatus.canAttempt && dashboardData.finalExamStatus.attempts >= dashboardData.finalExamStatus.maxAttempts && (
                    <div className="bg-red-50 p-4 rounded-lg">
                      <p className="text-red-700 font-medium">
                        Maximum attempts reached
                      </p>
                    </div>
                  )}
                </div>
              ) : (
                <div className="bg-yellow-50 p-4 rounded-lg">
                  <p className="text-yellow-800">
                    Complete all {course?.totalModules} modules to unlock the final examination.
                    You have completed {course?.completedModules} modules so far.
                  </p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Final Exam Scores Chart */}
          {dashboardData.finalExamScores && dashboardData.finalExamScores.length > 0 && (
            <FinalExamScoresChart 
              data={dashboardData.finalExamScores}
              passingScore={70}
            />
          )}
        </div>
      )}
      
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
