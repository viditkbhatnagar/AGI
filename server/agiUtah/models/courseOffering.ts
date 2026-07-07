import mongoose, { Schema, Document, Model } from 'mongoose';

/**
 * A course offering is a concrete run of one course within one intake month. It carries
 * the Week-1-only enrollment window: `enrollmentOpensAt` / `enrollmentClosesAt`. Students
 * may only enroll while that window is open (Logan: no mid-course starts).
 *
 * Isolated: `agiutah_course_offerings` collection.
 */
export interface IAgiUtahCourseOffering {
  intakeKey: string;
  courseCode: string;
  /** 1-based program month within the spine. */
  monthIndex: number;
  calendarYear: number;
  calendarMonth: number;
  enrollmentOpensAt: Date;
  enrollmentClosesAt: Date;
  status: 'scheduled' | 'open' | 'closed';
}

export interface IAgiUtahCourseOfferingDocument extends IAgiUtahCourseOffering, Document {}

const AgiUtahCourseOfferingSchema = new Schema<IAgiUtahCourseOfferingDocument>(
  {
    intakeKey: { type: String, required: true },
    courseCode: { type: String, required: true },
    monthIndex: { type: Number, required: true, min: 1 },
    calendarYear: { type: Number, required: true },
    calendarMonth: { type: Number, required: true, min: 1, max: 12 },
    enrollmentOpensAt: { type: Date, required: true },
    enrollmentClosesAt: { type: Date, required: true },
    status: { type: String, enum: ['scheduled', 'open', 'closed'], default: 'scheduled' },
  },
  { timestamps: true, collection: 'agiutah_course_offerings' },
);

AgiUtahCourseOfferingSchema.index({ intakeKey: 1, courseCode: 1 }, { unique: true });

export const AgiUtahCourseOffering: Model<IAgiUtahCourseOfferingDocument> =
  (mongoose.models.AgiUtahCourseOffering as Model<IAgiUtahCourseOfferingDocument>) ||
  mongoose.model<IAgiUtahCourseOfferingDocument>('AgiUtahCourseOffering', AgiUtahCourseOfferingSchema);
