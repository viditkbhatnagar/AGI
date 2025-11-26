import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Switch } from '@/components/ui/switch';
import { useToast } from '@/hooks/use-toast';
import { Upload, Trash2, Edit, Eye, Calendar, Clock, FileVideo, Users, Search, Filter, ChevronLeft, ChevronRight, X } from 'lucide-react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiRequest } from '@/lib/queryClient';
import { useConditionalRender } from '@/lib/permissions-provider';

interface Recording {
  _id: string;
  courseSlug: string;
  moduleIndex: number;
  classDate: string;
  title: string;
  description?: string;
  fileUrl: string;
  uploadedBy: string;
  uploadedAt: string;
  isVisible: boolean;
}

interface Course {
  _id: string;
  slug: string;
  title: string;
  modules: Array<{ title: string }>;
}

interface ModuleOption {
  index: number;
  title: string;
}

interface FilterState {
  courseSlug: string;
  titleSearch: string;
  dateAdded: string;
  classDate: string;
}

// Removed LiveClass interface since we no longer use live class associations

export function AdminRecordings() {
  const { renderIfCanCreate, renderIfCanEdit, renderIfCanDelete } = useConditionalRender();
  const [isUploading, setIsUploading] = useState(false);
  const [uploadForm, setUploadForm] = useState({
    courseSlug: '',
    moduleIndex: -1,
    classDate: '',
    title: '',
    description: '',
    fileUrl: '',
    isVisible: true
  });
  
  // State for modules
  const [modules, setModules] = useState<ModuleOption[]>([]);

  // Function to get module name by course slug and module index
  const getModuleName = (courseSlug: string, moduleIndex: number): string => {
    const course = courses.find((c: Course) => c.slug === courseSlug);
    if (!course || !course.modules || moduleIndex < 0 || moduleIndex >= course.modules.length) {
      return 'Unknown Module';
    }
    return course.modules[moduleIndex]?.title || 'Unknown Module';
  };
  const [editingRecording, setEditingRecording] = useState<Recording | null>(null);
  const [isViewOnlyMode, setIsViewOnlyMode] = useState(false);
  
  // Filter and pagination state
  const [filters, setFilters] = useState<FilterState>({
    courseSlug: 'all',
    titleSearch: '',
    dateAdded: '',
    classDate: ''
  });
  const [currentPage, setCurrentPage] = useState(1);
  const [showFilters, setShowFilters] = useState(false);
  const recordsPerPage = 5;
  
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Fetch recordings
  const { data: recordings = [], isLoading: recordingsLoading } = useQuery<Recording[]>({
    queryKey: ['/api/recordings'],
  });

  // Fetch courses for dropdown
  const { data: courses = [] } = useQuery<Course[]>({
    queryKey: ['/api/admin/courses'],
  });

  // Fetch modules when course is selected
  useEffect(() => {
    if (!uploadForm.courseSlug) {
      setModules([]);
      return;
    }
    
    (async () => {
      try {
        const token = localStorage.getItem('token');
        const res = await fetch(`/api/courses/${uploadForm.courseSlug}`, {
          headers: token ? { Authorization: `Bearer ${token}` } : undefined,
        });
        if (!res.ok) {
          throw new Error('Failed to fetch course');
        }
        const course = await res.json();
        const moduleOptions: ModuleOption[] = course.modules.map((module: any, index: number) => ({
          index,
          title: module.title
        }));
        setModules(moduleOptions);
      } catch (err) {
        console.error('Error fetching course modules:', err);
        setModules([]);
      }
    })();
  }, [uploadForm.courseSlug]);

  // Create recording mutation
  const uploadMutation = useMutation({
    mutationFn: async (recordingData: any) => {
      const response = await apiRequest('POST', '/api/recordings', recordingData);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/recordings'] });
      toast({ title: 'Success', description: 'Recording created successfully' });
      resetUploadForm();
    },
    onError: (error: Error) => {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
      setIsUploading(false);
    }
  });

  // Update recording mutation
  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: any }) => {
      const response = await apiRequest('PUT', `/api/recordings/${id}`, data);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/recordings'] });
      toast({ title: 'Success', description: 'Recording updated successfully' });
      setEditingRecording(null);
    },
    onError: (error: Error) => {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    }
  });

  // Delete recording mutation
  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const response = await apiRequest('DELETE', `/api/recordings/${id}`);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/recordings'] });
      toast({ title: 'Success', description: 'Recording deleted successfully' });
    },
    onError: (error: Error) => {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    }
  });

  // Filter and sort recordings
  const filteredAndSortedRecordings = recordings
    .filter((recording: Recording) => {
      // Course filter
      if (filters.courseSlug && filters.courseSlug !== 'all' && recording.courseSlug !== filters.courseSlug) {
        return false;
      }
      
      // Title search
      if (filters.titleSearch && !recording.title.toLowerCase().includes(filters.titleSearch.toLowerCase())) {
        return false;
      }
      
      // Date added filter
      if (filters.dateAdded) {
        const recordingDate = new Date(recording.uploadedAt).toDateString();
        const filterDate = new Date(filters.dateAdded).toDateString();
        if (recordingDate !== filterDate) return false;
      }
      
      // Class date filter
      if (filters.classDate) {
        const classDate = new Date(recording.classDate).toDateString();
        const filterDate = new Date(filters.classDate).toDateString();
        if (classDate !== filterDate) return false;
      }
      
      return true;
    })
    .sort((a: Recording, b: Recording) => {
      // Sort by uploadedAt in descending order (latest first)
      return new Date(b.uploadedAt).getTime() - new Date(a.uploadedAt).getTime();
    });

  // Pagination logic
  const totalPages = Math.ceil(filteredAndSortedRecordings.length / recordsPerPage);
  const startIndex = (currentPage - 1) * recordsPerPage;
  const endIndex = startIndex + recordsPerPage;
  const paginatedRecordings = filteredAndSortedRecordings.slice(startIndex, endIndex);

  // Reset to page 1 when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [filters]);

  const handleUpload = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!uploadForm.courseSlug || uploadForm.moduleIndex < 0 || !uploadForm.classDate || !uploadForm.title || !uploadForm.fileUrl) {
      toast({ title: 'Error', description: 'Please fill in all required fields including module selection', variant: 'destructive' });
      return;
    }

    // Validate Google Drive link
    if (!uploadForm.fileUrl.includes('drive.google.com')) {
      toast({ title: 'Error', description: 'Please provide a valid link', variant: 'destructive' });
      return;
    }

    setIsUploading(true);
    uploadMutation.mutate(uploadForm);
  };

  const resetUploadForm = () => {
    setUploadForm({
      courseSlug: '',
      moduleIndex: -1,
      classDate: '',
      title: '',
      description: '',
      fileUrl: '',
      isVisible: true
    });
    setIsUploading(false);
    setModules([]);
  };

  const handleEdit = (recording: Recording) => {
    setEditingRecording(recording);
    setIsViewOnlyMode(false);
  };

  const handleView = (recording: Recording) => {
    setEditingRecording(recording);
    setIsViewOnlyMode(true);
  };

  const handleUpdateRecording = (updates: any) => {
    if (editingRecording) {
      updateMutation.mutate({ id: editingRecording._id, data: updates });
    }
  };

  const clearFilters = () => {
    setFilters({
      courseSlug: 'all',
      titleSearch: '',
      dateAdded: '',
      classDate: ''
    });
    setCurrentPage(1);
  };

  const getCourseTitle = (courseSlug: string) => {
    const course = courses.find((c: Course) => c.slug === courseSlug);
    return course ? course.title : courseSlug;
  };

  // Removed formatFileSize and formatDuration since we no longer store file info

  return (
    <div className="space-y-8">
      {/* Enhanced Header Section */}
      <div className="relative overflow-hidden bg-gradient-to-r from-slate-50 to-slate-100 dark:from-slate-800 dark:to-slate-900 rounded-xl border">
        <div className="relative p-8">
          <div className="flex items-start justify-between">
            <div className="space-y-1">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center">
                  <FileVideo className="h-6 w-6 text-primary" />
                </div>
                <div>
                  <h1 className="text-3xl font-bold tracking-tight">Recordings Management</h1>
                  <p className="text-lg text-muted-foreground">
                    Upload and manage course recordings for students
                  </p>
                </div>
              </div>
            </div>
            
            {/* Quick Stats */}
            <div className="hidden md:flex items-center gap-6">
              <div className="text-center">
                <div className="text-2xl font-bold text-primary">{recordings.length}</div>
                <div className="text-sm text-muted-foreground">Total Recordings</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-green-600">
                  {recordings.filter((r: Recording) => r.isVisible).length}
                </div>
                <div className="text-sm text-muted-foreground">Visible</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-amber-600">
                  {recordings.filter((r: Recording) => !r.isVisible).length}
                </div>
                <div className="text-sm text-muted-foreground">Hidden</div>
              </div>
            </div>
          </div>
          
          {/* Background Decoration */}
          <div className="absolute top-0 right-0 -mt-4 -mr-4 w-24 h-24 opacity-10">
            <FileVideo className="w-full h-full" />
          </div>
        </div>
      </div>

      {/* Upload Section */}
      {renderIfCanCreate(
        <Card className="border-2 border-dashed border-primary/20 hover:border-primary/40 transition-colors">
          <CardHeader className="pb-4">
            <CardTitle className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
                <Upload className="h-4 w-4 text-primary" />
              </div>
              <span className="text-xl">Add New Recording</span>
            </CardTitle>
            <CardDescription className="text-base">
              Upload Drive video recordings to make them available for students
            </CardDescription>
          </CardHeader>
          <CardContent className="pt-6">
            <form onSubmit={handleUpload} className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="course">Course *</Label>
                  <Select 
                    value={uploadForm.courseSlug} 
                    onValueChange={(value) => setUploadForm(prev => ({ ...prev, courseSlug: value, moduleIndex: -1 }))}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select a course" />
                    </SelectTrigger>
                    <SelectContent>
                      {courses.map((course: Course, index: number) => (
                        <SelectItem key={course.slug || `course-${index}`} value={course.slug}>
                          {course.title}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="module">Module *</Label>
                  <Select 
                    value={uploadForm.moduleIndex.toString()} 
                    onValueChange={(value) => setUploadForm(prev => ({ ...prev, moduleIndex: parseInt(value) }))}
                    disabled={!uploadForm.courseSlug || modules.length === 0}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select a module" />
                    </SelectTrigger>
                    <SelectContent>
                      {modules.map((module) => (
                        <SelectItem key={module.index} value={module.index.toString()}>
                          Module {module.index + 1}: {module.title}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="classDate">Class Date *</Label>
                  <Input
                    id="classDate"
                    type="date"
                    value={uploadForm.classDate}
                    onChange={(e) => setUploadForm(prev => ({ ...prev, classDate: e.target.value }))}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="title">Recording Title *</Label>
                <Input
                  id="title"
                  value={uploadForm.title}
                  onChange={(e) => setUploadForm(prev => ({ ...prev, title: e.target.value }))}
                  placeholder="Enter recording title"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="description">Description</Label>
                <Textarea
                  id="description"
                  value={uploadForm.description}
                  onChange={(e) => setUploadForm(prev => ({ ...prev, description: e.target.value }))}
                  placeholder="Enter recording description"
                  rows={3}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="isVisible">Visible to Students</Label>
                <div className="flex items-center space-x-2 pt-2">
                  <Switch
                    id="isVisible"
                    checked={uploadForm.isVisible}
                    onCheckedChange={(checked) => setUploadForm(prev => ({ ...prev, isVisible: checked }))}
                  />
                  <span className="text-sm text-muted-foreground">
                    {uploadForm.isVisible ? 'Visible' : 'Hidden'}
                  </span>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="fileUrl">Drive Video Link *</Label>
                <Input
                  id="fileUrl"
                  type="url"
                  value={uploadForm.fileUrl}
                  onChange={(e) => setUploadForm(prev => ({ ...prev, fileUrl: e.target.value }))}
                  placeholder="https://drive.google.com/file/d/your-file-id/view"
                />
                <p className="text-sm text-muted-foreground">
                  Provide a shareable Drive link to your video recording
                </p>
              </div>

              <div className="flex gap-3 pt-2">
                <Button type="submit" disabled={isUploading || !uploadForm.fileUrl} className="px-6">
                  {isUploading ? 'Creating...' : 'Add Recording'}
                </Button>
                <Button type="button" variant="outline" onClick={resetUploadForm} className="px-6">
                  Reset Form
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      {/* Filters Section */}
      <Card className="shadow-sm">
        <CardHeader className="pb-4">
          <CardTitle className="flex items-center justify-between">
            <span className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-blue-50 flex items-center justify-center">
                <Filter className="h-4 w-4 text-blue-600" />
              </div>
              <span className="text-xl">Filters & Search</span>
            </span>
            <div className="flex gap-3">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowFilters(!showFilters)}
                className="gap-2"
              >
                <Filter className="h-4 w-4" />
                {showFilters ? 'Hide Filters' : 'Show Filters'}
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={clearFilters}
                className="gap-2"
              >
                <X className="h-4 w-4" />
                Clear All
              </Button>
            </div>
          </CardTitle>
        </CardHeader>
        
        {showFilters && (
          <CardContent className="pt-6">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              {/* Course Filter */}
              <div className="space-y-2">
                <Label className="text-sm font-medium">Course</Label>
                <Select 
                  value={filters.courseSlug} 
                  onValueChange={(value) => setFilters(prev => ({ ...prev, courseSlug: value }))}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="All courses" />
                  </SelectTrigger>
                                     <SelectContent>
                     <SelectItem value="all">All courses</SelectItem>
                     {courses.map((course: Course) => (
                       <SelectItem key={course.slug} value={course.slug}>
                         {course.title}
                       </SelectItem>
                     ))}
                   </SelectContent>
                </Select>
              </div>

              {/* Title Search */}
              <div className="space-y-2">
                <Label className="text-sm font-medium">Search Title</Label>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Search recordings..."
                    value={filters.titleSearch}
                    onChange={(e) => setFilters(prev => ({ ...prev, titleSearch: e.target.value }))}
                    className="pl-10 h-10"
                  />
                </div>
              </div>

                             {/* Date Added */}
               <div className="space-y-2">
                 <Label className="text-sm font-medium">Date Added</Label>
                 <Input
                   type="date"
                   value={filters.dateAdded}
                   onChange={(e) => setFilters(prev => ({ ...prev, dateAdded: e.target.value }))}
                   className="h-10"
                 />
               </div>

               {/* Class Date */}
               <div className="space-y-2">
                 <Label className="text-sm font-medium">Class Date</Label>
                 <Input
                   type="date"
                   value={filters.classDate}
                   onChange={(e) => setFilters(prev => ({ ...prev, classDate: e.target.value }))}
                   className="h-10"
                 />
               </div>
            </div>
          </CardContent>
        )}
      </Card>

      {/* Recordings List */}
      <Card className="shadow-sm">
        <CardHeader className="pb-6">
          <CardTitle className="flex items-center justify-between">
            <span className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-green-50 flex items-center justify-center">
                <FileVideo className="h-4 w-4 text-green-600" />
              </div>
              <span className="text-xl">Course Recordings</span>
            </span>
            <div className="text-sm text-muted-foreground bg-slate-50 px-3 py-1 rounded-full">
              Showing {paginatedRecordings.length} of {filteredAndSortedRecordings.length} recordings
            </div>
          </CardTitle>
          <CardDescription className="text-base">
            Manage and organize your course recordings (sorted by latest first)
          </CardDescription>
        </CardHeader>
        <CardContent className="pt-6">
          {recordingsLoading ? (
            <div className="flex flex-col items-center justify-center p-12 space-y-3">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
              <div className="text-muted-foreground">Loading recordings...</div>
            </div>
          ) : filteredAndSortedRecordings.length === 0 ? (
            <div className="text-center p-12 space-y-3">
              <div className="w-16 h-16 mx-auto rounded-full bg-slate-100 flex items-center justify-center">
                <FileVideo className="h-8 w-8 text-slate-400" />
              </div>
              <div className="text-lg font-medium text-muted-foreground">
                {recordings.length === 0 ? 'No recordings uploaded yet' : 'No recordings match your filters'}
              </div>
              {recordings.length === 0 && (
                <p className="text-sm text-muted-foreground">Start by uploading your first course recording above</p>
              )}
            </div>
          ) : (
            <>
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Title</TableHead>
                      <TableHead>Course</TableHead>
                      <TableHead>Module</TableHead>
                      <TableHead>Class Date</TableHead>
                      <TableHead>Added</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {paginatedRecordings.map((recording: Recording, index: number) => (
                      <TableRow key={recording._id || `recording-${index}`}>
                        <TableCell>
                          <div>
                            <div className="font-medium">{recording.title}</div>
                            {recording.description && (
                              <div className="text-sm text-muted-foreground truncate max-w-xs">
                                {recording.description}
                              </div>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="text-sm font-medium">{getCourseTitle(recording.courseSlug)}</div>
                        </TableCell>
                        <TableCell>
                          <div className="text-sm text-gray-900">
                            <div className="font-medium">Module {(recording.moduleIndex ?? 0) + 1}</div>
                            <div className="text-xs text-gray-500">{getModuleName(recording.courseSlug, recording.moduleIndex ?? 0)}</div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-1">
                            <Calendar className="h-3 w-3" />
                            {new Date(recording.classDate).toLocaleDateString()}
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="text-sm">
                            {new Date(recording.uploadedAt).toLocaleDateString()}
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge variant={recording.isVisible ? 'default' : 'secondary'}>
                            {recording.isVisible ? 'Visible' : 'Hidden'}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            {/* View details button - always visible */}
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handleView(recording)}
                              title="View Recording Details"
                            >
                              <Eye className="h-3 w-3" />
                            </Button>
                            {renderIfCanEdit(
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => handleEdit(recording)}
                                title="Edit Recording"
                              >
                                <Edit className="h-3 w-3" />
                              </Button>
                            )}
                            {renderIfCanDelete(
                              <AlertDialog>
                                <AlertDialogTrigger asChild>
                                  <Button size="sm" variant="outline" title="Delete Recording">
                                    <Trash2 className="h-3 w-3" />
                                  </Button>
                                </AlertDialogTrigger>
                                <AlertDialogContent>
                                  <AlertDialogHeader>
                                    <AlertDialogTitle>Delete Recording</AlertDialogTitle>
                                    <AlertDialogDescription>
                                      Are you sure you want to delete "{recording.title}"? This action cannot be undone.
                                    </AlertDialogDescription>
                                  </AlertDialogHeader>
                                  <AlertDialogFooter>
                                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                                    <AlertDialogAction
                                      onClick={() => deleteMutation.mutate(recording._id)}
                                      className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                                    >
                                      Delete
                                    </AlertDialogAction>
                                  </AlertDialogFooter>
                                </AlertDialogContent>
                              </AlertDialog>
                            )}
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>

              {/* Pagination */}
              {totalPages > 1 && (
                <div className="flex items-center justify-between pt-4">
                  <div className="text-sm text-muted-foreground">
                    Page {currentPage} of {totalPages}
                  </div>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                      disabled={currentPage === 1}
                    >
                      <ChevronLeft className="h-4 w-4" />
                      Previous
                    </Button>
                    
                    {/* Page numbers */}
                    <div className="flex gap-1">
                      {Array.from({ length: totalPages }, (_, i) => i + 1).map((pageNum) => (
                        <Button
                          key={pageNum}
                          variant={currentPage === pageNum ? "default" : "outline"}
                          size="sm"
                          onClick={() => setCurrentPage(pageNum)}
                          className="w-8 h-8 p-0"
                        >
                          {pageNum}
                        </Button>
                      ))}
                    </div>

                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                      disabled={currentPage === totalPages}
                    >
                      Next
                      <ChevronRight className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              )}
            </>
          )}
        </CardContent>
      </Card>

      {/* Edit/View Recording Modal */}
      {editingRecording && (
        <AlertDialog open={true} onOpenChange={() => setEditingRecording(null)}>
          <AlertDialogContent className="max-w-md">
            <AlertDialogHeader>
              <AlertDialogTitle>{isViewOnlyMode ? 'View Recording Details' : 'Edit Recording'}</AlertDialogTitle>
              <AlertDialogDescription>
                {isViewOnlyMode ? 'Recording details and information.' : 'Update recording details'}
              </AlertDialogDescription>
            </AlertDialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="edit-title">Title</Label>
                <Input
                  id="edit-title"
                  defaultValue={editingRecording.title}
                  onChange={(e) => setEditingRecording(prev => prev ? { ...prev, title: e.target.value } : null)}
                  readOnly={isViewOnlyMode}
                  className={isViewOnlyMode ? 'bg-gray-50' : ''}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-description">Description</Label>
                <Textarea
                  id="edit-description"
                  defaultValue={editingRecording.description || ''}
                  onChange={(e) => setEditingRecording(prev => prev ? { ...prev, description: e.target.value } : null)}
                  rows={3}
                  readOnly={isViewOnlyMode}
                  className={isViewOnlyMode ? 'bg-gray-50' : ''}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-classDate">Class Date</Label>
                <Input
                  id="edit-classDate"
                  type="date"
                  defaultValue={editingRecording.classDate.split('T')[0]}
                  onChange={(e) => setEditingRecording(prev => prev ? { ...prev, classDate: e.target.value } : null)}
                  readOnly={isViewOnlyMode}
                  className={isViewOnlyMode ? 'bg-gray-50' : ''}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-fileUrl">Google Drive Link</Label>
                <div className="flex gap-2">
                  <Input
                    id="edit-fileUrl"
                    type="url"
                    defaultValue={editingRecording.fileUrl}
                    onChange={(e) => setEditingRecording(prev => prev ? { ...prev, fileUrl: e.target.value } : null)}
                    placeholder="https://drive.google.com/file/d/your-file-id/view"
                    readOnly={isViewOnlyMode}
                    className={`flex-1 ${isViewOnlyMode ? 'bg-gray-50' : ''}`}
                  />
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => window.open(editingRecording.fileUrl, '_blank')}
                    title="Open Recording"
                  >
                    <Eye className="h-4 w-4" />
                  </Button>
                </div>
              </div>
              <div className="flex items-center space-x-2">
                <Switch
                  checked={editingRecording.isVisible}
                  onCheckedChange={(checked) => setEditingRecording(prev => prev ? { ...prev, isVisible: checked } : null)}
                  disabled={isViewOnlyMode}
                />
                <Label>Visible to students</Label>
              </div>
            </div>
            <AlertDialogFooter>
              <AlertDialogCancel>{isViewOnlyMode ? 'Close' : 'Cancel'}</AlertDialogCancel>
              {!isViewOnlyMode && (
                <AlertDialogAction
                  onClick={() => editingRecording && handleUpdateRecording({
                    title: editingRecording.title,
                    description: editingRecording.description,
                    classDate: editingRecording.classDate,
                    fileUrl: editingRecording.fileUrl,
                    isVisible: editingRecording.isVisible
                  })}
                >
                  Update
                </AlertDialogAction>
              )}
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      )}
    </div>
  );
} 