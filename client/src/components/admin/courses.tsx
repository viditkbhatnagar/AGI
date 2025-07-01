import { useQuery } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Link, useLocation } from "wouter";
import { Badge } from "@/components/ui/badge";
import { Edit, Eye, Plus, Search, SlidersHorizontal, Trash2, Users, School, CalendarClock, Download, SortAsc, SortDesc, ArrowUpDown } from "lucide-react";
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
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

export function Courses() {
  const [searchQuery, setSearchQuery] = useState("");
  const [typeFilter, setTypeFilter] = useState<string>('all');
  const [courseNameFilter, setCourseNameFilter] = useState<string>('all');
  const [studentSort, setStudentSort] = useState<'asc' | 'desc'>('asc');
  const [showAll, setShowAll] = useState(false);
const [currentPage, setCurrentPage] = useState(1);
const itemsPerPage = 4;
  const [, setLocation] = useLocation();
  
  const { data, isLoading, error } = useQuery({
    queryKey: ['/api/courses'],
  });
  const { data: enrollments = [] } = useQuery({
    queryKey: ['/api/enrollments'],
  });
  const enrollCountMap = useMemo(() => {
    const m = new Map<string, number>();
    enrollments.forEach((e: any) => {
      m.set(e.courseSlug, (m.get(e.courseSlug) || 0) + 1);
    });
    return m;
  }, [enrollments]);

  const handleDownload = () => {
    const header = ['Course','Type','Students','Modules','Live Classes'];
    const rows = (sortedCourses || []).map(c => [
      c.title,
      c.type === 'with-mba' ? 'With MBA' : 'Standalone',
      enrollCountMap.get(c.slug) ?? 0,
      c.modules?.length ?? 0,
      c.liveClassConfig?.enabled ? 'Enabled' : 'Disabled',
    ]);
    const csv = [header, ...rows]
      .map(r => r.map(cell => `"${cell}"`).join(','))
      .join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'courses.csv';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const [showEnrollDialog, setShowEnrollDialog] = useState(false);
  const [selectedCourseSlug, setSelectedCourseSlug] = useState<string | null>(null);
  const courseEnrollments = useMemo(
    () => enrollments.filter((e: any) => e.courseSlug === selectedCourseSlug),
    [enrollments, selectedCourseSlug]
  );
  
  const query = searchQuery.toLowerCase();
const filteredCourses = data?.filter(course =>
  (
    course.title.toLowerCase().includes(query) ||
    course.slug.toLowerCase().includes(query) ||
    course.modules?.some(m =>
      m.title.toLowerCase().includes(query)
    )
  ) &&
  (typeFilter === 'all' || course.type === typeFilter) &&
  (courseNameFilter === 'all' || course.title === courseNameFilter)
);

  const sortedCourses = useMemo(() => {
    if (!filteredCourses) return [];
    return filteredCourses.slice().sort((a, b) => {
      const ca = enrollCountMap.get(a.slug) || 0;
      const cb = enrollCountMap.get(b.slug) || 0;
      return studentSort === 'asc' ? ca - cb : cb - ca;
    });
  }, [filteredCourses, studentSort, enrollCountMap]);
  const totalPages = Math.ceil((sortedCourses.length || 0) / itemsPerPage);
const displayedCourses = showAll
  ? sortedCourses
  : sortedCourses.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);
  
  if (isLoading) {
    return <CoursesSkeleton />;
  }
  
  if (error) {
    return (
      <div className="p-6">
        <h1 className="text-2xl font-bold text-gray-800 mb-4">Courses</h1>
        <Card>
          <CardContent className="p-6">
            <p className="text-red-500">Error loading courses data. Please try again later.</p>
          </CardContent>
        </Card>
      </div>
    );
  }
  
  return (
    <div className="p-4 md:p-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6">
        <h1 className="text-2xl font-bold text-gray-800">Courses</h1>
        <div className="mt-2 md:mt-0">
          <Button onClick={() => setLocation("/admin/courses/new")}>
            <School className="mr-2 h-4 w-4" />
            Add Course
          </Button>
        </div>
      </div>
      
      <Card className="mb-6">
        <CardContent className="p-4">
          <div className="flex flex-col md:flex-row justify-between gap-4">
            <div className="relative w-full md:w-96">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-gray-500" />
              <Input
                placeholder="Search by course name or module name..."
                className="pl-8"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
            <div className="flex items-center text-lg font-bold">
  Total Courses: {sortedCourses.length}
</div>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  setShowAll(!showAll);
                  setCurrentPage(1);
                }}
              >
                {showAll ? "Paginate" : "Show All Courses"}
              </Button>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" size="sm">
                    <SlidersHorizontal className="mr-2 h-4 w-4" />
                    Filter
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="start" side="bottom" className="w-56 p-4 space-y-2">
                  <div>
                    <label className="block text-sm font-medium mb-1">Course Name</label>
                    <select
                      className="block w-full border rounded px-2 py-1"
                      value={courseNameFilter}
                      onChange={e => setCourseNameFilter(e.target.value)}
                    >
                      <option value="all">All Courses</option>
                      {data?.map(c => (
                        <option key={c.slug} value={c.title}>{c.title}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1">Course Type</label>
                    <select
                      className="block w-full border rounded px-2 py-1"
                      value={typeFilter}
                      onChange={e => setTypeFilter(e.target.value)}
                    >
                      <option value="all">All Types</option>
                      <option value="standalone">Standalone</option>
                      <option value="with-mba">With MBA</option>
                    </select>
                  </div>
                </DropdownMenuContent>
              </DropdownMenu>
              <Button variant="outline" size="sm" onClick={() => setStudentSort('asc')}>
                <SortAsc className="mr-2 h-4 w-4" />
                Fewest Students
              </Button>
              <Button variant="outline" size="sm" onClick={() => setStudentSort('desc')}>
                <SortDesc className="mr-2 h-4 w-4" />
                Most Students
              </Button>
              <Button variant="outline" size="sm" onClick={handleDownload}>
                <Download className="mr-2 h-4 w-4" />
                Export CSV
              </Button>
              <DropdownMenu>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem>
                    <School className="mr-2 h-4 w-4" />
                    Add Course
                  </DropdownMenuItem>
                  <DropdownMenuItem>Import Course</DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem>Bulk Edit</DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>
        </CardContent>
      </Card>
      
      <Card>
        <div className="rounded-md border">
          <Table>
            <TableHeader className="bg-gr-50">
              <TableRow>
                <TableHead className="font-bold">Course Name</TableHead>
                <TableHead className="font-bold">Type</TableHead>
                <TableHead className="font-bold">Students</TableHead>
                <TableHead className="font-bold">Modules</TableHead>
                <TableHead className="font-bold">Live Classes</TableHead>
                <TableHead className="text-right">More Info</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {sortedCourses.length > 0 ? (
                displayedCourses.map((course) => (
                  <TableRow key={course._id || course.slug}>
                    <TableCell>
                      <div className="text-lg font-bold text-gray-900">{course.title}</div>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className={
                        course.type === 'with-mba' 
                          ? 'bg-purple-100 text-purple-800 hover:bg-purple-200' 
                          : 'bg-primary-100 text-primary-800 hover:bg-primary-200'
                      }>
                        {course.type === 'with-mba' ? 'With MBA' : 'Standalone'}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center">
                        <Users className="h-4 w-4 text-gray-400 mr-1" />
                        <span className="text-sm text-gray-500">
                          {(enrollCountMap.get(course.slug) ?? 0)} students
                        </span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="text-sm text-gray-900 space-y-1">
                        {course.modules?.map((m: any) => (
                          <div key={m._id} className="flex items-start">
                            <span className="mr-2">•</span>
                            <span>
                              {m.title} ({m.videos?.length ?? 0} videos, {m.documents?.length ?? 0} reading material)
                            </span>
                          </div>
                        )) || <div>No modules</div>}
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant={course.liveClassConfig?.enabled ? "outline" : "secondary"} className={
                        course.liveClassConfig?.enabled 
                          ? 'bg-green-100 text-green-800 hover:bg-green-200' 
                          : 'bg-red-100 text-red-800 hover:bg-red-200'
                      }>
                        {course.liveClassConfig?.enabled ? 'Enabled' : 'Disabled'}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end space-x-2">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => setLocation(`/admin/courses/edit/${course.slug}`)}
                          title="Edit Course Content"
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => setLocation(`/admin/courses/reorder/${course.slug}`)}
                          title="Reorder Modules"
                        >
                          <ArrowUpDown className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => {
                            setSelectedCourseSlug(course.slug);
                            setShowEnrollDialog(true);
                          }}
                          title="View Enrollments"
                        >
                          <Eye className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={6} className="h-24 text-center">
                    {searchQuery ? (
                      <div className="flex flex-col items-center justify-center">
                        <Search className="h-8 w-8 text-gray-300 mb-2" />
                        <p className="text-gray-500">No courses match your search.</p>
                      </div>
                    ) : (
                      <div className="flex flex-col items-center justify-center">
                        <School className="h-8 w-8 text-gray-300 mb-2" />
                        <p className="text-gray-500">No courses found. Add your first course to get started.</p>
                      </div>
                    )}
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
          
        </div>
        <div className="flex justify-center items-center space-x-4 py-2">
  {!showAll && (
    <>
      <Button
        variant="outline"
        size="sm"
        onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
        disabled={currentPage === 1}
      >
        Previous
      </Button>
      <span className="text-sm">
        Page {currentPage} of {totalPages}
      </span>
      <Button
        variant="outline"
        size="sm"
        onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
        disabled={currentPage === totalPages}
      >
        Next
      </Button>
    </>
  )}
</div>
      </Card>
      <Dialog open={showEnrollDialog} onOpenChange={(o) => !o && setShowEnrollDialog(false)}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Enrolled Students</DialogTitle>
          </DialogHeader>
          {courseEnrollments.length ? (
            <ul className="space-y-2 text-sm">
              {courseEnrollments.map((e: any) => {
                const student = typeof e.studentId === "string" ? null : e.studentId;
                return (
                  <li key={e._id} className="space-y-1">
  <strong>{student?.name || "Unknown"}</strong> (ID: {student?._id || "?"})
  <div><strong>Enrolled:</strong> {new Date(e.enrollDate).toLocaleDateString()}</div>
  <div><strong>Progress:</strong> {e.percentComplete ?? 0}%</div>
</li>
                );
              })}
            </ul>
          ) : (
            <p className="text-sm text-gray-500">No students enrolled.</p>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

function CoursesSkeleton() {
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
                <div className="flex-1">
                  <Skeleton className="h-5 w-48 mb-1" />
                  <Skeleton className="h-4 w-24" />
                </div>
                <Skeleton className="h-6 w-24 mx-4" />
                <Skeleton className="h-4 w-24 mx-4" />
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

export default Courses;
