import prisma from '../config/db';
import { MembershipStatus, NotificationType } from '../types';
import { notify } from './notificationService';

const DAY_MS = 24 * 60 * 60 * 1000;
const REMINDER_WINDOWS = [7, 3];

const startOfDay = (date: Date) => {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  return d;
};

/** Flips memberships whose end date has passed to EXPIRED. */
export const expireOverdueMemberships = async (): Promise<number> => {
  const { count } = await prisma.membership.updateMany({
    where: { status: MembershipStatus.ACTIVE, endDate: { lt: new Date() } },
    data: { status: MembershipStatus.EXPIRED },
  });
  return count;
};

/**
 * Sends one reminder per member per window (7 and 3 days out). Re-running the job
 * on the same day is a no-op because an identical title/message already exists.
 */
export const notifyExpiringMemberships = async (): Promise<number> => {
  let sent = 0;

  for (const days of REMINDER_WINDOWS) {
    const windowStart = startOfDay(new Date(Date.now() + days * DAY_MS));
    const windowEnd = new Date(windowStart.getTime() + DAY_MS);

    const memberships = await prisma.membership.findMany({
      where: {
        status: MembershipStatus.ACTIVE,
        endDate: { gte: windowStart, lt: windowEnd },
      },
      include: { member: { select: { userId: true, fullName: true } }, package: true },
    });

    for (const membership of memberships) {
      if (!membership.member.userId) continue;

      const title = `Membership Expiring in ${days} Days`;
      const message = `Your ${membership.package.name} membership expires on ${membership.endDate.toDateString()}. Renew to keep your access active.`;

      const alreadySent = await prisma.notification.findFirst({
        where: { recipientId: membership.member.userId, title, message },
      });
      if (alreadySent) continue;

      await notify({
        recipientId: membership.member.userId,
        title,
        message,
        type: NotificationType.MEMBERSHIP,
      });
      sent += 1;
    }
  }

  return sent;
};

export const runMembershipLifecycleJob = async () => {
  try {
    const expired = await expireOverdueMemberships();
    const reminders = await notifyExpiringMemberships();
    if (expired || reminders) {
      console.log(`Membership lifecycle: ${expired} expired, ${reminders} reminders sent`);
    }
  } catch (error) {
    console.error('Membership lifecycle job failed:', error);
  }
};

/** Runs the lifecycle job at boot and then hourly. */
export const startMembershipLifecycleScheduler = () => {
  void runMembershipLifecycleJob();
  const timer = setInterval(runMembershipLifecycleJob, 60 * 60 * 1000);
  timer.unref?.();
  return timer;
};
