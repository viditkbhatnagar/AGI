import React, { useState, useEffect } from 'react';
import { useMutation } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import { Star, MessageSquare, BookOpen, User, Phone, Mail, Send, ArrowLeft } from 'lucide-react';
import { Badge } from '@/components/ui/badge';

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

interface TeacherRating {
  teacherId: string;
  teacherName: string;
  rating: number;
}

interface StarRatingProps {
  rating: number;
  onRatingChange: (rating: number) => void;
  label: string;
  disabled?: boolean;
}

const StarRating: React.FC<StarRatingProps> = ({ rating, onRatingChange, label, disabled = false }) => {
  const [hoveredStar, setHoveredStar] = useState(0);

  return (
    <div className="space-y-2">
      <Label className="text-sm font-medium">{label}</Label>
      <div className="flex gap-1">
        {[1, 2, 3, 4, 5].map((star) => (
          <button
            key={star}
            type="button"
            disabled={disabled}
            onClick={() => !disabled && onRatingChange(star)}
            onMouseEnter={() => !disabled && setHoveredStar(star)}
            onMouseLeave={() => !disabled && setHoveredStar(0)}
            className={`p-1 transition-colors ${disabled ? 'cursor-not-allowed' : 'cursor-pointer hover:scale-110'}`}
          >
            <Star
              size={24}
              className={`transition-colors ${
                star <= (hoveredStar || rating)
                  ? 'fill-yellow-400 text-yellow-400'
                  : 'text-gray-300'
              }`}
            />
          </button>
        ))}
      </div>
      <p className="text-xs text-gray-500">
        {rating > 0 ? `${rating} star${rating !== 1 ? 's' : ''}` : 'Click to rate'}
      </p>
    </div>
  );
};

interface CourseFeedbackFormProps {
  course: Course;
  student: StudentData;
  onSubmitted: () => void;
  onBack: () => void;
}

