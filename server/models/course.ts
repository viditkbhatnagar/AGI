import mongoose, { Schema, Document } from 'mongoose';

interface IModule {
  title: string;
  videos: Array<{
    title: string;
    url: string;
    duration: number;
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
  liveClassConfig: ILiveClassConfig;
  mbaModules: IModule[];
  modules: IModule[];
}

export interface ICourseDocument extends ICourse, Document {}

const CourseSchema = new Schema<ICourseDocument>({
  slug: { type: String, required: true, unique: true },
  title: { type: String, required: true },
  type: { type: String, enum: ['standalone', 'with-mba'], required: true },
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
      duration: { type: Number, required: true }
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
      duration: { type: Number, required: true }
    }],
    documents: [{
      title: { type: String, required: true },
      url: { type: String, required: true }
    }],
    quizId: { type: String, default: null }
  }]
}, { timestamps: true });

export const Course = mongoose.model<ICourseDocument>('Course', CourseSchema);
