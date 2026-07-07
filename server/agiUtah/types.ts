/**
 * Shared types for the AGI Utah LMS module.
 *
 * These describe the stackable credential model:
 *   Certificate (1 course) ⊂ Diploma (gateway core + specialization) ⊂ MBA (12 core + specialization).
 *
 * The values below document the known set; the source of truth is the loaded course-map data.
 */

/** The three nested credential tiers. */
export type CredentialTier = 'certificate' | 'diploma' | 'mba';

/** A course's role *within a program* — a course can play different roles in different programs. */
export type CourseRole = 'core' | 'gateway' | 'entry' | 'concentration' | 'capstone';

/** Launch waves. Wave 0 = the 12-course core; Waves 1–3 release the specializations. */
export type Wave = 0 | 1 | 2 | 3;

/** Who pays for a proctored final, when one is required. */
export type ProctorPayer = 'agi' | 'student' | 'none';

/** How a program admits students. */
export type IntakeModel = 'any-month' | 'fixed-annual';

/** Lifecycle status of a course record. */
export type CourseStatus = 'draft' | 'active' | 'parked';

/** Known specialization keys (Wave 1 first). Documentation only; the loader may add more. */
export type SpecializationKey =
  | 'fintech'
  | 'finance'
  | 'supply-chain'
  | 'esg'
  | 'digital-transformation'
  | 'marketing'
  | 'hr';

/** A reference to another entity, recorded on a domain event (kind + business ref). */
export interface EntityRef {
  kind: string;
  ref: string;
}
