import React, { useState } from 'react';
import { Button } from '@/components/ui/button';

interface QuizFormProps {
  questions: {
    prompt: string;
    options: string[];
  }[];
  onSubmit: (answers: number[]) => void;
}

const QuizForm: React.FC<QuizFormProps> = ({ questions, onSubmit }) => {
  // Initialize all answers to -1 (unanswered)
  const [answers, setAnswers] = useState<number[]>(
    questions.map(() => -1)
  );
  const [current, setCurrent] = useState(0);

  const handleOptionChange = (qIdx: number, optIdx: number) => {
    const updated = [...answers];
    updated[qIdx] = optIdx;
    setAnswers(updated);

    // Auto‑advance if not last question
    if (qIdx < questions.length - 1) {
      setCurrent(qIdx + 1);
    }
  };

  const handleSubmit = () => {
    // Only submit if all questions answered
    if (answers.some(ans => ans < 0)) {
      alert('Please answer all questions before submitting.');
      return;
    }
    onSubmit(answers);
  };

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
