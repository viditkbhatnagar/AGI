import { useState, type ChangeEvent } from 'react';
import { useEnroll, useEarnedCredentials } from './hooks';
import type { EnrollInput } from './api';

const buttonClass =
  'rounded-md bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-700 disabled:opacity-50';
const cardClass = 'rounded-xl border border-slate-200 bg-white p-5 shadow-sm space-y-3';
const inputClass = 'w-full rounded-md border border-slate-300 px-3 py-2 text-sm';

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : 'Unexpected error';
}

export function AgiUtahStudentEnroll() {
  const [form, setForm] = useState<EnrollInput>({
    studentRef: '',
    programKey: 'mba-fintech',
    intakeKey: 'sep-2026',
    courseCode: 'CR05',
  });
  const enroll = useEnroll();
  const earned = useEarnedCredentials(form.studentRef, form.studentRef.length > 0);

  const setField = (field: keyof EnrollInput) => (e: ChangeEvent<HTMLInputElement>) =>
    setForm((prev) => ({ ...prev, [field]: e.target.value }));

  return (
    <section className="space-y-6">
      <div className={cardClass}>
        <h3 className="text-base font-semibold text-slate-900">Enroll in a course</h3>
        <div className="grid grid-cols-2 gap-3">
          <label className="space-y-1 text-sm">
            <span className="text-slate-600">Student ref</span>
            <input className={inputClass} value={form.studentRef} onChange={setField('studentRef')} />
          </label>
          <label className="space-y-1 text-sm">
            <span className="text-slate-600">Program</span>
            <input className={inputClass} value={form.programKey} onChange={setField('programKey')} />
          </label>
          <label className="space-y-1 text-sm">
            <span className="text-slate-600">Intake</span>
            <input className={inputClass} value={form.intakeKey} onChange={setField('intakeKey')} />
          </label>
          <label className="space-y-1 text-sm">
            <span className="text-slate-600">Course</span>
            <input className={inputClass} value={form.courseCode} onChange={setField('courseCode')} />
          </label>
        </div>
        <button className={buttonClass} disabled={enroll.isPending} onClick={() => enroll.mutate(form)}>
          {enroll.isPending ? 'Checking…' : 'Enroll'}
        </button>
        {enroll.isError && <p className="text-sm text-red-600">{errorMessage(enroll.error)}</p>}
        {enroll.data &&
          (enroll.data.allowed ? (
            <p className="text-sm text-green-700">Enrolled (attempt {enroll.data.attemptNo}).</p>
          ) : (
            <ul className="list-disc space-y-1 pl-5 text-sm text-red-600">
              {enroll.data.reasons.map((reason) => (
                <li key={reason}>{reason}</li>
              ))}
            </ul>
          ))}
      </div>

      <div className={cardClass}>
        <h3 className="text-base font-semibold text-slate-900">Credentials available to claim</h3>
        {!form.studentRef && <p className="text-sm text-slate-500">Enter a student ref above to see earned credentials.</p>}
        {earned.isLoading && <p className="text-sm text-slate-500">Loading…</p>}
        {earned.data && earned.data.length === 0 && <p className="text-sm text-slate-500">None yet.</p>}
        {earned.data && earned.data.length > 0 && (
          <ul className="list-disc space-y-1 pl-5 text-sm text-slate-700">
            {earned.data.map((programKey) => (
              <li key={programKey}>{programKey}</li>
            ))}
          </ul>
        )}
      </div>
    </section>
  );
}
