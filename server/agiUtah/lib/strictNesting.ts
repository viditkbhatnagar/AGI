import type { CredentialTier } from '../types';

/**
 * Validates the strict-nesting invariant of the AGI Utah credential model:
 *   Certificate ⊂ Diploma ⊂ MBA  (per specialization).
 *
 * Every course in a lower credential must also be in the higher credential, so a learner
 * who upgrades never repeats a course. This is pure, side-effect-free logic, so it can be
 * unit-tested and reused by the course-map loader as a hard, block-on-failure assertion.
 */

export interface CredentialSet {
  programKey: string;
  tier: CredentialTier;
  /** The specialization the credential belongs to (used to group Certificate/Diploma/MBA). */
  specializationKey?: string;
  memberCourseCodes: string[];
}

export interface NestingViolation {
  specializationKey: string;
  message: string;
  missingCourseCodes: string[];
}

export interface NestingResult {
  ok: boolean;
  violations: NestingViolation[];
}

/** True if every element of `subset` is present in `superset`. */
export function isSubset(subset: readonly string[], superset: readonly string[]): boolean {
  const set = new Set(superset);
  return subset.every((code) => set.has(code));
}

/** The elements of `subset` that are missing from `superset`. */
function missingFrom(subset: readonly string[], superset: readonly string[]): string[] {
  const set = new Set(superset);
  return subset.filter((code) => !set.has(code));
}

/**
 * Checks Certificate ⊂ Diploma ⊂ MBA for each specialization group.
 * Returns every violation; `ok` is true only when there are none.
 */
export function validateStrictNesting(credentials: readonly CredentialSet[]): NestingResult {
  const violations: NestingViolation[] = [];

  const bySpecialization = new Map<string, CredentialSet[]>();
  for (const credential of credentials) {
    const key = credential.specializationKey ?? credential.programKey;
    const group = bySpecialization.get(key) ?? [];
    bySpecialization.set(key, [...group, credential]);
  }

  for (const [specializationKey, group] of bySpecialization) {
    const certificate = group.find((c) => c.tier === 'certificate');
    const diploma = group.find((c) => c.tier === 'diploma');
    const mba = group.find((c) => c.tier === 'mba');

    if (certificate && diploma && !isSubset(certificate.memberCourseCodes, diploma.memberCourseCodes)) {
      violations.push({
        specializationKey,
        message: `Certificate is not a subset of Diploma for "${specializationKey}"`,
        missingCourseCodes: missingFrom(certificate.memberCourseCodes, diploma.memberCourseCodes),
      });
    }

    if (diploma && mba && !isSubset(diploma.memberCourseCodes, mba.memberCourseCodes)) {
      violations.push({
        specializationKey,
        message: `Diploma is not a subset of MBA for "${specializationKey}"`,
        missingCourseCodes: missingFrom(diploma.memberCourseCodes, mba.memberCourseCodes),
      });
    }
  }

  return { ok: violations.length === 0, violations };
}
