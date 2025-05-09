// server/models/enrollment.ts
import { Schema, model, Types } from 'mongoose';

const QuizAttemptSchema = new Schema({
  moduleIndex: { type: Number, required: true },
  attemptDate: { type: Date, default: () => new Date() },
  score:       { type: Number, required: true }
}, { _id: false });

const EnrollmentSchema = new Schema({
  studentId:        { type: Types.ObjectId, ref: 'Student', required: true },
  courseSlug:       { type: String, ref: 'Course', required: true },
  enrollDate:       { type: Date, default: () => new Date() },
  validUntil:       { type: Date, required: true },
  completedModules: { type: [Number], default: [] },
  quizAttempts:     { type: [QuizAttemptSchema], default: [] }
}, { timestamps: true });

export const Enrollment = model('Enrollment', EnrollmentSchema);