import { isSpecializationUnlocked } from './credentialLogic';

/**
 * The single enrollment gate. Pure and unit-tested: it combines every rule that decides
 * whether a student may enroll in a course, and returns all failing reasons (not just the
 * first) so the UI can explain exactly why. The service layer gathers these inputs from the
 * DB and persists the decision to the event log; this function itself has no side effects.
 */

export interface EligibilityInput {
  now: Date;
  enrollmentOpensAt: Date;
  enrollmentClosesAt: Date;
  courseCode: string;
  /** The course set of the student's target credential. */
  programMemberCourseCodes: readonly string[];
  /** True if the course being enrolled belongs to a specialization (subject to a gateway). */
  isSpecializationCourse: boolean;
  /** The gateway core course for that specialization, when applicable. */
  gatewayCourseCode?: string;
  /** Courses the student has already passed. */
  passedCourseCodes: readonly string[];
  sapDismissed?: boolean;
  financialHold?: boolean;
  /** True if the student is already enrolled in, or has already passed, this course. */
  alreadyEnrolledOrPassed?: boolean;
}

export interface EligibilityResult {
  allowed: boolean;
  reasons: string[];
}

export function evaluateEnrollmentEligibility(input: EligibilityInput): EligibilityResult {
  const reasons: string[] = [];

  if (!input.programMemberCourseCodes.includes(input.courseCode)) {
    reasons.push(`Course ${input.courseCode} is not part of the selected program.`);
  }

  if (input.now < input.enrollmentOpensAt || input.now >= input.enrollmentClosesAt) {
    reasons.push('Enrollment window is closed (Week-1 enrollment only; no mid-course starts).');
  }

  if (
    input.isSpecializationCourse &&
    input.gatewayCourseCode &&
    !isSpecializationUnlocked(input.passedCourseCodes, input.gatewayCourseCode)
  ) {
    reasons.push(
      `Gateway course ${input.gatewayCourseCode} must be completed before starting this specialization.`,
    );
  }

  if (input.sapDismissed) {
    reasons.push('Student has been academically dismissed (Satisfactory Academic Progress).');
  }

  if (input.financialHold) {
    reasons.push('A financial hold is active on the account.');
  }

  if (input.alreadyEnrolledOrPassed) {
    reasons.push(`Course ${input.courseCode} is already enrolled or completed.`);
  }

  return { allowed: reasons.length === 0, reasons };
}