export default function CourseFeedbackForm({ course, student, onSubmitted, onBack }: CourseFeedbackFormProps) {
  const { toast } = useToast();

  // Form state
  const [formData, setFormData] = useState({
    studentName: student.name,
    studentEmail: student.email,
    studentPhone: student.phone,
    feedbackText: '',
  });

  const [overallRating, setOverallRating] = useState(0);
  const [contentRating, setContentRating] = useState(0);
  const [teacherRatings, setTeacherRatings] = useState<TeacherRating[]>([]);
  const [wordCount, setWordCount] = useState(0);

  // Initialize form data if existing feedback
  useEffect(() => {
    if (course.existingFeedback) {
      const feedback = course.existingFeedback;
      setFormData({
        studentName: feedback.studentName,
        studentEmail: feedback.studentEmail,
        studentPhone: feedback.studentPhone,
        feedbackText: feedback.feedbackText,
      });
      setOverallRating(feedback.overallRating);
      setContentRating(feedback.contentRating);
      setTeacherRatings(feedback.teacherRatings);
      
      const words = feedback.feedbackText.trim().split(/\s+/).filter((word: string) => word.length > 0);
      setWordCount(words.length);
    } else {
      // Initialize teacher ratings
      const initialTeacherRatings = course.teachers.map(teacher => ({
        teacherId: teacher.id,
        teacherName: teacher.name,
        rating: 0
      }));
      setTeacherRatings(initialTeacherRatings);
    }
  }, [course]);

  // Submit feedback mutation
  const submitFeedbackMutation = useMutation({
    mutationFn: async (data: any) => {
      const token = localStorage.getItem('token');
      const res = await fetch(`/api/student/feedback/${course.slug}/submit`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token && { Authorization: `Bearer ${token}` }),
        },
        body: JSON.stringify(data),
      });

      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.message || 'Failed to submit feedback');
      }

      return res.json();
    },
    onSuccess: () => {
      onSubmitted();
    },
    onError: (error: Error) => {
      toast({
        title: 'Error',
        description: error.message,
        variant: 'destructive',
      });
    },
  });

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    
    if (field === 'feedbackText') {
      const words = value.trim().split(/\s+/).filter(word => word.length > 0);
      setWordCount(words.length);
    }
  };

  const updateTeacherRating = (teacherId: string, rating: number) => {
    setTeacherRatings(prev => prev.map(r => 
      r.teacherId === teacherId ? { ...r, rating } : r
    ));
  };

  const validateForm = () => {
    if (!formData.studentName.trim()) return 'Name is required';
    if (!formData.studentEmail.trim()) return 'Email is required';
    if (!formData.studentPhone.trim()) return 'Phone number is required';
    if (!formData.feedbackText.trim()) return 'Feedback is required';
    if (wordCount > 2000) return 'Feedback cannot exceed 2000 words';
    
    if (overallRating === 0) return 'Overall course rating is required';
    if (contentRating === 0) return 'Course content rating is required';

    // Check teacher ratings
    for (const rating of teacherRatings) {
      if (rating.rating === 0) {
        return `Please provide a rating for teacher "${rating.teacherName}"`;
      }
    }

    return null;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    const validationError = validateForm();
    if (validationError) {
      toast({
        title: 'Validation Error',
        description: validationError,
        variant: 'destructive',
      });
      return;
    }

    submitFeedbackMutation.mutate({
      ...formData,
      overallRating,
      contentRating,
      teacherRatings,
    });
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-4">
            <Button variant="outline" size="sm" onClick={onBack}>
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Courses
            </Button>
            <div className="flex-1">
              <CardTitle className="flex items-center gap-2">
                <BookOpen className="h-5 w-5" />
                Course Feedback
              </CardTitle>
              <Badge variant="outline" className="mt-2">{course.title}</Badge>
            </div>
          </div>
        </CardHeader>
      </Card>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Student Information */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <User className="h-5 w-5" />
              Your Information
            </CardTitle>
          </CardHeader>
          <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="name">Full Name *</Label>
              <div className="relative">
                <User className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                <Input
                  id="name"
                  value={formData.studentName}
                  onChange={(e) => handleInputChange('studentName', e.target.value)}
                  required
                  className="pl-10 mt-1"
                />
              </div>
            </div>
            <div>
              <Label htmlFor="phone">Phone Number *</Label>
              <div className="relative">
                <Phone className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                <Input
                  id="phone"
                  value={formData.studentPhone}
                  onChange={(e) => handleInputChange('studentPhone', e.target.value)}
                  required
                  className="pl-10 mt-1"
                />
              </div>
            </div>
            <div className="md:col-span-2">
              <Label htmlFor="email">Email Address *</Label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                <Input
                  id="email"
                  type="email"
                  value={formData.studentEmail}
                  onChange={(e) => handleInputChange('studentEmail', e.target.value)}
                  required
                  className="pl-10 mt-1"
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Course Ratings */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Star className="h-5 w-5" />
              Course Ratings
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <StarRating
                label="Overall Course Rating *"
                rating={overallRating}
                onRatingChange={setOverallRating}
              />
              <StarRating
                label="Course Content Rating *"
                rating={contentRating}
                onRatingChange={setContentRating}
              />
            </div>
          </CardContent>
        </Card>

        {/* Teacher Ratings */}
        {teacherRatings.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <User className="h-5 w-5" />
                Teacher Ratings
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              {teacherRatings.map((rating) => (
                <div key={rating.teacherId} className="border rounded-lg p-4">
                  <h4 className="font-semibold mb-4">{rating.teacherName}</h4>
                  <StarRating
                    label="Teacher Performance Rating *"
                    rating={rating.rating}
                    onRatingChange={(newRating) => updateTeacherRating(rating.teacherId, newRating)}
                  />
                </div>
              ))}
            </CardContent>
          </Card>
        )}

        {/* General Feedback */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <MessageSquare className="h-5 w-5" />
              Course Feedback
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label htmlFor="feedback">Share your detailed feedback about this course *</Label>
              <Textarea
                id="feedback"
                value={formData.feedbackText}
                onChange={(e) => handleInputChange('feedbackText', e.target.value)}
                placeholder="Please share your thoughts about the course content, delivery, assignments, and overall learning experience..."
                rows={8}
                required
                className="mt-1"
              />
              <div className="flex justify-between items-center mt-2">
                <p className="text-sm text-gray-500">
                  Share specific details about what you liked, what could be improved, and suggestions for enhancement.
                </p>
                <p className={`text-sm ${wordCount > 2000 ? 'text-red-500' : 'text-gray-500'}`}>
                  {wordCount}/2000 words
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Submit Button */}
        <Card>
          <CardContent className="pt-6">
            <div className="flex justify-between items-center">
              <p className="text-sm text-gray-600">
                * All fields are required. This feedback helps improve our courses and teaching quality.
              </p>
              <Button 
                type="submit" 
                disabled={submitFeedbackMutation.isPending}
                className="min-w-[140px]"
              >
                {submitFeedbackMutation.isPending ? (
                  <div className="flex items-center gap-2">
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                    Submitting...
                  </div>
                ) : (
                  <>
                    <Send className="h-4 w-4 mr-2" />
                    {course.feedbackCompleted ? 'Update Feedback' : 'Submit Feedback'}
                  </>
                )}
              </Button>
            </div>
          </CardContent>
        </Card>
      </form>
    </div>
  );
}
