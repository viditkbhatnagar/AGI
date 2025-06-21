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
    <div className="mt-6 p-4 sm:p-6 bg-white border rounded-lg shadow">
      <h3 className="text-lg sm:text-xl font-semibold mb-4">Module Quiz</h3>
      <form onSubmit={e => { e.preventDefault(); handleSubmit(); }}>
        {(() => {
          const q = questions[current];
          return (
            <div key={current} className="mb-4">
              <p className="font-medium text-sm sm:text-base">
                {current + 1}. {q.prompt}
              </p>
              <div className="mt-2 space-y-2">
                {q.options.map((opt, optIdx) => (
                  <label
                    key={optIdx}
                    className="flex items-center space-x-2 text-sm sm:text-base cursor-pointer"
                  >
                    <input
                      type="radio"
                      name={`question-${current}`}
                      value={optIdx}
                      checked={answers[current] === optIdx}
                      onChange={() => handleOptionChange(current, optIdx)}
                      className="form-radio"
                    />
                    <span>{opt}</span>
                  </label>
                ))}
              </div>
            </div>
          );
        })()}
        <div className="flex justify-between items-center mb-4">
          <Button
            variant="ghost"
            type="button"
            disabled={current === 0}
            onClick={() => setCurrent((c) => Math.max(c - 1, 0))}
            className="px-2"
          >
            ←
          </Button>
          <span className="text-sm text-gray-600">
            {current + 1} / {questions.length}
          </span>
          <Button
            variant="ghost"
            type="button"
            disabled={current === questions.length - 1}
            onClick={() =>
              setCurrent((c) => Math.min(c + 1, questions.length - 1))
            }
            className="px-2"
          >
            →
          </Button>
        </div>
        {current === questions.length - 1 && (
          <div className="flex justify-end">
            <Button type="submit" className="w-full sm:w-auto">
              Submit Quiz
            </Button>
          </div>
        )}
      </form>
    </div>
  );
};

export default QuizForm;
