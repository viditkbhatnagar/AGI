import mongoose, { Schema, Document } from 'mongoose';

interface ICompletedModule {
  moduleIndex: number;
  completed: boolean;
  completedAt: Date;
}

interface IQuizAttempt {
  quizId: string;
  moduleIndex: number;
  score: number;
  maxScore: number;
  attemptedAt: Date;
  passed: boolean;
}

interface IFinalExamAttempt {
  examId: string;
  score?: number;
  maxScore: number;
  attemptedAt: Date;
  passed?: boolean;
  attemptNumber: number;
  requiresManualGrading?: boolean;
  answers?: any[];
  gradedBy?: string;
  gradedAt?: Date;
}

export interface IEnrollment {
  studentId: mongoose.Types.ObjectId;
  courseSlug: string;
  enrollDate: Date;
  validUntil: Date;
  completedModules: ICompletedModule[];
  quizAttempts: IQuizAttempt[];
  finalExamAttempts: IFinalExamAttempt[];
}

export interface IEnrollmentDocument extends IEnrollment, Document {}

const EnrollmentSchema = new Schema<IEnrollmentDocument>({
  studentId: { 
    type: Schema.Types.ObjectId, 
    ref: 'Student',
    required: true 
  },
  courseSlug: { 
    type: String, 
    required: true 
  },
  enrollDate: { 
    type: Date, 
    required: true, 
    default: Date.now 
  },
  validUntil: { 
    type: Date, 
    required: true 
  },
  completedModules: [{
    moduleIndex: { type: Number, required: true },
    completed: { type: Boolean, default: false },
    completedAt: { type: Date }
  }],
  
  quizAttempts: [{
    quizId: { type: String, required: true },
    moduleIndex: { type: Number},
    score: { type: Number, required: true },
    maxScore: { type: Number, required: true },
    attemptedAt: { type: Date, default: Date.now },
    passed: { type: Boolean, required: true }
  }],
  
  finalExamAttempts: [{
    examId: { type: String, required: true },
    score: { type: Number },
    maxScore: { type: Number, required: true },
    attemptedAt: { type: Date, default: Date.now },
    passed: { type: Boolean },
    attemptNumber: { type: Number, required: true },
    requiresManualGrading: { type: Boolean, default: false },
    answers: [{ type: Schema.Types.Mixed }],
    gradedBy: { type: String },
    gradedAt: { type: Date }
  }]
}, { timestamps: true });

// Create a compound index to ensure a student can only enroll in a course once
EnrollmentSchema.index({ studentId: 1, courseSlug: 1 }, { unique: true });

export const Enrollment = mongoose.model<IEnrollmentDocument>('Enrollment', EnrollmentSchema);
