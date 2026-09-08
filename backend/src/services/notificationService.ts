import prisma from '../config/db';
import { NotificationType } from '../types';

interface NotifyInput {
  recipientId?: string | null;
  title: string;
  message: string;
  type?: NotificationType;
}

/**
 * Persists an in-app notification. A null recipient makes it a global broadcast.
 * Failures never propagate: notifications must not break the originating transaction.
 */
export const notify = async ({ recipientId, title, message, type }: NotifyInput) => {
  try {
    return await prisma.notification.create({
      data: {
        recipientId: recipientId || null,
        title,
        message,
        type: type || NotificationType.SYSTEM,
        isRead: false,
      },
    });
  } catch (error) {
    console.error('Notification dispatch failed:', error);
    return null;
  }
};

/** Resolves the user account behind a member profile, if the member has portal access. */
export const getMemberUserId = async (memberId: string): Promise<string | null> => {
  const member = await prisma.member.findUnique({
    where: { id: memberId },
    select: { userId: true },
  });
  return member?.userId || null;
};

export const notifyMember = async (memberId: string, input: Omit<NotifyInput, 'recipientId'>) => {
  const userId = await getMemberUserId(memberId);
  if (!userId) return null;
  return notify({ ...input, recipientId: userId });
};

export const notifyPaymentReceived = async (
  memberId: string,
  amount: number,
  receiptNumber: string
) =>
  notifyMember(memberId, {
    title: 'Payment Confirmed',
    message: `We received your payment of ETB ${amount.toFixed(2)}. Receipt ${receiptNumber}.`,
    type: NotificationType.PAYMENT,
  });

export const notifyMembershipActivated = async (
  memberId: string,
  packageName: string,
  endDate: Date
) =>
  notifyMember(memberId, {
    title: 'Membership Active',
    message: `Your ${packageName} membership is active until ${endDate.toDateString()}.`,
    type: NotificationType.MEMBERSHIP,
  });

export const notifySessionScheduled = async (
  memberId: string,
  trainerUserId: string | null,
  title: string,
  scheduledDate: Date,
  startTime: string
) => {
  const when = `${scheduledDate.toDateString()} at ${startTime}`;
  await notifyMember(memberId, {
    title: 'New Training Session',
    message: `"${title}" is scheduled for ${when}.`,
    type: NotificationType.SYSTEM,
  });
  if (trainerUserId) {
    await notify({
      recipientId: trainerUserId,
      title: 'New Session Assigned',
      message: `"${title}" is scheduled for ${when}.`,
      type: NotificationType.SYSTEM,
    });
  }
};
