import mongoose, { Schema, Document, Model } from 'mongoose';

/**
 * A student's assignment submission for a course, with optional originality signals
 * (Turnitin: similarity + AI-writing scores are a signal, not proof) and the faculty grade.
 * Isolated: `agiutah_submissions` collection.
 */
export interface IAgiUtahSubmission {
  studentRef: string;
  courseCode: string;
  intakeKey: string;
  fileRef?: string;
  submittedAt: Date;
  similarityScore?: number;
  aiWritingScore?: number;
  gradeLetter?: string;
  gradedByRef?: string;
  gradedAt?: Date;
}

export interface IAgiUtahSubmissionDocument extends IAgiUtahSubmission, Document {}

const AgiUtahSubmissionSchema = new Schema<IAgiUtahSubmissionDocument>(
  {
    studentRef: { type: String, required: true },
    courseCode: { type: String, required: true },
    intakeKey: { type: String, required: true },
    fileRef: { type: String, required: false },
    submittedAt: { type: Date, required: true, default: () => new Date() },
    similarityScore: { type: Number, required: false },
    aiWritingScore: { type: Number, required: false },
    gradeLetter: { type: String, required: false },
    gradedByRef: { type: String, required: false },
    gradedAt: { type: Date, required: false },
  },
  { timestamps: true, collection: 'agiutah_submissions' },
);

export const AgiUtahSubmission: Model<IAgiUtahSubmissionDocument> =
  (mongoose.models.AgiUtahSubmission as Model<IAgiUtahSubmissionDocument>) ||
  mongoose.model<IAgiUtahSubmissionDocument>('AgiUtahSubmission', AgiUtahSubmissionSchema);
