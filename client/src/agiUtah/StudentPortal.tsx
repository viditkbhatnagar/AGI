import { DashboardLayout } from '@/components/layout/dashboard-layout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { useAuth } from '@/lib/auth-provider';
import { useStudentOverview } from './hooks';

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : 'Unexpected error';
}

/**
 * The student-facing AGI Utah page. A logged-in student sees their own program, course
 * enrollments + grades, and earned credentials. Their login email is the identifier, so there
 * is nothing to type. Rendered inside the app's student DashboardLayout.
 */
export function AgiUtahStudentPortal() {
  const { user } = useAuth();
  const studentRef = user?.email ?? '';
  const overview = useStudentOverview(studentRef, studentRef.length > 0);

  return (
    <DashboardLayout>
      <div className="mx-auto max-w-3xl space-y-6 p-6">
        <header className="space-y-1">
          <h1 className="text-2xl font-semibold tracking-tight">AGI Utah — My Program</h1>
          <p className="text-sm text-muted-foreground">Your stackable Certificate / Diploma / MBA progress.</p>
        </header>

        {overview.isLoading && <p className="text-sm text-muted-foreground">Loading…</p>}
        {overview.isError && <p className="text-sm text-destructive">{errorMessage(overview.error)}</p>}

        {overview.data && (
          <>
            <Card>
              <CardHeader>
                <CardTitle>My program</CardTitle>
              </CardHeader>
              <CardContent>
                {overview.data.programs.length === 0 ? (
                  <p className="text-sm text-muted-foreground">You are not enrolled in a program yet.</p>
                ) : (
                  <ul className="space-y-1 text-sm">
                    {overview.data.programs.map((p) => (
                      <li key={p.programKey}>
                        {p.awardName} <span className="text-muted-foreground">· {p.status}</span>
                      </li>
                    ))}
                  </ul>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>My courses</CardTitle>
              </CardHeader>
              <CardContent>
                {overview.data.courses.length === 0 ? (
                  <p className="text-sm text-muted-foreground">No courses yet.</p>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Course</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Grade</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {overview.data.courses.map((c) => (
                        <TableRow key={`${c.courseCode}-${c.attemptNo}`}>
                          <TableCell>{c.courseCode}</TableCell>
                          <TableCell>{c.status}</TableCell>
                          <TableCell>{c.gradeLetter ?? '—'}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>My credentials</CardTitle>
              </CardHeader>
              <CardContent>
                {overview.data.credentials.length === 0 ? (
                  <p className="text-sm text-muted-foreground">None issued yet.</p>
                ) : (
                  <ul className="space-y-1 text-sm">
                    {overview.data.credentials.map((r) => (
                      <li key={r.programKey}>
                        🎓 {r.awardName} <span className="text-muted-foreground">· {r.status}</span>
                      </li>
                    ))}
                  </ul>
                )}
              </CardContent>
            </Card>
          </>
        )}
      </div>
    </DashboardLayout>
  );
}

export default AgiUtahStudentPortal;
