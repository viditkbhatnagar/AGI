import { useQuery } from "@tanstack/react-query";
import { useMemo } from 'react';
import { Link } from "wouter";
import { subMonths, format } from 'date-fns';
import { useConditionalRender } from '@/lib/permissions-provider';
import { Users, School, GraduationCap, CalendarClock } from "lucide-react";
import Calendar from "react-calendar";
import "react-calendar/dist/Calendar.css";

// Premium Dashboard Components
import { BackgroundOrbs } from '@/components/dashboard/background-orbs';
import { FloatingKpiCard } from '@/components/dashboard/floating-kpi-card';
import { AnimatedChartContainer } from '@/components/dashboard/animated-chart-container';
import { CommandBar } from '@/components/dashboard/command-bar';

// AI-Themed Chart Components
import { AnimatedCounter } from '@/components/dashboard/animated-counter';
import { NeuralDonutChart } from '@/components/dashboard/neural-donut-chart';
import { LiquidBarChart } from '@/components/dashboard/liquid-bar-chart';
import { RadialProgress } from '@/components/dashboard/radial-progress';
import { NeuralBarChart } from '@/components/dashboard/neural-bar-chart';
import { GradientBarChart } from '@/components/dashboard/gradient-bar-chart';

import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Tooltip, TooltipTrigger, TooltipContent, TooltipProvider } from "@/components/ui/tooltip";

// Helper to format ISO date-time strings
function formatDateTime(isoString: string): string {
  const d = new Date(isoString);
  const date = d.toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' });
  const time = d.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' });
  return `${date} ${time}`;
}

