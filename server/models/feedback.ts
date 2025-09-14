import mongoose, { Schema, Document } from 'mongoose';

interface ITeacherRating {
  teacherId: string;
  teacherName: string;
  rating: number; // 1-5 stars
}

export interface IFeedback {
  studentId: string;
  studentName: string;
  studentEmail: string;
  studentPhone: string;
  courseSlug: string; // Specific course this feedback is for
  courseName: string;
  overallRating: number; // 1-5 stars for overall course
  contentRating: number; // 1-5 stars for course content
  teacherRatings: ITeacherRating[]; // Ratings for teachers in this specific course
  feedbackText: string; // Max 2000 words - feedback specific to this course
  submittedAt: Date;
  isCompleted: boolean; // Flag to check if feedback is complete
}

export interface IFeedbackDocument extends IFeedback, Document {}

const TeacherRatingSchema = new Schema({
  teacherId: { type: String, required: true },
  teacherName: { type: String, required: true },
  rating: { type: Number, required: true, min: 1, max: 5 }
});

const FeedbackSchema = new Schema<IFeedbackDocument>({
  studentId: { type: String, required: true },
  studentName: { type: String, required: true },
  studentEmail: { type: String, required: true },
  studentPhone: { type: String, required: true },
  courseSlug: { type: String, required: true }, // Specific course
  courseName: { type: String, required: true },
  overallRating: { type: Number, required: true, min: 1, max: 5 },
  contentRating: { type: Number, required: true, min: 1, max: 5 },
  teacherRatings: [TeacherRatingSchema],
  feedbackText: { 
    type: String, 
    required: true, 
    maxlength: 2000,
    validate: {
      validator: function(text: string) {
        // Count words (simple word count by spaces)
        const wordCount = text.trim().split(/\s+/).filter(word => word.length > 0).length;
        return wordCount <= 2000;
      },
      message: 'Feedback cannot exceed 2000 words'
    }
  },
  submittedAt: { type: Date, default: Date.now },
  isCompleted: { type: Boolean, default: true }
}, { 
  timestamps: true,
  collection: 'feedbacks'
});

// Composite index - one feedback per student per course
FeedbackSchema.index({ studentId: 1, courseSlug: 1 }, { unique: true });
FeedbackSchema.index({ submittedAt: -1 });
FeedbackSchema.index({ courseSlug: 1 });

export const Feedback = mongoose.model<IFeedbackDocument>('Feedback', FeedbackSchema);
