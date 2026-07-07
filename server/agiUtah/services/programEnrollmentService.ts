import { AgiUtahProgramEnrollment } from '../models/programEnrollment';
import { AgiUtahCourseEnrollment } from '../models/courseEnrollment';
import { AgiUtahCredentialRecord } from '../models/credentialRecord';
import { AgiUtahCredentialDefinition } from '../models/credentialDefinition';
import { emitEvent } from './emitEvent';

/**
 * Program enrollment + a student's overview.
 *
 * A student is enrolled in a PROGRAM (Certificate/Diploma/MBA) once; their per-course
 * enrollments and grades then roll up to it, and credentials/SAP are computed against it.
 * Writes only to `agiutah_*`.
 */

export interface EnrollInProgramInput {
  studentRef: string;
  programKey: string;
  intakeKey: string;
}

export async function enrollInProgram(input: EnrollInProgramInput): Promise<{ enrolled: boolean }> {
  const def = await AgiUtahCredentialDefinition.findOne({ programKey: input.programKey }).lean();
  if (!def) throw new Error(`Program ${input.programKey} not found.`);

  await AgiUtahProgramEnrollment.updateOne(
    { studentRef: input.studentRef, programKey: input.programKey },
    { $set: { intakeKey: input.intakeKey, status: 'active' }, $setOnInsert: { startedAt: new Date() } },
    { upsert: true },
  );

  const studentSubject = { kind: 'student', ref: input.studentRef };
  await emitEvent({
    eventType: 'program.enrolled',
    actor: studentSubject,
    subjects: [studentSubject, { kind: 'program', ref: input.programKey }],
    payload: { intakeKey: input.intakeKey },
  });

  return { enrolled: true };
}

export interface StudentOverview {
  programs: Array<{ programKey: string; intakeKey: string; status: string; awardName: string }>;
  courses: Array<{ courseCode: string; attemptNo: number; status: string; gradeLetter?: string; monthIndex: number }>;
  credentials: Array<{ programKey: string; awardName: string; status: string; issuedAt: Date }>;
}

export async function getStudentOverview(studentRef: string): Promise<StudentOverview> {
  const [programs, courses, credentials, definitions] = await Promise.all([
    AgiUtahProgramEnrollment.find({ studentRef }).lean(),
    AgiUtahCourseEnrollment.find({ studentRef }).sort({ monthIndex: 1, attemptNo: 1 }).lean(),
    AgiUtahCredentialRecord.find({ studentRef }).lean(),
    AgiUtahCredentialDefinition.find({}).lean(),
  ]);

  const awardByProgram = new Map(definitions.map((d) => [d.programKey, d.awardName]));

  return {
    programs: programs.map((p) => ({
      programKey: p.programKey,
      intakeKey: p.intakeKey,
      status: p.status,
      awardName: awardByProgram.get(p.programKey) ?? p.programKey,
    })),
    courses: courses.map((c) => ({
      courseCode: c.courseCode,
      attemptNo: c.attemptNo,
      status: c.status,
      gradeLetter: c.gradeLetter,
      monthIndex: c.monthIndex,
    })),
    credentials: credentials.map((r) => ({
      programKey: r.programKey,
      awardName: r.awardName,
      status: r.status,
      issuedAt: r.issuedAt,
    })),
  };
}
