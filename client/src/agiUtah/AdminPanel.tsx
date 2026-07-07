import { useState, type ChangeEvent } from 'react';
import { useBootstrap, useLoadCatalog, useExpandIntake } from './hooks';

const buttonClass =
  'rounded-md bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-700 disabled:opacity-50';
const cardClass = 'rounded-xl border border-slate-200 bg-white p-5 shadow-sm space-y-3';

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : 'Unexpected error';
}

export function AgiUtahAdminPanel() {
  const [intakeKey, setIntakeKey] = useState('sep-2026');
  const bootstrap = useBootstrap();
  const loadCatalog = useLoadCatalog();
  const expandIntake = useExpandIntake();

  return (
    <section className="space-y-6">
      <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-5 shadow-sm space-y-3">
        <h3 className="text-base font-semibold text-emerald-900">Go live — one click</h3>
        <p className="text-sm text-emerald-800">
          Loads the catalog, creates the September-2026 intake, and builds the course offerings. Run this once after enabling the program. Safe to re-run.
        </p>
        <button
          className="rounded-md bg-emerald-700 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-800 disabled:opacity-50"
          disabled={bootstrap.isPending}
          onClick={() => bootstrap.mutate()}
        >
          {bootstrap.isPending ? 'Setting up…' : 'Bootstrap AGI Utah'}
        </button>
        {bootstrap.isError && <p className="text-sm text-red-600">{errorMessage(bootstrap.error)}</p>}
        {bootstrap.data && (
          <p className="text-sm text-emerald-800">
            Ready — {bootstrap.data.offerings} course offerings created for intake “{bootstrap.data.intakeKey}”.
          </p>
        )}
      </div>

      <div className={cardClass}>
        <h3 className="text-base font-semibold text-slate-900">Catalog</h3>
        <p className="text-sm text-slate-500">
          Load or refresh the program stack (courses, credentials, spine) from the authored catalog. Idempotent.
        </p>
        <button className={buttonClass} disabled={loadCatalog.isPending} onClick={() => loadCatalog.mutate()}>
          {loadCatalog.isPending ? 'Loading…' : 'Load / refresh catalog'}
        </button>
        {loadCatalog.isError && <p className="text-sm text-red-600">{errorMessage(loadCatalog.error)}</p>}
        {loadCatalog.data && (
          <pre className="overflow-x-auto rounded-md bg-slate-50 p-3 text-xs text-slate-700">
            {JSON.stringify(loadCatalog.data, null, 2)}
          </pre>
        )}
      </div>

      <div className={cardClass}>
        <h3 className="text-base font-semibold text-slate-900">Intake</h3>
        <p className="text-sm text-slate-500">Expand an intake into monthly course offerings with Week-1 enrollment windows.</p>
        <div className="flex items-center gap-2">
          <input
            className="w-48 rounded-md border border-slate-300 px-3 py-2 text-sm"
            value={intakeKey}
            onChange={(e: ChangeEvent<HTMLInputElement>) => setIntakeKey(e.target.value)}
            aria-label="Intake key"
          />
          <button
            className={buttonClass}
            disabled={expandIntake.isPending}
            onClick={() => expandIntake.mutate(intakeKey)}
          >
            {expandIntake.isPending ? 'Expanding…' : 'Expand intake'}
          </button>
        </div>
        {expandIntake.isError && <p className="text-sm text-red-600">{errorMessage(expandIntake.error)}</p>}
        {expandIntake.data && (
          <p className="text-sm text-green-700">Created {expandIntake.data.offerings} course offerings.</p>
        )}
      </div>
    </section>
  );
}
