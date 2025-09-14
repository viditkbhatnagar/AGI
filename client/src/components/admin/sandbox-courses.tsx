import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Link, useLocation } from "wouter";
import { Badge } from "@/components/ui/badge";
import { Edit, Eye, Plus, Search, SlidersHorizontal, Trash2, Users, School, CalendarClock, Download, SortAsc, SortDesc, ArrowUpDown, FileText, Copy, Shuffle } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useState, useMemo } from "react";
import { useConditionalRender } from '@/lib/permissions-provider';
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
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { CourseSelectionDialog } from "./CourseSelectionDialog";
import { CopyProgressDialog } from "./CopyProgressDialog";
import { HybridCopyDialog } from "./HybridCopyDialog";

// Types for copy operation
interface CopyResult {
  sandboxSlug: string;
  success: boolean;
  newCourseSlug?: string;
  error?: string;
  duplicateHandled?: boolean;
}

interface CopyProgress {
  total: number;
  completed: number;
  current?: string;
  results: CopyResult[];
}

interface CopyResponse {
  results: CopyResult[];
  summary: {
    total: number;
    successful: number;
    failed: number;
  };
}

interface HybridCopyRequest {
  sourceCourseSlug: string;
  selectedModuleIndexes: number[];
  destinationCourseSlug: string;
}

interface HybridCopyResult {
  success: boolean;
  destinationCourseSlug: string;
  copiedModulesCount: number;
  error?: string;
  copiedModules?: Array<{
    sourceIndex: number;
    destinationIndex: number;
    title: string;
  }>;
}

