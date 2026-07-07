import { useState } from 'react';
import { AdminLayout } from '@/components/admin/layout/admin-layout';
import { AgiUtahAdminPanel } from './AdminPanel';
import { AgiUtahStudentEnroll } from './StudentEnroll';
import { AgiUtahFacultyGrading } from './FacultyGrading';
import { AgiUtahAttendance } from './Attendance';
import { AgiUtahContactLedgerView } from './ContactLedgerView';

/**
 * Entry point for the AGI Utah screens, rendered inside the app's AdminLayout — so it shares
 * the sidebar/topbar look AND inherits the layout's auth: it shows a loader while auth loads,
 * redirects to /login when not signed in, and is limited to admin/superadmin. Routed at
 * /agi-utah in App.tsx. The backend also 404s unless AGI_UTAH_ENABLED is set.
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
  const [tab, setTab] = useState<Tab>('admin');

  return (
    <AdminLayout>
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
    </AdminLayout>
  );
}

export default AgiUtahApp;
