import mongoose, { Schema, Document, Model } from 'mongoose';
import type { SapState } from '../lib/sap';

/**
 * The current Satisfactory Academic Progress standing of a student in a program, recomputed
 * after each final grade. Isolated: `agiutah_sap_status` collection.
 */
export interface IAgiUtahSapStatus {
  studentRef: string;
  programKey: string;
  state: SapState;
  gpa: number;
  pace: number;
  timeframePct: number;
  reasons: string[];
  evaluatedAt: Date;
}

export interface IAgiUtahSapStatusDocument extends IAgiUtahSapStatus, Document {}

const AgiUtahSapStatusSchema = new Schema<IAgiUtahSapStatusDocument>(
  {
    studentRef: { type: String, required: true },
    programKey: { type: String, required: true },
    state: { type: String, enum: ['good', 'warning', 'probation', 'dismissed'], required: true },
    gpa: { type: Number, required: true },
    pace: { type: Number, required: true },
    timeframePct: { type: Number, required: true },
    reasons: { type: [String], default: [] },
    evaluatedAt: { type: Date, required: true, default: () => new Date() },
  },
  { timestamps: true, collection: 'agiutah_sap_status' },
);

AgiUtahSapStatusSchema.index({ studentRef: 1, programKey: 1 }, { unique: true });

export const AgiUtahSapStatus: Model<IAgiUtahSapStatusDocument> =
  (mongoose.models.AgiUtahSapStatus as Model<IAgiUtahSapStatusDocument>) ||
  mongoose.model<IAgiUtahSapStatusDocument>('AgiUtahSapStatus', AgiUtahSapStatusSchema);