export function SandboxCourses() {
  const { renderIfCanCreate, renderIfCanEdit, renderIfCanDelete } = useConditionalRender();
  const [searchQuery, setSearchQuery] = useState("");
  const [typeFilter, setTypeFilter] = useState<string>('all');
  const [courseNameFilter, setCourseNameFilter] = useState<string>('all');
  const [studentSort, setStudentSort] = useState<'asc' | 'desc'>('asc');
  const [showAll, setShowAll] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 4;
  const [, setLocation] = useLocation();
  
  const { data, isLoading, error } = useQuery<any[]>({
    queryKey: ['/api/sandbox-courses'],
  });

  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [courseToDelete, setCourseToDelete] = useState<string | null>(null);

  // State for copy operation workflow
  const [showCopyDialog, setShowCopyDialog] = useState(false);
  const [showProgressDialog, setShowProgressDialog] = useState(false);
  const [copyProgress, setCopyProgress] = useState<CopyProgress>({
    total: 0,
    completed: 0,
    results: []
  });

  // State for hybrid copy workflow
  const [showHybridCopyDialog, setShowHybridCopyDialog] = useState(false);

  const deleteMutation = useMutation({
    mutationFn: async (slug: string) => {
      const token = localStorage.getItem("token");
      const response = await fetch(`/api/sandbox-courses/${slug}`, {
        method: "DELETE",
        headers: {
          "Authorization": `Bearer ${token}`,
          "Content-Type": "application/json",
        },
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || "Failed to delete sandbox course");
      }

      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/sandbox-courses'] });
      toast({
        title: "Success",
        description: "Sandbox course deleted successfully.",
      });
      setCourseToDelete(null);
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
      setCourseToDelete(null);
    },
  });

  // Copy mutation hook for API call
  const copyMutation = useMutation({
    mutationFn: async (sandboxCourseSlugs: string[]): Promise<CopyResponse> => {
      const token = localStorage.getItem("token");
      const response = await fetch("/api/sandbox-courses/copy-to-courses", {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ sandboxCourseSlugs }),
      });

      if (!response.ok) {
        // Check if response is JSON before parsing
        const contentType = response.headers.get("content-type");
        if (contentType && contentType.includes("application/json")) {
          try {
            const errorData = await response.json();
            throw new Error(errorData.message || "Failed to copy sandbox courses");
          } catch (parseError) {
            throw new Error("Server returned an invalid response");
          }
        } else {
          // Response is not JSON (probably HTML error page)
          const errorText = await response.text();
          if (errorText.includes("<!DOCTYPE")) {
            throw new Error("Server endpoint not found or server is not running properly");
          } else {
            throw new Error(`Server error: ${response.status} ${response.statusText}`);
          }
        }
      }

      try {
        return await response.json();
      } catch (parseError) {
        throw new Error("Server returned an invalid JSON response");
      }
    },
    onSuccess: (result: CopyResponse) => {
      // Update progress to show completion
      setCopyProgress(prev => ({
        ...prev,
        completed: prev.total,
        results: result.results
      }));

      // Show success/failure toast notifications
      const { summary } = result;
      if (summary.failed === 0) {
        toast({
          title: "Copy Operation Successful",
          description: `Successfully copied all ${summary.successful} courses to main courses.`,
        });
      } else if (summary.successful > 0) {
        toast({
          title: "Copy Operation Partially Successful",
          description: `Successfully copied ${summary.successful} of ${summary.total} courses. ${summary.failed} failed.`,
          variant: "destructive",
        });
      } else {
        toast({
          title: "Copy Operation Failed",
          description: `Failed to copy all ${summary.total} courses. Please check the details and try again.`,
          variant: "destructive",
        });
      }

      // Invalidate queries to refresh data
      queryClient.invalidateQueries({ queryKey: ['/api/sandbox-courses'] });
      queryClient.invalidateQueries({ queryKey: ['/api/courses'] });
    },
    onError: (error: Error) => {
      // Update progress to show error state
      setCopyProgress(prev => ({
        ...prev,
        completed: prev.total,
        results: prev.results.map(result => 
          result.success === undefined ? { ...result, success: false, error: error.message } : result
        )
      }));

      toast({
        title: "Copy Operation Failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Hybrid copy mutation hook
  const hybridCopyMutation = useMutation({
    mutationFn: async (request: HybridCopyRequest) => {
      const token = localStorage.getItem("token");
      const response = await fetch("/api/sandbox-courses/hybrid-copy", {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(request),
      });

      if (!response.ok) {
        // Check if response is JSON before parsing
        const contentType = response.headers.get("content-type");
        if (contentType && contentType.includes("application/json")) {
          try {
            const errorData = await response.json();
            throw new Error(errorData.message || "Failed to perform hybrid copy");
          } catch (parseError) {
            throw new Error("Server returned an invalid response");
          }
        } else {
          // Response is not JSON (probably HTML error page)
          const errorText = await response.text();
          if (errorText.includes("<!DOCTYPE")) {
            throw new Error("Server endpoint not found or server is not running properly");
          } else {
            throw new Error(`Server error: ${response.status} ${response.statusText}`);
          }
        }
      }

      // Parse successful response
      try {
        return await response.json();
      } catch (parseError) {
        throw new Error("Server returned an invalid JSON response");
      }
    },
    onSuccess: (result: { success: boolean; result: HybridCopyResult; message: string }) => {
      if (result.success) {
        toast({
          title: "Hybrid Copy Successful",
          description: result.message,
        });
      } else {
        toast({
          title: "Hybrid Copy Failed",
          description: result.result.error || "Unknown error occurred",
          variant: "destructive",
        });
      }

      // Invalidate queries to refresh data
      queryClient.invalidateQueries({ queryKey: ['/api/courses'] });
      queryClient.invalidateQueries({ queryKey: ['/api/admin/courses'] });
      
      // Close dialog
      setShowHybridCopyDialog(false);
    },
    onError: (error: Error) => {
      console.error('Hybrid copy error:', error);
      
      let errorMessage = error.message;
      let description = "Please try again or contact support if the issue persists.";
      
      // Provide specific guidance based on error type
      if (error.message.includes("Server endpoint not found")) {
        description = "The server appears to be down or the API endpoint is not available. Please check if the server is running.";
      } else if (error.message.includes("No token") || error.message.includes("authorization denied")) {
        description = "You are not authenticated. Please log out and log back in.";
      } else if (error.message.includes("Token is not valid")) {
        description = "Your session has expired. Please log out and log back in.";
      }
      
      toast({
        title: "Hybrid Copy Failed",
        description: `${errorMessage}. ${description}`,
        variant: "destructive",
      });
    },
  });

  // Handle hybrid copy operation
  const handleHybridCopy = () => {
    setShowHybridCopyDialog(true);
  };

  // Handle hybrid copy confirm
  const handleHybridCopyConfirm = (request: HybridCopyRequest) => {
    hybridCopyMutation.mutate(request);
  };

  const handleDeleteCourse = (slug: string) => {
    setCourseToDelete(slug);
  };

  const confirmDelete = () => {
    if (courseToDelete) {
      deleteMutation.mutate(courseToDelete);
    }
  };

  // Handle copy operation initiation
  const handleCopyToCourses = () => {
    if (data && data.length > 0) {
      setShowCopyDialog(true);
    } else {
      toast({
        title: "No Courses Available",
        description: "There are no sandbox courses to copy.",
        variant: "destructive",
      });
    }
  };

  // Handle copy operation workflow
  const handleCopyConfirm = (selectedCourses: string[]) => {
    // Close selection dialog and show progress dialog
    setShowCopyDialog(false);
    setShowProgressDialog(true);

    // Initialize progress state
    setCopyProgress({
      total: selectedCourses.length,
      completed: 0,
      current: "Preparing copy operation...",
      results: selectedCourses.map(slug => ({
        sandboxSlug: slug,
        success: false
      }))
    });

    // Start the copy operation
    copyMutation.mutate(selectedCourses);
  };

  // Handle progress dialog close
  const handleProgressDialogClose = () => {
    setShowProgressDialog(false);
    
    // If copy was successful, redirect to main courses page with newly copied course slugs
    const successfulCopies = copyProgress.results.filter(result => result.success);
    if (successfulCopies.length > 0 && copyProgress.completed === copyProgress.total) {
      // Get the new course slugs to highlight them
      const newCourseSlugs = successfulCopies
        .map(result => result.newCourseSlug)
        .filter(Boolean)
        .join(',');
      
      // Redirect immediately to main courses page with highlighting
      if (newCourseSlugs) {
        setLocation(`/admin/courses?highlight=${encodeURIComponent(newCourseSlugs)}`);
      } else {
        setLocation("/admin/courses");
      }
    }
  };
  
  const handleDownload = () => {
    const header = ['Course','Type','Modules','Documents','Live Classes'];
    const rows = (sortedCourses || []).map((c: any) => [
      c.title,
      c.type === 'with-mba' ? 'With MBA' : 'Standalone',
      c.modules?.length ?? 0,
      c.modules?.reduce((total: number, m: any) => total + (m.documents?.length ?? 0), 0) ?? 0,
      c.liveClassConfig?.enabled ? 'Enabled' : 'Disabled',
    ]);
    const csv = [header, ...rows]
      .map((r: any) => r.map((cell: any) => `"${cell}"`).join(','))
      .join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'sandbox-courses.csv';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const [showDetailDialog, setShowDetailDialog] = useState(false);
  const [selectedCourseSlug, setSelectedCourseSlug] = useState<string | null>(null);
  const selectedCourse = useMemo(
    () => data?.find((c: any) => c.slug === selectedCourseSlug) || null,
    [data, selectedCourseSlug]
  );
  
  const query = searchQuery.toLowerCase();
  const filteredCourses = data?.filter((course: any) =>
    (
      course.title.toLowerCase().includes(query) ||
      course.slug.toLowerCase().includes(query) ||
      course.modules?.some((m: any) =>
        m.title.toLowerCase().includes(query)
      )
    ) &&
    (typeFilter === 'all' || course.type === typeFilter) &&
    (courseNameFilter === 'all' || course.title === courseNameFilter)
  );

  const sortedCourses = useMemo(() => {
    if (!filteredCourses) return [];
    return filteredCourses.slice().sort((a, b) => {
      const ca = a.modules?.length || 0;
      const cb = b.modules?.length || 0;
      return studentSort === 'asc' ? ca - cb : cb - ca;
    });
  }, [filteredCourses, studentSort]);
  
  const totalPages = Math.ceil((sortedCourses.length || 0) / itemsPerPage);
  const displayedCourses = showAll
    ? sortedCourses
    : sortedCourses.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);
  
  if (isLoading) {
    return <SandboxCoursesSkeleton />;
  }
  
  if (error) {
    return (
      <div className="p-6">
        <h1 className="text-2xl font-bold text-gray-800 mb-4">Sandbox Courses</h1>
        <Card>
          <CardContent className="p-6">
            <p className="text-red-500">Error loading sandbox courses data. Please try again later.</p>
          </CardContent>
        </Card>
      </div>
    );
  }
  
  return (
    <div className="p-4 md:p-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">Sandbox Courses</h1>
          <p className="text-sm text-gray-600 mt-1">
            Upload and manage courses with document files instead of links
          </p>
        </div>
        <div className="mt-2 md:mt-0 flex gap-2">
          {renderIfCanCreate(
            <Button 
              onClick={handleCopyToCourses}
              disabled={copyMutation.isPending || !data || data.length === 0}
              variant="outline"
            >
              <Copy className="mr-2 h-4 w-4" />
              {copyMutation.isPending ? "Copying..." : "Copy to Courses"}
            </Button>
          )}
          {renderIfCanCreate(
            <Button 
              onClick={handleHybridCopy}
              disabled={hybridCopyMutation.isPending || !data || data.length === 0}
              variant="outline"
            >
              <Shuffle className="mr-2 h-4 w-4" />
              {hybridCopyMutation.isPending ? "Processing..." : "Hybrid Copy"}
            </Button>
          )}
          {renderIfCanCreate(
            <Button onClick={() => setLocation("/admin/sandbox-courses/new")}>
              <FileText className="mr-2 h-4 w-4" />
              Add Sandbox Course
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
                placeholder="Search by course name or module name..."
                className="pl-8"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
            <div className="flex items-center text-lg font-bold">
              Total Sandbox Courses: {sortedCourses.length}
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
                Fewest Modules
              </Button>
              <Button variant="outline" size="sm" onClick={() => setStudentSort('desc')}>
                <SortDesc className="mr-2 h-4 w-4" />
                Most Modules
              </Button>
              <Button variant="outline" size="sm" onClick={handleDownload}>
                <Download className="mr-2 h-4 w-4" />
                Export CSV
              </Button>
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
                <TableHead className="font-bold">Modules</TableHead>
                <TableHead className="font-bold">Documents</TableHead>
                <TableHead className="font-bold">Live Classes</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {sortedCourses.length > 0 ? (
                displayedCourses.map((course) => (
                  <TableRow key={course._id || course.slug}>
                    <TableCell>
                      <div className="text-lg font-bold text-gray-900">{course.title}</div>
                      <div className="text-xs text-gray-500 flex items-center mt-1">
                        <FileText className="h-3 w-3 mr-1" />
                        Sandbox Course
                      </div>
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
                      <div className="text-sm text-gray-900 space-y-1">
                        {course.modules?.map((m: any, index: number) => (
                          <div key={index} className="flex items-start">
                            <span className="mr-2">•</span>
                            <span>
                              {m.title} ({m.videos?.length ?? 0} videos, {m.documents?.length ?? 0} documents)
                            </span>
                          </div>
                        )) || <div>No modules</div>}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center">
                        <FileText className="h-4 w-4 text-gray-400 mr-1" />
                        <span className="text-sm text-gray-500">
                          {course.modules?.reduce((total: number, m: any) => total + (m.documents?.length ?? 0), 0) ?? 0} uploaded files
                        </span>
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
                        {renderIfCanEdit(
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => setLocation(`/admin/sandbox-courses/edit/${course.slug}`)}
                            title="Edit Sandbox Course"
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                        )}
                        {renderIfCanEdit(
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => setLocation(`/admin/sandbox-courses/reorder/${course.slug}`)}
                            title="Reorder Modules"
                          >
                            <ArrowUpDown className="h-4 w-4" />
                          </Button>
                        )}
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => {
                            setSelectedCourseSlug(course.slug);
                            setShowDetailDialog(true);
                          }}
                          title="View Course Details"
                        >
                          <Eye className="h-4 w-4" />
                        </Button>
                        {renderIfCanDelete(
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleDeleteCourse(course.slug)}
                            title="Delete Sandbox Course"
                            className="text-red-600 hover:text-red-700 hover:bg-red-50"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        )}
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
                        <p className="text-gray-500">No sandbox courses match your search.</p>
                      </div>
                    ) : (
                      <div className="flex flex-col items-center justify-center">
                        <FileText className="h-8 w-8 text-gray-300 mb-2" />
                        <p className="text-gray-500">No sandbox courses found. Create your first sandbox course to get started.</p>
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
      
      <Dialog open={showDetailDialog} onOpenChange={(o) => !o && setShowDetailDialog(false)}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Sandbox Course Details</DialogTitle>
          </DialogHeader>
          {selectedCourse ? (
            <div className="space-y-4">
              <div>
                <h3 className="font-semibold text-lg">{selectedCourse.title}</h3>
                <p className="text-sm text-gray-500">Slug: {selectedCourse.slug}</p>
              </div>
              
              <div className="space-y-2">
                <h4 className="font-medium">Modules ({selectedCourse.modules?.length || 0})</h4>
                {selectedCourse.modules?.map((module: any, index: number) => (
                  <div key={index} className="border rounded p-3 space-y-1">
                    <div className="font-medium">{module.title}</div>
                    <div className="text-sm text-gray-600">
                      • {module.videos?.length || 0} videos
                    </div>
                    <div className="text-sm text-gray-600">
                      • {module.documents?.length || 0} uploaded documents
                    </div>
                    {module.documents?.map((doc: any, docIndex: number) => (
                      <div key={docIndex} className="text-xs text-gray-500 ml-4 flex items-center">
                        <FileText className="h-3 w-3 mr-1" />
                        {doc.title} ({doc.fileName})
                      </div>
                    ))}
                  </div>
                )) || <p className="text-sm text-gray-500">No modules added yet.</p>}
              </div>
            </div>
          ) : (
            <p className="text-sm text-gray-500">Course details not available.</p>
          )}
        </DialogContent>
      </Dialog>

      {/* Course Selection Dialog */}
      <CourseSelectionDialog
        sandboxCourses={data || []}
        isOpen={showCopyDialog}
        onClose={() => setShowCopyDialog(false)}
        onConfirm={handleCopyConfirm}
        isLoading={copyMutation.isPending}
      />

      {/* Copy Progress Dialog */}
      <CopyProgressDialog
        isOpen={showProgressDialog}
        progress={copyProgress}
        onClose={handleProgressDialogClose}
      />

      {/* Hybrid Copy Dialog */}
      <HybridCopyDialog
        isOpen={showHybridCopyDialog}
        onClose={() => setShowHybridCopyDialog(false)}
        onConfirm={handleHybridCopyConfirm}
        isLoading={hybridCopyMutation.isPending}
      />

      {/* Delete Confirmation Dialog */}
      <Dialog open={!!courseToDelete} onOpenChange={() => setCourseToDelete(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Sandbox Course</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete this sandbox course? This action cannot be undone. 
              All course data, modules, documents, and quizzes will be permanently removed.
            </DialogDescription>
          </DialogHeader>
          <div className="flex justify-end space-x-2 mt-4">
            <Button 
              variant="outline" 
              onClick={() => setCourseToDelete(null)}
              disabled={deleteMutation.isPending}
            >
              Cancel
            </Button>
            <Button 
              variant="destructive" 
              onClick={confirmDelete}
              disabled={deleteMutation.isPending}
            >
              {deleteMutation.isPending ? "Deleting..." : "Delete Course"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function SandboxCoursesSkeleton() {
  return (
    <div className="p-4 md:p-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6">
        <Skeleton className="h-8 w-48" />
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

export default SandboxCourses;
