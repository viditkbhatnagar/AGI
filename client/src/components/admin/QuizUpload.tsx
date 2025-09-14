import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Upload, FileText, Loader2, Plus, Edit, Trash2, AlertCircle, CheckCircle, X } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useQueryClient } from '@tanstack/react-query';
import { uploadToCloudinary, validateFile, FILE_TYPES } from '@/lib/cloudinary';

interface QuizQuestion {
  id: string;
  question: string;
  options: {
    A: string;
    B: string;
    C: string;
    D: string;
  };
  correctAnswer: 'A' | 'B' | 'C' | 'D';
  explanation?: string;
}

interface QuizUploadProps {
  moduleTitle: string;
  moduleIndex: number;
  courseSlug: string;
  courseTitle: string;
  onQuizUploaded: (questions: any[], title: string, description?: string) => void;
  trigger?: React.ReactNode;
}

interface QuizUploadResponse {
  quizId: string;
  status: string;
  message: string;
}

export const QuizUpload: React.FC<QuizUploadProps> = ({ 
  moduleTitle, 
  moduleIndex, 
  courseSlug, 
  courseTitle, 
  onQuizUploaded,
  trigger 
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [step, setStep] = useState<'upload' | 'review'>('upload');
  const [uploading, setUploading] = useState(false);
  const [extracting, setExtracting] = useState(false);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [file, setFile] = useState<File | null>(null);
  const [questions, setQuestions] = useState<QuizQuestion[]>([]);
  const [quizId, setQuizId] = useState<string>('');
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const resetState = () => {
    setStep('upload');
    setUploading(false);
    setExtracting(false);
    setTitle('');
    setDescription('');
    setFile(null);
    setQuestions([]);
    setQuizId('');
  };

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = event.target.files?.[0];
    if (!selectedFile) return;

    const validation = validateFile(selectedFile, {
      maxSizeMB: 10,
      allowedTypes: [
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        'application/msword',
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'application/vnd.ms-excel',
        'text/csv',
        'text/plain'
      ]
    });

    if (!validation.isValid) {
      toast({
        title: 'Invalid File',
        description: validation.error || 'Please select a valid document file',
        variant: 'destructive'
      });
      return;
    }

    setFile(selectedFile);
    setTitle(title || selectedFile.name.replace(/\.[^/.]+$/, '')); // Remove extension
  };

  const handleUpload = async () => {
    if (!file) {
      toast({
        title: 'Error',
        description: 'Please select a file to upload',
        variant: 'destructive'
      });
      return;
    }

    try {
      setUploading(true);
      
      // Upload to Cloudinary
      const uploadResult = await uploadToCloudinary(file, 'question-documents');
      
      // Create quiz repository entry and start AI extraction
      const token = localStorage.getItem('token');
      const response = await fetch('/api/quiz-repository/create', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          title: title || file.name,
          description,
          documentUrl: uploadResult.url,
          documentType: file.type,
          fileName: file.name,
          fileSize: file.size,
          publicId: uploadResult.publicId,
          originCourse: courseSlug,
          originModule: moduleIndex
        })
      });

      if (!response.ok) {
        throw new Error('Failed to create quiz');
      }

      const result: QuizUploadResponse = await response.json();
      setQuizId(result.quizId);
      
      // Start polling for extraction completion
      setUploading(false);
      setExtracting(true);
      pollForExtraction(result.quizId);

    } catch (error) {
      console.error('Upload error:', error);
      toast({
        title: 'Upload Failed',
        description: error instanceof Error ? error.message : 'Failed to upload document',
        variant: 'destructive'
      });
      setUploading(false);
    }
  };

  const pollForExtraction = async (quizRepositoryId: string) => {
    const maxAttempts = 30; // 5 minutes (10 second intervals)
    let attempts = 0;

    const checkStatus = async () => {
      try {
        const token = localStorage.getItem('token');
        const response = await fetch(`/api/quiz-repository/${quizRepositoryId}`, {
          headers: { Authorization: `Bearer ${token}` }
        });

        if (!response.ok) {
          throw new Error('Failed to check extraction status');
        }

        const quiz = await response.json();

        if (quiz.extractionStatus === 'completed' && quiz.questions?.length > 0) {
          // Transform questions to local format
          const transformedQuestions: QuizQuestion[] = quiz.questions.map((q: any, index: number) => ({
            id: `${quizRepositoryId}_${index}`,
            question: q.question,
            options: q.options || { A: '', B: '', C: '', D: '' },
            correctAnswer: q.correctAnswer || 'A',
            explanation: q.explanation
          }));

          setQuestions(transformedQuestions);
          setExtracting(false);
          setStep('review');
          
          toast({
            title: 'Extraction Complete',
            description: `Successfully extracted ${transformedQuestions.length} questions`,
          });
        } else if (quiz.extractionStatus === 'failed') {
          throw new Error(quiz.extractionError || 'AI extraction failed');
        } else if (attempts < maxAttempts) {
          // Still processing, continue polling
          attempts++;
          setTimeout(checkStatus, 10000); // Check every 10 seconds
        } else {
          throw new Error('Extraction timeout - please try again');
        }
      } catch (error) {
        console.error('Polling error:', error);
        setExtracting(false);
        toast({
          title: 'Extraction Failed',
          description: error instanceof Error ? error.message : 'Failed to extract questions',
          variant: 'destructive'
        });
      }
    };

    checkStatus();
  };

  const handleQuestionUpdate = (index: number, field: string, value: any) => {
    const updatedQuestions = [...questions];
    if (field.startsWith('option.')) {
      const optionKey = field.split('.')[1] as 'A' | 'B' | 'C' | 'D';
      updatedQuestions[index].options[optionKey] = value;
    } else {
      (updatedQuestions[index] as any)[field] = value;
    }
    setQuestions(updatedQuestions);
  };

  const addNewQuestion = () => {
    const newQuestion: QuizQuestion = {
      id: `new_${Date.now()}`,
      question: '',
      options: { A: '', B: '', C: '', D: '' },
      correctAnswer: 'A',
      explanation: ''
    };
    setQuestions([...questions, newQuestion]);
  };

  const removeQuestion = (index: number) => {
    setQuestions(questions.filter((_, i) => i !== index));
  };

  const handleSaveQuiz = async () => {
    if (questions.length === 0) {
      toast({
        title: 'Error',
        description: 'Please add at least one question',
        variant: 'destructive'
      });
      return;
    }

    // Transform questions to the format expected by the course module
    const legacyQuestions = questions.map(q => ({
      text: q.question,
      choices: [q.options.A, q.options.B, q.options.C, q.options.D],
      correctIndex: ['A', 'B', 'C', 'D'].indexOf(q.correctAnswer),
      explanation: q.explanation || undefined
    }));

    onQuizUploaded(legacyQuestions, title, description);
    
    // Invalidate relevant queries to refresh UI
    queryClient.invalidateQueries({ queryKey: [`/api/courses/${courseSlug}`] });
    queryClient.invalidateQueries({ queryKey: [`/api/courses/${courseSlug}/quizzes`] });
    queryClient.invalidateQueries({ queryKey: ['quizRepository'] });
    
    toast({
      title: 'Quiz Added',
      description: `Added ${questions.length} questions to ${moduleTitle}`,
    });

    setIsOpen(false);
    resetState();
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        {trigger || (
          <Button variant="outline" size="sm">
            <Upload className="h-4 w-4 mr-2" />
            Upload Quiz
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="max-w-4xl max-h-[80vh]">
        <DialogHeader>
          <DialogTitle>Upload Quiz for {moduleTitle}</DialogTitle>
          <DialogDescription>
            Upload a document to extract quiz questions using AI, then review and edit before adding to the module.
          </DialogDescription>
        </DialogHeader>

        {step === 'upload' && (
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="quiz-title">Quiz Title</Label>
              <Input
                id="quiz-title"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Enter quiz title"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="quiz-description">Description (Optional)</Label>
              <Textarea
                id="quiz-description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Enter quiz description"
                rows={3}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="quiz-file">Document File</Label>
              <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center">
                <FileText className="h-12 w-12 mx-auto text-gray-400 mb-4" />
                <Input
                  id="quiz-file"
                  type="file"
                  onChange={handleFileSelect}
                  accept=".doc,.docx,.xls,.xlsx,.csv,.txt"
                  className="hidden"
                />
                <Button 
                  variant="outline" 
                  className="mb-2"
                  onClick={() => document.getElementById('quiz-file')?.click()}
                  type="button"
                >
                  <Upload className="h-4 w-4 mr-2" />
                  Choose File
                </Button>
                <p className="text-sm text-gray-600">
                  Supported formats: Word (.doc, .docx), Excel (.xls, .xlsx), CSV, Text
                </p>
                {file && (
                  <p className="text-sm text-green-600 mt-2">
                    Selected: {file.name}
                  </p>
                )}
              </div>
            </div>

            {(uploading || extracting) && (
              <div className="flex items-center justify-center py-8">
                <div className="text-center">
                  <Loader2 className="h-8 w-8 animate-spin mx-auto mb-2" />
                  <p className="text-sm text-gray-600">
                    {uploading ? 'Uploading document...' : 'Extracting questions with AI...'}
                  </p>
                  {extracting && (
                    <p className="text-xs text-gray-500 mt-1">
                      This may take up to 2-3 minutes
                    </p>
                  )}
                </div>
              </div>
            )}

            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setIsOpen(false)}>
                Cancel
              </Button>
              <Button 
                onClick={handleUpload} 
                disabled={!file || uploading || extracting}
              >
                {uploading ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Uploading...
                  </>
                ) : (
                  <>
                    <Upload className="h-4 w-4 mr-2" />
                    Upload & Extract
                  </>
                )}
              </Button>
            </div>
          </div>
        )}

        {step === 'review' && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-lg font-semibold">Review Extracted Questions</h3>
                <p className="text-sm text-gray-600">
                  {questions.length} questions extracted. Review and edit before adding to module.
                </p>
              </div>
              <Badge variant="outline" className="bg-green-50 text-green-700">
                <CheckCircle className="h-3 w-3 mr-1" />
                Extraction Complete
              </Badge>
            </div>

            <ScrollArea className="h-96">
              <div className="space-y-4 pr-4">
                {questions.map((question, index) => (
                  <Card key={question.id} className="p-4">
                    <div className="space-y-3">
                      <div className="flex items-start justify-between">
                        <Label className="text-sm font-medium">Question {index + 1}</Label>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => removeQuestion(index)}
                          className="text-red-600 hover:text-red-700"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                      
                      <Textarea
                        value={question.question}
                        onChange={(e) => handleQuestionUpdate(index, 'question', e.target.value)}
                        placeholder="Enter question text"
                        rows={2}
                      />
                      
                      <div className="grid grid-cols-2 gap-3">
                        {Object.entries(question.options).map(([key, value]) => (
                          <div key={key} className="space-y-1">
                            <Label className="text-xs font-medium flex items-center gap-2">
                              Option {key}
                              {question.correctAnswer === key && (
                                <Badge className="bg-green-100 text-green-800 text-xs">Correct</Badge>
                              )}
                            </Label>
                            <Input
                              value={value}
                              onChange={(e) => handleQuestionUpdate(index, `option.${key}`, e.target.value)}
                              placeholder={`Option ${key}`}
                            />
                          </div>
                        ))}
                      </div>
                      
                      <div className="grid grid-cols-2 gap-3">
                        <div className="space-y-1">
                          <Label className="text-xs font-medium">Correct Answer</Label>
                          <Select
                            value={question.correctAnswer}
                            onValueChange={(value: 'A' | 'B' | 'C' | 'D') => handleQuestionUpdate(index, 'correctAnswer', value)}
                          >
                            <SelectTrigger>
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="A">A</SelectItem>
                              <SelectItem value="B">B</SelectItem>
                              <SelectItem value="C">C</SelectItem>
                              <SelectItem value="D">D</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                        
                        <div className="space-y-1">
                          <Label className="text-xs font-medium">Explanation (Optional)</Label>
                          <Input
                            value={question.explanation || ''}
                            onChange={(e) => handleQuestionUpdate(index, 'explanation', e.target.value)}
                            placeholder="Why is this the correct answer?"
                          />
                        </div>
                      </div>
                    </div>
                  </Card>
                ))}
                
                <Button
                  onClick={addNewQuestion}
                  variant="outline"
                  className="w-full border-dashed"
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Add New Question
                </Button>
              </div>
            </ScrollArea>

            <div className="flex justify-end gap-2">
              <Button
                variant="outline"
                onClick={() => {
                  setStep('upload');
                  resetState();
                }}
              >
                Start Over
              </Button>
              <Button onClick={handleSaveQuiz}>
                Add {questions.length} Questions to Module
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};