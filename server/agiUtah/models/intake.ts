import mongoose, { Schema, Document, Model } from 'mongoose';

/**
 * An intake is a concrete run of the academic spine: it anchors the 12-month core order
 * to a real start (year + month). The scheduler expands an intake into monthly course
 * offerings and weekly live sessions.
 *
 * Isolated: `agiutah_intakes` collection, `AgiUtahIntake` model name.
 */
export interface IAgiUtahIntake {
  /** Stable key, e.g. 'sep-2026'. */
  key: string;
  /** Which spine order this intake follows (see AgiUtahAcademicSpine). */
  spineKey: string;
  label: string;
  startYear: number;
  /** 1–12; the calendar month that program-month M1 falls in. */
  startMonth: number;
  active: boolean;
}

export interface IAgiUtahIntakeDocument extends IAgiUtahIntake, Document {}

const AgiUtahIntakeSchema = new Schema<IAgiUtahIntakeDocument>(
  {
    key: { type: String, required: true, unique: true },
    spineKey: { type: String, required: true },
    label: { type: String, required: true },
    startYear: { type: Number, required: true },
    startMonth: { type: Number, required: true, min: 1, max: 12 },
    active: { type: Boolean, default: false },
  },
  { timestamps: true, collection: 'agiutah_intakes' },
);

export const AgiUtahIntake: Model<IAgiUtahIntakeDocument> =
  (mongoose.models.AgiUtahIntake as Model<IAgiUtahIntakeDocument>) ||
  mongoose.model<IAgiUtahIntakeDocument>('AgiUtahIntake', AgiUtahIntakeSchema);
