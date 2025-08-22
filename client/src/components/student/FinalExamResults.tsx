import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { CheckCircle, XCircle, Trophy, AlertCircle } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';

interface QuestionResult {
  questionText: string;
  yourAnswer: string;
  correctAnswer: string;
  isCorrect: boolean;
}

interface FinalExamResultsProps {
  score: number;
  maxScore: number;
  percentage: number;
  passed: boolean;
  attemptNumber: number;
  correctAnswers: number;
  totalQuestions: number;
  questionResults: QuestionResult[];
  onClose: () => void;
  requiresManualGrading?: boolean;
}

const FinalExamResults: React.FC<FinalExamResultsProps> = ({
  score,
  percentage,
  passed,
  attemptNumber,
  correctAnswers,
  totalQuestions,
  questionResults,
  onClose,
  requiresManualGrading
}) => {
  return (
    <div className="w-full max-w-4xl mx-auto space-y-6">
      {/* Overall Result Card */}
      <Card className={passed === true ? 'border-green-500' : passed === false ? 'border-red-500' : 'border-yellow-500'}>
        <CardHeader className="text-center">
          <div className="flex justify-center mb-4">
            {passed === true ? (
              <Trophy className="h-16 w-16 text-yellow-500" />
            ) : requiresManualGrading ? (
              <AlertCircle className="h-16 w-16 text-blue-500" />
            ) : (
              <AlertCircle className="h-16 w-16 text-red-500" />
            )}
          </div>
          <CardTitle className="text-3xl">
            {passed === true ? 'Congratulations!' : 
             requiresManualGrading ? 'Exam Submitted!' : 
             'Exam Completed'}
          </CardTitle>
          <p className="text-lg text-gray-600 mt-2">
            {passed === true 
              ? 'You have passed the final examination!' 
              : requiresManualGrading
              ? 'Your exam has been submitted and is awaiting review.'
              : 'Your exam has been completed.'}
          </p>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-4 text-center">
            <div>
              <p className="text-sm text-gray-500">Your Score</p>
              <p className="text-2xl font-bold">
                {requiresManualGrading ? 'Pending Review' : `${percentage}%`}
              </p>
            </div>
            <div>
              <p className="text-sm text-gray-500">Attempt</p>
              <p className="text-2xl font-bold">{attemptNumber}</p>
            </div>
          </div>

          {requiresManualGrading && (
            <Alert className="mt-4">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                Your exam contains essay questions that require manual grading. 
                You will see your final score once the review is complete.
              </AlertDescription>
            </Alert>
          )}
        </CardContent>
      </Card>

      {/* Detailed Results */}
      <Card>
        <CardHeader>
          <CardTitle>Detailed Results</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {questionResults.map((result, index) => (
              <div
                key={index}
                className={`p-4 rounded-lg border ${
                  result.isCorrect 
                    ? 'bg-green-50 border-green-200' 
                    : 'bg-red-50 border-red-200'
                }`}
              >
                <div className="flex items-start justify-between mb-2">
                  <h4 className="font-medium">Question {index + 1}</h4>
                  {result.isCorrect ? (
                    <CheckCircle className="h-5 w-5 text-green-600" />
                  ) : (
                    <XCircle className="h-5 w-5 text-red-600" />
                  )}
                </div>
                <p className="text-gray-700 mb-2">{result.questionText}</p>
                <div className="space-y-1 text-sm">
                  <p>
                    <span className="font-medium">Your answer:</span>{' '}
                    <span className={result.isCorrect ? 'text-green-700' : 'text-red-700'}>
                      {result.yourAnswer}
                    </span>
                  </p>
                  {!result.isCorrect && result.correctAnswer && (
                    <p>
                      <span className="font-medium">Correct answer:</span>{' '}
                      <span className="text-green-700">{result.correctAnswer}</span>
                    </p>
                  )}
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Actions */}
      <div className="flex justify-center gap-4">
        <Button variant="outline" onClick={onClose}>
          Close
        </Button>
      </div>
    </div>
  );
};

export default FinalExamResults; 