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
import { Trash2, Plus, Video, FileText, HelpCircle, ChevronDown, ChevronUp } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { useToast } from '@/hooks/use-toast';

interface VideoForm {
  title: string;
  duration: number;
  url: string;
}

interface DocumentForm {
  title: string;
  url: string;
}

interface QuizQuestionForm {
  text: string;
  choices: string[];
  correctIndex: number;
}

interface ModuleForm {
  title: string;
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

function EditCourseForm({ courseSlug }: { courseSlug: string }) {
  const [, setLocation] = useLocation();
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [form, setForm] = useState<CourseForm | null>(null);
  const [expandedModules, setExpandedModules] = useState<boolean[]>([]);
  const { toast } = useToast();

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
      // Transform course data to match form structure
      const transformedModules = courseData.modules?.map((module: any, index: number) => {
        // Find corresponding quiz for this module
        const moduleQuiz = quizzes.find((q: any) => q.moduleIndex === index);
        
        return {
          title: module.title || '',
          videos: module.videos?.map((v: any) => ({
            title: v.title || '',
            duration: v.duration || 0,
            url: v.url || ''
          })) || [{ title: '', duration: 0, url: '' }],
          documents: module.documents?.map((d: any) => ({
            title: d.title || '',
            url: d.url || ''
          })) || [{ title: '', url: '' }],
          quiz: {
            questions: moduleQuiz?.questions?.map((q: any) => ({
              text: q.text || '',
              choices: q.choices || ['', '', '', ''],
              correctIndex: q.correctIndex || 0
            })) || [{
              text: '',
              choices: ['', '', '', ''],
              correctIndex: 0
            }]
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
          documents: [{ title: '', url: '' }],
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
        videos: [{ title: '', duration: 0, url: '' }],
        documents: [{ title: '', url: '' }],
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

  const removeModule = (moduleIndex: number) => {
    if (form && form.modules.length > 1) {
      setForm(prev => prev ? ({
        ...prev,
        modules: prev.modules.filter((_, i) => i !== moduleIndex)
      }) : null);
      // Remove the corresponding expanded state
      setExpandedModules(prev => prev.filter((_, i) => i !== moduleIndex));
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
    updatedModules[moduleIndex].documents.push({ title: '', url: '' });
    setForm(prev => prev ? ({ ...prev, modules: updatedModules }) : null);
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
                const documentCount = module.documents.filter(d => d.title.trim() || d.url.trim()).length;
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
                          onClick={() => removeModule(moduleIndex)}
                          variant="outline"
                          size="sm"
                          className="text-red-600 hover:text-red-700 hover:bg-red-50"
                        >
                          <Trash2 className="h-4 w-4" />
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

                      {module.documents.map((document, docIndex) => (
                        <div key={docIndex} className="grid grid-cols-1 md:grid-cols-12 gap-2 p-3 bg-white border border-orange-200 rounded-lg shadow-sm">
                          <div className="md:col-span-5">
                            <Input
                              value={document.title}
                              onChange={(e) => updateDocument(moduleIndex, docIndex, 'title', e.target.value)}
                              placeholder="Document title"
                            />
                          </div>
                          <div className="md:col-span-6">
                            <Input
                              value={document.url}
                              onChange={(e) => updateDocument(moduleIndex, docIndex, 'url', e.target.value)}
                              placeholder="Document URL"
                            />
                          </div>
                          <div className="md:col-span-1">
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
                      ))}
                    </div>

                    {/* Quiz Questions */}
                    <div className="space-y-3 p-4 bg-gradient-to-r from-purple-50 to-violet-50 rounded-lg border border-purple-200">
                      <div className="flex items-center justify-between">
                        <Label className="flex items-center text-purple-800 font-semibold">
                          <HelpCircle className="h-4 w-4 mr-2 text-purple-600" />
                          Quiz Questions
                        </Label>
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