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

  const handleOptionChange = (qIdx: number, optIdx: number) => {
    const updated = [...answers];
    updated[qIdx] = optIdx;
    setAnswers(updated);
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
    <div className="mt-6 p-6 bg-white border rounded-lg shadow">
      <h3 className="text-xl font-semibold mb-4">Module Quiz</h3>
      <form onSubmit={e => { e.preventDefault(); handleSubmit(); }}>
        {questions.map((q, qIdx) => (
          <div key={qIdx} className="mb-4">
            <p className="font-medium">
              {qIdx + 1}. {q.prompt}
            </p>
            <div className="mt-2 space-y-2">
              {q.options.map((opt, optIdx) => (
                <label
                  key={optIdx}
                  className="flex items-center space-x-2"
                >
                  <input
                    type="radio"
                    name={`question-${qIdx}`}
                    value={optIdx}
                    checked={answers[qIdx] === optIdx}
                    onChange={() => handleOptionChange(qIdx, optIdx)}
                    className="form-radio"
                  />
                  <span>{opt}</span>
                </label>
              ))}
            </div>
          </div>
        ))}
        <div className="flex justify-end">
          <Button type="submit">Submit Quiz</Button>
        </div>
      </form>
    </div>
  );
};

export default QuizForm;
