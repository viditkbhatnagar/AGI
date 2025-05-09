// server/models/liveClass.ts
import { Schema, model, Types } from 'mongoose';

const LiveClassSchema = new Schema({
  courseSlug: { type: String, ref: 'Course', required: true },
  teacherId:  { type: Types.ObjectId, ref: 'User', required: true },
  studentIds: [{ type: Types.ObjectId, ref: 'Student' }],
  startsAt:   { type: Date, required: true },
  durationMin:{ type: Number, default: 150 }
}, { timestamps: true });

export const LiveClass = model('LiveClass', LiveClassSchema);