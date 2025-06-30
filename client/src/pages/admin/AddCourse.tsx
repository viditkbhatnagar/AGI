import React, { useState, ChangeEvent, FormEvent, useEffect } from 'react';
import { useLocation } from 'wouter';
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

function AddCourseForm() {
  const [, setLocation] = useLocation();
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [expandedModules, setExpandedModules] = useState<boolean[]>([]);
  
  const [form, setForm] = useState<CourseForm>({
    slug: '',
    title: '',
    type: 'standalone',
    description: '',
    modules: [{
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
      enabled: false,
      frequency: 'weekly',
      dayOfWeek: 'Monday',
      durationMin: 60
    }
  });

  // Initialize expanded state for the first module
  useEffect(() => {
    if (expandedModules.length === 0) {
      setExpandedModules([true]); // First module expanded by default
    }
  }, [expandedModules.length]);

  const toggleModule = (moduleIndex: number) => {
    setExpandedModules(prev => 
      prev.map((expanded, i) => i === moduleIndex ? !expanded : expanded)
    );
  };

  const generateSlug = (title: string) => {
    return title
      .toLowerCase()
      .replace(/\s+/g, '-')
      .trim();
  };

  const handleTitleChange = (title: string) => {
    setForm(prev => ({
      ...prev,
      title,
      slug: generateSlug(title)
    }));
  };

  const addModule = () => {
    setForm(prev => ({
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
    }));
    // Expand the new module by default
    setExpandedModules(prev => [...prev, true]);
  };

  const removeModule = (moduleIndex: number) => {
    if (form.modules.length > 1) {
      setForm(prev => ({
        ...prev,
        modules: prev.modules.filter((_, i) => i !== moduleIndex)
      }));
      // Remove the corresponding expanded state
      setExpandedModules(prev => prev.filter((_, i) => i !== moduleIndex));
    }
  };

  const updateModule = (moduleIndex: number, field: string, value: any) => {
    setForm(prev => ({
      ...prev,
      modules: prev.modules.map((module, i) => 
        i === moduleIndex ? { ...module, [field]: value } : module
      )
    }));
  };

  const addVideo = (moduleIndex: number) => {
    const updatedModules = [...form.modules];
    updatedModules[moduleIndex].videos.push({ title: '', duration: 0, url: '' });
    setForm(prev => ({ ...prev, modules: updatedModules }));
  };

  const removeVideo = (moduleIndex: number, videoIndex: number) => {
    const updatedModules = [...form.modules];
    if (updatedModules[moduleIndex].videos.length > 1) {
      updatedModules[moduleIndex].videos.splice(videoIndex, 1);
      setForm(prev => ({ ...prev, modules: updatedModules }));
    }
  };

  const updateVideo = (moduleIndex: number, videoIndex: number, field: keyof VideoForm, value: any) => {
    const updatedModules = [...form.modules];
    updatedModules[moduleIndex].videos[videoIndex] = {
      ...updatedModules[moduleIndex].videos[videoIndex],
      [field]: value
    };
    setForm(prev => ({ ...prev, modules: updatedModules }));
  };

  const addDocument = (moduleIndex: number) => {
    const updatedModules = [...form.modules];
    updatedModules[moduleIndex].documents.push({ title: '', url: '' });
    setForm(prev => ({ ...prev, modules: updatedModules }));
  };

  const removeDocument = (moduleIndex: number, docIndex: number) => {
    const updatedModules = [...form.modules];
    if (updatedModules[moduleIndex].documents.length > 1) {
      updatedModules[moduleIndex].documents.splice(docIndex, 1);
      setForm(prev => ({ ...prev, modules: updatedModules }));
    }
  };

  const updateDocument = (moduleIndex: number, docIndex: number, field: keyof DocumentForm, value: string) => {
    const updatedModules = [...form.modules];
    updatedModules[moduleIndex].documents[docIndex] = {
      ...updatedModules[moduleIndex].documents[docIndex],
      [field]: value
    };
    setForm(prev => ({ ...prev, modules: updatedModules }));
  };

  // Quiz management functions
  const addQuizQuestion = (moduleIndex: number) => {
    const updatedModules = [...form.modules];
    updatedModules[moduleIndex].quiz.questions.push({
      text: '',
      choices: ['', '', '', ''],
      correctIndex: 0
    });
    setForm(prev => ({ ...prev, modules: updatedModules }));
  };

  const removeQuizQuestion = (moduleIndex: number, questionIndex: number) => {
    const updatedModules = [...form.modules];
    if (updatedModules[moduleIndex].quiz.questions.length > 1) {
      updatedModules[moduleIndex].quiz.questions.splice(questionIndex, 1);
      setForm(prev => ({ ...prev, modules: updatedModules }));
    }
  };

  const updateQuizQuestion = (moduleIndex: number, questionIndex: number, field: 'text' | 'correctIndex', value: string | number) => {
    const updatedModules = [...form.modules];
    updatedModules[moduleIndex].quiz.questions[questionIndex] = {
      ...updatedModules[moduleIndex].quiz.questions[questionIndex],
      [field]: value
    };
    setForm(prev => ({ ...prev, modules: updatedModules }));
  };

  const updateQuizChoice = (moduleIndex: number, questionIndex: number, choiceIndex: number, value: string) => {
    const updatedModules = [...form.modules];
    updatedModules[moduleIndex].quiz.questions[questionIndex].choices[choiceIndex] = value;
    setForm(prev => ({ ...prev, modules: updatedModules }));
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError(null);

    try {
      const token = localStorage.getItem('token');
      const response = await fetch('/api/courses', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token && { Authorization: `Bearer ${token}` })
        },
        body: JSON.stringify(form)
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to create course');
      }

      setLocation('/admin/courses');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="p-4 md:p-6">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-800">Add New Course</h1>
        <p className="text-gray-600">Create a new course with modules, videos, and documents</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Course Information</CardTitle>
        </CardHeader>
        <CardContent>
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
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="slug">Course Slug *</Label>
                <Input
                  id="slug"
                  value={form.slug}
                  onChange={(e) => setForm(prev => ({ ...prev, slug: e.target.value }))}
                  placeholder="e.g., certified-supply-chain-professional"
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="type">Course Type *</Label>
                <Select value={form.type} onValueChange={(value: 'standalone' | 'with-mba') => setForm(prev => ({ ...prev, type: value }))}>
                  <SelectTrigger>
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
                  onChange={(e) => setForm(prev => ({ ...prev, description: e.target.value }))}
                  placeholder="Brief description of the course"
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
                      setForm(prev => ({
                        ...prev,
                        liveClassConfig: { ...prev.liveClassConfig, enabled: !!checked }
                      }))
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
                          setForm(prev => ({
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
                          setForm(prev => ({
                            ...prev,
                            liveClassConfig: { ...prev.liveClassConfig, dayOfWeek: value }
                          }))
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
                          setForm(prev => ({
                            ...prev,
                            liveClassConfig: { ...prev.liveClassConfig, durationMin: parseInt(e.target.value) || 60 }
                          }))
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
                <Button type="button" onClick={addModule} variant="outline" size="sm">
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
              <Button type="submit" disabled={saving}>
                {saving ? 'Creating Course...' : 'Create Course'}
              </Button>
              <Button
                type="button"
                variant="outline"
                onClick={() => setLocation('/admin/courses')}
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

export default function AddCourse() {
  return (
    <DashboardLayout>
      <Helmet>
        <title>Add Course | AGI.online</title>
        <meta name="description" content="Create a new course with modules, videos, and documents." />
      </Helmet>
      <AddCourseForm />
    </DashboardLayout>
  );
} 