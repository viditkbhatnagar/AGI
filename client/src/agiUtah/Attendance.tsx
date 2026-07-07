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
import { COURSE_OPTIONS, ATTENDANCE_SOURCE_OPTIONS } from './constants';
import { useRecordAttendance } from './hooks';
import type { AttendanceInput } from './api';

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : 'Unexpected error';
}

export function AgiUtahAttendance() {
  const [studentRef, setStudentRef] = useState('');
  const [intakeKey, setIntakeKey] = useState('sep-2026');
  const [courseCode, setCourseCode] = useState('CR05');
  const [weekIndex, setWeekIndex] = useState(1);
  const [source, setSource] = useState<AttendanceInput['source']>('live');
  const record = useRecordAttendance();

  return (
    <Card>
      <CardHeader>
        <CardTitle>Record live-session attendance</CardTitle>
        <CardDescription>Records that a student attended (live or via recording). Logs a contact-hour event once.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <StudentPicker value={studentRef} onChange={setStudentRef} />
        <div className="grid gap-4 sm:grid-cols-2">
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
          <div className="space-y-1.5">
            <Label>Intake</Label>
            <Input value={intakeKey} onChange={(e: ChangeEvent<HTMLInputElement>) => setIntakeKey(e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <Label>Week</Label>
            <Input
              type="number"
              min={1}
              value={weekIndex}
              onChange={(e: ChangeEvent<HTMLInputElement>) => setWeekIndex(Number(e.target.value) || 1)}
            />
          </div>
          <div className="space-y-1.5">
            <Label>Source</Label>
            <Select value={source} onValueChange={(v) => setSource(v as AttendanceInput['source'])}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {ATTENDANCE_SOURCE_OPTIONS.map((s) => (
                  <SelectItem key={s} value={s}>{s}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
        <Button
          disabled={!studentRef || record.isPending}
          onClick={() => record.mutate({ studentRef, intakeKey, courseCode, weekIndex, source })}
        >
          {record.isPending ? 'Recording…' : 'Record attendance'}
        </Button>
        {record.isError && <p className="text-sm text-destructive">{errorMessage(record.error)}</p>}
        {record.data && (
          <p className="text-sm text-emerald-600">
            {record.data.firstTime ? 'Recorded (contact-hour event logged).' : 'Already recorded — no duplicate.'}
          </p>
        )}
      </CardContent>
    </Card>
  );
}
