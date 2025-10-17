import { DashboardLayout } from "@/components/layout/dashboard-layout";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { useToast } from "@/hooks/use-toast";
import { createDownloadLink } from "@/lib/cloudinary";
import { 
  GraduationCap, 
  Eye, 
  Edit, 
  CheckCircle, 
  Clock, 
  Search,
  Filter,
  FileText,
  AlertCircle,
  ChevronDown,
  Download,
  XCircle
} from "lucide-react";
import { formatDate } from "@/lib/utils";
import { Helmet } from "react-helmet-async";
import { useState, useEffect, useCallback } from "react";

interface StudentExamResult {
  studentId: string;
  studentName: string;
  courseSlug: string;
  courseName: string;
  hasFinalExam: boolean;
  finalExamType: 'mcq' | 'essay' | 'mixed' | null;
  examTitle: string;
  latestAttempt: {
    attemptNumber: number;
    score?: number;
    passed?: boolean;
    attemptedAt: string;
    requiresManualGrading: boolean;
    mcqTotal?: number;
    essayTotal?: number;
    answers: any[];
    gradedBy?: string;
    gradedAt?: string;
  } | null;
  allAttempts: Array<{
    attemptNumber: number;
    score?: number;
    passed?: boolean;
    attemptedAt: string;
    requiresManualGrading: boolean;
    gradedBy?: string;
    gradedAt?: string;
  }>;
  totalAttempts: number;
}

interface ExamSubmission {
  student: {
    name: string;
    id: string;
  };
  course: string;
  exam: {
    title: string;
    description?: string;
  };
  attempt: {
    attemptNumber: number;
    attemptedAt: string;
    score?: number;
    passed?: boolean;
    requiresManualGrading: boolean;
    gradedBy?: string;
    gradedAt?: string;
  };
  questionsAndAnswers: Array<{
    type: 'mcq' | 'essay';
    questionText?: string;
    choices?: string[];
    correctIndex?: number;
    studentAnswer: any;
    isCorrect?: boolean;
    questionDocument?: {
      title: string;
      url: string;
      fileName: string;
      type: string;
    };
    allowedAnswerFormats?: string[];
  }>;
}

