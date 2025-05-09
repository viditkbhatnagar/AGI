import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Link } from "wouter";
import { Badge } from "@/components/ui/badge";
import { BookOpen, GraduationCap, Play } from "lucide-react";
import { formatDate, formatTimeRemaining } from "@/lib/utils";
import { ProgressRing } from "@/components/ui/progress-ring";
import { useAuth } from "@/lib/auth-provider";
import { useEffect, useState } from "react";

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
  type: 'standalone' | 'with-mba';
  progress: number;
  modules: CourseModule[];
  enrollment: CourseEnrollment;
}

export function StudentCourses() {
  const { student } = useAuth();
  const [coursesData, setCoursesData] = useState<CourseData[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  
  // Fetch enrolled courses from API
  useEffect(() => {
    const fetchCourses = async () => {
      if (!student?.id) return;
      
      setIsLoading(true);
      try {
        const token = localStorage.getItem('token');
        const response = await fetch('/api/student/courses', {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        });
        
        if (!response.ok) {
          throw new Error(`Error ${response.status}: ${response.statusText}`);
        }
        
        const data = await response.json();
        console.log('Courses data:', data);
        setCoursesData(Array.isArray(data) ? data : []);
        setError(null);
      } catch (err) {
        console.error('Error fetching courses:', err);
        setError(err instanceof Error ? err : new Error('Failed to fetch courses'));
      } finally {
        setIsLoading(false);
      }
    };
    
    fetchCourses();
  }, [student?.id]);
  
  // Display loading skeleton
  if (isLoading) {
    return <CoursesSkeleton />;
  }
  
  // Display error message if fetch failed
  if (error) {
    return (
      <div className="p-6">
        <h1 className="text-2xl font-bold text-gray-800 mb-4">My Courses</h1>
        <Card>
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
      <div className="p-6">
        <h1 className="text-2xl font-bold text-gray-800 mb-4">My Courses</h1>
        <Card>
          <CardContent className="p-10 text-center">
            <BookOpen className="h-16 w-16 text-gray-300 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-800 mb-2">No Courses Found</h3>
            <p className="text-gray-500 max-w-md mx-auto mb-6">
              You are not enrolled in any courses yet. Please contact the administration if you believe this is an error.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }
  
  return (
    <div className="p-4 md:p-6">
      <h1 className="text-2xl font-bold text-gray-800 mb-6">My Courses</h1>
      
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {coursesData.map((course) => (
          <Card key={course.id} className="overflow-hidden dashboard-card">
            <div className="p-6">
              <div className="flex flex-col sm:flex-row gap-4">
                <div className="flex-shrink-0">
                  <div className="h-32 w-32 bg-primary-100 rounded-lg flex items-center justify-center">
                    {course.type === 'with-mba' ? (
                      <GraduationCap className="h-16 w-16 text-primary" />
                    ) : (
                      <BookOpen className="h-16 w-16 text-primary" />
                    )}
                  </div>
                </div>
                
                <div className="flex-1">
                  <div className="flex justify-between">
                    <div>
                      <h2 className="text-xl font-semibold text-gray-800 mb-1">
                        {course.title}
                      </h2>
                      <Badge variant="outline" className={
                        course.type === 'with-mba' 
                          ? 'bg-purple-100 text-purple-800' 
                          : 'bg-primary-100 text-primary-800'
                      }>
                        {course.type === 'with-mba' ? 'With MBA' : 'Standalone'}
                      </Badge>
                    </div>
                    
                    <div className="hidden sm:block">
                      <ProgressRing
                        value={course.progress || 0}
                        size={80}
                        strokeWidth={8}
                      />
                    </div>
                  </div>
                  
                  <div className="mt-4">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-4">
                      <div className="text-sm">
                        <span className="text-gray-500">Enrolled:</span>{" "}
                        <span className="font-medium">{formatDate(course.enrollment.enrollDate)}</span>
                      </div>
                      <div className="text-sm">
                        <span className="text-gray-500">Valid until:</span>{" "}
                        <span className="font-medium">{formatDate(course.enrollment.validUntil)}</span>
                      </div>
                    </div>
                    
                    <div className="sm:hidden mb-4">
                      <div className="flex items-center gap-4">
                        <ProgressRing
                          value={course.progress || 0}
                          size={60}
                          strokeWidth={6}
                        />
                        <div>
                          <div className="text-sm font-medium">{course.progress || 0}% Complete</div>
                          <div className="text-xs text-gray-500">
                            {formatTimeRemaining(course.enrollment.validUntil)} remaining
                          </div>
                        </div>
                      </div>
                    </div>
                    
                    <Link href={`/student/courses/${course.slug}`}>
                      <Button className="w-full sm:w-auto">
                        <Play className="mr-2 h-4 w-4" />
                        Continue Learning
                      </Button>
                    </Link>
                  </div>
                </div>
              </div>
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
}

function CoursesSkeleton() {
  return (
    <div className="p-4 md:p-6">
      <Skeleton className="h-8 w-48 mb-6" />
      
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {[1, 2].map((i) => (
          <Card key={i} className="overflow-hidden">
            <div className="p-6">
              <div className="flex flex-col sm:flex-row gap-4">
                <Skeleton className="h-32 w-32 rounded-lg" />
                
                <div className="flex-1">
                  <div className="flex justify-between">
                    <div>
                      <Skeleton className="h-7 w-48 mb-2" />
                      <Skeleton className="h-6 w-24" />
                    </div>
                    
                    <Skeleton className="hidden sm:block h-20 w-20 rounded-full" />
                  </div>
                  
                  <div className="mt-4">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-4">
                      <Skeleton className="h-5 w-40" />
                      <Skeleton className="h-5 w-40" />
                    </div>
                    
                    <Skeleton className="h-10 w-full sm:w-40" />
                  </div>
                </div>
              </div>
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
}

export default StudentCourses;
