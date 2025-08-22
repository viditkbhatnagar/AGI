import mongoose, { Schema, Document } from 'mongoose';

export interface IFinalExamMCQQuestion {
  type: 'mcq';
  text: string;
  choices: string[];
  correctIndex: number;
}

export interface IFinalExamEssayQuestion {
  type: 'essay';
  questionDocument: {
    title: string;
    url: string;
    type: 'word' | 'pdf' | 'ppt' | 'image' | 'excel' | 'csv' | 'textbox';
    fileName: string;
  };
  allowedAnswerFormats: ('word' | 'powerpoint' | 'pdf' | 'excel' | 'csv' | 'image')[];
}

export type IFinalExamQuestion = IFinalExamMCQQuestion | IFinalExamEssayQuestion;

export interface IFinalExamination extends Document {
  courseSlug: string;
  title: string;
  description?: string;
  questions: IFinalExamQuestion[];
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
    type: {
      type: String,
      enum: ['mcq', 'essay'],
      required: true
    },
    // MCQ specific fields
    text: { 
      type: String
    },
    choices: [{ 
      type: String 
    }],
    correctIndex: { 
      type: Number
    },
    // Essay specific fields
    questionDocument: {
      title: { type: String },
      url: { type: String },
      type: { 
        type: String, 
        enum: ['word', 'pdf', 'ppt', 'image', 'excel', 'csv', 'textbox'] 
      },
      fileName: { type: String }
    },
    allowedAnswerFormats: [{
      type: String,
      enum: ['word', 'powerpoint', 'pdf', 'excel', 'csv', 'image']
    }]
  }]
}, { timestamps: true });

export default mongoose.model<IFinalExamination>('FinalExamination', FinalExaminationSchema); 