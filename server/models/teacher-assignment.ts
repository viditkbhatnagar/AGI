import { Schema, model, Document } from 'mongoose';

export interface ITeacherAssignment {
  teacherId: Schema.Types.ObjectId;
  courseSlug: string;
  assignedAt: Date;
  assignedBy: Schema.Types.ObjectId; // Admin who made the assignment
}

export interface ITeacherAssignmentDocument extends ITeacherAssignment, Document {}

const TeacherAssignmentSchema = new Schema<ITeacherAssignmentDocument>({
  teacherId: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  courseSlug: {
    type: String,
    required: true
  },
  assignedAt: {
    type: Date,
    default: Date.now
  },
  assignedBy: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: true
  }
}, { timestamps: true });

// Create compound index to prevent duplicate assignments
TeacherAssignmentSchema.index({ teacherId: 1, courseSlug: 1 }, { unique: true });

export const TeacherAssignment = model<ITeacherAssignmentDocument>('TeacherAssignment', TeacherAssignmentSchema);