import mongoose, { Schema, Document, Model } from 'mongoose';
import type { CredentialTier } from '../types';

/**
 * The declarative membership SET for a credential: the exact course codes a student
 * must complete to earn it. Credential issuance checks a student's passed-course set
 * against `memberCourseCodes`. Strict nesting (Certificate ⊂ Diploma ⊂ MBA) is validated
 * by `lib/strictNesting.ts`.
 *
 * Isolated: `agiutah_credential_definitions` collection.
 */
export interface IAgiUtahCredentialDefinition {
  /** One definition per program. */
  programKey: string;
  tier: CredentialTier;
  specializationKey?: string;
  /** The set of course codes that compose this credential. */
  memberCourseCodes: string[];
  awardName: string;
}

export interface IAgiUtahCredentialDefinitionDocument
  extends IAgiUtahCredentialDefinition,
    Document {}

const AgiUtahCredentialDefinitionSchema = new Schema<IAgiUtahCredentialDefinitionDocument>(
  {
    programKey: { type: String, required: true, unique: true },
    tier: { type: String, enum: ['certificate', 'diploma', 'mba'], required: true },
    specializationKey: { type: String, required: false },
    memberCourseCodes: { type: [String], default: [] },
    awardName: { type: String, required: true },
  },
  { timestamps: true, collection: 'agiutah_credential_definitions' },
);

export const AgiUtahCredentialDefinition: Model<IAgiUtahCredentialDefinitionDocument> =
  (mongoose.models.AgiUtahCredentialDefinition as Model<IAgiUtahCredentialDefinitionDocument>) ||
  mongoose.model<IAgiUtahCredentialDefinitionDocument>(
    'AgiUtahCredentialDefinition',
    AgiUtahCredentialDefinitionSchema,
  );
