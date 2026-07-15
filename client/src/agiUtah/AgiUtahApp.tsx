import { useState } from 'react';
import { Redirect } from 'wouter';
import { AdminLayout } from '@/components/admin/layout/admin-layout';
import { useAuth } from '@/lib/auth-provider';
import { AgiUtahAdminPanel } from './AdminPanel';
import { AgiUtahStudentEnroll } from './StudentEnroll';
import { AgiUtahFacultyGrading } from './FacultyGrading';
import { AgiUtahAttendance } from './Attendance';
import { AgiUtahContactLedgerView } from './ContactLedgerView';

/**
 * Entry point for the AGI Utah screens, routed at /agi-utah (backend also 404s unless
 * AGI_UTAH_ENABLED is set). Access is role-aware:
 *  - admin / superadmin: the full workspace inside AdminLayout (enrolment + administration);
 *  - teacher: a focused faculty console (grading, attendance, RSI ledger) — the API already
 *    grants teaching access, and this gives faculty a reachable UI;
 *  - anyone else: redirected to their own area.
 */

type Tab = 'student' | 'faculty' | 'attendance' | 'ledger' | 'admin';

interface TabDef {
  id: Tab;
  label: string;
}

const ADMIN_TABS: TabDef[] = [
  { id: 'student', label: 'Student' },
  { id: 'faculty', label: 'Faculty' },
  { id: 'attendance', label: 'Attendance' },
  { id: 'ledger', label: 'RSI Ledger' },
  { id: 'admin', label: 'Admin' },
];

// Faculty (teacher role) see only the teaching-relevant tabs.
const FACULTY_TABS: TabDef[] = [
  { id: 'faculty', label: 'Faculty' },
  { id: 'attendance', label: 'Attendance' },
  { id: 'ledger', label: 'RSI Ledger' },
];

const tabClass = (active: boolean) =>
  `rounded-md px-3 py-1.5 text-sm font-medium ${
    active ? 'bg-slate-900 text-white' : 'text-slate-600 hover:bg-slate-100'
  }`;

interface WorkspaceProps {
  tabs: TabDef[];
  defaultTab: Tab;
  subtitle: string;
}

function AgiUtahWorkspace({ tabs, defaultTab, subtitle }: WorkspaceProps) {
  const [tab, setTab] = useState<Tab>(defaultTab);

  return (
    <div className="mx-auto max-w-3xl space-y-6 p-6">
      <header className="space-y-1">
        <h1 className="text-xl font-semibold text-slate-900">AGI Utah</h1>
        <p className="text-sm text-slate-500">{subtitle}</p>
      </header>

      <nav className="flex flex-wrap gap-2">
        {tabs.map(({ id, label }) => (
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

export function AgiUtahApp() {
  const { isAuthenticated, isLoading, userRole } = useAuth();

  if (isLoading) {
    return <div className="p-6 text-sm text-slate-500">Loading…</div>;
  }
  if (!isAuthenticated) {
    return <Redirect to="/login" />;
  }

  if (userRole === 'admin' || userRole === 'superadmin') {
    return (
      <AdminLayout>
        <AgiUtahWorkspace
          tabs={ADMIN_TABS}
          defaultTab="admin"
          subtitle="Stackable Certificate / Diploma / MBA — enrollment and administration."
        />
      </AdminLayout>
    );
  }

  if (userRole === 'teacher') {
    return (
      <div className="min-h-screen bg-slate-50">
        <AgiUtahWorkspace
          tabs={FACULTY_TABS}
          defaultTab="faculty"
          subtitle="Faculty console — grading, attendance, and the RSI contact-hour ledger."
        />
      </div>
    );
  }

  // Students (and any other role) belong in their own area.
  return <Redirect to="/student" />;
}

export default AgiUtahApp;
