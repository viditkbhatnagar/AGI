import { AgiUtahCourse } from '../models/course';
import { AgiUtahCourseOffering } from '../models/courseOffering';
import { AgiUtahCredentialDefinition } from '../models/credentialDefinition';
import { AgiUtahCourseProgramLink } from '../models/courseProgramLink';
import { AgiUtahCourseEnrollment } from '../models/courseEnrollment';
import { AgiUtahSapStatus } from '../models/sapStatus';
import { AgiUtahFinancialAccount } from '../models/financialAccount';
import { evaluateEnrollmentEligibility } from '../lib/eligibility';
import { emitEvent } from './emitEvent';

export interface EnrollInput {
  studentRef: string;
  programKey: string;
  intakeKey: string;
  courseCode: string;
  now?: Date;
}

export interface EnrollResult {
  allowed: boolean;
  reasons: string[];
  enrollmentId?: string;
  attemptNo?: number;
}

/**
 * Enrolls a student in one course, applying the full eligibility gate (Week-1 window + hard
 * gateway + program membership + SAP dismissal + financial hold). A failed prior attempt
 * becomes a new attempt (retake). Every decision is persisted to the event log. Writes only
 * to `agiutah_*` collections.
 */
export async function enrollStudentInCourse(input: EnrollInput): Promise<EnrollResult> {
  const now = input.now ?? new Date();

  const [offering, credentialDef, course, passed, activeSame, sap, account] = await Promise.all([
    AgiUtahCourseOffering.findOne({ intakeKey: input.intakeKey, courseCode: input.courseCode }).lean(),
    AgiUtahCredentialDefinition.findOne({ programKey: input.programKey }).lean(),
    AgiUtahCourse.findOne({ code: input.courseCode }).lean(),
    AgiUtahCourseEnrollment.find({ studentRef: input.studentRef, status: 'passed' }).lean(),
    AgiUtahCourseEnrollment.findOne({
      studentRef: input.studentRef,
      courseCode: input.courseCode,
      status: { $in: ['enrolled', 'in_progress', 'passed'] },
    }).lean(),
    AgiUtahSapStatus.findOne({ studentRef: input.studentRef, programKey: input.programKey }).lean(),
    AgiUtahFinancialAccount.findOne({ studentRef: input.studentRef, programKey: input.programKey }).lean(),
  ]);

  if (!offering) return { allowed: false, reasons: [`No offering for ${input.courseCode} in ${input.intakeKey}.`] };
  if (!credentialDef) return { allowed: false, reasons: [`Program ${input.programKey} not found.`] };

  const isSpecializationCourse = course ? course.track !== 'core' : false;
  const gatewayLink = isSpecializationCourse
    ? await AgiUtahCourseProgramLink.findOne({ programKey: input.programKey, isGateway: true }).lean()
    : null;

  const result = evaluateEnrollmentEligibility({
    now,
    enrollmentOpensAt: offering.enrollmentOpensAt,
    enrollmentClosesAt: offering.enrollmentClosesAt,
    courseCode: input.courseCode,
    programMemberCourseCodes: credentialDef.memberCourseCodes,
    isSpecializationCourse,
    gatewayCourseCode: gatewayLink?.courseCode,
    passedCourseCodes: passed.map((p) => p.courseCode),
    sapDismissed: sap?.state === 'dismissed',
    financialHold: account?.holdActive === true,
    alreadyEnrolledOrPassed: Boolean(activeSame),
  });

  const studentSubject = { kind: 'student', ref: input.studentRef };

  if (!result.allowed) {
    await emitEvent({
      eventType: 'enrollment.denied',
      actor: studentSubject,
      subjects: [studentSubject, { kind: 'course', ref: input.courseCode }],
      payload: { programKey: input.programKey, reasons: result.reasons },
    });
    return { allowed: false, reasons: result.reasons };
  }

  const priorAttempts = await AgiUtahCourseEnrollment.countDocuments({
    studentRef: input.studentRef,
    courseCode: input.courseCode,
  });
  const attemptNo = priorAttempts + 1;

  const created = await AgiUtahCourseEnrollment.create({
    studentRef: input.studentRef,
    courseCode: input.courseCode,
    intakeKey: input.intakeKey,
    monthIndex: offering.monthIndex,
    attemptNo,
    status: 'enrolled',
  });

  await emitEvent({
    eventType: 'enrollment.completed',
    actor: studentSubject,
    subjects: [studentSubject, { kind: 'course', ref: input.courseCode }],
    payload: { programKey: input.programKey, attemptNo },
  });

  return { allowed: true, reasons: [], enrollmentId: String(created._id), attemptNo };
}