export function AdminDashboard() {
  const { renderIfCanCreate } = useConditionalRender();
  const { data, isLoading, error } = useQuery<{
    coursesBreakdown: { standalone: number; withMba: number },
    totalEnrollments: number,
    totalStudents: number,
    newStudentsThisMonth: number,
    totalCourses: number,
    upcomingLiveClasses: number,
    nextLiveClass: { startTime: string }
  }>({
    queryKey: ['/api/admin/dashboard']
  });

  const { data: allLiveClasses = [] } = useQuery({
    queryKey: ['/api/live-classes'],
    queryFn: async () => {
      const token = localStorage.getItem("token");
      const res = await fetch('/api/live-classes', {
        credentials: 'include',
        headers: token ? { Authorization: `Bearer ${token}` } : undefined,
      });
      if (!res.ok) throw new Error("Failed to fetch live classes");
      return res.json();
    },
  });

  const upcomingLiveClasses = useMemo(() => {
    const now = Date.now();
    return allLiveClasses
      .filter((lc: any) =>
        new Date(lc.startTime).getTime() >= now && lc.status === 'scheduled'
      )
      .sort((a: any, b: any) =>
        new Date(a.startTime).getTime() - new Date(b.startTime).getTime()
      );
  }, [allLiveClasses]);

  // Fetch data for charts
  const { data: enrollments = [] } = useQuery({
    queryKey: ['/api/enrollments'],
    queryFn: async () => {
      const token = localStorage.getItem("token");
      const res = await fetch('/api/enrollments', {
        credentials: 'include',
        headers: token ? { Authorization: `Bearer ${token}` } : undefined,
      });
      if (!res.ok) throw new Error("Failed to fetch enrollments");
      return res.json();
    },
  });

  const { data: coursesList = [] } = useQuery({
    queryKey: ['/api/admin/courses'],
    queryFn: async () => {
      const token = localStorage.getItem("token");
      const res = await fetch('/api/admin/courses', {
        credentials: 'include',
        headers: token ? { Authorization: `Bearer ${token}` } : undefined,
      });
      if (!res.ok) throw new Error("Failed to fetch courses");
      return res.json();
    },
  });

  // Generate sparkline data for KPI cards (last 7 data points)
  const generateSparklineData = (baseValue: number): number[] => {
    return Array.from({ length: 7 }, (_, i) => {
      const variance = Math.random() * 0.3 - 0.15; // ±15% variance
      return Math.max(0, Math.round(baseValue * (1 + variance - (i * 0.02))));
    }).reverse();
  };

  const enrollmentTrendData = useMemo(() => {
    const points: { name: string; enrollments: number }[] = [];
    for (let i = 5; i >= 0; i--) {
      const dt = subMonths(new Date(), i);
      const label = format(dt, 'MMM');
      const count = enrollments.filter((e: any) => {
        const d = new Date(e.enrolledAt || e.enrollDate);
        return d.getFullYear() === dt.getFullYear() && d.getMonth() === dt.getMonth();
      }).length;
      points.push({ name: label, enrollments: count });
    }
    return points;
  }, [enrollments]);

  const progressBuckets = useMemo(() => {
    let low = 0, mid = 0, high = 0;
    enrollments.forEach((e: any) => {
      const p = e.progress ?? e.percentComplete ?? 0;
      if (p < 25) low++;
      else if (p < 75) mid++;
      else high++;
    });
    const total = enrollments.length || 1;
    return {
      lowPct: Math.round((low / total) * 100),
      midPct: Math.round((mid / total) * 100),
      highPct: Math.round((high / total) * 100),
      total,
    };
  }, [enrollments]);

  const lowCount = Math.round((progressBuckets.lowPct / 100) * progressBuckets.total);
  const midCount = Math.round((progressBuckets.midPct / 100) * progressBuckets.total);
  const highCount = Math.round((progressBuckets.highPct / 100) * progressBuckets.total);

  // Course popularity: top 5 by enrollment count
  const courseMap = useMemo(
    () => new Map(coursesList.map((c: any) => [c.slug, c.title])),
    [coursesList]
  );

  const coursePopularityData = useMemo(() => {
    const countMap = new Map<string, number>();
    enrollments.forEach((e: any) => {
      countMap.set(e.courseSlug, (countMap.get(e.courseSlug) || 0) + 1);
    });
    return Array.from(countMap.entries())
      .map(([slug, count]) => ({
        name: courseMap.get(slug) || slug,
        count,
      }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 5);
  }, [enrollments, courseMap]);

  // Active Students by Course
  const heatmapData = useMemo(() => {
    const map = new Map<
      string,
      { name: string; notStarted: number; inProgress: number; completed: number }
    >();

    enrollments.forEach((e: any) => {
      const slug = e.courseSlug;
      if (!map.has(slug)) {
        map.set(slug, {
          name: courseMap.get(slug) || slug,
          notStarted: 0,
          inProgress: 0,
          completed: 0,
        });
      }
      const entry = map.get(slug)!;
      const pct = e.percentComplete ?? 0;
      if (pct === 0) entry.notStarted++;
      else if (pct >= 100) entry.completed++;
      else entry.inProgress++;
    });

    return Array.from(map.values()).sort(
      (a, b) =>
        b.notStarted + b.inProgress + b.completed -
        (a.notStarted + a.inProgress + a.completed)
    );
  }, [enrollments, courseMap]);

  if (isLoading) {
    return <DashboardSkeleton />;
  }

  if (error) {
    return (
      <div className="p-6">
        <h1 className="text-2xl font-bold text-gray-800 mb-4">Admin Dashboard</h1>
        <Card>
          <CardContent className="p-6">
            <p className="text-red-500">Error loading dashboard data. Please try again later.</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  const courseChartData = [
    { name: "Standalone", value: data?.coursesBreakdown?.standalone ?? 0 },
    { name: "With MBA", value: data?.coursesBreakdown?.withMba ?? 0 },
  ];

  const COLORS = ['hsl(var(--color-primary-500))', 'hsl(var(--color-accent-500))', 'hsl(var(--color-secondary-500))', '#9c27b0'];

  return (
    <TooltipProvider>
      {/* Background Orbs */}
      <BackgroundOrbs />

      {/* Command Bar */}
      <CommandBar />

      <div className="p-4 md:p-6 relative">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8">
          <div>
            <h1 className="text-3xl font-bold text-neutral-900 dark:text-neutral-100">
              Admin Dashboard
            </h1>
            <p className="text-neutral-600 dark:text-neutral-400 mt-1">
              Welcome back! Here's your overview for today.
            </p>
          </div>
        </div>

        {/* KPI Row - 4 Floating Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <FloatingKpiCard
            icon={Users}
            label="Total Students"
            value={data?.totalStudents || 0}
            subtitle={`${data?.newStudentsThisMonth || 0} new this month`}
            delta={{ value: 12, isPositive: true }}
            sparklineData={generateSparklineData(data?.totalStudents || 100)}
            animationDelay={0}
          />

          <FloatingKpiCard
            icon={School}
            label="Total Courses"
            value={data?.totalCourses || 0}
            subtitle={`${data?.coursesBreakdown?.standalone || 0} standalone, ${data?.coursesBreakdown?.withMba || 0} with MBA`}
            delta={{ value: 5, isPositive: true }}
            sparklineData={generateSparklineData(data?.totalCourses || 50)}
            animationDelay={0.08}
          />

          <FloatingKpiCard
            icon={GraduationCap}
            label="Active Enrollments"
            value={data?.totalEnrollments || 0}
            subtitle={`${progressBuckets.highPct}% high progress`}
            delta={{ value: 8, isPositive: true }}
            sparklineData={generateSparklineData(data?.totalEnrollments || 200)}
            animationDelay={0.16}
          />

          <FloatingKpiCard
            icon={CalendarClock}
            label="Upcoming Classes"
            value={data?.upcomingLiveClasses ?? 0}
            subtitle={data?.nextLiveClass ? `Next: ${format(new Date(data.nextLiveClass.startTime), 'MMM dd')}` : 'No upcoming'}
            sparklineData={generateSparklineData(data?.upcomingLiveClasses || 10)}
            animationDelay={0.24}
          />
        </div>

        {/* Calendar + Pathway Breakdown */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
          <AnimatedChartContainer
            title="Upcoming Classes Calendar"
            animationDelay={0.32}
          >
            <Calendar
              className="w-full"
              tileContent={({ date, view }) => {
                if (view !== 'month') return null;
                const dayClasses = upcomingLiveClasses.filter(
                  (lc: any) => new Date(lc.startTime).toDateString() === date.toDateString()
                );
                if (!dayClasses.length) return null;
                return (
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <div className="flex flex-col items-center justify-center h-full w-full mt-1 cursor-pointer">
                        <div className="bg-accent-500 rounded-full w-2 h-2" />
                        <span className="text-xs text-accent-600 dark:text-accent-400">{dayClasses.length}</span>
                      </div>
                    </TooltipTrigger>
                    <TooltipContent side="top" className="whitespace-pre-line">
                      {dayClasses.map((lc: any) => {
                        const time = format(new Date(lc.startTime), 'h:mm a');
                        return `${time} – ${lc.title}`;
                      }).join('\n')}
                    </TooltipContent>
                  </Tooltip>
                );
              }}
            />
          </AnimatedChartContainer>

          <AnimatedChartContainer
            title="Pathway Breakdown"
            badge="By type"
            animationDelay={0.4}
          >
            <div className="h-80">
              <NeuralDonutChart
                data={courseChartData}
                colors={COLORS}
                centerLabel="Total"
                centerValue={`${data?.totalCourses || 0}`}
              />
            </div>
          </AnimatedChartContainer>
        </div>

        {/* Active Students by Course - Full Width */}
        <AnimatedChartContainer
          title="Active Students by Course"
          animationDelay={0.48}
          className="mb-8"
        >
          <div className="h-96">
            <NeuralBarChart
              data={heatmapData}
              dataKeys={['notStarted', 'inProgress', 'completed']}
              colors={['#d1d5db', '#fbbf24', '#4ade80']}
            />
          </div>
        </AnimatedChartContainer>

        {/* Enrollment Trend +Student Progress */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
          <AnimatedChartContainer
            title="Enrollment Trend"
            badge="Last 6 months"
            animationDelay={0.56}
          >
            <div className="h-80">
              <LiquidBarChart
                data={enrollmentTrendData.map(d => ({ name: d.name, value: d.enrollments }))}
                color="hsl(220, 70%, 55%)"
              />
            </div>
          </AnimatedChartContainer>

          <AnimatedChartContainer
            title="Student Progress Snapshot"
            animationDelay={0.64}
          >
            <div className="flex flex-col md:flex-row items-center justify-center gap-8 h-80">
              <RadialProgress
                percentage={progressBuckets.lowPct}
                label="0-25% Done"
                color="#ef4444"
                glowColor="#dc2626"
                count={lowCount}
                size={140}
              />
              <RadialProgress
                percentage={progressBuckets.midPct}
                label="25-75% Done"
                color="#fbbf24"
                glowColor="#f59e0b"
                count={midCount}
                size={140}
              />
              <RadialProgress
                percentage={progressBuckets.highPct}
                label="75-100% Done"
                color="#4ade80"
                glowColor="#22c55e"
                count={highCount}
                size={140}
              />
            </div>
            <p className="text-xs text-neutral-500 text-center mt-2">Based on {progressBuckets.total} total enrollments</p>
          </AnimatedChartContainer>
        </div>

        {/* Course Popularity */}
        <AnimatedChartContainer
          title="Course Popularity"
          badge="Top 5"
          animationDelay={0.72}
        >
          <div className="h-80">
            <GradientBarChart
              data={coursePopularityData.map(d => ({ name: String(d.name), value: d.count }))}
              layout="vertical"
              gradientColors={['hsl(220, 70%, 60%)', 'hsl(174, 72%, 55%)']}
            />
          </div>
        </AnimatedChartContainer>
      </div>
    </TooltipProvider>
  );
}

function DashboardSkeleton() {
  return (
    <div className="p-4 md:p-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6">
        <Skeleton className="h-8 w-48" />
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
                  <Skeleton className="h-3 w-32" />
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        {[1, 2].map((i) => (
          <Card key={i}>
            <CardContent className="pt-6">
              <Skeleton className="h-80 w-full" />
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}

export default AdminDashboard;
