import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/lib/auth-provider";
import BarLoader from "@/components/ui/bar-loader";
import AttendanceCalendar from "@/components/student/AttendanceCalendar";

// Enhanced ECharts components
import GaugeChart from "@/components/student/charts/GaugeChart";
import ModuleProgressChart from "@/components/student/charts/ModuleProgressChart";
import MiniAreaChart from "@/components/student/charts/MiniAreaChart";
import WeeklyActivityChart from "@/components/student/charts/WeeklyActivityChart";
import CompletionDonutChart from "@/components/student/charts/CompletionDonutChart";
import LearningTrendChart from "@/components/student/charts/LearningTrendChart";
import LearningTimeline from "@/components/student/charts/LearningTimeline";
import StudyStreakCard from "@/components/student/charts/StudyStreakCard";
import ActivityPolarChart from "@/components/student/charts/ActivityPolarChart";
import ProgressRingChart from "@/components/student/charts/ProgressRingChart";
import QuizPerformanceChart from "@/components/student/charts/QuizPerformanceChart";
import AchievementBadges from "@/components/student/charts/AchievementBadges";
import LearningGoalsCard from "@/components/student/charts/LearningGoalsCard";
import PerformanceScorecard from "@/components/student/charts/PerformanceScorecard";
import SkillMasteryChart from "@/components/student/charts/SkillMasteryChart";

import {
  CalendarClock,
  Clock,
  PlayCircle,
  BookOpen,
  Trophy,
  Video,
  TrendingUp,
  Target,
  FileText,
  Zap,
  Award,
  ChevronRight,
  Sparkles,
} from "lucide-react";

