import mongoose, { Schema, Document } from 'mongoose';

interface IWatchTime {
  date: Date;
  moduleIndex: number;
  videoIndex: number;
  duration: number; // in seconds
}

interface INotifySetting {
  email: boolean;
  sms: boolean;
}

export interface IStudent {
  name: string;
  phone: string;
  address: string;
  dob: Date;
  pathway: 'standalone' | 'with-mba';
  userId: mongoose.Types.ObjectId; // Reference to User model
  eventLogs: Array<{
    type: string;
    message: string;
    timestamp: Date;
  }>;
  reminders: Array<{
    title: string;
    description: string;
    dueDate: Date;
    completed: boolean;
  }>;
  notifySettings: {
    courseProgress: INotifySetting;
    quizSummary: INotifySetting;
    certificateReady: INotifySetting;
  };
  watchTime: IWatchTime[];
  enrollment: mongoose.Types.ObjectId;
}

export interface IStudentDocument extends IStudent, Document {}

const StudentSchema = new Schema<IStudentDocument>({
  name: { 
    type: String, 
    required: true 
  },
  phone: { 
    type: String 
  },
  address: { 
    type: String, 
    default: '' 
  },
  dob: { 
    type: Date 
  },
  pathway: { 
    type: String, 
    enum: ['standalone', 'with-mba'], 
    required: true 
  },
  userId: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  eventLogs: [{
    type: { type: String, required: true },
    message: { type: String, required: true },
    timestamp: { type: Date, default: Date.now }
  }],
  reminders: [{
    title: { type: String, required: true },
    description: { type: String },
    dueDate: { type: Date, required: true },
    completed: { type: Boolean, default: false }
  }],
  notifySettings: {
    courseProgress: {
      email: { type: Boolean, default: true },
      sms: { type: Boolean, default: false }
    },
    quizSummary: {
      email: { type: Boolean, default: true },
      sms: { type: Boolean, default: false }
    },
    certificateReady: {
      email: { type: Boolean, default: true },
      sms: { type: Boolean, default: true }
    }
  },
  watchTime: [{
    date: { type: Date, default: Date.now },
    moduleIndex: { type: Number, required: true },
    videoIndex: { type: Number, required: true },
    duration: { type: Number, required: true }
  }],
  enrollment: {
    type: Schema.Types.ObjectId,
    ref: 'Enrollment'
  }
}, { timestamps: true });

export const Student = mongoose.model<IStudentDocument>('Student', StudentSchema);
