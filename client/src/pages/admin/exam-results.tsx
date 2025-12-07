import { useState, useEffect } from 'react';
import { AdminLayout } from "@/components/admin/layout/admin-layout";
import { Helmet } from "react-helmet-async";
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Checkbox } from '@/components/ui/checkbox';
import { useToast } from '@/hooks/use-toast';
import { createDownloadLink } from '@/lib/cloudinary';
import { useConditionalRender } from '@/lib/permissions-provider';
import {
  Eye,
  Download,
  Filter,
  Search,
  FileText,
  CheckCircle,
  XCircle,
  Clock,
  Edit,
  ChevronDown
} from 'lucide-react';

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
    mcqCorrect?: number;
    mcqTotal?: number;
    essayTotal?: number;
    answers: any[];
    gradedBy?: string;
    gradedAt?: string;
  } | null;
  certificateIssuance?: {
    online: boolean;
    offline: boolean;
    updatedAt?: string;
    updatedBy?: string;
  };
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

// Certificate Issuance Cell Component
interface CertificateIssuanceCellProps {
  result: StudentExamResult;
  onUpdate: () => void;
}

const CertificateIssuanceCell = ({ result, onUpdate }: CertificateIssuanceCellProps) => {
  const { toast } = useToast();
  const [isUpdating, setIsUpdating] = useState(false);

  const updateCertificateIssuance = async (online: boolean, offline: boolean) => {
    setIsUpdating(true);
    try {
      const token = localStorage.getItem('token');
      const response = await fetch('/api/admin/certificate-issuance', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token && { Authorization: `Bearer ${token}` })
        },
        body: JSON.stringify({
          studentId: result.studentId,
          courseSlug: result.courseSlug,
          online,
          offline
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to update certificate issuance');
      }

      toast({
        title: "Success",
        description: "Certificate issuance status updated successfully",
      });

      onUpdate();
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to update certificate issuance status",
        variant: "destructive",
      });
    } finally {
      setIsUpdating(false);
    }
  };

  const handleOnlineChange = (checked: boolean) => {
    updateCertificateIssuance(checked, result.certificateIssuance?.offline || false);
  };

  const handleOfflineChange = (checked: boolean) => {
    updateCertificateIssuance(result.certificateIssuance?.online || false, checked);
  };

  return (
    <div className="space-y-2">
      <div className="flex items-center space-x-2">
        <Checkbox
          id={`online-${result.studentId}-${result.courseSlug}`}
          checked={result.certificateIssuance?.online || false}
          onCheckedChange={handleOnlineChange}
          disabled={isUpdating}
        />
        <label
          htmlFor={`online-${result.studentId}-${result.courseSlug}`}
          className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
        >
          Online
        </label>
      </div>
      <div className="flex items-center space-x-2">
        <Checkbox
          id={`offline-${result.studentId}-${result.courseSlug}`}
          checked={result.certificateIssuance?.offline || false}
          onCheckedChange={handleOfflineChange}
          disabled={isUpdating}
        />
        <label
          htmlFor={`offline-${result.studentId}-${result.courseSlug}`}
          className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
        >
          Offline
        </label>
      </div>
      {result.certificateIssuance?.updatedAt && (
        <div className="text-xs text-gray-500">
          Updated: {new Date(result.certificateIssuance.updatedAt).toLocaleDateString()}
          {result.certificateIssuance.updatedBy && (
            <div>By: {result.certificateIssuance.updatedBy}</div>
          )}
        </div>
      )}
    </div>
  );
};

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

