import { useState, type ChangeEvent } from 'react';
import { useContactLedger } from './hooks';
import { buttonClass, cardClass, inputClass, labelClass, labelTextClass, errorMessage } from './styles';

export function AgiUtahContactLedgerView() {
  const [studentRef, setStudentRef] = useState('');
  const [submitted, setSubmitted] = useState('');
  const ledger = useContactLedger(submitted, submitted.length > 0);

  return (
    <section className="space-y-6">
      <div className={cardClass}>
        <h3 className="text-base font-semibold text-slate-900">Contact-hour / RSI ledger</h3>
        <p className="text-sm text-slate-500">
          Counts faculty-contact events (live attendance + faculty interaction) separately from self-directed engagement (AI tutor, content views). This is the accreditation record.
        </p>
        <div className="flex items-end gap-2">
          <label className={`${labelClass} flex-1`}>
            <span className={labelTextClass}>Student ref</span>
            <input
              className={inputClass}
              value={studentRef}
              onChange={(e: ChangeEvent<HTMLInputElement>) => setStudentRef(e.target.value)}
            />
          </label>
          <button className={buttonClass} onClick={() => setSubmitted(studentRef)}>
            Load
          </button>
        </div>

        {ledger.isLoading && <p className="text-sm text-slate-500">Loading…</p>}
        {ledger.isError && <p className="text-sm text-red-600">{errorMessage(ledger.error)}</p>}
        {ledger.data && (
          <div className="space-y-3">
            <div className="flex gap-4">
              <div className="rounded-lg bg-emerald-50 px-4 py-3">
                <div className="text-2xl font-semibold text-emerald-700">{ledger.data.contactEvents}</div>
                <div className="text-xs text-emerald-700">contact events</div>
              </div>
              <div className="rounded-lg bg-slate-50 px-4 py-3">
                <div className="text-2xl font-semibold text-slate-600">{ledger.data.engagementEvents}</div>
                <div className="text-xs text-slate-500">engagement events</div>
              </div>
            </div>
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="text-slate-500">
                  <th className="py-1 font-medium">Event type</th>
                  <th className="py-1 font-medium">Count</th>
                </tr>
              </thead>
              <tbody>
                {Object.entries(ledger.data.byType).map(([type, count]) => (
                  <tr key={type} className="border-t border-slate-100">
                    <td className="py-1 text-slate-700">{type}</td>
                    <td className="py-1 text-slate-700">{count}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </section>
  );
}
