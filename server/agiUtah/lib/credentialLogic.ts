import { isSubset } from './strictNesting';

/**
 * Pure, side-effect-free rules for gateways and credential completion.
 *
 * These are the heart of the stackable model and are unit-tested in isolation. They take
 * plain arrays of course codes so they can be reused by the enrollment-eligibility service,
 * the credential-issuance consumer, and the upgrade/pricing path without any DB coupling.
 */

/**
 * A specialization is unlocked only once its gateway core course has been passed.
 * Logan confirmed this is a HARD prerequisite, not just an ordering hint.
 */
export function isSpecializationUnlocked(
  passedCourseCodes: readonly string[],
  gatewayCourseCode: string,
): boolean {
  return passedCourseCodes.includes(gatewayCourseCode);
}

/** A credential is earned when every one of its member courses has been passed. */
export function isCredentialEarned(
  passedCourseCodes: readonly string[],
  memberCourseCodes: readonly string[],
): boolean {
  return isSubset(memberCourseCodes, passedCourseCodes);
}

/** The member courses still outstanding for a credential (empty means it is complete). */
export function coursesRemainingFor(
  passedCourseCodes: readonly string[],
  memberCourseCodes: readonly string[],
): string[] {
  const passed = new Set(passedCourseCodes);
  return memberCourseCodes.filter((code) => !passed.has(code));
}

/**
 * The courses to add (and charge for) when a learner upgrades to a higher credential.
 * Because credentials are strictly nested, anything already completed is never repeated
 * or re-charged — this is exactly the outstanding-course set.
 */
export function coursesToAddOnUpgrade(
  completedOrEnrolledCourseCodes: readonly string[],
  targetMemberCourseCodes: readonly string[],
): string[] {
  return coursesRemainingFor(completedOrEnrolledCourseCodes, targetMemberCourseCodes);
}
