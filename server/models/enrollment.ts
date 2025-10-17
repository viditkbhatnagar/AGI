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
  feedback?: string; // Teacher/Admin feedback for this attempt (max 2000 chars)
}

interface ICertificate {
  certificateId: string; // Certifier.io certificate ID
  certificateUrl: string; // Direct URL to view certificate
  issuedAt: Date; // When certificate was issued
  issuedBy: string; // Who triggered the issuance (teacher/admin username)
  courseSlug: string; // Course for which certificate was issued
  courseName: string; // Course title at time of issuance
  studentName: string; // Student name at time of issuance
  studentEmail: string; // Student email at time of issuance
  finalScore: number; // Final exam score that earned the certificate
  attemptNumber: number; // Which exam attempt earned the certificate
  certifierGroupId: string; // Certifier.io group ID used
  status: 'issued' | 'revoked' | 'expired' | 'superseded'; // Certificate status
  metadata?: { // Additional certificate data from Certifier.io
    templateId?: string;
    verificationUrl?: string;
    expiresAt?: Date;
  };
}

export interface IEnrollment {
  studentId: mongoose.Types.ObjectId;
  courseSlug: string;
  enrollDate: Date;
  validUntil: Date;
  completedModules: ICompletedModule[];
  quizAttempts: IQuizAttempt[];
  finalExamAttempts: IFinalExamAttempt[];
  certificates: ICertificate[]; // Digital certificates issued for this enrollment
  certificateIssuance?: {
    online: boolean; // Admin has issued certificate online via Certifier.io
    offline: boolean; // Admin has sent physical certificate
    updatedAt?: Date; // When issuance status was last updated
    updatedBy?: string; // Admin who updated the status
  };
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
    gradedAt: { type: Date },
    feedback: { type: String, maxlength: 2000 } // Teacher/Admin feedback (max 2000 chars)
  }],
  
  certificates: [{
    certificateId: { type: String, required: true }, // Certifier.io certificate ID
    certificateUrl: { type: String, required: true }, // Direct URL to view certificate
    issuedAt: { type: Date, required: true, default: Date.now }, // When certificate was issued
    issuedBy: { type: String, required: true }, // Who triggered the issuance
    courseSlug: { type: String, required: true }, // Course for which certificate was issued
    courseName: { type: String, required: true }, // Course title at time of issuance
    studentName: { type: String, required: true }, // Student name at time of issuance
    studentEmail: { type: String, required: true }, // Student email at time of issuance
    finalScore: { type: Number, required: true }, // Final exam score that earned the certificate
    attemptNumber: { type: Number, required: true }, // Which exam attempt earned the certificate
    certifierGroupId: { type: String, required: true }, // Certifier.io group ID used
    status: { 
      type: String, 
      enum: ['issued', 'revoked', 'expired', 'superseded'], 
      default: 'issued' 
    }, // Certificate status
    metadata: { // Additional certificate data from Certifier.io
      templateId: { type: String },
      verificationUrl: { type: String },
      expiresAt: { type: Date }
    }
  }],
  certificateIssuance: {
    online: { type: Boolean, default: false },
    offline: { type: Boolean, default: false },
    updatedAt: { type: Date },
    updatedBy: { type: String }
  }
}, { timestamps: true });

// Create a compound index to ensure a student can only enroll in a course once
EnrollmentSchema.index({ studentId: 1, courseSlug: 1 }, { unique: true });

export const Enrollment = mongoose.model<IEnrollmentDocument>('Enrollment', EnrollmentSchema);
