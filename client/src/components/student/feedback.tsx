import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { Star, MessageSquare, BookOpen, CheckCircle, Clock, AlertCircle } from 'lucide-react';
import CourseFeedbackForm from './course-feedback-form';

interface Teacher {
  id: string;
  name: string;
  email: string;
}

interface Course {
  slug: string;
  title: string;
  feedbackCompleted: boolean;
  existingFeedback: any;
  teachers: Teacher[];
}

interface StudentData {
  id: string;
  name: string;
  email: string;
  phone: string;
}

interface FeedbackData {
  student: StudentData;
  courses: Course[];
}

export function StudentFeedback() {
  const { toast } = useToast();
  const [selectedCourse, setSelectedCourse] = useState<string | null>(null);

  // Fetch feedback data
  const { data: feedbackData, isLoading, refetch } = useQuery<FeedbackData>({
    queryKey: ['/api/student/feedback/data'],
    queryFn: async () => {
      const token = localStorage.getItem('token');
      const res = await fetch('/api/student/feedback/data', {
        headers: token ? { Authorization: `Bearer ${token}` } : undefined,
      });
      if (!res.ok) throw new Error('Failed to fetch feedback data');
      return res.json();
    },
  });

  const handleFeedbackSubmitted = () => {
    setSelectedCourse(null);
    refetch();
    toast({
      title: 'Success!',
      description: 'Your feedback has been submitted successfully.',
    });
  };

  const handleBackToCourses = () => {
    setSelectedCourse(null);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading your courses...</p>
        </div>
      </div>
    );
  }

  if (!feedbackData) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-center">
              <AlertCircle className="h-5 w-5 text-red-500" />
              No Course Enrollments Found
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-center text-gray-600">
              You need to be enrolled in courses to provide feedback.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  // If a course is selected, show the course feedback form
  if (selectedCourse) {
    const course = feedbackData.courses.find(c => c.slug === selectedCourse);
    if (!course) {
      setSelectedCourse(null);
      return null;
    }

    return (
      <CourseFeedbackForm
        course={course}
        student={feedbackData.student}
        onSubmitted={handleFeedbackSubmitted}
        onBack={handleBackToCourses}
      />
    );
  }

  // Show course list
  const completedCount = feedbackData.courses.filter(c => c.feedbackCompleted).length;
  const totalCount = feedbackData.courses.length;

  return (
    <div className="space-y-6">
      {/* Header */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <MessageSquare className="h-5 w-5" />
            Course Feedback
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-600">
                Provide feedback for your enrolled courses to unlock final examinations.
              </p>
              <p className="text-sm text-gray-500 mt-1">
                Feedback is required for each course before you can attempt its final exam.
              </p>
            </div>
            <div className="text-right">
              <div className="text-2xl font-bold text-blue-600">
                {completedCount}/{totalCount}
              </div>
              <div className="text-xs text-gray-500">Completed</div>
            </div>
          </div>
          {completedCount < totalCount && (
            <div className="mt-4 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
              <div className="flex items-center gap-2 text-yellow-800">
                <AlertCircle className="h-4 w-4" />
                <span className="text-sm font-medium">
                  {totalCount - completedCount} course{totalCount - completedCount !== 1 ? 's' : ''} pending feedback
                </span>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Courses Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {feedbackData.courses.map((course) => (
          <Card key={course.slug} className="hover:shadow-lg transition-shadow">
            <CardHeader>
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <CardTitle className="text-lg line-clamp-2">{course.title}</CardTitle>
                  <div className="flex items-center gap-2 mt-2">
                    <BookOpen className="h-4 w-4 text-gray-500" />
                    <span className="text-sm text-gray-600">{course.teachers.length} teacher{course.teachers.length !== 1 ? 's' : ''}</span>
                  </div>
                </div>
                <div className="flex-shrink-0">
                  {course.feedbackCompleted ? (
                    <Badge variant="default" className="bg-green-100 text-green-800 border-green-200">
                      <CheckCircle className="h-3 w-3 mr-1" />
                      Completed
                    </Badge>
                  ) : (
                    <Badge variant="outline" className="border-yellow-300 text-yellow-700">
                      <Clock className="h-3 w-3 mr-1" />
                      Pending
                    </Badge>
                  )}
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {/* Teachers */}
                <div>
                  <div className="text-sm font-medium text-gray-700 mb-1">Teachers:</div>
                  <div className="flex flex-wrap gap-1">
                    {course.teachers.map((teacher) => (
                      <Badge key={teacher.id} variant="secondary" className="text-xs">
                        {teacher.name}
                      </Badge>
                    ))}
                  </div>
                </div>

                {/* Action Button */}
                <Button
                  onClick={() => setSelectedCourse(course.slug)}
                  className="w-full"
                  variant={course.feedbackCompleted ? "outline" : "default"}
                >
                  {course.feedbackCompleted ? (
                    <>
                      <Star className="h-4 w-4 mr-2" />
                      View/Edit Feedback
                    </>
                  ) : (
                    <>
                      <MessageSquare className="h-4 w-4 mr-2" />
                      Provide Feedback
                    </>
                  )}
                </Button>

                {/* Feedback Status */}
                {course.feedbackCompleted && course.existingFeedback && (
                  <div className="text-xs text-gray-500 text-center">
                    Submitted on {new Date(course.existingFeedback.submittedAt).toLocaleDateString()}
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Progress Summary */}
      {completedCount === totalCount && totalCount > 0 && (
        <Card className="border-green-200 bg-green-50">
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <CheckCircle className="h-8 w-8 text-green-600" />
              <div>
                <h3 className="font-semibold text-green-800">All Feedback Completed!</h3>
                <p className="text-green-700 text-sm">
                  You can now attempt final examinations for all your courses.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}