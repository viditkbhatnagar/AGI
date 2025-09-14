import React, { useState, useMemo } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { Search, FileText, Users } from "lucide-react";
import { ISandboxCourse } from "../../../../../server/models/sandboxCourse";

interface CourseSelectionDialogProps {
  sandboxCourses: ISandboxCourse[];
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (selectedCourses: string[]) => void;
  isLoading?: boolean;
}

export function CourseSelectionDialog({
  sandboxCourses,
  isOpen,
  onClose,
  onConfirm,
  isLoading = false,
}: CourseSelectionDialogProps) {
  const [selectedCourses, setSelectedCourses] = useState<string[]>([]);
  const [searchQuery, setSearchQuery] = useState("");

  // Filter courses based on search query
  const filteredCourses = useMemo(() => {
    if (!searchQuery.trim()) return sandboxCourses;
    
    const query = searchQuery.toLowerCase();
    return sandboxCourses.filter(course =>
      course.title.toLowerCase().includes(query) ||
      course.slug.toLowerCase().includes(query) ||
      course.type.toLowerCase().includes(query) ||
      course.modules?.some(module =>
        module.title.toLowerCase().includes(query)
      )
    );
  }, [sandboxCourses, searchQuery]);

  // Handle individual course selection
  const handleCourseToggle = (courseSlug: string) => {
    setSelectedCourses(prev => {
      if (prev.includes(courseSlug)) {
        return prev.filter(slug => slug !== courseSlug);
      } else {
        return [...prev, courseSlug];
      }
    });
  };

  // Handle select all / deselect all
  const handleSelectAll = () => {
    if (selectedCourses.length === filteredCourses.length) {
      setSelectedCourses([]);
    } else {
      setSelectedCourses(filteredCourses.map(course => course.slug));
    }
  };

  // Handle dialog close - don't allow closing during loading
  const handleClose = () => {
    if (!isLoading) {
      setSelectedCourses([]);
      setSearchQuery("");
      onClose();
    }
  };

  // Handle confirm action
  const handleConfirm = () => {
    if (selectedCourses.length > 0 && !isLoading) {
      // Validate selection before confirming
      if (selectedCourses.length > 50) {
        alert('Cannot copy more than 50 courses at once. Please select fewer courses.');
        return;
      }
      
      onConfirm(selectedCourses);
      // Don't close immediately - let parent handle the workflow
    }
  };

  // Calculate course statistics
  const getCourseStats = (course: ISandboxCourse) => {
    const moduleCount = course.modules?.length || 0;
    const documentCount = course.modules?.reduce((total, module) => 
      total + (module.documents?.length || 0), 0) || 0;
    const videoCount = course.modules?.reduce((total, module) => 
      total + (module.videos?.length || 0), 0) || 0;
    
    return { moduleCount, documentCount, videoCount };
  };

  const isAllSelected = filteredCourses.length > 0 && selectedCourses.length === filteredCourses.length;
  const isIndeterminate = selectedCourses.length > 0 && selectedCourses.length < filteredCourses.length;

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="max-w-4xl max-h-[80vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>Copy Sandbox Courses to Main Courses</DialogTitle>
          <DialogDescription>
            Select one or more sandbox courses to copy to the main courses tab. 
            All course content including modules, documents, videos, and quizzes will be preserved.
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 flex flex-col space-y-4 min-h-0">
          {/* Search and Select All Controls */}
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-gray-500" />
              <Input
                placeholder="Search courses by name, type, or module..."
                className="pl-8"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
            <div className="flex items-center space-x-2">
              <Checkbox
                id="select-all"
                checked={isAllSelected}
                ref={(el) => {
                  if (el) el.indeterminate = isIndeterminate;
                }}
                onCheckedChange={handleSelectAll}
              />
              <label htmlFor="select-all" className="text-sm font-medium cursor-pointer">
                Select All ({filteredCourses.length})
              </label>
            </div>
          </div>

          {/* Selected Count */}
          {selectedCourses.length > 0 && (
            <div className="text-sm text-blue-600 bg-blue-50 px-3 py-2 rounded-md">
              {selectedCourses.length} course{selectedCourses.length !== 1 ? 's' : ''} selected
            </div>
          )}

          {/* Course List */}
          <div className="flex-1 overflow-y-auto border rounded-md">
            {filteredCourses.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 text-gray-500">
                <Search className="h-8 w-8 mb-2" />
                <p>No courses match your search criteria.</p>
              </div>
            ) : (
              <div className="divide-y">
                {filteredCourses.map((course) => {
                  const isSelected = selectedCourses.includes(course.slug);
                  const stats = getCourseStats(course);

                  return (
                    <div
                      key={course.slug}
                      className={`p-4 hover:bg-gray-50 transition-colors ${
                        isSelected ? 'bg-blue-50 border-l-4 border-l-blue-500' : ''
                      }`}
                    >
                      <div className="flex items-start space-x-3">
                        <Checkbox
                          id={`course-${course.slug}`}
                          checked={isSelected}
                          onCheckedChange={() => handleCourseToggle(course.slug)}
                          className="mt-1"
                        />
                        <div className="flex-1 min-w-0">
                          <div className="flex items-start justify-between">
                            <div className="flex-1">
                              <label
                                htmlFor={`course-${course.slug}`}
                                className="text-lg font-semibold text-gray-900 cursor-pointer block"
                              >
                                {course.title}
                              </label>
                              <p className="text-sm text-gray-500 mt-1">
                                Slug: {course.slug}
                              </p>
                              {course.description && (
                                <p className="text-sm text-gray-600 mt-1 line-clamp-2">
                                  {course.description}
                                </p>
                              )}
                            </div>
                            <div className="flex flex-col items-end space-y-2 ml-4">
                              <Badge 
                                variant="outline" 
                                className={
                                  course.type === 'with-mba' 
                                    ? 'bg-purple-100 text-purple-800 hover:bg-purple-200' 
                                    : 'bg-primary-100 text-primary-800 hover:bg-primary-200'
                                }
                              >
                                {course.type === 'with-mba' ? 'With MBA' : 'Standalone'}
                              </Badge>
                              {course.liveClassConfig?.enabled && (
                                <Badge variant="outline" className="bg-green-100 text-green-800">
                                  Live Classes
                                </Badge>
                              )}
                            </div>
                          </div>

                          {/* Course Statistics */}
                          <div className="flex items-center space-x-4 mt-3 text-sm text-gray-600">
                            <div className="flex items-center">
                              <FileText className="h-4 w-4 mr-1" />
                              <span>{stats.moduleCount} modules</span>
                            </div>
                            <div className="flex items-center">
                              <FileText className="h-4 w-4 mr-1" />
                              <span>{stats.documentCount} documents</span>
                            </div>
                            <div className="flex items-center">
                              <Users className="h-4 w-4 mr-1" />
                              <span>{stats.videoCount} videos</span>
                            </div>
                          </div>

                          {/* Module Preview */}
                          {course.modules && course.modules.length > 0 && (
                            <div className="mt-3">
                              <p className="text-sm font-medium text-gray-700 mb-1">Modules:</p>
                              <div className="space-y-1">
                                {course.modules.slice(0, 3).map((module, index) => (
                                  <div key={index} className="text-sm text-gray-600 flex items-center">
                                    <span className="w-2 h-2 bg-gray-300 rounded-full mr-2 flex-shrink-0"></span>
                                    <span className="truncate">
                                      {module.title} ({module.videos?.length || 0} videos, {module.documents?.length || 0} docs)
                                    </span>
                                  </div>
                                ))}
                                {course.modules.length > 3 && (
                                  <div className="text-sm text-gray-500 ml-4">
                                    +{course.modules.length - 3} more modules
                                  </div>
                                )}
                              </div>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        <DialogFooter>
          <Button 
            variant="outline" 
            onClick={handleClose}
            disabled={isLoading}
          >
            Cancel
          </Button>
          <Button 
            onClick={handleConfirm}
            disabled={selectedCourses.length === 0 || isLoading}
          >
            {isLoading ? "Starting Copy..." : `Copy ${selectedCourses.length} Course${selectedCourses.length !== 1 ? 's' : ''} to Main Courses`}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}