import { AgiUtahCredentialDefinition } from '../models/credentialDefinition';
import { AgiUtahCourse } from '../models/course';
import { AgiUtahCourseEnrollment } from '../models/courseEnrollment';
import { AgiUtahSapStatus } from '../models/sapStatus';
import { AgiUtahProgram } from '../models/program';
import { AgiUtahProgramEnrollment } from '../models/programEnrollment';
import { computeGpaLatest, type AttemptGrade } from '../lib/grading';
import { evaluateSap, type SapResult } from '../lib/sap';
import { emitEvent } from './emitEvent';

const MS_PER_MONTH = 30.4375 * 24 * 60 * 60 * 1000;

/**
 * Timeframe as a percent of the program's standard length (elapsed ÷ standardMonths).
 * Returns 0 when the program has no standard length or the student has no start date yet.
 */
async function computeTimeframePct(studentRef: string, programKey: string, now: Date): Promise<number> {
  const [program, enrollment] = await Promise.all([
    AgiUtahProgram.findOne({ key: programKey }).lean(),
    AgiUtahProgramEnrollment.findOne({ studentRef, programKey }).lean(),
  ]);
  if (!program?.standardMonths || !enrollment?.startedAt) return 0;
  const elapsedMonths = (now.getTime() - new Date(enrollment.startedAt).getTime()) / MS_PER_MONTH;
  return (elapsedMonths / program.standardMonths) * 100;
}

/**
 * Recomputes Satisfactory Academic Progress for a student in a program and persists it.
 *
 * GPA uses the latest attempt per member course; pace = completed ÷ attempted credits (by
 * SCH); timeframe is supplied by the caller (elapsed vs standard length) — 0 until the program
 * duration is finalized. Emits `sap.evaluated`, plus `sap.state_changed` when the state moves.
 */
export async function recomputeSap(
  studentRef: string,
  programKey: string,
  opts?: { timeframePct?: number; now?: Date },
): Promise<SapResult> {
  const def = await AgiUtahCredentialDefinition.findOne({ programKey }).lean();
  if (!def) throw new Error(`Program ${programKey} not found.`);

  const memberSet = new Set(def.memberCourseCodes);
  const enrollments = await AgiUtahCourseEnrollment.find({ studentRef }).lean();
  const relevant = enrollments.filter((e) => memberSet.has(e.courseCode));

  const attempts: AttemptGrade[] = relevant.map((e) => ({
    courseCode: e.courseCode,
    attemptNo: e.attemptNo,
    gradePoint: e.gradePoint ?? null,
  }));
  const gpa = computeGpaLatest(attempts);

  const latestByCourse = new Map<string, (typeof relevant)[number]>();
  for (const e of relevant) {
    const current = latestByCourse.get(e.courseCode);
    if (!current || e.attemptNo > current.attemptNo) latestByCourse.set(e.courseCode, e);
  }

  const courses = await AgiUtahCourse.find({ code: { $in: def.memberCourseCodes } }).lean();
  const schByCode = new Map(courses.map((c) => [c.code, c.creditsSCH]));

  let attemptedCredits = 0;
  let completedCredits = 0;
  for (const e of latestByCourse.values()) {
    const sch = schByCode.get(e.courseCode) ?? 0;
    if (e.status === 'passed' || e.status === 'failed') attemptedCredits += sch;
    if (e.status === 'passed') completedCredits += sch;
  }

  const timeframePct =
    opts?.timeframePct ?? (await computeTimeframePct(studentRef, programKey, opts?.now ?? new Date()));
  const result = evaluateSap({ gpa, attemptedCredits, completedCredits, timeframePct });

  const previous = await AgiUtahSapStatus.findOne({ studentRef, programKey }).lean();
  await AgiUtahSapStatus.updateOne(
    { studentRef, programKey },
    {
      $set: {
        state: result.state,
        gpa,
        pace: result.pace,
        timeframePct,
        reasons: result.reasons,
        evaluatedAt: new Date(),
      },
    },
    { upsert: true },
  );

  const subjects = [{ kind: 'student', ref: studentRef }, { kind: 'program', ref: programKey }];
  await emitEvent({ eventType: 'sap.evaluated', subjects, payload: { state: result.state, gpa, pace: result.pace } });
  if (previous && previous.state !== result.state) {
    await emitEvent({ eventType: 'sap.state_changed', subjects, payload: { from: previous.state, to: result.state } });
  }

  return result;
}
