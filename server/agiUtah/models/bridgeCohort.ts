import mongoose, { Schema, Document, Model } from 'mongoose';

/**
 * A contingency "bridge" intake that activates only when a student is stranded mid-
 * specialization (fail/withdraw or LOA return after the capstone closed). It runs only if at
 * least one stranded student needs it, so it adds no standing cost. Isolated:
 * `agiutah_bridge_cohorts` collection.
 */
export interface IAgiUtahBridgeCohort {
  track: string;
  regularWindowLabel: string;
  triggerCondition: string;
  bridgeWindowOpensAt?: Date;
  activated: boolean;
}

export interface IAgiUtahBridgeCohortDocument extends IAgiUtahBridgeCohort, Document {}

const AgiUtahBridgeCohortSchema = new Schema<IAgiUtahBridgeCohortDocument>(
  {
    track: { type: String, required: true },
    regularWindowLabel: { type: String, required: true },
    triggerCondition: { type: String, required: true },
    bridgeWindowOpensAt: { type: Date, required: false },
    activated: { type: Boolean, default: false },
  },
  { timestamps: true, collection: 'agiutah_bridge_cohorts' },
);

export const AgiUtahBridgeCohort: Model<IAgiUtahBridgeCohortDocument> =
  (mongoose.models.AgiUtahBridgeCohort as Model<IAgiUtahBridgeCohortDocument>) ||
  mongoose.model<IAgiUtahBridgeCohortDocument>('AgiUtahBridgeCohort', AgiUtahBridgeCohortSchema);
