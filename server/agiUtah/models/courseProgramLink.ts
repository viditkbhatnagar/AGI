import mongoose, { Schema, Document, Model } from 'mongoose';
import type { CourseRole } from '../types';

/**
 * The many-to-many link that lets one course be reused across many programs.
 *
 * Each link records the course's role *within that program* (a core course may be a
 * plain 'core' in the MBA but the 'gateway' of a diploma) and its position in sequence.
 * Links reference business keys (courseCode / programKey) so they stay stable across
 * idempotent re-imports of the course map.
 *
 * Isolated: `agiutah_course_program_links` collection.
 */
export interface IAgiUtahCourseProgramLink {
  courseCode: string;
  programKey: string;
  role: CourseRole;
  /** 1-based order of the course within the program, when ordered. */
  sequenceIndex?: number;
  /** True when this course is the gateway that must be completed to start the specialization. */
  isGateway: boolean;
  required: boolean;
}

export interface IAgiUtahCourseProgramLinkDocument extends IAgiUtahCourseProgramLink, Document {}

const AgiUtahCourseProgramLinkSchema = new Schema<IAgiUtahCourseProgramLinkDocument>(
  {
    courseCode: { type: String, required: true },
    programKey: { type: String, required: true },
    role: {
      type: String,
      enum: ['core', 'gateway', 'entry', 'concentration', 'capstone'],
      required: true,
    },
    sequenceIndex: { type: Number, required: false },
    isGateway: { type: Boolean, default: false },
    required: { type: Boolean, default: true },
  },
  { timestamps: true, collection: 'agiutah_course_program_links' },
);

// A course appears at most once per program.
AgiUtahCourseProgramLinkSchema.index({ courseCode: 1, programKey: 1 }, { unique: true });

export const AgiUtahCourseProgramLink: Model<IAgiUtahCourseProgramLinkDocument> =
  (mongoose.models.AgiUtahCourseProgramLink as Model<IAgiUtahCourseProgramLinkDocument>) ||
  mongoose.model<IAgiUtahCourseProgramLinkDocument>(
    'AgiUtahCourseProgramLink',
    AgiUtahCourseProgramLinkSchema,
  );
