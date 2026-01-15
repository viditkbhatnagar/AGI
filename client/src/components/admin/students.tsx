import { useQuery, useQueries } from "@tanstack/react-query";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useMemo } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useLocation } from "wouter";
import { Badge } from "@/components/ui/badge";
import { Edit, Eye, Plus, Search, SlidersHorizontal, Trash2, UserPlus, Download, SortAsc, SortDesc, Mail, MoreVertical, FileDown } from "lucide-react";
import { Switch } from "@/components/ui/switch";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useState } from "react";
import { useConditionalRender } from '@/lib/permissions-provider';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { getInitials } from "@/lib/utils";
// Add token retrieval helper if you have one, otherwise use localStorage directly

import {
  Accordion,
  AccordionItem,
  AccordionTrigger,
  AccordionContent,
} from "@/components/ui/accordion";
import {
  Tabs,
  TabsList,
  TabsTrigger,
  TabsContent,
} from "@/components/ui/tabs";

export function Students() {
  const { renderIfCanCreate, renderIfCanEdit, renderIfCanDelete, canEdit } = useConditionalRender();
  const [searchQuery, setSearchQuery] = useState("");
  const [, setLocation] = useLocation();
  const [detailId, setDetailId] = useState<string | null>(null);
  const [courseFilter, setCourseFilter] = useState<string>('all');
  const [pathwayFilter, setPathwayFilter] = useState<string>('all');
  const [enrollSort, setEnrollSort] = useState<'asc' | 'desc'>('asc');
  const queryClient = useQueryClient();
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [editForm, setEditForm] = useState<any>(null);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState("");
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [showResendEmailDialog, setShowResendEmailDialog] = useState(false);
  const [resendingStudentId, setResendingStudentId] = useState<string | null>(null);
  const [resendingStudentName, setResendingStudentName] = useState<string>("");
  const [showCredentialsDialog, setShowCredentialsDialog] = useState(false);
  const [credentialsStudentId, setCredentialsStudentId] = useState<string | null>(null);
  const [credentialsStudentName, setCredentialsStudentName] = useState<string>("");
  const [showSuccessDialog, setShowSuccessDialog] = useState(false);
  const [successMessage, setSuccessMessage] = useState("");
  const updateMutation = useMutation({
    mutationFn: async (formData: any) => {
      const token = localStorage.getItem("token");
      // 1. Update student record
      await fetch(`/api/admin/students/${formData._id}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        credentials: "include",
        body: JSON.stringify(formData),
      });

      // 2. Sync enrollments
      // find existing enrollments for this student
      const existing = enrollments.filter(
        (e: any) =>
          (typeof e.studentId === "string" ? e.studentId : e.studentId?._id) === formData._id
      );
      const oldSlugs = existing.map((e: any) => e.courseSlug);
      const newSlugs: string[] = formData.courseSlugs;

      // additions: slugs in newSlugs but not in oldSlugs
      const toAdd = newSlugs.filter(s => !oldSlugs.includes(s));
      // removals: slugs in oldSlugs but not in newSlugs
      const toRemove = existing.filter((e: any) => !newSlugs.includes(e.courseSlug));

      // create new enrollments
      for (const slug of toAdd) {
        await fetch(`/api/enrollments`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
          },
          credentials: "include",
          body: JSON.stringify({ studentId: formData._id, courseSlug: slug }),
        });
      }
      // delete removed enrollments
      for (const e of toRemove) {
        await fetch(`/api/enrollments/${e._id}`, {
          method: "DELETE",
          headers: token ? { Authorization: `Bearer ${token}` } : undefined,
          credentials: "include",
        });
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/admin/students'] });
      setShowEditDialog(false);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const token = localStorage.getItem("token");
      await fetch(`/api/admin/students/${id}`, {
        method: "DELETE",
        headers: token ? { Authorization: `Bearer ${token}` } : undefined,
        credentials: "include",
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/admin/students'] });
      setShowDeleteDialog(false);
    },
  });

  const toggleAccessMutation = useMutation({
    mutationFn: async ({ studentId, accessEnabled }: { studentId: string; accessEnabled: boolean }) => {
      const token = localStorage.getItem("token");
      const response = await fetch(`/api/admin/students/${studentId}/toggle-access`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        credentials: "include",
        body: JSON.stringify({ accessEnabled }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to toggle access');
      }

      return response.json();
    },
    onSuccess: (data) => {
      console.log('Toggle access success:', data);
      queryClient.invalidateQueries({ queryKey: ['/api/admin/students'] });
    },
    onError: (error) => {
      console.error('Toggle access error:', error);
      alert(`Error: ${error.message}`);
    },
  });

  const resendEmailMutation = useMutation({
    mutationFn: async (studentId: string) => {
      const token = localStorage.getItem("token");
      const response = await fetch(`/api/admin/students/${studentId}/resend-welcome-email`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        credentials: "include",
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to send email');
      }

      return response.json();
    },
    onSuccess: (data) => {
      setShowResendEmailDialog(false);
      setSuccessMessage(`Welcome email sent successfully to ${data.email}`);
      setShowSuccessDialog(true);
    },
    onError: (error) => {
      console.error('Resend email error:', error);
      alert(`Error: ${error.message}`);
    },
  });

  const updateEmailMutation = useMutation({
    mutationFn: async ({ studentId, email }: { studentId: string; email: string }) => {
      const token = localStorage.getItem("token");
      const response = await fetch(`/api/admin/students/${studentId}/email`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        credentials: "include",
        body: JSON.stringify({ email }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to update email');
      }

      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/admin/students'] });
    },
    onError: (error) => {
      console.error('Update email error:', error);
      alert(`Error: ${error.message}`);
    },
  });

  const getCredentialsMutation = useMutation({
    mutationFn: async (studentId: string) => {
      const token = localStorage.getItem("token");
      const response = await fetch(`/api/admin/students/${studentId}/credentials`, {
        method: "GET",
        headers: {
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        credentials: "include",
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to get credentials');
      }

      return response.json();
    },
    onSuccess: (data) => {
      // Create CSV and download
      const csvContent = `Student Name,Email,Password\n"${data.studentName}","${data.email}","${data.password}"`;
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `student_credentials_${data.email}.csv`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
      
      setShowCredentialsDialog(false);
      setSuccessMessage(`Credentials downloaded. A new password has been generated for ${data.email}`);
      setShowSuccessDialog(true);
    },
    onError: (error) => {
      console.error('Get credentials error:', error);
      alert(`Error: ${error.message}`);
    },
  });
  
  const { data, isLoading, error } = useQuery<any[]>({
    queryKey: ['/api/admin/students'],
  });

  const { data: courses = [], isLoading: isLoadingCourses } = useQuery<any[]>({
    queryKey: ['/api/admin/courses'],
  });

  const courseMap = useMemo(
    () => new Map(courses.map((c: any) => [c.slug, c.title])),
    [courses]
  );

  const { data: enrollments = [] } = useQuery<any[]>({
    queryKey: ['/api/enrollments'],
  });

  // Removed network detail query; select student from already-fetched list.

  const studentCoursesMap = useMemo(() => {
    const m = new Map<string, string[]>();
    enrollments.forEach((e: any) => {
      let id: string;
      if (e.studentId) {
        id = typeof e.studentId === 'string'
          ? e.studentId
          : (e.studentId as any)._id;
      } else if (e.student_id) {
        id = e.student_id;
      } else {
        id = '';
      }
      let slug = '';
      if (e.course && typeof e.course === 'object') {
        slug = e.course.slug;
      } else if (e.courseSlug) {
        slug = e.courseSlug;
      } else if (e.course_slug) {
        slug = e.course_slug;
      } else if (e.courseId || e.course_id) {
        const idVal = e.courseId || e.course_id;
        const found = courses.find((c: any) => c._id === idVal);
        slug = found?.slug || '';
      }
      if (!m.has(id)) m.set(id, []);
      m.get(id)!.push(slug);
    });
    return m;
  }, [enrollments, courses]);

  // Compute the earliest enrollment date per student
  const studentEnrollDateMap = useMemo(() => {
    const m = new Map<string, string>();
    enrollments.forEach((e: any) => {
      const id = typeof e.studentId === "string" ? e.studentId : e.studentId?._id;
      const date = e.enrollDate;
      if (!m.has(id) || new Date(date) < new Date(m.get(id)!)) {
        m.set(id, date);
      }
    });
    return m;
  }, [enrollments]);
  
  const filteredStudents = data?.filter((student: any) => {
    // text search
    const matchesText =
      student._id.toLowerCase().includes(searchQuery.toLowerCase()) ||
      student.name.toLowerCase().includes(searchQuery.toLowerCase());

    // pathway filter
    const matchesPathway =
      pathwayFilter === 'all' || student.pathway === pathwayFilter;

    // course filter
    const enrolled = studentCoursesMap.get(student._id) || [];
    const matchesCourse =
      courseFilter === 'all' || enrolled.includes(courseFilter);

    return matchesText && matchesPathway && matchesCourse;
  });

  const sortedStudents = useMemo(() => {
    if (!filteredStudents) return [];
    return filteredStudents.slice().sort((a: any, b: any) => {
      const da = studentEnrollDateMap.get(a._id) || '';
      const db = studentEnrollDateMap.get(b._id) || '';
      const ta = da ? new Date(da).getTime() : 0;
      const tb = db ? new Date(db).getTime() : 0;
      return enrollSort === 'asc' ? ta - tb : tb - ta;
    });
  }, [filteredStudents, enrollSort, studentEnrollDateMap]);

  const selectedStudent = useMemo(
    () => data?.find((s: any) => s._id === detailId) ?? null,
    [detailId, data]
  );
  // simple HH:MM:SS formatter
  const fmt = (sec: number) => {
    const h = Math.floor(sec / 3600)
      .toString()
      .padStart(2, "0");
    const m = Math.floor((sec % 3600) / 60)
      .toString()
      .padStart(2, "0");
    const s = Math.floor(sec % 60)
      .toString()
      .padStart(2, "0");
    return `${h}:${m}:${s}`;
  };

  const enrolledSlugs = selectedStudent
    ? studentCoursesMap.get(selectedStudent._id) ?? []
    : [];

  const courseDetailsQueries = useQueries({
    queries: enrolledSlugs.map((slug) => ({
      queryKey: ["course-detail", slug],
      queryFn: async () => {
        const token =
          localStorage.getItem("token") ||
          sessionStorage.getItem("token") ||
          "";
        const res = await fetch(`/api/courses/${slug}`, {
          headers: token ? { Authorization: `Bearer ${token}` } : {},
          credentials: "include",
        });
        if (!res.ok) {
          return null;
        }
        return res.json();
      },
      enabled: !!selectedStudent,
    })),
  });

  const coursesWithDetail =
    (courseDetailsQueries ?? [])
      .map((q: any) => q.data)
      .filter(Boolean) as any[];

  // aggregate stats for the summary panel (enrollment-based aggregation)
  const summary = useMemo(() => {
    if (!selectedStudent) return null;

    const stuEnrolls = enrollments.filter(
      (e: any) =>
        (typeof e.studentId === "string"
          ? e.studentId
          : e.studentId?._id) === selectedStudent._id
    );

    const totalModules = stuEnrolls.reduce(
      (acc: number, e: any) => acc + (e.totalModules || 0),
      0
    );

    const completedModules = stuEnrolls.reduce(
      (acc: number, e: any) => acc + (e.completedModules?.length || 0),
      0
    );

    const totalWatchSec = (selectedStudent.watchTime ?? []).reduce(
      (acc: number, wt: any) => acc + (wt.duration || 0),
      0
    );

    const totalDocs = (selectedStudent.docViews ?? []).length;

    const overallProgress = totalModules
      ? Math.round((completedModules / totalModules) * 100)
      : 0;

    return {
      totalModules,
      completedModules,
      totalWatchSec,
      totalDocs,
      overallProgress,
    };
  }, [selectedStudent, enrollments]);
  // Export current table to CSV
  const handleDownload = () => {
    const header = ['Student ID','Name','Phone','Enrollment Date','Courses','Pathway'];
    const rows = (filteredStudents || []).map(student => {
      const id = student._id;
      const name = student.name;
      const phone = student.phone;
      const enroll = studentEnrollDateMap.get(student._id)
        ? new Date(studentEnrollDateMap.get(student._id)!).toISOString().split('T')[0]
        : '';
      const coursesList = (studentCoursesMap.get(student._id) || [])
        .map(slug => courseMap.get(slug) || slug)
        .join(';');
      const pathway = student.pathway;
      return [id, name, phone, enroll, coursesList, pathway];
    });
    const csvContent = [header, ...rows]
      .map(r => r.map(cell => `"${cell.replace(/"/g, '""')}"`).join(','))
      .join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', 'students.csv');
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };
  
  if (isLoading) {
    return <StudentsSkeleton />;
  }
  
  if (error) {
    return (
      <div className="p-6">
        <h1 className="text-2xl font-bold text-gray-800 mb-4">Current Students</h1>
        <Card>
          <CardContent className="p-6">
            <p className="text-red-500">Error loading students data. Please try again later.</p>
          </CardContent>
        </Card>
      </div>
    );
  }
  
  return (
    <div className="p-4 md:p-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6">
        <h1 className="text-2xl font-bold text-gray-800">Current Students Enrolled</h1>
        <div className="mt-2 md:mt-0 space-x-2">
          {renderIfCanCreate(
            <Button onClick={() => setLocation("/admin/students/new")}>
              <UserPlus className="mr-2 h-4 w-4" />
              Add Student
            </Button>
          )}
          {renderIfCanCreate(
            <Button onClick={() => setLocation("/admin/teachers/new")} variant="secondary">
              <UserPlus className="mr-2 h-4 w-4" />
              Add Teacher
            </Button>
          )}
        </div>
      </div>
      
      <Card className="mb-6">
        <CardContent className="p-4">
          <div className="flex flex-col md:flex-row justify-between gap-4">
            <div className="relative w-full md:w-96">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-gray-500" />
              <Input
                placeholder="Search by student name, student id or course ..."
                className="pl-8"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
            <div className="flex items-center text-lg font-bold">
              Total Students: {filteredStudents?.length ?? 0}
            </div>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={() => setEnrollSort('asc')}>
                <SortAsc className="mr-2 h-4 w-4" />
                Oldest Enrollment First
              </Button>
              <Button variant="outline" size="sm" onClick={() => setEnrollSort('desc')}>
                <SortDesc className="mr-2 h-4 w-4" />
                Newest Enrollment First
              </Button>
              <Button variant="outline" size="sm" onClick={handleDownload}>
                <Download className="mr-2 h-4 w-4" />
                Export CSV
              </Button>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" size="sm">
                    <SlidersHorizontal className="mr-2 h-4 w-4" />
                    Filter
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="start" side="bottom" className="w-64 p-4 space-y-4">
                  <div>
                    <label className="block text-sm font-medium mb-1">Course</label>
                    <select
                      className="block w-full border rounded px-2 py-1"
                      value={courseFilter}
                      onChange={e => setCourseFilter(e.target.value)}
                    >
                      <option value="all">All Courses</option>
                      {courses.map(c => (
                        <option key={c.slug} value={c.slug}>{c.title}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1">Pathway</label>
                    <select
                      className="block w-full border rounded px-2 py-1"
                      value={pathwayFilter}
                      onChange={e => setPathwayFilter(e.target.value)}
                    >
                      <option value="all">All Pathways</option>
                      <option value="standalone">Standalone</option>
                      <option value="with-mba">With MBA</option>
                    </select>
                  </div>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>
        </CardContent>
      </Card>
      
      <Card>
        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="font-bold">S.No</TableHead>
                <TableHead className="font-bold">Student Name</TableHead>
                <TableHead className="font-bold">Email</TableHead>
                <TableHead className="font-bold">Phone Number</TableHead>
                <TableHead className="font-bold">Date of Enrollment</TableHead>
                <TableHead className="font-bold">Courses Enrolled</TableHead>
                <TableHead className="font-bold">Pathway</TableHead>
                <TableHead className="font-bold">Access to Dashboard</TableHead>
                <TableHead className="text-right">More Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {sortedStudents?.length > 0 ? (
                sortedStudents.map((student, index) => (
                  <TableRow key={student._id}>
                    <TableCell className="text-sm text-gray-700">{index + 1}</TableCell>
                    <TableCell>
                      <div className="text-lg font-bold text-gray-900">{student.name}</div>
                    </TableCell>
                    <TableCell className="text-sm text-gray-700">
                      {(student.userId as any)?.email || 'N/A'}
                    </TableCell>
                    <TableCell className="text-sm text-gray-500">{student.phone}</TableCell>
                    <TableCell className="text-sm text-gray-700">
                      {studentEnrollDateMap.get(student._id)
                        ? new Date(studentEnrollDateMap.get(student._id)!).toLocaleDateString()
                        : 'N/A'}
                    </TableCell>
                    <TableCell>
                      {studentCoursesMap.get(student._id)?.length ? (
                        <div className="flex flex-col gap-1">
                          {studentCoursesMap.get(student._id)!.map(slug => (
                            <Badge
                              key={slug}
                              variant="secondary"
                              className="w-max whitespace-nowrap text-xs"
                            >
                              {courseMap.get(slug) || slug}
                            </Badge>
                          ))}
                        </div>
                      ) : (
                        <div className="text-sm text-gray-500">No course</div>
                      )}
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className={
                        student.pathway === 'with-mba' 
                          ? 'bg-purple-100 text-purple-800 hover:bg-purple-200' 
                          : 'bg-primary-100 text-primary-800 hover:bg-primary-200'
                      }>
                        {student.pathway === 'with-mba' ? 'With MBA' : 'Standalone'}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center space-x-2">
                        <Switch
                          checked={student.accessEnabled !== false}
                          onCheckedChange={(checked) => {
                            console.log('Toggle clicked:', { 
                              studentId: student._id, 
                              currentAccess: student.accessEnabled, 
                              newAccess: checked 
                            });
                            toggleAccessMutation.mutate({
                              studentId: student._id,
                              accessEnabled: checked
                            });
                          }}
                          disabled={toggleAccessMutation.isPending || !canEdit}
                        />
                        <span className="text-sm text-gray-600">
                          {student.accessEnabled !== false ? 'Enabled' : 'Disabled'}
                        </span>
                      </div>
                    </TableCell>
                    <TableCell className="text-right">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon">
                            <MoreVertical className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => setDetailId(student._id)}>
                            <Eye className="mr-2 h-4 w-4" />
                            View Details
                          </DropdownMenuItem>
                          {canEdit && (
                            <DropdownMenuItem onClick={() => {
                              setEditForm({
                                ...student,
                                email: (student.userId as any)?.email || '',
                                courseSlugs: studentCoursesMap.get(student._id) || [],
                              });
                              setShowEditDialog(true);
                            }}>
                              <Edit className="mr-2 h-4 w-4" />
                              Edit Student
                            </DropdownMenuItem>
                          )}
                          <DropdownMenuSeparator />
                          {canEdit && (
                            <DropdownMenuItem onClick={() => {
                              setResendingStudentId(student._id);
                              setResendingStudentName(student.name);
                              setShowResendEmailDialog(true);
                            }}>
                              <Mail className="mr-2 h-4 w-4" />
                              Resend Welcome Email
                            </DropdownMenuItem>
                          )}
                          {canEdit && (
                            <DropdownMenuItem onClick={() => {
                              setCredentialsStudentId(student._id);
                              setCredentialsStudentName(student.name);
                              setShowCredentialsDialog(true);
                            }}>
                              <FileDown className="mr-2 h-4 w-4" />
                              Download Credentials
                            </DropdownMenuItem>
                          )}
                          {canEdit && <DropdownMenuSeparator />}
                          {canEdit && (
                            <DropdownMenuItem 
                              onClick={() => {
                                setDeletingId(student._id);
                                setShowDeleteDialog(true);
                              }}
                              className="text-red-600"
                            >
                              <Trash2 className="mr-2 h-4 w-4" />
                              Delete Student
                            </DropdownMenuItem>
                          )}
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={9} className="h-24 text-center">
                    {/* Column count: S.No, Name, Email, Phone, Date, Courses, Pathway, Access, Actions */}
                    {searchQuery ? (
                      <div className="flex flex-col items-center justify-center">
                        <Search className="h-8 w-8 text-gray-300 mb-2" />
                        <p className="text-gray-500">No students match your search.</p>
                      </div>
                    ) : (
                      <div className="flex flex-col items-center justify-center">
                        <UserPlus className="h-8 w-8 text-gray-300 mb-2" />
                        <p className="text-gray-500">No students found. Add your first student to get started.</p>
                      </div>
                    )}
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
      </Card>
      {/* Edit Student Dialog */}
      <Dialog open={showEditDialog} onOpenChange={(o) => !o && setShowEditDialog(false)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Edit Student</DialogTitle>
          </DialogHeader>
          {editForm && (
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-2">Name</label>
                <Input
                  value={editForm.name}
                  onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-2">Email</label>
                <Input
                  type="email"
                  value={editForm.email || ''}
                  onChange={(e) => setEditForm({ ...editForm, email: e.target.value })}
                  placeholder="student@example.com"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-2">Phone</label>
                <Input
                  value={editForm.phone}
                  onChange={(e) => setEditForm({ ...editForm, phone: e.target.value })}
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-2">Date of Birth</label>
                <Input
                  type="date"
                  value={editForm.dob?.split('T')[0]}
                  onChange={(e) => setEditForm({ ...editForm, dob: e.target.value })}
                />
              </div>
              <label className="block text-sm font-medium">Courses</label>
              <div className="max-h-40 overflow-y-auto border rounded p-2">
                {courses.map((c) => {
                  const started = !!(editForm.watchTime?.find?.((wt: any) => (editForm.courseSlugs || []).includes(c.slug)) ||
                    (selectedStudent?.watchTime?.find?.((wt: any) => (studentCoursesMap.get(editForm._id)||[]).includes(c.slug))));
                  return (
                    <label key={c.slug} className="flex items-center mb-1">
                      <input
                        type="checkbox"
                        value={c.slug}
                        checked={editForm.courseSlugs.includes(c.slug)}
                        disabled={started}
                        onChange={(e) => {
                          const { value, checked } = e.target;
                          setEditForm((prev: any) => ({
                            ...prev,
                            courseSlugs: checked
                              ? [...prev.courseSlugs, value]
                              : prev.courseSlugs.filter((s: string) => s !== value),
                          }));
                        }}
                        className="mr-2"
                      />
                      {c.title}{started && <span className="text-red-500 ml-1">(in progress)</span>}
                    </label>
                  );
                })}
              </div>
              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={() => setShowEditDialog(false)}>Cancel</Button>
                <Button onClick={async () => {
                  // First update email if changed
                  const originalEmail = (data?.find((s: any) => s._id === editForm._id)?.userId as any)?.email;
                  if (editForm.email && editForm.email !== originalEmail) {
                    await updateEmailMutation.mutateAsync({ studentId: editForm._id, email: editForm.email });
                  }
                  // Then update other student details
                  updateMutation.mutate(editForm);
                }}>Save</Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={showDeleteDialog} onOpenChange={(o) => !o && setShowDeleteDialog(false)}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Confirm Delete</DialogTitle>
          </DialogHeader>
          <p className="mb-4 text-sm">Type <code>YES I AM SURE</code> to delete this student.</p>
          <Input
            value={deleteConfirm}
            onChange={(e) => setDeleteConfirm(e.target.value)}
            placeholder="Type exactly: YES I AM SURE"
          />
          <div className="flex justify-end gap-2 mt-4">
            <Button variant="outline" onClick={() => setShowDeleteDialog(false)}>Cancel</Button>
            <Button
              disabled={deleteConfirm !== "YES I AM SURE"}
              onClick={() => deletingId && deleteMutation.mutate(deletingId)}
            >
              Delete
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Resend Email Confirmation Dialog */}
      <Dialog open={showResendEmailDialog} onOpenChange={(o) => !o && setShowResendEmailDialog(false)}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Resend Welcome Email</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <p className="text-sm text-gray-600">
              This will generate a new password for <strong>{resendingStudentName}</strong> and send a welcome email with the new credentials.
            </p>
            <p className="text-sm text-amber-600 bg-amber-50 p-3 rounded-md">
              Warning: The student's current password will be reset and they will need to use the new password to log in.
            </p>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setShowResendEmailDialog(false)}>Cancel</Button>
              <Button 
                onClick={() => resendingStudentId && resendEmailMutation.mutate(resendingStudentId)}
                disabled={resendEmailMutation.isPending}
              >
                {resendEmailMutation.isPending ? 'Sending...' : 'Send Email'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Download Credentials Confirmation Dialog */}
      <Dialog open={showCredentialsDialog} onOpenChange={(o) => !o && setShowCredentialsDialog(false)}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Download Credentials</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <p className="text-sm text-gray-600">
              This will generate a new password for <strong>{credentialsStudentName}</strong> and download a CSV file with their login credentials.
            </p>
            <p className="text-sm text-amber-600 bg-amber-50 p-3 rounded-md">
              Warning: The student's current password will be reset and they will need to use the new password to log in.
            </p>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setShowCredentialsDialog(false)}>Cancel</Button>
              <Button 
                onClick={() => credentialsStudentId && getCredentialsMutation.mutate(credentialsStudentId)}
                disabled={getCredentialsMutation.isPending}
              >
                {getCredentialsMutation.isPending ? 'Generating...' : 'Download CSV'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Success Dialog */}
      <Dialog open={showSuccessDialog} onOpenChange={(o) => !o && setShowSuccessDialog(false)}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Success</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <p className="text-sm text-gray-600">{successMessage}</p>
            <div className="flex justify-end">
              <Button onClick={() => setShowSuccessDialog(false)}>OK</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={!!detailId} onOpenChange={(open) => !open && setDetailId(null)}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Student Details</DialogTitle>
          </DialogHeader>
          {!selectedStudent ? (
            <div className="py-8 text-center text-sm text-gray-500">
              Select a student to view details.
            </div>
          ) : (
            <Tabs defaultValue="overview" className="w-full space-y-4">
              <TabsList
                className="grid grid-cols-3 w-full bg-primary-50 rounded-md p-1"
              >
                <TabsTrigger
                  value="overview"
                  className="data-[state=active]:bg-primary data-[state=active]:text-white rounded-md py-2 px-4 text-sm font-medium transition"
                >
                  Overview
                </TabsTrigger>
                <TabsTrigger
                  value="watch"
                  className="data-[state=active]:bg-primary data-[state=active]:text-white rounded-md py-2 px-4 text-sm font-medium transition"
                >
                  Watch&nbsp;Time
                </TabsTrigger>
                <TabsTrigger
                  value="docs"
                  className="data-[state=active]:bg-primary data-[state=active]:text-white rounded-md py-2 px-4 text-sm font-medium transition"
                >
                  Documents
                </TabsTrigger>
              </TabsList>

              {/* ───────── Overview ───────── */}
              <TabsContent value="overview">
                <div className="space-y-4 pt-4 border-t">
                  {/* basic info */}
                  <div className="space-y-1 text-sm">
                    <p><strong>Name:</strong> {selectedStudent.name}</p>
                    {selectedStudent.email && <p><strong>Email:</strong> {selectedStudent.email}</p>}
                    {selectedStudent.phone && <p><strong>Phone:</strong> {selectedStudent.phone}</p>}
                    {selectedStudent.address && <p><strong>Address:</strong> {selectedStudent.address}</p>}
                    {selectedStudent.dob && (
                      <p><strong>DOB:</strong> {new Date(selectedStudent.dob).toLocaleDateString()}</p>
                    )}
                    <p>
                      <strong>Pathway:</strong>{" "}
                      {selectedStudent.pathway === "with-mba" ? "With MBA" : "Standalone"}
                    </p>
                    {studentEnrollDateMap.get(selectedStudent._id) && (
                      <p>
                        <strong>Enrollment Date:</strong>{" "}
                        {new Date(studentEnrollDateMap.get(selectedStudent._id)!).toLocaleDateString()}
                      </p>
                    )}
                  </div>

                  {/* summary stats */}
                  {summary && (
                    <div className="grid grid-cols-2 gap-x-6 gap-y-2 text-sm">
                      <p>
                        <strong>Modules Completed:</strong>{" "}
                        {summary.completedModules}/{summary.totalModules}
                      </p>
                      <p>
                        <strong>Total Watch&nbsp;Time:</strong> {fmt(summary.totalWatchSec)}
                      </p>
                      <p>
                        <strong>Documents Viewed:</strong> {summary.totalDocs}
                      </p>
                      <p>
                        <strong>Overall Progress:</strong> {summary.overallProgress}%
                      </p>
                    </div>
                  )}

                  {/* course list simple */}
                  <p className="font-semibold">Enrolled Courses</p>
                  <ul className="list-disc list-inside space-y-1 text-sm">
                    {coursesWithDetail.map((c) => (
                      <li key={c.slug}>{c.title}</li>
                    ))}
                  </ul>
                </div>
              </TabsContent>

              {/* ───────── Watch Time ───────── */}
              <TabsContent value="watch">
                {selectedStudent.watchTime?.length ? (
                  <div className="space-y-4 pt-4 border-t pr-1 max-h-[60vh] overflow-y-auto text-sm">
                    {coursesWithDetail.map((c) => {
                      // aggregate per‑course
                      const enrollment = enrollments.find(e =>
                        ((typeof e.studentId === 'string' ? e.studentId : e.studentId?._id) === selectedStudent._id) &&
                        e.courseSlug === c.slug
                      );
                      const enrollDate = enrollment?.enrollDate;
                      const aggr: Record<string, number> = {};
                      (selectedStudent.watchTime ?? [])
                        .filter((wt: any) =>
                          wt.moduleIndex < c.modules.length &&
                          (!enrollDate || new Date(wt.date) >= new Date(enrollDate))
                        )
                        .forEach((wt: any) => {
                          const mod = c.modules[wt.moduleIndex];
                          if (!mod || !mod.videos) return; // Skip if module or videos don't exist
                          const vid =
                            mod.videos[wt.videoIndex] ??
                            { title: `Video ${wt.videoIndex + 1}` };
                          const key = `${mod.title} / ${vid.title}`;
                          aggr[key] = (aggr[key] || 0) + (wt.duration || 0);
                        });
                      if (!Object.keys(aggr).length) return null;
                      return (
                        <div key={c.slug}>
                          <p className="font-semibold mb-1">{c.title}</p>
                          <ul className="pl-4 list-disc space-y-1">
                            {Object.entries(aggr).map(([k, sec]) => (
                              <li key={k}>{k} – {fmt(sec)}</li>
                            ))}
                          </ul>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <p className="text-sm text-gray-500">No watch‑time data.</p>
                )}
              </TabsContent>

              {/* ───────── Documents ───────── */}
              <TabsContent value="docs">
                {selectedStudent.docViews?.length ? (
                  <div className="space-y-4 pt-4 border-t pr-1 max-h-[60vh] overflow-y-auto text-sm">
                    {coursesWithDetail.map((c) => {
                      const enrollment = enrollments.find(e =>
                        ((typeof e.studentId === 'string' ? e.studentId : e.studentId?._id) === selectedStudent._id) &&
                        e.courseSlug === c.slug
                      );
                      const enrollDate = enrollment?.enrollDate;
                      const seen = new Map<string, { title: string; count: number; url: string }>();
                      (selectedStudent.docViews ?? [])
                        .filter((dv: any) =>
                          dv.moduleIndex < c.modules.length &&
                          (!enrollDate || new Date(dv.date) >= new Date(enrollDate))
                        )
                        .forEach((dv: any) => {
                          const mod = c.modules[dv.moduleIndex];
                          if (!mod || !mod.documents) return; // Skip if module or documents don't exist
                          const doc =
                            mod.documents.find((d: any) => d.url === dv.docUrl) ??
                            { title: dv.docUrl };
                          const key = `${mod.title} / ${doc.title}`;
                          if (seen.has(key)) {
                            seen.get(key)!.count += 1;
                          } else {
                            seen.set(key, { title: key, count: 1, url: dv.docUrl });
                          }
                        });
                      if (!seen.size) return null;
                      return (
                        <div key={c.slug}>
                          <p className="font-semibold mb-1">{c.title}</p>
                          <ul className="pl-4 list-disc space-y-1">
                            {[...seen.values()].map((d) => (
                              <li key={d.title}>
                                <a
                                  href={d.url}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="underline text-primary"
                                >
                                  {d.title}
                                </a>
                                {d.count > 1 && ` – opened ${d.count}×`}
                              </li>
                            ))}
                          </ul>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <p className="text-sm text-gray-500">No document views.</p>
                )}
              </TabsContent>
            </Tabs>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

function StudentsSkeleton() {
  return (
    <div className="p-4 md:p-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6">
        <Skeleton className="h-8 w-32" />
        <Skeleton className="h-10 w-32 mt-2 md:mt-0" />
      </div>
      
      <Card className="mb-6">
        <CardContent className="p-4">
          <div className="flex flex-col md:flex-row justify-between gap-4">
            <Skeleton className="h-10 w-full md:w-72" />
            <div className="flex gap-2">
              <Skeleton className="h-10 w-24" />
              <Skeleton className="h-10 w-24" />
            </div>
          </div>
        </CardContent>
      </Card>
      
      <Card>
        <div className="p-1">
          <div className="rounded-md border">
            <div className="h-10 px-4 border-b flex items-center bg-gray-50">
              {[1, 2, 3, 4, 5, 6].map((i) => (
                <Skeleton key={i} className="h-4 w-24 mx-4" />
              ))}
            </div>
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="flex items-center px-4 py-4 border-b last:border-0">
                <div className="flex items-center flex-1">
                  <Skeleton className="h-10 w-10 rounded-full" />
                  <div className="ml-4">
                    <Skeleton className="h-4 w-32 mb-2" />
                    <Skeleton className="h-3 w-20" />
                  </div>
                </div>
                <Skeleton className="h-4 w-32 mx-4" />
                <Skeleton className="h-6 w-24 mx-4" />
                <div className="mx-4 w-32">
                  <Skeleton className="h-4 w-full mb-1" />
                  <Skeleton className="h-2 w-full" />
                </div>
                <Skeleton className="h-6 w-16 mx-4" />
                <div className="flex justify-end gap-2 ml-4">
                  <Skeleton className="h-8 w-8 rounded-md" />
                  <Skeleton className="h-8 w-8 rounded-md" />
                  <Skeleton className="h-8 w-8 rounded-md" />
                </div>
              </div>
            ))}
          </div>
        </div>
      </Card>
    </div>
  );
}

export default Students;
