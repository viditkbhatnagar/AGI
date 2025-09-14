import mongoose, { Schema, Document } from 'mongoose';

export interface IHybridDocument {
  title: string;
  type: 'link' | 'upload';
  // For link-based documents (backward compatibility)
  url?: string;
  // For uploaded documents (new functionality)
  fileUrl?: string;
  fileName?: string;
  fileSize?: number;
  fileType?: string;
  publicId?: string;
}

export interface IModule {
  toObject(): any;
  title: string;
  description?: string; // Optional module description
  videos: Array<{
    title: string;
    url: string;
    duration: number;
    videoId?: string; // YouTube video ID
  }>;
  documents: IHybridDocument[];
  quizId: string | null;
  // Legacy quiz properties for backward compatibility
  questions?: Array<{
    text: string;
    choices: string[];
    correctIndex: number;
    explanation?: string;
  }>;
  quizTitle?: string;
  quizDescription?: string;
}

interface ILiveClassConfig {
  enabled: boolean;
  frequency: 'weekly' | 'biweekly' | 'monthly';
  dayOfWeek: string;
  durationMin: number;
}

export interface ICourse {
  slug: string;
  title: string;
  type: 'standalone' | 'with-mba';
  description?: string;
  liveClassConfig: ILiveClassConfig;
  mbaModules: IModule[];
  modules: IModule[];
}

export interface ICourseDocument extends ICourse, Document {}

const CourseSchema = new Schema<ICourseDocument>({
  slug: { type: String, required: true, unique: true },
  title: { type: String, required: true },
  type: { type: String, enum: ['standalone', 'with-mba'], required: true },
  description: { type: String, default: "" },
  liveClassConfig: {
    enabled: { type: Boolean, default: false },
    frequency: { type: String, enum: ['weekly', 'biweekly', 'monthly'] },
    dayOfWeek: { type: String },
    durationMin: { type: Number }
  },
  mbaModules: [{
    title: { type: String, required: true },
    description: { type: String, default: "" }, // Optional module description
    videos: [{
      title: { type: String, required: false },
      url: { type: String, required: false },
      duration: { type: Number, required: false },
      videoId: { type: String }
    }],
    documents: [{
      title: { type: String, required: false },
      type: { type: String, enum: ['link', 'upload'], default: 'link' },
      // For link-based documents (backward compatibility)
      url: { type: String },
      // For uploaded documents (new functionality)
      fileUrl: { type: String },
      fileName: { type: String },
      fileSize: { type: Number },
      fileType: { type: String },
      publicId: { type: String }
    }],
    quizId: { type: String, default: null },
    // Legacy quiz properties for backward compatibility
    questions: [{
      text: { type: String },
      choices: [{ type: String }],
      correctIndex: { type: Number },
      explanation: { type: String }
    }],
    quizTitle: { type: String },
    quizDescription: { type: String }
  }],
  modules: [{
    title: { type: String, required: true },
    description: { type: String, default: "" }, // Optional module description
    videos: [{
      title: { type: String, required: false },
      url: { type: String, required: false },
      duration: { type: Number, required: false },
      videoId: { type: String }
    }],
    documents: [{
      title: { type: String, required: false },
      type: { type: String, enum: ['link', 'upload'], default: 'link' },
      // For link-based documents (backward compatibility)
      url: { type: String },
      // For uploaded documents (new functionality)
      fileUrl: { type: String },
      fileName: { type: String },
      fileSize: { type: Number },
      fileType: { type: String },
      publicId: { type: String }
    }],
    quizId: { type: String, default: null },
    // Legacy quiz properties for backward compatibility
    questions: [{
      text: { type: String },
      choices: [{ type: String }],
      correctIndex: { type: Number },
      explanation: { type: String }
    }],
    quizTitle: { type: String },
    quizDescription: { type: String }
  }]
}, { timestamps: true });

export const Course = mongoose.model<ICourseDocument>('Course', CourseSchema);
