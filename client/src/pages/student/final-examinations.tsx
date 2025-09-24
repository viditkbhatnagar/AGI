import { useState, useEffect } from 'react';
import { DashboardLayout } from "@/components/layout/dashboard-layout";
import { Helmet } from "react-helmet-async";
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { useToast } from '@/hooks/use-toast';
import { useLocation } from 'wouter';
import { 
  GraduationCap, 
  Eye, 
  Clock, 
  CheckCircle,
  XCircle,
  FileText,
  Search,
  Calendar,
  Trophy,
  AlertTriangle
} from 'lucide-react';
import { formatDate } from '@/lib/utils';

interface FinalExam {
  courseSlug: string;
  courseName: string;
  examTitle: string;
  hasFinalExam: boolean;
  finalExamType: 'mcq' | 'essay' | 'mixed' | null;
  attempts: Array<{
    attemptNumber: number;
    score?: number;
    passed?: boolean;
    attemptedAt: string;
    requiresManualGrading: boolean;
    gradedBy?: string;
    gradedAt?: string;
    feedback?: string;
  }>;
  totalAttempts: number;
  maxAttempts: number;
  passingScore: number;
  canAttempt: boolean;
  enrollmentValid: boolean;
}

interface AttemptDetail {
  attemptNumber: number;
  score?: number;
  passed?: boolean;
  attemptedAt: string;
  requiresManualGrading: boolean;
  gradedBy?: string;
  gradedAt?: string;
  feedback?: string;
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
  }>;
}

