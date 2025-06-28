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

interface Recording {
  _id: string;
  courseSlug: string;
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
}

interface FilterState {
  courseSlug: string;
  titleSearch: string;
  dateAdded: string;
  classDate: string;
}

// Removed LiveClass interface since we no longer use live class associations

export function AdminRecordings() {
  const [isUploading, setIsUploading] = useState(false);
  const [uploadForm, setUploadForm] = useState({
    courseSlug: '',
    classDate: '',
    title: '',
    description: '',
    fileUrl: '',
    isVisible: true
  });
  const [editingRecording, setEditingRecording] = useState<Recording | null>(null);
  
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
  const { data: recordings = [], isLoading: recordingsLoading } = useQuery({
    queryKey: ['/api/recordings'],
  });

  // Fetch courses for dropdown
  const { data: courses = [] } = useQuery({
    queryKey: ['/api/admin/courses'],
  });

  // No longer need live classes since we removed liveClassId

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
    if (!uploadForm.courseSlug || !uploadForm.classDate || !uploadForm.title || !uploadForm.fileUrl) {
      toast({ title: 'Error', description: 'Please fill in all required fields', variant: 'destructive' });
      return;
    }

    // Validate Google Drive link
    if (!uploadForm.fileUrl.includes('drive.google.com')) {
      toast({ title: 'Error', description: 'Please provide a valid Google Drive link', variant: 'destructive' });
      return;
    }

    setIsUploading(true);
    uploadMutation.mutate(uploadForm);
  };

  const resetUploadForm = () => {
    setUploadForm({
      courseSlug: '',
      classDate: '',
      title: '',
      description: '',
      fileUrl: '',
      isVisible: true
    });
    setIsUploading(false);
  };

  const handleEdit = (recording: Recording) => {
    setEditingRecording(recording);
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
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Recordings Management</h1>
        <p className="text-muted-foreground">
          Upload and manage course recordings for students
        </p>
      </div>

      {/* Upload Section */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Upload className="h-5 w-5" />
            Add New Recording
          </CardTitle>
          <CardDescription>
            Add Google Drive video recordings for courses
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleUpload} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="course">Course *</Label>
                <Select 
                  value={uploadForm.courseSlug} 
                  onValueChange={(value) => setUploadForm(prev => ({ ...prev, courseSlug: value }))}
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
              <Label htmlFor="fileUrl">Google Drive Video Link *</Label>
              <Input
                id="fileUrl"
                type="url"
                value={uploadForm.fileUrl}
                onChange={(e) => setUploadForm(prev => ({ ...prev, fileUrl: e.target.value }))}
                placeholder="https://drive.google.com/file/d/your-file-id/view"
              />
              <p className="text-sm text-muted-foreground">
                Provide a shareable Google Drive link to your video recording
              </p>
            </div>

            <div className="flex gap-2">
              <Button type="submit" disabled={isUploading || !uploadForm.fileUrl}>
                {isUploading ? 'Creating...' : 'Add Recording'}
              </Button>
              <Button type="button" variant="outline" onClick={resetUploadForm}>
                Reset
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>

      {/* Filters Section */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span className="flex items-center gap-2">
              <Filter className="h-5 w-5" />
              Filters & Search
            </span>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowFilters(!showFilters)}
              >
                {showFilters ? 'Hide Filters' : 'Show Filters'}
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={clearFilters}
              >
                <X className="h-4 w-4 mr-1" />
                Clear
              </Button>
            </div>
          </CardTitle>
        </CardHeader>
        
        {showFilters && (
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {/* Course Filter */}
              <div className="space-y-2">
                <Label>Course</Label>
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
                <Label>Search Title</Label>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Search by title..."
                    value={filters.titleSearch}
                    onChange={(e) => setFilters(prev => ({ ...prev, titleSearch: e.target.value }))}
                    className="pl-9"
                  />
                </div>
              </div>

                             {/* Date Added */}
               <div className="space-y-2">
                 <Label>Date Added</Label>
                 <Input
                   type="date"
                   value={filters.dateAdded}
                   onChange={(e) => setFilters(prev => ({ ...prev, dateAdded: e.target.value }))}
                 />
               </div>

               {/* Class Date */}
               <div className="space-y-2">
                 <Label>Class Date</Label>
                 <Input
                   type="date"
                   value={filters.classDate}
                   onChange={(e) => setFilters(prev => ({ ...prev, classDate: e.target.value }))}
                 />
               </div>
            </div>
          </CardContent>
        )}
      </Card>

      {/* Recordings List */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span className="flex items-center gap-2">
              <FileVideo className="h-5 w-5" />
              Course Recordings
            </span>
            <div className="text-sm text-muted-foreground">
              Showing {paginatedRecordings.length} of {filteredAndSortedRecordings.length} recordings
            </div>
          </CardTitle>
          <CardDescription>
            Manage existing recordings (sorted by latest first)
          </CardDescription>
        </CardHeader>
        <CardContent>
          {recordingsLoading ? (
            <div className="flex justify-center p-8">
              <div className="text-muted-foreground">Loading recordings...</div>
            </div>
          ) : filteredAndSortedRecordings.length === 0 ? (
            <div className="text-center p-8 text-muted-foreground">
              {recordings.length === 0 ? 'No recordings uploaded yet' : 'No recordings match your filters'}
            </div>
          ) : (
            <>
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Title</TableHead>
                      <TableHead>Course</TableHead>
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
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handleEdit(recording)}
                            >
                              <Edit className="h-3 w-3" />
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => window.open(recording.fileUrl, '_blank')}
                            >
                              <Eye className="h-3 w-3" />
                            </Button>
                            <AlertDialog>
                              <AlertDialogTrigger asChild>
                                <Button size="sm" variant="outline">
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

      {/* Edit Recording Modal */}
      {editingRecording && (
        <AlertDialog open={true} onOpenChange={() => setEditingRecording(null)}>
          <AlertDialogContent className="max-w-md">
            <AlertDialogHeader>
              <AlertDialogTitle>Edit Recording</AlertDialogTitle>
              <AlertDialogDescription>
                Update recording details
              </AlertDialogDescription>
            </AlertDialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="edit-title">Title</Label>
                <Input
                  id="edit-title"
                  defaultValue={editingRecording.title}
                  onChange={(e) => setEditingRecording(prev => prev ? { ...prev, title: e.target.value } : null)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-description">Description</Label>
                <Textarea
                  id="edit-description"
                  defaultValue={editingRecording.description || ''}
                  onChange={(e) => setEditingRecording(prev => prev ? { ...prev, description: e.target.value } : null)}
                  rows={3}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-classDate">Class Date</Label>
                <Input
                  id="edit-classDate"
                  type="date"
                  defaultValue={editingRecording.classDate.split('T')[0]}
                  onChange={(e) => setEditingRecording(prev => prev ? { ...prev, classDate: e.target.value } : null)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-fileUrl">Google Drive Link</Label>
                <Input
                  id="edit-fileUrl"
                  type="url"
                  defaultValue={editingRecording.fileUrl}
                  onChange={(e) => setEditingRecording(prev => prev ? { ...prev, fileUrl: e.target.value } : null)}
                  placeholder="https://drive.google.com/file/d/your-file-id/view"
                />
              </div>
              <div className="flex items-center space-x-2">
                <Switch
                  checked={editingRecording.isVisible}
                  onCheckedChange={(checked) => setEditingRecording(prev => prev ? { ...prev, isVisible: checked } : null)}
                />
                <Label>Visible to students</Label>
              </div>
            </div>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
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
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      )}
    </div>
  );
} 