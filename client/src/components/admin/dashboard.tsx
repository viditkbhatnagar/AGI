import { useQuery } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Link } from "wouter";
import {
  BarChart as BarChartIcon,
  CalendarClock,
  GraduationCap,
  School,
  UserPlus,
  Users
} from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend } from "recharts";
import { formatDateTime } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";

export function AdminDashboard() {
  const { data, isLoading, error } = useQuery<{ coursesBreakdown: { standalone: number; withMba: number }, totalEnrollments: number, totalStudents: number, newStudentsThisMonth: number, totalCourses: number, upcomingLiveClasses: number, nextLiveClass: { startTime: string } }>({
    queryKey: ['/api/admin/dashboard']
  });
  
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
  
  // Create enrollment trend data
  // const enrollmentTrendData = [
  //   { name: 'Jan', enrollments: 4 },
  //   { name: 'Feb', enrollments: 7 },
  //   { name: 'Mar', enrollments: 5 },
  //   { name: 'Apr', enrollments: 8 },
  //   { name: 'May', enrollments: data.totalEnrollments > 10 ? data.totalEnrollments - 10 : 10 },
  //   { name: 'Jun', enrollments: data.totalEnrollments },
  // ];
  
  return (
    <div className="p-4 md:p-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6">
        <h1 className="text-2xl font-bold text-gray-800">Admin Dashboard</h1>
        <div className="mt-2 md:mt-0 space-x-2">
          <Link href="/admin/students/new">
            <Button variant="secondary">
              <UserPlus className="mr-2 h-4 w-4" />
              Add Student
            </Button>
          </Link>
          <Link href="/admin/courses/new">
            <Button>
              <School className="mr-2 h-4 w-4" />
              Add Course
            </Button>
          </Link>
        </div>
      </div>
      
      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        {/* Total Students */}
        <Card className="dashboard-card">
          <CardContent className="p-4">
            <div className="flex items-center">
              <div className="p-3 rounded-full bg-primary-100 text-primary">
                <Users className="h-5 w-5" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-500">Total Students</p>
                <p className="text-xl font-semibold text-gray-800">{data?.totalStudents}</p>
                <p className="text-xs text-green-600 mt-1">
                  <span className="inline-block align-middle border-t-0 border-l-[4px] border-r-[4px] border-b-[4px] border-solid border-transparent border-b-green-600 mt-[-2px] mr-[2px]"></span>
                  {data?.newStudentsThisMonth} new this month
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        {/* Active Courses */}
        <Card className="dashboard-card">
          <CardContent className="p-4">
            <div className="flex items-center">
              <div className="p-3 rounded-full bg-amber-100 text-amber-500">
                <School className="h-5 w-5" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-500">Active Courses</p>
                <p className="text-xl font-semibold text-gray-800">{data?.totalCourses}</p>
                <p className="text-xs text-gray-500 mt-1">
                  {data?.coursesBreakdown?.standalone} standalone, {data?.coursesBreakdown?.withMba} with MBA
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        {/* Active Enrollments */}
        <Card className="dashboard-card">
          <CardContent className="p-4">
            <div className="flex items-center">
              <div className="p-3 rounded-full bg-green-100 text-green-500">
                <GraduationCap className="h-5 w-5" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-500">Active Enrollments</p>
                <p className="text-xl font-semibold text-gray-800">{data?.totalEnrollments}</p>
                <p className="text-xs text-gray-500 mt-1">95% completion rate</p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        {/* Upcoming Live Classes */}
        <Card className="dashboard-card">
          <CardContent className="p-4">
            <div className="flex items-center">
              <div className="p-3 rounded-full bg-purple-100 text-purple-500">
                <CalendarClock className="h-5 w-5" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-500">Upcoming Live Classes</p>
                <p className="text-xl font-semibold text-gray-800">{data?.upcomingLiveClasses ?? 0}</p>
                {data?.nextLiveClass ? (
                  <p className="text-xs text-gray-500 mt-1">
                    Next: {formatDateTime(data.nextLiveClass.startTime)}
                  </p>
                ) : (
                  <p className="text-xs text-gray-500 mt-1">No upcoming classes</p>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
      
      {/* Charts Row */}
      
        {/* Enrollment Trend */}
        {/* <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-medium text-gray-800">Enrollment Trend</h3>
              <Badge variant="outline">Last 6 months</Badge>
            </div>
            <div className="h-80">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={enrollmentTrendData}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} />
                  <XAxis dataKey="name" />
                  <YAxis />
                  <Tooltip
                    contentStyle={{ background: 'white', border: '1px solid #e2e8f0', borderRadius: '0.5rem' }}
                    formatter={(value) => [`${value} enrollments`, 'Enrollments']}
                  />
                  <Bar dataKey="enrollments" fill="#3f51b5" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card> */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        {/* Course Distribution */}
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-medium text-gray-800">Course Distribution</h3>
              <Badge variant="outline">By type</Badge>
            </div>
            <div className="h-80 flex items-center justify-center">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={courseChartData}
                    cx="50%"
                    cy="50%"
                    innerRadius={70}
                    outerRadius={100}
                    fill="#8884d8"
                    paddingAngle={5}
                    dataKey="value"
                    label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                  >
                    {courseChartData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip 
                    formatter={(value) => [`${value} courses`, 'Courses']}
                    contentStyle={{ background: 'white', border: '1px solid #e2e8f0', borderRadius: '0.5rem' }}
                  />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        <Card>
          <div className="px-5 py-4 border-b border-gray-200">
            <h2 className="font-inter text-lg font-medium text-gray-800">Quick Actions</h2>
          </div>
          <CardContent className="p-5">
            <div className="space-y-3">
              <Link href="/admin/live-classes/new">
                <Button variant="outline" className="w-full justify-start mb-2">
                  <CalendarClock className="mr-2 h-4 w-4" />
                  Schedule Live Class
                </Button>
              </Link>
              
              <Link href="/admin/students/new">
                <Button variant="outline" className="w-full justify-start mb-2">
                  <UserPlus className="mr-2 h-4 w-4" />
                  Add New Student
                </Button>
              </Link>
              
              <Link href="/admin/courses/new">
                <Button variant="outline" className="w-full justify-start mb-2">
                  <School className="mr-2 h-4 w-4" />
                  Add New Course
                </Button>
              </Link>
              
              <Link href="/admin/enrollments/new">
                <Button variant="outline" className="w-full justify-start">
                  <GraduationCap className="mr-2 h-4 w-4" />
                  Create Enrollment
                </Button>
              </Link>
            </div>
            
            <div className="mt-6 bg-gray-50 p-4 rounded-lg">
              <div className="flex items-center mb-2">
                <BarChartIcon className="h-5 w-5 text-primary mr-2" />
                <h4 className="font-medium">Generate Reports</h4>
              </div>
              <p className="text-sm text-gray-600 mb-3">
                Export data on students, courses, enrollments, and more.
              </p>
              <Button variant="secondary" className="w-full">
                View Reports
              </Button>
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
