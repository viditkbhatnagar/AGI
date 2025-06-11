import { useQuery } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Link, useLocation } from "wouter";
import { Badge } from "@/components/ui/badge";
import { Edit, Eye, GraduationCap, Plus, Search, SlidersHorizontal, Trash2, SortAsc, SortDesc, Download } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useState, useMemo } from "react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { formatDate, formatTimeRemaining, getInitials } from "@/lib/utils";

export function Enrollments() {
  
  const [searchQuery, setSearchQuery] = useState("");
  const [studentNameFilter, setStudentNameFilter] = useState<string>('');
  const [courseNameFilter, setCourseNameFilter] = useState<string>('');
  const [enrollAfter, setEnrollAfter] = useState<string>('');
  const [validBefore, setValidBefore] = useState<string>('');
  const [progressOp, setProgressOp] = useState<'more'|'less'>('more');
  const [progressValue, setProgressValue] = useState<number>(0);
  const [dateSort, setDateSort] = useState<'asc'|'desc'>('asc');
  const [currentPage, setCurrentPage] = useState(1);
const itemsPerPage = 10;
  const [, setLocation] = useLocation();
  const handleDownload = (ext: 'csv' | 'xlsx') => {
    const header = ['Student Name','Course','Enrollment Date','Valid Until','Progress'];
    const rows = grouped.flatMap(({ student, records }) =>
      records.map((r: any) => [
        student?.name || '',
        r.courseSlug,
        r.enrollDate.split('T')[0],
        r.validUntil.split('T')[0],
        `${r.percentComplete ?? 0}%`,
      ])
    );
    const csvContent = [header, ...rows]
      .map(r => r.map(cell => `"${cell.replace(/"/g, '""')}"`).join(','))
      .join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `enrollments.${ext}`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };
  
  const { data, isLoading, error } = useQuery({
    queryKey: ['/api/enrollments'],
  });
  
  const q = searchQuery.toLowerCase();
  const filteredEnrollments = data?.filter(e => {
    const searchMatch = !searchQuery || 
      e.studentId?.name.toLowerCase().includes(q) ||
      e.courseSlug.toLowerCase().includes(q);
    const nameMatch = studentNameFilter
      ? e.studentId?.name?.toLowerCase().includes(studentNameFilter.toLowerCase())
      : true;
    const courseMatch = courseNameFilter
      ? e.courseSlug.toLowerCase().includes(courseNameFilter.toLowerCase())
      : true;
    const enrollMatch = enrollAfter
      ? new Date(e.enrollDate) >= new Date(enrollAfter)
      : true;
    const validMatch = validBefore
      ? new Date(e.validUntil) <= new Date(validBefore)
      : true;
    const prog = e.percentComplete ?? 0;
    const progressMatch = progressOp === 'more'
      ? prog >= progressValue
      : prog <= progressValue;
    return searchMatch && nameMatch && courseMatch && enrollMatch && validMatch && progressMatch;
  });

  const grouped = useMemo(() => {
    const m = new Map<string, { student: any; records: any[] }>();
    (filteredEnrollments || []).forEach(e => {
      const sid = e.studentId?._id;
      if (!sid) return;
      if (!m.has(sid)) {
        m.set(sid, { student: e.studentId, records: [] });
      }
      m.get(sid)!.records.push(e);
    });
    return Array.from(m.values());
  }, [filteredEnrollments]);

  const sortedGrouped = useMemo(() => {
    return grouped.slice().sort((a, b) => {
      const da = new Date(a.records[0].enrollDate).getTime();
      const db = new Date(b.records[0].enrollDate).getTime();
      return dateSort === 'asc' ? da - db : db - da;
    });
  }, [grouped, dateSort]);
  const totalPages = Math.ceil(sortedGrouped.length / itemsPerPage);
const paginated = sortedGrouped.slice(
  (currentPage - 1) * itemsPerPage,
  currentPage * itemsPerPage
);
  
  if (isLoading) {
    return <EnrollmentsSkeleton />;
  }
  
  if (error) {
    return (
      <div className="p-6">
        <h1 className="text-2xl font-bold text-gray-800 mb-4">Enrollments</h1>
        <Card>
          <CardContent className="p-6">
            <p className="text-red-500">Error loading enrollments data. Please try again later.</p>
          </CardContent>
        </Card>
      </div>
    );
  }
  
  return (
    <div className="p-4 md:p-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6">
        <h1 className="text-2xl font-bold text-gray-800">Enrollments</h1>
        <div className="mt-2 md:mt-0">
        </div>
      </div>
      
      <Card className="mb-6">
        <CardContent className="p-4">
          <div className="flex flex-col md:flex-row justify-between gap-4">
            <div className="relative w-full md:w-96">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-gray-500" />
              <Input
                placeholder="Search by student name or course name..."
                className="pl-8"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>

            <div className="flex items-center text-lg font-bold space-x-6">
              <div>Total Students: {sortedGrouped.length}</div>
              <div>Total Enrollments: {filteredEnrollments?.length ?? 0}</div>
            </div>

            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={() => {
                setStudentNameFilter('');
                setCourseNameFilter('');
                setEnrollAfter('');
                setValidBefore('');
                setProgressOp('more');
                setProgressValue(0);
              }}>
                No Filter
              </Button>
              <Button variant="outline" size="sm" onClick={() => handleDownload('csv')}>
                <Download className="mr-2 h-4 w-4" />
                Export CSV
              </Button>
              <Button variant="outline" size="sm" onClick={() => setDateSort('asc')}>
                <SortAsc className="mr-2 h-4 w-4" />
                Oldest First
              </Button>
              <Button variant="outline" size="sm" onClick={() => setDateSort('desc')}>
                <SortDesc className="mr-2 h-4 w-4" />
                Newest First
              </Button>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" size="sm">
                    <SlidersHorizontal className="mr-2 h-4 w-4" />
                    Filter
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="start" side="bottom" className="w-full max-w-sm p-4 space-y-3">
                  <div>
                    <label className="block text-sm font-medium">Student Name</label>
                    <Input
                      value={studentNameFilter}
                      onChange={e => setStudentNameFilter(e.target.value)}
                      placeholder="Type name..."
                      className="mt-1 w-full"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium">Course Name</label>
                    <Input
                      value={courseNameFilter}
                      onChange={e => setCourseNameFilter(e.target.value)}
                      placeholder="Type course..."
                      className="mt-1 w-full"
                    />
                  </div>
                  <div className="flex flex-col space-y-2 sm:flex-row sm:space-y-0 sm:space-x-2">
                    <div className="flex-1 w-full">
                      <label className="block text-sm font-medium">Enrolled After</label>
                      <Input
                        type="date"
                        value={enrollAfter}
                        onChange={e => setEnrollAfter(e.target.value)}
                        className="mt-1 w-full"
                      />
                    </div>
                    <div className="flex-1 w-full">
                      <label className="block text-sm font-medium">Valid Before</label>
                      <Input
                        type="date"
                        value={validBefore}
                        onChange={e => setValidBefore(e.target.value)}
                        className="mt-1 w-full"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium">Progress</label>
                    <div className="flex items-center space-x-2 mt-1">
                      <select
                        value={progressOp}
                        onChange={e => setProgressOp(e.target.value as 'more'|'less')}
                        className="border rounded px-2 py-1"
                      >
                        <option value="more">≥</option>
                        <option value="less">≤</option>
                      </select>
                      <Input
                        type="number"
                        value={progressValue}
                        onChange={e => setProgressValue(Number(e.target.value))}
                        className="w-16"
                      />
                      <span>%</span>
                    </div>
                  </div>
                </DropdownMenuContent>
              </DropdownMenu>
              <DropdownMenu>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem>
                    <GraduationCap className="mr-2 h-4 w-4" />
                    Create Enrollment
                  </DropdownMenuItem>
                  <DropdownMenuItem>Bulk Enroll Students</DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem>Generate Reports</DropdownMenuItem>
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
                <TableHead>Student Name</TableHead>
                <TableHead>Course Name</TableHead>
                <TableHead>Enrollment Date</TableHead>
                <TableHead>Valid Until</TableHead>
                <TableHead>Course Vise Progress</TableHead>
                {/* <TableHead className="text-right">Actions</TableHead> */}
              </TableRow>
            </TableHeader>
            <TableBody>
              {sortedGrouped.length > 0 ? (
                sortedGrouped.map(({ student, records }, index) => (
                  <TableRow key={student._id}>
                    <TableCell className="text-sm text-gray-700">{index + 1}</TableCell>
                    <TableCell>
                      <div className="flex items-center">
                        <div className="ml-4">
                          <div className="text-sm font-medium text-gray-900">{student?.name || "Unknown Student"}</div>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="text-sm space-y-1">
                        {records.map(r => (
                          <div key={r._id}>{r.courseSlug}</div>
                        ))}
                      </div>
                    </TableCell>
                    <TableCell>
                      {formatDate(
                        records
                          .map(r => r.enrollDate)
                          .sort((a, b) => new Date(a).getTime() - new Date(b).getTime())[0]
                      )}
                    </TableCell>
                    <TableCell>
                      {formatDate(
                        records
                          .map(r => r.validUntil)
                          .sort((a, b) => new Date(b).getTime() - new Date(a).getTime())[0]
                      )}
                    </TableCell>
                    <TableCell>
                      <div className="space-y-4">
                        {records.map((r: any) => (
                          <div key={r._id} className="space-y-1">
                            <div className="text-sm font-medium text-gray-900">
                              {r.courseSlug} — {r.percentComplete ?? 0}% Complete
                            </div>
                            <div className="w-full h-1.5 bg-gray-200 rounded-full">
                              <div
                                className="h-full bg-primary rounded-full"
                                style={{ width: `${r.percentComplete ?? 0}%` }}
                              />
                            </div>
                          </div>
                        ))}
                      </div>
                    </TableCell>
              {/* Commented out actions */}
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={6} className="h-24 text-center">
                    {searchQuery ? (
                      <div className="flex flex-col items-center justify-center">
                        <Search className="h-8 w-8 text-gray-300 mb-2" />
                        <p className="text-gray-500">No enrollments match your search.</p>
                      </div>
                    ) : (
                      <div className="flex flex-col items-center justify-center">
                        <GraduationCap className="h-8 w-8 text-gray-300 mb-2" />
                        <p className="text-gray-500">No enrollments found. Create your first enrollment to get started.</p>
                      </div>
                    )}
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
      </Card>
    </div>
  );
}

function EnrollmentsSkeleton() {
  return (
    <div className="p-4 md:p-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6">
        <Skeleton className="h-8 w-40" />
        <Skeleton className="h-10 w-40 mt-2 md:mt-0" />
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
                    <Skeleton className="h-4 w-32" />
                  </div>
                </div>
                <Skeleton className="h-4 w-32 mx-4" />
                <Skeleton className="h-4 w-24 mx-4" />
                <div className="mx-4 w-32">
                  <Skeleton className="h-4 w-full mb-1" />
                  <Skeleton className="h-3 w-24" />
                </div>
                <div className="mx-4 w-32">
                  <Skeleton className="h-4 w-full mb-1" />
                  <Skeleton className="h-2 w-full" />
                </div>
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

export default Enrollments;
