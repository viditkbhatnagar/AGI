import React, { useState, useEffect } from 'react';
import { useLocation, useRoute } from 'wouter';
import { DashboardLayout } from "@/components/layout/dashboard-layout";
import { Helmet } from "react-helmet-async";
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { Trash2, Plus, Video, FileText, HelpCircle, ChevronDown, ChevronUp, GraduationCap, Upload, X, Loader2, Eye, Link } from 'lucide-react';
import { QuizUpload } from '@/components/admin/QuizUpload';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useToast } from '@/hooks/use-toast';
import { uploadToCloudinary, validateFile, FILE_TYPES, FileUploadResponse, createDownloadLink } from '@/lib/cloudinary';
import { PDFPreview } from "@/components/ui/pdf-preview";
import { CSVPreview } from "@/components/ui/csv-preview";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

interface VideoForm {
  title: string;
  duration: number;
  url: string;
}

interface DocumentForm {
  title: string;
  type: 'link' | 'upload';
  // For link-based documents (backward compatibility)
  url?: string;
  // For uploaded documents (new functionality)
  file?: File | null;
  fileUrl?: string;
  fileName?: string;
  fileSize?: number;
  fileType?: string;
  publicId?: string;
}

interface QuizQuestionForm {
  text: string;
  choices: string[];
  correctIndex: number;
}

interface ModuleForm {
  title: string;
  description: string; // Optional module description
  videos: VideoForm[];
  documents: DocumentForm[];
  quiz: {
    questions: QuizQuestionForm[];
  };
}

interface CourseForm {
  slug: string;
  title: string;
  type: 'standalone' | 'with-mba';
  description: string;
  modules: ModuleForm[];
  liveClassConfig: {
    enabled: boolean;
    frequency: 'weekly' | 'biweekly' | 'monthly';
    dayOfWeek: string;
    durationMin: number;
  };
}

interface FinalExamQuestion {
  type: 'mcq' | 'essay';
  text?: string;
  choices?: string[];
  correctIndex?: number;
  questionDocument?: {
    title: string;
    url: string;
    type: 'word' | 'pdf' | 'ppt' | 'image' | 'excel' | 'csv' | 'textbox';
    fileName: string;
  };
  allowedAnswerFormats?: ('word' | 'powerpoint' | 'pdf' | 'excel' | 'csv' | 'image')[];
}

interface FinalExam {
  _id?: string;
  courseSlug: string;
  title: string;
  description?: string;
  questions: FinalExamQuestion[];
}

