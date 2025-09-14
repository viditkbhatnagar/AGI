import React, { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Separator } from '@/components/ui/separator';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useConditionalRender } from '@/lib/permissions-provider';
import { 
  Upload, 
  FileText, 
  Brain, 
  CheckCircle, 
  AlertCircle, 
  Clock, 
  Search, 
  Eye, 
  Edit, 
  Trash2, 
  Copy, 
  Move,
  Plus,
  Loader2,
  Download,
  BookOpen,
  Target
} from 'lucide-react';
import { toast } from '@/hooks/use-toast';
import { uploadToCloudinary, validateFile, FILE_TYPES } from '@/lib/cloudinary';

interface QuizQuestion {
  id: string;
  question: string;
  options: {
    A: string;
    B: string;
    C: string;
    D: string;
  };
  correctAnswer: 'A' | 'B' | 'C' | 'D';
  explanation?: string;
}

interface QuizRepositoryItem {
  _id: string;
  title: string;
  description?: string;
  documentUrl: string;
  documentType: string;
  fileName: string;
  questions: QuizQuestion[];
  originCourse?: {
    _id: string;
    title: string;
    slug: string;
  };
  originModule?: number;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
  extractionStatus: 'pending' | 'processing' | 'completed' | 'failed';
  extractionError?: string;
  tags?: string[];
  difficulty?: 'easy' | 'medium' | 'hard';
  estimatedTime?: number;
}

interface Course {
  _id: string;
  title: string;
  slug: string;
  modules?: Array<{
    title: string;
    questions?: any[];
  }>;
}

