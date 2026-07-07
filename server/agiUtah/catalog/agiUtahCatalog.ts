import type {
  CatalogSeed,
  CourseSeed,
  CredentialDefinitionSeed,
  LinkSeed,
  ProgramSeed,
  SpineSlotSeed,
} from '../loader/catalogTypes';
import type { CredentialTier, Wave } from '../types';

/**
 * The AGI Utah program-stack catalog, authored from Logan's confirmed course map
 * (course = 3 SCH / 135 h; 12-course core; each specialization = 4 courses).
 *
 * This file is DATA, not logic. When Logan revises the map (credits, courses, calendar),
 * this is what changes — the loader and models stay put. Numbers here are the source of
 * truth the loader validates and loads; nothing downstream hard-codes them.
 *
 * Wave 0 = the 12 core courses. Wave 1 = FinTech, Finance, Supply Chain & Operations.
 * Waves 2–3 (ESG, Digital Transformation, HR, Marketing) are added later as more data.
 */

const SCH = 3;
const HOURS = 135;
const CONTACT = 45;
const INDEPENDENT = 90;

// Fees & durations (Logan 2026-07-03). Provisional list prices pending final sign-off; kept as
// DATA so a discount is a switchable promo, never hard-coded. Application fee is flat; deposit is
// capped at 10% of tuition. MBA duration is confirmed (12 standard + 180-day LOA = 18 max);
// Certificate/Diploma durations are provisional (from the academic calendar).
const APPLICATION_FEE_USD = 60;
const DEPOSIT_CAP_PCT = 0.1;
const TIER_TUITION_USD: Record<CredentialTier, number> = {
  certificate: 995,
  diploma: 4500,
  mba: 8000,
};
const TIER_DURATION_MONTHS: Record<CredentialTier, { standard: number; max: number }> = {
  certificate: { standard: 2, max: 3 },
  diploma: { standard: 6, max: 9 },
  mba: { standard: 12, max: 18 },
};

function tierFeesAndDurations(tier: CredentialTier) {
  return {
    listTuitionUsd: TIER_TUITION_USD[tier],
    applicationFeeUsd: APPLICATION_FEE_USD,
    depositCapPct: DEPOSIT_CAP_PCT,
    standardMonths: TIER_DURATION_MONTHS[tier].standard,
    maxMonths: TIER_DURATION_MONTHS[tier].max,
  };
}

// --- Core (Wave 0) -----------------------------------------------------------

const CORE_TITLES: Record<string, string> = {
  CR01: 'Financial Accounting & Integrated Reporting',
  CR02: 'Corporate Finance & Intro to FinTech',
  CR03: 'Digital-First Marketing Management',
  CR04: 'Managing People & the Future of Work',
  CR05: 'Operations & Digital Supply Chains',
  CR06: 'Strategy in the Age of Digital Transformation',
  CR07: 'Managerial Economics & Sustainability',
  CR08: 'Business Analytics & AI for Decision-Making',
  CR09: 'Agile Project Management',
  CR10: 'Leadership & Change in Digital Organizations',
  CR11: 'Data-Driven Research Methods',
  CR12: 'Governance, Ethics & ESG',
};

const CORE_CODES = Object.keys(CORE_TITLES);

// Proctored-final flags (Logan 2026-07-03): the Wave-1 specialization gateway core courses —
// CR02 (Finance/FinTech) and CR05 (Supply Chain). NOT CR01. The capstone flag is left off until
// capstone proctoring is locked. Data-driven — the per-course toggle stays switchable.
const CORE_PROCTORED = new Set(['CR02', 'CR05']);

const coreCourses: CourseSeed[] = CORE_CODES.map((code) => ({
  code,
  title: CORE_TITLES[code],
  creditsSCH: SCH,
  learningHours: HOURS,
  contactHours: CONTACT,
  independentHours: INDEPENDENT,
  track: 'core',
  wave: 0,
  proctoredFinal: CORE_PROCTORED.has(code),
  status: 'active',
}));

// --- Specializations (Wave 1) ------------------------------------------------

