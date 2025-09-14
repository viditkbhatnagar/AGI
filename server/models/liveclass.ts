import mongoose, { Schema, Document } from 'mongoose';

export interface ILiveClass {
  courseSlug: string;
  moduleIndex: number; // Index of the module this live class belongs to
  title: string;
  description?: string;
  meetLink: string;
  startTime: Date;
  endTime: Date;
  status: 'scheduled' | 'completed' | 'cancelled';
  studentIds: mongoose.Types.ObjectId[];
}

export interface ILiveClassDocument extends ILiveClass, Document {}

const LiveClassSchema = new Schema<ILiveClassDocument>({
  courseSlug: { 
    type: String, 
    required: true,
    index: true 
  },
  moduleIndex: { 
    type: Number, 
    required: true,
    default: 0 // Default to first module for backward compatibility
  },
  title: { 
    type: String, 
    required: true 
  },
  description: { 
    type: String 
  },
  meetLink: { 
    type: String, 
    required: true 
  },
  startTime: { 
    type: Date, 
    required: true,
    index: true 
  },
  endTime: { 
    type: Date, 
    required: true 
  },
  status: { 
    type: String, 
    enum: ['scheduled', 'completed', 'cancelled'],
    default: 'scheduled',
    required: true 
  },
  // Add this field to track which students are invited
  studentIds: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Student',
    required: true
  }]
}, { timestamps: true });

export const LiveClass = mongoose.model<ILiveClassDocument>('LiveClass', LiveClassSchema);
