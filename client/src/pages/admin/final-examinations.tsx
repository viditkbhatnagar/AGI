import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Plus, Edit, Trash2, Save, X, AlertCircle } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface FinalExamQuestion {
  text: string;
  choices: string[];
  correctIndex: number;
}

interface FinalExamination {
  _id?: string;
  courseSlug: string;
  title: string;
  description?: string;
  questions: FinalExamQuestion[];
  passingScore: number;
  maxAttempts: number;
  isActive: boolean;
}

interface Course {
  slug: string;
  title: string;
}

export default function AdminFinalExaminations() {
  const [examinations, setExaminations] = useState<FinalExamination[]>([]);
  const [courses, setCourses] = useState<Course[]>([]);
  const [selectedCourse, setSelectedCourse] = useState<string>('');
  const [currentExam, setCurrentExam] = useState<FinalExamination | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const { toast } = useToast();

  // Form state
  const [formData, setFormData] = useState<FinalExamination>({
    courseSlug: '',
    title: '',
    description: '',
    questions: [],
    passingScore: 70,
    maxAttempts: 3,
    isActive: true
  });

  useEffect(() => {
    fetchCourses();
    fetchExaminations();
  }, []);

  const fetchCourses = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch('/api/admin/courses', {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      if (!response.ok) throw new Error('Failed to fetch courses');
      
      const data = await response.json();
      setCourses(data);
    } catch (error) {
      console.error('Error fetching courses:', error);
      toast({
        title: 'Error',
        description: 'Failed to fetch courses',
        variant: 'destructive'
      });
    }
  };

  const fetchExaminations = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch('/api/admin/final-exams', {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      if (!response.ok) throw new Error('Failed to fetch examinations');
      
      const data = await response.json();
      setExaminations(data);
    } catch (error) {
      console.error('Error fetching examinations:', error);
      toast({
        title: 'Error',
        description: 'Failed to fetch examinations',
        variant: 'destructive'
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleCreateOrUpdate = async () => {
    if (!formData.courseSlug || !formData.title || formData.questions.length === 0) {
      toast({
        title: 'Validation Error',
        description: 'Please fill all required fields and add at least one question',
        variant: 'destructive'
      });
      return;
    }

    try {
      const token = localStorage.getItem('token');
      const response = await fetch('/api/admin/final-exams', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify(formData)
      });

      if (!response.ok) throw new Error('Failed to save examination');

      toast({
        title: 'Success',
        description: isEditing ? 'Examination updated successfully' : 'Examination created successfully'
      });

      setIsDialogOpen(false);
      resetForm();
      fetchExaminations();
    } catch (error) {
      console.error('Error saving examination:', error);
      toast({
        title: 'Error',
        description: 'Failed to save examination',
        variant: 'destructive'
      });
    }
  };

  const handleDelete = async (courseSlug: string) => {
    if (!confirm('Are you sure you want to delete this examination?')) return;

    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`/api/admin/final-exams/${courseSlug}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` }
      });

      if (!response.ok) throw new Error('Failed to delete examination');

      toast({
        title: 'Success',
        description: 'Examination deleted successfully'
      });

      fetchExaminations();
    } catch (error) {
      console.error('Error deleting examination:', error);
      toast({
        title: 'Error',
        description: 'Failed to delete examination',
        variant: 'destructive'
      });
    }
  };

  const handleEdit = (exam: FinalExamination) => {
    setFormData(exam);
    setIsEditing(true);
    setIsDialogOpen(true);
  };

  const resetForm = () => {
    setFormData({
      courseSlug: '',
      title: '',
      description: '',
      questions: [],
      passingScore: 70,
      maxAttempts: 3,
      isActive: true
    });
    setIsEditing(false);
  };

  const addQuestion = () => {
    setFormData({
      ...formData,
      questions: [
        ...formData.questions,
        {
          text: '',
          choices: ['', '', '', ''],
          correctIndex: 0
        }
      ]
    });
  };

  const updateQuestion = (index: number, field: keyof FinalExamQuestion, value: any) => {
    const updatedQuestions = [...formData.questions];
    updatedQuestions[index] = {
      ...updatedQuestions[index],
      [field]: value
    };
    setFormData({ ...formData, questions: updatedQuestions });
  };

  const updateChoice = (questionIndex: number, choiceIndex: number, value: string) => {
    const updatedQuestions = [...formData.questions];
    updatedQuestions[questionIndex].choices[choiceIndex] = value;
    setFormData({ ...formData, questions: updatedQuestions });
  };

  const removeQuestion = (index: number) => {
    const updatedQuestions = formData.questions.filter((_, i) => i !== index);
    setFormData({ ...formData, questions: updatedQuestions });
  };

  if (isLoading) {
    return (
      <div className="p-6">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-gray-200 rounded w-1/4"></div>
          <div className="h-64 bg-gray-200 rounded"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold">Final Examinations</h1>
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button onClick={() => resetForm()}>
              <Plus className="h-4 w-4 mr-2" />
              Create Examination
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>
                {isEditing ? 'Edit' : 'Create'} Final Examination
              </DialogTitle>
            </DialogHeader>
            
            <div className="space-y-6 mt-4">
              {/* Course Selection */}
              <div className="space-y-2">
                <Label htmlFor="course">Course *</Label>
                <Select
                  value={formData.courseSlug}
                  onValueChange={(value) => setFormData({ ...formData, courseSlug: value })}
                  disabled={isEditing}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select a course" />
                  </SelectTrigger>
                  <SelectContent>
                    {courses.map(course => (
                      <SelectItem key={course.slug} value={course.slug}>
                        {course.title}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Title */}
              <div className="space-y-2">
                <Label htmlFor="title">Title *</Label>
                <Input
                  id="title"
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  placeholder="Final Examination"
                />
              </div>

              {/* Description */}
              <div className="space-y-2">
                <Label htmlFor="description">Description</Label>
                <Textarea
                  id="description"
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="Instructions for the examination..."
                  rows={3}
                />
              </div>

              {/* Settings */}
              <div className="grid grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="passingScore">Passing Score (%)</Label>
                  <Input
                    id="passingScore"
                    type="number"
                    min="0"
                    max="100"
                    value={formData.passingScore}
                    onChange={(e) => setFormData({ ...formData, passingScore: parseInt(e.target.value) })}
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="maxAttempts">Max Attempts</Label>
                  <Input
                    id="maxAttempts"
                    type="number"
                    min="1"
                    value={formData.maxAttempts}
                    onChange={(e) => setFormData({ ...formData, maxAttempts: parseInt(e.target.value) })}
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="isActive">Active</Label>
                  <div className="flex items-center space-x-2 mt-2">
                    <Switch
                      id="isActive"
                      checked={formData.isActive}
                      onCheckedChange={(checked) => setFormData({ ...formData, isActive: checked })}
                    />
                    <Label htmlFor="isActive" className="text-sm text-gray-600">
                      {formData.isActive ? 'Active' : 'Inactive'}
                    </Label>
                  </div>
                </div>
              </div>

              {/* Questions */}
              <div className="space-y-4">
                <div className="flex justify-between items-center">
                  <Label>Questions *</Label>
                  <Button type="button" onClick={addQuestion} size="sm">
                    <Plus className="h-4 w-4 mr-1" />
                    Add Question
                  </Button>
                </div>

                {formData.questions.length === 0 && (
                  <Alert>
                    <AlertCircle className="h-4 w-4" />
                    <AlertDescription>
                      No questions added yet. Click "Add Question" to create your first question.
                    </AlertDescription>
                  </Alert>
                )}

                {formData.questions.map((question, qIndex) => (
                  <Card key={qIndex}>
                    <CardHeader>
                      <div className="flex justify-between items-center">
                        <CardTitle className="text-lg">Question {qIndex + 1}</CardTitle>
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => removeQuestion(qIndex)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div>
                        <Label>Question Text</Label>
                        <Textarea
                          value={question.text}
                          onChange={(e) => updateQuestion(qIndex, 'text', e.target.value)}
                          placeholder="Enter your question..."
                          rows={2}
                        />
                      </div>

                      <div className="space-y-2">
                        <Label>Answer Choices</Label>
                        {question.choices.map((choice, cIndex) => (
                          <div key={cIndex} className="flex items-center space-x-2">
                            <input
                              type="radio"
                              name={`correct-${qIndex}`}
                              checked={question.correctIndex === cIndex}
                              onChange={() => updateQuestion(qIndex, 'correctIndex', cIndex)}
                            />
                            <Input
                              value={choice}
                              onChange={(e) => updateChoice(qIndex, cIndex, e.target.value)}
                              placeholder={`Option ${cIndex + 1}`}
                            />
                          </div>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>

              {/* Actions */}
              <div className="flex justify-end space-x-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    setIsDialogOpen(false);
                    resetForm();
                  }}
                >
                  Cancel
                </Button>
                <Button type="button" onClick={handleCreateOrUpdate}>
                  <Save className="h-4 w-4 mr-2" />
                  {isEditing ? 'Update' : 'Create'} Examination
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Examinations List */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {examinations.map((exam) => {
          const course = courses.find(c => c.slug === exam.courseSlug);
          return (
            <Card key={exam.courseSlug}>
              <CardHeader>
                <div className="flex justify-between items-start">
                  <div>
                    <CardTitle className="text-lg">{exam.title}</CardTitle>
                    <p className="text-sm text-gray-500 mt-1">{course?.title || exam.courseSlug}</p>
                  </div>
                  <div className="flex space-x-2">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleEdit(exam)}
                    >
                      <Edit className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleDelete(exam.courseSlug)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-gray-500">Questions:</span>
                    <span className="font-medium">{exam.questions.length}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-500">Passing Score:</span>
                    <span className="font-medium">{exam.passingScore}%</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-500">Max Attempts:</span>
                    <span className="font-medium">{exam.maxAttempts}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-500">Status:</span>
                    <span className={`font-medium ${exam.isActive ? 'text-green-600' : 'text-red-600'}`}>
                      {exam.isActive ? 'Active' : 'Inactive'}
                    </span>
                  </div>
                </div>
                {exam.description && (
                  <p className="text-sm text-gray-600 mt-3 line-clamp-2">
                    {exam.description}
                  </p>
                )}
              </CardContent>
            </Card>
          );
        })}
        
        {examinations.length === 0 && (
          <Card className="col-span-full">
            <CardContent className="text-center py-12">
              <p className="text-gray-500">No final examinations created yet.</p>
              <p className="text-sm text-gray-400 mt-2">
                Click "Create Examination" to add your first final exam.
              </p>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
} 