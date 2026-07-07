import { AgiUtahAttendance } from '../models/attendance';
import { emitEvent } from './emitEvent';

export interface RecordAttendanceInput {
  studentRef: string;
  intakeKey: string;
  courseCode: string;
  weekIndex: number;
  source: 'live' | 'recording' | 'manual';
}

/**
 * Records that a student satisfied a live session (live or via recording). Idempotent: the
 * unique index means a repeat is a no-op, and the contact-hour event is emitted ONLY on the
 * first insert (guarded by upsertedCount) so the RSI ledger never double-counts on retries.
 */
export async function recordAttendance(input: RecordAttendanceInput): Promise<{ firstTime: boolean }> {
  const res = await AgiUtahAttendance.updateOne(
    {
      studentRef: input.studentRef,
      intakeKey: input.intakeKey,
      courseCode: input.courseCode,
      weekIndex: input.weekIndex,
    },
    { $set: { present: true, source: input.source, recordedAt: new Date() } },
    { upsert: true },
  );

  const firstTime = (res.upsertedCount ?? 0) > 0;
  if (firstTime) {
    const studentSubject = { kind: 'student', ref: input.studentRef };
    await emitEvent({
      eventType: 'live.attended',
      actor: studentSubject,
      subjects: [studentSubject, { kind: 'course', ref: input.courseCode }],
      payload: { weekIndex: input.weekIndex, source: input.source },
    });
  }

  return { firstTime };
}
