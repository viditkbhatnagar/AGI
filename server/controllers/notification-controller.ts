import { Request, Response } from 'express';
import mongoose from 'mongoose';
import { Notification } from '../models/notification';
import { Student } from '../models/student';

function getRecipientId(req: Request): mongoose.Types.ObjectId | null {
  if (!req.user) return null;
  return new mongoose.Types.ObjectId(req.user.id);
}

export const getNotifications = async (req: Request, res: Response) => {
  try {
    const userId = getRecipientId(req);
    if (!userId) return res.status(401).json({ message: 'Not authenticated' });

    const limit = Math.min(Number(req.query.limit) || 20, 50);
    const offset = Number(req.query.offset) || 0;
    const unreadOnly = req.query.unreadOnly === 'true';

    const filter: any = { recipientId: userId };
    if (unreadOnly) filter.isRead = false;

    const [notifications, total, unreadCount] = await Promise.all([
      Notification.find(filter)
        .sort({ createdAt: -1 })
        .skip(offset)
        .limit(limit)
        .lean(),
      Notification.countDocuments(filter),
      Notification.countDocuments({ recipientId: userId, isRead: false }),
    ]);

    return res.json({ notifications, total, unreadCount });
  } catch (err) {
    console.error('Error fetching notifications:', err);
    return res.status(500).json({ message: 'Failed to fetch notifications' });
  }
};

export const getUnreadCount = async (req: Request, res: Response) => {
  try {
    const userId = getRecipientId(req);
    if (!userId) return res.status(401).json({ message: 'Not authenticated' });

    const count = await Notification.countDocuments({ recipientId: userId, isRead: false });
    return res.json({ count });
  } catch (err) {
    console.error('Error fetching notification count:', err);
    return res.status(500).json({ message: 'Failed to fetch count' });
  }
};

export const markAsRead = async (req: Request, res: Response) => {
  try {
    const userId = getRecipientId(req);
    if (!userId) return res.status(401).json({ message: 'Not authenticated' });

    const { id } = req.params;
    const notification = await Notification.findOneAndUpdate(
      { _id: id, recipientId: userId },
      { isRead: true, readAt: new Date() },
      { new: true }
    );

    if (!notification) return res.status(404).json({ message: 'Notification not found' });
    return res.json({ notification });
  } catch (err) {
    console.error('Error marking notification as read:', err);
    return res.status(500).json({ message: 'Failed to mark as read' });
  }
};

export const markAllAsRead = async (req: Request, res: Response) => {
  try {
    const userId = getRecipientId(req);
    if (!userId) return res.status(401).json({ message: 'Not authenticated' });

    await Notification.updateMany(
      { recipientId: userId, isRead: false },
      { isRead: true, readAt: new Date() }
    );

    return res.json({ message: 'All notifications marked as read' });
  } catch (err) {
    console.error('Error marking all as read:', err);
    return res.status(500).json({ message: 'Failed to mark all as read' });
  }
};