export default function StudentFinalExaminations() {
  const [exams, setExams] = useState<FinalExam[]>([]);
  const [filteredExams, setFilteredExams] = useState<FinalExam[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedAttempt, setSelectedAttempt] = useState<AttemptDetail | null>(null);
  const [showAttemptDialog, setShowAttemptDialog] = useState(false);
  const [, setLocation] = useLocation();
  const { toast } = useToast();

  useEffect(() => {
    fetchFinalExams();
  }, []);

  useEffect(() => {
    filterExams();
  }, [exams, searchQuery]);

  const fetchFinalExams = async () => {
    try {
      setIsLoading(true);
      const token = localStorage.getItem('token');
      const response = await fetch('/api/student/final-examinations', {
        headers: token ? { Authorization: `Bearer ${token}` } : undefined,
      });

      if (!response.ok) throw new Error('Failed to fetch final examinations');

      const data = await response.json();
      setExams(data);
    } catch (error) {
      console.error('Error fetching final examinations:', error);
      toast({
        title: 'Error',
        description: 'Failed to fetch final examinations',
        variant: 'destructive'
      });
    } finally {
      setIsLoading(false);
    }
  };

  const filterExams = () => {
    let filtered = [...exams];

    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(exam =>
        exam.courseName.toLowerCase().includes(query) ||
        exam.courseSlug.toLowerCase().includes(query) ||
        exam.examTitle.toLowerCase().includes(query)
      );
    }

    setFilteredExams(filtered);
  };

  const viewAttempt = async (exam: FinalExam, attemptNumber: number) => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(
        `/api/student/final-exam/${exam.courseSlug}/attempt/${attemptNumber}`,
        {
          headers: token ? { Authorization: `Bearer ${token}` } : undefined,
        }
      );

      if (!response.ok) throw new Error('Failed to fetch attempt details');

      const attemptData = await response.json();
      setSelectedAttempt(attemptData);
      setShowAttemptDialog(true);
    } catch (error) {
      console.error('Error fetching attempt:', error);
      toast({
        title: 'Error',
        description: 'Failed to fetch attempt details',
        variant: 'destructive'
      });
    }
  };

  const takeExam = (courseSlug: string) => {
    setLocation(`/student/courses/${courseSlug}?showFinalExam=true`);
  };

  const getExamStatusBadge = (exam: FinalExam) => {
    if (!exam.hasFinalExam) {
      return <Badge variant="secondary">No Exam</Badge>;
    }

    if (exam.totalAttempts === 0) {
      return <Badge variant="outline" className="text-blue-600">Not Attempted</Badge>;
    }

    const latestAttempt = exam.attempts[0]; // Assuming attempts are sorted by latest first
    
    if (latestAttempt.requiresManualGrading && !latestAttempt.gradedBy) {
      return (
        <Badge variant="outline" className="text-yellow-600">
          <Clock className="h-3 w-3 mr-1" />
          Under Review
        </Badge>
      );
    }

    if (latestAttempt.passed === true) {
      return (
        <Badge variant="outline" className="text-green-600">
          <CheckCircle className="h-3 w-3 mr-1" />
          Passed
        </Badge>
      );
    } else if (latestAttempt.passed === false) {
      return (
        <Badge variant="outline" className="text-red-600">
          <XCircle className="h-3 w-3 mr-1" />
          Failed
        </Badge>
      );
    }

    return (
      <Badge variant="outline" className="text-gray-600">
        <Clock className="h-3 w-3 mr-1" />
        Pending
      </Badge>
    );
  };

  const getScoreDisplay = (exam: FinalExam) => {
    if (exam.totalAttempts === 0) {
      return <span className="text-gray-400">-</span>;
    }

    const latestAttempt = exam.attempts[0];
    if (latestAttempt.score !== undefined) {
      return (
        <div className="text-center">
          <div className={`font-medium ${latestAttempt.passed ? 'text-green-600' : 'text-red-600'}`}>
            {latestAttempt.score}%
          </div>
          {exam.attempts.length > 1 && (
            <div className="text-xs text-gray-500">
              Best: {Math.max(...exam.attempts.map(a => a.score || 0))}%
            </div>
          )}
        </div>
      );
    }

    return <span className="text-gray-400">Pending</span>;
  };

  if (isLoading) {
    return (
      <DashboardLayout>
        <Helmet>
          <title>Final Examinations | Student Portal</title>
        </Helmet>
        <div className="p-6">
          <div className="animate-pulse space-y-4">
            <div className="h-8 bg-gray-200 rounded w-1/4"></div>
            <div className="h-64 bg-gray-200 rounded"></div>
          </div>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <Helmet>
        <title>Final Examinations | Student Portal</title>
        <meta name="description" content="View and attempt your final examinations." />
      </Helmet>
      
      <div className="p-6 space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-800">Final Examinations</h1>
            <p className="text-gray-600 mt-1">View your exam attempts, grades, and feedback</p>
          </div>
          <div className="text-sm text-gray-500 bg-gray-100 px-3 py-1 rounded-full">
            {filteredExams.length} course{filteredExams.length !== 1 ? 's' : ''}
          </div>
        </div>

        {/* Search */}
        <Card>
          <CardContent className="p-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
              <Input
                placeholder="Search courses or exams..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>
          </CardContent>
        </Card>

        {/* Exams Table */}
        {filteredExams.length > 0 ? (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <GraduationCap className="h-5 w-5 mr-2" />
                Your Final Examinations ({filteredExams.length})
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Course</TableHead>
                      <TableHead>Exam</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Score</TableHead>
                      <TableHead>Attempts</TableHead>
                      <TableHead>Last Attempt</TableHead>
                      <TableHead>Feedback</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredExams.map((exam) => (
                      <TableRow key={exam.courseSlug}>
                        <TableCell>
                          <div>
                            <div className="font-medium">{exam.courseName}</div>
                            <div className="text-sm text-gray-500">{exam.courseSlug}</div>
                          </div>
                        </TableCell>
                        <TableCell>
                          {exam.hasFinalExam ? (
                            <div>
                              <div className="font-medium">{exam.examTitle}</div>
                              <Badge variant="outline" className="text-xs mt-1">
                                {exam.finalExamType === 'mcq' ? 'Multiple Choice' :
                                 exam.finalExamType === 'essay' ? 'Essay' : 'Mixed'}
                              </Badge>
                            </div>
                          ) : (
                            <Badge variant="secondary">No Final Exam</Badge>
                          )}
                        </TableCell>
                        <TableCell>
                          {getExamStatusBadge(exam)}
                        </TableCell>
                        <TableCell>
                          {getScoreDisplay(exam)}
                        </TableCell>
                        <TableCell>
                          <div className="text-center">
                            <div className="font-medium">
                              {exam.totalAttempts}/{exam.maxAttempts}
                            </div>
                            <div className="text-xs text-gray-500">attempts</div>
                          </div>
                        </TableCell>
                        <TableCell>
                          {exam.totalAttempts > 0 ? (
                            <div className="text-sm text-gray-600">
                              <div>{formatDate(exam.attempts[0].attemptedAt)}</div>
                              {exam.attempts[0].feedback && (
                                <div className="text-xs text-blue-600 mt-1">Has feedback</div>
                              )}
                            </div>
                          ) : (
                            <span className="text-gray-400">-</span>
                          )}
                        </TableCell>
                        <TableCell>
                          {exam.totalAttempts > 0 && exam.attempts[0].feedback ? (
                            <div className="max-w-xs">
                              <div className="text-xs text-gray-600 truncate" title={exam.attempts[0].feedback}>
                                {exam.attempts[0].feedback}
                              </div>
                            </div>
                          ) : (
                            <span className="text-xs text-gray-400">No feedback</span>
                          )}
                        </TableCell>
                        <TableCell>
                          <div className="flex space-x-2">
                            {exam.hasFinalExam && exam.canAttempt && (
                              <Button
                                size="sm"
                                onClick={() => takeExam(exam.courseSlug)}
                                className="bg-blue-600 hover:bg-blue-700"
                              >
                                {exam.totalAttempts === 0 ? 'Take Exam' : 'Retake'}
                              </Button>
                            )}
                            {exam.totalAttempts > 0 && (
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => viewAttempt(exam, exam.attempts[0].attemptNumber)}
                                title="View Latest Attempt"
                              >
                                <Eye className="h-4 w-4" />
                              </Button>
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
                {exams.length === 0 ? 'No Final Examinations' : 'No Exams Match Search'}
              </h3>
              <p className="text-gray-600">
                {exams.length === 0 
                  ? 'You don\'t have any final examinations available yet.'
                  : 'Try adjusting your search criteria.'}
              </p>
            </CardContent>
          </Card>
        )}

        {/* Attempt Details Dialog */}
        <Dialog open={showAttemptDialog} onOpenChange={setShowAttemptDialog}>
          <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Exam Attempt Details</DialogTitle>
            </DialogHeader>
            
            {selectedAttempt && (
              <div className="space-y-6">
                <div className="grid grid-cols-2 gap-4 p-4 bg-gray-50 rounded-lg">
                  <div>
                    <div className="text-sm text-gray-500">Attempt Number</div>
                    <div className="font-medium">#{selectedAttempt.attemptNumber}</div>
                  </div>
                  <div>
                    <div className="text-sm text-gray-500">Submitted</div>
                    <div className="font-medium">
                      {formatDate(selectedAttempt.attemptedAt)}
                    </div>
                  </div>
                  <div>
                    <div className="text-sm text-gray-500">Score</div>
                    <div className="font-medium">
                      {selectedAttempt.score !== undefined ? (
                        <span className={selectedAttempt.passed ? 'text-green-600' : 'text-red-600'}>
                          {selectedAttempt.score}% ({selectedAttempt.passed ? 'Passed' : 'Failed'})
                        </span>
                      ) : (
                        <span className="text-gray-500">Pending</span>
                      )}
                    </div>
                  </div>
                  <div>
                    <div className="text-sm text-gray-500">Graded By</div>
                    <div className="font-medium">
                      {selectedAttempt.gradedBy || 'Auto-graded'}
                    </div>
                  </div>
                </div>

                {/* Feedback Section */}
                {selectedAttempt.feedback && (
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-base flex items-center">
                        <FileText className="h-4 w-4 mr-2" />
                        Teacher Feedback
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="p-4 bg-blue-50 rounded-lg">
                        <p className="text-gray-800 whitespace-pre-wrap">{selectedAttempt.feedback}</p>
                      </div>
                    </CardContent>
                  </Card>
                )}

                {/* Questions and Answers */}
                <div className="space-y-4">
                  <h3 className="text-lg font-semibold">Your Answers</h3>
                  {selectedAttempt.questionsAndAnswers.map((qa, index) => (
                    <Card key={index}>
                      <CardHeader>
                        <CardTitle className="text-base">
                          Question {index + 1}
                          <Badge className="ml-2" variant={qa.type === 'mcq' ? 'default' : 'secondary'}>
                            {qa.type === 'mcq' ? 'Multiple Choice' : 'Essay'}
                          </Badge>
                        </CardTitle>
                      </CardHeader>
                      <CardContent className="space-y-4">
                        {qa.type === 'mcq' ? (
                          <div>
                            <div className="font-medium mb-2">{qa.questionText}</div>
                            <div className="space-y-2">
                              {qa.choices?.map((choice, idx) => (
                                <div 
                                  key={idx}
                                  className={`p-2 rounded border ${
                                    idx === qa.correctIndex ? 'bg-green-50 border-green-200' :
                                    idx === qa.studentAnswer ? 'bg-red-50 border-red-200' :
                                    'bg-gray-50 border-gray-200'
                                  }`}
                                >
                                  <div className="flex items-center space-x-2">
                                    <span className="font-medium">{String.fromCharCode(65 + idx)}.</span>
                                    <span>{choice}</span>
                                    {idx === qa.correctIndex && <Badge className="text-xs bg-green-600">Correct Answer</Badge>}
                                    {idx === qa.studentAnswer && idx !== qa.correctIndex && (
                                      <Badge className="text-xs bg-red-600">Your Answer</Badge>
                                    )}
                                    {idx === qa.studentAnswer && idx === qa.correctIndex && (
                                      <Badge className="text-xs bg-green-600">Your Answer (Correct!)</Badge>
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
                                <div className="flex items-center">
                                  <FileText className="h-4 w-4 mr-2 text-blue-600" />
                                  <span className="font-medium">Question Document</span>
                                </div>
                                <div className="text-sm text-gray-600 mt-1">
                                  {qa.questionDocument.fileName}
                                </div>
                              </div>
                            )}
                            
                            <div className="p-4 bg-gray-50 rounded-lg">
                              <div className="font-medium mb-2">Your Answer:</div>
                              {typeof qa.studentAnswer === 'object' && qa.studentAnswer.type === 'file' ? (
                                <div className="text-sm text-gray-600">
                                  📎 File: {qa.studentAnswer.fileName}
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
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </div>
            )}
          </DialogContent>
        </Dialog>
      </div>
    </DashboardLayout>
  );
}
