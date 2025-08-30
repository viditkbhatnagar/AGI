import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useState, useMemo, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Link, useLocation } from "wouter";
import { Badge } from "@/components/ui/badge";
import { CalendarClock, CalendarPlus, Calendar, Edit, Ellipsis, ExternalLink, Plus, Search, SlidersHorizontal, Trash2, SortAsc, SortDesc, Download } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { formatDate, formatDateTime, formatTime } from "@/lib/utils";

export function LiveClasses() {
  const [searchQuery, setSearchQuery] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;
  const [dateSort, setDateSort] = useState<'asc'|'desc'>('desc');
  const [, setLocation] = useLocation();

  // --- Filter state ---
  const [titleFilter, setTitleFilter] = useState("");
  const [descFilter, setDescFilter] = useState("");
  const [courseFilter, setCourseFilter] = useState("");
  const [assignedFilter, setAssignedFilter] = useState("");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all"|"upcoming"|"in-progress"|"completed">("all");

  const [editId, setEditId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState<any>(null);

  // --- Student selection state & available students query
  const [studentSearch, setStudentSearch] = useState<string>("");
  const { data: classEnrollments = [] } = useQuery({
    queryKey: ["enrollmentsByCourse", editForm?.courseSlug],
    queryFn: async () => {
      const token = localStorage.getItem("token");
      const res = await fetch(`/api/enrollments/course/${editForm.courseSlug}`, {
        credentials: "include",
        headers: token ? { Authorization: `Bearer ${token}` } : undefined,
      });
      if (!res.ok) return [];
      return res.json();
    },
    enabled: !!editForm?.courseSlug,
  });

  const queryClient = useQueryClient();
  
  const { data, isLoading, error } = useQuery({
    queryKey: ['/api/live-classes'],
  });

  // Summary counts
  const now = Date.now();
  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);
  const todayEnd = new Date();
  todayEnd.setHours(23, 59, 59, 999);

  const totalScheduled = data?.length || 0;
  const totalToday = data?.filter(lc => {
    const st = new Date(lc.startTime).getTime();
    return st >= todayStart.getTime() && st <= todayEnd.getTime();
  }).length || 0;
  const totalUpcoming = data?.filter(lc => new Date(lc.startTime).getTime() > now).length || 0;
  const totalInProgress = data?.filter(lc => {
    const st = new Date(lc.startTime).getTime();
    const et = new Date(lc.endTime).getTime();
    return now >= st && now <= et;
  }).length || 0;
  const totalCompleted = data?.filter(lc => new Date(lc.endTime).getTime() < now).length || 0;

  const { data: students = [] } = useQuery({
    queryKey: ['/api/admin/students'],
    // ensure auth cookie/header already included globally
  });
  const { data: coursesList = [] } = useQuery({
    queryKey: ['/api/courses'],
  });

  const studentMap = useMemo(
    () => new Map(students.map((s: any) => [s._id, s.name])),
    [students]
  );
  const availableStudents = useMemo(
    () =>
      classEnrollments.map((e: any) => {
        const id = typeof e.studentId === "string" ? e.studentId : e.studentId?._id;
        return { id, name: studentMap.get(id) || id };
      }),
    [classEnrollments, studentMap]
  );

  // Function to get module name by course slug and module index
  const getModuleName = (courseSlug: string, moduleIndex: number): string => {
    const course = coursesList.find((c: any) => c.slug === courseSlug);
    if (!course || !course.modules || moduleIndex < 0 || moduleIndex >= course.modules.length) {
      return 'Unknown Module';
    }
    return course.modules[moduleIndex]?.title || 'Unknown Module';
  };

  // Fetch single class details when editId changes
  const { data: editData, isLoading: loadingEdit } = useQuery({
    queryKey: ["live-class", editId],
    queryFn: async () => {
      const token = localStorage.getItem("token");
      const res = await fetch(`/api/live-classes/${editId}`, {
        credentials: "include",
        headers: token ? { Authorization: `Bearer ${token}` } : undefined,
      });
      if (!res.ok) {
        throw new Error("Failed to fetch live class details");
      }
      return res.json();
    },
    enabled: !!editId,
  });

  // Populate form when data arrives
  useEffect(() => {
    if (editData) {
      // Convert UTC timestamps to local datetime-local format for the input fields
      const formatForDatetimeLocal = (utcString: string) => {
        const date = new Date(utcString);
        // Get local date/time and format as YYYY-MM-DDTHH:MM
        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const day = String(date.getDate()).padStart(2, '0');
        const hours = String(date.getHours()).padStart(2, '0');
        const minutes = String(date.getMinutes()).padStart(2, '0');
        return `${year}-${month}-${day}T${hours}:${minutes}`;
      };
      
      const convertedData = {
        ...editData,
        startTime: editData.startTime ? formatForDatetimeLocal(editData.startTime) : '',
        endTime: editData.endTime ? formatForDatetimeLocal(editData.endTime) : '',
      };
      setEditForm(convertedData);
    }
  }, [editData]);

  // Mutation to update live class
  const updateMutation = useMutation({
    mutationFn: async (payload: any) => {
      const token = localStorage.getItem("token");
      await fetch(`/api/live-classes/${payload._id}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        credentials: "include",
        body: JSON.stringify(payload),
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['/api/live-classes']);
      setEditId(null);
    },
  });

const [deleteId, setDeleteId] = useState<string | null>(null);
const [showDeleteDialog, setShowDeleteDialog] = useState(false);
const [deleteConfirm, setDeleteConfirm] = useState("");

const deleteMutation = useMutation({
  mutationFn: async (id: string) => {
    const token = localStorage.getItem("token");
    await fetch(`/api/live-classes/${id}`, {
      method: "DELETE",
      credentials: "include",
      headers: token ? { Authorization: `Bearer ${token}` } : undefined,
    });
  },
  onSuccess: () => {
    queryClient.invalidateQueries(['/api/live-classes']);
    setShowDeleteDialog(false);
    setDeleteConfirm("");
  },
});
  
  
  const filteredLiveClasses = data?.filter(lc => {
    // Main search box filter: title, description, or student name
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      const titleMatch = lc.title.toLowerCase().includes(q);
      const descMatch = lc.description.toLowerCase().includes(q);
      const studentNames = (lc.studentIds || [])
        .map(id => studentMap.get(id) || "")
        .join(" ")
        .toLowerCase();
      if (!titleMatch && !descMatch && !studentNames.includes(q)) {
        return false;
      }
    }
    // Title filter
    if (titleFilter && !lc.title.toLowerCase().includes(titleFilter.toLowerCase())) return false;
    // Description filter
    if (descFilter && !lc.description.toLowerCase().includes(descFilter.toLowerCase())) return false;
    // Course filter
    if (courseFilter && lc.courseSlug !== courseFilter) return false;
    // Assigned to filter
    if (assignedFilter) {
      const names = lc.studentIds.map((id: string) => studentMap.get(id) || id);
      if (!names.some((n: string) => n.toLowerCase().includes(assignedFilter.toLowerCase()))) return false;
    }
    // Date range filter
    const start = new Date(lc.startTime).getTime();
    if (dateFrom && start < new Date(dateFrom).getTime()) return false;
    if (dateTo && start > new Date(dateTo).getTime()) return false;
    // Status filter
    const now = Date.now();
    let status: string;
    if (now < start) status = "upcoming";
    else if (now >= start && now <= new Date(lc.endTime).getTime()) status = "in-progress";
    else status = "completed";
    if (statusFilter !== "all" && status !== statusFilter) return false;
    return true;
  }) ?? [];

  const sortedFiltered = useMemo(() => {
    const now = Date.now();
    return filteredLiveClasses.slice().sort((a, b) => {
      const aStart = new Date(a.startTime).getTime();
      const aEnd = new Date(a.endTime).getTime();
      const bStart = new Date(b.startTime).getTime();
      const bEnd = new Date(b.endTime).getTime();
      const aInProgress = now >= aStart && now <= aEnd;
      const bInProgress = now >= bStart && now <= bEnd;
      if (aInProgress && !bInProgress) return -1;
      if (bInProgress && !aInProgress) return 1;
      // both same in-progress status, fall back to date ordering
      // upcoming first
      if (aStart >= now && bStart >= now) return aStart - bStart;
      if (aStart >= now && bStart < now) return -1;
      if (bStart >= now && aStart < now) return 1;
      // both past: most recent past first
      return bStart - aStart;
    });
  }, [filteredLiveClasses]);

  const totalPages = Math.ceil(sortedFiltered.length / itemsPerPage);
  const paginatedClasses = sortedFiltered.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );
  
  const handleDownload = () => {
    const header = ['Title','Description','Course','Assigned To','Start Time','End Time','Duration','Status'];
    // Use filtered (and sorted) list, not just paginated
    const list = sortedFiltered;
    const rows = list.map(lc => {
      // Assigned names
      const names = (lc.studentIds || [])
        .map(id => studentMap.get(id) || id)
        .join('; ');
      // Duration in minutes
      const duration = Math.round((new Date(lc.endTime).getTime() - new Date(lc.startTime).getTime()) / 60000);
      // Status
      const now = Date.now();
      const start = new Date(lc.startTime).getTime();
      const end = new Date(lc.endTime).getTime();
      let status = '';
      if (now < start) status = 'Upcoming';
      else if (now >= start && now <= end) status = 'In Progress';
      else status = 'Completed';
      return [
        lc.title,
        lc.description,
        lc.courseSlug,
        names,
        lc.startTime,
        lc.endTime,
        `${duration} min`,
        status
      ];
    });
    const csv = [header, ...rows]
      .map(r => r.map(c => `"${String(c).replace(/"/g,'""')}"`).join(','))
      .join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', 'live-classes.csv');
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };
  
  if (isLoading) {
    return <LiveClassesSkeleton />;
  }
  
  if (error) {
    return (
      <div className="p-6">
        <h1 className="text-2xl font-bold text-gray-800 mb-4">Live Classes</h1>
        <Card>
          <CardContent className="p-6">
            <p className="text-red-500">Error loading live classes data. Please try again later.</p>
          </CardContent>
        </Card>
      </div>
    );
  }
  
  return (
    <div className="p-4 md:p-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6">
        <h1 className="text-2xl font-bold text-gray-800">Live Classes</h1>
        <div className="mt-2 md:mt-0">
          <Button onClick={() => setLocation("/admin/live-classes/new")}>
            <CalendarPlus className="mr-2 h-4 w-4" />
            Schedule Live Class
          </Button>
        </div>
      </div>
      
      <Card className="mb-6">
        <CardContent className="p-4">
          <div className="flex flex-col md:flex-row justify-between items-center gap-4">
            <div className="relative w-full md:w-80">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-gray-500" />
              <Input
                placeholder="Search by live class title, description or student name..."
                className="pl-8 w-full"
                value={searchQuery}
                onChange={(e) => {
                  setSearchQuery(e.target.value);
                  setCurrentPage(1);
                }}
              />
            </div>
            <div className="flex flex-col md:flex-row items-center space-y-2 md:space-y-0 md:space-x-6 text-sm">
              <div className="bg-orange-200 px-2 py-1 rounded">
                Total Classes Today: {totalToday} classes
              </div>
              <div className="bg-blue-200 px-2 py-1 rounded">
                Upcoming Classes : {totalUpcoming} classes
              </div>
              <div className="bg-yellow-200 px-2 py-1 rounded">
                In Progress: {totalInProgress} classes
              </div>
              <div className="bg-green-200 px-2 py-1 rounded">
                Completed: {totalCompleted} classes
              </div>
              <div className="bg-cyan-200 px-2 py-1 rounded">
                Total Scheduled Till Date: {totalScheduled} classes
              </div>
            </div>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={handleDownload}>
                <Download className="mr-2 h-4 w-4" />
                Export CSV
              </Button>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" size="sm">
                    <SlidersHorizontal className="mr-2 h-4 w-4" />
                    Filters
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="start" side="bottom" className="w-full max-w-sm p-4 space-y-3">
                  <div>
                    <label className="block text-sm font-medium">Title</label>
                    <Input
                      value={titleFilter}
                      onChange={e => { setTitleFilter(e.target.value); setCurrentPage(1); }}
                      placeholder="Title contains..."
                      className="mt-1 w-full"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium">Description</label>
                    <Input
                      value={descFilter}
                      onChange={e => { setDescFilter(e.target.value); setCurrentPage(1); }}
                      placeholder="Description contains..."
                      className="mt-1 w-full"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium">Course</label>
                    <select
                      value={courseFilter}
                      onChange={e => { setCourseFilter(e.target.value); setCurrentPage(1); }}
                      className="mt-1 block w-full border rounded px-2 py-1"
                    >
                      <option value="">All Courses</option>
                      {coursesList.map((c: any) => (
                        <option key={c.slug} value={c.slug}>
                          {c.title}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium">Assigned To</label>
                    <Input
                      value={assignedFilter}
                      onChange={e => { setAssignedFilter(e.target.value); setCurrentPage(1); }}
                      placeholder="Student name..."
                      className="mt-1 w-full"
                    />
                  </div>
                  <div className="flex space-x-2">
                    <div className="flex-1">
                      <label className="block text-sm font-medium">From Date</label>
                      <Input
                        type="date"
                        value={dateFrom}
                        onChange={e => { setDateFrom(e.target.value); setCurrentPage(1); }}
                        className="mt-1 w-full"
                      />
                    </div>
                    <div className="flex-1">
                      <label className="block text-sm font-medium">To Date</label>
                      <Input
                        type="date"
                        value={dateTo}
                        onChange={e => { setDateTo(e.target.value); setCurrentPage(1); }}
                        className="mt-1 w-full"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium">Status</label>
                    <select
                      value={statusFilter}
                      onChange={e => { setStatusFilter(e.target.value as any); setCurrentPage(1); }}
                      className="mt-1 block w-full border rounded px-2 py-1"
                    >
                      <option value="all">All</option>
                      <option value="upcoming">Upcoming</option>
                      <option value="in-progress">In Progress</option>
                      <option value="completed">Completed</option>
                    </select>
                  </div>
                  <div className="pt-2 border-t mt-2">
                    <Button
                      variant="outline"
                      size="sm"
                      className="w-full"
                      onClick={() => {
                        setTitleFilter("");
                        setDescFilter("");
                        setCourseFilter("");
                        setAssignedFilter("");
                        setDateFrom("");
                        setDateTo("");
                        setStatusFilter("all");
                        setSearchQuery("");
                        setCurrentPage(1);
                      }}
                    >
                      Clear All Filters
                    </Button>
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
                <TableHead className="font-bold">Class Title</TableHead>
                <TableHead className="font-bold">Class Description</TableHead>
                <TableHead className="font-bold">Course</TableHead>
                <TableHead className="font-bold">Module</TableHead>
                <TableHead className="font-bold">Assigned To</TableHead>
                <TableHead className="font-bold">Date & Time</TableHead>
                <TableHead className="font-bold">Duration</TableHead>
                <TableHead className="font-bold">Status</TableHead>
                <TableHead className="font-bold">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {paginatedClasses.length > 0 ? (
                paginatedClasses.map((liveClass, idx) => (
                  <TableRow key={liveClass._id}>
                    <TableCell className="text-sm text-gray-700">
                      {(currentPage - 1) * itemsPerPage + idx + 1}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center">
                        <div className="text-sm font-medium text-gray-900 whitespace-normal break-words">
                          {liveClass.title}
                        </div>
                      </div>
                    </TableCell>
                    <TableCell className="text-sm text-gray-700 whitespace-normal break-words">
                      {liveClass.description}
                    </TableCell>
                    <TableCell>
                      <div className="text-sm text-gray-500">{liveClass.courseSlug}</div>
                    </TableCell>
                    <TableCell>
                      <div className="text-sm text-gray-900">
                        <div className="font-medium">Module {(liveClass.moduleIndex ?? 0) + 1}</div>
                        <div className="text-xs text-gray-500">{getModuleName(liveClass.courseSlug, liveClass.moduleIndex ?? 0)}</div>
                      </div>
                    </TableCell>
                    <TableCell className="text-sm text-gray-700 whitespace-normal">
                      {liveClass.studentIds?.length ? (
                        (liveClass.studentIds
                          .map((id: string) => studentMap.get(id) || id)
                          .join(', '))
                      ) : (
                        <div>No assignees</div>
                      )}
                    </TableCell>
                    <TableCell>
                      <div className="text-sm font-medium text-gray-900">{formatDate(liveClass.startTime)}</div>
                      <div className="text-xs text-gray-500">
                        {formatTime(liveClass.startTime)} - {formatTime(liveClass.endTime)}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="text-sm text-gray-500">
                        {Math.round((new Date(liveClass.endTime).getTime() - new Date(liveClass.startTime).getTime()) / (1000 * 60))} minutes
                      </div>
                    </TableCell>
                    <TableCell>
                      {(() => {
                        const now = Date.now();
                        const start = new Date(liveClass.startTime).getTime();
                        const end = new Date(liveClass.endTime).getTime();
                        let label = '';
                        let classes = '';

                        if (now < start) {
                          label = 'Upcoming';
                          classes = 'bg-blue-100 text-blue-800 hover:bg-blue-200';
                        } else if (now >= start && now <= end) {
                          label = 'In Progress';
                          classes = 'bg-yellow-100 text-yellow-800 hover:bg-yellow-200';
                        } else {
                          label = 'Completed';
                          classes = 'bg-green-100 text-green-800 hover:bg-green-200';
                        }

                        return (
                          <Badge variant="outline" className={classes}>
                            {label}
                          </Badge>
                        );
                      })()}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2">
                        {liveClass.meetLink && (
                          <Button variant="ghost" size="icon" asChild>
                            <a href={liveClass.meetLink} target="_blank" rel="noopener noreferrer">
                              <ExternalLink className="h-4 w-4" />
                            </a>
                          </Button>
                        )}
                        <Button
                          variant="ghost"
                          size="icon"
                          disabled={!(new Date(liveClass.startTime).getTime() > Date.now())}
                          onClick={() => setEditId(liveClass._id)}
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          disabled={!(new Date(liveClass.startTime).getTime() > Date.now())}
                          onClick={() => {
                            setDeleteId(liveClass._id);
                            setShowDeleteDialog(true);
                          }}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={8} className="h-24 text-center">
                    {searchQuery ? (
                      <div className="flex flex-col items-center justify-center">
                        <Search className="h-8 w-8 text-gray-300 mb-2" />
                        <p className="text-gray-500">No live classes match your search.</p>
                      </div>
                    ) : (
                      <div className="flex flex-col items-center justify-center">
                        <CalendarClock className="h-8 w-8 text-gray-300 mb-2" />
                        <p className="text-gray-500">No live classes found. Schedule your first live class to get started.</p>
                      </div>
                    )}
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
          <div className="flex justify-center items-center gap-4 py-4">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
              disabled={currentPage === 1}
            >
              Previous
            </Button>
            <span className="text-sm">Page {currentPage} of {totalPages}</span>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
              disabled={currentPage === totalPages}
            >
              Next
            </Button>
          </div>
        </div>
      </Card>

      <Dialog open={!!editId} onOpenChange={(o) => !o && setEditId(null)}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Edit Live Class</DialogTitle>
          </DialogHeader>
          {loadingEdit || !editForm ? (
            <div className="py-8 text-center text-sm text-gray-500">Loading…</div>
          ) : (
            <form
              onSubmit={(e) => {
                e.preventDefault();
                // Convert datetime-local strings to ISO strings (UTC) before updating
                const updatedForm = {
                  ...editForm,
                  startTime: editForm.startTime ? new Date(editForm.startTime).toISOString() : editForm.startTime,
                  endTime: editForm.endTime ? new Date(editForm.endTime).toISOString() : editForm.endTime,
                };
                updateMutation.mutate(updatedForm);
              }}
              className="space-y-4"
            >
              <Input
                label="Title"
                value={editForm.title}
                onChange={(e) => setEditForm({ ...editForm, title: e.target.value })}
              />
              <textarea
                label="Description"
                rows={3}
                className="block w-full border rounded px-3 py-2"
                value={editForm.description}
                onChange={(e) => setEditForm({ ...editForm, description: e.target.value })}
              />
              <Input
                label="Course"
                value={editForm.courseSlug}
                disabled
              />
              {/* Student selection */}
              <div>
                <label className="block text-sm font-medium">Students</label>
                <div className="mt-1 flex items-center space-x-2">
                  <Input
                    placeholder="Search students..."
                    value={studentSearch}
                    onChange={(e) => setStudentSearch(e.target.value)}
                    className="flex-1"
                  />
                </div>
                <div className="mt-2 max-h-40 overflow-y-auto border rounded p-2">
                  {availableStudents
                    .filter((s) =>
                      s.name.toLowerCase().includes(studentSearch.toLowerCase())
                    )
                    .map((s) => (
                      <label key={s.id} className="flex items-center mb-1">
                        <input
                          type="checkbox"
                          value={s.id}
                          checked={editForm.studentIds.includes(s.id)}
                          onChange={(e) => {
                            const { value, checked } = e.target;
                            setEditForm((prev: any) => {
                              const ids = checked
                                ? [...prev.studentIds, value]
                                : prev.studentIds.filter((id: string) => id !== value);
                              return { ...prev, studentIds: ids };
                            });
                          }}
                          className="mr-2"
                        />
                        {s.name}
                      </label>
                    ))}
                </div>
              </div>
              <Input
                label="Meeting Link"
                value={editForm.meetLink}
                onChange={(e) => setEditForm({ ...editForm, meetLink: e.target.value })}
              />
              <div className="grid grid-cols-2 gap-4">
                <Input
                  label="Start Time"
                  type="datetime-local"
                  value={editForm.startTime}
                  onChange={(e) => setEditForm({ ...editForm, startTime: e.target.value })}
                />
                <Input
                  label="End Time"
                  type="datetime-local"
                  value={editForm.endTime}
                  onChange={(e) => setEditForm({ ...editForm, endTime: e.target.value })}
                />
              </div>
              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={() => setEditId(null)}>Cancel</Button>
                <Button type="submit" disabled={updateMutation.isLoading}>Save</Button>
              </div>
            </form>
          )}
        </DialogContent>
      </Dialog>
    {/* Delete Dialog moved inside component return */}
    <Dialog open={showDeleteDialog} onOpenChange={(open) => !open && setShowDeleteDialog(false)}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>Confirm Delete</DialogTitle>
        </DialogHeader>
        <p className="text-sm mb-4">Type <code>YES I AM SURE</code> to confirm deletion.</p>
        <Input
          value={deleteConfirm}
          onChange={(e) => setDeleteConfirm(e.target.value)}
          placeholder="Type exactly: YES I AM SURE"
        />
        <div className="flex justify-end mt-4 gap-2">
          <Button variant="outline" onClick={() => setShowDeleteDialog(false)}>
            Cancel
          </Button>
          <Button
            variant="destructive"
            disabled={deleteConfirm !== "YES I AM SURE" || !deleteId}
            onClick={() => deleteId && deleteMutation.mutate(deleteId)}
          >
            Delete
          </Button>
        </div>
      </DialogContent>
    </Dialog>
    </div>
  );
}

function LiveClassesSkeleton() {
  return (
    <div className="p-4 md:p-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6">
        <Skeleton className="h-8 w-40" />
        <Skeleton className="h-10 w-48 mt-2 md:mt-0" />
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
                  <Skeleton className="h-4 w-4 rounded-full mr-2" />
                  <Skeleton className="h-5 w-40" />
                </div>
                <Skeleton className="h-4 w-32 mx-4" />
                <div className="mx-4 w-32">
                  <Skeleton className="h-5 w-full mb-1" />
                  <Skeleton className="h-3 w-24" />
                </div>
                <Skeleton className="h-4 w-24 mx-4" />
                <Skeleton className="h-6 w-24 mx-4" />
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

export default LiveClasses;
