import mongoose, { Schema, Document } from 'mongoose';

export interface IRecording {
  courseSlug: string;
  classDate: Date; // Date the class was taught
  title: string;
  description?: string;
  fileUrl: string; // Google Drive link
  uploadedBy: mongoose.Types.ObjectId;
  uploadedAt: Date;
  isVisible: boolean;
}

export interface IRecordingDocument extends IRecording, Document {}

const RecordingSchema = new Schema<IRecordingDocument>({
  courseSlug: { 
    type: String, 
    required: true,
    index: true 
  },
  classDate: {
    type: Date,
    required: true
  },
  title: { 
    type: String, 
    required: true 
  },
  description: { 
    type: String 
  },
  fileUrl: { 
    type: String, 
    required: true 
  },
  uploadedBy: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  uploadedAt: { 
    type: Date, 
    default: Date.now,
    required: true 
  },
  isVisible: { 
    type: Boolean, 
    default: true,
    required: true 
  }
}, { timestamps: true });

// Create compound index for better query performance
RecordingSchema.index({ courseSlug: 1, classDate: 1 });
RecordingSchema.index({ uploadedBy: 1 });

export const Recording = mongoose.model<IRecordingDocument>('Recording', RecordingSchema); 