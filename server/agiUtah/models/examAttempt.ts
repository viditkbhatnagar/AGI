import mongoose, { Schema, Document, Model } from 'mongoose';

/**
 * A final-exam attempt. When the course requires a proctored final, the grade is HELD until
 * proctoring passes and the ID matches; flagged/failed attempts route to registrar review.
 * Proctoring is gov-ID + lockdown + webcam stills only — no AI behavioral proctoring.
 *
 * Isolated: `agiutah_exam_attempts` collection.
 */
export interface IAgiUtahExamAttempt {
  studentRef: string;
  courseCode: string;
  intakeKey: string;
  proctored: boolean;
  proctoringResult: 'not_required' | 'pending' | 'passed' | 'flagged' | 'failed';
  idMatch?: boolean;
  score?: number;
  gradeReleased: boolean;
  attemptedAt: Date;
}

export interface IAgiUtahExamAttemptDocument extends IAgiUtahExamAttempt, Document {}

const AgiUtahExamAttemptSchema = new Schema<IAgiUtahExamAttemptDocument>(
  {
    studentRef: { type: String, required: true },
    courseCode: { type: String, required: true },
    intakeKey: { type: String, required: true },
    proctored: { type: Boolean, required: true, default: false },
    proctoringResult: {
      type: String,
      enum: ['not_required', 'pending', 'passed', 'flagged', 'failed'],
      default: 'not_required',
    },
    idMatch: { type: Boolean, required: false },
    score: { type: Number, required: false },
    gradeReleased: { type: Boolean, default: false },
    attemptedAt: { type: Date, required: true, default: () => new Date() },
  },
  { timestamps: true, collection: 'agiutah_exam_attempts' },
);

export const AgiUtahExamAttempt: Model<IAgiUtahExamAttemptDocument> =
  (mongoose.models.AgiUtahExamAttempt as Model<IAgiUtahExamAttemptDocument>) ||
  mongoose.model<IAgiUtahExamAttemptDocument>('AgiUtahExamAttempt', AgiUtahExamAttemptSchema);
