import { DashboardLayout } from "@/components/layout/dashboard-layout";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { BookOpen, Users } from "lucide-react";
import { Helmet } from "react-helmet-async";
import { useLocation } from "wouter";

export default function TeacherCourses() {
  const [, setLocation] = useLocation();
  const { data: courses = [], isLoading } = useQuery({
    queryKey: ['/api/teacher/courses'],
  });

  if (isLoading) {
    return (
      <DashboardLayout>
        <div className="p-6">
          <div className="animate-pulse space-y-4">
            <div className="h-8 bg-gray-200 rounded w-1/4"></div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {[...Array(4)].map((_, i) => (
                <div key={i} className="h-64 bg-gray-200 rounded"></div>
              ))}
            </div>
          </div>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <Helmet>
        <title>My Courses | Teacher Portal</title>
        <meta name="description" content="View your assigned courses and course materials." />
      </Helmet>
      
      <div className="p-6 space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-800">My Courses</h1>
            <p className="text-gray-600 mt-1">Courses assigned to you for teaching</p>
          </div>
          <div className="text-sm text-gray-500 bg-gray-100 px-3 py-1 rounded-full">
            {courses.length} courses
          </div>
        </div>

        {courses.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {courses.map((course, index) => (
              <Card key={course.slug || index} className="hover:shadow-lg transition-shadow">
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div className="flex items-center space-x-3">
                      <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center">
                        <BookOpen className="h-6 w-6 text-green-600" />
                      </div>
                      <div>
                        <CardTitle className="text-xl">{course.title}</CardTitle>
                        <Badge variant="outline" className="mt-1">
                          {course.type || 'Course'}
                        </Badge>
                      </div>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <p className="text-sm text-gray-600 font-medium">Course Code:</p>
                    <p className="text-lg font-mono">{course.slug}</p>
                  </div>
                  
                  {course.description && (
                    <div>
                      <p className="text-sm text-gray-600 font-medium">Description:</p>
                      <p className="text-sm text-gray-700">{course.description}</p>
                    </div>
                  )}
                  
                  <div className="flex items-center justify-between pt-4 border-t">
                    <Button 
                      variant="outline" 
                      size="sm" 
                      onClick={() => {
                        const url = `/teacher/students?course=${encodeURIComponent(course.slug)}`;
                        console.log('=== NAVIGATING TO STUDENTS PAGE ===');
                        console.log('Course slug:', course.slug);
                        console.log('Encoded URL:', url);
                        console.log('Window location before navigation:', window.location.href);
                        setLocation(url);
                      }}
                      className="flex items-center space-x-2"
                    >
                      <Users className="h-4 w-4" />
                      <span>View Students</span>
                    </Button>
                    <Badge variant="secondary">
                      {course.modules?.length || 0} modules
                    </Badge>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : (
          <Card>
            <CardContent className="text-center py-12">
              <BookOpen className="h-12 w-12 mx-auto text-gray-300 mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">No Courses Assigned</h3>
              <p className="text-gray-600">You haven't been assigned to teach any courses yet.</p>
            </CardContent>
          </Card>
        )}
      </div>
    </DashboardLayout>
  );
}