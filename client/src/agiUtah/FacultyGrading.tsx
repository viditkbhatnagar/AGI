import { useState, type ChangeEvent } from 'react';
import { useGrade } from './hooks';
import type { GradeInput } from './api';
import { buttonClass, cardClass, inputClass, labelClass, labelTextClass, errorMessage } from './styles';

const GRADE_LETTERS = ['A', 'A-', 'B+', 'B', 'B-', 'F', 'W', 'TR'];

export function AgiUtahFacultyGrading() {
  const [form, setForm] = useState<GradeInput>({
    studentRef: '',
    courseCode: 'CR05',
    attemptNo: 1,
    gradeLetter: 'B',
    gradedByRef: '',
  });
  const grade = useGrade();

  const setText = (field: 'studentRef' | 'courseCode' | 'gradedByRef') => (e: ChangeEvent<HTMLInputElement>) =>
    setForm((prev) => ({ ...prev, [field]: e.target.value }));

  return (
    <section className="space-y-6">
      <div className={cardClass}>
        <h3 className="text-base font-semibold text-slate-900">Post a grade</h3>
        <p className="text-sm text-slate-500">
          Posting a grade updates the transcript, recomputes academic progress, and issues any credential the student has now earned.
        </p>
        <div className="grid grid-cols-2 gap-3">
          <label className={labelClass}>
            <span className={labelTextClass}>Student ref</span>
            <input className={inputClass} value={form.studentRef} onChange={setText('studentRef')} />
          </label>
          <label className={labelClass}>
            <span className={labelTextClass}>Course</span>
            <input className={inputClass} value={form.courseCode} onChange={setText('courseCode')} />
          </label>
          <label className={labelClass}>
            <span className={labelTextClass}>Attempt no.</span>
            <input
              className={inputClass}
              type="number"
              min={1}
              value={form.attemptNo}
              onChange={(e: ChangeEvent<HTMLInputElement>) =>
                setForm((prev) => ({ ...prev, attemptNo: Number(e.target.value) || 1 }))
              }
            />
          </label>
          <label className={labelClass}>
            <span className={labelTextClass}>Grade</span>
            <select
              className={inputClass}
              value={form.gradeLetter}
              onChange={(e: ChangeEvent<HTMLSelectElement>) =>
                setForm((prev) => ({ ...prev, gradeLetter: e.target.value }))
              }
            >
              {GRADE_LETTERS.map((letter) => (
                <option key={letter} value={letter}>
                  {letter}
                </option>
              ))}
            </select>
          </label>
          <label className={labelClass}>
            <span className={labelTextClass}>Faculty ref (optional)</span>
            <input className={inputClass} value={form.gradedByRef ?? ''} onChange={setText('gradedByRef')} />
          </label>
        </div>
        <button className={buttonClass} disabled={grade.isPending} onClick={() => grade.mutate(form)}>
          {grade.isPending ? 'Posting…' : 'Post grade'}
        </button>
        {grade.isError && <p className="text-sm text-red-600">{errorMessage(grade.error)}</p>}
        {grade.data && (
          <p className={`text-sm ${grade.data.passed ? 'text-green-700' : 'text-amber-700'}`}>
            {grade.data.passed ? 'Passed' : 'Not passed'} — grade point {grade.data.gradePoint ?? 'n/a'}.
          </p>
        )}
      </div>
    </section>
  );
}
