import { AgiUtahCourseEnrollment } from '../models/courseEnrollment';
import { AgiUtahProgramEnrollment } from '../models/programEnrollment';
import { letterToGradePoint, isPassingGradePoint } from '../lib/grading';
import { emitEvent } from './emitEvent';
import { issueCredentialIfEarned } from './credentialService';
import { recomputeSap } from './sapService';

export interface PostGradeInput {
  studentRef: string;
  courseCode: string;
  attemptNo: number;
  gradeLetter: string;
  gradedByRef?: string;
}

export interface PostGradeResult {
  passed: boolean;
  gradePoint: number | null;
}

/**
 * Posts a faculty grade for a course attempt: records the 4.0-scale grade, sets pass/fail
 * (B- minimum), emits the graded event (faculty RSI → contact), then recomputes credentials
 * and SAP for each of the student's active programs. Both attempts of a retaken course remain
 * on record. Writes only to `agiutah_*` collections.
 */
export async function postCourseGrade(input: PostGradeInput): Promise<PostGradeResult> {
  const gradePoint = letterToGradePoint(input.gradeLetter);
  if (gradePoint === undefined) {
    throw new Error(`Unknown grade "${input.gradeLetter}".`);
  }

  const passed = typeof gradePoint === 'number' && isPassingGradePoint(gradePoint);
  const status = gradePoint === null ? 'withdrawn' : passed ? 'passed' : 'failed';

  await AgiUtahCourseEnrollment.updateOne(
    { studentRef: input.studentRef, courseCode: input.courseCode, attemptNo: input.attemptNo },
    {
      $set: {
        gradeLetter: input.gradeLetter,
        ...(typeof gradePoint === 'number' ? { gradePoint } : {}),
        status,
        completedAt: new Date(),
      },
    },
  );

  const studentSubject = { kind: 'student', ref: input.studentRef };
  await emitEvent({
    eventType: 'assessment.graded',
    actor: input.gradedByRef ? { kind: 'faculty', ref: input.gradedByRef } : undefined,
    subjects: [studentSubject, { kind: 'course', ref: input.courseCode }],
    payload: { gradeLetter: input.gradeLetter, gradePoint, passed },
  });

  // Recompute downstream state for each active program the student is in.
  const programs = await AgiUtahProgramEnrollment.find({
    studentRef: input.studentRef,
    status: 'active',
  }).lean();

  for (const program of programs) {
    await recomputeSap(input.studentRef, program.programKey);
    await issueCredentialIfEarned(input.studentRef, program.programKey);
  }

  return { passed, gradePoint };
}
