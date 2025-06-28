import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { useToast } from '@/hooks/use-toast';
import { Play, Clock, Calendar, Search, Filter, FileVideo, BookOpen } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';

interface Recording {
  _id: string;
  courseSlug: string;
  classDate: string;
  title: string;
  description?: string;
  fileUrl: string;
  uploadedAt: string;
  isVisible: boolean;
}

interface Course {
  slug: string;
  title: string;
}

export function StudentRecordings() {
  const [selectedCourse, setSelectedCourse] = useState<string>('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [playingRecording, setPlayingRecording] = useState<Recording | null>(null);
  
  const { toast } = useToast();

  // Fetch student's recordings
  const { data: recordings = [], isLoading: recordingsLoading } = useQuery({
    queryKey: ['/api/student/recordings'],
  });

  // Fetch student's courses
  const { data: courses = [] } = useQuery({
    queryKey: ['/api/student/courses'],
  });

  // Filter recordings based on selected course and search term
  const filteredRecordings = recordings.filter((recording: Recording) => {
    const matchesCourse = selectedCourse === 'all' || recording.courseSlug === selectedCourse;
    const matchesSearch = recording.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         recording.description?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         recording.courseSlug.toLowerCase().includes(searchTerm.toLowerCase());
    
    return matchesCourse && matchesSearch && recording.isVisible;
  });

  // Group recordings by course
  const recordingsByCourse = filteredRecordings.reduce((acc: any, recording: Recording) => {
    if (!acc[recording.courseSlug]) {
      acc[recording.courseSlug] = [];
    }
    acc[recording.courseSlug].push(recording);
    return acc;
  }, {});

  const handlePlayRecording = (recording: Recording) => {
    setPlayingRecording(recording);
  };

  // Removed formatDuration and formatFileSize since we no longer store file info

  const getCourseTitle = (courseSlug: string) => {
    const course = courses.find((c: Course) => c.slug === courseSlug);
    return course ? course.title : courseSlug;
  };

  if (recordingsLoading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="text-muted-foreground">Loading recordings...</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Course Recordings</h1>
        <p className="text-muted-foreground">
          Access recordings from your enrolled courses and live classes
        </p>
      </div>

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Filter className="h-5 w-5" />
            Filter Recordings
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Search</label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search recordings..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-9"
                />
              </div>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Course</label>
              <Select value={selectedCourse} onValueChange={setSelectedCourse}>
                <SelectTrigger>
                  <SelectValue placeholder="All Courses" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Courses</SelectItem>
                  {courses.map((course: Course) => (
                    <SelectItem key={course.slug} value={course.slug}>
                      {course.title}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Video Player Modal */}
      {playingRecording && (
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <span className="flex items-center gap-2">
                <Play className="h-5 w-5" />
                Now Playing: {playingRecording.title}
              </span>
              <Button 
                variant="outline" 
                size="sm"
                onClick={() => setPlayingRecording(null)}
              >
                Close
              </Button>
            </CardTitle>
            <CardDescription>
              {getCourseTitle(playingRecording.courseSlug)} 
              • Class Date: {new Date(playingRecording.classDate).toLocaleDateString()}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="aspect-video bg-gray-100 rounded-lg overflow-hidden">
              <iframe 
                key={playingRecording._id}
                className="w-full h-full"
                src={playingRecording.fileUrl.replace('/view', '/preview')}
                title={playingRecording.title}
                frameBorder="0"
                allowFullScreen
                onError={() => {
                  toast({
                    title: 'Error',
                    description: 'Failed to load video. Please check the video link.',
                    variant: 'destructive'
                  });
                }}
              />
            </div>
            {playingRecording.description && (
              <div className="mt-4">
                <h4 className="font-medium mb-2">Description</h4>
                <p className="text-muted-foreground text-sm">
                  {playingRecording.description}
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Recordings Grid */}
      {filteredRecordings.length === 0 ? (
        <Card>
          <CardContent className="text-center py-12">
            <FileVideo className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-lg font-medium mb-2">No recordings found</h3>
            <p className="text-muted-foreground">
              {recordings.length === 0 
                ? "No recordings are available for your enrolled courses yet."
                : "Try adjusting your search criteria or course filter."
              }
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-6">
          {Object.entries(recordingsByCourse).map(([courseSlug, courseRecordings]: [string, any[]]) => (
            <Card key={courseSlug}>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <BookOpen className="h-5 w-5" />
                  {getCourseTitle(courseSlug)}
                </CardTitle>
                <CardDescription>
                  {courseRecordings.length} recording{courseRecordings.length !== 1 ? 's' : ''}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {courseRecordings.map((recording: Recording) => (
                    <Card key={recording._id} className="transition-shadow hover:shadow-md">
                      <CardContent className="p-4">
                        <div className="space-y-3">
                          <div>
                            <h4 className="font-medium line-clamp-2">{recording.title}</h4>
                            {recording.description && (
                              <p className="text-sm text-muted-foreground line-clamp-2 mt-1">
                                {recording.description}
                              </p>
                            )}
                          </div>
                          
                          <div className="text-xs text-muted-foreground space-y-1">
                            <div className="flex items-center gap-1">
                              <Calendar className="h-3 w-3" />
                              Class: {new Date(recording.classDate).toLocaleDateString()}
                            </div>
                            <div>
                              Added: {new Date(recording.uploadedAt).toLocaleDateString()}
                            </div>
                          </div>

                          <Button 
                            onClick={() => handlePlayRecording(recording)}
                            className="w-full"
                            size="sm"
                          >
                            <Play className="h-4 w-4 mr-2" />
                            Watch Recording
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
} 