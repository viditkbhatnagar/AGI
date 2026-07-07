import { useState, type ChangeEvent } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useBootstrap, useCreateIntake, useLoadCatalog, useExpandIntake } from './hooks';

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : 'Unexpected error';
}

export function AgiUtahAdminPanel() {
  const [intakeKey, setIntakeKey] = useState('sep-2026');
  const bootstrap = useBootstrap();
  const createIntake = useCreateIntake();
  const loadCatalog = useLoadCatalog();
  const expandIntake = useExpandIntake();

  const now = new Date();
  const makeTestIntake = () =>
    createIntake.mutate({ intakeKey: 'test-now', startYear: now.getFullYear(), startMonth: now.getMonth() + 1 });

  return (
    <div className="space-y-6">
      <Card className="border-emerald-200 bg-emerald-50/60 dark:bg-emerald-950/30">
        <CardHeader>
          <CardTitle className="text-emerald-900 dark:text-emerald-300">Go live — one click</CardTitle>
          <CardDescription>
            Loads the catalog, creates the September-2026 intake, and builds the course offerings. Run once after enabling. Safe to re-run.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <Button
            className="bg-emerald-600 hover:bg-emerald-700"
            disabled={bootstrap.isPending}
            onClick={() => bootstrap.mutate()}
          >
            {bootstrap.isPending ? 'Setting up…' : 'Bootstrap AGI Utah'}
          </Button>
          {bootstrap.isError && <p className="text-sm text-destructive">{errorMessage(bootstrap.error)}</p>}
          {bootstrap.data && (
            <p className="text-sm text-emerald-700 dark:text-emerald-400">
              Ready — {bootstrap.data.offerings} course offerings created for intake “{bootstrap.data.intakeKey}”.
            </p>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Test intake (opens now)</CardTitle>
          <CardDescription>
            Creates a “test-now” intake starting this month, so enrollment windows are open today and you can run the full flow immediately.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <Button variant="secondary" disabled={createIntake.isPending} onClick={makeTestIntake}>
            {createIntake.isPending ? 'Creating…' : 'Create “test-now” intake'}
          </Button>
          {createIntake.isError && <p className="text-sm text-destructive">{errorMessage(createIntake.error)}</p>}
          {createIntake.data && (
            <p className="text-sm text-emerald-600">
              Ready — {createIntake.data.offerings} offerings on “{createIntake.data.intakeKey}”. Enroll students with intake <strong>test-now</strong>.
            </p>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Catalog</CardTitle>
          <CardDescription>Reload the program stack (courses, credentials, spine) from the authored catalog. Idempotent.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <Button variant="secondary" disabled={loadCatalog.isPending} onClick={() => loadCatalog.mutate()}>
            {loadCatalog.isPending ? 'Loading…' : 'Load / refresh catalog'}
          </Button>
          {loadCatalog.isError && <p className="text-sm text-destructive">{errorMessage(loadCatalog.error)}</p>}
          {loadCatalog.data && <p className="text-sm text-emerald-600">Catalog loaded.</p>}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Expand an intake</CardTitle>
          <CardDescription>Rebuild an existing intake’s monthly course offerings.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex items-end gap-2">
            <div className="w-48 space-y-1.5">
              <Label>Intake key</Label>
              <Input value={intakeKey} onChange={(e: ChangeEvent<HTMLInputElement>) => setIntakeKey(e.target.value)} />
            </div>
            <Button variant="secondary" disabled={expandIntake.isPending} onClick={() => expandIntake.mutate(intakeKey)}>
              {expandIntake.isPending ? 'Expanding…' : 'Expand intake'}
            </Button>
          </div>
          {expandIntake.isError && <p className="text-sm text-destructive">{errorMessage(expandIntake.error)}</p>}
          {expandIntake.data && <p className="text-sm text-emerald-600">Created {expandIntake.data.offerings} course offerings.</p>}
        </CardContent>
      </Card>
    </div>
  );
}