interface SpecConfig {
  key: string;
  display: string;
  wave: Wave;
  /** Core course that gates this specialization and is the diploma's core course. */
  gatewayCode: string;
  /** Provisional fixed-annual intake month (1–12) for the standalone diploma; confirm with Logan. */
  diplomaIntakeMonth: number;
  /** Ordered spec courses: [entry, concentration, concentration, capstone]. */
  courses: Array<{ code: string; title: string }>;
}

const SPECS: SpecConfig[] = [
  {
    key: 'fintech',
    display: 'FinTech',
    wave: 1,
    gatewayCode: 'CR02',
    diplomaIntakeMonth: 1, // aligned to CR02 (M5 = Jan); confirm exact month with Logan
    courses: [
      { code: 'FT01', title: 'Foundations of FinTech & Digital Finance' },
      { code: 'FT02', title: 'Digital Payments & Banking Technology' },
      { code: 'FT04', title: 'Financial Data Analytics' },
      { code: 'FT06', title: 'FinTech Capstone Project' },
    ],
  },
  {
    key: 'finance',
    display: 'Finance',
    wave: 1,
    gatewayCode: 'CR02',
    diplomaIntakeMonth: 1, // aligned to CR02 (M5 = Jan); confirm exact month with Logan
    courses: [
      { code: 'FN01', title: 'Advanced Corporate Finance' },
      { code: 'FN02', title: 'International Finance' },
      { code: 'FN04', title: 'Investment & Portfolio Management' },
      { code: 'FN06', title: 'Finance Capstone' },
    ],
  },
  {
    key: 'supply-chain',
    display: 'Supply Chain & Operations',
    wave: 1,
    gatewayCode: 'CR05',
    diplomaIntakeMonth: 9, // aligned to CR05 (M1 = Sep); confirm exact month with Logan
    courses: [
      { code: 'SC01', title: 'Global Supply Chain Strategy' },
      { code: 'SC02', title: 'Logistics & Distribution Management' },
      { code: 'SC03', title: 'Lean & Six Sigma' },
      { code: 'SC06', title: 'Supply Chain Capstone' },
    ],
  },
];

interface SpecBuild {
  courses: CourseSeed[];
  programs: ProgramSeed[];
  links: LinkSeed[];
  credentialDefinitions: CredentialDefinitionSeed[];
}

/**
 * Builds every artefact for one specialization: its 4 courses and its three nested
 * credentials (Certificate ⊂ Diploma ⊂ MBA), keeping the composition consistent by
 * construction so strict nesting always holds.
 */