const QuizRepository: React.FC = () => {
  const { renderIfCanCreate, renderIfCanEdit, renderIfCanDelete } = useConditionalRender();
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [selectedQuiz, setSelectedQuiz] = useState<QuizRepositoryItem | null>(null);
  const [showUploadDialog, setShowUploadDialog] = useState(false);
  const [showQuestionEditor, setShowQuestionEditor] = useState(false);
  const [isViewOnlyMode, setIsViewOnlyMode] = useState(false);
  const [showDeployDialog, setShowDeployDialog] = useState(false);
  const [editingQuestions, setEditingQuestions] = useState<QuizQuestion[]>([]);
  
  const queryClient = useQueryClient();

  // Fetch quiz repository
  const { data: quizData, isLoading: isLoadingQuizzes } = useQuery({
    queryKey: ['quizRepository', searchTerm, statusFilter],
    queryFn: async () => {
      const token = localStorage.getItem('token');
      const params = new URLSearchParams();
      if (searchTerm) params.append('search', searchTerm);
      if (statusFilter !== 'all') params.append('status', statusFilter);
      
      const response = await fetch(`/api/quiz-repository?${params.toString()}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      if (!response.ok) throw new Error('Failed to fetch quiz repository');
      return response.json();
    }
  });

  // Fetch courses for deployment
  const { data: coursesData, isLoading: isLoadingCourses } = useQuery({
    queryKey: ['courses', 'withModules'],
    queryFn: async () => {
      const token = localStorage.getItem('token');
      const response = await fetch('/api/admin/courses?includeModules=true', {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      if (!response.ok) throw new Error('Failed to fetch courses');
      return response.json();
    }
  });

  // Upload mutation with client-side Cloudinary upload
  const uploadMutation = useMutation({
    mutationFn: async ({ file, title, description, originCourse, originModule }: {
      file: File;
      title?: string;
      description?: string;
      originCourse?: string;
      originModule?: string;
    }) => {
      // First, upload to Cloudinary client-side
      console.log('🚀 Starting quiz document upload...');
      
      const uploadResult = await uploadToCloudinary(file, 'question-documents');
      console.log('☁️ Cloudinary upload successful:', uploadResult);
      
      // Then send the file info to server for AI processing
      const token = localStorage.getItem('token');
      const response = await fetch('/api/quiz-repository/create', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          title: title || file.name,
          description,
          documentUrl: uploadResult.url,
          documentType: file.type,
          fileName: uploadResult.fileName,
          fileSize: uploadResult.fileSize,
          publicId: uploadResult.publicId,
          originCourse,
          originModule
        })
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to create quiz repository entry');
      }
      
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['quizRepository'] });
      setShowUploadDialog(false);
      // Reset form
      setUploadFile(null);
      setUploadTitle('');
      setUploadDescription('');
      setUploadOriginCourse('');
      setUploadOriginModule('');
      toast({
        title: 'Success',
        description: 'Quiz document uploaded successfully. AI extraction is in progress.'
      });
    },
    onError: (error) => {
      toast({
        variant: 'destructive',
        title: 'Upload Failed',
        description: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  });

  // Update questions mutation
  const updateQuestionsMutation = useMutation({
    mutationFn: async ({ id, questions, title, description }: {
      id: string;
      questions: QuizQuestion[];
      title?: string;
      description?: string;
    }) => {
      const token = localStorage.getItem('token');
      const response = await fetch(`/api/quiz-repository/${id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ questions, title, description })
      });
      
      if (!response.ok) throw new Error('Failed to update quiz');
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['quizRepository'] });
      setShowQuestionEditor(false);
      toast({
        title: 'Success',
        description: 'Quiz questions updated successfully'
      });
    }
  });

  // Deploy mutation
  const deployMutation = useMutation({
    mutationFn: async ({ id, courseSlug, moduleIndex, operation }: {
      id: string;
      courseSlug: string;
      moduleIndex: number;
      operation: 'copy' | 'move';
    }) => {
      const token = localStorage.getItem('token');
      const response = await fetch(`/api/quiz-repository/${id}/deploy`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ courseSlug, moduleIndex, operation })
      });
      
      if (!response.ok) throw new Error('Failed to deploy quiz');
      return { ...await response.json(), courseSlug }; // Include courseSlug in return
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['quizRepository'] });
      // Also invalidate course data to refresh quiz UI
      if (data.courseSlug) {
        queryClient.invalidateQueries({ queryKey: [`/api/courses/${data.courseSlug}`] });
        queryClient.invalidateQueries({ queryKey: [`/api/courses/${data.courseSlug}/quizzes`] });
      }
      setShowDeployDialog(false);
      toast({
        title: 'Success',
        description: data.message
      });
    }
  });

  // Delete mutation
  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const token = localStorage.getItem('token');
      const response = await fetch(`/api/quiz-repository/${id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` }
      });
      
      if (!response.ok) throw new Error('Failed to delete quiz');
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['quizRepository'] });
      toast({
        title: 'Success',
        description: 'Quiz deleted successfully'
      });
    }
  });

  const [uploadFile, setUploadFile] = useState<File | null>(null);
  const [uploadTitle, setUploadTitle] = useState('');
  const [uploadDescription, setUploadDescription] = useState('');
  const [uploadOriginCourse, setUploadOriginCourse] = useState('');
  const [uploadOriginModule, setUploadOriginModule] = useState('');

  const handleUpload = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    
    if (!uploadFile) {
      toast({
        variant: 'destructive',
        title: 'No File Selected',
        description: 'Please select a file to upload'
      });
      return;
    }
    
    // Validate file
    const validation = validateFile(uploadFile, {
      maxSizeMB: 10,
      allowedTypes: [
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document', // .docx
        'application/msword', // .doc
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', // .xlsx
        'application/vnd.ms-excel', // .xls
        'text/csv', // .csv
        'text/plain' // .txt
      ]
    });
    
    if (!validation.isValid) {
      toast({
        variant: 'destructive',
        title: 'Invalid File',
        description: validation.error
      });
      return;
    }
    
    uploadMutation.mutate({
      file: uploadFile,
      title: uploadTitle,
      description: uploadDescription,
      originCourse: uploadOriginCourse,
      originModule: uploadOriginModule
    });
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setUploadFile(file);
      setUploadTitle(file.name.split('.')[0]); // Set default title
    }
  };

  const handleEditQuestions = (quiz: QuizRepositoryItem) => {
    setSelectedQuiz(quiz);
    setEditingQuestions([...quiz.questions]);
    setIsViewOnlyMode(false);
    setShowQuestionEditor(true);
  };

  const handleViewQuestions = (quiz: QuizRepositoryItem) => {
    setSelectedQuiz(quiz);
    setEditingQuestions([...quiz.questions]);
    setIsViewOnlyMode(true);
    setShowQuestionEditor(true);
  };

  const handleUpdateQuestion = (index: number, field: string, value: string) => {
    const updatedQuestions = [...editingQuestions];
    if (field === 'question' || field === 'explanation') {
      updatedQuestions[index] = { ...updatedQuestions[index], [field]: value };
    } else if (field === 'correctAnswer') {
      updatedQuestions[index] = { ...updatedQuestions[index], correctAnswer: value as 'A' | 'B' | 'C' | 'D' };
    } else if (field.startsWith('option')) {
      const optionKey = field.split('.')[1] as 'A' | 'B' | 'C' | 'D';
      updatedQuestions[index] = {
        ...updatedQuestions[index],
        options: { ...updatedQuestions[index].options, [optionKey]: value }
      };
    }
    setEditingQuestions(updatedQuestions);
  };

  const addNewQuestion = () => {
    const newQuestion: QuizQuestion = {
      id: `new_${Date.now()}`,
      question: '',
      options: { A: '', B: '', C: '', D: '' },
      correctAnswer: 'A',
      explanation: ''
    };
    setEditingQuestions([...editingQuestions, newQuestion]);
  };

  const removeQuestion = (index: number) => {
    const updatedQuestions = editingQuestions.filter((_, i) => i !== index);
    setEditingQuestions(updatedQuestions);
  };

  const saveQuestions = () => {
    if (!selectedQuiz) return;
    
    const validQuestions = editingQuestions.filter(q => 
      q.question.trim() && 
      q.options.A.trim() && 
      q.options.B.trim() && 
      q.options.C.trim() && 
      q.options.D.trim()
    );
    
    updateQuestionsMutation.mutate({
      id: selectedQuiz._id,
      questions: validQuestions
    });
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed': return <CheckCircle className="h-4 w-4 text-green-600" />;
      case 'processing': return <Clock className="h-4 w-4 text-blue-600" />;
      case 'failed': return <AlertCircle className="h-4 w-4 text-red-600" />;
      default: return <Clock className="h-4 w-4 text-gray-400" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed': return 'bg-green-100 text-green-800';
      case 'processing': return 'bg-blue-100 text-blue-800';
      case 'failed': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getDifficultyColor = (difficulty?: string) => {
    switch (difficulty) {
      case 'easy': return 'bg-green-100 text-green-800';
      case 'medium': return 'bg-yellow-100 text-yellow-800';
      case 'hard': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const quizzes = quizData?.quizzes || [];

  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Quiz Repository</h1>
          <p className="text-gray-600 mt-1">
            Manage AI-powered quiz extraction and deployment
          </p>
        </div>
        
        {renderIfCanCreate(
          <Dialog open={showUploadDialog} onOpenChange={setShowUploadDialog}>
            <DialogTrigger asChild>
              <Button className="flex items-center gap-2">
                <Plus className="h-4 w-4" />
                Upload Quiz Document
              </Button>
            </DialogTrigger>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>Upload Quiz Document</DialogTitle>
              <DialogDescription>
                Upload Word, Excel, or CSV files to extract quiz questions using AI
              </DialogDescription>
            </DialogHeader>
            
            <form onSubmit={handleUpload} className="space-y-4">
              <div>
                <Label htmlFor="title">Quiz Title</Label>
                <Input 
                  id="title" 
                  value={uploadTitle}
                  onChange={(e) => setUploadTitle(e.target.value)}
                  placeholder="Enter quiz title" 
                  required 
                />
              </div>
              
              <div>
                <Label htmlFor="description">Description (Optional)</Label>
                <Textarea 
                  id="description" 
                  value={uploadDescription}
                  onChange={(e) => setUploadDescription(e.target.value)}
                  placeholder="Brief description of the quiz content"
                  rows={3}
                />
              </div>
              
              <div>
                <Label htmlFor="quizDocument">Document File</Label>
                <div className="border-2 border-dashed border-gray-300 rounded-lg p-4 text-center hover:border-gray-400 transition-colors">
                  {uploadFile ? (
                    <div className="flex items-center justify-center gap-2">
                      <FileText className="h-5 w-5 text-blue-600" />
                      <span className="text-sm font-medium">{uploadFile.name}</span>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => {
                          setUploadFile(null);
                          setUploadTitle('');
                        }}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  ) : (
                    <>
                      <Upload className="h-8 w-8 text-gray-400 mx-auto mb-2" />
                      <input
                        type="file"
                        id="quizDocument"
                        accept=".doc,.docx,.xls,.xlsx,.csv,.txt"
                        onChange={handleFileSelect}
                        className="hidden"
                      />
                      <label htmlFor="quizDocument" className="cursor-pointer">
                        <p className="text-sm font-medium text-blue-600 hover:text-blue-500">
                          Click to upload document
                        </p>
                        <p className="text-xs text-gray-500 mt-1">
                          Word (.doc, .docx), Excel (.xls, .xlsx), CSV, Text files (Max 10MB)
                        </p>
                      </label>
                    </>
                  )}
                </div>
              </div>
              
              <div className="flex justify-end gap-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setShowUploadDialog(false)}
                >
                  Cancel
                </Button>
                <Button type="submit" disabled={uploadMutation.isPending}>
                  {uploadMutation.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                  Upload & Extract
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
        )}
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="p-4">
          <div className="flex gap-4 items-center">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                <Input
                  placeholder="Search quizzes..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
            
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-40">
                <SelectValue placeholder="Filter by status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="completed">Completed</SelectItem>
                <SelectItem value="processing">Processing</SelectItem>
                <SelectItem value="failed">Failed</SelectItem>
                <SelectItem value="pending">Pending</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Quiz List */}
      {isLoadingQuizzes ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin" />
          <span className="ml-2">Loading quizzes...</span>
        </div>
      ) : (
        <div className="grid gap-4">
          {quizzes.length === 0 ? (
            <Card>
              <CardContent className="p-12 text-center">
                <BookOpen className="h-12 w-12 text-gray-300 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">No quizzes found</h3>
                <p className="text-gray-500 mb-4">
                  Upload your first quiz document to get started with AI-powered question extraction.
                </p>
                {renderIfCanCreate(
                  <Button onClick={() => setShowUploadDialog(true)}>
                    <Plus className="h-4 w-4 mr-2" />
                    Upload Quiz Document
                  </Button>
                )}
              </CardContent>
            </Card>
          ) : (
            quizzes.map((quiz: QuizRepositoryItem) => (
              <Card key={quiz._id} className="hover:shadow-md transition-shadow">
                <CardContent className="p-6">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <h3 className="text-lg font-semibold text-gray-900">{quiz.title}</h3>
                        <Badge className={getStatusColor(quiz.extractionStatus)}>
                          <div className="flex items-center gap-1">
                            {getStatusIcon(quiz.extractionStatus)}
                            {quiz.extractionStatus}
                          </div>
                        </Badge>
                        {quiz.difficulty && (
                          <Badge variant="outline" className={getDifficultyColor(quiz.difficulty)}>
                            {quiz.difficulty}
                          </Badge>
                        )}
                      </div>
                      
                      {quiz.description && (
                        <p className="text-gray-600 mb-3">{quiz.description}</p>
                      )}
                      
                      <div className="flex items-center gap-4 text-sm text-gray-500 mb-3">
                        <span className="flex items-center gap-1">
                          <FileText className="h-4 w-4" />
                          {quiz.fileName}
                        </span>
                        <span className="flex items-center gap-1">
                          <Target className="h-4 w-4" />
                          {quiz.questions.length} questions
                        </span>
                        {quiz.estimatedTime && (
                          <span className="flex items-center gap-1">
                            <Clock className="h-4 w-4" />
                            {quiz.estimatedTime} min
                          </span>
                        )}
                      </div>
                      
                      {quiz.originCourse && (
                        <div className="text-xs text-gray-500 mb-3">
                          Origin: {quiz.originCourse.title} 
                          {quiz.originModule !== undefined && ` - Module ${quiz.originModule + 1}`}
                        </div>
                      )}
                      
                      {quiz.extractionStatus === 'failed' && quiz.extractionError && (
                        <Alert className="mb-3">
                          <AlertCircle className="h-4 w-4" />
                          <AlertDescription>{quiz.extractionError}</AlertDescription>
                        </Alert>
                      )}
                    </div>
                    
                    <div className="ml-4 space-y-2">
                      {quiz.extractionStatus === 'completed' && (
                        <>
                          {/* View Questions Button - Always visible */}
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleViewQuestions(quiz)}
                            className="w-full"
                          >
                            <Eye className="h-4 w-4 mr-2" />
                            View Questions
                          </Button>
                          
                          {renderIfCanEdit(
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handleEditQuestions(quiz)}
                              className="w-full"
                            >
                              <Edit className="h-4 w-4 mr-2" />
                              Edit Questions
                            </Button>
                          )}
                          
                          {renderIfCanCreate(
                            <Dialog>
                              <DialogTrigger asChild>
                                <Button
                                  size="sm"
                                  className="w-full"
                                  onClick={() => setSelectedQuiz(quiz)}
                                >
                                  <Copy className="h-4 w-4 mr-2" />
                                  Deploy to Module
                                </Button>
                              </DialogTrigger>
                              <DialogContent>
                                <DialogHeader>
                                  <DialogTitle>Deploy Quiz to Module</DialogTitle>
                                  <DialogDescription>
                                    Select a course and module to deploy this quiz
                                  </DialogDescription>
                                </DialogHeader>
                                
                                <DeployQuizForm
                                  quiz={quiz}
                                  courses={coursesData || []}
                                  onDeploy={(courseSlug, moduleIndex, operation) => {
                                    deployMutation.mutate({
                                      id: quiz._id,
                                      courseSlug,
                                      moduleIndex,
                                      operation
                                    });
                                  }}
                                  isLoading={deployMutation.isPending}
                                  isLoadingCourses={isLoadingCourses}
                                />
                              </DialogContent>
                            </Dialog>
                          )}
                        </>
                      )}
                      
                      {renderIfCanDelete(
                        <Button
                          size="sm"
                          variant="destructive"
                          onClick={() => {
                            if (confirm('Are you sure you want to delete this quiz?')) {
                              deleteMutation.mutate(quiz._id);
                            }
                          }}
                          className="w-full"
                        >
                          <Trash2 className="h-4 w-4 mr-2" />
                          Delete
                        </Button>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </div>
      )}

      {/* Question Editor Dialog */}
      <Dialog open={showQuestionEditor} onOpenChange={setShowQuestionEditor}>
        <DialogContent className="max-w-4xl max-h-[80vh]">
          <DialogHeader>
            <DialogTitle>{isViewOnlyMode ? 'View Quiz Questions' : 'Edit Quiz Questions'}</DialogTitle>
            <DialogDescription>
              {isViewOnlyMode 
                ? 'Review the quiz questions and answers.'
                : 'Review and edit the AI-extracted questions. You can modify questions, options, and correct answers.'
              }
            </DialogDescription>
          </DialogHeader>
          
          <ScrollArea className="h-96">
            <div className="space-y-6 pr-4">
              {editingQuestions.map((question, index) => (
                <Card key={question.id} className="p-4">
                  <div className="space-y-4">
                    <div className="flex items-start justify-between">
                      <Label className="text-sm font-medium">Question {index + 1}</Label>
                      {!isViewOnlyMode && (
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => removeQuestion(index)}
                          className="text-red-600 hover:text-red-700"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      )}
                    </div>
                    
                    <Textarea
                      value={question.question}
                      onChange={(e) => handleUpdateQuestion(index, 'question', e.target.value)}
                      placeholder="Enter question text"
                      rows={2}
                      readOnly={isViewOnlyMode}
                      className={isViewOnlyMode ? 'bg-gray-50' : ''}
                    />
                    
                    <div className="grid grid-cols-2 gap-3">
                      {Object.entries(question.options).map(([key, value]) => (
                        <div key={key} className="space-y-1">
                          <Label className="text-xs font-medium flex items-center gap-2">
                            Option {key}
                            {question.correctAnswer === key && (
                              <Badge className="bg-green-100 text-green-800 text-xs">Correct</Badge>
                            )}
                          </Label>
                          <Input
                            value={value}
                            onChange={(e) => handleUpdateQuestion(index, `option.${key}`, e.target.value)}
                            placeholder={`Option ${key}`}
                            readOnly={isViewOnlyMode}
                            className={isViewOnlyMode ? 'bg-gray-50' : ''}
                          />
                        </div>
                      ))}
                    </div>
                    
                    <div className="grid grid-cols-2 gap-3">
                      <div className="space-y-1">
                        <Label className="text-xs font-medium">Correct Answer</Label>
                        <Select
                          value={question.correctAnswer}
                          onValueChange={(value) => handleUpdateQuestion(index, 'correctAnswer', value)}
                          disabled={isViewOnlyMode}
                        >
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="A">A</SelectItem>
                            <SelectItem value="B">B</SelectItem>
                            <SelectItem value="C">C</SelectItem>
                            <SelectItem value="D">D</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      
                      <div className="space-y-1">
                        <Label className="text-xs font-medium">Explanation (Optional)</Label>
                        <Input
                          value={question.explanation || ''}
                          onChange={(e) => handleUpdateQuestion(index, 'explanation', e.target.value)}
                          placeholder="Why is this the correct answer?"
                          readOnly={isViewOnlyMode}
                          className={isViewOnlyMode ? 'bg-gray-50' : ''}
                        />
                      </div>
                    </div>
                  </div>
                </Card>
              ))}
              
              {!isViewOnlyMode && (
                <Button
                  onClick={addNewQuestion}
                  variant="outline"
                  className="w-full border-dashed"
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Add New Question
                </Button>
              )}
            </div>
          </ScrollArea>
          
          <div className="flex justify-end gap-2">
            <Button
              variant="outline"
              onClick={() => setShowQuestionEditor(false)}
            >
              {isViewOnlyMode ? 'Close' : 'Cancel'}
            </Button>
            {!isViewOnlyMode && (
              <Button
                onClick={saveQuestions}
                disabled={updateQuestionsMutation.isPending}
              >
                {updateQuestionsMutation.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                Save Questions
              </Button>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

// Deploy Quiz Form Component
interface DeployQuizFormProps {
  quiz: QuizRepositoryItem;
  courses: Course[];
  onDeploy: (courseSlug: string, moduleIndex: number, operation: 'copy' | 'move') => void;
  isLoading: boolean;
  isLoadingCourses?: boolean;
}

const DeployQuizForm: React.FC<DeployQuizFormProps> = ({ quiz, courses, onDeploy, isLoading, isLoadingCourses = false }) => {
  const [selectedCourse, setSelectedCourse] = useState('');
  const [selectedModule, setSelectedModule] = useState('');
  const [operation, setOperation] = useState<'copy' | 'move'>('copy');

  // Find selected course with safety checks
  const selectedCourseData = courses?.find(c => c && c.slug === selectedCourse);
  
  // Reset module selection when course changes
  useEffect(() => {
    setSelectedModule('');
  }, [selectedCourse]);

  const handleDeploy = () => {
    if (selectedCourse && selectedModule !== '' && selectedCourseData?.modules?.length) {
      onDeploy(selectedCourse, parseInt(selectedModule), operation);
    }
  };

  return (
    <div className="space-y-4">
      {isLoadingCourses ? (
        <div className="flex items-center justify-center py-8">
          <Loader2 className="h-6 w-6 animate-spin mr-2" />
          <span className="text-sm text-gray-600">Loading courses...</span>
        </div>
      ) : (
        <>
          <div>
            <Label>Select Course</Label>
            <Select value={selectedCourse} onValueChange={setSelectedCourse}>
              <SelectTrigger>
                <SelectValue placeholder="Choose a course" />
              </SelectTrigger>
              <SelectContent>
                {courses && Array.isArray(courses) ? courses
                  .filter(course => course && course.slug && course.title)
                  .map((course) => (
                  <SelectItem key={course.slug} value={course.slug}>
                    {course.title}
                  </SelectItem>
                )) : (
                  <SelectItem value="" disabled>
                    No courses available
                  </SelectItem>
                )}
              </SelectContent>
            </Select>
          </div>

          {selectedCourseData && (
            <div>
              <Label>Select Module</Label>
              {selectedCourseData.modules && Array.isArray(selectedCourseData.modules) && selectedCourseData.modules.length > 0 ? (
                <Select value={selectedModule} onValueChange={setSelectedModule}>
                  <SelectTrigger>
                    <SelectValue placeholder="Choose a module" />
                  </SelectTrigger>
                  <SelectContent>
                    {selectedCourseData.modules.filter(module => module && module.title).map((module, index) => (
                      <SelectItem key={index} value={index.toString()}>
                        Module {index + 1}: {module.title}
                        {module.questions && Array.isArray(module.questions) && module.questions.length > 0 && (
                          <span className="text-xs text-amber-600 ml-2">
                            (Has existing quiz - will be replaced)
                          </span>
                        )}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              ) : (
                <div className="text-sm text-gray-500 italic">
                  No modules available in this course.
                </div>
              )}
            </div>
          )}

          <div>
            <Label>Operation</Label>
            <Select value={operation} onValueChange={(value: 'copy' | 'move') => setOperation(value)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="copy">
                  <div className="flex items-center gap-2">
                    <Copy className="h-4 w-4" />
                    Copy (keep in repository)
                  </div>
                </SelectItem>
                <SelectItem value="move">
                  <div className="flex items-center gap-2">
                    <Move className="h-4 w-4" />
                    Move (remove from repository)
                  </div>
                </SelectItem>
              </SelectContent>
            </Select>
          </div>

          {quiz.originCourse && (
            <Alert>
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                This quiz was originally from: {quiz.originCourse.title}
                {quiz.originModule !== undefined && ` - Module ${quiz.originModule + 1}`}
              </AlertDescription>
            </Alert>
          )}

          <div className="flex justify-end gap-2">
            <Button
              onClick={handleDeploy}
              disabled={!selectedCourse || selectedModule === '' || isLoading || !selectedCourseData?.modules?.length || !Array.isArray(selectedCourseData?.modules)}
            >
              {isLoading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              {operation === 'copy' ? 'Copy' : 'Move'} to Module
            </Button>
          </div>
        </>
      )}
    </div>
  );
};

export default QuizRepository;