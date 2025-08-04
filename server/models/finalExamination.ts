import mongoose, { Schema, Document } from 'mongoose';

export interface IFinalExamQuestion {
  text: string;
  choices: string[];
  correctIndex: number;
}

export interface IFinalExamination extends Document {
  courseSlug: string;
  title: string;
  description?: string;
  questions: IFinalExamQuestion[];
  passingScore: number; // Percentage required to pass (e.g., 70)
  maxAttempts: number; // Maximum number of attempts allowed (default: 3)
  isActive: boolean; // Whether the exam is currently available
  createdAt: Date;
  updatedAt: Date;
}

const FinalExaminationSchema = new Schema<IFinalExamination>({
  courseSlug: { 
    type: String, 
    required: true, 
    unique: true,
    index: true 
  },
  title: { 
    type: String, 
    required: true 
  },
  description: { 
    type: String 
  },
  questions: [{
    text: { 
      type: String, 
      required: true 
    },
    choices: [{ 
      type: String, 
      required: true 
    }],
    correctIndex: { 
      type: Number, 
      required: true 
    }
  }],
  passingScore: { 
    type: Number, 
    required: true,
    default: 70,
    min: 0,
    max: 100
  },
  maxAttempts: { 
    type: Number, 
    required: true,
    default: 3,
    min: 1
  },
  isActive: { 
    type: Boolean, 
    default: true 
  }
}, { timestamps: true });

export default mongoose.model<IFinalExamination>('FinalExamination', FinalExaminationSchema); 