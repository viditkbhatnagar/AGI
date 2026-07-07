import { DashboardLayout } from '@/components/layout/dashboard-layout';
import { useAuth } from '@/lib/auth-provider';
import { useStudentOverview } from './hooks';
import { cardClass, errorMessage } from './styles';

/**
 * The student-facing AGI Utah page. A logged-in student sees their own program, course
 * enrollments + grades, and earned credentials. The student's own login email is used as the
 * identifier, so there is nothing to type. Rendered inside the app's student DashboardLayout.
 */
export function AgiUtahStudentPortal() {
  const { user } = useAuth();
  const studentRef = user?.email ?? '';
  const overview = useStudentOverview(studentRef, studentRef.length > 0);

  return (
    <DashboardLayout>
      <div className="mx-auto max-w-3xl space-y-6 p-6">
        <header className="space-y-1">
          <h1 className="text-xl font-semibold text-slate-900">AGI Utah — My Program</h1>
          <p className="text-sm text-slate-500">Your stackable Certificate / Diploma / MBA progress.</p>
        </header>

        {overview.isLoading && <p className="text-sm text-slate-500">Loading…</p>}
        {overview.isError && <p className="text-sm text-red-600">{errorMessage(overview.error)}</p>}

        {overview.data && (
          <>
            <div className={cardClass}>
              <h3 className="text-base font-semibold text-slate-900">My program</h3>
              {overview.data.programs.length === 0 ? (
                <p className="text-sm text-slate-500">You are not enrolled in a program yet.</p>
              ) : (
                <ul className="space-y-1 text-sm text-slate-700">
                  {overview.data.programs.map((p) => (
                    <li key={p.programKey}>
                      {p.awardName} <span className="text-slate-400">· {p.status}</span>
                    </li>
                  ))}
                </ul>
              )}
            </div>

            <div className={cardClass}>
              <h3 className="text-base font-semibold text-slate-900">My courses</h3>
              {overview.data.courses.length === 0 ? (
                <p className="text-sm text-slate-500">No courses yet.</p>
              ) : (
                <table className="w-full text-left text-sm">
                  <thead>
                    <tr className="text-slate-500">
                      <th className="py-1 font-medium">Course</th>
                      <th className="py-1 font-medium">Status</th>
                      <th className="py-1 font-medium">Grade</th>
                    </tr>
                  </thead>
                  <tbody>
                    {overview.data.courses.map((c) => (
                      <tr key={`${c.courseCode}-${c.attemptNo}`} className="border-t border-slate-100">
                        <td className="py-1 text-slate-700">{c.courseCode}</td>
                        <td className="py-1 text-slate-700">{c.status}</td>
                        <td className="py-1 text-slate-700">{c.gradeLetter ?? '—'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>

            <div className={cardClass}>
              <h3 className="text-base font-semibold text-slate-900">My credentials</h3>
              {overview.data.credentials.length === 0 ? (
                <p className="text-sm text-slate-500">None issued yet.</p>
              ) : (
                <ul className="space-y-1 text-sm text-slate-700">
                  {overview.data.credentials.map((r) => (
                    <li key={r.programKey}>
                      🎓 {r.awardName} <span className="text-slate-400">· {r.status}</span>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </>
        )}
      </div>
    </DashboardLayout>
  );
}

export default AgiUtahStudentPortal;
