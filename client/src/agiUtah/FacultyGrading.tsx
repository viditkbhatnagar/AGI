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
import { COURSE_OPTIONS, GRADE_OPTIONS } from './constants';
import { useGrade } from './hooks';

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : 'Unexpected error';
}

export function AgiUtahFacultyGrading() {
  const [studentRef, setStudentRef] = useState('');
  const [courseCode, setCourseCode] = useState('CR05');
  const [attemptNo, setAttemptNo] = useState(1);
  const [gradeLetter, setGradeLetter] = useState('B');
  const grade = useGrade();

  return (
    <Card>
      <CardHeader>
        <CardTitle>Post a grade</CardTitle>
        <CardDescription>
          Records the grade, recomputes academic progress, and issues any credential the student has now earned.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <StudentPicker value={studentRef} onChange={setStudentRef} />
        <div className="grid gap-4 sm:grid-cols-3">
          <div className="space-y-1.5 sm:col-span-2">
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
            <Label>Attempt</Label>
            <Input
              type="number"
              min={1}
              value={attemptNo}
              onChange={(e: ChangeEvent<HTMLInputElement>) => setAttemptNo(Number(e.target.value) || 1)}
            />
          </div>
        </div>
        <div className="space-y-1.5 sm:w-40">
          <Label>Grade</Label>
          <Select value={gradeLetter} onValueChange={setGradeLetter}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              {GRADE_OPTIONS.map((g) => (
                <SelectItem key={g} value={g}>{g}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <Button
          disabled={!studentRef || grade.isPending}
          onClick={() => grade.mutate({ studentRef, courseCode, attemptNo, gradeLetter })}
        >
          {grade.isPending ? 'Posting…' : 'Post grade'}
        </Button>
        {grade.isError && <p className="text-sm text-destructive">{errorMessage(grade.error)}</p>}
        {grade.data && (
          <p className={`text-sm ${grade.data.passed ? 'text-emerald-600' : 'text-amber-600'}`}>
            {grade.data.passed ? 'Passed' : 'Not passed'} — grade point {grade.data.gradePoint ?? 'n/a'}.
          </p>
        )}
      </CardContent>
    </Card>
  );
}
