import { useQuery } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Link } from "wouter";
import { useState, useMemo } from 'react';
import { subMonths, format } from 'date-fns';
import { Tooltip, TooltipTrigger, TooltipContent, TooltipProvider } from "@/components/ui/tooltip";
import { useConditionalRender } from '@/lib/permissions-provider';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as RechartsTooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Legend
} from 'recharts';
import { Badge } from "@/components/ui/badge";
import {
  BarChart as BarChartIcon,
  CalendarClock,
  GraduationCap,
  School,
  UserPlus,
  Users
} from "lucide-react";

import Calendar from "react-calendar";
import "react-calendar/dist/Calendar.css";

// Helper to format ISO date-time strings
function formatDateTime(isoString: string): string {
  const d = new Date(isoString);
  const date = d.toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' });
  const time = d.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' });
  return `${date} ${time}`;
}

export function AdminDashboard() {
  const { renderIfCanCreate } = useConditionalRender();
  const { data, isLoading, error } = useQuery<{ coursesBreakdown: { standalone: number; withMba: number }, totalEnrollments: number, totalStudents: number, newStudentsThisMonth: number, totalCourses: number, upcomingLiveClasses: number, nextLiveClass: { startTime: string } }>({
    queryKey: ['/api/admin/dashboard']
  });

  // Client-side derive upcoming scheduled classes for admin
  

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

  const [filterCourse, setFilterCourse] = useState<string>('');
const [filterStudent, setFilterStudent] = useState<string>('');

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

  // Active Students by Course – counts of not-started / in-progress / completed
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

  // Optional: sort by total students descending
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

  // Transform course breakdown data for chart
  const courseChartData = [
    { name: "Standalone", value: data?.coursesBreakdown?.standalone ?? 0 },
    { name: "With MBA", value: data?.coursesBreakdown?.withMba ?? 0 },
  ];

  const COLORS = ['#3f51b5', '#ff5722', '#4caf50', '#9c27b0'];

  return (
    <TooltipProvider>
      <div className="p-4 md:p-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6">
        <h1 className="text-2xl font-bold text-gray-800">Admin Dashboard</h1>
        <div className="mt-2 md:mt-0 space-x-2">
          {renderIfCanCreate(
            <Link href="/admin/students/new">
              <Button variant="secondary">
                <UserPlus className="mr-2 h-4 w-4" />
                Add Student
              </Button>
            </Link>
          )}
          {renderIfCanCreate(
            <Link href="/admin/teachers/new">
              <Button variant="secondary">
                <UserPlus className="mr-2 h-4 w-4" />
                Add Teacher
              </Button>
            </Link>
          )}
        </div>
      </div>
      
      {/* Greeting Header + 4 Summary Cards */}
      <Card className="mb-6 bg-[#0C5FB3] rounded-lg p-6">
        <CardContent className="p-0">
          <div className="text-white">
            <h1 className="text-3xl font-semibold">Hello Admin!</h1>
            <p className="mt-1">Welcome back to your dashboard</p>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-4 gap-4 mt-6">
            <Card className="flex items-center p-4 bg-[#DFDAC8] text-[#0C5FB3] shadow-none rounded-lg">
              <div className="p-3 bg-white rounded-full">
                <Users className="h-6 w-6 text-[#0C5FB3]" />
              </div>
              <div className="ml-4">
                <p className="text-sm text-[#0C5FB3]">Total Students</p>
                <p className="text-xl font-semibold text-[#0C5FB3]">{data?.totalStudents}</p>
                <p className="text-xs text-[#0C5FB3] mt-1">
                  {data?.newStudentsThisMonth} new this month
                </p>
              </div>
            </Card>
            <Card className="flex items-center p-4 bg-[#DFDAC8] text-[#0C5FB3] shadow-none rounded-lg">
              <div className="p-3 bg-white rounded-full">
                <School className="h-6 w-6 text-[#0C5FB3]" />
              </div>
              <div className="ml-4">
                <p className="text-sm text-[#0C5FB3]">Total Courses</p>
                <p className="text-xl font-semibold text-[#0C5FB3]">{data?.totalCourses}</p>
                <p className="text-xs text-[#0C5FB3] mt-1">
                  {data?.coursesBreakdown.standalone} standalone, {data?.coursesBreakdown.withMba} with MBA
                </p>
              </div>
            </Card>
            <Card className="flex items-center p-4 bg-[#DFDAC8] text-[#0C5FB3] shadow-none rounded-lg">
              <div className="p-3 bg-white rounded-full">
                <GraduationCap className="h-6 w-6 text-[#0C5FB3]" />
              </div>
              <div className="ml-4">
                <p className="text-sm text-[#0C5FB3]">Active Enrollments</p>
                <p className="text-xl font-semibold text-[#0C5FB3]">{data?.totalEnrollments}</p>
                <p className="text-xs text-[#0C5FB3] mt-1">
                  {progressBuckets.highPct}% high progress
                </p>
              </div>
            </Card>
            <Card className="flex items-center p-4 bg-[#DFDAC8] text-[#0C5FB3] shadow-none rounded-lg">
              <div className="p-3 bg-white rounded-full">
                <CalendarClock className="h-6 w-6 text-[#0C5FB3]" />
              </div>
              <div className="ml-4">
                <p className="text-sm text-[#0C5FB3]">Upcoming Classes</p>
                <p className="text-xl font-semibold text-[#0C5FB3]">{data?.upcomingLiveClasses ?? 0}</p>
                {data?.nextLiveClass ? (
                  <p className="text-xs text-[#0C5FB3] mt-1">
                    Next: {formatDateTime(data.nextLiveClass.startTime)}
                  </p>
                ) : (
                  <p className="text-xs text-[#0C5FB3] mt-1">No upcoming</p>
                )}
              </div>
            </Card>
          </div>
        </CardContent>
      </Card>

      {/* Calendar & Pathway Breakdown in 2x2 format */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        {/* Calendar Card */}
        <Card className="overflow-hidden">
          <div className="bg-[#8FA0D8] p-3 rounded-t-lg">
            <h3 className="text-[#0B0829] text-lg font-medium">Upcoming Classes Calendar</h3>
          </div>
          <CardContent className="p-0">
            <div className="p-4">
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
                          <div className="bg-blue-500 rounded-full w-2 h-2" />
                          <span className="text-xs text-blue-500">{dayClasses.length}</span>
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
            </div>
          </CardContent>
        </Card>

        {/* Pathway Breakdown */}
        <Card>
          <div className="bg-[#8FA0D8] p-3 rounded-t-lg">
            <h3 className="text-[#0B0829] text-lg font-medium">Pathway Breakdown</h3>
          </div>
          <CardContent className="pt-6 border-t border-gray-200">
            <div className="flex items-center justify-between mb-4">
              <span />
              <Badge variant="outline">By type</Badge>
            </div>
            <div className="h-80">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={courseChartData}
                    cx="50%"
                    cy="50%"
                    innerRadius={70}
                    outerRadius={100}
                    paddingAngle={5}
                    dataKey="value"
                    label={({ name, percent }) =>
                      `${name}: ${(percent * 100).toFixed(0)}%`
                    }
                  >
                    {courseChartData.map((_, index) => (
                      <Cell key={index} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <RechartsTooltip formatter={(v) => [`${v} courses`, 'Courses']} />
                  <Legend verticalAlign="bottom" height={36} />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Active Students by Course - Full Width */}
      <Card className="mb-6">
        <div className="bg-[#8FA0D8] p-3 rounded-t-lg">
          <h3 className="text-[#0B0829] text-lg font-medium">Active Students by Course</h3>
        </div>
        <CardContent className="pt-6 border-t border-gray-200">
          <ResponsiveContainer width="100%" height={400}>
            <BarChart data={heatmapData} layout="vertical" margin={{ left: 150 }}>
              <CartesianGrid strokeDasharray="3 3" horizontal={false} />
              <XAxis type="number" />
              <YAxis dataKey="name" type="category" width={200} />
              <RechartsTooltip />
              <Bar dataKey="notStarted" stackId="a" fill="#d1d5db" name="Not Started" />
              <Bar dataKey="inProgress" stackId="a" fill="#fbbf24" name="In Progress" />
              <Bar dataKey="completed" stackId="a" fill="#4ade80" name="Completed" />
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>
      
      {/* Enrollment Trend & Progress Snapshot */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        {/* Enrollment Trend */}
        <Card>
          <div className="bg-[#8FA0D8] p-3 rounded-t-lg">
            <h3 className="text-[#0B0829] text-lg font-medium">Enrollment Trend</h3>
          </div>
          <CardContent className="pt-6 border-t border-gray-200">
            <div className="flex items-center justify-between mb-4">
              <span />
              <Badge variant="outline">Last 6 months</Badge>
            </div>
            <div className="h-80">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={enrollmentTrendData}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} />
                  <XAxis dataKey="name" />
                  <YAxis />
                  <RechartsTooltip
                    contentStyle={{ background: 'white', border: '1px solid #e2e8f0', borderRadius: '0.5rem' }}
                    formatter={(value: any) => [`${value} enrollments`, 'Enrollments']}
                  />
                  <Bar dataKey="enrollments" fill="#3f51b5" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* Student Progress Snapshot */}
        <Card>
          <div className="bg-[#8FA0D8] p-3 rounded-t-lg">
            <h3 className="text-[#0B0829] text-lg font-medium">Student Progress Snapshot</h3>
          </div>
          <CardContent className="p-6 flex flex-col justify-center space-y-6">
            <div className="flex-1 flex flex-col justify-center space-y-6">
              <Tooltip>
                <TooltipTrigger asChild>
                  <div>
                    <div className="block w-full cursor-pointer">
                      <p className="text-sm text-gray-500 mb-1">0–25% Complete</p>
                    </div>
                    <div className="w-full h-4 bg-gray-200 rounded-full">
                      <div className="h-full bg-red-500 rounded-full" style={{ width: `${progressBuckets.lowPct}%` }} />
                    </div>
                  </div>
                </TooltipTrigger>
                <TooltipContent side="top">
                  {`0–25% Complete: ${lowCount} enrollments (${progressBuckets.lowPct}%)`}
                </TooltipContent>
              </Tooltip>
              <Tooltip>
                <TooltipTrigger asChild>
                  <div>
                    <div className="block w-full cursor-pointer">
                      <p className="text-sm text-gray-500 mb-1">25–75% Complete</p>
                    </div>
                    <div className="w-full h-4 bg-gray-200 rounded-full">
                      <div className="h-full bg-yellow-500 rounded-full" style={{ width: `${progressBuckets.midPct}%` }} />
                    </div>
                  </div>
                </TooltipTrigger>
                <TooltipContent side="top">
                  {`25–75% Complete: ${midCount} enrollments (${progressBuckets.midPct}%)`}
                </TooltipContent>
              </Tooltip>
              <Tooltip>
                <TooltipTrigger asChild>
                  <div>
                    <div className="block w-full cursor-pointer">
                      <p className="text-sm text-gray-500 mb-1">75–100% Complete</p>
                    </div>
                    <div className="w-full h-4 bg-gray-200 rounded-full">
                      <div className="h-full bg-green-500 rounded-full" style={{ width: `${progressBuckets.highPct}%` }} />
                    </div>
                  </div>
                </TooltipTrigger>
                <TooltipContent side="top">
                  {`75–100% Complete: ${highCount} enrollments (${progressBuckets.highPct}%)`}
                </TooltipContent>
              </Tooltip>
            </div>
            <p className="text-xs text-gray-500 mt-2">Based on {progressBuckets.total} total enrollments</p>
          </CardContent>
        </Card>
      </div>

      {/* Pathway Breakdown, Course Popularity & Quick Actions */}
      <div className="grid grid-cols-1 lg:grid-cols-10 gap-6 mb-6">
        {/* Course Popularity */}
        <Card className="lg:col-span-7">
          <div className="bg-[#8FA0D8] p-3 rounded-t-lg">
            <h3 className="text-[#0B0829] text-lg font-medium">Course Popularity</h3>
          </div>
          <CardContent className="pt-6 border-t border-gray-200">
            <div className="flex items-center justify-between mb-4">
              <span />
              <Badge variant="outline">Top 5</Badge>
            </div>
            <div className="h-80">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={coursePopularityData} layout="vertical" margin={{ left: 40 }}>
                  <CartesianGrid strokeDasharray="3 3" horizontal={false} />
                  <XAxis type="number" />
                  <YAxis dataKey="name" type="category" width={150} />
                  <RechartsTooltip formatter={(v) => [`${v}`, 'Enrollments']} />
                  <Bar dataKey="count" fill="#3f51b5" radius={[0, 4, 4, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* Quick Actions */}
        <Card className="lg:col-span-3">
          <div className="bg-[#8FA0D8] p-3 rounded-t-lg">
            <h2 className="text-[#0B0829] text-lg font-medium">Quick Actions</h2>
          </div>
          <CardContent className="p-5 border-t border-gray-200">
            {/* existing Quick Actions buttons */}
            <div className="space-y-3">
              {renderIfCanCreate(
                <Link href="/admin/live-classes/new">
                  <Button variant="outline" className="w-full justify-start mb-2">
                    <CalendarClock className="mr-2 h-4 w-4" />
                    Schedule Live Class
                  </Button>
                </Link>
              )}
              {renderIfCanCreate(
                <Link href="/admin/students/new">
                  <Button variant="outline" className="w-full justify-start mb-2">
                    <UserPlus className="mr-2 h-4 w-4" />
                    Add New Student
                  </Button>
                </Link>
              )}
              {renderIfCanCreate(
                <Link href="/admin/courses/new">
                  <Button variant="outline" className="w-full justify-start mb-2">
                    <School className="mr-2 h-4 w-4" />
                    Add New Course
                  </Button>
                </Link>
              )}
              {renderIfCanCreate(
                <Link href="/admin/enrollments/new">
                  <Button variant="outline" className="w-full justify-start">
                    <GraduationCap className="mr-2 h-4 w-4" />
                    Create Enrollment
                  </Button>
                </Link>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
      
      {/* Recent Activity and Quick Actions */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* <Card className="lg:col-span-2">
          <div className="px-5 py-4 border-b border-gray-200 flex justify-between items-center">
            <h2 className="font-inter text-lg font-medium text-gray-800">Recent Activity</h2>
            <Link href="/admin/students">
              <Button variant="link" size="sm">View All</Button>
            </Link>
          </div>
          <CardContent className="p-0">
            <div className="divide-y divide-gray-200">
              {[
                { name: "Alice Johnson", action: "enrolled in", course: "Certified Human Resource Manager", time: "2 hours ago" },
                { name: "Bob Smith", action: "completed module 1 of", course: "MBA + Certified HR Manager", time: "Yesterday" },
                { name: "Carol Davis", action: "attempted quiz for", course: "Certified Project Manager", time: "2 days ago" },
                { name: "Dave Wilson", action: "registered for", course: "Supply Chain Professional", time: "3 days ago" },
              ].map((activity, index) => (
                <div key={index} className="py-3 px-5 hover:bg-gray-50">
                  <div className="flex items-center">
                    <div className="flex-shrink-0 h-10 w-10 bg-primary-100 rounded-full flex items-center justify-center">
                      <span className="font-medium text-primary-700">{activity.name.split(" ").map(n => n[0]).join("")}</span>
                    </div>
                    <div className="ml-3">
                      <p className="text-sm text-gray-800">
                        <span className="font-medium">{activity.name}</span> {activity.action}{" "}
                        <span className="font-medium">{activity.course}</span>
                      </p>
                      <p className="text-xs text-gray-500">{activity.time}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card> */}
        
        
      </div>
      </div>
    </TooltipProvider>
  );
}

function DashboardSkeleton() {
  return (
    <div className="p-4 md:p-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6">
        <Skeleton className="h-8 w-48" />
        <div className="mt-2 md:mt-0 flex space-x-2">
          <Skeleton className="h-10 w-32" />
          <Skeleton className="h-10 w-32" />
        </div>
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
              <div className="flex justify-between mb-4">
                <Skeleton className="h-6 w-40" />
                <Skeleton className="h-6 w-24" />
              </div>
              <Skeleton className="h-80 w-full" />
            </CardContent>
          </Card>
        ))}
      </div>
      
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card className="lg:col-span-2">
          <div className="px-5 py-4 border-b border-gray-200 flex justify-between items-center">
            <Skeleton className="h-6 w-40" />
            <Skeleton className="h-6 w-24" />
          </div>
          <CardContent className="p-0">
            <div className="divide-y divide-gray-200">
              {[1, 2, 3, 4].map((i) => (
                <div key={i} className="py-3 px-5">
                  <div className="flex items-center">
                    <Skeleton className="h-10 w-10 rounded-full" />
                    <div className="ml-3 w-full">
                      <Skeleton className="h-4 w-full max-w-md mb-2" />
                      <Skeleton className="h-3 w-20" />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <div className="px-5 py-4 border-b border-gray-200">
            <Skeleton className="h-6 w-40" />
          </div>
          <CardContent className="p-5">
            <div className="space-y-3">
              {[1, 2, 3, 4].map((i) => (
                <Skeleton key={i} className="h-10 w-full mb-2" />
              ))}
            </div>
            
            <div className="mt-6 bg-gray-50 p-4 rounded-lg">
              <Skeleton className="h-5 w-40 mb-2" />
              <Skeleton className="h-4 w-full mb-3" />
              <Skeleton className="h-10 w-full" />
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

export default AdminDashboard;
