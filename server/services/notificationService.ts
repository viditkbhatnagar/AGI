import mongoose from 'mongoose';
import { Notification, NotificationType } from '../models/notification';

interface CreateNotificationParams {
  recipientId: mongoose.Types.ObjectId | string;
  recipientRole: 'student' | 'teacher' | 'admin';
  type: NotificationType;
  title: string;
  message: string;
  courseSlug?: string;
  actionUrl?: string;
}

/**
 * Create a single notification for a user.
 * Fires and forgets — errors are logged but don't propagate.
 */
export async function createNotification(params: CreateNotificationParams) {
  try {
    await Notification.create({
      ...params,
      recipientId: new mongoose.Types.ObjectId(String(params.recipientId)),
    });
  } catch (err) {
    console.error('[NotificationService] Failed to create notification:', err);
  }
}

/**
 * Create the same notification for multiple recipients.
 */
export async function createBulkNotifications(
  recipientIds: (mongoose.Types.ObjectId | string)[],
  recipientRole: 'student' | 'teacher' | 'admin',
  params: Omit<CreateNotificationParams, 'recipientId' | 'recipientRole'>
) {
  try {
    const docs = recipientIds.map((id) => ({
      recipientId: new mongoose.Types.ObjectId(String(id)),
      recipientRole,
      ...params,
    }));
    if (docs.length > 0) {
      await Notification.insertMany(docs, { ordered: false });
    }
  } catch (err) {
    console.error('[NotificationService] Failed to create bulk notifications:', err);
  }
}
