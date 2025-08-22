import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { AlertCircle, CheckCircle, XCircle, Upload, FileText, Loader2 } from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { uploadToCloudinary, validateFile, FILE_TYPES, FileUploadResponse, createDownloadLink } from '@/lib/cloudinary';
import { useToast } from '@/hooks/use-toast';

interface FinalExamQuestion {
  type: 'mcq' | 'essay';
  text?: string;
  choices?: string[];
  questionDocument?: {
    title: string;
    url: string;
    type: 'word' | 'pdf' | 'ppt' | 'image' | 'excel' | 'csv' | 'textbox';
    fileName: string;
  };
  allowedAnswerFormats?: ('word' | 'powerpoint' | 'pdf' | 'excel' | 'csv' | 'image')[];
}

interface FinalExamFormProps {
  title: string;
  description?: string;
  questions: FinalExamQuestion[];
  onSubmit: (answers: (number | { type: 'file' | 'text'; content: string; fileName?: string })[] ) => void;
  onCancel: () => void;
}

const FinalExamForm: React.FC<FinalExamFormProps> = ({
  title,
  description,
  questions,
  onSubmit,
  onCancel
}) => {
  const [answers, setAnswers] = useState<(number | { type: 'file' | 'text'; content: string; fileName?: string })[]>(
    questions.map(q => q.type === 'mcq' ? -1 : { type: 'text', content: '' })
  );
  const [currentQuestion, setCurrentQuestion] = useState(0);
  const [showConfirmation, setShowConfirmation] = useState(false);
  const [uploadingFiles, setUploadingFiles] = useState<Record<number, boolean>>({});
  const { toast } = useToast();

  const handleOptionChange = (qIdx: number, optIdx: number) => {
    const updated = [...answers];
    updated[qIdx] = optIdx;
    setAnswers(updated);
  };

  const handleTextChange = (qIdx: number, text: string) => {
    const updated = [...answers];
    updated[qIdx] = { type: 'text', content: text };
    setAnswers(updated);
  };

  const handleFileUpload = async (qIdx: number, file: File) => {
    // Get allowed formats for this question
    const question = questions[qIdx];
    const allowedFormats = question.allowedAnswerFormats || [];
    
    // Map format names to MIME types
    const formatMimeTypes: Record<string, string[]> = {
      word: ['application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'],
      pdf: ['application/pdf'],
      powerpoint: ['application/vnd.ms-powerpoint', 'application/vnd.openxmlformats-officedocument.presentationml.presentation'],
      excel: ['application/vnd.ms-excel', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'],
      csv: ['text/csv'],
      image: ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp']
    };

    // Get allowed MIME types for this question
    const allowedMimeTypes = allowedFormats.flatMap(format => formatMimeTypes[format] || []);

    // Validate file
    const validation = validateFile(file, {
      maxSizeMB: 10, // Cloudinary free tier limit
      allowedTypes: allowedMimeTypes.length > 0 ? allowedMimeTypes : FILE_TYPES.ALL_UPLOADS
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
    setUploadingFiles(prev => ({ ...prev, [qIdx]: true }));

    try {
      // Upload to Cloudinary
      const uploadResult: FileUploadResponse = await uploadToCloudinary(file, 'answer-sheets');
      
      const updated = [...answers];
      updated[qIdx] = { 
        type: 'file', 
        content: uploadResult.url,
        fileName: uploadResult.fileName 
      };
      setAnswers(updated);

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
      setUploadingFiles(prev => ({ ...prev, [qIdx]: false }));
    }
  };

  const handleNext = () => {
    if (currentQuestion < questions.length - 1) {
      setCurrentQuestion(currentQuestion + 1);
    }
  };

  const handlePrevious = () => {
    if (currentQuestion > 0) {
      setCurrentQuestion(currentQuestion - 1);
    }
  };

  const handleSubmit = () => {
    const unanswered = answers.filter((ans, idx) => {
      const question = questions[idx];
      if (question.type === 'mcq') {
        return typeof ans === 'number' ? ans < 0 : true;
      } else {
        return typeof ans === 'object' ? !ans.content.trim() : true;
      }
    }).length;
    
    if (unanswered > 0) {
      alert(`Please answer all questions before submitting. You have ${unanswered} unanswered question(s).`);
      return;
    }
    setShowConfirmation(true);
  };

  const confirmSubmit = () => {
    onSubmit(answers);
  };

  const answeredCount = answers.filter((ans, idx) => {
    const question = questions[idx];
    if (question.type === 'mcq') {
      return typeof ans === 'number' && ans >= 0;
    } else {
      return typeof ans === 'object' && ans.content.trim();
    }
  }).length;
  const progress = Math.round((answeredCount / questions.length) * 100);

  if (showConfirmation) {
    return (
      <Card className="w-full max-w-2xl mx-auto">
        <CardHeader>
          <CardTitle>Confirm Submission</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <Alert>
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>Are you sure you want to submit?</AlertTitle>
            <AlertDescription>
              You have answered {answeredCount} out of {questions.length} questions.
              After submission, you cannot change your answers.
            </AlertDescription>
          </Alert>
          
          <div className="flex gap-4 justify-end">
            <Button
              variant="outline"
              onClick={() => setShowConfirmation(false)}
            >
              Review Answers
            </Button>
            <Button
              variant="default"
              onClick={confirmSubmit}
            >
              Submit Final Exam
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="w-full max-w-4xl mx-auto">
      <CardHeader>
        <CardTitle className="text-2xl">{title}</CardTitle>
        {description && (
          <p className="text-gray-600 mt-2">{description}</p>
        )}
        <div className="mt-4 space-y-2">
          <div className="flex justify-between text-sm text-gray-600">
            <span>Progress: {answeredCount} of {questions.length} answered</span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-2">
            <div
              className="bg-blue-600 h-2 rounded-full transition-all"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>
      </CardHeader>
      
      <CardContent>
        <div className="space-y-6">
          {/* Question */}
          <div className="bg-gray-50 p-6 rounded-lg">
            <div className="flex justify-between items-start mb-4">
              <div className="flex items-center space-x-2">
                <h3 className="text-lg font-semibold">
                  Question {currentQuestion + 1} of {questions.length}
                </h3>
                <Badge variant={questions[currentQuestion].type === 'mcq' ? 'default' : 'secondary'}>
                  {questions[currentQuestion].type === 'mcq' ? 'Multiple Choice' : 'Essay/Long Answer'}
                </Badge>
              </div>
              {((questions[currentQuestion].type === 'mcq' && typeof answers[currentQuestion] === 'number' && answers[currentQuestion] >= 0) ||
                (questions[currentQuestion].type === 'essay' && typeof answers[currentQuestion] === 'object' && answers[currentQuestion].content.trim())) && (
                <CheckCircle className="h-5 w-5 text-green-500" />
              )}
            </div>
            
            {questions[currentQuestion].type === 'mcq' && (
              <p className="text-gray-800 mb-4">{questions[currentQuestion].text}</p>
            )}
            
            {questions[currentQuestion].type === 'essay' && questions[currentQuestion].questionDocument && (
              <>
                {questions[currentQuestion].questionDocument!.title && (
                  <p className="text-gray-600 mb-4 text-sm">{questions[currentQuestion].questionDocument!.title}</p>
                )}
                
                <div className="mb-4 p-4 bg-blue-50 rounded-lg border border-blue-200">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center">
                      <FileText className="h-4 w-4 mr-2 text-blue-600" />
                      <span className="text-sm font-medium text-blue-800">Question Document</span>
                    </div>
                    <button
                      onClick={() => {
                        const doc = questions[currentQuestion].questionDocument;
                        if (doc?.url) {
                          createDownloadLink(doc.url, doc.fileName);
                        }
                      }}
                      className="text-blue-600 hover:text-blue-800 underline text-sm bg-transparent border-none cursor-pointer"
                    >
                      Download
                    </button>
                  </div>
                  <p className="text-sm text-gray-700">
                    {questions[currentQuestion].questionDocument!.fileName}
                  </p>
                </div>
              </>
            )}
            
            {/* MCQ Options */}
            {questions[currentQuestion].type === 'mcq' && questions[currentQuestion].choices && (
              <div className="space-y-3">
                {questions[currentQuestion].choices!.map((choice, idx) => (
                  <label
                    key={idx}
                    className={`flex items-center p-4 rounded-lg border cursor-pointer transition-all ${
                      answers[currentQuestion] === idx
                        ? 'border-blue-500 bg-blue-50'
                        : 'border-gray-300 hover:bg-gray-50'
                    }`}
                  >
                    <input
                      type="radio"
                      name={`question-${currentQuestion}`}
                      checked={answers[currentQuestion] === idx}
                      onChange={() => handleOptionChange(currentQuestion, idx)}
                      className="mr-3"
                    />
                    <span className="text-gray-700">{choice}</span>
                  </label>
                ))}
              </div>
            )}

            {/* Essay Answer */}
            {questions[currentQuestion].type === 'essay' && (
              <div className="space-y-4">
                <div className="text-sm text-gray-600 mb-2">
                  <span className="font-medium">Allowed answer formats:</span>
                  <div className="flex flex-wrap gap-2 mt-1">
                    {questions[currentQuestion].allowedAnswerFormats?.map(format => (
                      <Badge key={format} variant="outline" className="text-xs">
                        {format.charAt(0).toUpperCase() + format.slice(1)}
                      </Badge>
                    ))}
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium text-gray-700">Upload Answer Sheet:</label>
                  <div className={`border-2 border-dashed border-gray-300 rounded-lg p-6 text-center ${
                    uploadingFiles[currentQuestion] ? 'bg-gray-50' : ''
                  }`}>
                    {uploadingFiles[currentQuestion] ? (
                      <div className="flex flex-col items-center">
                        <Loader2 className="h-8 w-8 text-blue-500 animate-spin mx-auto mb-2" />
                        <p className="text-sm text-blue-600">Uploading your answer sheet...</p>
                        <p className="text-xs text-gray-500 mt-1">Please wait while we save your file</p>
                      </div>
                    ) : (
                      <>
                        <Upload className="h-8 w-8 text-gray-400 mx-auto mb-2" />
                        <input
                          type="file"
                          accept={questions[currentQuestion].allowedAnswerFormats?.map(f => {
                            switch(f) {
                              case 'word': return '.doc,.docx';
                              case 'pdf': return '.pdf';
                              case 'powerpoint': return '.ppt,.pptx';
                              case 'excel': return '.xls,.xlsx';
                              case 'csv': return '.csv';
                              case 'image': return '.jpg,.jpeg,.png,.gif,.webp';
                              default: return '';
                            }
                          }).filter(Boolean).join(',')}
                          onChange={(e) => {
                            const file = e.target.files?.[0];
                            if (file) handleFileUpload(currentQuestion, file);
                          }}
                          className="hidden"
                          id={`file-upload-${currentQuestion}`}
                          disabled={uploadingFiles[currentQuestion]}
                        />
                        <label
                          htmlFor={`file-upload-${currentQuestion}`}
                          className={`cursor-pointer text-blue-600 hover:text-blue-800 ${
                            uploadingFiles[currentQuestion] ? 'pointer-events-none opacity-50' : ''
                          }`}
                        >
                          Click to upload answer file
                        </label>
                        <p className="text-xs text-gray-500 mt-1">
                          Upload your answer in any of the allowed formats above (Max 10MB)
                        </p>
                      </>
                    )}
                    {typeof answers[currentQuestion] === 'object' && answers[currentQuestion].type === 'file' && (
                      <div className="mt-3 p-2 bg-green-50 rounded border border-green-200">
                        <p className="text-sm text-green-700 font-medium">
                          ✓ Uploaded: {answers[currentQuestion].fileName}
                        </p>
                        <p className="text-xs text-gray-500 mt-1">
                          Your answer sheet has been saved successfully
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Navigation */}
          <div className="flex justify-between items-center">
            <Button
              variant="outline"
              onClick={handlePrevious}
              disabled={currentQuestion === 0}
            >
              Previous
            </Button>
            
            <div className="flex gap-2">
              {questions.map((question, idx) => {
                const isAnswered = question.type === 'mcq' 
                  ? (typeof answers[idx] === 'number' && answers[idx] >= 0)
                  : (typeof answers[idx] === 'object' && answers[idx].content.trim());
                
                return (
                  <button
                    key={idx}
                    onClick={() => setCurrentQuestion(idx)}
                    className={`w-8 h-8 rounded-full text-sm font-medium transition-all ${
                      idx === currentQuestion
                        ? 'bg-blue-600 text-white'
                        : isAnswered
                        ? 'bg-green-500 text-white'
                        : 'bg-gray-300 text-gray-600'
                    }`}
                  >
                    {idx + 1}
                  </button>
                );
              })}
            </div>
            
            {currentQuestion < questions.length - 1 ? (
              <Button onClick={handleNext}>
                Next
              </Button>
            ) : (
              <Button onClick={handleSubmit} variant="default">
                Submit Exam
              </Button>
            )}
          </div>

          {/* Bottom Actions */}
          <div className="pt-4 border-t flex justify-between items-center">
            <Button variant="ghost" onClick={onCancel}>
              Cancel & Exit
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default FinalExamForm; 