function FinalExaminationSection({ courseSlug }: { courseSlug: string }) {
  const [showForm, setShowForm] = useState(false);
  const [finalExam, setFinalExam] = useState<FinalExam | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [uploadingFiles, setUploadingFiles] = useState<Record<number, boolean>>({});
  const { toast } = useToast();

  // Fetch existing final exam for this course
  useEffect(() => {
    const fetchFinalExam = async () => {
      try {
        setIsLoading(true);
        const token = localStorage.getItem('token');
        const response = await fetch(`/api/admin/final-exams/${courseSlug}`, {
          headers: token ? { Authorization: `Bearer ${token}` } : undefined,
        });
        
        if (response.ok) {
          const exam = await response.json();
          setFinalExam(exam);
        } else if (response.status !== 404) {
          // Only show error if it's not a 404 (which means no exam exists)
          console.error('Failed to fetch final exam');
        }
      } catch (error) {
        console.error('Error fetching final exam:', error);
      } finally {
        setIsLoading(false);
      }
    };

    if (courseSlug) {
      fetchFinalExam();
    }
  }, [courseSlug]);

  const initializeNewExam = () => {
    setFinalExam({
      courseSlug,
      title: 'Final Examination',
      description: '',
      questions: [{
        type: 'mcq',
        text: '',
        choices: ['', '', '', ''],
        correctIndex: 0
      }]
    });
    setShowForm(true);
  };

  const addQuestion = (type: 'mcq' | 'essay') => {
    if (!finalExam) return;
    
    const newQuestion: FinalExamQuestion = {
      type,
      ...(type === 'mcq' 
        ? { 
            text: '',
            choices: ['', '', '', ''], 
            correctIndex: 0 
          }
        : { 
            questionDocument: {
              title: '',
              url: '',
              type: 'pdf',
              fileName: ''
            },
            allowedAnswerFormats: ['pdf']
          }
      )
    };
    
    setFinalExam({
      ...finalExam,
      questions: [...finalExam.questions, newQuestion]
    });
  };

  const updateQuestion = (index: number, field: string, value: any) => {
    if (!finalExam) return;
    
    const updatedQuestions = [...finalExam.questions];
    updatedQuestions[index] = {
      ...updatedQuestions[index],
      [field]: value
    };
    
    setFinalExam({
      ...finalExam,
      questions: updatedQuestions
    });
  };

  const updateChoice = (questionIndex: number, choiceIndex: number, value: string) => {
    if (!finalExam) return;
    
    const updatedQuestions = [...finalExam.questions];
    const question = updatedQuestions[questionIndex];
    if (question.type === 'mcq' && question.choices) {
      question.choices[choiceIndex] = value;
    }
    
    setFinalExam({
      ...finalExam,
      questions: updatedQuestions
    });
  };

  const removeQuestion = (index: number) => {
    if (!finalExam || finalExam.questions.length <= 1) return;
    
    setFinalExam({
      ...finalExam,
      questions: finalExam.questions.filter((_, i) => i !== index)
    });
  };

  const toggleAnswerFormat = (questionIndex: number, format: string) => {
    if (!finalExam) return;
    
    const updatedQuestions = [...finalExam.questions];
    const question = updatedQuestions[questionIndex];
    
    if (question.type === 'essay') {
      const currentFormats = question.allowedAnswerFormats || [];
      const newFormats = currentFormats.includes(format as any)
        ? currentFormats.filter(f => f !== format)
        : [...currentFormats, format as any];
      
      question.allowedAnswerFormats = newFormats;
    }
    
    setFinalExam({
      ...finalExam,
      questions: updatedQuestions
    });
  };

  const handleQuestionDocumentUpload = async (questionIndex: number, file: File) => {
    if (!finalExam) return;

    // Validate file before upload
    const validation = validateFile(file, {
      maxSizeMB: 10, // Cloudinary free tier limit
      allowedTypes: FILE_TYPES.ALL_UPLOADS
    });

    if (!validation.isValid) {
      toast({
        title: 'Upload Error',
        description: validation.error,
        variant: 'destructive'
      });
      return;
    }

    // Set loading state for this specific question
    setUploadingFiles(prev => ({ ...prev, [questionIndex]: true }));

    try {
      // Upload to Cloudinary
      const uploadResult: FileUploadResponse = await uploadToCloudinary(file, 'question-documents');
      
      const updatedQuestions = [...finalExam.questions];
      const question = updatedQuestions[questionIndex];
      
      if (question.type === 'essay' && question.questionDocument) {
        question.questionDocument.title = uploadResult.fileName;
        question.questionDocument.url = uploadResult.url;
        question.questionDocument.fileName = uploadResult.fileName;
        question.questionDocument.type = getFileType(uploadResult.fileName);
      }
      
      setFinalExam({
        ...finalExam,
        questions: updatedQuestions
      });

      toast({
        title: 'Upload Successful',
        description: `${uploadResult.fileName} has been uploaded successfully.`
      });

    } catch (error) {
      console.error('Upload error:', error);
      toast({
        title: 'Upload Failed',
        description: error instanceof Error ? error.message : 'Failed to upload file. Please try again.',
        variant: 'destructive'
      });
    } finally {
      // Remove loading state
      setUploadingFiles(prev => ({ ...prev, [questionIndex]: false }));
    }
  };

  const getFileType = (fileName: string): 'word' | 'pdf' | 'ppt' | 'image' | 'excel' | 'csv' | 'textbox' => {
    const ext = fileName.toLowerCase().split('.').pop();
    switch (ext) {
      case 'doc':
      case 'docx':
        return 'word';
      case 'pdf':
        return 'pdf';
      case 'ppt':
      case 'pptx':
        return 'ppt';
      case 'jpg':
      case 'jpeg':
      case 'png':
        return 'image';
      case 'xls':
      case 'xlsx':
        return 'excel';
      case 'csv':
        return 'csv';
      default:
        return 'pdf';
    }
  };

  const saveFinalExam = async () => {
    if (!finalExam) return;
    
    setIsSaving(true);
    try {
      const token = localStorage.getItem('token');
      const response = await fetch('/api/admin/final-exams', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token && { Authorization: `Bearer ${token}` })
        },
        body: JSON.stringify(finalExam)
      });

      if (!response.ok) {
        throw new Error('Failed to save final examination');
      }

      toast({
        title: "Success",
        description: "Final examination saved successfully!",
      });

      setShowForm(false);
    } catch (error) {
      console.error('Error saving final exam:', error);
      toast({
        title: "Error",
        description: "Failed to save final examination",
        variant: "destructive",
      });
    } finally {
      setIsSaving(false);
    }
  };

  const deleteFinalExam = async () => {
    if (!finalExam || !confirm('Are you sure you want to delete this final examination?')) return;
    
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`/api/admin/final-exams/${courseSlug}`, {
        method: 'DELETE',
        headers: token ? { Authorization: `Bearer ${token}` } : undefined,
      });

      if (!response.ok) {
        throw new Error('Failed to delete final examination');
      }

      toast({
        title: "Success",
        description: "Final examination deleted successfully!",
      });

      setFinalExam(null);
      setShowForm(false);
    } catch (error) {
      console.error('Error deleting final exam:', error);
      toast({
        title: "Error",
        description: "Failed to delete final examination",
        variant: "destructive",
      });
    }
  };

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <GraduationCap className="h-5 w-5 mr-2" />
            Final Examination
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="animate-pulse">
            <div className="h-4 bg-gray-200 rounded w-3/4 mb-2"></div>
            <div className="h-4 bg-gray-200 rounded w-1/2"></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <div className="flex items-center">
            <GraduationCap className="h-5 w-5 mr-2" />
            Final Examination
          </div>
          {finalExam && !showForm && (
            <div className="flex space-x-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setShowForm(true)}
              >
                Edit
              </Button>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={deleteFinalExam}
                className="text-red-600 hover:text-red-700"
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent>
        {!finalExam && !showForm ? (
          <div className="text-center py-8">
            <GraduationCap className="h-12 w-12 text-gray-300 mx-auto mb-4" />
            <p className="text-gray-500 mb-4">No final examination created for this course.</p>
            <Button type="button" onClick={initializeNewExam}>
              <Plus className="h-4 w-4 mr-2" />
              Create Final Examination
            </Button>
          </div>
        ) : !showForm && finalExam ? (
          <div className="space-y-4">
            <div>
              <h3 className="font-semibold text-lg">{finalExam.title}</h3>
              {finalExam.description && (
                <p className="text-gray-600 mt-1">{finalExam.description}</p>
              )}
            </div>
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <span className="text-gray-500">Questions:</span>
                <div className="font-medium">{finalExam.questions.length}</div>
              </div>
              <div>
                <span className="text-gray-500">Question Types:</span>
                <div className="font-medium">
                  {finalExam.questions.map(q => q.type).join(', ')}
                </div>
              </div>
            </div>
          </div>
        ) : (
          <div className="space-y-6">
            {/* Basic Exam Info */}
            <div className="space-y-4">
              <div className="space-y-2">
                <Label>Examination Title *</Label>
                <Input
                  value={finalExam?.title || ''}
                  onChange={(e) => setFinalExam(prev => prev ? { ...prev, title: e.target.value } : null)}
                  placeholder="Final Examination"
                />
              </div>

              <div className="space-y-2">
                <Label>Description</Label>
                <Textarea
                  value={finalExam?.description || ''}
                  onChange={(e) => setFinalExam(prev => prev ? { ...prev, description: e.target.value } : null)}
                  placeholder="Instructions for the examination..."
                  rows={3}
                />
              </div>
            </div>

            {/* Questions */}
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <Label className="text-lg font-semibold">Questions</Label>
                <div className="flex space-x-2">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => addQuestion('mcq')}
                  >
                    <Plus className="h-4 w-4 mr-2" />
                    Add MCQ
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => addQuestion('essay')}
                  >
                    <Plus className="h-4 w-4 mr-2" />
                    Add Essay
                  </Button>
                </div>
              </div>

              {finalExam?.questions.map((question, qIndex) => (
                <Card key={qIndex} className={`border-l-4 ${question.type === 'mcq' ? 'border-l-blue-500' : 'border-l-green-500'}`}>
                  <CardHeader>
                    <div className="flex justify-between items-start">
                      <div className="flex items-center space-x-2">
                        <Badge variant={question.type === 'mcq' ? 'default' : 'secondary'}>
                          {question.type === 'mcq' ? 'Multiple Choice' : 'Essay/Long Answer'}
                        </Badge>
                        <span className="text-sm text-gray-500">Question {qIndex + 1}</span>
                      </div>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => removeQuestion(qIndex)}
                        className="text-red-600 hover:text-red-700"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {question.type === 'mcq' && (
                      <>
                        <div className="space-y-2">
                          <Label>Question Text *</Label>
                          <Textarea
                            value={question.text || ''}
                            onChange={(e) => updateQuestion(qIndex, 'text', e.target.value)}
                            placeholder="Enter your question here..."
                            rows={2}
                          />
                        </div>

                        <div className="space-y-2">
                          <Label>Answer Choices</Label>
                          {question.choices?.map((choice, cIndex) => (
                            <div key={cIndex} className="flex items-center space-x-2">
                              <input
                                type="radio"
                                name={`correct-${qIndex}`}
                                checked={question.correctIndex === cIndex}
                                onChange={() => updateQuestion(qIndex, 'correctIndex', cIndex)}
                              />
                              <Input
                                value={choice}
                                onChange={(e) => updateChoice(qIndex, cIndex, e.target.value)}
                                placeholder={`Option ${String.fromCharCode(65 + cIndex)}`}
                              />
                            </div>
                          ))}
                        </div>
                      </>
                    )}

                    {question.type === 'essay' && (
                      <>
                        <div className="space-y-2">
                          <Label>Description</Label>
                          <Textarea
                            value={question.questionDocument?.title || ''}
                            onChange={(e) => updateQuestion(qIndex, 'questionDocument', {
                              ...question.questionDocument,
                              title: e.target.value
                            })}
                            placeholder="Brief description or instructions for this question..."
                            rows={2}
                          />
                        </div>

                        <div className="space-y-2">
                          <Label>Question Document *</Label>
                          <div className={`border-2 border-dashed border-gray-300 rounded-lg p-6 text-center ${
                            uploadingFiles[qIndex] ? 'bg-gray-50' : ''
                          }`}>
                            {uploadingFiles[qIndex] ? (
                              <div className="flex flex-col items-center">
                                <Loader2 className="h-8 w-8 text-blue-500 animate-spin mx-auto mb-2" />
                                <p className="text-sm text-blue-600">Uploading...</p>
                              </div>
                            ) : (
                              <>
                                <Upload className="h-8 w-8 text-gray-400 mx-auto mb-2" />
                                <input
                                  type="file"
                                  accept=".doc,.docx,.pdf,.ppt,.pptx,.xls,.xlsx,.csv,.jpg,.jpeg,.png,.gif,.webp"
                                  onChange={(e) => {
                                    const file = e.target.files?.[0];
                                    if (file) handleQuestionDocumentUpload(qIndex, file);
                                  }}
                                  className="hidden"
                                  id={`question-document-${qIndex}`}
                                  disabled={uploadingFiles[qIndex]}
                                />
                                <label
                                  htmlFor={`question-document-${qIndex}`}
                                  className={`cursor-pointer text-blue-600 hover:text-blue-800 ${
                                    uploadingFiles[qIndex] ? 'pointer-events-none opacity-50' : ''
                                  }`}
                                >
                                  Click to upload question document
                                </label>
                                <p className="text-xs text-gray-500 mt-1">
                                  Supports: Word, PDF, PowerPoint, Excel, CSV, Images (Max 10MB)
                                </p>
                              </>
                            )}
                            {question.questionDocument?.fileName && (
                              <div className="mt-3 p-2 bg-green-50 rounded border border-green-200">
                                <p className="text-sm text-green-700 font-medium">
                                  ✓ Uploaded: {question.questionDocument.fileName}
                                </p>
                                {question.questionDocument.url && (
                                  <button
                                    onClick={() => {
                                      if (question.questionDocument?.url) {
                                        createDownloadLink(question.questionDocument.url, question.questionDocument.fileName);
                                      }
                                    }}
                                    className="text-xs text-blue-600 hover:text-blue-800 underline bg-transparent border-none cursor-pointer"
                                  >
                                    View/Download
                                  </button>
                                )}
                              </div>
                            )}
                          </div>
                        </div>

                        <div className="space-y-3">
                          <Label>Allowed Answer Formats for Students</Label>
                          <div className="grid grid-cols-2 md:grid-cols-6 gap-2">
                            {['word', 'powerpoint', 'pdf', 'excel', 'csv', 'image'].map((format) => (
                              <div key={format} className="flex items-center space-x-2">
                                <Checkbox
                                  checked={question.allowedAnswerFormats?.includes(format as any) || false}
                                  onCheckedChange={() => toggleAnswerFormat(qIndex, format)}
                                />
                                <span className="text-sm capitalize">{format}</span>
                              </div>
                            ))}
                          </div>
                          <p className="text-xs text-gray-500">
                            Select the file formats students can upload as their answer sheets
                          </p>
                        </div>
                      </>
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>

            {/* Action Buttons */}
            <div className="flex justify-end space-x-2 pt-4 border-t">
              <Button
                type="button"
                variant="outline"
                onClick={() => setShowForm(false)}
                disabled={isSaving}
              >
                Cancel
              </Button>
              <Button
                type="button"
                onClick={saveFinalExam}
                disabled={isSaving}
              >
                {isSaving ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                    Saving...
                  </>
                ) : (
                  'Save Final Examination'
                )}
              </Button>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function EditCourseForm({ courseSlug }: { courseSlug: string }) {
  const [, setLocation] = useLocation();
  const [moduleToDelete, setModuleToDelete] = useState<number | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [form, setForm] = useState<CourseForm | null>(null);
  const [expandedModules, setExpandedModules] = useState<boolean[]>([]);
  const { toast } = useToast();
  const [uploading, setUploading] = useState<{ [key: string]: boolean }>({});
  const [previewDocument, setPreviewDocument] = useState<DocumentForm | null>(null);
  const [showPreviewDialog, setShowPreviewDialog] = useState(false);
  const queryClient = useQueryClient();

  // Fetch course data
  const { data: courseData, isLoading } = useQuery({
    queryKey: [`/api/courses/${courseSlug}`],
    queryFn: async () => {
      const token = localStorage.getItem('token');
      const res = await fetch(`/api/courses/${courseSlug}`, {
        headers: token ? { Authorization: `Bearer ${token}` } : undefined,
      });
      if (!res.ok) throw new Error('Failed to fetch course');
      return res.json();
    },
  });

  // Fetch quizzes for the course
  const { data: quizzes = [] } = useQuery({
    queryKey: [`/api/courses/${courseSlug}/quizzes`],
    queryFn: async () => {
      const token = localStorage.getItem('token');
      try {
        const res = await fetch(`/api/courses/${courseSlug}/quizzes`, {
          headers: token ? { Authorization: `Bearer ${token}` } : undefined,
        });
        if (!res.ok) return [];
        return res.json();
      } catch {
        return [];
      }
    },
  });

  // Initialize form when course data is loaded
  useEffect(() => {
    if (courseData) {
      console.log('🔍 Raw course data from backend:', courseData);
      console.log('🔍 First module documents:', courseData.modules?.[0]?.documents);
      console.log('🔍 First module questions (legacy):', courseData.modules?.[0]?.questions);
      console.log('🔍 Separate quiz documents:', quizzes);
      
      // Transform course data to match form structure
      const transformedModules = courseData.modules?.map((module: any, index: number) => {
        // Find corresponding quiz for this module
        const moduleQuiz = quizzes.find((q: any) => q.moduleIndex === index);
        
        // Prioritize legacy questions (from quiz repository deployment) over separate Quiz documents
        let quizQuestions;
        if (module.questions && Array.isArray(module.questions) && module.questions.length > 0) {
          // Use legacy questions from module (deployed from quiz repository)
          console.log(`🔄 Using legacy questions for module ${index}:`, module.questions);
          quizQuestions = module.questions.map((q: any) => ({
            text: q.text || '',
            choices: q.choices || ['', '', '', ''],
            correctIndex: q.correctIndex || 0
          }));
        } else if (moduleQuiz?.questions?.length > 0) {
          // Fallback to separate Quiz documents
          console.log(`🔄 Using separate quiz document for module ${index}:`, moduleQuiz.questions);
          quizQuestions = moduleQuiz.questions.map((q: any) => ({
            text: q.text || '',
            choices: q.choices || ['', '', '', ''],
            correctIndex: q.correctIndex || 0
          }));
        } else {
          // Default empty question
          quizQuestions = [{
            text: '',
            choices: ['', '', '', ''],
            correctIndex: 0
          }];
        }
        
        return {
          title: module.title || '',
          description: module.description || '', // Optional module description
          videos: module.videos?.map((v: any) => ({
            title: v.title || '',
            duration: v.duration || 0,
            url: v.url || ''
          })) || [{ title: '', duration: 0, url: '' }],
          documents: module.documents?.map((d: any) => ({
            title: d.title || '',
            type: d.type || 'link',
            // Always include all properties, let the UI decide what to show
            url: d.url || '',
            fileUrl: d.fileUrl,
            fileName: d.fileName,
            fileSize: d.fileSize,
            fileType: d.fileType,
            publicId: d.publicId
          })) || [{ title: '', type: 'link', url: '' }],
          quiz: {
            questions: quizQuestions
          }
        };
      }) || [];

      setForm({
        slug: courseData.slug || '',
        title: courseData.title || '',
        type: courseData.type || 'standalone',
        description: courseData.description || '',
        modules: transformedModules.length > 0 ? transformedModules : [{
          title: '',
          videos: [{ title: '', duration: 0, url: '' }],
          documents: [{ title: '', type: 'link', url: '' }],
          quiz: {
            questions: [{
              text: '',
              choices: ['', '', '', ''],
              correctIndex: 0
            }]
          }
        }],
        liveClassConfig: {
          enabled: courseData.liveClassConfig?.enabled || false,
          frequency: courseData.liveClassConfig?.frequency || 'weekly',
          dayOfWeek: courseData.liveClassConfig?.dayOfWeek || 'Monday',
          durationMin: courseData.liveClassConfig?.durationMin || 60
        }
      });

      // Initialize expanded state for all modules
      setExpandedModules(new Array(transformedModules.length > 0 ? transformedModules.length : 1).fill(true));
    }
  }, [courseData, quizzes]);

  if (isLoading || !form) {
    return (
      <div className="p-4 md:p-6">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-gray-800">Loading Course...</h1>
        </div>
        <Card>
          <CardContent className="p-6">
            <div className="animate-pulse space-y-4">
              <div className="h-4 bg-gray-200 rounded w-3/4"></div>
              <div className="h-4 bg-gray-200 rounded w-1/2"></div>
              <div className="h-32 bg-gray-200 rounded"></div>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  const generateSlug = (title: string) => {
    return title
      .toLowerCase()
      .replace(/\s+/g, '-')
      .trim();
  };

  const handleTitleChange = (title: string) => {
    setForm(prev => prev ? ({
      ...prev,
      title,
      slug: generateSlug(title)
    }) : null);
  };

  const toggleModule = (moduleIndex: number) => {
    setExpandedModules(prev => 
      prev.map((expanded, i) => i === moduleIndex ? !expanded : expanded)
    );
  };

  const addModule = () => {
    setForm(prev => prev ? ({
      ...prev,
      modules: [...prev.modules, {
        title: '',
        description: '', // Optional module description
        videos: [{ title: '', duration: 0, url: '' }],
        documents: [{ title: '', type: 'link', url: '' }],
        quiz: {
          questions: [{
            text: '',
            choices: ['', '', '', ''],
            correctIndex: 0
          }]
        }
      }]
    }) : null);
    // Expand the new module by default
    setExpandedModules(prev => [...prev, true]);
  };

  const removeModule = async (moduleIndex: number) => {
    if (form && form.modules.length > 1) {
      // Update local state first
      const updatedForm = {
        ...form,
        modules: form.modules.filter((_, i) => i !== moduleIndex)
      };
      
      setForm(updatedForm);
      // Remove the corresponding expanded state
      setExpandedModules(prev => prev.filter((_, i) => i !== moduleIndex));
      
      // Immediately save to database
      try {
        setSaving(true);
        const token = localStorage.getItem('token');
        const response = await fetch(`/api/courses/${courseSlug}`, {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
            ...(token && { Authorization: `Bearer ${token}` })
          },
          body: JSON.stringify(updatedForm)
        });

        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.message || 'Failed to delete module');
        }

        toast({
          title: "Success",
          description: "Module deleted successfully!",
        });
        
        // Close confirmation dialog
        setModuleToDelete(null);
      } catch (error) {
        // Revert the state if save failed
        setForm(form);
        setExpandedModules(prev => {
          const newExpanded = [...prev];
          newExpanded.splice(moduleIndex, 0, true); // Re-insert the expanded state
          return newExpanded;
        });
        
        toast({
          title: "Error",
          description: error instanceof Error ? error.message : "Failed to delete module",
          variant: "destructive",
        });
      } finally {
        setSaving(false);
      }
    }
  };
  
  const handleDeleteModule = (moduleIndex: number) => {
    setModuleToDelete(moduleIndex);
  };
  
  const confirmDeleteModule = () => {
    if (moduleToDelete !== null) {
      removeModule(moduleToDelete);
    }
  };

  const updateModule = (moduleIndex: number, field: string, value: any) => {
    setForm(prev => prev ? ({
      ...prev,
      modules: prev.modules.map((module, i) => 
        i === moduleIndex ? { ...module, [field]: value } : module
      )
    }) : null);
  };

  const addVideo = (moduleIndex: number) => {
    if (!form) return;
    const updatedModules = [...form.modules];
    updatedModules[moduleIndex].videos.push({ title: '', duration: 0, url: '' });
    setForm(prev => prev ? ({ ...prev, modules: updatedModules }) : null);
  };

  const removeVideo = (moduleIndex: number, videoIndex: number) => {
    if (!form) return;
    const updatedModules = [...form.modules];
    if (updatedModules[moduleIndex].videos.length > 1) {
      updatedModules[moduleIndex].videos.splice(videoIndex, 1);
      setForm(prev => prev ? ({ ...prev, modules: updatedModules }) : null);
    }
  };

  const updateVideo = (moduleIndex: number, videoIndex: number, field: keyof VideoForm, value: any) => {
    if (!form) return;
    const updatedModules = [...form.modules];
    updatedModules[moduleIndex].videos[videoIndex] = {
      ...updatedModules[moduleIndex].videos[videoIndex],
      [field]: value
    };
    setForm(prev => prev ? ({ ...prev, modules: updatedModules }) : null);
  };

  const addDocument = (moduleIndex: number) => {
    if (!form) return;
    const updatedModules = [...form.modules];
    updatedModules[moduleIndex].documents.push({ title: '', type: 'link', url: '' });
    setForm(prev => prev ? ({ ...prev, modules: updatedModules }) : null);
  };

  const handleFileUpload = async (
    moduleIndex: number, 
    documentIndex: number, 
    file: File
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

    const uploadKey = `modules-${moduleIndex}-${documentIndex}`;
    setUploading(prev => ({ ...prev, [uploadKey]: true }));

    try {
      const result = await uploadToCloudinary(file, 'question-documents');
      
      const documentData: DocumentForm = {
        title: file.name.split('.')[0],
        type: 'upload',
        file: null,
        fileUrl: result.url,
        fileName: result.fileName,
        fileSize: result.fileSize,
        fileType: result.fileType,
        publicId: result.publicId
      };

      if (!form) return;
      const updatedModules = [...form.modules];
      updatedModules[moduleIndex].documents[documentIndex] = documentData;
      setForm(prev => prev ? ({ ...prev, modules: updatedModules }) : null);

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

  const removeDocument = (moduleIndex: number, docIndex: number) => {
    if (!form) return;
    const updatedModules = [...form.modules];
    if (updatedModules[moduleIndex].documents.length > 1) {
      updatedModules[moduleIndex].documents.splice(docIndex, 1);
      setForm(prev => prev ? ({ ...prev, modules: updatedModules }) : null);
    }
  };

  const updateDocument = (moduleIndex: number, docIndex: number, field: keyof DocumentForm, value: string) => {
    if (!form) return;
    const updatedModules = [...form.modules];
    updatedModules[moduleIndex].documents[docIndex] = {
      ...updatedModules[moduleIndex].documents[docIndex],
      [field]: value
    };
    setForm(prev => prev ? ({ ...prev, modules: updatedModules }) : null);
  };

  // Quiz management functions
  const addQuizQuestion = (moduleIndex: number) => {
    if (!form) return;
    const updatedModules = [...form.modules];
    updatedModules[moduleIndex].quiz.questions.push({
      text: '',
      choices: ['', '', '', ''],
      correctIndex: 0
    });
    setForm(prev => prev ? ({ ...prev, modules: updatedModules }) : null);
  };

  const removeQuizQuestion = (moduleIndex: number, questionIndex: number) => {
    if (!form) return;
    const updatedModules = [...form.modules];
    if (updatedModules[moduleIndex].quiz.questions.length > 1) {
      updatedModules[moduleIndex].quiz.questions.splice(questionIndex, 1);
      setForm(prev => prev ? ({ ...prev, modules: updatedModules }) : null);
    }
  };

  const updateQuizQuestion = (moduleIndex: number, questionIndex: number, field: 'text' | 'correctIndex', value: string | number) => {
    if (!form) return;
    const updatedModules = [...form.modules];
    updatedModules[moduleIndex].quiz.questions[questionIndex] = {
      ...updatedModules[moduleIndex].quiz.questions[questionIndex],
      [field]: value
    };
    setForm(prev => prev ? ({ ...prev, modules: updatedModules }) : null);
  };

  const updateQuizChoice = (moduleIndex: number, questionIndex: number, choiceIndex: number, value: string) => {
    if (!form) return;
    const updatedModules = [...form.modules];
    updatedModules[moduleIndex].quiz.questions[questionIndex].choices[choiceIndex] = value;
    setForm(prev => prev ? ({ ...prev, modules: updatedModules }) : null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form) return;
    
    console.log('📤 Submitting form data:', form);
    console.log('📤 First module documents being sent:', form.modules[0]?.documents);
    
    setSaving(true);
    setError(null);

    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`/api/courses/${courseSlug}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          ...(token && { Authorization: `Bearer ${token}` })
        },
        body: JSON.stringify(form)
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to update course');
      }

      // Show success toast
      toast({
        title: "Success",
        description: "Course updated successfully!",
      });

      // Invalidate queries to refresh data
      queryClient.invalidateQueries({ queryKey: [`/api/courses/${courseSlug}`] });
      queryClient.invalidateQueries({ queryKey: [`/api/courses/${courseSlug}/quizzes`] });
      queryClient.invalidateQueries({ queryKey: ['courses'] });

      // Small delay to show the success message before redirecting
      setTimeout(() => {
        setLocation('/admin/courses');
      }, 1000);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'An error occurred';
      setError(errorMessage);
      
      // Show error toast
      toast({
        title: "Error",
        description: errorMessage,
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="p-4 md:p-6">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-800">Edit Course</h1>
        <p className="text-gray-600">Update course modules, videos, documents, and quizzes</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Course Information</CardTitle>
        </CardHeader>
        <CardContent className="relative">
          {saving && (
            <div className="absolute inset-0 bg-white bg-opacity-75 z-50 flex items-center justify-center rounded-lg">
              <div className="flex items-center space-x-3 bg-white p-4 rounded-lg shadow-lg border">
                <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
                <span className="text-lg font-medium text-gray-700">Updating course content...</span>
              </div>
            </div>
          )}
          <form onSubmit={handleSubmit} className="space-y-6">
            {error && (
              <div className="p-3 border border-red-300 bg-red-50 text-red-700 rounded">
                {error}
              </div>
            )}

            {/* Basic Course Info */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="title">Course Title *</Label>
                <Input
                  id="title"
                  value={form.title}
                  onChange={(e) => handleTitleChange(e.target.value)}
                  placeholder="e.g., Certified Supply Chain Professional"
                  disabled={saving}
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="slug">Course Slug *</Label>
                <Input
                  id="slug"
                  value={form.slug}
                  onChange={(e) => setForm(prev => prev ? ({ ...prev, slug: e.target.value }) : null)}
                  placeholder="e.g., certified-supply-chain-professional"
                  disabled={saving}
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="type">Course Type *</Label>
                <Select value={form.type} onValueChange={(value: 'standalone' | 'with-mba') => setForm(prev => prev ? ({ ...prev, type: value }) : null)} disabled={saving}>
                  <SelectTrigger disabled={saving}>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="standalone">Standalone</SelectItem>
                    <SelectItem value="with-mba">With MBA</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="description">Description</Label>
                <Textarea
                  id="description"
                  value={form.description}
                  onChange={(e) => setForm(prev => prev ? ({ ...prev, description: e.target.value }) : null)}
                  placeholder="Brief description of the course"
                  disabled={saving}
                  rows={3}
                />
              </div>
            </div>

            {/* Live Class Configuration */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Live Class Configuration</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center space-x-2">
                  <Checkbox
                    checked={form.liveClassConfig.enabled}
                    onCheckedChange={(checked) => 
                      setForm(prev => prev ? ({
                        ...prev,
                        liveClassConfig: { ...prev.liveClassConfig, enabled: !!checked }
                      }) : null)
                    }
                  />
                  <Label>Enable Live Classes</Label>
                </div>

                {form.liveClassConfig.enabled && (
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="space-y-2">
                      <Label>Frequency</Label>
                      <Select 
                        value={form.liveClassConfig.frequency} 
                        onValueChange={(value: 'weekly' | 'biweekly' | 'monthly') => 
                          setForm(prev => prev ? ({
                            ...prev,
                            liveClassConfig: { ...prev.liveClassConfig, frequency: value }
                          }) : null)
                        }
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="weekly">Weekly</SelectItem>
                          <SelectItem value="biweekly">Biweekly</SelectItem>
                          <SelectItem value="monthly">Monthly</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-2">
                      <Label>Day of Week</Label>
                      <Select 
                        value={form.liveClassConfig.dayOfWeek} 
                        onValueChange={(value) => 
                          setForm(prev => prev ? ({
                            ...prev,
                            liveClassConfig: { ...prev.liveClassConfig, dayOfWeek: value }
                          }) : null)
                        }
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="Monday">Monday</SelectItem>
                          <SelectItem value="Tuesday">Tuesday</SelectItem>
                          <SelectItem value="Wednesday">Wednesday</SelectItem>
                          <SelectItem value="Thursday">Thursday</SelectItem>
                          <SelectItem value="Friday">Friday</SelectItem>
                          <SelectItem value="Saturday">Saturday</SelectItem>
                          <SelectItem value="Sunday">Sunday</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-2">
                      <Label>Duration (minutes)</Label>
                      <Input
                        type="number"
                        value={form.liveClassConfig.durationMin}
                        onChange={(e) => 
                          setForm(prev => prev ? ({
                            ...prev,
                            liveClassConfig: { ...prev.liveClassConfig, durationMin: parseInt(e.target.value) || 60 }
                          }) : null)
                        }
                        min="30"
                        max="180"
                      />
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Modules */}
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold">Course Modules</h3>
                <Button type="button" onClick={addModule} variant="outline" size="sm" disabled={saving}>
                  <Plus className="h-4 w-4 mr-2" />
                  Add Module
                </Button>
              </div>

              {form.modules.map((module, moduleIndex) => {
                const isExpanded = expandedModules[moduleIndex] ?? true;
                const videoCount = module.videos.filter(v => v.title.trim() || v.url.trim()).length;
                const documentCount = module.documents.filter(d => d.title.trim() || (d.url && d.url.trim()) || d.fileUrl).length;
                const questionCount = module.quiz.questions.filter(q => q.text.trim()).length;
                
                return (
                <Card key={moduleIndex} className="border-l-4 border-l-blue-500 shadow-md">
                  <CardHeader className="bg-gradient-to-r from-blue-50 to-indigo-50 border-b">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-3">
                        <Button
                          type="button"
                          onClick={() => toggleModule(moduleIndex)}
                          variant="ghost"
                          size="sm"
                          className="p-1"
                        >
                          {isExpanded ? (
                            <ChevronUp className="h-4 w-4 text-blue-600" />
                          ) : (
                            <ChevronDown className="h-4 w-4 text-blue-600" />
                          )}
                        </Button>
                        <div>
                          <CardTitle className="text-lg text-blue-900">
                            Module {moduleIndex + 1}
                          </CardTitle>
                          {!isExpanded && (
                            <div className="flex items-center space-x-4 text-xs text-blue-700 mt-1">
                              <span className="flex items-center">
                                <Video className="h-3 w-3 mr-1" />
                                {videoCount} videos
                              </span>
                              <span className="flex items-center">
                                <FileText className="h-3 w-3 mr-1" />
                                {documentCount} docs
                              </span>
                              <span className="flex items-center">
                                <HelpCircle className="h-3 w-3 mr-1" />
                                {questionCount} questions
                              </span>
                            </div>
                          )}
                        </div>
                      </div>
                      {form.modules.length > 1 && (
                        <Button
                          type="button"
                          onClick={() => handleDeleteModule(moduleIndex)}
                          variant="outline"
                          size="sm"
                          className="text-red-600 hover:text-red-700 hover:bg-red-50"
                          disabled={saving}
                        >
                          {saving && moduleToDelete === moduleIndex ? <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-red-600"></div> : <Trash2 className="h-4 w-4" />}
                        </Button>
                      )}
                    </div>
                  </CardHeader>
                  {isExpanded && (
                  <CardContent className="space-y-6 pt-6">
                    <div className="space-y-2">
                      <Label>Module Title *</Label>
                      <Input
                        value={module.title}
                        onChange={(e) => updateModule(moduleIndex, 'title', e.target.value)}
                        placeholder="e.g., Supply Chain Fundamentals"
                        required
                      />
                    </div>

                    <div className="space-y-2">
                      <Label>Module Description (Optional)</Label>
                      <Textarea
                        value={module.description}
                        onChange={(e) => updateModule(moduleIndex, 'description', e.target.value)}
                        placeholder="Brief description of what this module covers..."
                        rows={3}
                      />
                    </div>

                    {/* Videos */}
                    <div className="space-y-3 p-4 bg-gradient-to-r from-green-50 to-emerald-50 rounded-lg border border-green-200">
                      <div className="flex items-center justify-between">
                        <Label className="flex items-center text-green-800 font-semibold">
                          <Video className="h-4 w-4 mr-2 text-green-600" />
                          Videos
                        </Label>
                        <Button
                          type="button"
                          onClick={() => addVideo(moduleIndex)}
                          variant="outline"
                          size="sm"
                          className="border-green-300 text-green-700 hover:bg-green-100"
                        >
                          <Plus className="h-4 w-4 mr-2" />
                          Add Video
                        </Button>
                      </div>

                      {module.videos.map((video, videoIndex) => (
                        <div key={videoIndex} className="grid grid-cols-1 md:grid-cols-12 gap-2 p-3 bg-white border border-green-200 rounded-lg shadow-sm">
                          <div className="md:col-span-5">
                            <Input
                              value={video.title}
                              onChange={(e) => updateVideo(moduleIndex, videoIndex, 'title', e.target.value)}
                              placeholder="Video title"
                            />
                          </div>
                          <div className="md:col-span-2">
                            <Input
                              type="number"
                              value={video.duration}
                              onChange={(e) => updateVideo(moduleIndex, videoIndex, 'duration', parseInt(e.target.value) || 0)}
                              placeholder="Duration (min)"
                            />
                          </div>
                          <div className="md:col-span-4">
                            <Input
                              value={video.url}
                              onChange={(e) => updateVideo(moduleIndex, videoIndex, 'url', e.target.value)}
                              placeholder="Video URL"
                            />
                          </div>
                          <div className="md:col-span-1">
                            {module.videos.length > 1 && (
                              <Button
                                type="button"
                                onClick={() => removeVideo(moduleIndex, videoIndex)}
                                variant="outline"
                                size="sm"
                                className="text-red-600 hover:text-red-700 hover:bg-red-50"
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>

                    {/* Documents */}
                    <div className="space-y-3 p-4 bg-gradient-to-r from-orange-50 to-amber-50 rounded-lg border border-orange-200">
                      <div className="flex items-center justify-between">
                        <Label className="flex items-center text-orange-800 font-semibold">
                          <FileText className="h-4 w-4 mr-2 text-orange-600" />
                          Documents
                        </Label>
                        <Button
                          type="button"
                          onClick={() => addDocument(moduleIndex)}
                          variant="outline"
                          size="sm"
                          className="border-orange-300 text-orange-700 hover:bg-orange-100"
                        >
                          <Plus className="h-4 w-4 mr-2" />
                          Add Document
                        </Button>
                      </div>

                      {module.documents.map((document, docIndex) => {
                        const uploadKey = `modules-${moduleIndex}-${docIndex}`;
                        const isUploading = uploading[uploadKey];
                        
                        return (
                          <div key={docIndex} className="p-4 bg-white border border-orange-200 rounded-lg shadow-sm space-y-3">
                            {/* Title and Type Selection */}
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                              <Input
                                value={document.title}
                                onChange={(e) => updateDocument(moduleIndex, docIndex, 'title', e.target.value)}
                                placeholder="Document title"
                              />
                              <Select
                                value={document.type}
                                onValueChange={(value: 'link' | 'upload') => {
                                  if (!form) return;
                                  const updatedModules = [...form.modules];
                                  updatedModules[moduleIndex].documents[docIndex] = {
                                    title: document.title,
                                    type: value,
                                    ...(value === 'link' ? { url: document.url || '' } : {})
                                  };
                                  setForm(prev => prev ? ({ ...prev, modules: updatedModules }) : null);
                                }}
                              >
                                <SelectTrigger>
                                  <SelectValue placeholder="Select type" />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="link">
                                    <div className="flex items-center">
                                      <Link className="h-4 w-4 mr-2" />
                                      Link
                                    </div>
                                  </SelectItem>
                                  <SelectItem value="upload">
                                    <div className="flex items-center">
                                      <Upload className="h-4 w-4 mr-2" />
                                      Upload
                                    </div>
                                  </SelectItem>
                                </SelectContent>
                              </Select>
                            </div>

                            {/* Content based on type */}
                            {document.type === 'link' ? (
                              <Input
                                value={document.url || ''}
                                onChange={(e) => updateDocument(moduleIndex, docIndex, 'url', e.target.value)}
                                placeholder="Document URL"
                              />
                            ) : (
                              <div className="space-y-2">
                                {document.fileUrl ? (
                                  <div className="flex items-center justify-between p-3 bg-green-50 border border-green-200 rounded-lg">
                                    <div className="flex items-center space-x-2">
                                      <FileText className="h-5 w-5 text-green-600" />
                                      <div>
                                        <p className="font-medium text-green-800">{document.fileName}</p>
                                        <p className="text-sm text-green-600">
                                          {document.fileSize ? `${(document.fileSize / 1024 / 1024).toFixed(2)} MB` : 'Unknown size'}
                                        </p>
                                      </div>
                                    </div>
                                    <div className="flex items-center space-x-2">
                                      <Button
                                        type="button"
                                        variant="outline"
                                        size="sm"
                                        onClick={() => {
                                          setPreviewDocument(document);
                                          setShowPreviewDialog(true);
                                        }}
                                        className="text-green-700 border-green-300 hover:bg-green-100"
                                      >
                                        <Eye className="h-4 w-4" />
                                      </Button>
                                    </div>
                                  </div>
                                ) : (
                                  <div className="border-2 border-dashed border-orange-300 rounded-lg p-6 text-center">
                                    <input
                                      type="file"
                                      id={`file-upload-${moduleIndex}-${docIndex}`}
                                      className="hidden"
                                      accept=".pdf,.doc,.docx,.txt,.csv,.xlsx,.xls"
                                      onChange={(e) => {
                                        const file = e.target.files?.[0];
                                        if (file) {
                                          handleFileUpload(moduleIndex, docIndex, file);
                                        }
                                      }}
                                      disabled={isUploading}
                                    />
                                    <label
                                      htmlFor={`file-upload-${moduleIndex}-${docIndex}`}
                                      className="cursor-pointer"
                                    >
                                      {isUploading ? (
                                        <div className="flex flex-col items-center">
                                          <Loader2 className="h-8 w-8 text-orange-500 animate-spin mb-2" />
                                          <p className="text-orange-600">Uploading...</p>
                                        </div>
                                      ) : (
                                        <div className="flex flex-col items-center">
                                          <Upload className="h-8 w-8 text-orange-500 mb-2" />
                                          <p className="text-orange-600 font-medium">Click to upload document</p>
                                          <p className="text-sm text-gray-500">PDF, DOC, TXT, CSV, Excel (Max 10MB)</p>
                                        </div>
                                      )}
                                    </label>
                                  </div>
                                )}
                              </div>
                            )}

                            {/* Actions */}
                            <div className="flex justify-end">
                              {module.documents.length > 1 && (
                                <Button
                                  type="button"
                                  onClick={() => removeDocument(moduleIndex, docIndex)}
                                  variant="outline"
                                  size="sm"
                                  className="text-red-600 hover:text-red-700 hover:bg-red-50"
                                >
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>

                    {/* Quiz Questions */}
                    <div className="space-y-3 p-4 bg-gradient-to-r from-purple-50 to-violet-50 rounded-lg border border-purple-200">
                      <div className="flex items-center justify-between">
                        <Label className="flex items-center text-purple-800 font-semibold">
                          <HelpCircle className="h-4 w-4 mr-2 text-purple-600" />
                          Quiz Questions
                        </Label>
                        <div className="flex gap-2">
                          <QuizUpload
                            moduleTitle={module.title || `Module ${moduleIndex + 1}`}
                            moduleIndex={moduleIndex}
                            courseSlug={form?.slug || ''}
                            courseTitle={form?.title || ''}
                            onQuizUploaded={(questions, title, description) => {
                              if (!form) return;
                              const updatedModules = [...form.modules];
                              updatedModules[moduleIndex].quiz.questions = questions;
                              setForm(prev => prev ? ({ ...prev, modules: updatedModules }) : null);
                              
                              // Invalidate queries to refresh quiz data
                              queryClient.invalidateQueries({ queryKey: [`/api/courses/${courseSlug}`] });
                              queryClient.invalidateQueries({ queryKey: [`/api/courses/${courseSlug}/quizzes`] });
                              
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
                                className="border-purple-300 text-purple-700 hover:bg-purple-100"
                              >
                                <Upload className="h-4 w-4 mr-2" />
                                Upload Quiz
                              </Button>
                            }
                          />
                          <Button
                            type="button"
                            onClick={() => addQuizQuestion(moduleIndex)}
                            variant="outline"
                            size="sm"
                            className="border-purple-300 text-purple-700 hover:bg-purple-100"
                          >
                            <Plus className="h-4 w-4 mr-2" />
                            Add Question
                          </Button>
                        </div>
                      </div>

                      {module.quiz.questions.map((question, questionIndex) => (
                        <div key={questionIndex} className="p-4 bg-white border border-purple-200 rounded-lg shadow-sm space-y-3">
                          <div className="flex items-center justify-between">
                            <Label className="text-sm font-medium text-purple-800">Question {questionIndex + 1}</Label>
                            {module.quiz.questions.length > 1 && (
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
                            <div className="grid grid-cols-1 gap-2">
                              {question.choices.map((choice, choiceIndex) => (
                                <div key={choiceIndex} className="flex items-center space-x-2">
                                  <div className="flex items-center space-x-2 w-full">
                                    <input
                                      type="radio"
                                      name={`correct-${moduleIndex}-${questionIndex}`}
                                      checked={question.correctIndex === choiceIndex}
                                      onChange={() => updateQuizQuestion(moduleIndex, questionIndex, 'correctIndex', choiceIndex)}
                                      className="text-purple-600"
                                    />
                                    <div className="text-xs font-medium w-6">
                                      {String.fromCharCode(65 + choiceIndex)}.
                                    </div>
                                    <Input
                                      value={choice}
                                      onChange={(e) => updateQuizChoice(moduleIndex, questionIndex, choiceIndex, e.target.value)}
                                      placeholder={`Option ${String.fromCharCode(65 + choiceIndex)}`}
                                      className="flex-1"
                                    />
                                  </div>
                                </div>
                              ))}
                            </div>
                            <div className="text-xs text-purple-600 mt-1 font-medium">
                              Select the correct answer by clicking the radio button next to it
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                  )}
                </Card>
                );
              })}
            </div>

            {/* Final Examination Section */}
            <FinalExaminationSection courseSlug={courseSlug} />

            <div className="flex space-x-3 pt-6">
              <Button type="submit" disabled={saving} className="bg-blue-600 hover:bg-blue-700 disabled:opacity-50">
                {saving ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                    Updating Course...
                  </>
                ) : (
                  'Update Course'
                )}
              </Button>
              <Button
                type="button"
                variant="outline"
                onClick={() => setLocation('/admin/courses')}
                disabled={saving}
              >
                Cancel
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>

      {/* Document Preview Dialog */}
      <Dialog open={showPreviewDialog} onOpenChange={setShowPreviewDialog}>
        <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Document Preview: {previewDocument?.title}</DialogTitle>
          </DialogHeader>
          {previewDocument && (
            <div className="w-full h-[70vh] border rounded">
              <div className="text-xs text-gray-500 p-2 border-b">
                File: {previewDocument.fileName} ({previewDocument.fileType})
              </div>
              {previewDocument.fileType === 'application/pdf' ? (
                <PDFPreview fileUrl={previewDocument.fileUrl!} fileName={previewDocument.fileName!} />
              ) : previewDocument.fileType === 'text/csv' ? (
                <CSVPreview fileUrl={previewDocument.fileUrl!} fileName={previewDocument.fileName!} />
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
                  src={`https://view.officeapps.live.com/op/embed.aspx?src=${encodeURIComponent(previewDocument.fileUrl!)}`}
                  className="w-full h-[calc(70vh-60px)] rounded"
                  title={`Preview of ${previewDocument.fileName}`}
                  onError={() => console.error('Office viewer failed to load')}
                />
              ) : previewDocument.fileType?.includes('sheet') || previewDocument.fileType?.includes('excel') ? (
                // Try Microsoft Office Online for Excel documents  
                <iframe
                  src={`https://view.officeapps.live.com/op/embed.aspx?src=${encodeURIComponent(previewDocument.fileUrl!)}`}
                  className="w-full h-[calc(70vh-60px)] rounded"
                  title={`Preview of ${previewDocument.fileName}`}
                  onError={() => console.error('Office viewer failed to load')}
                />
              ) : previewDocument.fileType?.includes('presentation') || previewDocument.fileType?.includes('powerpoint') ? (
                // Try Microsoft Office Online for PowerPoint documents
                <iframe
                  src={`https://view.officeapps.live.com/op/embed.aspx?src=${encodeURIComponent(previewDocument.fileUrl!)}`}
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
            </div>
          )}
          
          <div className="flex justify-end space-x-2 mt-4">
            <Button 
              variant="outline" 
              onClick={() => setShowPreviewDialog(false)}
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
      
      {/* Module Delete Confirmation Dialog */}
      <Dialog open={moduleToDelete !== null} onOpenChange={() => setModuleToDelete(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Module</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete this module? This action cannot be undone.
              All module content including videos, documents, and quizzes will be permanently removed.
            </DialogDescription>
          </DialogHeader>
          <div className="flex justify-end space-x-2 mt-4">
            <Button 
              variant="outline" 
              onClick={() => setModuleToDelete(null)}
              disabled={saving}
            >
              Cancel
            </Button>
            <Button 
              onClick={confirmDeleteModule}
              variant="destructive"
              disabled={saving}
            >
              {saving ? (
                <div className="flex items-center">
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                  Deleting...
                </div>
              ) : (
                "Delete Module"
              )}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

export default function EditCourse() {
  const [match, params] = useRoute('/admin/courses/edit/:slug');
  
  if (!match || !params?.slug) {
    return (
      <DashboardLayout>
        <div className="p-6">
          <h1 className="text-2xl font-bold text-red-600">Course not found</h1>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <Helmet>
        <title>Edit Course | AGI.online</title>
        <meta name="description" content="Edit course modules, videos, documents, and quizzes." />
      </Helmet>
      <EditCourseForm courseSlug={params.slug} />
    </DashboardLayout>
  );
} 