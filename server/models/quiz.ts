import mongoose, { Schema, Document } from 'mongoose';

interface IQuizQuestion {
  prompt: string;
  options: string[];
  correctIndex: number;
}

export interface IQuiz extends Document {
  courseSlug: string;      // the course this quiz belongs to
  moduleIndex: number;     // which module this quiz is for
  questions: IQuizQuestion[];
}

const QuizSchema = new Schema<IQuiz>(
  {
    courseSlug: { type: String, required: true },
    moduleIndex: { type: Number, required: true },
    questions: [
      {
        prompt: { type: String, required: true },
        options: [{ type: String, required: true }],
        correctIndex: { type: Number, required: true },
      }
    ]
  },
  { timestamps: true }
);

export default mongoose.model<IQuiz>('Quiz', QuizSchema);