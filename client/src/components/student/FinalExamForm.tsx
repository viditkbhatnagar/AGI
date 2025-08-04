import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { AlertCircle, CheckCircle, XCircle } from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';

interface FinalExamFormProps {
  title: string;
  description?: string;
  questions: {
    text: string;
    choices: string[];
  }[];
  passingScore: number;
  remainingAttempts: number;
  onSubmit: (answers: number[]) => void;
  onCancel: () => void;
}

const FinalExamForm: React.FC<FinalExamFormProps> = ({
  title,
  description,
  questions,
  passingScore,
  remainingAttempts,
  onSubmit,
  onCancel
}) => {
  const [answers, setAnswers] = useState<number[]>(
    questions.map(() => -1)
  );
  const [currentQuestion, setCurrentQuestion] = useState(0);
  const [showConfirmation, setShowConfirmation] = useState(false);

  const handleOptionChange = (qIdx: number, optIdx: number) => {
    const updated = [...answers];
    updated[qIdx] = optIdx;
    setAnswers(updated);
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
    const unanswered = answers.filter(ans => ans < 0).length;
    if (unanswered > 0) {
      alert(`Please answer all questions before submitting. You have ${unanswered} unanswered question(s).`);
      return;
    }
    setShowConfirmation(true);
  };

  const confirmSubmit = () => {
    onSubmit(answers);
  };

  const answeredCount = answers.filter(ans => ans >= 0).length;
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
              You have {remainingAttempts} attempt(s) remaining after this submission.
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
            <span>Passing Score: {passingScore}%</span>
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
              <h3 className="text-lg font-semibold">
                Question {currentQuestion + 1} of {questions.length}
              </h3>
              {answers[currentQuestion] >= 0 && (
                <CheckCircle className="h-5 w-5 text-green-500" />
              )}
            </div>
            
            <p className="text-gray-800 mb-6">{questions[currentQuestion].text}</p>
            
            {/* Options */}
            <div className="space-y-3">
              {questions[currentQuestion].choices.map((choice, idx) => (
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
              {questions.map((_, idx) => (
                <button
                  key={idx}
                  onClick={() => setCurrentQuestion(idx)}
                  className={`w-8 h-8 rounded-full text-sm font-medium transition-all ${
                    idx === currentQuestion
                      ? 'bg-blue-600 text-white'
                      : answers[idx] >= 0
                      ? 'bg-green-500 text-white'
                      : 'bg-gray-300 text-gray-600'
                  }`}
                >
                  {idx + 1}
                </button>
              ))}
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
            <Alert className="max-w-sm">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                {remainingAttempts} attempt(s) remaining
              </AlertDescription>
            </Alert>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default FinalExamForm; 