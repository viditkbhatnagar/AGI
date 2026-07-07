import mongoose, { Schema, Document, Model } from 'mongoose';
import type { CredentialTier, IntakeModel, Wave } from '../types';

/**
 * A program is a credential a student can earn: a Certificate, a Diploma, or the MBA
 * (each tied to a specialization). Programs are compositions of shared courses — the
 * actual course membership lives in CourseProgramLink / CredentialDefinition, so a
 * program's total credits are DERIVED (summed from its courses at read time), never
 * stored here.
 *
 * Isolated: `agiutah_programs` collection, `AgiUtahProgram` model name.
 */
export interface IAgiUtahProgram {
  /** Stable business key, e.g. 'mba-fintech', 'diploma-finance', 'cert-fintech'. */
  key: string;
  tier: CredentialTier;
  /** Specialization this program belongs to; absent only for tracks that have none. */
  specializationKey?: string;
  title: string;
  /** Printed on the award, e.g. 'MBA — FinTech'. Data-driven, not derived in code. */
  awardName: string;
  wave: Wave;
  /** Optional feature flag gating this program; when absent, the master flag applies. */
  featureFlagKey?: string;
  intakeModel: IntakeModel;
  /** 1–12; only meaningful when intakeModel is 'fixed-annual' (specialized diplomas). */
  fixedAnnualIntakeMonth?: number;
  /** Provisional list tuition (USD). Data-driven; discounts are applied as a switchable promo. */
  listTuitionUsd?: number;
  applicationFeeUsd?: number;
  /** Deposit cap as a fraction of tuition (0.10 = ≤10%). */
  depositCapPct?: number;
  /** Standard months to complete; used with startedAt for the academic-progress timeframe. */
  standardMonths?: number;
  /** Maximum months to complete — the academic-progress ceiling (e.g. MBA 18 = 12 + 180-day LOA). */
  maxMonths?: number;
  active: boolean;
}

export interface IAgiUtahProgramDocument extends IAgiUtahProgram, Document {}

const AgiUtahProgramSchema = new Schema<IAgiUtahProgramDocument>(
  {
    key: { type: String, required: true, unique: true },
    tier: { type: String, enum: ['certificate', 'diploma', 'mba'], required: true },
    specializationKey: { type: String, required: false },
    title: { type: String, required: true },
    awardName: { type: String, required: true },
    wave: { type: Number, enum: [0, 1, 2, 3], required: true },
    featureFlagKey: { type: String, required: false },
    intakeModel: { type: String, enum: ['any-month', 'fixed-annual'], required: true },
    fixedAnnualIntakeMonth: { type: Number, min: 1, max: 12, required: false },
    listTuitionUsd: { type: Number, required: false },
    applicationFeeUsd: { type: Number, required: false },
    depositCapPct: { type: Number, required: false },
    standardMonths: { type: Number, required: false },
    maxMonths: { type: Number, required: false },
    active: { type: Boolean, default: false },
  },
  { timestamps: true, collection: 'agiutah_programs' },
);

export const AgiUtahProgram: Model<IAgiUtahProgramDocument> =
  (mongoose.models.AgiUtahProgram as Model<IAgiUtahProgramDocument>) ||
  mongoose.model<IAgiUtahProgramDocument>('AgiUtahProgram', AgiUtahProgramSchema);
