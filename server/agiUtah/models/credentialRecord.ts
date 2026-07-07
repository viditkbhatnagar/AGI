import mongoose, { Schema, Document, Model } from 'mongoose';
import type { CredentialTier } from '../types';

/**
 * A credential a student has actually earned/been issued. On upgrade, the lower credential
 * is SUPERSEDED (kept, not deleted) so it stays independently verifiable — records are never
 * hard-deleted (compliance evidence). Issuance is idempotent on `issuerCredentialId`.
 *
 * Isolated: `agiutah_credential_records` collection.
 */
export interface IAgiUtahCredentialRecord {
  studentRef: string;
  programKey: string;
  tier: CredentialTier;
  awardName: string;
  status: 'issued' | 'superseded' | 'revoked';
  issuerCredentialId?: string;
  issuedAt: Date;
  supersededByProgramKey?: string;
}

export interface IAgiUtahCredentialRecordDocument extends IAgiUtahCredentialRecord, Document {}

const AgiUtahCredentialRecordSchema = new Schema<IAgiUtahCredentialRecordDocument>(
  {
    studentRef: { type: String, required: true },
    programKey: { type: String, required: true },
    tier: { type: String, enum: ['certificate', 'diploma', 'mba'], required: true },
    awardName: { type: String, required: true },
    status: { type: String, enum: ['issued', 'superseded', 'revoked'], default: 'issued' },
    issuerCredentialId: { type: String, required: false },
    issuedAt: { type: Date, required: true, default: () => new Date() },
    supersededByProgramKey: { type: String, required: false },
  },
  { timestamps: true, collection: 'agiutah_credential_records' },
);

AgiUtahCredentialRecordSchema.index({ studentRef: 1, programKey: 1 }, { unique: true });

export const AgiUtahCredentialRecord: Model<IAgiUtahCredentialRecordDocument> =
  (mongoose.models.AgiUtahCredentialRecord as Model<IAgiUtahCredentialRecordDocument>) ||
  mongoose.model<IAgiUtahCredentialRecordDocument>('AgiUtahCredentialRecord', AgiUtahCredentialRecordSchema);
