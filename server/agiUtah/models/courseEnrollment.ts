import mongoose, { Schema, Document, Model } from 'mongoose';

/**
 * A student's enrollment in one course (one attempt of it). A retake creates a new
 * attempt with a higher `attemptNo`; both attempts persist so both appear on the
 * transcript, while GPA uses the latest attempt (Logan's confirmed rule).
 *
 * Isolated: `agiutah_course_enrollments` collection.
 */
export interface IAgiUtahCourseEnrollment {
  studentRef: string;
  courseCode: string;
  intakeKey: string;
  monthIndex: number;
  attemptNo: number;
  status: 'enrolled' | 'in_progress' | 'passed' | 'failed' | 'withdrawn';
  gradeLetter?: string;
  gradePoint?: number;
  enrolledAt: Date;
  completedAt?: Date;
}

export interface IAgiUtahCourseEnrollmentDocument extends IAgiUtahCourseEnrollment, Document {}

const AgiUtahCourseEnrollmentSchema = new Schema<IAgiUtahCourseEnrollmentDocument>(
  {
    studentRef: { type: String, required: true },
    courseCode: { type: String, required: true },
    intakeKey: { type: String, required: true },
    monthIndex: { type: Number, required: true, min: 1 },
    attemptNo: { type: Number, required: true, default: 1, min: 1 },
    status: {
      type: String,
      enum: ['enrolled', 'in_progress', 'passed', 'failed', 'withdrawn'],
      default: 'enrolled',
    },
    gradeLetter: { type: String, required: false },
    gradePoint: { type: Number, required: false },
    enrolledAt: { type: Date, required: true, default: () => new Date() },
    completedAt: { type: Date, required: false },
  },
  { timestamps: true, collection: 'agiutah_course_enrollments' },
);

AgiUtahCourseEnrollmentSchema.index({ studentRef: 1, courseCode: 1, attemptNo: 1 }, { unique: true });

export const AgiUtahCourseEnrollment: Model<IAgiUtahCourseEnrollmentDocument> =
  (mongoose.models.AgiUtahCourseEnrollment as Model<IAgiUtahCourseEnrollmentDocument>) ||
  mongoose.model<IAgiUtahCourseEnrollmentDocument>(
    'AgiUtahCourseEnrollment',
    AgiUtahCourseEnrollmentSchema,
  );
