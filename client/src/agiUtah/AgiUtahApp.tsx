import { useState } from 'react';
import { AgiUtahAdminPanel } from './AdminPanel';
import { AgiUtahStudentEnroll } from './StudentEnroll';
import { AgiUtahFacultyGrading } from './FacultyGrading';
import { AgiUtahAttendance } from './Attendance';
import { AgiUtahContactLedgerView } from './ContactLedgerView';

/**
 * Self-contained entry point for the AGI Utah screens. It is NOT wired into the app's router.
 * To expose it, add a route in the client router (e.g. wouter) behind a feature check:
 *
 *   <Route path="/agi-utah" component={AgiUtahApp} />
 *
 * The backend routes it calls 404 unless AGI_UTAH_ENABLED is set, so this stays inert until
 * the program is deliberately enabled.
 */

type Tab = 'student' | 'faculty' | 'attendance' | 'ledger' | 'admin';

const TABS: Array<{ id: Tab; label: string }> = [
  { id: 'student', label: 'Student' },
  { id: 'faculty', label: 'Faculty' },
  { id: 'attendance', label: 'Attendance' },
  { id: 'ledger', label: 'RSI Ledger' },
  { id: 'admin', label: 'Admin' },
];

const tabClass = (active: boolean) =>
  `rounded-md px-3 py-1.5 text-sm font-medium ${
    active ? 'bg-slate-900 text-white' : 'text-slate-600 hover:bg-slate-100'
  }`;

export function AgiUtahApp() {
  const [tab, setTab] = useState<Tab>('student');

  return (
    <div className="mx-auto max-w-3xl space-y-6 p-6">
      <header className="space-y-1">
        <h1 className="text-xl font-semibold text-slate-900">AGI Utah</h1>
        <p className="text-sm text-slate-500">Stackable Certificate / Diploma / MBA — enrollment and administration.</p>
      </header>

      <nav className="flex flex-wrap gap-2">
        {TABS.map(({ id, label }) => (
          <button key={id} className={tabClass(tab === id)} onClick={() => setTab(id)}>
            {label}
          </button>
        ))}
      </nav>

      {tab === 'student' && <AgiUtahStudentEnroll />}
      {tab === 'faculty' && <AgiUtahFacultyGrading />}
      {tab === 'attendance' && <AgiUtahAttendance />}
      {tab === 'ledger' && <AgiUtahContactLedgerView />}
      {tab === 'admin' && <AgiUtahAdminPanel />}
    </div>
  );
}

export default AgiUtahApp;
