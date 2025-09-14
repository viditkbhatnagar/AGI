import mongoose, { Schema, Document } from 'mongoose';

export interface Question {
  text: string;
  // you can support multiple choice, true/false, etc
  choices: string[];
  correctIndex: number;
}
// interface IQuizQuestion {
//   prompt: string;
//   options: string[];
//   correctIndex: number;
// }

export interface IQuiz extends Document {
  courseSlug: string;      // the course this quiz belongs to
  moduleIndex: number;     // which module this quiz is for
  questions: Question[];
  isSandbox?: boolean;     // flag to identify sandbox course quizzes
}

const QuizSchema = new Schema<IQuiz>({
  courseSlug:  { type: String, required: true, index: true },
  moduleIndex: { type: Number, required: true, index: true },
  questions: [
    {
      text:         { type: String, required: true },
      choices:      [{ type: String, required: true }],
      correctIndex: { type: Number, required: true },
    }
  ],
  isSandbox: { type: Boolean, default: false }
});

export default mongoose.model<IQuiz>('Quiz', QuizSchema);