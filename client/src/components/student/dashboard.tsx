import { useQuery } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useAuth } from "@/lib/auth-provider";
import { Link } from "wouter";
import { ProgressRing } from "@/components/ui/progress-ring";
import { CalendarClock, ChevronRight, Clock, Medal, PlayCircle, School, Target } from "lucide-react";
import { formatDateTime, formatTimeRemaining } from "@/lib/utils";

export function StudentDashboard() {
  const { student } = useAuth();
  
  const { data, isLoading, error } = useQuery({
    queryKey: ['/api/student/dashboard'],
    enabled: !!student
  });
  
  if (isLoading) {
    return <DashboardSkeleton />;
  }
  
  if (error) {
    return (
      <div className="p-6">
        <h1 className="text-2xl font-bold text-gray-800 mb-4">Dashboard</h1>
        <Card>
          <CardContent className="p-6">
            <p className="text-red-500">Error loading dashboard data. Please try again later.</p>
          </CardContent>
        </Card>
      </div>
    );
  }
  
  return (
    <div className="p-4 md:p-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6">
        <h1 className="font-inter text-2xl font-bold text-gray-800">
          Welcome back, {student?.name?.split(' ')[0]}!
        </h1>
        <div className="mt-2 md:mt-0">
          <Link href={`/student/courses/${data?.course?.slug}`}>
            <Button>
              <PlayCircle className="mr-2 h-4 w-4" />
              Resume Learning
            </Button>
          </Link>
        </div>
      </div>
      
      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        {/* Course Progress */}
        <Card className="dashboard-card border-l-4 border-primary">
          <CardContent className="p-4">
            <div className="flex items-center">
              <div className="p-3 rounded-full bg-primary-100 text-primary">
                <Target className="h-5 w-5" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-500">Course Progress</p>
                <p className="text-lg font-semibold text-gray-800">{data?.courseProgress}%</p>
                <div className="w-full h-2 bg-gray-200 rounded-full mt-1">
                  <div 
                    className="h-full bg-primary rounded-full" 
                    style={{ width: `${data?.courseProgress}%` }}
                  />
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
        
        {/* Completed Modules */}
        <Card className="dashboard-card border-l-4 border-amber-500">
          <CardContent className="p-4">
            <div className="flex items-center">
              <div className="p-3 rounded-full bg-amber-100 text-amber-500">
                <School className="h-5 w-5" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-500">Completed Modules</p>
                <p className="text-lg font-semibold text-gray-800">{data?.completedModules}</p>
                <p className="text-xs text-gray-500 mt-1">
                  {data?.completedModules === "0 of 0" ? "No modules available" : `Last completed: Module ${parseInt(data?.completedModules) || 0}`}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        {/* Watch Time */}
        <Card className="dashboard-card border-l-4 border-green-500">
          <CardContent className="p-4">
            <div className="flex items-center">
              <div className="p-3 rounded-full bg-green-100 text-green-500">
                <Clock className="h-5 w-5" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-500">Watch Time</p>
                <p className="text-lg font-semibold text-gray-800">{data?.watchTime?.total}</p>
                <p className="text-xs text-gray-500 mt-1">This week: {data?.watchTime?.thisWeek}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        {/* Certificate Progress */}
        <Card className="dashboard-card border-l-4 border-yellow-500">
          <CardContent className="p-4">
            <div className="flex items-center">
              <div className="p-3 rounded-full bg-yellow-100 text-yellow-600">
                <Medal className="h-5 w-5" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-500">Certificate Progress</p>
                <p className="text-lg font-semibold text-gray-800">{data?.certificationProgress}%</p>
                <p className="text-xs text-gray-500 mt-1">
                  {data?.certificationProgress >= 100 
                    ? "Certificate ready!" 
                    : `Estimated completion: ${formatTimeRemaining(data?.course?.enrollment?.validUntil)}`}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
      
      {/* My Course */}
      <Card className="mb-6">
        <div className="px-5 py-4 border-b border-gray-200">
          <h2 className="font-inter text-lg font-medium text-gray-800">My Course</h2>
        </div>
        <CardContent className="p-5">
          <div className="flex flex-col md:flex-row items-start md:items-center">
            <div className="flex-shrink-0 mb-4 md:mb-0">
              <div className="bg-primary-100 rounded-lg p-4 text-primary text-center">
                <School className="h-10 w-10 mx-auto" />
              </div>
            </div>
            <div className="md:ml-6">
              <h3 className="text-xl font-medium text-gray-800">{data?.course?.title}</h3>
              <p className="text-gray-500 text-sm mt-1">Type: <span className="capitalize font-medium">{data?.course?.type}</span></p>
              <div className="mt-2">
                <div className="flex items-center">
                  <span className="text-sm font-medium text-gray-500">Overall Progress:</span>
                  <div className="flex-1 mx-2">
                    <div className="w-full h-2 bg-gray-200 rounded-full">
                      <div 
                        className="h-full bg-primary rounded-full" 
                        style={{ width: `${data?.courseProgress}%` }}
                      />
                    </div>
                  </div>
                  <span className="text-sm font-medium text-gray-800">{data?.courseProgress}%</span>
                </div>
              </div>
              <div className="mt-4">
                <Link href={`/student/courses/${data?.course?.slug}`}>
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
      
      {/* Upcoming Live Classes */}
      <Card>
        <div className="px-5 py-4 border-b border-gray-200">
          <h2 className="font-inter text-lg font-medium text-gray-800">Upcoming Live Classes</h2>
        </div>
        <CardContent className="p-5">
          {data?.upcomingLiveClasses?.length > 0 ? (
            data.upcomingLiveClasses.map((liveClass) => (
              <div key={liveClass._id} className="border border-gray-200 rounded-lg p-4 mb-4">
                <div className="flex flex-col md:flex-row md:items-center justify-between">
                  <div>
                    <div className="flex items-center">
                      <CalendarClock className="text-primary mr-2 h-5 w-5" />
                      <h3 className="font-medium text-gray-800">{liveClass.title}</h3>
                    </div>
                    <p className="text-gray-500 text-sm mt-1">{liveClass.course?.title}</p>
                    <div className="flex items-center mt-2">
                      <span className="text-sm text-gray-600">{formatDateTime(liveClass.startTime)}</span>
                      <span className="mx-2 text-gray-300">|</span>
                      <span className="text-sm text-gray-600">{Math.round((new Date(liveClass.endTime).getTime() - new Date(liveClass.startTime).getTime()) / (1000 * 60))} minutes</span>
                    </div>
                  </div>
                  <div className="mt-4 md:mt-0">
                    <Button variant="outline">
                      Join Session
                    </Button>
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
