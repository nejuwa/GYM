import { Response } from 'express';
import { Prisma } from '@prisma/client';
import prisma from '../config/db';
import { AuthRequest } from '../middlewares/auth';
import { createAuditEntry } from '../middlewares/audit';
import { NotificationType } from '../types';

export const getNotifications = async (req: AuthRequest, res: Response) => {
  try {
    const user = req.user!;
    const notifications = await prisma.notification.findMany({
      where: {
        OR: [
          { recipientId: user.id },
          { recipientId: null }, // Global broadcasts
        ],
      },
      orderBy: { createdAt: 'desc' },
      take: 50,
    });

    const unreadCount = notifications.filter((n) => !n.isRead).length;

    res.json({ success: true, unreadCount, notifications });
  } catch (error: any) {
    res.status(500).json({ success: false, message: 'Failed to fetch notifications' });
  }
};

export const markAsRead = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const notification = await prisma.notification.findUnique({ where: { id } });

    if (!notification) {
      return res.status(404).json({ success: false, message: 'Notification not found' });
    }

    if (notification.recipientId && notification.recipientId !== req.user!.id) {
      return res.status(403).json({ success: false, message: 'Access denied to this notification' });
    }

    const updated = await prisma.notification.update({
      where: { id },
      data: { isRead: true },
    });

    res.json({ success: true, notification: updated });
  } catch (error: any) {
    res.status(500).json({ success: false, message: 'Failed to update notification' });
  }
};

export const markAllAsRead = async (req: AuthRequest, res: Response) => {
  try {
    const user = req.user!;
    await prisma.notification.updateMany({
      where: {
        OR: [{ recipientId: user.id }, { recipientId: null }],
        isRead: false,
      },
      data: { isRead: true },
    });

    res.json({ success: true, message: 'All notifications marked as read' });
  } catch (error: any) {
    res.status(500).json({ success: false, message: 'Failed to mark notifications as read' });
  }
};

export const sendNotification = async (req: AuthRequest, res: Response) => {
  try {
    const { recipientId, title, message, type } = req.body;

    if (!title || !message) {
      return res.status(400).json({ success: false, message: 'Title and message are required' });
    }

    const normalizedRecipientId = recipientId ? String(recipientId).trim() : null;
    if (normalizedRecipientId) {
      const recipient = await prisma.user.findUnique({ where: { id: normalizedRecipientId }, select: { id: true } });
      if (!recipient) {
        return res.status(404).json({ success: false, message: 'Notification recipient user not found' });
      }
    }

    const notificationType = type ? String(type).trim().toUpperCase() : NotificationType.ANNOUNCEMENT;
    if (!Object.values(NotificationType).includes(notificationType as NotificationType)) {
      return res.status(400).json({ success: false, message: 'Invalid notification type' });
    }

    const notification = await prisma.notification.create({
      data: {
        recipientId: normalizedRecipientId,
        title,
        message,
        type: notificationType,
        isRead: false,
      },
    });

    createAuditEntry(
      req,
      'SEND_NOTIFICATION',
      'NOTIFICATIONS',
      `Sent notification "${title}" to ${normalizedRecipientId ? 'user ID ' + normalizedRecipientId : 'All Users'}`
    );

    res.status(201).json({ success: true, message: 'Notification sent successfully', notification });
  } catch (error: any) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2003') {
      return res.status(404).json({ success: false, message: 'Notification recipient user not found' });
    }
    res.status(500).json({ success: false, message: 'Failed to send notification' });
  }
};
