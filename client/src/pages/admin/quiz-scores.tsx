import { useState, useEffect } from 'react';
import { AdminLayout } from "@/components/admin/layout/admin-layout";
import { Helmet } from "react-helmet-async";
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Search, Filter, Download } from 'lucide-react';
import { formatDateTime } from '@/lib/utils';

interface ModuleScore {
  moduleIndex: number;
  moduleTitle: string;
  attempts: number;
  bestScore: number | null;
  averageScore: number | null;
  lastAttempt: {
    score: number;
    passed: boolean;
    attemptedAt: string;
  } | null;
}

interface StudentQuizScore {
  studentId: string;
  studentName: string;
  courseSlug: string;
  courseTitle: string;
  enrollDate: string;
  totalQuizAttempts: number;
  overallAverage: number | null;
  moduleScores: ModuleScore[];
  completedModules: number;
  totalModules: number;
}

export default function AdminQuizScores() {
  const [quizScores, setQuizScores] = useState<StudentQuizScore[]>([]);
  const [filteredScores, setFilteredScores] = useState<StudentQuizScore[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCourse, setSelectedCourse] = useState<string>('all');
  const [courses, setCourses] = useState<{ slug: string; title: string }[]>([]);
  const [expandedRows, setExpandedRows] = useState<Set<string>>(new Set());

  useEffect(() => {
    fetchQuizScores();
    fetchCourses();
  }, []);

  useEffect(() => {
    filterScores();
  }, [quizScores, searchTerm, selectedCourse]);

  const fetchQuizScores = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch('/api/admin/quiz-scores', {
        headers: { Authorization: `Bearer ${token}` }
      });

      if (!response.ok) throw new Error('Failed to fetch quiz scores');

      const data = await response.json();
      setQuizScores(data);
      setFilteredScores(data);
    } catch (error) {
      console.error('Error fetching quiz scores:', error);
    } finally {
      setIsLoading(false);
    }
  };

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
    }
  };

  const filterScores = () => {
    let filtered = [...quizScores];

    // Filter by search term (student name)
    if (searchTerm) {
      filtered = filtered.filter(score =>
        score.studentName.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    // Filter by course
    if (selectedCourse !== 'all') {
      filtered = filtered.filter(score => score.courseSlug === selectedCourse);
    }

    setFilteredScores(filtered);
  };

  const toggleRowExpansion = (studentId: string, courseSlug: string) => {
    const key = `${studentId}-${courseSlug}`;
    const newExpanded = new Set(expandedRows);

    if (newExpanded.has(key)) {
      newExpanded.delete(key);
    } else {
      newExpanded.add(key);
    }

    setExpandedRows(newExpanded);
  };

  const exportToCSV = () => {
    const headers = ['Student Name', 'Course', 'Overall Average', 'Total Attempts', 'Completed Modules', 'Enrollment Date'];
    const rows = filteredScores.map(score => [
      score.studentName,
      score.courseTitle,
      score.overallAverage?.toString() || 'N/A',
      score.totalQuizAttempts.toString(),
      `${score.completedModules}/${score.totalModules}`,
      new Date(score.enrollDate).toLocaleDateString()
    ]);

    const csvContent = [
      headers.join(','),
      ...rows.map(row => row.map(cell => `"${cell}"`).join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `quiz-scores-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
  };

  if (isLoading) {
    return (
      <AdminLayout>
        <Helmet>
          <title>Quiz Scores | AGI.online</title>
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
        <title>Quiz Scores | AGI.online</title>
      </Helmet>
      <div className="p-6 space-y-6">
        <div className="flex justify-between items-center">
          <h1 className="text-3xl font-bold text-gray-900">Quiz Scores</h1>
          <Button onClick={exportToCSV} variant="outline">
            <Download className="h-4 w-4 mr-2" />
            Export CSV
          </Button>
        </div>

        {/* Filters */}
        <Card>
          <CardHeader>
            <CardTitle>Filters</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                <Input
                  placeholder="Search by student name..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>

              <Select value={selectedCourse} onValueChange={setSelectedCourse}>
                <SelectTrigger>
                  <SelectValue placeholder="Select course" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Courses</SelectItem>
                  {courses.map(course => (
                    <SelectItem key={course.slug} value={course.slug}>
                      {course.title}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        {/* Results Table */}
        <Card>
          <CardHeader>
            <CardTitle>
              Student Quiz Scores ({filteredScores.length} results)
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Student Name</TableHead>
                    <TableHead>Course</TableHead>
                    <TableHead>Overall Average</TableHead>
                    <TableHead>Total Attempts</TableHead>
                    <TableHead>Progress</TableHead>
                    <TableHead>Enrolled</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredScores.map((score) => {
                    const key = `${score.studentId}-${score.courseSlug}`;
                    const isExpanded = expandedRows.has(key);

                    return (
                      <>
                        <TableRow key={key}>
                          <TableCell className="font-medium">{score.studentName}</TableCell>
                          <TableCell>{score.courseTitle}</TableCell>
                          <TableCell>
                            {score.overallAverage !== null ? (
                              <Badge variant={score.overallAverage >= 70 ? 'default' : 'destructive'}>
                                {score.overallAverage}%
                              </Badge>
                            ) : (
                              <span className="text-gray-500">N/A</span>
                            )}
                          </TableCell>
                          <TableCell>{score.totalQuizAttempts}</TableCell>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              <span>{score.completedModules}/{score.totalModules}</span>
                              <div className="w-20 bg-gray-200 rounded-full h-2">
                                <div
                                  className="bg-blue-600 h-2 rounded-full"
                                  style={{ width: `${(score.completedModules / score.totalModules) * 100}%` }}
                                />
                              </div>
                            </div>
                          </TableCell>
                          <TableCell>{new Date(score.enrollDate).toLocaleDateString()}</TableCell>
                          <TableCell>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => toggleRowExpansion(score.studentId, score.courseSlug)}
                            >
                              {isExpanded ? 'Hide' : 'View'} Details
                            </Button>
                          </TableCell>
                        </TableRow>

                        {isExpanded && (
                          <TableRow>
                            <TableCell colSpan={7} className="bg-gray-50">
                              <div className="p-4">
                                <h4 className="font-semibold mb-3">Module-wise Performance</h4>
                                <div className="space-y-2">
                                  {score.moduleScores.map((module) => (
                                    <div key={module.moduleIndex} className="flex items-center justify-between p-3 bg-white rounded-lg border">
                                      <div className="flex-1">
                                        <p className="font-medium">{module.moduleTitle}</p>
                                        <p className="text-sm text-gray-500">
                                          {module.attempts} attempt{module.attempts !== 1 ? 's' : ''}
                                        </p>
                                      </div>
                                      <div className="flex gap-4 text-right">
                                        <div>
                                          <p className="text-xs text-gray-500">Best Score</p>
                                          <p className="font-semibold">
                                            {module.bestScore !== null ? `${module.bestScore}%` : 'N/A'}
                                          </p>
                                        </div>
                                        <div>
                                          <p className="text-xs text-gray-500">Average</p>
                                          <p className="font-semibold">
                                            {module.averageScore !== null ? `${module.averageScore}%` : 'N/A'}
                                          </p>
                                        </div>
                                        {module.lastAttempt && (
                                          <div>
                                            <p className="text-xs text-gray-500">Last Attempt</p>
                                            <p className="font-semibold">
                                              {module.lastAttempt.score}%
                                              <span className="text-xs text-gray-500 ml-1">
                                                ({formatDateTime(module.lastAttempt.attemptedAt)})
                                              </span>
                                            </p>
                                          </div>
                                        )}
                                      </div>
                                    </div>
                                  ))}
                                </div>
                              </div>
                            </TableCell>
                          </TableRow>
                        )}
                      </>
                    );
                  })}

                  {filteredScores.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={7} className="text-center py-8 text-gray-500">
                        No quiz scores found matching your criteria
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      </div>
    </AdminLayout>
  );
} 