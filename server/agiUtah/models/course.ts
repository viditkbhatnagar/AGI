import mongoose, { Schema, Document, Model } from 'mongoose';
import type { CourseStatus, ProctorPayer, Wave } from '../types';

/**
 * A course is the atomic, reusable unit. The same course is authored once and reused
 * across a Certificate, a Diploma, and the MBA (via CourseProgramLink).
 *
 * `creditsSCH` and `learningHours` are DATA loaded from the course map — never
 * hard-coded. The defaults reflect the current standard of 3 SCH / 135 h, but the
 * loaded value always wins, so a change in the course map flows through automatically.
 *
 * Isolated: `agiutah_courses` collection (NOT the existing `courses`), `AgiUtahCourse`
 * model name.
 */
export interface IAgiUtahCourse {
  /** Stable course code, e.g. 'CR01', 'FT01'. */
  code: string;
  title: string;
  /** US semester credit hours — data-driven. */
  creditsSCH: number;
  /** Total learning hours — data-driven. */
  learningHours: number;
  contactHours?: number;
  independentHours?: number;
  /** 'core' or a specialization key; identifies which track the course belongs to. */
  track: string;
  wave: Wave;
  featureFlagKey?: string;
  /** Whether this course has a proctored final. Toggle, data-driven, default off. */
  proctoredFinal: boolean;
  /** Who pays for the proctored final. Toggle, default 'none'. */
  proctorPayer: ProctorPayer;
  status: CourseStatus;
  /** Provenance: which course-map row produced this record. */
  sourceRowId?: string;
}

export interface IAgiUtahCourseDocument extends IAgiUtahCourse, Document {}

const AgiUtahCourseSchema = new Schema<IAgiUtahCourseDocument>(
  {
    code: { type: String, required: true, unique: true },
    title: { type: String, required: true },
    creditsSCH: { type: Number, required: true, default: 3 },
    learningHours: { type: Number, required: true, default: 135 },
    contactHours: { type: Number, required: false },
    independentHours: { type: Number, required: false },
    track: { type: String, required: true },
    wave: { type: Number, enum: [0, 1, 2, 3], required: true },
    featureFlagKey: { type: String, required: false },
    proctoredFinal: { type: Boolean, default: false },
    proctorPayer: { type: String, enum: ['agi', 'student', 'none'], default: 'none' },
    status: { type: String, enum: ['draft', 'active', 'parked'], default: 'draft' },
    sourceRowId: { type: String, required: false },
  },
  { timestamps: true, collection: 'agiutah_courses' },
);

export const AgiUtahCourse: Model<IAgiUtahCourseDocument> =
  (mongoose.models.AgiUtahCourse as Model<IAgiUtahCourseDocument>) ||
  mongoose.model<IAgiUtahCourseDocument>('AgiUtahCourse', AgiUtahCourseSchema);
