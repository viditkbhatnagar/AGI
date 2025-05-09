import mongoose, { Schema, Document } from 'mongoose';

export interface ILiveClass {
  courseSlug: string;
  title: string;
  description?: string;
  meetLink: string;
  startTime: Date;
  endTime: Date;
  status: 'scheduled' | 'completed' | 'cancelled';
}

export interface ILiveClassDocument extends ILiveClass, Document {}

const LiveClassSchema = new Schema<ILiveClassDocument>({
  courseSlug: { 
    type: String, 
    required: true,
    index: true 
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
  }
}, { timestamps: true });

export const LiveClass = mongoose.model<ILiveClassDocument>('LiveClass', LiveClassSchema);
