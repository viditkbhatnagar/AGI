import mongoose from 'mongoose';

const QuizQuestionSchema = new mongoose.Schema({
  id: {
    type: String,
    required: true
  },
  question: {
    type: String,
    required: true
  },
  options: {
    A: { type: String, required: true },
    B: { type: String, required: true },
    C: { type: String, required: true },
    D: { type: String, required: true }
  },
  correctAnswer: {
    type: String,
    enum: ['A', 'B', 'C', 'D'],
    required: true
  },
  explanation: {
    type: String
  }
}, { _id: false });

const QuizRepositorySchema = new mongoose.Schema({
  title: {
    type: String,
    required: true
  },
  description: {
    type: String
  },
  documentUrl: {
    type: String,
    required: true
  },
  documentType: {
    type: String,
    required: true
  },
  fileName: {
    type: String,
    required: true
  },
  publicId: {
    type: String,
    required: false // Optional for backward compatibility
  },
  questions: [QuizQuestionSchema],
  originCourse: {
    type: String,
    ref: 'Course'
  },
  originModule: {
    type: Number
  },
  createdBy: {
    type: String,
    required: true
  },
  extractionStatus: {
    type: String,
    enum: ['pending', 'processing', 'completed', 'failed'],
    default: 'pending'
  },
  extractionError: {
    type: String
  },
  tags: [{
    type: String
  }],
  difficulty: {
    type: String,
    enum: ['easy', 'medium', 'hard'],
    default: 'medium'
  },
  estimatedTime: {
    type: Number, // in minutes
    default: 10
  }
}, {
  timestamps: true
});

// Indexes for efficient querying
QuizRepositorySchema.index({ createdBy: 1 });
QuizRepositorySchema.index({ originCourse: 1, originModule: 1 });
QuizRepositorySchema.index({ extractionStatus: 1 });
QuizRepositorySchema.index({ title: 'text', description: 'text' });

export const QuizRepository = mongoose.model('QuizRepository', QuizRepositorySchema);