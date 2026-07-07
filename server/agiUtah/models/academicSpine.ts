import mongoose, { Schema, Document, Model } from 'mongoose';

/**
 * The academic spine: the fixed order in which the 12 core courses are delivered
 * (one per month). It stores only the ORDER — a concrete calendar (start year/month)
 * is layered on top by the scheduler in a later phase.
 *
 * Isolated: `agiutah_academic_spines` collection, `AgiUtahAcademicSpine` model name.
 */
export interface IAgiUtahSpineSlot {
  monthIndex: number;
  coreCourseCode: string;
}

export interface IAgiUtahAcademicSpine {
  /** Stable key, e.g. 'core-v2'. */
  key: string;
  label: string;
  slots: IAgiUtahSpineSlot[];
}

export interface IAgiUtahAcademicSpineDocument extends IAgiUtahAcademicSpine, Document {}

const SpineSlotSchema = new Schema<IAgiUtahSpineSlot>(
  {
    monthIndex: { type: Number, required: true, min: 1, max: 12 },
    coreCourseCode: { type: String, required: true },
  },
  { _id: false },
);

const AgiUtahAcademicSpineSchema = new Schema<IAgiUtahAcademicSpineDocument>(
  {
    key: { type: String, required: true, unique: true },
    label: { type: String, required: true },
    slots: { type: [SpineSlotSchema], default: [] },
  },
  { timestamps: true, collection: 'agiutah_academic_spines' },
);

export const AgiUtahAcademicSpine: Model<IAgiUtahAcademicSpineDocument> =
  (mongoose.models.AgiUtahAcademicSpine as Model<IAgiUtahAcademicSpineDocument>) ||
  mongoose.model<IAgiUtahAcademicSpineDocument>('AgiUtahAcademicSpine', AgiUtahAcademicSpineSchema);
