import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { 
  MessageSquare, 
  Star, 
  User, 
  BookOpen, 
  Search,
  Filter,
  TrendingUp,
  Users,
  Award,
  Calendar
} from 'lucide-react';
import { format } from 'date-fns';

interface TeacherRating {
  teacherId: string;
  teacherName: string;
  rating: number;
}

interface Feedback {
  _id: string;
  studentId: string;
  studentName: string;
  studentEmail: string;
  studentPhone: string;
  courseSlug: string;
  courseName: string;
  overallRating: number;
  contentRating: number;
  teacherRatings: TeacherRating[];
  feedbackText: string;
  submittedAt: string;
  isCompleted: boolean;
}

interface FeedbackStats {
  totalFeedbacks: number;
  avgOverallRating: number;
  avgContentRating: number;
  avgTeacherRating: number;
  courseStats: {
    [courseSlug: string]: {
      courseName: string;
      count: number;
      avgOverall: number;
      avgContent: number;
    };
  };
}

interface StarDisplayProps {
  rating: number;
  showNumber?: boolean;
}

const StarDisplay: React.FC<StarDisplayProps> = ({ rating, showNumber = true }) => {
  return (
    <div className="flex items-center gap-1">
      {[1, 2, 3, 4, 5].map((star) => (
        <Star
          key={star}
          size={16}
          className={star <= rating ? 'fill-yellow-400 text-yellow-400' : 'text-gray-300'}
        />
      ))}
      {showNumber && (
        <span className="text-sm text-gray-600 ml-1">({rating})</span>
      )}
    </div>
  );
};