export default function TeacherExamResults() {
  const [results, setResults] = useState<StudentExamResult[]>([]);
  const [filteredResults, setFilteredResults] = useState<StudentExamResult[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [courseFilter, setCourseFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [selectedSubmission, setSelectedSubmission] = useState<ExamSubmission | null>(null);
  const [showSubmissionDialog, setShowSubmissionDialog] = useState(false);
  const [showScoreDialog, setShowScoreDialog] = useState(false);
  const [selectedResult, setSelectedResult] = useState<StudentExamResult | null>(null);
  const [newScore, setNewScore] = useState('');
  const [newPassed, setNewPassed] = useState<boolean>(false);
  const [newFeedback, setNewFeedback] = useState('');
  const [showFeedbackDialog, setShowFeedbackDialog] = useState(false);
  const [editingFeedback, setEditingFeedback] = useState('');
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: examResults = [], isError } = useQuery<StudentExamResult[]>({
    queryKey: ['/api/teacher/exam-results'],
  });

  const filterResults = useCallback(() => {
    let filtered = [...results];

    // Search filter
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(
        result =>
          result.studentName.toLowerCase().includes(query) ||
          result.courseSlug.toLowerCase().includes(query) ||
          result.courseName.toLowerCase().includes(query)
      );
    }

    // Course filter
    if (courseFilter !== 'all') {
      filtered = filtered.filter(result => result.courseSlug === courseFilter);
    }

    // Status filter
    if (statusFilter !== 'all') {
      filtered = filtered.filter(result => {
        if (!result.latestAttempt) return statusFilter === 'no-exam';
        
        switch (statusFilter) {
          case 'pending':
            return result.latestAttempt.requiresManualGrading && !result.latestAttempt.gradedBy;
          case 'graded':
            return result.latestAttempt.gradedBy;
          case 'submitted':
            return !result.latestAttempt.requiresManualGrading;
          case 'no-exam':
            return false;
          default:
            return true;
        }
      });
    }

    setFilteredResults(filtered);
  }, [results, searchQuery, courseFilter, statusFilter]);

  useEffect(() => {
    if (examResults) {
      setResults(examResults);
      setIsLoading(false);
    }
  }, [examResults]);

  useEffect(() => {
    filterResults();
  }, [filterResults]);

  const viewSubmissionByAttempt = async (result: StudentExamResult, attemptNumber: number) => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(
        `/api/teacher/exam-results/${result.studentId}/${result.courseSlug}/${attemptNumber}`,
        {
          headers: token ? { Authorization: `Bearer ${token}` } : undefined,
        }
      );

      if (!response.ok) throw new Error('Failed to fetch submission details');

      const submission = await response.json();
      setSelectedSubmission(submission);
      setShowSubmissionDialog(true);
    } catch (error) {
      console.error('Error fetching submission:', error);
      toast({
        title: 'Error',
        description: 'Failed to fetch submission details',
        variant: 'destructive'
      });
    }
  };

  const openScoreDialog = (result: StudentExamResult) => {
    setSelectedResult(result);
    setNewScore(result.latestAttempt?.score?.toString() || '');
    setNewPassed(result.latestAttempt?.passed || false);
    setNewFeedback(result.latestAttempt?.feedback || '');
    setShowScoreDialog(true);
  };

  const updateScore = async () => {
    if (!selectedResult?.latestAttempt) return;

    try {
      const token = localStorage.getItem('token');
      const response = await fetch('/api/teacher/exam-results/update-score', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token && { Authorization: `Bearer ${token}` })
        },
        body: JSON.stringify({
          studentId: selectedResult.studentId,
          courseSlug: selectedResult.courseSlug,
          attemptNumber: selectedResult.latestAttempt.attemptNumber,
          score: parseInt(newScore),
          passed: newPassed,
          feedback: newFeedback
        })
      });

      if (!response.ok) throw new Error('Failed to update score');

      toast({
        title: 'Success',
        description: `Score updated successfully for Attempt #${selectedResult.latestAttempt.attemptNumber}`
      });

      setShowScoreDialog(false);
      // Refresh the data
      window.location.reload();
    } catch (error) {
      console.error('Error updating score:', error);
      toast({
        title: 'Error',
        description: 'Failed to update score',
        variant: 'destructive'
      });
    }
  };

  // Get unique courses for filter
  const uniqueCourses = Array.from(new Set(results.map(r => r.courseSlug)));

  const downloadAnswerFile = (answer: any) => {
    if (typeof answer === 'object' && answer.type === 'file' && answer.content) {
      createDownloadLink(answer.content, answer.fileName || 'answer-file');
    }
  };

  const openFeedbackDialog = (result: StudentExamResult) => {
    setSelectedResult(result);
    setEditingFeedback(result.latestAttempt?.feedback || '');
    setShowFeedbackDialog(true);
  };

  const saveFeedback = async () => {
    if (!selectedResult?.latestAttempt) return;

    try {
      const token = localStorage.getItem('token');
      const response = await fetch('/api/teacher/exam-results/update-feedback', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token && { Authorization: `Bearer ${token}` })
        },
        body: JSON.stringify({
          studentId: selectedResult.studentId,
          courseSlug: selectedResult.courseSlug,
          attemptNumber: selectedResult.latestAttempt.attemptNumber,
          feedback: editingFeedback.trim() || null
        })
      });

      if (!response.ok) {
        const errorData = await response.text();
        throw new Error(`Failed to update feedback: ${response.status} ${errorData}`);
      }

      toast({
        title: 'Success',
        description: editingFeedback.trim() ? 'Feedback updated successfully' : 'Feedback deleted successfully'
      });

      setShowFeedbackDialog(false);
      // Refresh the data without page reload
      await queryClient.invalidateQueries({ queryKey: ['/api/teacher/exam-results'] });
    } catch (error) {
      console.error('Error updating feedback:', error);
      toast({
        title: 'Error',
        description: 'Failed to update feedback',
        variant: 'destructive'
      });
    }
  };

  const deleteFeedback = async (result: StudentExamResult) => {
    if (!result.latestAttempt || !result.latestAttempt.feedback) return;

    if (!confirm('Are you sure you want to delete this feedback?')) return;

    try {
      const token = localStorage.getItem('token');
      const response = await fetch('/api/teacher/exam-results/update-feedback', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token && { Authorization: `Bearer ${token}` })
        },
        body: JSON.stringify({
          studentId: result.studentId,
          courseSlug: result.courseSlug,
          attemptNumber: result.latestAttempt.attemptNumber,
          feedback: null
        })
      });

      if (!response.ok) {
        const errorData = await response.text();
        throw new Error(`Failed to delete feedback: ${response.status} ${errorData}`);
      }

      toast({
        title: 'Success',
        description: 'Feedback deleted successfully'
      });

      // Refresh the data without page reload
      await queryClient.invalidateQueries({ queryKey: ['/api/teacher/exam-results'] });
    } catch (error) {
      console.error('Error deleting feedback:', error);
      toast({
        title: 'Error',
        description: 'Failed to delete feedback',
        variant: 'destructive'
      });
    }
  };

  if (isLoading) {
    return (
      <DashboardLayout>
        <div className="p-6">
          <div className="animate-pulse space-y-4">
            <div className="h-8 bg-gray-200 rounded w-1/4"></div>
            <div className="space-y-4">
              {[...Array(4)].map((_, i) => (
                <div key={i} className="h-32 bg-gray-200 rounded"></div>
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
          <h1 className="text-2xl font-bold text-gray-800 mb-4">Exam Grading</h1>
          <Card>
            <CardContent className="p-6">
              <p className="text-red-500">Error loading exam results. Please try again later.</p>
            </CardContent>
          </Card>
        </div>
      </DashboardLayout>
    );
  }
  return (
    <DashboardLayout>
      <Helmet>
        <title>Exam Grading | Teacher Portal</title>
        <meta name="description" content="Grade student exams for your assigned courses." />
      </Helmet>
      
      <div className="p-6 space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-800">Exam Grading</h1>
            <p className="text-gray-600 mt-1">Grade exams for students in your assigned courses</p>
          </div>
          <div className="text-sm text-gray-500 bg-gray-100 px-3 py-1 rounded-full">
            {filteredResults.length} results
          </div>
        </div>

        {/* Filters */}
        <Card>
          <CardContent className="p-4">
            <div className="flex flex-col md:flex-row gap-4">
              <div className="flex-1">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                  <Input
                    placeholder="Search students, courses..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-10"
                  />
                </div>
              </div>
              <div className="flex flex-col sm:flex-row gap-2">
                <Select value={courseFilter} onValueChange={setCourseFilter}>
                  <SelectTrigger className="w-full sm:w-[180px]">
                    <SelectValue placeholder="Filter by course" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Courses</SelectItem>
                    {uniqueCourses.map(course => (
                      <SelectItem key={course} value={course}>{course}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Select value={statusFilter} onValueChange={setStatusFilter}>
                  <SelectTrigger className="w-full sm:w-[180px]">
                    <SelectValue placeholder="Filter by status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Statuses</SelectItem>
                    <SelectItem value="pending">Pending Review</SelectItem>
                    <SelectItem value="graded">Graded</SelectItem>
                    <SelectItem value="submitted">Auto-graded</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Results Table */}
        {filteredResults.length > 0 ? (
          <Card>
            <CardHeader>
              <CardTitle>Student Exam Results ({filteredResults.length})</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Student</TableHead>
                      <TableHead>Course</TableHead>
                      <TableHead>Final Exam</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Score</TableHead>
                      <TableHead>Submitted</TableHead>
                      <TableHead>Feedback</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredResults.map((result) => (
                      <TableRow key={`${result.studentId}-${result.courseSlug}`}>
                        <TableCell>
                          <div className="font-medium">{result.studentName}</div>
                        </TableCell>
                        <TableCell>
                          <div>
                            <div className="font-medium">{result.courseName}</div>
                            <div className="text-sm text-gray-500">{result.courseSlug}</div>
                          </div>
                        </TableCell>
                        <TableCell>
                          {result.hasFinalExam ? (
                            <div>
                              <div className="font-medium">{result.examTitle}</div>
                              <Badge variant="outline" className="text-xs">
                                {result.finalExamType}
                              </Badge>
                            </div>
                          ) : (
                            <Badge variant="secondary">No Exam</Badge>
                          )}
                        </TableCell>
                        <TableCell>
                          {result.latestAttempt?.requiresManualGrading && !result.latestAttempt.gradedBy ? (
                            <Badge variant="outline" className="text-yellow-600">
                              <Clock className="h-3 w-3 mr-1" />
                              Pending Review
                            </Badge>
                          ) : result.latestAttempt?.gradedBy ? (
                            <Badge variant="outline" className="text-green-600">
                              <CheckCircle className="h-3 w-3 mr-1" />
                              Graded
                            </Badge>
                          ) : (
                            <Badge variant="outline" className="text-blue-600">
                              <CheckCircle className="h-3 w-3 mr-1" />
                              Auto-graded
                            </Badge>
                          )}
                        </TableCell>
                        <TableCell>
                          {result.latestAttempt?.score !== undefined ? (
                            <div className="flex items-center space-x-2">
                              <span className="font-medium">{result.latestAttempt.score}%</span>
                              <Badge variant={result.latestAttempt.passed ? 'default' : 'destructive'}>
                                {result.latestAttempt.passed ? 'Pass' : 'Fail'}
                              </Badge>
                            </div>
                          ) : (
                            <span className="text-gray-400">Not graded</span>
                          )}
                        </TableCell>
                        <TableCell>
                          {result.latestAttempt ? (
                            <div className="text-sm text-gray-600">
                              {formatDate(result.latestAttempt.attemptedAt)}
                            </div>
                          ) : (
                            <span className="text-gray-400">No attempts</span>
                          )}
                        </TableCell>
                        <TableCell>
                          {result.latestAttempt?.feedback ? (
                            <div className="max-w-xs group">
                              <div className="flex items-center space-x-2">
                                <p className="text-xs text-gray-600 truncate flex-1" title={result.latestAttempt.feedback}>
                                  {result.latestAttempt.feedback}
                                </p>
                                <div className="opacity-0 group-hover:opacity-100 transition-opacity flex space-x-1">
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => openFeedbackDialog(result)}
                                    className="h-6 w-6 p-0"
                                    title="Edit feedback"
                                  >
                                    <Edit className="h-3 w-3" />
                                  </Button>
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => deleteFeedback(result)}
                                    className="h-6 w-6 p-0 text-red-500 hover:text-red-700"
                                    title="Delete feedback"
                                  >
                                    <XCircle className="h-3 w-3" />
                                  </Button>
                                </div>
                              </div>
                            </div>
                          ) : (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => openFeedbackDialog(result)}
                              className="text-xs text-gray-400 hover:text-blue-600 p-1 h-auto"
                            >
                              <Edit className="h-3 w-3 mr-1" />
                              Add feedback
                            </Button>
                          )}
                        </TableCell>
                        <TableCell>
                          <div className="flex space-x-2">
                            {result.latestAttempt && (
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => viewSubmissionByAttempt(result, result.latestAttempt!.attemptNumber)}
                                title="View Latest Submission"
                              >
                                <Eye className="h-4 w-4" />
                              </Button>
                            )}
                            {result.latestAttempt && (
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => openScoreDialog(result)}
                                title={result.latestAttempt.gradedBy ? 'Re-grade Exam' : 'Grade Exam'}
                                className="text-blue-600 hover:text-blue-800"
                              >
                                <Edit className="h-4 w-4" />
                              </Button>
                            )}
                            {result.totalAttempts > 0 && (
                              <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    title="View All Attempts"
                                  >
                                    <Edit className="h-4 w-4" />
                                    <ChevronDown className="h-3 w-3 ml-1" />
                                  </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="end">
                                  {result.allAttempts.map((attempt) => (
                                    <DropdownMenuItem
                                      key={attempt.attemptNumber}
                                      onClick={() => viewSubmissionByAttempt(result, attempt.attemptNumber)}
                                    >
                                      <Eye className="h-4 w-4 mr-2" />
                                      View Attempt #{attempt.attemptNumber}
                                      {attempt.score !== undefined && (
                                        <span className="ml-auto text-xs">({attempt.score}%)</span>
                                      )}
                                    </DropdownMenuItem>
                                  ))}
                                  {result.latestAttempt && (
                                    <>
                                      <DropdownMenuItem className="border-t mt-1 pt-1">
                                        <span className="text-xs text-gray-500 font-medium">GRADING</span>
                                      </DropdownMenuItem>
                                      <DropdownMenuItem
                                        onClick={() => openScoreDialog(result)}
                                      >
                                        <Edit className="h-4 w-4 mr-2" />
                                        {result.latestAttempt.gradedBy ? 'Re-grade' : 'Grade'} Latest Attempt
                                      </DropdownMenuItem>
                                    </>
                                  )}
                                </DropdownMenuContent>
                              </DropdownMenu>
                            )}
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        ) : (
          <Card>
            <CardContent className="text-center py-12">
              <GraduationCap className="h-12 w-12 mx-auto text-gray-300 mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">
                {results.length === 0 ? 'No Exam Results' : 'No Results Match Filters'}
              </h3>
              <p className="text-gray-600">
                {results.length === 0 
                  ? 'No students have taken exams in your assigned courses yet.'
                  : 'Try adjusting your search or filter criteria.'}
              </p>
            </CardContent>
          </Card>
        )}

        {/* Submission View Dialog */}
        <Dialog open={showSubmissionDialog} onOpenChange={setShowSubmissionDialog}>
          <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Exam Submission Details</DialogTitle>
            </DialogHeader>
            
            {selectedSubmission && (
              <div className="space-y-6">
                <div className="grid grid-cols-2 gap-4 p-4 bg-gray-50 rounded-lg">
                  <div>
                    <div className="text-sm text-gray-500">Student</div>
                    <div className="font-medium">{selectedSubmission.student.name}</div>
                  </div>
                  <div>
                    <div className="text-sm text-gray-500">Course</div>
                    <div className="font-medium">{selectedSubmission.course}</div>
                  </div>
                  <div>
                    <div className="text-sm text-gray-500">Submitted</div>
                    <div className="font-medium">
                      {new Date(selectedSubmission.attempt.attemptedAt).toLocaleString()}
                    </div>
                  </div>
                  <div>
                    <div className="text-sm text-gray-500">Attempt</div>
                    <div className="font-medium">#{selectedSubmission.attempt.attemptNumber}</div>
                  </div>
                </div>

                <div className="space-y-4">
                  <h3 className="text-lg font-semibold">Questions & Answers</h3>
                  {selectedSubmission.questionsAndAnswers.map((qa, index) => (
                    <div key={index} className="border rounded-lg p-4">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-sm font-medium text-gray-500">Question {index + 1}</span>
                        <Badge variant={qa.type === 'essay' ? 'secondary' : 'outline'}>
                          {qa.type.toUpperCase()}
                        </Badge>
                      </div>
                      
                      {qa.type === 'mcq' ? (
                        <div className="space-y-2">
                          <p className="font-medium">{qa.questionText}</p>
                          <div className="space-y-1">
                            {qa.choices?.map((choice, choiceIndex) => (
                              <div 
                                key={choiceIndex} 
                                className={`p-2 rounded text-sm ${
                                  qa.studentAnswer === choiceIndex
                                    ? qa.isCorrect
                                      ? 'bg-green-100 border border-green-300'
                                      : 'bg-red-100 border border-red-300'
                                    : choiceIndex === qa.correctIndex
                                      ? 'bg-blue-100 border border-blue-300'
                                      : 'bg-gray-50'
                                }`}
                              >
                                <div className="flex items-center space-x-2">
                                  <span className="font-medium">{String.fromCharCode(65 + choiceIndex)}:</span>
                                  <span>{choice}</span>
                                  {qa.studentAnswer === choiceIndex && (
                                    <Badge variant={qa.isCorrect ? 'default' : 'destructive'} className="ml-auto">
                                      Student Answer {qa.isCorrect ? '✓' : '✗'}
                                    </Badge>
                                  )}
                                  {choiceIndex === qa.correctIndex && qa.studentAnswer !== choiceIndex && (
                                    <Badge variant="outline" className="ml-auto">
                                      Correct Answer
                                    </Badge>
                                  )}
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      ) : (
                        <div className="space-y-4">
                          {qa.questionDocument && (
                            <div className="p-4 bg-blue-50 rounded-lg border border-blue-200">
                              <div className="flex items-center justify-between">
                                <div className="flex items-center">
                                  <FileText className="h-4 w-4 mr-2 text-blue-600" />
                                  <span className="font-medium">Question Document</span>
                                </div>
                                <a
                                  href={qa.questionDocument.url}
                                  download={qa.questionDocument.fileName}
                                  className="text-blue-600 hover:text-blue-800 underline text-sm"
                                >
                                  <Download className="h-4 w-4 mr-1 inline" />
                                  Download
                                </a>
                              </div>
                              <div className="text-sm text-gray-600 mt-1">
                                {qa.questionDocument.fileName}
                              </div>
                              {qa.questionDocument.title && (
                                <div className="text-sm text-gray-700 mt-2">
                                  {qa.questionDocument.title}
                                </div>
                              )}
                            </div>
                          )}
                          
                          <div className="p-4 bg-gray-50 rounded-lg">
                            <div className="flex items-center justify-between mb-2">
                              <span className="font-medium">Student Answer</span>
                              {typeof qa.studentAnswer === 'object' && qa.studentAnswer.type === 'file' && (
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => downloadAnswerFile(qa.studentAnswer)}
                                >
                                  <Download className="h-4 w-4 mr-1" />
                                  Download Answer
                                </Button>
                              )}
                            </div>
                            
                            {typeof qa.studentAnswer === 'object' && qa.studentAnswer.type === 'file' ? (
                              <div className="text-sm text-gray-600">
                                File: {qa.studentAnswer.fileName}
                              </div>
                            ) : typeof qa.studentAnswer === 'object' && qa.studentAnswer.type === 'text' ? (
                              <div className="text-sm">
                                {qa.studentAnswer.content || 'No text answer provided'}
                              </div>
                            ) : typeof qa.studentAnswer === 'string' ? (
                              <div className="text-sm whitespace-pre-wrap">
                                {qa.studentAnswer}
                              </div>
                            ) : (
                              <div className="text-sm text-gray-500">No answer provided</div>
                            )}
                          </div>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </DialogContent>
        </Dialog>

        {/* Score Update Dialog */}
        <Dialog open={showScoreDialog} onOpenChange={setShowScoreDialog}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>
                Grade Exam - Attempt #{selectedResult?.latestAttempt?.attemptNumber}
              </DialogTitle>
            </DialogHeader>
            
            {selectedResult && (
              <div className="space-y-4">
                <div className="p-4 bg-gray-50 rounded-lg">
                  <div className="text-sm text-gray-500">Student</div>
                  <div className="font-medium">{selectedResult.studentName}</div>
                  <div className="text-sm text-gray-500 mt-2">Course</div>
                  <div className="font-medium">{selectedResult.courseSlug}</div>
                </div>

                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium mb-2">Final Score (%)</label>
                    <Input
                      type="number"
                      min="0"
                      max="100"
                      value={newScore}
                      onChange={(e) => setNewScore(e.target.value)}
                      placeholder="Enter score (0-100)"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium mb-2">Feedback (Optional)</label>
                    <textarea
                      className="w-full p-3 border border-gray-300 rounded-md resize-none focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      rows={4}
                      maxLength={2000}
                      value={newFeedback}
                      onChange={(e) => setNewFeedback(e.target.value)}
                      placeholder="Provide feedback for the student (max 2000 characters)"
                    />
                    <div className="text-xs text-gray-500 mt-1">
                      {newFeedback.length}/2000 characters
                    </div>
                  </div>

                  <div className="flex items-center space-x-2">
                    <input
                      type="checkbox"
                      id="passed"
                      checked={newPassed}
                      onChange={(e) => setNewPassed(e.target.checked)}
                      className="rounded"
                    />
                    <label htmlFor="passed" className="text-sm font-medium">
                      Student passed the exam
                    </label>
                  </div>

                  <div className="flex justify-end space-x-2 pt-4">
                    <Button 
                      variant="outline" 
                      onClick={() => setShowScoreDialog(false)}
                    >
                      Cancel
                    </Button>
                    <Button 
                      onClick={updateScore}
                      disabled={!newScore || isNaN(parseInt(newScore))}
                    >
                      Update Score
                    </Button>
                  </div>
                </div>
              </div>
            )}
          </DialogContent>
        </Dialog>

        {/* Feedback Edit Dialog */}
        <Dialog open={showFeedbackDialog} onOpenChange={setShowFeedbackDialog}>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Edit Feedback</DialogTitle>
            </DialogHeader>
            
            {selectedResult && (
              <div className="space-y-4">
                <div className="p-4 bg-gray-50 rounded-lg">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <div className="text-sm text-gray-500">Student</div>
                      <div className="font-medium">{selectedResult.studentName}</div>
                    </div>
                    <div>
                      <div className="text-sm text-gray-500">Course</div>
                      <div className="font-medium">{selectedResult.courseSlug}</div>
                    </div>
                  </div>
                  <div className="mt-2">
                    <div className="text-sm text-gray-500">Latest Attempt</div>
                    <div className="font-medium">
                      #{selectedResult.latestAttempt?.attemptNumber} - {selectedResult.latestAttempt?.score}%
                      {selectedResult.latestAttempt?.passed ? ' (Passed)' : ' (Failed)'}
                    </div>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium mb-2">
                    Feedback for Student
                    <span className="text-gray-500 text-xs ml-1">(Optional)</span>
                  </label>
                  <textarea
                    className="w-full p-3 border border-gray-300 rounded-md resize-none focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    rows={6}
                    maxLength={2000}
                    value={editingFeedback}
                    onChange={(e) => setEditingFeedback(e.target.value)}
                    placeholder="Provide detailed feedback about the student's performance, areas for improvement, or commendation for good work..."
                  />
                  <div className="flex items-center justify-between mt-1">
                    <div className="text-xs text-gray-500">
                      {editingFeedback.length}/2000 characters
                    </div>
                    {selectedResult.latestAttempt?.feedback && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setEditingFeedback('')}
                        className="text-xs"
                      >
                        Clear
                      </Button>
                    )}
                  </div>
                </div>

                <div className="flex justify-between pt-4">
                  <div>
                    {selectedResult.latestAttempt?.feedback && (
                      <Button 
                        variant="destructive"
                        size="sm"
                        onClick={() => {
                          if (confirm('Are you sure you want to delete this feedback?')) {
                            deleteFeedback(selectedResult);
                            setShowFeedbackDialog(false);
                          }
                        }}
                      >
                        Delete Feedback
                      </Button>
                    )}
                  </div>
                  <div className="space-x-2">
                    <Button 
                      variant="outline" 
                      onClick={() => setShowFeedbackDialog(false)}
                    >
                      Cancel
                    </Button>
                    <Button 
                      onClick={saveFeedback}
                      disabled={editingFeedback.length > 2000}
                    >
                      {selectedResult.latestAttempt?.feedback ? 'Update Feedback' : 'Add Feedback'}
                    </Button>
                  </div>
                </div>
              </div>
            )}
          </DialogContent>
        </Dialog>
      </div>
    </DashboardLayout>
  );
}