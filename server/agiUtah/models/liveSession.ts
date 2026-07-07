import mongoose, { Schema, Document, Model } from 'mongoose';

/**
 * A weekly live faculty lecture for a course offering. In the confirmed model live
 * lectures are REQUIRED but recorded — a student attends live or watches the recording;
 * either satisfies the contact requirement.
 *
 * Default (existing-services) mode: faculty paste a Zoom/Google Meet link into `meetLink` —
 * exactly like the current AGI platform's live classes — so NO new conferencing vendor is
 * needed. A BigBlueButton adapter can be added later for auto-created meetings + recording
 * webhooks, but is optional.
 *
 * Isolated: `agiutah_live_sessions` collection.
 */
export interface IAgiUtahLiveSession {
  intakeKey: string;
  courseCode: string;
  /** 1-based week within the course's month. */
  weekIndex: number;
  scheduledAt: Date;
  durationMinutes: number;
  /** Manually-provided Zoom/Google Meet link (existing-services default; no vendor needed). */
  meetLink?: string;
  provider?: string;
  meetingId?: string;
  recordingUrl?: string;
  required: boolean;
}

export interface IAgiUtahLiveSessionDocument extends IAgiUtahLiveSession, Document {}

const AgiUtahLiveSessionSchema = new Schema<IAgiUtahLiveSessionDocument>(
  {
    intakeKey: { type: String, required: true },
    courseCode: { type: String, required: true },
    weekIndex: { type: Number, required: true, min: 1 },
    scheduledAt: { type: Date, required: true },
    durationMinutes: { type: Number, required: true, default: 90 },
    meetLink: { type: String, required: false },
    provider: { type: String, required: false },
    meetingId: { type: String, required: false },
    recordingUrl: { type: String, required: false },
    required: { type: Boolean, default: true },
  },
  { timestamps: true, collection: 'agiutah_live_sessions' },
);

AgiUtahLiveSessionSchema.index({ intakeKey: 1, courseCode: 1, weekIndex: 1 }, { unique: true });

export const AgiUtahLiveSession: Model<IAgiUtahLiveSessionDocument> =
  (mongoose.models.AgiUtahLiveSession as Model<IAgiUtahLiveSessionDocument>) ||
  mongoose.model<IAgiUtahLiveSessionDocument>('AgiUtahLiveSession', AgiUtahLiveSessionSchema);
