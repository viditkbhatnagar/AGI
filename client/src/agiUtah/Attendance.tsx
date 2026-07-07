import { useState, type ChangeEvent } from 'react';
import { useRecordAttendance } from './hooks';
import type { AttendanceInput } from './api';
import { buttonClass, cardClass, inputClass, labelClass, labelTextClass, errorMessage } from './styles';

const SOURCES: AttendanceInput['source'][] = ['live', 'recording', 'manual'];

export function AgiUtahAttendance() {
  const [form, setForm] = useState<AttendanceInput>({
    studentRef: '',
    intakeKey: 'sep-2026',
    courseCode: 'CR05',
    weekIndex: 1,
    source: 'live',
  });
  const record = useRecordAttendance();

  const setText = (field: 'studentRef' | 'intakeKey' | 'courseCode') => (e: ChangeEvent<HTMLInputElement>) =>
    setForm((prev) => ({ ...prev, [field]: e.target.value }));

  return (
    <section className="space-y-6">
      <div className={cardClass}>
        <h3 className="text-base font-semibold text-slate-900">Record live-session attendance</h3>
        <p className="text-sm text-slate-500">
          Records that a student attended (live or via recording). This logs a contact-hour event exactly once.
        </p>
        <div className="grid grid-cols-2 gap-3">
          <label className={labelClass}>
            <span className={labelTextClass}>Student ref</span>
            <input className={inputClass} value={form.studentRef} onChange={setText('studentRef')} />
          </label>
          <label className={labelClass}>
            <span className={labelTextClass}>Intake</span>
            <input className={inputClass} value={form.intakeKey} onChange={setText('intakeKey')} />
          </label>
          <label className={labelClass}>
            <span className={labelTextClass}>Course</span>
            <input className={inputClass} value={form.courseCode} onChange={setText('courseCode')} />
          </label>
          <label className={labelClass}>
            <span className={labelTextClass}>Week</span>
            <input
              className={inputClass}
              type="number"
              min={1}
              value={form.weekIndex}
              onChange={(e: ChangeEvent<HTMLInputElement>) =>
                setForm((prev) => ({ ...prev, weekIndex: Number(e.target.value) || 1 }))
              }
            />
          </label>
          <label className={labelClass}>
            <span className={labelTextClass}>Source</span>
            <select
              className={inputClass}
              value={form.source}
              onChange={(e: ChangeEvent<HTMLSelectElement>) =>
                setForm((prev) => ({ ...prev, source: e.target.value as AttendanceInput['source'] }))
              }
            >
              {SOURCES.map((source) => (
                <option key={source} value={source}>
                  {source}
                </option>
              ))}
            </select>
          </label>
        </div>
        <button className={buttonClass} disabled={record.isPending} onClick={() => record.mutate(form)}>
          {record.isPending ? 'Recording…' : 'Record attendance'}
        </button>
        {record.isError && <p className="text-sm text-red-600">{errorMessage(record.error)}</p>}
        {record.data && (
          <p className="text-sm text-green-700">
            {record.data.firstTime ? 'Recorded (contact-hour event logged).' : 'Already recorded — no duplicate.'}
          </p>
        )}
      </div>
    </section>
  );
}
