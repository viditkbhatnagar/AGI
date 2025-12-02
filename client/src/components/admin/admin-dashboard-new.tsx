import { useQuery } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { Link } from "wouter";
import { subMonths, format } from "date-fns";
import { motion } from "framer-motion";
import {
  CalendarClock,
  GraduationCap,
  School,
  Users,
  Sparkles,
} from "lucide-react";
import { useConditionalRender } from "@/lib/permissions-provider";

// New admin UI components
import { StatCard } from "./ui/stat-card";
import { FilterChips, timeframeOptions } from "./ui/filter-chips";
import { GlassCard } from "./ui/glass-card";
import { CalendarCard } from "./calendar-card";
import { QuickActions } from "./quick-actions";
import { DashboardSkeleton } from "./skeleton-loaders";

// Chart components
import { AreaChartCard } from "./charts/area-chart-card";
import { BarStackCard } from "./charts/bar-stack-card";
import { DonutCard } from "./charts/donut-card";
import { ProgressRings } from "./charts/progress-rings";
import { HorizontalBars } from "./charts/horizontal-bars";

/**
 * AdminDashboardNew - Saastify-inspired premium admin dashboard
 * Features glassmorphism, aurora gradients, and kinetic motion
 */
export function AdminDashboardNew() {
  const { renderIfCanCreate } = useConditionalRender();
  const [timeframe, setTimeframe] = useState("30d");

  // Fetch dashboard data
  const { data, isLoading, error } = useQuery<{
    coursesBreakdown: { standalone: number; withMba: number };
    totalEnrollments: number;
    totalStudents: number;
    newStudentsThisMonth: number;
    totalCourses: number;
    upcomingLiveClasses: number;
    nextLiveClass: { startTime: string } | null;
  }>({
    queryKey: ["/api/admin/dashboard"],
  });

  // Fetch live classes
  const { data: allLiveClasses = [] } = useQuery({
    queryKey: ["/api/live-classes"],
    queryFn: async () => {
      const token = localStorage.getItem("token");
      const res = await fetch("/api/live-classes", {
        credentials: "include",
        headers: token ? { Authorization: `Bearer ${token}` } : undefined,
      });
      if (!res.ok) throw new Error("Failed to fetch live classes");
      return res.json();
    },
  });

  // Fetch enrollments
  const { data: enrollments = [] } = useQuery({
    queryKey: ["/api/enrollments"],
    queryFn: async () => {
      const token = localStorage.getItem("token");
      const res = await fetch("/api/enrollments", {
        credentials: "include",
        headers: token ? { Authorization: `Bearer ${token}` } : undefined,
      });
      if (!res.ok) throw new Error("Failed to fetch enrollments");
      return res.json();
    },
  });

  // Fetch courses
  const { data: coursesList = [] } = useQuery({
    queryKey: ["/api/admin/courses"],
    queryFn: async () => {
      const token = localStorage.getItem("token");
      const res = await fetch("/api/admin/courses", {
        credentials: "include",
        headers: token ? { Authorization: `Bearer ${token}` } : undefined,
      });
      if (!res.ok) throw new Error("Failed to fetch courses");
      return res.json();
    },
  });

  // Filter upcoming live classes
  const upcomingLiveClasses = useMemo(() => {
    const now = Date.now();
    return allLiveClasses
      .filter(
        (lc: any) =>
          new Date(lc.startTime).getTime() >= now && lc.status === "scheduled"
      )
      .sort(
        (a: any, b: any) =>
          new Date(a.startTime).getTime() - new Date(b.startTime).getTime()
      );
  }, [allLiveClasses]);

  // Generate sparkline data
  const generateSparklineData = (baseValue: number): number[] => {
    return Array.from({ length: 7 }, (_, i) => {
      const variance = Math.random() * 0.3 - 0.15;
      return Math.max(0, Math.round(baseValue * (1 + variance - i * 0.02)));
    }).reverse();
  };

  // Enrollment trend data
  const enrollmentTrendData = useMemo(() => {
    const points: { name: string; value: number }[] = [];
    for (let i = 5; i >= 0; i--) {
      const dt = subMonths(new Date(), i);
      const label = format(dt, "MMM");
      const count = enrollments.filter((e: any) => {
        const d = new Date(e.enrolledAt || e.enrollDate);
        return d.getFullYear() === dt.getFullYear() && d.getMonth() === dt.getMonth();
      }).length;
      points.push({ name: label, value: count });
    }
    return points;
  }, [enrollments]);

  // Progress buckets
  const progressBuckets = useMemo(() => {
    let low = 0,
      mid = 0,
      high = 0;
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
      lowCount: low,
      midCount: mid,
      highCount: high,
      total,
    };
  }, [enrollments]);

  // Course map
  const courseMap = useMemo(
    () => new Map(coursesList.map((c: any) => [c.slug, c.title])),
    [coursesList]
  );

  // Course popularity data
  const coursePopularityData = useMemo(() => {
    const countMap = new Map<string, number>();
    enrollments.forEach((e: any) => {
      countMap.set(e.courseSlug, (countMap.get(e.courseSlug) || 0) + 1);
    });
    return Array.from(countMap.entries())
      .map(([slug, count]) => ({
        name: (courseMap.get(slug) || slug) as string,
        value: count,
      }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 5);
  }, [enrollments, courseMap]);

  // Active students by course (heatmap data)
  const heatmapData = useMemo(() => {
    const map = new Map<
      string,
      { name: string; notStarted: number; inProgress: number; completed: number }
    >();

    enrollments.forEach((e: any) => {
      const slug = e.courseSlug;
      if (!map.has(slug)) {
        map.set(slug, {
          name: (courseMap.get(slug) || slug) as string,
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

    return Array.from(map.values())
      .sort(
        (a, b) =>
          b.notStarted + b.inProgress + b.completed -
          (a.notStarted + a.inProgress + a.completed)
      )
      .slice(0, 8);
  }, [enrollments, courseMap]);

  // Course breakdown for donut
  const courseChartData = useMemo(
    () => [
      { name: "Standalone", value: data?.coursesBreakdown?.standalone ?? 0 },
      { name: "With MBA", value: data?.coursesBreakdown?.withMba ?? 0 },
    ],
    [data]
  );

  if (isLoading) {
    return <DashboardSkeleton />;
  }

  if (error) {
    return (
      <div className="p-6">
        <GlassCard className="text-center py-12">
          <p className="text-red-500 mb-4">
            Error loading dashboard data. Please try again later.
          </p>
          <button
            onClick={() => window.location.reload()}
            className="px-4 py-2 bg-[#375BBE] text-white rounded-lg hover:opacity-90"
          >
            Retry
          </button>
        </GlassCard>
      </div>
    );
  }

  return (
    <div className="p-4 md:p-6 space-y-6">
      {/* Header band */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
        className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4"
      >
        <div>
          <div className="flex items-center gap-2 mb-1">
            <Sparkles className="h-5 w-5 text-[#375BBE]" />
            <h1 className="text-2xl md:text-3xl font-bold text-[#1a1a2e]">
              Admin Dashboard
            </h1>
          </div>
          <p className="text-gray-500">
            Overview and controls • Welcome back!
          </p>
        </div>

        {/* Filters */}
        <div className="flex items-center gap-3">
          <FilterChips
            options={timeframeOptions}
            value={timeframe}
            onChange={setTimeframe}
          />
        </div>
      </motion.div>

      {/* KPI Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6">
        <StatCard
          icon={Users}
          label="Total Students"
          value={data?.totalStudents || 0}
          subtitle={`${data?.newStudentsThisMonth || 0} new this month`}
          delta={{ value: 12, isPositive: true }}
          sparklineData={generateSparklineData(data?.totalStudents || 100)}
          animationDelay={0}
        />

        <StatCard
          icon={School}
          label="Total Courses"
          value={data?.totalCourses || 0}
          subtitle={`${data?.coursesBreakdown?.standalone || 0} standalone, ${
            data?.coursesBreakdown?.withMba || 0
          } with MBA`}
          delta={{ value: 5, isPositive: true }}
          sparklineData={generateSparklineData(data?.totalCourses || 50)}
          animationDelay={0.08}
        />

        <StatCard
          icon={GraduationCap}
          label="Active Enrollments"
          value={data?.totalEnrollments || 0}
          subtitle={`${progressBuckets.highPct}% high progress`}
          delta={{ value: 8, isPositive: true }}
          sparklineData={generateSparklineData(data?.totalEnrollments || 200)}
          animationDelay={0.16}
        />

        <StatCard
          icon={CalendarClock}
          label="Upcoming Classes"
          value={data?.upcomingLiveClasses ?? 0}
          subtitle={
            data?.nextLiveClass
              ? `Next: ${format(new Date(data.nextLiveClass.startTime), "MMM dd")}`
              : "No upcoming"
          }
          sparklineData={generateSparklineData(data?.upcomingLiveClasses || 10)}
          animationDelay={0.24}
        />
      </div>

      {/* Calendar + Pathway Breakdown */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 md:gap-6">
        <CalendarCard
          liveClasses={upcomingLiveClasses}
          animationDelay={0.32}
        />

        <DonutCard
          title="Pathway Breakdown"
          badge="By type"
          data={courseChartData}
          colors={["#1E8CFF", "#9B5CFF"]}
          centerLabel="Total"
          centerValue={data?.totalCourses || 0}
          animationDelay={0.4}
        />
      </div>

      {/* Active Students by Course */}
      <BarStackCard
        title="Active Students by Course"
        data={heatmapData}
        dataKeys={["notStarted", "inProgress", "completed"]}
        colors={["#6B7280", "#FFC857", "#18E6C9"]}
        animationDelay={0.48}
      />

      {/* Enrollment Trend + Student Progress */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 md:gap-6">
        <AreaChartCard
          title="Enrollment Trend"
          badge="Last 6 months"
          data={enrollmentTrendData}
          gradientColors={["#1E8CFF", "#9B5CFF"]}
          animationDelay={0.56}
        />

        <ProgressRings
          title="Student Progress Snapshot"
          rings={[
            {
              label: "0-25% Done",
              percentage: progressBuckets.lowPct,
              count: progressBuckets.lowCount,
              color: "#FF6B6B",
            },
            {
              label: "25-75% Done",
              percentage: progressBuckets.midPct,
              count: progressBuckets.midCount,
              color: "#FFC857",
            },
            {
              label: "75-100% Done",
              percentage: progressBuckets.highPct,
              count: progressBuckets.highCount,
              color: "#18E6C9",
            },
          ]}
          total={progressBuckets.total}
          animationDelay={0.64}
        />
      </div>

      {/* Course Popularity + Quick Actions */}
      <div className="grid grid-cols-1 lg:grid-cols-10 gap-4 md:gap-6">
        <div className="lg:col-span-7">
          <HorizontalBars
            title="Course Popularity"
            badge="Top 5"
            data={coursePopularityData}
            gradientColors={["#1E8CFF", "#18E6C9"]}
            animationDelay={0.72}
          />
        </div>

        <div className="lg:col-span-3">
          <QuickActions animationDelay={0.8} />
        </div>
      </div>
    </div>
  );
}

export default AdminDashboardNew;

