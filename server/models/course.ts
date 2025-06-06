import mongoose, { Schema, Document } from 'mongoose';

interface IModule {
  toObject(): any;
  title: string;
  videos: Array<{
    title: string;
    url: string;
    duration: number;
    videoId?: string; // YouTube video ID
  }>;
  documents: Array<{
    title: string;
    url: string;
  }>;
  quizId: string | null;
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
    videos: [{
      title: { type: String, required: true },
      url: { type: String, required: true },
      duration: { type: Number, required: true },
      videoId: { type: String }
    }],
    documents: [{
      title: { type: String, required: true },
      url: { type: String, required: true }
    }],
    quizId: { type: String, default: null }
  }],
  modules: [{
    title: { type: String, required: true },
    videos: [{
      title: { type: String, required: true },
      url: { type: String, required: true },
      duration: { type: Number, required: true },
      videoId: { type: String }
    }],
    documents: [{
      title: { type: String, required: true },
      url: { type: String, required: true }
    }],
    quizId: { type: String, default: null }
  }]
}, { timestamps: true });

export const Course = mongoose.model<ICourseDocument>('Course', CourseSchema);
