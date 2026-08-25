import mongoose, { Schema, Document } from 'mongoose';

/**
 * One row per broken video slot found during a scan. A single YouTube video
 * used in two modules produces two issues, because each slot has to be fixed
 * separately in the course editor.
 */
export interface IVideoLinkIssue {
  courseSlug: string;
  courseTitle: string;
  moduleIndex: number;
  moduleTitle: string;
  videoIndex: number;
  videoTitle: string;
  url: string;
  videoId?: string;
  /** Machine-readable failure class, used to diff runs and to word alerts. */
  status: 'embed_disabled' | 'deleted' | 'private' | 'unplayable' | 'unreachable' | 'not_youtube';
  detail: string;
}

export interface IVideoLinkReport {
  runAt: Date;
  totalVideoSlots: number;
  uniqueVideos: number;
  brokenSlots: number;
  issues: IVideoLinkIssue[];
  /** Slots broken in this run that were healthy (or absent) in the previous run. */
  newlyBroken: number;
  durationMs: number;
}

export interface IVideoLinkReportDocument extends IVideoLinkReport, Document {}

const VideoLinkIssueSchema = new Schema<IVideoLinkIssue>({
  courseSlug: { type: String, required: true },
  courseTitle: { type: String, default: '' },
  moduleIndex: { type: Number, required: true },
  moduleTitle: { type: String, default: '' },
  videoIndex: { type: Number, required: true },
  videoTitle: { type: String, default: '' },
  url: { type: String, required: true },
  videoId: { type: String },
  status: {
    type: String,
    required: true,
    enum: ['embed_disabled', 'deleted', 'private', 'unplayable', 'unreachable', 'not_youtube'],
  },
  detail: { type: String, default: '' },
}, { _id: false });

const VideoLinkReportSchema = new Schema<IVideoLinkReportDocument>({
  runAt: { type: Date, required: true, default: Date.now, index: true },
  totalVideoSlots: { type: Number, required: true },
  uniqueVideos: { type: Number, required: true },
  brokenSlots: { type: Number, required: true },
  issues: { type: [VideoLinkIssueSchema], default: [] },
  newlyBroken: { type: Number, default: 0 },
  durationMs: { type: Number, default: 0 },
}, { timestamps: true, collection: 'videolinkreports' });

export const VideoLinkReport =
  mongoose.model<IVideoLinkReportDocument>('VideoLinkReport', VideoLinkReportSchema);
