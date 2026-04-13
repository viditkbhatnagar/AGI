import mongoose, { Schema, Document } from 'mongoose';

export type NotificationType =
  | 'enrollment_created'
  | 'live_class_scheduled'
  | 'exam_graded'
  | 'exam_submitted'
  | 'quiz_result'
  | 'module_completed'
  | 'course_completed'
  | 'certificate_ready'
  | 'general';

export interface INotification {
  recipientId: mongoose.Types.ObjectId;
  recipientRole: 'student' | 'teacher' | 'admin';
  type: NotificationType;
  title: string;
  message: string;
  courseSlug?: string;
  actionUrl?: string;
  isRead: boolean;
  readAt?: Date;
}

export interface INotificationDocument extends INotification, Document {}

const NotificationSchema = new Schema<INotificationDocument>({
  recipientId: { type: Schema.Types.ObjectId, required: true, index: true },
  recipientRole: { type: String, required: true, enum: ['student', 'teacher', 'admin'] },
  type: {
    type: String,
    required: true,
    enum: [
      'enrollment_created',
      'live_class_scheduled',
      'exam_graded',
      'exam_submitted',
      'quiz_result',
      'module_completed',
      'course_completed',
      'certificate_ready',
      'general',
    ],
  },
  title: { type: String, required: true },
  message: { type: String, required: true },
  courseSlug: { type: String },
  actionUrl: { type: String },
  isRead: { type: Boolean, default: false },
  readAt: { type: Date },
}, {
  timestamps: true,
  collection: 'notifications',
});

NotificationSchema.index({ recipientId: 1, isRead: 1, createdAt: -1 });
NotificationSchema.index({ createdAt: -1 });
// Auto-delete notifications older than 90 days
NotificationSchema.index({ createdAt: 1 }, { expireAfterSeconds: 90 * 24 * 60 * 60 });

export const Notification = mongoose.model<INotificationDocument>('Notification', NotificationSchema);