export default function ExamResults() {
  const { renderIfCanEdit } = useConditionalRender();
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
  const { toast } = useToast();

  useEffect(() => {
    fetchExamResults();
  }, []);

  useEffect(() => {
    filterResults();
  }, [results, searchQuery, courseFilter, statusFilter]);

  const fetchExamResults = async () => {
    try {
      setIsLoading(true);
      const token = localStorage.getItem('token');
      const response = await fetch('/api/admin/exam-results', {
        headers: token ? { Authorization: `Bearer ${token}` } : undefined,
      });

      if (!response.ok) throw new Error('Failed to fetch exam results');

      const data = await response.json();
      setResults(data);
    } catch (error) {
      console.error('Error fetching exam results:', error);
      toast({
        title: 'Error',
        description: 'Failed to fetch exam results',
        variant: 'destructive'
      });
    } finally {
      setIsLoading(false);
    }
  };

  const filterResults = () => {
    let filtered = results;

    // Search filter
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(result =>
        result.studentName.toLowerCase().includes(query) ||
        result.courseSlug.toLowerCase().includes(query) ||
        result.examTitle?.toLowerCase().includes(query)
      );
    }

    // Course filter
    if (courseFilter !== 'all') {
      filtered = filtered.filter(result => result.courseSlug === courseFilter);
    }

    // Status filter
    if (statusFilter !== 'all') {
      filtered = filtered.filter(result => {
        if (statusFilter === 'submitted') {
          return result.latestAttempt !== null;
        } else if (statusFilter === 'pending') {
          return result.latestAttempt?.requiresManualGrading && !result.latestAttempt.gradedBy;
        } else if (statusFilter === 'graded') {
          return result.latestAttempt?.gradedBy;
        } else if (statusFilter === 'no-exam') {
          return !result.hasFinalExam;
        }
        return true;
      });
    }

    setFilteredResults(filtered);
  };

  const viewSubmission = async (result: StudentExamResult) => {
    if (!result.latestAttempt) return;
    await viewSubmissionByAttempt(result, result.latestAttempt.attemptNumber);
  };

  const viewSubmissionByAttempt = async (result: StudentExamResult, attemptNumber: number) => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(
        `/api/admin/exam-results/${result.studentId}/${result.courseSlug}/${attemptNumber}`,
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

  const updateScore = async () => {
    if (!selectedResult?.latestAttempt) return;

    try {
      const token = localStorage.getItem('token');
      const response = await fetch('/api/admin/exam-results/update-score', {
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
          passed: newPassed
        })
      });

      if (!response.ok) throw new Error('Failed to update score');

      toast({
        title: 'Success',
        description: `Score updated successfully for Attempt #${selectedResult.latestAttempt.attemptNumber}`
      });

      setShowScoreDialog(false);
      setSelectedResult(null);
      setNewScore('');
      setNewPassed(false);
      fetchExamResults(); // Refresh data
    } catch (error) {
      console.error('Error updating score:', error);
      toast({
        title: 'Error',
        description: 'Failed to update score',
        variant: 'destructive'
      });
    }
  };

  const openScoreDialog = (result: StudentExamResult) => {
    if (!result.latestAttempt) return;
    openScoreDialogForAttempt(result, result.latestAttempt.attemptNumber);
  };

  const openScoreDialogForAttempt = (result: StudentExamResult, attemptNumber: number) => {
    const attempt = result.allAttempts.find(a => a.attemptNumber === attemptNumber);
    if (!attempt) return;

    setSelectedResult({
      ...result,
      latestAttempt: {
        ...result.latestAttempt!,
        attemptNumber: attemptNumber,
        score: attempt.score,
        passed: attempt.passed,
        requiresManualGrading: attempt.requiresManualGrading,
        gradedBy: attempt.gradedBy,
        gradedAt: attempt.gradedAt
      }
    });
    setNewScore(attempt.score?.toString() || '');
    setNewPassed(attempt.passed || false);
    setShowScoreDialog(true);
  };

  const getUniqueCourseSlugs = () => {
    return [...new Set(results.map(r => r.courseSlug))];
  };

  const downloadAnswerFile = (answer: any) => {
    if (typeof answer === 'object' && answer.type === 'file' && answer.content) {
      createDownloadLink(answer.content, answer.fileName || 'answer-file');
    }
  };

  if (isLoading) {
    return (
      <AdminLayout>
        <Helmet>
          <title>Exam Results | AGI.online</title>
        </Helmet>
        <div className="p-6">
          <div className="animate-pulse space-y-4">
            <div className="h-8 bg-gray-200 rounded w-1/4"></div>
            <div className="h-64 bg-gray-200 rounded"></div>
          </div>
        </div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout>
      <Helmet>
        <title>Exam Results | AGI.online</title>
      </Helmet>

      <div className="p-6 space-y-6">
        <div className="flex justify-between items-center">
          <h1 className="text-3xl font-bold text-gray-900">Final Exam Results</h1>
        </div>

        {/* Filters */}
        <Card>
          <CardContent className="p-4">
            <div className="flex flex-col md:flex-row gap-4">
              <div className="relative flex-1">
                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-gray-500" />
                <Input
                  placeholder="Search by student name, course, or exam title..."
                  className="pl-8"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
              </div>

              <Select value={courseFilter} onValueChange={setCourseFilter}>
                <SelectTrigger className="w-full md:w-48">
                  <SelectValue placeholder="Filter by course" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Courses</SelectItem>
                  {getUniqueCourseSlugs().map(courseSlug => (
                    <SelectItem key={courseSlug} value={courseSlug}>
                      {courseSlug}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-full md:w-48">
                  <SelectValue placeholder="Filter by status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Statuses</SelectItem>
                  <SelectItem value="submitted">Submitted</SelectItem>
                  <SelectItem value="pending">Pending Review</SelectItem>
                  <SelectItem value="graded">Graded</SelectItem>
                  <SelectItem value="no-exam">No Exam</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        {/* Results Table */}
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
                    <TableHead>MCQ Score</TableHead>
                    <TableHead>Essay Status</TableHead>
                    <TableHead>Final Score</TableHead>
                    <TableHead>Attempts</TableHead>
                    <TableHead>Certificate Issuance</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredResults.map((result, index) => (
                    <TableRow key={`${result.studentId}-${result.courseSlug}`}>
                      <TableCell>
                        <div>
                          <div className="font-medium">{result.studentName}</div>
                          <div className="text-sm text-gray-500">{result.studentId}</div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div>
                          <div className="font-medium">{result.courseSlug}</div>
                        </div>
                      </TableCell>
                      <TableCell>
                        {result.hasFinalExam ? (
                          <div>
                            <div className="font-medium">{result.examTitle}</div>
                            <Badge variant="outline" className="text-xs mt-1">
                              {result.finalExamType === 'mcq' ? 'MCQ Only' :
                                result.finalExamType === 'essay' ? 'Essay Only' : 'Mixed'}
                            </Badge>
                          </div>
                        ) : (
                          <Badge variant="secondary">No Exam</Badge>
                        )}
                      </TableCell>
                      <TableCell>
                        {!result.latestAttempt ? (
                          <Badge variant="secondary">Not Attempted</Badge>
                        ) : result.latestAttempt.requiresManualGrading && !result.latestAttempt.gradedBy ? (
                          <Badge variant="outline" className="text-yellow-600">
                            <Clock className="h-3 w-3 mr-1" />
                            Pending Review
                          </Badge>
                        ) : result.latestAttempt.gradedBy ? (
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
                        {result.latestAttempt?.mcqTotal ? (
                          <div>
                            <div className="font-medium">
                              {result.latestAttempt.mcqCorrect}/{result.latestAttempt.mcqTotal}
                            </div>
                            <div className="text-sm text-gray-500">
                              {Math.round((result.latestAttempt.mcqCorrect! / result.latestAttempt.mcqTotal) * 100)}%
                            </div>
                          </div>
                        ) : (
                          <span className="text-gray-400">N/A</span>
                        )}
                      </TableCell>
                      <TableCell>
                        {result.latestAttempt?.essayTotal ? (
                          <div>
                            <div className="font-medium">{result.latestAttempt.essayTotal} essay(s)</div>
                            <div className="text-sm text-gray-500">
                              {result.latestAttempt.requiresManualGrading && !result.latestAttempt.gradedBy
                                ? 'Submitted'
                                : 'Reviewed'}
                            </div>
                          </div>
                        ) : (
                          <span className="text-gray-400">N/A</span>
                        )}
                      </TableCell>
                      <TableCell>
                        {result.latestAttempt?.score !== undefined ? (
                          <div>
                            <div className={`font-medium ${result.latestAttempt.passed ? 'text-green-600' : 'text-red-600'
                              }`}>
                              {result.latestAttempt.score}%
                            </div>
                            <div className="text-xs text-gray-500">
                              {result.latestAttempt.passed ? 'Passed' : 'Failed'}
                            </div>
                          </div>
                        ) : (
                          <span className="text-gray-400">Pending</span>
                        )}
                      </TableCell>
                      <TableCell>
                        {result.totalAttempts > 0 ? (
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="outline" size="sm" className="w-full">
                                {result.totalAttempts} attempt{result.totalAttempts !== 1 ? 's' : ''}
                                <ChevronDown className="ml-2 h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent className="w-96">
                              {result.allAttempts.map((attempt, idx) => (
                                <div key={attempt.attemptNumber} className="p-3 border-b last:border-b-0">
                                  <div className="flex justify-between items-center mb-2">
                                    <div className="flex flex-col">
                                      <span className="font-medium">Attempt #{attempt.attemptNumber}</span>
                                      <span className="text-xs text-gray-500">
                                        {new Date(attempt.attemptedAt).toLocaleDateString()} at {new Date(attempt.attemptedAt).toLocaleTimeString()}
                                      </span>
                                    </div>
                                    <div className="flex flex-col items-end">
                                      {attempt.score !== undefined ? (
                                        <span className={`font-medium ${attempt.passed ? 'text-green-600' : 'text-red-600'
                                          }`}>
                                          {attempt.score}%
                                        </span>
                                      ) : (
                                        <span className="text-gray-400">Pending</span>
                                      )}
                                      {attempt.requiresManualGrading && !attempt.gradedBy && (
                                        <Badge variant="outline" className="text-xs mt-1">
                                          Needs Review
                                        </Badge>
                                      )}
                                      {attempt.gradedBy && (
                                        <span className="text-xs text-gray-500 mt-1">
                                          Graded by {attempt.gradedBy}
                                        </span>
                                      )}
                                    </div>
                                  </div>
                                  <div className="flex space-x-2">
                                    <Button
                                      variant="outline"
                                      size="sm"
                                      onClick={() => viewSubmissionByAttempt(result, attempt.attemptNumber)}
                                      className="flex items-center"
                                    >
                                      <Eye className="h-3 w-3 mr-1" />
                                      View
                                    </Button>
                                    {renderIfCanEdit(
                                      attempt.requiresManualGrading && (
                                        <Button
                                          variant="outline"
                                          size="sm"
                                          onClick={() => openScoreDialogForAttempt(result, attempt.attemptNumber)}
                                          className="flex items-center"
                                        >
                                          <Edit className="h-3 w-3 mr-1" />
                                          Grade
                                        </Button>
                                      )
                                    )}
                                  </div>
                                </div>
                              ))}
                            </DropdownMenuContent>
                          </DropdownMenu>
                        ) : (
                          <span className="text-gray-400">No attempts</span>
                        )}
                      </TableCell>
                      <TableCell>
                        <CertificateIssuanceCell
                          result={result}
                          onUpdate={() => fetchExamResults()}
                        />
                      </TableCell>
                      <TableCell>
                        <div className="flex space-x-2">
                          {result.latestAttempt && (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => viewSubmissionByAttempt(result, result.latestAttempt!.attemptNumber)}
                              title="View Submission"
                            >
                              <Eye className="h-4 w-4" />
                            </Button>
                          )}
                          {renderIfCanEdit(
                            result.latestAttempt?.requiresManualGrading && (
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => openScoreDialog(result)}
                                title="Grade Submission"
                              >
                                <Edit className="h-4 w-4" />
                              </Button>
                            )
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                  {filteredResults.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={10} className="text-center py-8">
                        <div className="text-gray-500">No exam results found.</div>
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>

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
                  <h3 className="text-lg font-semibold">Questions and Answers</h3>
                  {selectedSubmission.questionsAndAnswers.map((qa, index) => (
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
                                  className={`p-2 rounded border ${idx === qa.correctIndex ? 'bg-green-50 border-green-200' :
                                    idx === qa.studentAnswer ? 'bg-red-50 border-red-200' :
                                      'bg-gray-50 border-gray-200'
                                    }`}
                                >
                                  <div className="flex items-center space-x-2">
                                    <span className="font-medium">{String.fromCharCode(65 + idx)}.</span>
                                    <span>{choice}</span>
                                    {idx === qa.correctIndex && <Badge className="text-xs bg-green-600">Correct</Badge>}
                                    {idx === qa.studentAnswer && idx !== qa.correctIndex && (
                                      <Badge className="text-xs bg-red-600">Student Answer</Badge>
                                    )}
                                    {idx === qa.studentAnswer && idx === qa.correctIndex && (
                                      <Badge className="text-xs bg-green-600">Student Answer (Correct)</Badge>
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

        {/* Score Update Dialog */}
        <Dialog open={showScoreDialog} onOpenChange={setShowScoreDialog}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>
                Update Score - Attempt #{selectedResult?.latestAttempt?.attemptNumber}
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

                  <div className="flex items-center space-x-2">
                    <input
                      type="checkbox"
                      id="passed"
                      checked={newPassed}
                      onChange={(e) => setNewPassed(e.target.checked)}
                    />
                    <label htmlFor="passed" className="text-sm font-medium">
                      Mark as Passed
                    </label>
                  </div>
                </div>

                <div className="flex justify-end space-x-2">
                  <Button variant="outline" onClick={() => setShowScoreDialog(false)}>
                    Cancel
                  </Button>
                  <Button onClick={updateScore}>
                    Update Score
                  </Button>
                </div>
              </div>
            )}
          </DialogContent>
        </Dialog>
      </div>
    </AdminLayout>
  );
}
