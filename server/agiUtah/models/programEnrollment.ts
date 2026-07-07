import mongoose, { Schema, Document, Model } from 'mongoose';

/**
 * A student's enrollment in a program (a Certificate, Diploma, or MBA).
 *
 * `studentRef` is the student's id from the existing platform, stored as a plain string —
 * this module never joins to the existing `students` collection, keeping it isolated.
 *
 * Isolated: `agiutah_program_enrollments` collection.
 */
export interface IAgiUtahProgramEnrollment {
  studentRef: string;
  programKey: string;
  intakeKey: string;
  status: 'active' | 'completed' | 'withdrawn';
  startedAt: Date;
  completedAt?: Date;
}

export interface IAgiUtahProgramEnrollmentDocument extends IAgiUtahProgramEnrollment, Document {}

const AgiUtahProgramEnrollmentSchema = new Schema<IAgiUtahProgramEnrollmentDocument>(
  {
    studentRef: { type: String, required: true },
    programKey: { type: String, required: true },
    intakeKey: { type: String, required: true },
    status: { type: String, enum: ['active', 'completed', 'withdrawn'], default: 'active' },
    startedAt: { type: Date, required: true, default: () => new Date() },
    completedAt: { type: Date, required: false },
  },
  { timestamps: true, collection: 'agiutah_program_enrollments' },
);

AgiUtahProgramEnrollmentSchema.index({ studentRef: 1, programKey: 1 }, { unique: true });

export const AgiUtahProgramEnrollment: Model<IAgiUtahProgramEnrollmentDocument> =
  (mongoose.models.AgiUtahProgramEnrollment as Model<IAgiUtahProgramEnrollmentDocument>) ||
  mongoose.model<IAgiUtahProgramEnrollmentDocument>(
    'AgiUtahProgramEnrollment',
    AgiUtahProgramEnrollmentSchema,
  );
