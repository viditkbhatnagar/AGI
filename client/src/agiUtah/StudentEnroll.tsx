import { useState, type ChangeEvent } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { StudentPicker } from './StudentPicker';
import { PROGRAM_OPTIONS, COURSE_OPTIONS } from './constants';
import { useEnroll, useEnrollInProgram, useEarnedCredentials } from './hooks';

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : 'Unexpected error';
}

export function AgiUtahStudentEnroll() {
  const [studentRef, setStudentRef] = useState('');
  const [programKey, setProgramKey] = useState('mba-fintech');
  const [intakeKey, setIntakeKey] = useState('sep-2026');
  const [courseCode, setCourseCode] = useState('CR05');

  const enrollProgram = useEnrollInProgram();
  const enroll = useEnroll();
  const earned = useEarnedCredentials(studentRef, studentRef.length > 0);

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>1. Enroll in a program</CardTitle>
          <CardDescription>Place the student in a Certificate / Diploma / MBA. Do this first.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <StudentPicker value={studentRef} onChange={setStudentRef} />
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label>Program</Label>
              <Select value={programKey} onValueChange={setProgramKey}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {PROGRAM_OPTIONS.map((o) => (
                    <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Intake</Label>
              <Input value={intakeKey} onChange={(e: ChangeEvent<HTMLInputElement>) => setIntakeKey(e.target.value)} />
            </div>
          </div>
          <Button
            disabled={!studentRef || enrollProgram.isPending}
            onClick={() => enrollProgram.mutate({ studentRef, programKey, intakeKey })}
          >
            {enrollProgram.isPending ? 'Enrolling…' : 'Enroll in program'}
          </Button>
          {enrollProgram.isError && <p className="text-sm text-destructive">{errorMessage(enrollProgram.error)}</p>}
          {enrollProgram.data?.enrolled && <p className="text-sm text-emerald-600">Enrolled in {programKey}.</p>}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>2. Enroll in a course</CardTitle>
          <CardDescription>Checks the enrollment window, program membership, and the gateway rule.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-1.5">
            <Label>Course</Label>
            <Select value={courseCode} onValueChange={setCourseCode}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {COURSE_OPTIONS.map((o) => (
                  <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <Button
            disabled={!studentRef || enroll.isPending}
            onClick={() => enroll.mutate({ studentRef, programKey, intakeKey, courseCode })}
          >
            {enroll.isPending ? 'Checking…' : 'Enroll in course'}
          </Button>
          {enroll.isError && <p className="text-sm text-destructive">{errorMessage(enroll.error)}</p>}
          {enroll.data &&
            (enroll.data.allowed ? (
              <p className="text-sm text-emerald-600">Enrolled (attempt {enroll.data.attemptNo}).</p>
            ) : (
              <ul className="list-disc space-y-1 pl-5 text-sm text-destructive">
                {enroll.data.reasons.map((reason) => (
                  <li key={reason}>{reason}</li>
                ))}
              </ul>
            ))}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Credentials available to claim</CardTitle>
        </CardHeader>
        <CardContent>
          {!studentRef && <p className="text-sm text-muted-foreground">Pick a student above.</p>}
          {earned.isLoading && <p className="text-sm text-muted-foreground">Loading…</p>}
          {earned.data && earned.data.length === 0 && <p className="text-sm text-muted-foreground">None yet.</p>}
          {earned.data && earned.data.length > 0 && (
            <ul className="list-disc space-y-1 pl-5 text-sm">
              {earned.data.map((programKeyItem) => (
                <li key={programKeyItem}>{programKeyItem}</li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