function buildSpec(spec: SpecConfig): SpecBuild {
  const [entry, conc1, conc2, capstone] = spec.courses;

  const courses: CourseSeed[] = spec.courses.map((c) => ({
    code: c.code,
    title: c.title,
    creditsSCH: SCH,
    learningHours: HOURS,
    contactHours: CONTACT,
    independentHours: INDEPENDENT,
    track: spec.key,
    wave: spec.wave,
    // Capstone proctoring is not yet locked (Logan): leave off; the per-course toggle stays
    // switchable so it can be enabled when confirmed.
    proctoredFinal: false,
    status: 'active',
  }));

  const specCodes = spec.courses.map((c) => c.code);
  const certKey = `cert-${spec.key}`;
  const diplomaKey = `diploma-${spec.key}`;
  const mbaKey = `mba-${spec.key}`;

  const programs: ProgramSeed[] = [
    {
      key: certKey,
      tier: 'certificate',
      specializationKey: spec.key,
      title: `${spec.display} Certificate`,
      awardName: `Certificate — ${entry.title}`,
      wave: spec.wave,
      intakeModel: 'any-month',
      ...tierFeesAndDurations('certificate'),
    },
    {
      key: diplomaKey,
      tier: 'diploma',
      specializationKey: spec.key,
      title: `${spec.display} Diploma`,
      awardName: `Specialized Diploma — ${spec.display}`,
      wave: spec.wave,
      intakeModel: 'fixed-annual',
      fixedAnnualIntakeMonth: spec.diplomaIntakeMonth,
      ...tierFeesAndDurations('diploma'),
    },
    {
      key: mbaKey,
      tier: 'mba',
      specializationKey: spec.key,
      title: `MBA — ${spec.display}`,
      awardName: `MBA — ${spec.display}`,
      wave: spec.wave,
      intakeModel: 'any-month',
      ...tierFeesAndDurations('mba'),
    },
  ];

  // Certificate = the entry course only.
  const certLinks: LinkSeed[] = [
    { courseCode: entry.code, programKey: certKey, role: 'entry', sequenceIndex: 1 },
  ];

  // Diploma = gateway core course + the specialization's 4 courses.
  const diplomaLinks: LinkSeed[] = [
    { courseCode: spec.gatewayCode, programKey: diplomaKey, role: 'gateway', isGateway: true, sequenceIndex: 1 },
    { courseCode: entry.code, programKey: diplomaKey, role: 'entry', sequenceIndex: 2 },
    { courseCode: conc1.code, programKey: diplomaKey, role: 'concentration', sequenceIndex: 3 },
    { courseCode: conc2.code, programKey: diplomaKey, role: 'concentration', sequenceIndex: 4 },
    { courseCode: capstone.code, programKey: diplomaKey, role: 'capstone', sequenceIndex: 5 },
  ];

  // MBA = all 12 core courses + the specialization's 4 courses.
  const mbaCoreLinks: LinkSeed[] = CORE_CODES.map((code, index) => ({
    courseCode: code,
    programKey: mbaKey,
    role: 'core',
    sequenceIndex: index + 1,
    isGateway: code === spec.gatewayCode,
  }));
  const mbaSpecLinks: LinkSeed[] = [
    { courseCode: entry.code, programKey: mbaKey, role: 'entry', sequenceIndex: 13 },
    { courseCode: conc1.code, programKey: mbaKey, role: 'concentration', sequenceIndex: 14 },
    { courseCode: conc2.code, programKey: mbaKey, role: 'concentration', sequenceIndex: 15 },
    { courseCode: capstone.code, programKey: mbaKey, role: 'capstone', sequenceIndex: 16 },
  ];

  const credentialDefinitions: CredentialDefinitionSeed[] = [
    {
      programKey: certKey,
      tier: 'certificate',
      specializationKey: spec.key,
      memberCourseCodes: [entry.code],
      awardName: `Certificate — ${entry.title}`,
    },
    {
      programKey: diplomaKey,
      tier: 'diploma',
      specializationKey: spec.key,
      memberCourseCodes: [spec.gatewayCode, ...specCodes],
      awardName: `Specialized Diploma — ${spec.display}`,
    },
    {
      programKey: mbaKey,
      tier: 'mba',
      specializationKey: spec.key,
      memberCourseCodes: [...CORE_CODES, ...specCodes],
      awardName: `MBA — ${spec.display}`,
    },
  ];

  return {
    courses,
    programs,
    links: [...certLinks, ...diplomaLinks, ...mbaCoreLinks, ...mbaSpecLinks],
    credentialDefinitions,
  };
}

const specBuilds = SPECS.map(buildSpec);

// --- Calendar spine (confirmed order, one core course per month) --------------

const SPINE: SpineSlotSeed[] = [
  { monthIndex: 1, coreCourseCode: 'CR05' },
  { monthIndex: 2, coreCourseCode: 'CR03' },
  { monthIndex: 3, coreCourseCode: 'CR04' },
  { monthIndex: 4, coreCourseCode: 'CR01' },
  { monthIndex: 5, coreCourseCode: 'CR02' },
  { monthIndex: 6, coreCourseCode: 'CR06' },
  { monthIndex: 7, coreCourseCode: 'CR07' },
  { monthIndex: 8, coreCourseCode: 'CR08' },
  { monthIndex: 9, coreCourseCode: 'CR09' },
  { monthIndex: 10, coreCourseCode: 'CR10' },
  { monthIndex: 11, coreCourseCode: 'CR11' },
  { monthIndex: 12, coreCourseCode: 'CR12' },
];

export const AGI_UTAH_CATALOG: CatalogSeed = {
  courses: [...coreCourses, ...specBuilds.flatMap((b) => b.courses)],
  programs: specBuilds.flatMap((b) => b.programs),
  links: specBuilds.flatMap((b) => b.links),
  credentialDefinitions: specBuilds.flatMap((b) => b.credentialDefinitions),
  spine: SPINE,
};
