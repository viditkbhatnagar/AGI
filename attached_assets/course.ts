// server/models/course.ts
import { Schema, model, Types } from 'mongoose';

const ModuleSchema = new Schema({
  title:     { type: String, required: true },
  videos:    [String],
  documents: [String],
  quizId:    { type: Types.ObjectId, ref: 'Quiz', default: null }
}, { _id: false });

const CourseSchema = new Schema({
  slug:    { type: String, required: true, unique: true },
  title:   { type: String, required: true },
  type:    { type: String, enum: ['standalone','with-mba'], required: true },

  liveClassConfig: {
    enabled:     { type: Boolean, default: false },
    frequency:   { type: String, enum: ['weekly'], default: 'weekly' },
    dayOfWeek:   { type: String, enum: ['Monday','Tuesday','Wednesday','Thursday','Friday','Saturday','Sunday'], default: 'Monday' },
    durationMin: { type: Number, default: 150 }
  },

  mbaModules: { type: [ModuleSchema], default: [] },
  modules:    { type: [ModuleSchema], default: [] }
}, { timestamps: true });

export const Course = model('Course', CourseSchema);