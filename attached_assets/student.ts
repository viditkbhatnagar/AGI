// server/models/student.ts
import { Schema, model, Types } from 'mongoose';

const EventLogSchema = new Schema({
  event:     { type: String, required: true },
  detail:    Schema.Types.Mixed,
  createdAt: { type: Date, default: () => new Date() }
}, { _id: false });

const ReminderSchema = new Schema({
  type: { type: String, required: true },
  when: { type: Date, required: true },
  sent: { type: Boolean, default: false }
}, { _id: false });

const CertificateSchema = new Schema({
  issuedAt:    Date,
  documentUrl: String
}, { _id: false });

const WatchTimeSchema = new Schema({
  moduleIndex:    { type: Number, required: true },
  minutesWatched: { type: Number, required: true }
}, { _id: false });

const StudentSchema = new Schema({
  name:           { type: String, required: true },
  phone:          { type: String, required: true },
  address:        String,
  dob:            { type: Date, required: true },
  pathway:        { type: String, enum: ['standalone','with-mba'], required: true },
  enrollment:     { type: Types.ObjectId, ref: 'Enrollment' },

  eventLogs:      { type: [EventLogSchema], default: [] },
  reminders:      { type: [ReminderSchema], default: [] },
  certificate:    { type: CertificateSchema, default: {} },
  notifySettings: {
    courseProgress:   { frequencyDays: { type: Number, default: 3 } },
    quizSummary:      { frequencyDays: { type: Number, default: 7 } },
    certificateReady: { enabled: { type: Boolean, default: true } }
  },
  watchTime:      { type: [WatchTimeSchema], default: [] }
}, { timestamps: true });

export const Student = model('Student', StudentSchema);