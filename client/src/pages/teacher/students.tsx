import { DashboardLayout } from "@/components/layout/dashboard-layout";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Users, Phone, Mail, BookOpen } from "lucide-react";
import { Helmet } from "react-helmet-async";
import { useEffect, useState } from "react";

export default function TeacherStudents() {
  const [courseFilter, setCourseFilter] = useState<string | null>(null);
  
  // Extract course parameter from URL
  useEffect(() => {
    const updateCourseFilter = () => {
      console.log('=== DEBUG FRONTEND STUDENTS PAGE ===');
      console.log('Window location href:', window.location.href);
      
      try {
        const url = new URL(window.location.href);
        const course = url.searchParams.get('course');
        console.log('Parsed course parameter:', course);
        setCourseFilter(course);
      } catch (error) {
        console.error('Error parsing URL:', error);
        setCourseFilter(null);
      }
    };
    
    // Run on initial load
    updateCourseFilter();
    
    // Listen for popstate events (back/forward navigation)
    window.addEventListener('popstate', updateCourseFilter);
    
    // For single page applications, we might need to poll for changes
    const interval = setInterval(updateCourseFilter, 500);
    
    // Cleanup
    return () => {
      window.removeEventListener('popstate', updateCourseFilter);
      clearInterval(interval);
    };
  }, []);

  const { data: students = [], isLoading, isError, error } = useQuery({
    queryKey: ['teacher-students', courseFilter || 'all'],
    queryFn: async () => {
      const token = localStorage.getItem('token');
      const queryParams = courseFilter ? `?course=${encodeURIComponent(courseFilter)}` : '';
      const url = `/api/teacher/students${queryParams}`;
      
      // Log the request for debugging
      console.log('=== FETCHING STUDENTS ===');
      console.log('Fetching students with URL:', url);
      console.log('Course filter:', courseFilter);
      
      const response = await fetch(url, {
        headers: token ? { Authorization: `Bearer ${token}` } : undefined,
      });
      
      if (!response.ok) {
        const errorText = await response.text();
        console.error('Failed to fetch students:', response.status, errorText);
        throw new Error(`Failed to fetch students: ${response.status} ${errorText}`);
      }
      
      const result = await response.json();
      console.log('Received students:', result);
      console.log('Students count:', result.length);
      return result;
    },
    staleTime: 0,
    cacheTime: 0,
  });

  if (isLoading) {
    return (
      <DashboardLayout>
        <div className="p-6">
          <div className="animate-pulse space-y-4">
            <div className="h-8 bg-gray-200 rounded w-1/4"></div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {[...Array(6)].map((_, i) => (
                <div key={i} className="h-48 bg-gray-200 rounded"></div>
              ))}
            </div>
          </div>
        </div>
      </DashboardLayout>
    );
  }

  if (isError) {
    return (
      <DashboardLayout>
        <div className="p-6">
          <Card>
            <CardContent className="p-6">
              <h2 className="text-xl font-bold text-red-600 mb-2">Error Loading Students</h2>
              <p className="text-red-500">{error?.message || 'Unknown error occurred'}</p>
              <p className="mt-2 text-sm text-gray-500">Course filter: {courseFilter || 'none'}</p>
            </CardContent>
          </Card>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <Helmet>
        <title>My Students | Teacher Portal</title>
        <meta name="description" content={courseFilter 
          ? `View students enrolled in course ${courseFilter}` 
          : "View and manage your assigned students."} />
      </Helmet>
      
      <div className="p-6 space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-800">
              {courseFilter ? `Students in ${courseFilter}` : "My Students"}
            </h1>
            <p className="text-gray-600 mt-1">
              {courseFilter 
                ? `Students enrolled in course ${courseFilter}` 
                : "Students enrolled in your assigned courses"}
            </p>
          </div>
          <div className="text-sm text-gray-500 bg-gray-100 px-3 py-1 rounded-full">
            {students.length} students
          </div>
        </div>

        {students.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {students.map((student, index) => (
              <Card key={student._id || index} className="hover:shadow-lg transition-shadow">
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between">
                    <div className="flex items-center space-x-3">
                      <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center">
                        <Users className="h-6 w-6 text-blue-600" />
                      </div>
                      <div>
                        <CardTitle className="text-lg">{student.name}</CardTitle>
                        <Badge variant="secondary" className="text-xs mt-1">
                          {student.pathway === 'standalone' ? 'Standalone' : 'With MBA'}
                        </Badge>
                      </div>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="space-y-3">
                  {student.phone && (
                    <div className="flex items-center space-x-2 text-sm text-gray-600">
                      <Phone className="h-4 w-4" />
                      <span>{student.phone}</span>
                    </div>
                  )}
                  
                  <div className="space-y-2">
                    <div className="flex items-center space-x-2 text-sm">
                      <BookOpen className="h-4 w-4 text-gray-400" />
                      <span className="font-medium">Enrolled Courses:</span>
                    </div>
                    <div className="flex flex-wrap gap-1">
                      {(student.courses || []).map((courseSlug, idx) => (
                        <Badge key={idx} variant="outline" className="text-xs">
                          {courseSlug}
                        </Badge>
                      ))}
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : (
          <Card>
            <CardContent className="text-center py-12">
              <Users className="h-12 w-12 mx-auto text-gray-300 mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">
                {courseFilter ? `No Students in ${courseFilter}` : "No Students Assigned"}
              </h3>
              <p className="text-gray-600">
                {courseFilter 
                  ? `No students are enrolled in course ${courseFilter} yet.`
                  : "You don't have any students enrolled in your courses yet."}
              </p>
            </CardContent>
          </Card>
        )}
      </div>
    </DashboardLayout>
  );
}