import { formatDateTime } from "@/lib/utils";
import { useState, useEffect, useMemo } from "react";
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
    description: string;
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
  const [coursesLoading, setCoursesLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const [courses, setCourses] = useState<{ slug: string; title: string }[]>([]);
  const [selectedCourse, setSelectedCourse] = useState<string | null>(null);
  const [, navigate] = useLocation();
  
  const quizScoresArray = dashboardData?.quizScores ?? [];

  const computedQuizPerformance = useMemo(() => {
    if (quizScoresArray.length === 0) return null;
    const bestScoresMap: Record<string, number> = {};
    quizScoresArray.forEach(({ title, score }) => {
      if (!(title in bestScoresMap) || score > bestScoresMap[title]) {
        bestScoresMap[title] = score;
      }
    });
    const bestScores = Object.values(bestScoresMap);
    const totalBest = bestScores.reduce((sum, s) => sum + s, 0);
    const avgBest = totalBest / bestScores.length;
    return Number(avgBest.toFixed(2));
  }, [quizScoresArray]);

  // Motivational tips
  const TIPS = [
    "Consistency is key—any progress is good progress!",
    "You're one step closer to mastery every time you log in.",
    "Small daily improvements lead to stunning results.",
    "Hard work beats talent when talent doesn't work hard.",
    "Don't watch the clock; do what it does—keep going.",
    "Believe you can and you're halfway there.",
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
  
  // Load enrolled courses
  useEffect(() => {
    const token = localStorage.getItem('token');
    if (!token) {
      setCoursesLoading(false);
      return;
    }
    
    setCoursesLoading(true);
    fetch('/api/student/courses', {
      headers: { Authorization: `Bearer ${token}` }
    })
      .then(res => res.json())
      .then((data: { slug: string; title: string }[]) => {
        setCourses(data);
        if (data.length > 0) {
          setSelectedCourse(data[0].slug);
        }
        setCoursesLoading(false);
      })
      .catch((err) => {
        console.error(err);
        setCoursesLoading(false);
      });
  }, []);

  useEffect(() => {
    const fetchDashboardData = async () => {
      const token = localStorage.getItem('token');
      if (!token) {
        setIsLoading(false);
        return;
      }
      
      if (!selectedCourse) {
        if (!coursesLoading) {
          setIsLoading(false);
        }
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
  }, [selectedCourse, coursesLoading]);
  
  if (isLoading || coursesLoading) {
    return <DashboardSkeleton />;
  }
  
  if (error) {
    return (
      <div className="p-4 md:p-8">
        <h1 className="font-heading text-2xl font-bold text-slate-800 mb-4">Dashboard</h1>
        <Card className="bg-white rounded-xl border border-slate-200">
          <CardContent className="p-6">
            <p className="text-red-500">Error loading dashboard data: {error.message}</p>
          </CardContent>
        </Card>
      </div>
    );
  }
  
  if (!dashboardData) {
    return (
      <div className="p-4 md:p-8">
        <h1 className="font-heading text-2xl font-bold text-slate-800 mb-4">Dashboard</h1>
        <Card className="bg-white rounded-xl border border-slate-200">
          <CardContent className="p-6">
            <p className="text-amber-600">No dashboard data available. Please try again later.</p>
          </CardContent>
        </Card>
      </div>
    );
  }
  
  const {
    courseProgress,
    watchTime,
    dailyWatchTime,
    course,
    upcomingLiveClasses,
    attendance,
    weeklyAttendanceRate,
    watchTimeInMinutes,
  } = dashboardData;

  // Build cumulative % series for the Learning Trend chart
  const progressSeries = (() => {
    const sorted = [...dailyWatchTime].sort(
      (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()
    );
    let running = 0;
    const total = watchTimeInMinutes || sorted.reduce((s, d) => s + d.minutes, 0);
    return sorted.map(({ date, minutes }) => {
      running += minutes;
      return {
        date,
        percentComplete: total ? Math.min(100, Math.round((running / total) * 100)) : 0,
      };
    });
  })();

  // Calculate streak data
  const streakData = (() => {
    const sorted = [...dailyWatchTime]
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    
    let currentStreak = 0;
    let longestStreak = 0;
    let tempStreak = 0;
    const today = new Date().toISOString().slice(0, 10);
    const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
    
    // Check if studied today
    const todayCompleted = sorted.some(d => d.date === today && d.minutes > 0);
    
    // Calculate current streak
    for (const d of sorted) {
      if (d.minutes > 0) {
        tempStreak++;
        if (tempStreak > longestStreak) longestStreak = tempStreak;
      } else {
        tempStreak = 0;
      }
    }
    
    // Simple current streak calc
    for (const d of sorted) {
      if (d.minutes > 0) {
        currentStreak++;
      } else {
        break;
      }
    }
    
    return { currentStreak, longestStreak: Math.max(longestStreak, 7), todayCompleted };
  })();

  // Generate timeline items from recent activity
  const timelineItems = (() => {
    const items: Array<{
      id: string;
      type: 'video' | 'document' | 'quiz' | 'achievement' | 'lesson';
      title: string;
      time: string;
      duration?: string;
      status?: 'completed' | 'in_progress';
    }> = [];

    // Add recent study sessions
    dailyWatchTime.slice(-8).reverse().forEach((d, i) => {
      if (d.minutes > 0) {
        const date = new Date(d.date);
        items.push({
          id: `study-${i}`,
          type: 'video',
          title: `Study session - ${d.minutes} minutes`,
          time: date.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' }),
          duration: `${d.minutes}m`,
          status: 'completed'
        });
      }
    });

    // Add quiz attempts
    quizScoresArray.slice(-5).forEach((q, i) => {
      items.push({
        id: `quiz-${i}`,
        type: 'quiz',
        title: q.title,
        time: 'Recently',
        status: q.score >= 70 ? 'completed' : 'in_progress'
      });
    });

    // Add document views
    if (dashboardData.documentsViewed > 0) {
      items.push({
        id: 'doc-1',
        type: 'document',
        title: `Viewed ${dashboardData.documentsViewed} documents`,
        time: 'This week',
        status: 'completed'
      });
    }

    // Add module completion achievements
    if (course?.completedModules && course.completedModules > 0) {
      items.push({
        id: 'achievement-modules',
        type: 'achievement',
        title: `Completed ${course.completedModules} modules`,
        time: 'Progress',
        status: 'completed'
      });
    }

    // Add lesson progress
    if (course?.modules && course.modules.length > 0) {
      const inProgressModules = course.modules.filter(m => m.percentComplete > 0 && m.percentComplete < 100);
      inProgressModules.slice(0, 2).forEach((m, i) => {
        items.push({
          id: `lesson-${i}`,
          type: 'lesson',
          title: m.title,
          time: `${m.percentComplete}% complete`,
          status: 'in_progress'
        });
      });
    }

    return items.slice(0, 10);
  })();

  // Data for completion donut
  const completionData = [
    { name: "Completed", value: course?.completedModules || 0, color: "#8BC34A" },
    { name: "Remaining", value: (course?.totalModules || 0) - (course?.completedModules || 0), color: "#e2e8f0" }
  ];

  // Data for time allocation
  const timeAllocationData = [
    { name: "Videos", value: watchTimeInMinutes, color: "#18548b" },
    { name: "Documents", value: dashboardData.documentsViewed * 5, color: "#FF7F11" },
    { name: "Quizzes", value: quizScoresArray.length * 10, color: "#8BC34A" }
  ];

  // Sparkline data for stat cards
  const watchTimeSparkline = dailyWatchTime.slice(-7).map(d => d.minutes);
  const progressSparkline = progressSeries.slice(-7).map(d => d.percentComplete);
  
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-slate-50 p-4 md:p-6 lg:p-8 font-display">
      <div className="max-w-[1600px] mx-auto">
        {/* Header Section */}
        <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4 mb-6">
          <div>
            <h1 className="font-heading text-2xl md:text-3xl font-bold text-slate-800">
              Welcome back, <span className="text-[#18548b]">{student?.name?.split(' ')[0]}</span>! 👋
            </h1>
            <p className="text-slate-500 mt-1 flex items-center gap-2">
              <Sparkles className="size-4 text-[#FF7F11]" />
              You've completed <span className="text-[#18548b] font-bold">{courseProgress || 0}%</span> of your course
            </p>
          </div>
        </div>

        {/* Course Picker - Horizontal Scroll */}
        {courses.length > 1 && (
          <div className="mb-6">
            <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3">My Courses</h3>
            <div className="flex gap-3 overflow-x-auto pb-2 scrollbar-hide -mx-2 px-2">
              {courses.map(c => (
                <button
                  key={c.slug}
                  onClick={() => setSelectedCourse(c.slug)}
                  className={`
                    relative flex-shrink-0 cursor-pointer rounded-2xl border-2 px-5 py-3 transition-all duration-300 
                    hover:shadow-lg group min-w-[200px] max-w-[240px] flex items-center justify-center text-center
                    ${selectedCourse === c.slug 
                      ? 'border-[#18548b] bg-gradient-to-br from-[#18548b]/10 to-[#18548b]/5 shadow-lg shadow-[#18548b]/10' 
                      : 'border-slate-200 bg-white hover:border-[#18548b]/40 hover:bg-slate-50'
                    }
                  `}
                >
                  {selectedCourse === c.slug && (
                    <div className="absolute -top-1.5 -right-1.5 size-6 bg-gradient-to-br from-[#18548b] to-[#1a6ab0] rounded-full flex items-center justify-center shadow-lg">
                      <svg className="size-3.5 text-white" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                      </svg>
                    </div>
                  )}
                  <h4 className={`font-semibold text-sm line-clamp-2 ${
                    selectedCourse === c.slug ? 'text-[#18548b]' : 'text-slate-700 group-hover:text-[#18548b]'
                  }`}>
                    {c.title}
                  </h4>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* 3-Column Bento Grid Layout */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-stretch">
          
          {/* ========== LEFT COLUMN - Main Content (4 cols) ========== */}
          <div className="lg:col-span-4 flex flex-col gap-5">
            
            {/* Continue Learning Card - Pastel Blue */}
            <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-blue-50 via-blue-50/80 to-indigo-50 p-6 border border-blue-100/50 shadow-sm">
              <div className="absolute top-0 right-0 w-40 h-40 bg-[#18548b]/5 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2" />
              
              <div className="relative z-10">
                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#18548b]/10 text-[#18548b] text-xs font-bold uppercase tracking-wider mb-3">
                  <PlayCircle className="size-3" />
                  Continue Learning
                </div>
                
                <h3 className="font-heading text-xl font-bold text-slate-800 mb-2 line-clamp-2">{course?.title}</h3>
                <p className="text-slate-500 text-sm mb-4 line-clamp-2">{course?.description}</p>
                
                {/* Progress bar */}
                <div className="flex items-center gap-3 mb-4">
                  <div className="flex-1 h-3 bg-white/80 rounded-full overflow-hidden shadow-inner">
                    <div 
                      className="h-full bg-gradient-to-r from-[#18548b] to-[#3b82f6] rounded-full transition-all duration-700" 
                      style={{ width: `${courseProgress || 0}%` }}
                    />
                  </div>
                  <span className="text-sm font-bold text-[#18548b] min-w-[45px]">{courseProgress || 0}%</span>
                </div>

                <div className="flex items-center gap-3">
                  <a href={`/student/courses/${selectedCourse || course?.slug}`} className="flex-1">
                    <Button className="w-full flex items-center justify-center gap-2 bg-[#18548b] hover:bg-[#134775] text-white px-5 py-3 rounded-xl transition-all shadow-lg shadow-[#18548b]/20 font-bold text-sm">
                      <PlayCircle className="size-4" />
                      Resume Course
                    </Button>
                  </a>
                </div>
              </div>
            </div>

            {/* Course Progress Gauge - Pastel Green */}
            <div className="rounded-2xl bg-gradient-to-br from-emerald-50 via-green-50/80 to-teal-50 p-6 border border-emerald-100/50 shadow-sm">
              <div className="flex items-center gap-2 mb-4">
                <Target className="size-5 text-emerald-600" />
                <h3 className="font-heading text-lg font-bold text-slate-800">Overall Progress</h3>
              </div>
              <GaugeChart progress={courseProgress || 0} title="Course Completion" />
              
              <div className="grid grid-cols-3 gap-4 mt-4 pt-4 border-t border-emerald-200/50">
                <div className="text-center">
                  <p className="text-2xl font-bold text-slate-800">{course?.completedModules || 0}</p>
                  <p className="text-xs text-slate-500">Completed</p>
                </div>
                <div className="text-center">
                  <p className="text-2xl font-bold text-slate-800">{course?.totalModules || 0}</p>
                  <p className="text-xs text-slate-500">Total</p>
                </div>
                <div className="text-center">
                  <p className="text-2xl font-bold text-[#FF7F11]">{(course?.totalModules || 0) - (course?.completedModules || 0)}</p>
                  <p className="text-xs text-slate-500">Remaining</p>
                </div>
              </div>
            </div>

            {/* Module Progress - Pastel Purple */}
            <div className="rounded-2xl bg-gradient-to-br from-violet-50 via-purple-50/80 to-fuchsia-50 p-6 border border-violet-100/50 shadow-sm">
              <div className="flex items-center gap-2 mb-2">
                <Award className="size-5 text-violet-600" />
                <h3 className="font-heading text-lg font-bold text-slate-800">Module Progress</h3>
              </div>
              <ModuleProgressChart modules={course?.modules || []} />
            </div>

            {/* Skill Mastery Radar - Pastel Cyan */}
            <div className="rounded-2xl bg-gradient-to-br from-cyan-50 via-sky-50/80 to-blue-50 p-6 border border-cyan-100/50 shadow-sm">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <Target className="size-5 text-cyan-600" />
                  <h3 className="font-heading text-lg font-bold text-slate-800">Skill Mastery</h3>
                </div>
                <span className="text-xs text-slate-400">{course?.modules?.length || 0} skills</span>
              </div>
              <SkillMasteryChart modules={course?.modules || []} />
            </div>

            {/* Performance Scorecard */}
            <div className="rounded-2xl bg-gradient-to-br from-slate-50 via-gray-50/80 to-zinc-50 p-6 border border-slate-100/50 shadow-sm">
              <div className="flex items-center gap-2 mb-4">
                <Trophy className="size-5 text-amber-500" />
                <h3 className="font-heading text-lg font-bold text-slate-800">Performance Score</h3>
              </div>
              <PerformanceScorecard 
                courseProgress={courseProgress || 0}
                quizAverage={computedQuizPerformance}
                watchTimeMinutes={watchTimeInMinutes}
                modulesCompleted={course?.completedModules || 0}
                totalModules={course?.totalModules || 0}
              />
            </div>

            {/* Final Examination Card */}
            {dashboardData.finalExamStatus && dashboardData.finalExamStatus.available && (
              <div className="rounded-2xl bg-gradient-to-br from-amber-50 via-yellow-50/80 to-orange-50 p-6 border border-amber-100/50 shadow-sm">
                <div className="flex items-center gap-4 mb-4">
                  <div className="size-12 rounded-xl bg-gradient-to-br from-amber-400 to-orange-400 flex items-center justify-center shadow-lg">
                    <Trophy className="size-6 text-white" />
                  </div>
                  <div>
                    <h3 className="font-heading text-lg font-bold text-slate-800">
                      {dashboardData.finalExamStatus.passed ? '🎉 Passed!' : 'Final Examination'}
                    </h3>
                    <p className="text-sm text-slate-500">
                      {dashboardData.finalExamStatus.eligible 
                        ? `${dashboardData.finalExamStatus.attempts}/${dashboardData.finalExamStatus.maxAttempts} attempts`
                        : 'Complete all modules to unlock'}
                    </p>
                  </div>
                </div>

                {dashboardData.finalExamStatus.eligible ? (
                  <div className="space-y-4">
                    {dashboardData.finalExamStatus.bestScore !== null && (
                      <div className="flex items-center justify-between p-4 bg-white/60 rounded-xl">
                        <span className="text-sm text-slate-600">Best Score</span>
                        <span className="text-2xl font-bold text-[#18548b]">
                          {dashboardData.finalExamStatus.bestScore}%
                        </span>
                      </div>
                    )}
                    
                    {dashboardData.finalExamStatus.canAttempt && (
                      <Button 
                        className="w-full bg-gradient-to-r from-[#FF7F11] to-orange-500 hover:from-orange-600 hover:to-orange-500 text-white rounded-xl py-3 font-bold shadow-lg shadow-orange-200"
                        onClick={() => navigate(`/student/courses/${selectedCourse || course?.slug}?showFinalExam=true`)}
                      >
                        {dashboardData.finalExamStatus.attempts > 0 ? 'Retake Exam' : 'Take Final Exam'}
                        <ChevronRight className="size-4 ml-1" />
                      </Button>
                    )}
                  </div>
                ) : (
                  <div className="p-4 bg-amber-100/50 rounded-xl">
                    <p className="text-amber-800 text-sm">
                      Complete {(course?.totalModules || 0) - (course?.completedModules || 0)} more modules to unlock
                    </p>
                  </div>
                )}
              </div>
            )}

            {/* Quick Stats Grid - Fill remaining space */}
            <div className="grid grid-cols-2 gap-4">
              {/* Documents Viewed */}
              <div className="rounded-2xl bg-gradient-to-br from-amber-50 via-orange-50/80 to-yellow-50 p-4 border border-amber-100/50 shadow-sm">
                <div className="flex items-center gap-2 mb-2">
                  <FileText className="size-4 text-amber-500" />
                  <span className="text-xs font-medium text-slate-500">Documents</span>
                </div>
                <p className="text-2xl font-bold text-slate-800">{dashboardData.documentsViewed}</p>
                <p className="text-xs text-slate-400 mt-1">Files viewed</p>
              </div>

              {/* Study Sessions */}
              <div className="rounded-2xl bg-gradient-to-br from-violet-50 via-purple-50/80 to-indigo-50 p-4 border border-violet-100/50 shadow-sm">
                <div className="flex items-center gap-2 mb-2">
                  <BookOpen className="size-4 text-violet-500" />
                  <span className="text-xs font-medium text-slate-500">Sessions</span>
                </div>
                <p className="text-2xl font-bold text-slate-800">{dailyWatchTime.filter(d => d.minutes > 0).length}</p>
                <p className="text-xs text-slate-400 mt-1">Study days</p>
              </div>
            </div>

            {/* Average Session Duration Card */}
            <div className="rounded-2xl bg-gradient-to-br from-sky-50 via-blue-50/80 to-cyan-50 p-4 border border-sky-100/50 shadow-sm">
              <div className="flex items-center justify-between">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <Clock className="size-4 text-sky-500" />
                    <span className="text-xs font-medium text-slate-500">Avg. Session</span>
                  </div>
                  <p className="text-2xl font-bold text-slate-800">
                    {dailyWatchTime.filter(d => d.minutes > 0).length > 0 
                      ? Math.round(watchTimeInMinutes / dailyWatchTime.filter(d => d.minutes > 0).length)
                      : 0}
                    <span className="text-sm font-normal text-slate-500 ml-1">min</span>
                  </p>
                </div>
                <div className="size-12 rounded-full bg-gradient-to-br from-sky-400 to-blue-500 flex items-center justify-center">
                  <TrendingUp className="size-5 text-white" />
                </div>
              </div>
            </div>

            {/* Weekly Comparison */}
            <div className="rounded-2xl bg-gradient-to-br from-emerald-50 via-green-50/80 to-teal-50 p-5 border border-emerald-100/50 shadow-sm flex-1 flex flex-col">
              <div className="flex items-center gap-2 mb-4">
                <TrendingUp className="size-4 text-emerald-500" />
                <span className="text-xs font-medium text-slate-500">This Week vs Last Week</span>
              </div>
              <div className="flex-1 flex flex-col justify-center">
                <div className="flex items-end justify-between mb-6">
                  <div>
                    <p className="text-xs text-slate-400">This week</p>
                    <p className="text-2xl font-bold text-emerald-600">{watchTime.thisWeek}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-xs text-slate-400">Last week</p>
                    <p className="text-2xl font-bold text-slate-400">
                      {Math.round(dailyWatchTime.slice(-14, -7).reduce((sum, d) => sum + d.minutes, 0) / 60)}h
                    </p>
                  </div>
                </div>
                <div className="h-24 flex items-end gap-1.5">
                  {dailyWatchTime.slice(-7).map((d, i) => (
                    <div 
                      key={i}
                      className="flex-1 bg-gradient-to-t from-emerald-500 to-emerald-300 rounded-t transition-all"
                      style={{ height: `${Math.max(8, (d.minutes / Math.max(...dailyWatchTime.slice(-7).map(x => x.minutes), 1)) * 100)}%` }}
                    />
                  ))}
                </div>
                <div className="flex justify-between mt-2 text-[10px] text-slate-400">
                  <span>Mon</span>
                  <span>Tue</span>
                  <span>Wed</span>
                  <span>Thu</span>
                  <span>Fri</span>
                  <span>Sat</span>
                  <span>Sun</span>
                </div>
              </div>
            </div>
          </div>

          {/* ========== MIDDLE COLUMN - Analytics (5 cols) ========== */}
          <div className="lg:col-span-5 flex flex-col gap-5">
            
            {/* Stats Row - Mini Cards */}
            <div className="grid grid-cols-2 gap-4">
              {/* Watch Time Card */}
              <div className="rounded-2xl bg-gradient-to-br from-rose-50 via-pink-50/80 to-rose-50 p-4 border border-rose-100/50 shadow-sm">
                <div className="flex items-center gap-2 mb-2">
                  <Clock className="size-4 text-rose-500" />
                  <span className="text-xs font-medium text-slate-500">Watch Time</span>
                </div>
                <p className="text-2xl font-bold text-slate-800">{watchTime.total}</p>
                <MiniAreaChart data={watchTimeSparkline} color="#f43f5e" height={40} />
              </div>

              {/* Quizzes Card */}
              <div className="rounded-2xl bg-gradient-to-br from-cyan-50 via-sky-50/80 to-cyan-50 p-4 border border-cyan-100/50 shadow-sm">
                <div className="flex items-center gap-2 mb-2">
                  <Zap className="size-4 text-cyan-500" />
                  <span className="text-xs font-medium text-slate-500">Quiz Score</span>
                </div>
                <p className="text-2xl font-bold text-slate-800">{computedQuizPerformance || 0}%</p>
                <MiniAreaChart data={quizScoresArray.slice(-7).map(q => q.score)} color="#06b6d4" height={40} />
              </div>
            </div>

            {/* Study Streak Card */}
            <StudyStreakCard 
              currentStreak={streakData.currentStreak}
              longestStreak={streakData.longestStreak}
              todayCompleted={streakData.todayCompleted}
            />

            {/* Learning Goals Card - Pastel Lime */}
            <div className="rounded-2xl bg-gradient-to-br from-lime-50 via-green-50/80 to-emerald-50 p-6 border border-lime-100/50 shadow-sm">
              <div className="flex items-center gap-2 mb-4">
                <Target className="size-5 text-lime-600" />
                <h3 className="font-heading text-lg font-bold text-slate-800">Learning Goals</h3>
              </div>
              <LearningGoalsCard 
                todayMinutes={dailyWatchTime.find(d => d.date === new Date().toISOString().slice(0, 10))?.minutes || 0}
                weekMinutes={dailyWatchTime.slice(-7).reduce((sum, d) => sum + d.minutes, 0)}
                streakDays={streakData.currentStreak}
              />
            </div>

            {/* Weekly Activity Chart - Pastel Orange */}
            <div className="rounded-2xl bg-gradient-to-br from-orange-50 via-amber-50/80 to-yellow-50 p-6 border border-orange-100/50 shadow-sm">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <TrendingUp className="size-5 text-orange-500" />
                  <h3 className="font-heading text-lg font-bold text-slate-800">Weekly Activity</h3>
                </div>
                <span className="text-xs text-slate-500">{watchTime.thisWeek} this week</span>
              </div>
              <WeeklyActivityChart dailyWatchTimes={dailyWatchTime} />
            </div>

            {/* Learning Trend - Pastel Teal */}
            <div className="rounded-2xl bg-gradient-to-br from-teal-50 via-emerald-50/80 to-green-50 p-6 border border-teal-100/50 shadow-sm">
              <div className="flex items-center gap-2 mb-4">
                <TrendingUp className="size-5 text-teal-600" />
                <h3 className="font-heading text-lg font-bold text-slate-800">Progress Trend</h3>
              </div>
              <LearningTrendChart progressData={progressSeries} />
            </div>

            {/* Time Allocation Donut */}
            <div className="rounded-2xl bg-gradient-to-br from-indigo-50 via-blue-50/80 to-violet-50 p-6 border border-indigo-100/50 shadow-sm">
              <div className="flex items-center gap-2 mb-4">
                <FileText className="size-5 text-indigo-600" />
                <h3 className="font-heading text-lg font-bold text-slate-800">Time Allocation</h3>
              </div>
              <CompletionDonutChart 
                data={timeAllocationData}
                centerText={`${Math.round(watchTimeInMinutes / 60)}h`}
                centerSubtext="Total"
              />
              <div className="flex justify-center gap-6 mt-4">
                {timeAllocationData.map((item) => (
                  <div key={item.name} className="flex items-center gap-2">
                    <div className="size-3 rounded-full" style={{ backgroundColor: item.color }} />
                    <span className="text-xs text-slate-600">{item.name}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Activity Distribution Polar Chart */}
            <div className="rounded-2xl bg-gradient-to-br from-fuchsia-50 via-pink-50/80 to-rose-50 p-6 border border-fuchsia-100/50 shadow-sm flex-1 flex flex-col">
              <div className="flex items-center gap-2 mb-4">
                <Target className="size-5 text-fuchsia-600" />
                <h3 className="font-heading text-lg font-bold text-slate-800">Day Distribution</h3>
              </div>
              <div className="flex-1 flex items-center justify-center">
                <ActivityPolarChart dailyWatchTimes={dailyWatchTime} />
              </div>
              <p className="text-xs text-slate-500 text-center mt-4">Average study time by day of week</p>
            </div>
          </div>

          {/* ========== RIGHT COLUMN - Calendar & Timeline (3 cols) ========== */}
          <div className="lg:col-span-3 flex flex-col gap-5">
            
            {/* Tip of the Day */}
            <div className="rounded-2xl bg-gradient-to-br from-[#18548b] to-[#1a6ab0] p-5 text-white shadow-lg relative overflow-hidden">
              <div className="absolute top-0 right-0 w-24 h-24 bg-white/10 rounded-full blur-2xl -translate-y-1/2 translate-x-1/2" />
              <div className="relative z-10">
                <div className="flex items-center gap-2 mb-2">
                  <Sparkles className="size-4" />
                  <span className="text-xs font-bold uppercase tracking-wider text-white/80">Tip of the Day</span>
                </div>
                <p className="text-sm italic text-white/90">"{tip}"</p>
              </div>
            </div>

            {/* Upcoming Live Classes */}
            <div className="rounded-2xl bg-white p-5 border border-slate-100 shadow-sm">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-heading text-base font-bold text-slate-800">Upcoming Live</h3>
                <a className="text-xs font-medium text-[#18548b] hover:underline" href="/student/courses">See all</a>
              </div>
              
              <div className="space-y-3 max-h-64 overflow-y-auto scrollbar-hide">
                {upcomingLiveClasses?.length > 0 ? (
                  upcomingLiveClasses.slice(0, 3).map((liveClass) => {
                    const start = new Date(liveClass.startTime);
                    const end = new Date(liveClass.endTime);
                    const now = new Date();
                    const isActive = now >= new Date(start.getTime() - 15 * 60000) && now <= new Date(end.getTime() + 15 * 60000);
                    const duration = Math.round((end.getTime() - start.getTime()) / (1000 * 60));

                    return (
                      <div key={liveClass._id} className="flex items-start gap-3 p-3 rounded-xl bg-slate-50 border border-slate-100 hover:bg-slate-100 transition-colors">
                        <div className="flex flex-col items-center min-w-[44px] bg-white rounded-lg p-2 border border-slate-100 shadow-sm">
                          <span className="text-[10px] font-bold text-slate-400 uppercase">
                            {start.toLocaleDateString('en-US', { month: 'short' })}
                          </span>
                          <span className="text-lg font-bold text-[#18548b]">
                            {start.getDate()}
                          </span>
                        </div>
                        <div className="flex-1 min-w-0">
                          {isActive && (
                            <p className="text-[10px] text-[#FF7F11] font-bold mb-0.5 flex items-center gap-1">
                              <span className="size-1.5 rounded-full bg-[#FF7F11] animate-pulse" />
                              Starting soon
                            </p>
                          )}
                          <h4 className="text-sm font-semibold text-slate-800 truncate">{liveClass.title}</h4>
                          <p className="text-xs text-slate-500">{duration} min</p>
                        </div>
                        {liveClass.meetLink && isActive && (
                          <a href={liveClass.meetLink} target="_blank" rel="noopener noreferrer">
                            <button className="size-9 bg-[#18548b] hover:bg-[#134775] text-white rounded-lg flex items-center justify-center transition-colors shadow-sm">
                              <Video className="size-4" />
                            </button>
                          </a>
                        )}
                      </div>
                    );
                  })
                ) : (
                  <div className="text-center py-6 text-slate-400">
                    <CalendarClock className="size-8 mx-auto mb-2 opacity-50" />
                    <p className="text-xs">No upcoming live classes</p>
                  </div>
                )}
              </div>
            </div>

            {/* Achievement Badges */}
            <div className="rounded-2xl bg-gradient-to-br from-amber-50 via-yellow-50/80 to-orange-50 p-5 border border-amber-100/50 shadow-sm">
              <div className="flex items-center gap-2 mb-4">
                <Award className="size-5 text-amber-500" />
                <h3 className="font-heading text-base font-bold text-slate-800">Achievements</h3>
              </div>
              <AchievementBadges 
                courseProgress={courseProgress || 0}
                modulesCompleted={course?.completedModules || 0}
                totalModules={course?.totalModules || 0}
                watchTimeMinutes={watchTimeInMinutes}
                quizAverage={computedQuizPerformance}
                streakDays={streakData.currentStreak}
              />
            </div>

            {/* Attendance Calendar */}
            <AttendanceCalendar
              attendance={attendance}
              weeklyAttendanceRate={weeklyAttendanceRate}
              monthlyAttendanceRate={dashboardData.monthlyAttendanceRate}
            />

            {/* Learning Timeline */}
            <div className="rounded-2xl bg-white p-5 border border-slate-100 shadow-sm flex-1 flex flex-col">
              <div className="flex items-center gap-2 mb-4">
                <Clock className="size-4 text-slate-500" />
                <h3 className="font-heading text-base font-bold text-slate-800">Recent Activity</h3>
              </div>
              <div className="flex-1 overflow-y-auto">
                <LearningTimeline items={timelineItems} />
              </div>
            </div>
          </div>

          {/* ========== FULL WIDTH - Quiz Scores (12 cols) ========== */}
          <div className="lg:col-span-12">
            <div className="rounded-2xl bg-gradient-to-br from-blue-50 via-indigo-50/80 to-violet-50 p-6 border border-blue-100/50 shadow-sm">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <Zap className="size-5 text-blue-600" />
                  <h3 className="font-heading text-lg font-bold text-slate-800">Quiz Scores</h3>
                </div>
                <span className="text-xs text-slate-400">{quizScoresArray.length} attempts</span>
              </div>
              <QuizPerformanceChart quizScores={quizScoresArray} />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function DashboardSkeleton() {
  return (
    <div className="h-[calc(100vh-80px)] w-full flex flex-col items-center justify-center bg-gradient-to-br from-slate-50 via-white to-slate-50">
      <BarLoader bars={10} barWidth={12} barHeight={80} color="bg-[#18548b]" speed={1.2} />
      <span className="text-slate-500 mt-6 text-lg font-display">Loading dashboard data...</span>
    </div>
  );
}

export default StudentDashboard;
