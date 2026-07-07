import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { StudentPicker } from './StudentPicker';
import { useContactLedger } from './hooks';

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : 'Unexpected error';
}

export function AgiUtahContactLedgerView() {
  const [studentRef, setStudentRef] = useState('');
  const ledger = useContactLedger(studentRef, studentRef.length > 0);

  return (
    <Card>
      <CardHeader>
        <CardTitle>Contact-hour / RSI ledger</CardTitle>
        <CardDescription>
          Faculty contact (live attendance + faculty interaction) vs. self-directed engagement (AI tutor, content views) — the accreditation record.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <StudentPicker value={studentRef} onChange={setStudentRef} />

        {ledger.isLoading && <p className="text-sm text-muted-foreground">Loading…</p>}
        {ledger.isError && <p className="text-sm text-destructive">{errorMessage(ledger.error)}</p>}
        {ledger.data && (
          <>
            <div className="flex gap-4">
              <div className="rounded-lg bg-emerald-50 px-4 py-3 dark:bg-emerald-950">
                <div className="text-2xl font-semibold text-emerald-600">{ledger.data.contactEvents}</div>
                <div className="text-xs text-emerald-700 dark:text-emerald-400">contact events</div>
              </div>
              <div className="rounded-lg bg-muted px-4 py-3">
                <div className="text-2xl font-semibold text-muted-foreground">{ledger.data.engagementEvents}</div>
                <div className="text-xs text-muted-foreground">engagement events</div>
              </div>
            </div>
            {Object.keys(ledger.data.byType).length > 0 && (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Event type</TableHead>
                    <TableHead>Count</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {Object.entries(ledger.data.byType).map(([type, count]) => (
                    <TableRow key={type}>
                      <TableCell>{type}</TableCell>
                      <TableCell>{count}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </>
        )}
      </CardContent>
    </Card>
  );
}
