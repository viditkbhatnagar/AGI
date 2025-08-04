import React, { useState } from 'react';
import { Button } from '@/components/ui/button';

interface QuizFormProps {
  questions: {
    prompt: string;
    options: string[];
    correctIndex: number;
  }[];
  onSubmit: (answers: number[]) => void;
}

const QuizForm: React.FC<QuizFormProps> = ({ questions, onSubmit }) => {
  // Initialize all answers to -1 (unanswered)
  const [answers, setAnswers] = useState<number[]>(
    questions.map(() => -1)
  );
  const [current, setCurrent] = useState(0);
  const [showResults, setShowResults] = useState(false);
  const [results, setResults] = useState<
    { prompt: string; selected: number; correct: number }[]
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
    // Compute per-question feedback
    const feedback = questions.map((q, idx) => ({
      prompt: q.prompt,
      selected: answers[idx],
      correct: q.correctIndex,
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
    return (
      <div className="mt-6 p-4 bg-white border rounded-lg shadow">
        <h3 className="text-lg sm:text-xl font-semibold mb-4">Quiz Results</h3>
        <table className="w-full table-auto">
          <thead>
            <tr>
              <th className="px-4 py-2 text-left">Question</th>
              <th className="px-4 py-2">Your Answer</th>
              <th className="px-4 py-2">Correct Answer</th>
              <th className="px-4 py-2">Result</th>
            </tr>
          </thead>
          <tbody>
            {pagedResults.map((r, i) => (
              <tr key={resultPage * RESULTS_PER_PAGE + i} className="border-t">
                <td className="px-4 py-2 text-left">{r.prompt}</td>
                <td className="px-4 py-2 text-center">{questions[resultPage * RESULTS_PER_PAGE + i].options[r.selected]}</td>
                <td className="px-4 py-2 text-center">{questions[resultPage * RESULTS_PER_PAGE + i].options[r.correct]}</td>
                <td className="px-4 py-2 text-center">
                  {r.selected === r.correct ? '✅' : '❌'}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        <div className="flex justify-between items-center mt-4">
          <button
            onClick={() => setResultPage((p) => Math.max(p - 1, 0))}
            disabled={resultPage === 0}
            className="px-4 py-2 bg-gray-200 rounded disabled:opacity-50"
          >
            Previous
          </button>
          <span className="text-sm text-gray-600">
            Page {resultPage + 1} of {totalPages}
          </span>
          <button
            onClick={() => setResultPage((p) => Math.min(p + 1, totalPages - 1))}
            disabled={resultPage === totalPages - 1}
            className="px-4 py-2 bg-gray-200 rounded disabled:opacity-50"
          >
            Next
          </button>
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
                {q.prompt}
              </h2>
              <div className="space-y-4">
                {q.options.map((opt, optIdx) => (
                  <label
                    key={optIdx}
                    className={`flex items-center p-4 border-2 rounded-lg cursor-pointer transition-all hover:bg-gray-50 ${
                      answers[current] === optIdx 
                        ? 'border-blue-600 bg-blue-50' 
                        : 'border-gray-200'
                    }`}
                  >
                    <div className="flex items-center">
                      <div className={`w-5 h-5 rounded-full border-2 mr-4 flex items-center justify-center ${
                        answers[current] === optIdx 
                          ? 'border-blue-600 bg-blue-600' 
                          : 'border-gray-300'
                      }`}>
                        {answers[current] === optIdx && (
                          <div className="w-2 h-2 bg-white rounded-full"></div>
                        )}
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