export function AdminFeedbacks() {
  const [currentPage, setCurrentPage] = useState(1);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCourse, setSelectedCourse] = useState('all');

  // Fetch feedback statistics
  const { data: stats } = useQuery<FeedbackStats>({
    queryKey: ['/api/admin/feedback-stats'],
    queryFn: async () => {
      const token = localStorage.getItem('token');
      const res = await fetch('/api/admin/feedback-stats', {
        headers: token ? { Authorization: `Bearer ${token}` } : undefined,
      });
      if (!res.ok) throw new Error('Failed to fetch feedback stats');
      return res.json();
    },
  });

  // Fetch feedbacks with pagination
  const { data: feedbackData, isLoading } = useQuery({
    queryKey: ['/api/admin/feedbacks', currentPage],
    queryFn: async () => {
      const token = localStorage.getItem('token');
      const res = await fetch(`/api/admin/feedbacks?page=${currentPage}&limit=10`, {
        headers: token ? { Authorization: `Bearer ${token}` } : undefined,
      });
      if (!res.ok) throw new Error('Failed to fetch feedbacks');
      return res.json();
    },
  });

  const feedbacks: Feedback[] = feedbackData?.feedbacks || [];
  const pagination = feedbackData?.pagination;

  // Filter feedbacks based on search and course selection
  const filteredFeedbacks = feedbacks.filter(feedback => {
    const matchesSearch = 
      feedback.studentName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      feedback.studentEmail.toLowerCase().includes(searchQuery.toLowerCase()) ||
      feedback.feedbackText.toLowerCase().includes(searchQuery.toLowerCase()) ||
      feedback.courseName.toLowerCase().includes(searchQuery.toLowerCase());

    const matchesCourse = selectedCourse === 'all' || feedback.courseSlug === selectedCourse;

    return matchesSearch && matchesCourse;
  });

  // Get unique courses from all feedbacks for filter
  const allCourses = Array.from(
    new Set(
      feedbacks.map(f => ({ slug: f.courseSlug, name: f.courseName }))
    )
  ).reduce((acc, current) => {
    if (!acc.find(course => course.slug === current.slug)) {
      acc.push(current);
    }
    return acc;
  }, [] as { slug: string; name: string }[]);

  if (isLoading && !feedbacks.length) {
    return (
      <div className="p-6">
        <div className="max-w-6xl mx-auto">
          <Card>
            <CardContent className="flex items-center justify-center py-8">
              <div className="text-center">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
                <p>Loading feedbacks...</p>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Student Feedbacks</h1>
        <p className="text-gray-600">View and analyze student feedback about courses and teachers.</p>
      </div>

      {/* Statistics Cards */}
      {stats && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center">
                <MessageSquare className="h-8 w-8 text-blue-600" />
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-600">Total Feedbacks</p>
                  <p className="text-2xl font-bold text-gray-900">{stats.totalFeedbacks}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center">
                <BookOpen className="h-8 w-8 text-green-600" />
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-600">Avg Overall Rating</p>
                  <div className="flex items-center gap-2">
                    <p className="text-2xl font-bold text-gray-900">{stats.avgOverallRating.toFixed(1)}</p>
                    <StarDisplay rating={Math.round(stats.avgOverallRating)} showNumber={false} />
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center">
                <Award className="h-8 w-8 text-yellow-600" />
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-600">Avg Content Rating</p>
                  <div className="flex items-center gap-2">
                    <p className="text-2xl font-bold text-gray-900">{stats.avgContentRating.toFixed(1)}</p>
                    <StarDisplay rating={Math.round(stats.avgContentRating)} showNumber={false} />
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center">
                <Users className="h-8 w-8 text-purple-600" />
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-600">Avg Teacher Rating</p>
                  <div className="flex items-center gap-2">
                    <p className="text-2xl font-bold text-gray-900">{stats.avgTeacherRating.toFixed(1)}</p>
                    <StarDisplay rating={Math.round(stats.avgTeacherRating)} showNumber={false} />
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Course Statistics */}
      {stats?.courseStats && Object.keys(stats.courseStats).length > 0 && (
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5" />
              Course-wise Statistics
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {Object.entries(stats.courseStats).map(([courseSlug, courseStats]) => (
                <div key={courseSlug} className="border rounded-lg p-4">
                  <h4 className="font-semibold mb-2">{courseStats.courseName}</h4>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span>Feedbacks:</span>
                      <Badge variant="secondary">{courseStats.count}</Badge>
                    </div>
                    <div className="flex justify-between items-center">
                      <span>Overall:</span>
                      <StarDisplay rating={Math.round(courseStats.avgOverall)} />
                    </div>
                    <div className="flex justify-between items-center">
                      <span>Content:</span>
                      <StarDisplay rating={Math.round(courseStats.avgContent)} />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Search and Filter */}
      <Card className="mb-6">
        <CardContent className="p-4">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                <Input
                  placeholder="Search by student name, email, course, or feedback text..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
            <div className="md:w-64">
              <select
                value={selectedCourse}
                onChange={(e) => setSelectedCourse(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="all">All Courses</option>
                {allCourses.map((course) => (
                  <option key={course.slug} value={course.slug}>
                    {course.name}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Feedbacks List */}
      <div className="space-y-6">
        {filteredFeedbacks.length === 0 ? (
          <Card>
            <CardContent className="text-center py-8">
              <MessageSquare className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-semibold mb-2">No Feedbacks Found</h3>
              <p className="text-gray-600">
                {searchQuery || selectedCourse !== 'all' 
                  ? 'No feedbacks match your current filters.'
                  : 'No student feedbacks have been submitted yet.'
                }
              </p>
            </CardContent>
          </Card>
        ) : (
          filteredFeedbacks.map((feedback) => (
            <Card key={feedback._id} className="border-l-4 border-l-blue-500">
              <CardHeader>
                <div className="flex justify-between items-start">
                  <div>
                    <CardTitle className="flex items-center gap-2">
                      <User className="h-5 w-5" />
                      {feedback.studentName}
                    </CardTitle>
                    <div className="text-sm text-gray-600 mt-1">
                      <p>{feedback.studentEmail} • {feedback.studentPhone}</p>
                      <p className="flex items-center gap-1 mt-1">
                        <Calendar className="h-4 w-4" />
                        Submitted on {format(new Date(feedback.submittedAt), 'PPP')}
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <Badge variant="secondary" className="bg-green-100 text-green-800 mb-2">
                      Completed
                    </Badge>
                    <Badge variant="outline" className="block">
                      {feedback.courseName}
                    </Badge>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* Course Ratings */}
                <div>
                  <h4 className="font-semibold text-lg mb-3 flex items-center gap-2">
                    <BookOpen className="h-5 w-5" />
                    Course Ratings
                  </h4>
                  <div className="border rounded-lg p-4">
                    <h5 className="font-medium mb-3">{feedback.courseName}</h5>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <p className="text-sm text-gray-600 mb-1">Overall Rating:</p>
                        <StarDisplay rating={feedback.overallRating} />
                      </div>
                      <div>
                        <p className="text-sm text-gray-600 mb-1">Content Rating:</p>
                        <StarDisplay rating={feedback.contentRating} />
                      </div>
                    </div>
                  </div>
                </div>

                {/* Teacher Ratings */}
                {feedback.teacherRatings.length > 0 && (
                  <div>
                    <h4 className="font-semibold text-lg mb-3 flex items-center gap-2">
                      <Award className="h-5 w-5" />
                      Teacher Ratings
                    </h4>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {feedback.teacherRatings.map((rating) => (
                        <div key={rating.teacherId} className="border rounded-lg p-4">
                          <h5 className="font-medium mb-2">{rating.teacherName}</h5>
                          <StarDisplay rating={rating.rating} />
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Feedback Text */}
                <div>
                  <h4 className="font-semibold text-lg mb-3 flex items-center gap-2">
                    <MessageSquare className="h-5 w-5" />
                    Detailed Feedback
                  </h4>
                  <div className="bg-gray-50 rounded-lg p-4">
                    <p className="text-gray-800 whitespace-pre-wrap leading-relaxed">
                      {feedback.feedbackText}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>

      {/* Pagination */}
      {pagination && pagination.totalPages > 1 && (
        <div className="mt-6 flex justify-center items-center gap-2">
          <Button
            variant="outline"
            onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
            disabled={currentPage === 1}
          >
            Previous
          </Button>
          
          <div className="flex gap-1">
            {Array.from({ length: pagination.totalPages }, (_, i) => i + 1).map((page) => (
              <Button
                key={page}
                variant={page === currentPage ? "default" : "outline"}
                onClick={() => setCurrentPage(page)}
                className="w-10 h-10"
              >
                {page}
              </Button>
            ))}
          </div>

          <Button
            variant="outline"
            onClick={() => setCurrentPage(prev => Math.min(pagination.totalPages, prev + 1))}
            disabled={currentPage === pagination.totalPages}
          >
            Next
          </Button>
        </div>
      )}
    </div>
  );
}