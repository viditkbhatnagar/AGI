import React, { useState, useEffect } from "react";
import { useLocation, useParams } from "wouter";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import DashboardLayout from "@/components/layout/dashboard-layout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Trash2, Plus, Upload, File, Loader2, FileText, Eye } from "lucide-react";
import { QuizUpload } from '@/components/admin/QuizUpload';
import { useToast } from "@/hooks/use-toast";
import { uploadToCloudinary, validateFile, FILE_TYPES, createDownloadLink, getPreviewUrl } from "@/lib/cloudinary";
import { PDFPreview } from "@/components/ui/pdf-preview";
import { CSVPreview } from "@/components/ui/csv-preview";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

interface DocumentForm {
  title: string;
  file: File | null;
  fileUrl: string;
  fileName: string;
  fileSize: number;
  fileType: string;
  publicId: string;
}

interface VideoForm {
  title: string;
  url: string;
  duration: number;
}

interface ModuleForm {
  title: string;
  videos: VideoForm[];
  documents: DocumentForm[];
  quiz: {
    questions: Array<{
      text: string;
      choices: string[];
      correctIndex: number;
    }>;
  };
}

interface CourseForm {
  slug: string;
  title: string;
  type: "standalone" | "with-mba";
  liveClassConfig: {
    enabled: boolean;
    frequency: "weekly" | "biweekly" | "monthly";
    dayOfWeek: string;
    durationMin: number;
  };
  modules: ModuleForm[];
  mbaModules: ModuleForm[];
}

