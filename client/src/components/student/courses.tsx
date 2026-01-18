import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Link } from "wouter";
import { Badge } from "@/components/ui/badge";
import { 
  BookOpen, 
  GraduationCap, 
  Play, 
  ChevronDown, 
  Calendar,
  Clock,
  Layers
} from "lucide-react";
import { formatDate, formatTimeRemaining } from "@/lib/utils";
import { useAuth } from "@/lib/auth-provider";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { cn } from "@/lib/utils";

// Types based on API response from server
interface CourseModule {
  title: string;
  videoCount: number;
  documentCount: number;
}

interface CompletedModule {
  moduleIndex: number;
  completed: boolean;
  completedAt: string | null;
  _id: string;
}

interface CourseEnrollment {
  id: string;
  enrollDate: string;
  validUntil: string;
  completedModules: CompletedModule[];
}

interface CourseData {
  id: string;
  slug: string;
  title: string;
  description?: string;
  type: 'standalone' | 'with-mba';
  progress: number;
  modules: CourseModule[];
  enrollment: CourseEnrollment;
}

export function StudentCourses() {
  const { student } = useAuth();
  const [expandedCourse, setExpandedCourse] = useState<string | null>(null);
  
  const {
    data: coursesData = [],
    isLoading,
    error
  } = useQuery<CourseData[], Error>({
    queryKey: ["/api/student/courses"],
    queryFn: async () => {
      const token = localStorage.getItem("token");
      if (!token) throw new Error("Not authenticated");
      const res = await fetch("/api/student/courses", {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (!res.ok) throw new Error(`Error ${res.status}: ${res.statusText}`);
      return res.json();
    }
  });

  const toggleCourse = (courseId: string) => {
    setExpandedCourse(prev => prev === courseId ? null : courseId);
  };
  
  // Display loading skeleton
  if (isLoading) {
    return <CoursesSkeleton />;
  }
  
  // Display error message if fetch failed
  if (error) {
    return (
      <div className="p-6 md:p-8 max-w-5xl mx-auto">
        <h1 className="font-heading text-2xl font-bold text-slate-800 mb-6">My Courses</h1>
        <Card className="bg-white rounded-2xl border border-slate-200">
          <CardContent className="p-6">
            <p className="text-red-500">Error loading courses data: {error.message}</p>
          </CardContent>
        </Card>
      </div>
    );
  }
  
  // Display empty state if no courses
  if (coursesData.length === 0) {
    return (
      <div className="p-6 md:p-8 max-w-5xl mx-auto">
        <h1 className="font-heading text-2xl font-bold text-slate-800 mb-6">My Courses</h1>
        <Card className="bg-white rounded-2xl border border-slate-200">
          <CardContent className="p-12 text-center">
            <div className="size-20 mx-auto mb-4 rounded-2xl bg-slate-100 flex items-center justify-center">
              <BookOpen className="size-10 text-slate-400" />
            </div>
            <h3 className="text-lg font-semibold text-slate-800 mb-2">No Courses Found</h3>
            <p className="text-slate-500 max-w-md mx-auto">
              You are not enrolled in any courses yet. Please contact the administration if you believe this is an error.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }
  
  return (
    <div className="p-6 md:p-8 max-w-5xl mx-auto font-display">
      {/* Header */}
      <div className="mb-8">
        <h1 className="font-heading text-2xl md:text-3xl font-bold text-slate-800 mb-2">My Courses</h1>
        <p className="text-slate-500">
          You are enrolled in <span className="font-semibold text-[#18548b]">{coursesData.length}</span> course{coursesData.length !== 1 ? 's' : ''}
        </p>
      </div>

      {/* Course Accordion List */}
      <div className="space-y-4">
        {coursesData.map((course, index) => {
          const isExpanded = expandedCourse === course.id;
          const isCompleted = course.progress >= 100;
          const completedModulesCount = course.enrollment.completedModules?.filter(m => m.completed).length || 0;
          const totalModules = course.modules?.length || 0;
          
          return (
            <div 
              key={course.id}
              className={cn(
                "rounded-2xl border-2 overflow-hidden transition-all duration-300",
                isExpanded 
                  ? "border-[#18548b] shadow-lg shadow-[#18548b]/10 bg-white" 
                  : "border-slate-200 bg-white hover:border-slate-300 hover:shadow-md"
              )}
            >
              {/* Course Header - Clickable */}
              <button
                onClick={() => toggleCourse(course.id)}
                className="w-full p-5 flex items-center gap-4 text-left transition-colors hover:bg-slate-50"
              >
                {/* Step Number */}
                <div className={cn(
                  "flex-shrink-0 size-12 rounded-xl flex items-center justify-center font-bold text-lg",
                  isCompleted 
                    ? "bg-emerald-100 text-emerald-600" 
                    : "bg-[#18548b]/10 text-[#18548b]"
                )}>
                  <span>{index + 1}</span>
                </div>
                
                {/* Course Info */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <h3 className="font-heading text-lg font-bold text-slate-800 truncate">
                        {course.title}
                      </h3>
                      <div className="flex items-center gap-3 mt-1">
                        <Badge 
                          variant="outline" 
                          className={cn(
                            "text-xs font-medium",
                            course.type === 'with-mba' 
                              ? 'bg-violet-50 text-violet-700 border-violet-200' 
                              : 'bg-[#18548b]/10 text-[#18548b] border-[#18548b]/20'
                          )}
                        >
                          {course.type === 'with-mba' ? 'With MBA' : 'Standalone'}
                        </Badge>
                        <span className="text-xs text-slate-500">
                          {completedModulesCount}/{totalModules} modules
                        </span>
                      </div>
                    </div>
                    
                    {/* Expand Icon */}
                    <div className={cn(
                      "size-8 rounded-lg flex items-center justify-center transition-all",
                      isExpanded 
                        ? "bg-[#18548b] text-white rotate-180" 
                        : "bg-slate-100 text-slate-500"
                    )}>
                      <ChevronDown className="size-5" />
                    </div>
                  </div>
                </div>
              </button>
              
              {/* Expanded Content */}
              <div className={cn(
                "overflow-hidden transition-all duration-300",
                isExpanded ? "max-h-[500px] opacity-100" : "max-h-0 opacity-0"
              )}>
                <div className="px-5 pb-5 pt-2 border-t border-slate-100">
                  {/* Course Description */}
                  {course.description && (
                    <div className="mb-5 p-4 bg-slate-50 rounded-xl">
                      <p className="text-sm text-slate-600 leading-relaxed line-clamp-4">
                        {course.description}
                      </p>
                    </div>
                  )}
                  
                  {/* Course Stats Grid */}
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-5">
                    <div className="p-3 bg-blue-50 rounded-xl">
                      <div className="flex items-center gap-2 mb-1">
                        <Calendar className="size-4 text-blue-500" />
                        <span className="text-xs text-slate-500">Enrolled</span>
                      </div>
                      <p className="text-sm font-semibold text-slate-700">
                        {formatDate(course.enrollment.enrollDate)}
                      </p>
                    </div>
                    
                    <div className="p-3 bg-amber-50 rounded-xl">
                      <div className="flex items-center gap-2 mb-1">
                        <Clock className="size-4 text-amber-500" />
                        <span className="text-xs text-slate-500">Valid Until</span>
                      </div>
                      <p className="text-sm font-semibold text-slate-700">
                        {formatDate(course.enrollment.validUntil)}
                      </p>
                    </div>
                    
                    <div className="p-3 bg-emerald-50 rounded-xl">
                      <div className="flex items-center gap-2 mb-1">
                        <Layers className="size-4 text-emerald-500" />
                        <span className="text-xs text-slate-500">Modules</span>
                      </div>
                      <p className="text-sm font-semibold text-slate-700">
                        {completedModulesCount} of {totalModules} done
                      </p>
                    </div>
                    
                    <div className="p-3 bg-violet-50 rounded-xl">
                      <div className="flex items-center gap-2 mb-1">
                        <Clock className="size-4 text-violet-500" />
                        <span className="text-xs text-slate-500">Time Left</span>
                      </div>
                      <p className="text-sm font-semibold text-slate-700">
                        {formatTimeRemaining(course.enrollment.validUntil)}
                      </p>
                    </div>
                  </div>
                  
                  {/* Progress Bar */}
                  <div className="mb-5">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-xs font-medium text-slate-500">Course Progress</span>
                      <span className="text-sm font-bold text-[#18548b]">{course.progress}%</span>
                    </div>
                    <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                      <div 
                        className={cn(
                          "h-full rounded-full transition-all duration-500",
                          isCompleted 
                            ? "bg-gradient-to-r from-emerald-500 to-emerald-400" 
                            : "bg-gradient-to-r from-[#18548b] to-[#3b82f6]"
                        )}
                        style={{ width: `${course.progress}%` }}
                      />
                    </div>
                  </div>
                  
                  {/* Action Button */}
                  <Link href={`/student/courses/${course.slug}`}>
                    <Button className="w-full bg-[#18548b] hover:bg-[#134775] text-white rounded-xl py-3 font-semibold shadow-lg shadow-[#18548b]/20 transition-all">
                      <Play className="mr-2 size-4" />
                      {isCompleted ? 'Review Course' : 'Continue Learning'}
                    </Button>
                  </Link>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function CoursesSkeleton() {
  return (
    <div className="p-6 md:p-8 max-w-5xl mx-auto">
      <Skeleton className="h-8 w-48 mb-2" />
      <Skeleton className="h-5 w-64 mb-8" />
      
      <div className="space-y-4">
        {[1, 2].map((i) => (
          <div key={i} className="rounded-2xl border-2 border-slate-200 p-5">
            <div className="flex items-center gap-4">
              <Skeleton className="size-12 rounded-xl" />
              <div className="flex-1">
                <Skeleton className="h-6 w-64 mb-2" />
                <Skeleton className="h-4 w-32" />
              </div>
              <Skeleton className="size-8 rounded-lg" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export default StudentCourses;
