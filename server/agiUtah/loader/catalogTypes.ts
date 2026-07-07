import type {
  CourseRole,
  CourseStatus,
  CredentialTier,
  IntakeModel,
  ProctorPayer,
  Wave,
} from '../types';

/**
 * Plain, serializable seed shapes for the AGI Utah catalog.
 *
 * A CatalogSeed is the canonical, data-driven description of the program stack. It is
 * authored from the course map (see catalog/agiUtahCatalog.ts), validated by
 * loader/validateCatalog.ts, then loaded by loader/loadCatalog.ts. Keeping it plain data
 * is what makes Logan's spec changes (credits, calendar order, proctoring) a data edit
 * rather than a code change.
 */

export interface CourseSeed {
  code: string;
  title: string;
  creditsSCH: number;
  learningHours: number;
  contactHours?: number;
  independentHours?: number;
  track: string;
  wave: Wave;
  proctoredFinal?: boolean;
  proctorPayer?: ProctorPayer;
  status?: CourseStatus;
}

export interface ProgramSeed {
  key: string;
  tier: CredentialTier;
  specializationKey?: string;
  title: string;
  awardName: string;
  wave: Wave;
  intakeModel: IntakeModel;
  fixedAnnualIntakeMonth?: number;
  listTuitionUsd?: number;
  applicationFeeUsd?: number;
  depositCapPct?: number;
  standardMonths?: number;
  maxMonths?: number;
}

export interface LinkSeed {
  courseCode: string;
  programKey: string;
  role: CourseRole;
  sequenceIndex?: number;
  isGateway?: boolean;
  required?: boolean;
}

export interface CredentialDefinitionSeed {
  programKey: string;
  tier: CredentialTier;
  specializationKey?: string;
  memberCourseCodes: string[];
  awardName: string;
}

export interface SpineSlotSeed {
  /** 1-based month position in the 12-month core spine. */
  monthIndex: number;
  coreCourseCode: string;
}

export interface CatalogSeed {
  courses: CourseSeed[];
  programs: ProgramSeed[];
  links: LinkSeed[];
  credentialDefinitions: CredentialDefinitionSeed[];
  /** The confirmed 12-month core-spine order (one core course per month). */
  spine: SpineSlotSeed[];
}
