import { useQuery } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { ProgressRing } from "@/components/ui/progress-ring";
import {
  ArrowLeft,
  BookOpen,
  Check,
  ChevronRight,
  Clock,
  FileText,
  Lock,
  Play,
  Video
} from "lucide-react";
import { Link } from "wouter";
import { Badge } from "@/components/ui/badge";
import { formatDate, formatDateTime, formatWatchTime } from "@/lib/utils";

interface CourseDetailProps {
  slug: string;
}

export function CourseDetail({ slug }: CourseDetailProps) {
  const { data, isLoading, error } = useQuery({
    queryKey: [`/api/student/courses/${slug}`],
    enabled: !!slug
  });
  
  if (isLoading) {
    return <CourseDetailSkeleton />;
  }
  
  if (error || !data) {
    return (
      <div className="p-6">
        <div className="mb-6">
          <Link href="/student/courses">
            <Button variant="outline" size="sm">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Courses
            </Button>
          </Link>
        </div>
        <Card>
          <CardContent className="p-6">
            <p className="text-red-500">Error loading course data. Please try again later.</p>
          </CardContent>
        </Card>
      </div>
    );
  }
  
  return (
    <div className="p-4 md:p-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6">
        <div>
          <Link href="/student/courses">
            <Button variant="outline" size="sm" className="mb-2">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Courses
            </Button>
          </Link>
          <h1 className="text-2xl font-bold text-gray-800">{data.course.title}</h1>
        </div>
      </div>
      
      {/* Progress Overview */}
      <Card className="mb-6">
        <div className="px-5 py-4 border-b border-gray-200">
          <h2 className="font-inter text-lg font-medium text-gray-800">Course Progress</h2>
        </div>
        <CardContent className="p-5">
          <div className="flex flex-col md:flex-row items-start">
            <div className="w-full md:w-1/4 mb-4 md:mb-0 flex justify-center">
              <ProgressRing value={data.progress} size={144} />
            </div>
            <div className="w-full md:w-3/4">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                <div>
                  <p className="text-sm font-medium text-gray-500">Modules Completed</p>
                  <p className="text-lg font-semibold text-gray-800">
                    {data.completedModules} of {data.totalModules} modules
                  </p>
                  <p className="text-xs text-gray-500 mt-1">
                    {data.progress < 100 
                      ? "Keep going! You're making great progress."
                      : "Congratulations! You've completed all modules."}
                  </p>
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-500">Total Watch Time</p>
                  <p className="text-lg font-semibold text-gray-800">{data.totalWatchTime}</p>
                  <p className="text-xs text-gray-500 mt-1">
                    You've watched {Math.round(data.progress)}% of course content.
                  </p>
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-500">Quiz Performance</p>
                  <p className="text-lg font-semibold text-gray-800">
                    {data.modules.some(m => m.avgQuizScore) 
                      ? `${Math.round(data.modules.reduce((sum, m) => sum + (m.avgQuizScore || 0), 0) / 
                          data.modules.filter(m => m.avgQuizScore).length)}% average score`
                      : "No quizzes attempted yet"}
                  </p>
                  <p className="text-xs text-gray-500 mt-1">
                    Based on {data.modules.filter(m => m.quizAttempts > 0).length} completed quizzes.
                  </p>
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-500">Course Valid Until</p>
                  <p className="text-lg font-semibold text-gray-800">
                    {formatDate(data.enrollment.validUntil)}
                  </p>
                  <p className="text-xs text-gray-500 mt-1">
                    You have access for {Math.ceil((new Date(data.enrollment.validUntil).getTime() - 
                    new Date().getTime()) / (1000 * 60 * 60 * 24 * 30))} more months.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
      
      {/* Modules List */}
      <Card>
        <div className="px-5 py-4 border-b border-gray-200">
          <h2 className="font-inter text-lg font-medium text-gray-800">Course Modules</h2>
        </div>
        <div className="divide-y divide-gray-200">
          {data.modules.map((module, index) => (
            <div key={index} className={`p-5 ${module.isLocked ? 'opacity-60' : ''} ${index === 2 ? 'bg-primary-50' : ''}`}>
              <div className="flex items-start">
                <div className="flex-shrink-0 mt-1">
                  <span className={`flex items-center justify-center h-8 w-8 rounded-full ${
                    module.isCompleted 
                      ? 'bg-green-500 text-white' 
                      : module.isLocked 
                        ? 'bg-gray-300 text-white'
                        : 'bg-primary text-white'
                  }`}>
                    {module.isCompleted ? (
                      <Check className="h-5 w-5" />
                    ) : module.isLocked ? (
                      <Lock className="h-5 w-5" />
                    ) : (
                      <Play className="h-5 w-5" />
                    )}
                  </span>
                </div>
                <div className="ml-4 flex-1">
                  <div className="flex flex-col md:flex-row md:items-center justify-between">
                    <div>
                      <h3 className="text-lg font-medium text-gray-800">{module.title}</h3>
                      <p className="text-gray-500 text-sm mt-1">
                        {module.isCompleted 
                          ? `Completed on ${formatDate(module.completedAt)}`
                          : module.isLocked 
                            ? `Locked - Complete previous module to unlock`
                            : `In progress - ${Math.round((module.videos.filter(v => v.watched).length / module.videos.length) * 100)}% complete`}
                      </p>
                    </div>
                    <div className="mt-2 md:mt-0">
                      {module.isCompleted ? (
                        <span className="inline-flex items-center px-2 py-1 text-xs font-medium rounded bg-green-100 text-green-800">
                          <Check className="h-3 w-3 mr-1" />
                          Completed
                        </span>
                      ) : !module.isLocked ? (
                        <Button>Continue</Button>
                      ) : null}
                    </div>
                  </div>
                  
                  {!module.isLocked && (
                    <>
                      {!module.isCompleted && (
                        <div className="mt-2">
                          <div className="w-full h-2 bg-gray-200 rounded-full">
                            <div 
                              className="h-full bg-primary rounded-full" 
                              style={{ width: `${Math.round((module.videos.filter(v => v.watched).length / module.videos.length) * 100)}%` }}
                            />
                          </div>
                        </div>
                      )}
                      <div className="mt-4 grid grid-cols-1 md:grid-cols-3 gap-2">
                        <div className="flex items-center text-sm">
                          <Video className="text-gray-400 mr-1 h-4 w-4" />
                          <span>{module.videos.length} videos</span>
                        </div>
                        <div className="flex items-center text-sm">
                          <FileText className="text-gray-400 mr-1 h-4 w-4" />
                          <span>{module.documents.length} documents</span>
                        </div>
                        <div className="flex items-center text-sm">
                          <BookOpen className="text-gray-400 mr-1 h-4 w-4" />
                          <span>
                            {module.quizAttempts > 0 
                              ? `Quiz Score: ${module.bestQuizScore}%` 
                              : "Quiz required to complete"}
                          </span>
                        </div>
                      </div>
                    </>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
}

function CourseDetailSkeleton() {
  return (
    <div className="p-4 md:p-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6">
        <div>
          <Skeleton className="h-9 w-32 mb-2" />
          <Skeleton className="h-8 w-64" />
        </div>
      </div>
      
      <Card className="mb-6">
        <div className="px-5 py-4 border-b border-gray-200">
          <Skeleton className="h-6 w-40" />
        </div>
        <CardContent className="p-5">
          <div className="flex flex-col md:flex-row items-start">
            <div className="w-full md:w-1/4 mb-4 md:mb-0 flex justify-center">
              <Skeleton className="h-36 w-36 rounded-full" />
            </div>
            <div className="w-full md:w-3/4">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                {[1, 2, 3, 4].map((i) => (
                  <div key={i}>
                    <Skeleton className="h-4 w-32 mb-2" />
                    <Skeleton className="h-6 w-40 mb-1" />
                    <Skeleton className="h-3 w-48" />
                  </div>
                ))}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
      
      <Card>
        <div className="px-5 py-4 border-b border-gray-200">
          <Skeleton className="h-6 w-40" />
        </div>
        <div className="divide-y divide-gray-200">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="p-5">
              <div className="flex items-start">
                <Skeleton className="h-8 w-8 rounded-full" />
                <div className="ml-4 flex-1">
                  <div className="flex flex-col md:flex-row justify-between">
                    <div className="w-full md:w-2/3">
                      <Skeleton className="h-6 w-48 mb-2" />
                      <Skeleton className="h-4 w-64 mb-4" />
                    </div>
                    <Skeleton className="h-9 w-28 mt-2 md:mt-0" />
                  </div>
                  <div className="mt-4 grid grid-cols-1 md:grid-cols-3 gap-2">
                    {[1, 2, 3].map((j) => (
                      <Skeleton key={j} className="h-5 w-28" />
                    ))}
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
}

export default CourseDetail;
