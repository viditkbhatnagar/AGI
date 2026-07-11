import { AgiUtahCourseEnrollment } from '../models/courseEnrollment';
import { enrollInProgram } from './programEnrollmentService';
import { recomputeSap } from './sapService';
import { issueCredentialIfEarned } from './credentialService';
import { letterToGradePoint, isPassingGradePoint } from '../lib/grading';
import { emitEvent } from './emitEvent';

/**
 * Seeds a fully-populated DEMO student for testing/walkthroughs: enrolls them in the MBA and
 * the stackable FinTech Certificate, marks a few courses passed with grades, and issues the
 * certificate they've now earned. It writes course grades DIRECTLY (bypassing the Week-1
 * enrollment window) — this is a deliberate demo/testing convenience, admin-only, and only
 * touches `agiutah_*` collections. Not part of the real student flow.
 */

const DEMO_GRADED_COURSES: Array<{ code: string; grade: string }> = [
  { code: 'CR05', grade: 'B+' },
  { code: 'CR02', grade: 'A-' },
  { code: 'CR01', grade: 'B' },
  { code: 'FT01', grade: 'A' }, // the FinTech Certificate course
];

export async function seedDemoStudent(
  studentRef: string,
  intakeKey = 'test-now',
): Promise<{ seeded: boolean; courses: number }> {
  // Enroll in the headline MBA and the stackable Certificate (so a credential can issue).
  await enrollInProgram({ studentRef, programKey: 'mba-fintech', intakeKey });
  await enrollInProgram({ studentRef, programKey: 'cert-fintech', intakeKey });

  for (let i = 0; i < DEMO_GRADED_COURSES.length; i += 1) {
    const { code, grade } = DEMO_GRADED_COURSES[i];
    const gradePoint = letterToGradePoint(grade);
    const status = typeof gradePoint === 'number' && isPassingGradePoint(gradePoint) ? 'passed' : 'failed';
    await AgiUtahCourseEnrollment.updateOne(
      { studentRef, courseCode: code, attemptNo: 1 },
      {
        $set: {
          intakeKey,
          monthIndex: i + 1,
          status,
          gradeLetter: grade,
          ...(typeof gradePoint === 'number' ? { gradePoint } : {}),
          completedAt: new Date(),
        },
        $setOnInsert: { enrolledAt: new Date() },
      },
      { upsert: true },
    );
  }

  await emitEvent({
    eventType: 'demo.seeded',
    subjects: [{ kind: 'student', ref: studentRef }],
    payload: { courses: DEMO_GRADED_COURSES.length },
  });

  // Recompute progress + issue any earned credential (the FinTech Certificate = FT01, now passed).
  for (const programKey of ['cert-fintech', 'mba-fintech']) {
    await recomputeSap(studentRef, programKey);
    await issueCredentialIfEarned(studentRef, programKey);
  }

  return { seeded: true, courses: DEMO_GRADED_COURSES.length };
}
