import React, { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
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
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Search, FileText, Video, File, Brain, AlertCircle, School } from "lucide-react";

interface SandboxModule {
  title: string;
  videos?: Array<{
    title: string;
    url: string;
  }>;
  documents?: Array<{
    title: string;
    fileUrl: string;
  }>;
  quiz?: {
    questions: Array<{
      text: string;
      choices: string[];
      correctIndex: number;
    }>;
  };
}

interface SandboxCourse {
  slug: string;
  title: string;
  type: 'standalone' | 'with-mba';
  modules: SandboxModule[];
}

interface MainCourse {
  slug: string;
  title: string;
  type: 'standalone' | 'with-mba';
}

interface HybridCopyRequest {
  sourceCourseSlug: string;
  selectedModuleIndexes: number[];
  destinationCourseSlug: string;
}

interface HybridCopyDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (request: HybridCopyRequest) => void;
  isLoading?: boolean;
}

export function HybridCopyDialog({
  isOpen,
  onClose,
  onConfirm,
  isLoading = false,
}: HybridCopyDialogProps) {
  const [selectedSourceCourse, setSelectedSourceCourse] = useState<string>("");
  const [selectedModules, setSelectedModules] = useState<number[]>([]);
  const [selectedDestinationCourse, setSelectedDestinationCourse] = useState<string>("");
  const [searchQuery, setSearchQuery] = useState("");

  // Fetch sandbox courses for source selection
  const { data: sandboxCourses, isLoading: loadingSandbox } = useQuery<SandboxCourse[]>({
    queryKey: ['/api/sandbox-courses'],
    enabled: isOpen,
  });

  // Fetch main courses for destination selection
  const { data: mainCourses, isLoading: loadingMain } = useQuery<MainCourse[]>({
    queryKey: ['/api/admin/courses'],
    enabled: isOpen,
  });

  // Get selected source course details
  const selectedSourceCourseData = useMemo(() => {
    return sandboxCourses?.find((course: SandboxCourse) => course.slug === selectedSourceCourse);
  }, [sandboxCourses, selectedSourceCourse]);

  // Filter modules based on search query
  const filteredModules = useMemo(() => {
    if (!selectedSourceCourseData?.modules) return [];
    
    if (!searchQuery.trim()) return selectedSourceCourseData.modules;
    
    const query = searchQuery.toLowerCase();
    return selectedSourceCourseData.modules.filter((module: SandboxModule, index: number) =>
      module.title.toLowerCase().includes(query) ||
      `module ${index + 1}`.toLowerCase().includes(query)
    );
  }, [selectedSourceCourseData, searchQuery]);

  // Handle module selection
  const handleModuleToggle = (moduleIndex: number) => {
    setSelectedModules(prev => {
      if (prev.includes(moduleIndex)) {
        return prev.filter(idx => idx !== moduleIndex);
      } else {
        return [...prev, moduleIndex];
      }
    });
  };

  // Handle select all modules
  const handleSelectAllModules = () => {
    if (!selectedSourceCourseData?.modules) return;
    
    const allModuleIndexes = selectedSourceCourseData.modules.map((_: SandboxModule, index: number) => index);
    if (selectedModules.length === allModuleIndexes.length) {
      setSelectedModules([]);
    } else {
      setSelectedModules(allModuleIndexes);
    }
  };

  // Reset dialog state
  const resetDialog = () => {
    setSelectedSourceCourse("");
    setSelectedModules([]);
    setSelectedDestinationCourse("");
    setSearchQuery("");
  };

  // Handle dialog close
  const handleClose = () => {
    if (!isLoading) {
      resetDialog();
      onClose();
    }
  };

  // Handle confirm action
  const handleConfirm = () => {
    if (selectedSourceCourse && selectedModules.length > 0 && selectedDestinationCourse && !isLoading) {
      const request: HybridCopyRequest = {
        sourceCourseSlug: selectedSourceCourse,
        selectedModuleIndexes: selectedModules,
        destinationCourseSlug: selectedDestinationCourse,
      };
      
      onConfirm(request);
    }
  };

  // Get module statistics
  const getModuleStats = (module: SandboxModule) => {
    const videoCount = module.videos?.length || 0;
    const documentCount = module.documents?.length || 0;
    const hasQuiz = module.quiz?.questions?.length && module.quiz.questions.length > 0;
    
    return { videoCount, documentCount, hasQuiz };
  };

  const isFormValid = selectedSourceCourse && selectedModules.length > 0 && selectedDestinationCourse;
  const isAllModulesSelected = selectedSourceCourseData?.modules && 
    selectedModules.length === selectedSourceCourseData.modules.length;

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="max-w-4xl max-h-[85vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <School className="h-5 w-5" />
            Hybrid Copy - Selective Module Transfer
          </DialogTitle>
          <DialogDescription>
            Copy specific modules from a sandbox course to an existing main course. 
            All module content including videos, documents, and quizzes will be preserved.
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 flex flex-col space-y-6 min-h-0">
          {/* Source Course Selection */}
          <div className="space-y-2">
            <label className="text-sm font-medium">Source Sandbox Course</label>
            <Select 
              value={selectedSourceCourse} 
              onValueChange={(value) => {
                setSelectedSourceCourse(value);
                setSelectedModules([]); // Reset module selection when source changes
                setSearchQuery("");
              }}
              disabled={loadingSandbox}
            >
              <SelectTrigger>
                <SelectValue placeholder={loadingSandbox ? "Loading sandbox courses..." : "Select sandbox course"} />
              </SelectTrigger>
              <SelectContent>
                {sandboxCourses?.map((course: SandboxCourse) => (
                  <SelectItem key={course.slug} value={course.slug}>
                    <div className="flex items-center gap-2">
                      <span>{course.title}</span>
                      <Badge variant="outline" className="text-xs">
                        {course.modules?.length || 0} modules
                      </Badge>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Module Selection */}
          {selectedSourceCourseData && (
            <div className="space-y-3 flex-1 min-h-0 flex flex-col">
              <div className="flex items-center justify-between">
                <label className="text-sm font-medium">Select Modules to Copy</label>
                <div className="flex items-center gap-4">
                  <div className="relative">
                    <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-gray-500" />
                    <Input
                      placeholder="Search modules..."
                      className="pl-8 h-8 w-48"
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                    />
                  </div>
                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="select-all-modules"
                      checked={isAllModulesSelected}
                      onCheckedChange={handleSelectAllModules}
                    />
                    <label htmlFor="select-all-modules" className="text-sm cursor-pointer">
                      Select All
                    </label>
                  </div>
                </div>
              </div>

              {selectedModules.length > 0 && (
                <div className="text-sm text-blue-600 bg-blue-50 px-3 py-2 rounded-md">
                  {selectedModules.length} module{selectedModules.length !== 1 ? 's' : ''} selected
                </div>
              )}

              <div className="flex-1 overflow-y-auto border rounded-md">
                {filteredModules.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-8 text-gray-500">
                    <Search className="h-8 w-8 mb-2" />
                    <p>No modules match your search criteria.</p>
                  </div>
                ) : (
                  <div className="divide-y">
                    {filteredModules.map((module: SandboxModule, index: number) => {
                      const actualIndex = selectedSourceCourseData.modules.findIndex((m: SandboxModule) => m === module);
                      const isSelected = selectedModules.includes(actualIndex);
                      const stats = getModuleStats(module);

                      return (
                        <div
                          key={actualIndex}
                          className={`p-4 hover:bg-gray-50 transition-colors ${
                            isSelected ? 'bg-blue-50 border-l-4 border-l-blue-500' : ''
                          }`}
                        >
                          <div className="flex items-start space-x-3">
                            <Checkbox
                              id={`module-${actualIndex}`}
                              checked={isSelected}
                              onCheckedChange={() => handleModuleToggle(actualIndex)}
                              className="mt-1"
                            />
                            <div className="flex-1">
                              <label
                                htmlFor={`module-${actualIndex}`}
                                className="font-medium text-gray-900 cursor-pointer block"
                              >
                                Module {actualIndex + 1}: {module.title}
                              </label>
                              
                              <div className="flex items-center space-x-4 mt-2 text-sm text-gray-600">
                                <div className="flex items-center">
                                  <Video className="h-4 w-4 mr-1" />
                                  <span>{stats.videoCount} videos</span>
                                </div>
                                <div className="flex items-center">
                                  <File className="h-4 w-4 mr-1" />
                                  <span>{stats.documentCount} documents</span>
                                </div>
                                {stats.hasQuiz && (
                                  <div className="flex items-center">
                                    <Brain className="h-4 w-4 mr-1 text-purple-600" />
                                    <span className="text-purple-600">Has Quiz</span>
                                  </div>
                                )}
                              </div>

                              {/* Content Preview */}
                              <div className="mt-2 text-xs text-gray-500">
                                {module.videos?.slice(0, 2).map((video: any, idx: number) => (
                                  <div key={idx} className="truncate">• {video.title}</div>
                                ))}
                                {(module.videos?.length || 0) > 2 && (
                                  <div>• +{(module.videos?.length || 0) - 2} more videos</div>
                                )}
                              </div>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Destination Course Selection */}
          <div className="space-y-2">
            <label className="text-sm font-medium">Destination Main Course</label>
            <Select 
              value={selectedDestinationCourse} 
              onValueChange={setSelectedDestinationCourse}
              disabled={loadingMain || !selectedSourceCourse}
            >
              <SelectTrigger>
                <SelectValue placeholder={
                  !selectedSourceCourse 
                    ? "Select source course first" 
                    : loadingMain 
                      ? "Loading main courses..." 
                      : "Select destination course"
                } />
              </SelectTrigger>
              <SelectContent>
                {mainCourses?.map((course: MainCourse) => (
                  <SelectItem key={course.slug} value={course.slug}>
                    <div className="flex items-center gap-2">
                      <span>{course.title}</span>
                      <Badge variant="outline" className="text-xs">
                        {course.type === 'with-mba' ? 'With MBA' : 'Standalone'}
                      </Badge>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Warning Message */}
          {isFormValid && (
            <div className="flex items-start gap-2 p-3 bg-amber-50 border border-amber-200 rounded-md">
              <AlertCircle className="h-4 w-4 text-amber-600 mt-0.5 flex-shrink-0" />
              <div className="text-sm text-amber-800">
                <p className="font-medium">Important:</p>
                <p>The selected modules will be appended to the destination course. 
                Existing modules in the destination course will not be affected.</p>
              </div>
            </div>
          )}
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
            disabled={!isFormValid || isLoading}
          >
            {isLoading ? "Copying Modules..." : `Copy ${selectedModules.length} Module${selectedModules.length !== 1 ? 's' : ''}`}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}