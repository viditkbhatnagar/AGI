import mongoose, { Schema, Document } from 'mongoose';

interface ISandboxModule {
  toObject(): any;
  title: string;
  description?: string; // Optional module description
  videos: Array<{
    title: string;
    url: string;
    duration: number;
    videoId?: string; // YouTube video ID
  }>;
  documents: Array<{
    title: string;
    fileUrl: string; // Cloudinary URL for uploaded files
    fileName: string;
    fileSize: number;
    fileType: string;
    publicId: string; // Cloudinary public ID for management
  }>;
  quiz: {
    questions: Array<{
      text: string;
      choices: string[];
      correctIndex: number;
    }>;
  };
  quizId: string | null;
}

interface ISandboxLiveClassConfig {
  enabled: boolean;
  frequency: 'weekly' | 'biweekly' | 'monthly';
  dayOfWeek: string;
  durationMin: number;
}

export interface ISandboxCourse {
  slug: string;
  title: string;
  type: 'standalone' | 'with-mba';
  description?: string;
  liveClassConfig: ISandboxLiveClassConfig;
  mbaModules: ISandboxModule[];
  modules: ISandboxModule[];
}

export interface ISandboxCourseDocument extends ISandboxCourse, Document {}

const SandboxCourseSchema = new Schema<ISandboxCourseDocument>({
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
      title: { type: String, required: true },
      url: { type: String, required: true },
      duration: { type: Number, required: true },
      videoId: { type: String }
    }],
    documents: [{
      title: { type: String, required: true },
      fileUrl: { type: String, required: true }, // Cloudinary URL
      fileName: { type: String, required: true },
      fileSize: { type: Number, required: true },
      fileType: { type: String, required: true },
      publicId: { type: String, required: true } // Cloudinary public ID
    }],
    quiz: {
      questions: [{
        text: { type: String, default: '' },
        choices: [{ type: String }],
        correctIndex: { type: Number, default: 0 }
      }]
    },
    quizId: { type: String, default: null }
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
      fileUrl: { type: String, required: false }, // Cloudinary URL
      fileName: { type: String, required: false },
      fileSize: { type: Number, required: false },
      fileType: { type: String, required: false },
      publicId: { type: String, required: false } // Cloudinary public ID
    }],
    quiz: {
      questions: [{
        text: { type: String, default: '' },
        choices: [{ type: String }],
        correctIndex: { type: Number, default: 0 }
      }]
    },
    quizId: { type: String, default: null }
  }]
}, { timestamps: true });

export const SandboxCourse = mongoose.model<ISandboxCourseDocument>('SandboxCourse', SandboxCourseSchema);
