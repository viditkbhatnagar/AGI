import React, { useState } from 'react';
import { Button } from '@/components/ui/button';

// Support both legacy and new quiz formats
type LegacyQuestion = {
  prompt: string;
  options: string[];
  correctIndex: number;
};

type NewQuestion = {
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
};

type QuizQuestion = LegacyQuestion | NewQuestion;

interface QuizFormProps {
  questions: QuizQuestion[];
  onSubmit: (answers: number[]) => void;
}

// Type guard to check if question is new format
function isNewQuestion(question: QuizQuestion): question is NewQuestion {
  return 'id' in question && 'correctAnswer' in question;
}

// Convert new format to legacy format for submission
function getCorrectIndex(question: QuizQuestion): number {
  if (isNewQuestion(question)) {
    return ['A', 'B', 'C', 'D'].indexOf(question.correctAnswer);
  }
  return question.correctIndex;
}

// Get options array from either format
function getOptions(question: QuizQuestion): string[] {
  if (isNewQuestion(question)) {
    return [question.options.A, question.options.B, question.options.C, question.options.D];
  }
  return question.options;
}

// Get question text from either format
function getQuestionText(question: QuizQuestion): string {
  if (isNewQuestion(question)) {
    return question.question;
  }
  return question.prompt;
}

const QuizForm: React.FC<QuizFormProps> = ({ questions, onSubmit }) => {
  // Initialize all answers to -1 (unanswered)
  const [answers, setAnswers] = useState<number[]>(
    questions.map(() => -1)
  );
  const [current, setCurrent] = useState(0);
  const [showResults, setShowResults] = useState(false);
  const [results, setResults] = useState<
    { prompt: string; selected: number; correct: number; options: string[]; explanation?: string }[]
  >([]);
  const [resultPage, setResultPage] = useState(0);

  const handleOptionChange = (qIdx: number, optIdx: number) => {
    const updated = [...answers];
    updated[qIdx] = optIdx;
    setAnswers(updated);
  };

  const handleSubmit = () => {
    if (answers.some(ans => ans < 0)) {
      alert('Please answer all questions before submitting.');
      return;
    }
    onSubmit(answers);
    // Compute per-question feedback using helper functions
    const feedback = questions.map((q, idx) => ({
      prompt: getQuestionText(q),
      selected: answers[idx],
      correct: getCorrectIndex(q),
      options: getOptions(q),
      explanation: isNewQuestion(q) ? q.explanation : undefined
    }));
    setResults(feedback);
    setShowResults(true);
  };

  const RESULTS_PER_PAGE = 4;
  const totalPages = Math.ceil(results.length / RESULTS_PER_PAGE);
  const pagedResults = results.slice(
    resultPage * RESULTS_PER_PAGE,
    resultPage * RESULTS_PER_PAGE + RESULTS_PER_PAGE
  );

  if (showResults) {
    const correctCount = results.filter(r => r.selected === r.correct).length;
    const percentage = Math.round((correctCount / results.length) * 100);
    
    return (
      <div className="mt-6 p-6 bg-white border rounded-lg shadow">
        <div className="mb-6">
          <h3 className="text-2xl font-semibold mb-2">Quiz Results</h3>
          <div className="flex items-center gap-4 mb-4">
            <div className="text-lg">
              Score: <span className={`font-bold ${percentage >= 70 ? 'text-green-600' : 'text-red-600'}`}>
                {correctCount}/{results.length} ({percentage}%)
              </span>
            </div>
            <div className={`px-3 py-1 rounded-full text-sm ${
              percentage >= 70 ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
            }`}>
              {percentage >= 70 ? 'Passed' : 'Failed'}
            </div>
          </div>
        </div>
        
        <div className="space-y-6">
          {pagedResults.map((r, i) => {
            const questionIndex = resultPage * RESULTS_PER_PAGE + i;
            const isCorrect = r.selected === r.correct;
            
            return (
              <div key={questionIndex} className={`p-4 border rounded-lg ${
                isCorrect ? 'border-green-200 bg-green-50' : 'border-red-200 bg-red-50'
              }`}>
                <div className="flex items-start justify-between mb-3">
                  <h4 className="font-medium text-gray-900 flex-1 pr-4">
                    Q{questionIndex + 1}: {r.prompt}
                  </h4>
                  <div className={`text-2xl ${
                    isCorrect ? 'text-green-600' : 'text-red-600'
                  }`}>
                    {isCorrect ? '✅' : '❌'}
                  </div>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-3">
                  <div>
                    <span className="text-sm font-medium text-gray-600">Your Answer:</span>
                    <div className={`mt-1 p-2 rounded border ${
                      isCorrect ? 'border-green-300 bg-green-100' : 'border-red-300 bg-red-100'
                    }`}>
                      {['A', 'B', 'C', 'D'][r.selected]}: {r.options[r.selected]}
                    </div>
                  </div>
                  
                  {!isCorrect && (
                    <div>
                      <span className="text-sm font-medium text-gray-600">Correct Answer:</span>
                      <div className="mt-1 p-2 rounded border border-green-300 bg-green-100">
                        {['A', 'B', 'C', 'D'][r.correct]}: {r.options[r.correct]}
                      </div>
                    </div>
                  )}
                </div>
                
                {r.explanation && (
                  <div className="mt-3 p-3 bg-blue-50 border border-blue-200 rounded">
                    <span className="text-sm font-medium text-blue-800">Explanation:</span>
                    <p className="text-sm text-blue-700 mt-1">{r.explanation}</p>
                  </div>
                )}
              </div>
            );
          })}
        </div>
        
        <div className="flex justify-between items-center mt-6">
          <Button
            variant="outline"
            onClick={() => setResultPage((p) => Math.max(p - 1, 0))}
            disabled={resultPage === 0}
          >
            Previous
          </Button>
          <span className="text-sm text-gray-600">
            Page {resultPage + 1} of {totalPages}
          </span>
          <Button
            variant="outline"
            onClick={() => setResultPage((p) => Math.min(p + 1, totalPages - 1))}
            disabled={resultPage === totalPages - 1}
          >
            Next
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white">
      <form onSubmit={e => { e.preventDefault(); handleSubmit(); }}>
        {(() => {
          const q = questions[current];
          return (
            <div key={current} className="mb-8">
              <h2 className="text-2xl font-semibold text-gray-800 mb-8 leading-relaxed">
                {getQuestionText(q)}
              </h2>
              <div className="space-y-4">
                {getOptions(q).map((opt, optIdx) => (
                  <label
                    key={optIdx}
                    className={`flex items-center p-4 border-2 rounded-lg cursor-pointer transition-all hover:bg-gray-50 ${
                      answers[current] === optIdx 
                        ? 'border-blue-600 bg-blue-50' 
                        : 'border-gray-200'
                    }`}
                  >
                    <div className="flex items-center">
                      <div className={`w-8 h-8 rounded-full border-2 mr-4 flex items-center justify-center font-bold text-sm ${
                        answers[current] === optIdx 
                          ? 'border-blue-600 bg-blue-600 text-white' 
                          : 'border-gray-300 text-gray-600'
                      }`}>
                        {['A', 'B', 'C', 'D'][optIdx]}
                      </div>
                      <span className="text-lg text-gray-700">{opt}</span>
                    </div>
                    <input
                      type="radio"
                      name={`question-${current}`}
                      value={optIdx}
                      checked={answers[current] === optIdx}
                      onChange={() => handleOptionChange(current, optIdx)}
                      className="sr-only"
                    />
                  </label>
                ))}
              </div>
            </div>
          );
        })()}
        
        <div className="flex justify-between items-center mt-12">
          <Button
            variant="outline"
            type="button"
            disabled={current === 0}
            onClick={() => setCurrent((c) => Math.max(c - 1, 0))}
            className="px-8 py-3 text-lg border-gray-300 bg-white text-gray-700 hover:bg-gray-50 flex items-center"
          >
            ← Back
          </Button>
          
          <span className="text-sm text-gray-500 font-medium">
            Question {current + 1} of {questions.length}
          </span>
          
          {current === questions.length - 1 ? (
            <Button 
              type="submit" 
              className="px-12 py-3 text-lg bg-blue-600 hover:bg-blue-700 text-white font-semibold"
              disabled={answers[current] === -1}
            >
              Submit
            </Button>
          ) : (
            <Button
              variant="outline"
              type="button"
              disabled={current === questions.length - 1 || answers[current] === -1}
              onClick={() =>
                setCurrent((c) => Math.min(c + 1, questions.length - 1))
              }
              className="px-8 py-3 text-lg border-blue-600 bg-blue-600 text-white hover:bg-blue-700"
            >
              Next →
            </Button>
          )}
        </div>
      </form>
    </div>
  );
};

export default QuizForm;
