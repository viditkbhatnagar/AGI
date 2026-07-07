import mongoose, { Schema, Document, Model } from 'mongoose';

/**
 * A record that a student satisfied a live session — either by attending live or by
 * watching the recording. These feed the contact-hour / RSI ledger later (live lectures
 * are first-class contact). A student has at most one record per session.
 *
 * Isolated: `agiutah_attendance` collection.
 */
export interface IAgiUtahAttendance {
  studentRef: string;
  intakeKey: string;
  courseCode: string;
  weekIndex: number;
  present: boolean;
  source: 'live' | 'recording' | 'manual';
  recordedAt: Date;
}

export interface IAgiUtahAttendanceDocument extends IAgiUtahAttendance, Document {}

const AgiUtahAttendanceSchema = new Schema<IAgiUtahAttendanceDocument>(
  {
    studentRef: { type: String, required: true },
    intakeKey: { type: String, required: true },
    courseCode: { type: String, required: true },
    weekIndex: { type: Number, required: true, min: 1 },
    present: { type: Boolean, required: true, default: true },
    source: { type: String, enum: ['live', 'recording', 'manual'], required: true },
    recordedAt: { type: Date, required: true, default: () => new Date() },
  },
  { timestamps: true, collection: 'agiutah_attendance' },
);

AgiUtahAttendanceSchema.index(
  { studentRef: 1, intakeKey: 1, courseCode: 1, weekIndex: 1 },
  { unique: true },
);

export const AgiUtahAttendance: Model<IAgiUtahAttendanceDocument> =
  (mongoose.models.AgiUtahAttendance as Model<IAgiUtahAttendanceDocument>) ||
  mongoose.model<IAgiUtahAttendanceDocument>('AgiUtahAttendance', AgiUtahAttendanceSchema);
