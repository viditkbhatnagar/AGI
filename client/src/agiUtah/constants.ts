/** Dropdown options for the AGI Utah screens (Wave 1). Keeps the UI free of typed codes. */

export interface Option {
  value: string;
  label: string;
}

export const PROGRAM_OPTIONS: Option[] = [
  { value: 'mba-fintech', label: 'MBA — FinTech' },
  { value: 'diploma-fintech', label: 'Diploma — FinTech' },
  { value: 'cert-fintech', label: 'Certificate — FinTech' },
  { value: 'mba-finance', label: 'MBA — Finance' },
  { value: 'diploma-finance', label: 'Diploma — Finance' },
  { value: 'cert-finance', label: 'Certificate — Finance' },
  { value: 'mba-supply-chain', label: 'MBA — Supply Chain & Ops' },
  { value: 'diploma-supply-chain', label: 'Diploma — Supply Chain & Ops' },
  { value: 'cert-supply-chain', label: 'Certificate — Supply Chain & Ops' },
];

export const COURSE_OPTIONS: Option[] = [
  { value: 'CR01', label: 'CR01 — Financial Accounting & Integrated Reporting' },
  { value: 'CR02', label: 'CR02 — Corporate Finance & Intro to FinTech' },
  { value: 'CR03', label: 'CR03 — Digital-First Marketing Management' },
  { value: 'CR04', label: 'CR04 — Managing People & the Future of Work' },
  { value: 'CR05', label: 'CR05 — Operations & Digital Supply Chains' },
  { value: 'CR06', label: 'CR06 — Strategy in the Age of Digital Transformation' },
  { value: 'CR07', label: 'CR07 — Managerial Economics & Sustainability' },
  { value: 'CR08', label: 'CR08 — Business Analytics & AI for Decision-Making' },
  { value: 'CR09', label: 'CR09 — Agile Project Management' },
  { value: 'CR10', label: 'CR10 — Leadership & Change in Digital Organizations' },
  { value: 'CR11', label: 'CR11 — Data-Driven Research Methods' },
  { value: 'CR12', label: 'CR12 — Governance, Ethics & ESG' },
  { value: 'FT01', label: 'FT01 — Foundations of FinTech & Digital Finance' },
  { value: 'FT02', label: 'FT02 — Digital Payments & Banking Technology' },
  { value: 'FT04', label: 'FT04 — Financial Data Analytics' },
  { value: 'FT06', label: 'FT06 — FinTech Capstone Project' },
  { value: 'FN01', label: 'FN01 — Advanced Corporate Finance' },
  { value: 'FN02', label: 'FN02 — International Finance' },
  { value: 'FN04', label: 'FN04 — Investment & Portfolio Management' },
  { value: 'FN06', label: 'FN06 — Finance Capstone' },
  { value: 'SC01', label: 'SC01 — Global Supply Chain Strategy' },
  { value: 'SC02', label: 'SC02 — Logistics & Distribution Management' },
  { value: 'SC03', label: 'SC03 — Lean & Six Sigma' },
  { value: 'SC06', label: 'SC06 — Supply Chain Capstone' },
];

export const GRADE_OPTIONS: string[] = ['A', 'A-', 'B+', 'B', 'B-', 'F', 'W', 'TR'];

export const ATTENDANCE_SOURCE_OPTIONS: Array<'live' | 'recording' | 'manual'> = [
  'live',
  'recording',
  'manual',
];