function EditSandboxCourseForm() {
  const [, setLocation] = useLocation();
  const { slug } = useParams();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [uploading, setUploading] = useState<{ [key: string]: boolean }>({});
  const [previewDocument, setPreviewDocument] = useState<DocumentForm | null>(null);

  const [courseForm, setCourseForm] = useState<CourseForm>({
    slug: "",
    title: "",
    type: "standalone",
    liveClassConfig: {
      enabled: false,
      frequency: "weekly",
      dayOfWeek: "Monday",
      durationMin: 60
    },
    modules: [{ title: "", videos: [], documents: [], quiz: { questions: [] } }],
    mbaModules: []
  });

  // Fetch existing course data
  const { data: courseData, isLoading } = useQuery<CourseForm>({
    queryKey: [`/api/sandbox-courses/${slug}`],
    enabled: !!slug,
  });

  // Populate form when course data is loaded
  useEffect(() => {
    if (courseData) {
      console.log('🔄 Loading course data for editing:', courseData);
      
      const processedModules = (courseData.modules || [{ title: "", videos: [], documents: [], quiz: { questions: [] } }]).map(module => {
        const processedModule = {
          ...module,
          quiz: module.quiz || { questions: [] }
        };
        
        console.log('📚 Processing module:', {
          title: module.title,
          hasQuiz: !!module.quiz,
          questionsCount: module.quiz?.questions?.length || 0,
          rawQuiz: module.quiz
        });
        
        return processedModule;
      });
      
      setCourseForm({
        slug: courseData.slug,
        title: courseData.title,
        type: courseData.type,
        liveClassConfig: courseData.liveClassConfig || {
          enabled: false,
          frequency: "weekly",
          dayOfWeek: "Monday",
          durationMin: 60
        },
        modules: processedModules,
        mbaModules: courseData.mbaModules || []
      });
      
      console.log('✅ Course form set with modules:', processedModules);
    }
  }, [courseData]);

  const updateSandboxCourseMutation = useMutation({
    mutationFn: async (courseData: CourseForm) => {
      const token = localStorage.getItem('token');
      const response = await fetch(`/api/sandbox-courses/${slug}`, {
        method: 'PUT',
        headers: { 
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {})
        },
        body: JSON.stringify(courseData),
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to update sandbox course');
      }
      
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Success!",
        description: "Sandbox course updated successfully.",
      });
      queryClient.invalidateQueries({ queryKey: ['/api/sandbox-courses'] });
      queryClient.invalidateQueries({ queryKey: [`/api/sandbox-courses/${slug}`] });
      setLocation('/admin/sandbox-courses');
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const handleFileUpload = async (
    moduleIndex: number, 
    documentIndex: number, 
    file: File, 
    isStandalone: boolean = true
  ) => {
    const validation = validateFile(file, {
      maxSizeMB: 10,
      allowedTypes: FILE_TYPES.DOCUMENTS
    });

    if (!validation.isValid) {
      toast({
        title: "Invalid File",
        description: validation.error,
        variant: "destructive",
      });
      return;
    }

    const uploadKey = `${isStandalone ? 'modules' : 'mbaModules'}-${moduleIndex}-${documentIndex}`;
    setUploading(prev => ({ ...prev, [uploadKey]: true }));

    try {
      const result = await uploadToCloudinary(file, 'question-documents');
      
      const documentData: DocumentForm = {
        title: file.name.split('.')[0],
        file: null,
        fileUrl: result.url,
        fileName: result.fileName,
        fileSize: result.fileSize,
        fileType: result.fileType,
        publicId: result.publicId
      };

      setCourseForm(prev => {
        const newForm = { ...prev };
        const modules = isStandalone ? newForm.modules : newForm.mbaModules;
        modules[moduleIndex].documents[documentIndex] = documentData;
        return newForm;
      });

      toast({
        title: "Upload Successful",
        description: `${file.name} uploaded successfully.`,
      });
    } catch (error) {
      toast({
        title: "Upload Failed",
        description: error instanceof Error ? error.message : "Failed to upload file",
        variant: "destructive",
      });
    } finally {
      setUploading(prev => ({ ...prev, [uploadKey]: false }));
    }
  };

  const addModule = (isStandalone: boolean = true) => {
    setCourseForm(prev => ({
      ...prev,
      [isStandalone ? 'modules' : 'mbaModules']: [
        ...(isStandalone ? prev.modules : prev.mbaModules),
        { title: "", videos: [], documents: [], quiz: { questions: [] } }
      ]
    }));
  };

  const removeModule = (index: number, isStandalone: boolean = true) => {
    setCourseForm(prev => {
      const modules = isStandalone ? prev.modules : prev.mbaModules;
      if (modules.length === 1) return prev;
      
      return {
        ...prev,
        [isStandalone ? 'modules' : 'mbaModules']: modules.filter((_, i) => i !== index)
      };
    });
  };

  const addDocument = (moduleIndex: number, isStandalone: boolean = true) => {
    setCourseForm(prev => {
      const newForm = { ...prev };
      const modules = isStandalone ? newForm.modules : newForm.mbaModules;
      modules[moduleIndex].documents.push({
        title: "",
        file: null,
        fileUrl: "",
        fileName: "",
        fileSize: 0,
        fileType: "",
        publicId: ""
      });
      return newForm;
    });
  };

  const removeDocument = (moduleIndex: number, documentIndex: number, isStandalone: boolean = true) => {
    setCourseForm(prev => {
      const newForm = { ...prev };
      const modules = isStandalone ? newForm.modules : newForm.mbaModules;
      modules[moduleIndex].documents = modules[moduleIndex].documents.filter((_, i) => i !== documentIndex);
      return newForm;
    });
  };

  const addVideo = (moduleIndex: number, isStandalone: boolean = true) => {
    setCourseForm(prev => {
      const newForm = { ...prev };
      const modules = isStandalone ? newForm.modules : newForm.mbaModules;
      modules[moduleIndex].videos.push({ title: "", url: "", duration: 0 });
      return newForm;
    });
  };

  const removeVideo = (moduleIndex: number, videoIndex: number, isStandalone: boolean = true) => {
    setCourseForm(prev => {
      const newForm = { ...prev };
      const modules = isStandalone ? newForm.modules : newForm.mbaModules;
      modules[moduleIndex].videos = modules[moduleIndex].videos.filter((_, i) => i !== videoIndex);
      return newForm;
    });
  };

  const updateModuleField = (moduleIndex: number, field: string, value: any, isStandalone: boolean = true) => {
    setCourseForm(prev => {
      const newForm = { ...prev };
      const modules = isStandalone ? newForm.modules : newForm.mbaModules;
      modules[moduleIndex] = { ...modules[moduleIndex], [field]: value };
      return newForm;
    });
  };

  const updateVideoField = (moduleIndex: number, videoIndex: number, field: string, value: any, isStandalone: boolean = true) => {
    setCourseForm(prev => {
      const newForm = { ...prev };
      const modules = isStandalone ? newForm.modules : newForm.mbaModules;
      modules[moduleIndex].videos[videoIndex] = { 
        ...modules[moduleIndex].videos[videoIndex], 
        [field]: value 
      };
      return newForm;
    });
  };

  const updateDocumentField = (moduleIndex: number, documentIndex: number, field: string, value: any, isStandalone: boolean = true) => {
    setCourseForm(prev => {
      const newForm = { ...prev };
      const modules = isStandalone ? newForm.modules : newForm.mbaModules;
      modules[moduleIndex].documents[documentIndex] = { 
        ...modules[moduleIndex].documents[documentIndex], 
        [field]: value 
      };
      return newForm;
    });
  };

  // Quiz management functions
  const addQuizQuestion = (moduleIndex: number, isStandalone: boolean = true) => {
    setCourseForm(prev => {
      const newForm = { ...prev };
      const modules = isStandalone ? newForm.modules : newForm.mbaModules;
      
      // Ensure quiz object exists
      if (!modules[moduleIndex].quiz) {
        modules[moduleIndex].quiz = { questions: [] };
      }
      
      modules[moduleIndex].quiz.questions.push({
        text: '',
        choices: ['', '', '', ''],
        correctIndex: 0
      });
      return newForm;
    });
  };

  const removeQuizQuestion = (moduleIndex: number, questionIndex: number, isStandalone: boolean = true) => {
    setCourseForm(prev => {
      const newForm = { ...prev };
      const modules = isStandalone ? newForm.modules : newForm.mbaModules;
      
      // Ensure quiz object exists
      if (!modules[moduleIndex].quiz) {
        modules[moduleIndex].quiz = { questions: [] };
        return newForm;
      }
      
      modules[moduleIndex].quiz.questions = modules[moduleIndex].quiz.questions.filter((_, i) => i !== questionIndex);
      return newForm;
    });
  };

  const updateQuizQuestion = (moduleIndex: number, questionIndex: number, field: string, value: any, isStandalone: boolean = true) => {
    setCourseForm(prev => {
      const newForm = { ...prev };
      const modules = isStandalone ? newForm.modules : newForm.mbaModules;
      
      // Ensure quiz object exists
      if (!modules[moduleIndex].quiz) {
        modules[moduleIndex].quiz = { questions: [] };
        return newForm;
      }
      
      modules[moduleIndex].quiz.questions[questionIndex] = {
        ...modules[moduleIndex].quiz.questions[questionIndex],
        [field]: value
      };
      return newForm;
    });
  };

  const updateQuizChoiceField = (moduleIndex: number, questionIndex: number, choiceIndex: number, value: string, isStandalone: boolean = true) => {
    setCourseForm(prev => {
      const newForm = { ...prev };
      const modules = isStandalone ? newForm.modules : newForm.mbaModules;
      
      // Ensure quiz object exists
      if (!modules[moduleIndex].quiz) {
        modules[moduleIndex].quiz = { questions: [] };
        return newForm;
      }
      
      const choices = [...modules[moduleIndex].quiz.questions[questionIndex].choices];
      choices[choiceIndex] = value;
      modules[moduleIndex].quiz.questions[questionIndex].choices = choices;
      return newForm;
    });
  };

  const handlePreviewDocument = (document: DocumentForm) => {
    if (document.fileUrl) {
      setPreviewDocument(document);
    } else {
      toast({
        title: "No File Available",
        description: "This document hasn't been uploaded yet.",
        variant: "destructive",
      });
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validate required fields
    if (!courseForm.slug || !courseForm.title) {
      toast({
        title: "Validation Error",
        description: "Course slug and title are required.",
        variant: "destructive",
      });
      return;
    }

    // Filter out empty documents and videos before submission, preserve quiz data
    const cleanedCourseForm = {
      ...courseForm,
      modules: courseForm.modules.map(module => {
        console.log(`📋 Processing module "${module.title}" for submission:`, {
          questionsCount: module.quiz?.questions?.length || 0,
          quizData: module.quiz
        });
        
        return {
          ...module,
          videos: module.videos.filter(video => 
            video.title && video.title.trim() && video.url && video.url.trim()
          ),
          documents: module.documents.filter(doc => 
            doc.title && doc.title.trim() && doc.fileUrl && doc.fileUrl.trim() && 
            doc.fileName && doc.publicId && doc.fileType && doc.fileSize
          ),
          quiz: module.quiz || { questions: [] } // Preserve quiz data
        };
      }),
      mbaModules: courseForm.mbaModules.map(module => ({
        ...module,
        videos: module.videos.filter(video => 
          video.title && video.title.trim() && video.url && video.url.trim()
        ),
        documents: module.documents.filter(doc => 
          doc.title && doc.title.trim() && doc.fileUrl && doc.fileUrl.trim() && 
          doc.fileName && doc.publicId && doc.fileType && doc.fileSize
        ),
        quiz: module.quiz || { questions: [] } // Preserve quiz data
      }))
    };
    
    console.log('📤 Submitting course form with quiz data:', cleanedCourseForm);

    updateSandboxCourseMutation.mutate(cleanedCourseForm);
  };

  if (isLoading) {
    return (
      <DashboardLayout>
        <div className="p-6 flex items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin" />
        </div>
      </DashboardLayout>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Edit Sandbox Course
          </CardTitle>
          <CardDescription>
            Update course with uploadable documents instead of external links
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="slug">Course Slug*</Label>
              <Input
                id="slug"
                value={courseForm.slug}
                onChange={(e) => setCourseForm(prev => ({ ...prev, slug: e.target.value }))}
                placeholder="e.g., financial-planning-101"
                required
                disabled // Usually don't allow changing slug in edit mode
              />
            </div>
            <div>
              <Label htmlFor="title">Course Title*</Label>
              <Input
                id="title"
                value={courseForm.title}
                onChange={(e) => setCourseForm(prev => ({ ...prev, title: e.target.value }))}
                placeholder="e.g., Financial Planning 101"
                required
              />
            </div>
          </div>

          <div>
            <Label htmlFor="type">Course Type</Label>
            <Select value={courseForm.type} onValueChange={(value: "standalone" | "with-mba") => 
              setCourseForm(prev => ({ ...prev, type: value }))
            }>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="standalone">Standalone</SelectItem>
                <SelectItem value="with-mba">With MBA</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-4">
            <div className="flex items-center space-x-2">
              <Switch
                id="liveClass"
                checked={courseForm.liveClassConfig.enabled}
                onCheckedChange={(checked) =>
                  setCourseForm(prev => ({
                    ...prev,
                    liveClassConfig: { ...prev.liveClassConfig, enabled: checked }
                  }))
                }
              />
              <Label htmlFor="liveClass">Enable Live Classes</Label>
            </div>

            {courseForm.liveClassConfig.enabled && (
              <div className="grid grid-cols-3 gap-4 pl-6">
                <div>
                  <Label>Frequency</Label>
                  <Select 
                    value={courseForm.liveClassConfig.frequency} 
                    onValueChange={(value: "weekly" | "biweekly" | "monthly") =>
                      setCourseForm(prev => ({
                        ...prev,
                        liveClassConfig: { ...prev.liveClassConfig, frequency: value }
                      }))
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="weekly">Weekly</SelectItem>
                      <SelectItem value="biweekly">Bi-weekly</SelectItem>
                      <SelectItem value="monthly">Monthly</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Day of Week</Label>
                  <Select 
                    value={courseForm.liveClassConfig.dayOfWeek} 
                    onValueChange={(value) =>
                      setCourseForm(prev => ({
                        ...prev,
                        liveClassConfig: { ...prev.liveClassConfig, dayOfWeek: value }
                      }))
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"].map(day => (
                        <SelectItem key={day} value={day}>{day}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Duration (minutes)</Label>
                  <Input
                    type="number"
                    value={courseForm.liveClassConfig.durationMin}
                    onChange={(e) =>
                      setCourseForm(prev => ({
                        ...prev,
                        liveClassConfig: { ...prev.liveClassConfig, durationMin: parseInt(e.target.value) || 60 }
                      }))
                    }
                  />
                </div>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Course Modules */}
      <Card>
        <CardHeader>
          <CardTitle>Course Modules</CardTitle>
          <CardDescription>Edit modules with videos and uploadable documents</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {courseForm.modules.map((module, moduleIndex) => (
            <Card key={moduleIndex} className="border-dashed">
              <CardHeader className="pb-2">
                <div className="flex justify-between items-center">
                  <h4 className="font-medium">Module {moduleIndex + 1}</h4>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    onClick={() => removeModule(moduleIndex)}
                    disabled={courseForm.modules.length === 1}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label>Module Title</Label>
                  <Input
                    value={module.title}
                    onChange={(e) => updateModuleField(moduleIndex, 'title', e.target.value)}
                    placeholder="Enter module title"
                  />
                </div>

                {/* Videos Section */}
                <div>
                  <Label className="text-sm font-medium">Videos</Label>
                  {module.videos.map((video, videoIndex) => (
                    <div key={videoIndex} className="grid grid-cols-12 gap-2 mt-2">
                      <div className="col-span-5">
                        <Input
                          placeholder="Video title"
                          value={video.title}
                          onChange={(e) => updateVideoField(moduleIndex, videoIndex, 'title', e.target.value)}
                        />
                      </div>
                      <div className="col-span-4">
                        <Input
                          placeholder="Video URL"
                          value={video.url}
                          onChange={(e) => updateVideoField(moduleIndex, videoIndex, 'url', e.target.value)}
                        />
                      </div>
                      <div className="col-span-2">
                        <Input
                          type="number"
                          placeholder="Duration (min)"
                          value={video.duration}
                          onChange={(e) => updateVideoField(moduleIndex, videoIndex, 'duration', parseInt(e.target.value) || 0)}
                        />
                      </div>
                      <div className="col-span-1">
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          onClick={() => removeVideo(moduleIndex, videoIndex)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  ))}
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => addVideo(moduleIndex)}
                    className="mt-2"
                  >
                    <Plus className="h-4 w-4 mr-2" />
                    Add Video
                  </Button>
                </div>

                {/* Documents Section */}
                <div>
                  <Label className="text-sm font-medium">Documents (Upload Files)</Label>
                  {module.documents.map((document, documentIndex) => {
                    const uploadKey = `modules-${moduleIndex}-${documentIndex}`;
                    const isUploading = uploading[uploadKey];
                    
                    return (
                      <div key={documentIndex} className="space-y-2 mt-2 p-3 border rounded">
                        <div className="grid grid-cols-12 gap-2">
                          <div className="col-span-4">
                            <Input
                              placeholder="Document title"
                              value={document.title}
                              onChange={(e) => updateDocumentField(moduleIndex, documentIndex, 'title', e.target.value)}
                            />
                          </div>
                          <div className="col-span-5">
                            <div className="flex items-center space-x-2">
                              <input
                                type="file"
                                accept=".pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.csv"
                                onChange={(e) => {
                                  const file = e.target.files?.[0];
                                  if (file) handleFileUpload(moduleIndex, documentIndex, file);
                                }}
                                className="hidden"
                                id={`file-${moduleIndex}-${documentIndex}`}
                              />
                              <label
                                htmlFor={`file-${moduleIndex}-${documentIndex}`}
                                className="flex items-center justify-center w-full px-3 py-2 border border-gray-300 rounded-md cursor-pointer hover:bg-gray-50"
                              >
                                {isUploading ? (
                                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                                ) : (
                                  <Upload className="h-4 w-4 mr-2" />
                                )}
                                {document.fileName || "Choose File"}
                              </label>
                            </div>
                            {document.fileUrl && (
                              <div className="flex items-center mt-1 text-xs text-green-600">
                                <File className="h-3 w-3 mr-1" />
                                Uploaded successfully
                              </div>
                            )}
                          </div>
                          <div className="col-span-3 flex space-x-1">
                            {document.fileUrl && (
                              <Button
                                type="button"
                                variant="ghost"
                                size="icon"
                                onClick={() => handlePreviewDocument(document)}
                                title="Preview document"
                              >
                                <Eye className="h-4 w-4 text-blue-600" />
                              </Button>
                            )}
                            <Button
                              type="button"
                              variant="ghost"
                              size="icon"
                              onClick={() => removeDocument(moduleIndex, documentIndex)}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => addDocument(moduleIndex)}
                    className="mt-2"
                  >
                    <Plus className="h-4 w-4 mr-2" />
                    Add Document
                  </Button>
                </div>

                {/* Quiz Section */}
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <Label className="text-sm font-medium text-purple-800">Module Quiz</Label>
                    <div className="flex gap-2">
                      <QuizUpload
                        moduleTitle={module.title || `Module ${moduleIndex + 1}`}
                        moduleIndex={moduleIndex}
                        courseSlug={courseForm.slug}
                        courseTitle={courseForm.title}
                        onQuizUploaded={(questions, title, description) => {
                          setCourseForm(prev => {
                            const newForm = { ...prev };
                            // Transform to sandbox format
                            const transformedQuestions = questions.map(q => ({
                              text: q.text,
                              choices: q.choices,
                              correctIndex: q.correctIndex
                            }));
                            newForm.modules[moduleIndex].quiz = { questions: transformedQuestions };
                            return newForm;
                          });
                          toast({
                            title: 'Quiz Uploaded',
                            description: `Added ${questions.length} questions to ${module.title || `Module ${moduleIndex + 1}`}`,
                          });
                        }}
                        trigger={
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            className="text-purple-600 hover:text-purple-700 hover:bg-purple-50"
                          >
                            <Upload className="h-4 w-4 mr-2" />
                            Upload Quiz
                          </Button>
                        }
                      />
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => addQuizQuestion(moduleIndex)}
                        className="text-purple-600 hover:text-purple-700 hover:bg-purple-50"
                      >
                        <Plus className="h-4 w-4 mr-2" />
                        Add Question
                      </Button>
                    </div>
                  </div>

                  {(module.quiz?.questions || []).map((question, questionIndex) => (
                    <div key={questionIndex} className="p-4 bg-white border border-purple-200 rounded-lg shadow-sm space-y-3 mb-3">
                      <div className="flex items-center justify-between">
                        <Label className="text-sm font-medium text-purple-800">Question {questionIndex + 1}</Label>
                        {(module.quiz?.questions?.length || 0) > 1 && (
                          <Button
                            type="button"
                            onClick={() => removeQuizQuestion(moduleIndex, questionIndex)}
                            variant="outline"
                            size="sm"
                            className="text-red-600 hover:text-red-700 hover:bg-red-50"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        )}
                      </div>
                      
                      <div className="space-y-2">
                        <Label className="text-xs text-purple-700 font-medium">Question Text</Label>
                        <Textarea
                          value={question.text}
                          onChange={(e) => updateQuizQuestion(moduleIndex, questionIndex, 'text', e.target.value)}
                          placeholder="Enter your quiz question here..."
                          rows={2}
                        />
                      </div>

                      <div className="space-y-2">
                        <Label className="text-xs text-purple-700 font-medium">Answer Choices</Label>
                        {question.choices.map((choice, choiceIndex) => (
                          <div key={choiceIndex} className="flex items-center space-x-2">
                            <input
                              type="radio"
                              name={`question-${moduleIndex}-${questionIndex}`}
                              checked={question.correctIndex === choiceIndex}
                              onChange={() => updateQuizQuestion(moduleIndex, questionIndex, 'correctIndex', choiceIndex)}
                              className="text-purple-600 focus:ring-purple-500"
                            />
                            <Input
                              value={choice}
                              onChange={(e) => updateQuizChoiceField(moduleIndex, questionIndex, choiceIndex, e.target.value)}
                              placeholder={`Choice ${choiceIndex + 1}`}
                              className="flex-1"
                            />
                            <Label className="text-xs text-purple-600 whitespace-nowrap">
                              {question.correctIndex === choiceIndex ? '(Correct)' : ''}
                            </Label>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          ))}
          
          <Button
            type="button"
            variant="outline"
            onClick={() => addModule()}
            className="w-full"
          >
            <Plus className="h-4 w-4 mr-2" />
            Add Module
          </Button>
        </CardContent>
      </Card>

      <div className="flex justify-between">
        <Button 
          type="button" 
          variant="outline" 
          onClick={() => setLocation('/admin/sandbox-courses')}
        >
          Cancel
        </Button>
        <Button 
          type="submit" 
          disabled={updateSandboxCourseMutation.isPending}
        >
          {updateSandboxCourseMutation.isPending && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
          Update Sandbox Course
        </Button>
      </div>

      {/* Document Preview Modal */}
      <Dialog open={!!previewDocument} onOpenChange={() => setPreviewDocument(null)}>
        <DialogContent className="max-w-4xl max-h-[80vh]">
          <DialogHeader>
            <DialogTitle>Preview Document: {previewDocument?.fileName}</DialogTitle>
          </DialogHeader>
          <div className="w-full h-[70vh] border rounded">
            {previewDocument?.fileUrl && (
              <>
                <div className="text-xs text-gray-500 p-2 border-b">
                  File: {previewDocument.fileName} ({previewDocument.fileType})
                </div>
                {previewDocument.fileType === 'application/pdf' ? (
                  // Use PDF.js for PDF preview
                  <PDFPreview 
                    fileUrl={previewDocument.fileUrl}
                    fileName={previewDocument.fileName}
                  />
                ) : previewDocument.fileType === 'text/csv' ? (
                  // Use Papa Parse for CSV preview
                  <CSVPreview 
                    fileUrl={previewDocument.fileUrl}
                    fileName={previewDocument.fileName}
                  />
                ) : previewDocument.fileType?.startsWith('image/') ? (
                  // Show images directly
                  <img
                    src={previewDocument.fileUrl}
                    alt={previewDocument.fileName}
                    className="w-full h-[calc(70vh-60px)] object-contain rounded"
                  />
                ) : previewDocument.fileType?.includes('word') || previewDocument.fileType?.includes('document') ? (
                  // Try Microsoft Office Online for Word documents
                  <iframe
                    src={`https://view.officeapps.live.com/op/embed.aspx?src=${encodeURIComponent(previewDocument.fileUrl)}`}
                    className="w-full h-[calc(70vh-60px)] rounded"
                    title={`Preview of ${previewDocument.fileName}`}
                    onError={() => console.error('Office viewer failed to load')}
                  />
                ) : previewDocument.fileType?.includes('sheet') || previewDocument.fileType?.includes('excel') ? (
                  // Try Microsoft Office Online for Excel documents  
                  <iframe
                    src={`https://view.officeapps.live.com/op/embed.aspx?src=${encodeURIComponent(previewDocument.fileUrl)}`}
                    className="w-full h-[calc(70vh-60px)] rounded"
                    title={`Preview of ${previewDocument.fileName}`}
                    onError={() => console.error('Office viewer failed to load')}
                  />
                ) : (
                  // For other document types, show a message with download option
                  <div className="flex flex-col items-center justify-center h-[calc(70vh-60px)] text-center space-y-4">
                    <FileText className="h-16 w-16 text-gray-400" />
                    <div>
                      <h3 className="text-lg font-medium">Preview not available</h3>
                      <p className="text-gray-500 mt-2">
                        {previewDocument.fileName} ({previewDocument.fileType})
                      </p>
                      <p className="text-sm text-gray-400 mt-1">
                        Use "Open in New Tab" to view this document
                      </p>
                    </div>
                  </div>
                )}
              </>
            )}
          </div>
          <div className="flex justify-end space-x-2">
            <Button 
              variant="outline" 
              onClick={() => setPreviewDocument(null)}
            >
              Close
            </Button>
            <Button 
              onClick={() => {
                if (previewDocument?.fileUrl) {
                  window.open(previewDocument.fileUrl, '_blank');
                }
              }}
            >
              Open in New Tab
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </form>
  );
}

export default function EditSandboxCoursePage() {
  return (
    <DashboardLayout>
      <div className="p-6">
        <EditSandboxCourseForm />
      </div>
    </DashboardLayout>
  );
}
