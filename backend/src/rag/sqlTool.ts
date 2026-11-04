import type { Prisma } from '@prisma/client';
import prisma from '../config/db';
import type { DatabaseContext, RagIdentity } from './types';

const ROW_LIMIT = 100;
const PRIVILEGED_ROLES = new Set(['OWNER', 'MANAGER']);

function withReadTimeout<T>(
  query: (transaction: Prisma.TransactionClient) => Promise<T>,
): Promise<T> {
  return prisma.$transaction(async (transaction) => {
    await transaction.$executeRaw`SET LOCAL statement_timeout = '5000ms'`;
    return query(transaction);
  }, { maxWait: 1000, timeout: 6000 });
}

export async function queryGymDatabase(
  question: string,
  identity: RagIdentity,
): Promise<DatabaseContext[]> {
  const normalized = question.toLowerCase();

  if (/\b(users?|accounts?)\b/.test(normalized)) {
    if (!PRIVILEGED_ROLES.has(identity.role)) return [];
    const activeOnly = /\b(active|enabled)\b/.test(normalized);
    const counts = await withReadTimeout(async (transaction) => {
      const [totalUsers, activeUsers] = await Promise.all([
        transaction.user.count(),
        transaction.user.count({ where: { status: 'ACTIVE' } }),
      ]);
      return { totalUsers, activeUsers };
    });
    return [{
      table: 'User',
      records: [activeOnly ? { activeUsers: counts.activeUsers } : counts],
    }];
  }

  if (/\b(trainer|coach|instructor)s?\b/.test(normalized)) {
    if (/\b(available|availability|weekends?|weekdays?)\b/.test(normalized)) return [];
    const trainers = await withReadTimeout((transaction) => transaction.trainer.findMany({
      where: { status: 'ACTIVE' },
      select: { fullName: true, specialization: true },
      orderBy: { fullName: 'asc' },
      take: ROW_LIMIT,
    }));
    return [{ table: 'Trainer', records: trainers }];
  }

  if (/\b(package|membership|plan|annual|monthly|price|cost|fee)s?\b/.test(normalized)) {
    if (/\b(my|current|active|expired|renew|renewal)\b/.test(normalized)) {
      const memberships = await withReadTimeout(async (transaction) => {
        const member = await transaction.member.findUnique({
          where: { userId: identity.id },
          select: { id: true },
        });
        if (!member) return [];
        return transaction.membership.findMany({
          where: { memberId: member.id },
          select: {
            status: true,
            startDate: true,
            endDate: true,
            package: { select: { name: true, durationDays: true, price: true } },
          },
          orderBy: { startDate: 'desc' },
          take: ROW_LIMIT,
        });
      });
      return [{
        table: 'Membership',
        records: memberships.map((membership) => ({
          status: membership.status,
          startDate: membership.startDate.toISOString().slice(0, 10),
          endDate: membership.endDate.toISOString().slice(0, 10),
          package: membership.package,
        })),
      }];
    }

    const packages = await withReadTimeout((transaction) => transaction.package.findMany({
      where: { status: 'ACTIVE' },
      select: { name: true, description: true, durationDays: true, price: true, features: true },
      orderBy: { price: 'asc' },
      take: ROW_LIMIT,
    }));
    return [{ table: 'Package', records: packages }];
  }

  if (/\b(class|classes|yoga)\b/.test(normalized)) return [];

  if (/\b(session|appointment)\b/.test(normalized)) {
    const where = PRIVILEGED_ROLES.has(identity.role)
      ? { status: 'SCHEDULED' }
      : identity.role === 'TRAINER'
        ? { trainer: { userId: identity.id }, status: 'SCHEDULED' }
        : { member: { userId: identity.id }, status: 'SCHEDULED' };
    const sessions = await withReadTimeout((transaction) => transaction.trainingSession.findMany({
      where,
      select: {
        title: true,
        scheduledDate: true,
        startTime: true,
        endTime: true,
        status: true,
        trainer: { select: { fullName: true } },
      },
      orderBy: { scheduledDate: 'asc' },
      take: ROW_LIMIT,
    }));
    return [{
      table: 'TrainingSession',
      records: sessions.map((session) => ({
        title: session.title,
        scheduledDate: session.scheduledDate.toISOString().slice(0, 10),
        startTime: session.startTime,
        endTime: session.endTime,
        status: session.status,
        trainer: session.trainer.fullName,
      })),
    }];
  }

  if (/\b(payment|payments|paid|receipt|revenue|income)\b/.test(normalized)) {
    const where = PRIVILEGED_ROLES.has(identity.role)
      ? { status: 'COMPLETED' }
      : { member: { userId: identity.id }, status: 'COMPLETED' };
    if (!PRIVILEGED_ROLES.has(identity.role) && identity.role !== 'MEMBER') return [];

    const paymentSummary = await withReadTimeout((transaction) => transaction.payment.aggregate({
      where,
      _count: { _all: true },
      _sum: { amount: true },
    }));
    return [{
      table: 'Payment',
      records: [{
        paymentCount: paymentSummary._count._all,
        totalAmount: paymentSummary._sum.amount ?? 0,
      }],
    }];
  }

  if (/\b(attendance|check[\s-]?in|visits?)\b/.test(normalized)) {
    const where = PRIVILEGED_ROLES.has(identity.role)
      ? { status: 'GRANTED' }
      : { member: { userId: identity.id }, status: 'GRANTED' };
    if (!PRIVILEGED_ROLES.has(identity.role) && identity.role !== 'MEMBER') return [];

    const attendanceCount = await withReadTimeout((transaction) =>
      transaction.attendance.count({ where }),
    );
    return [{ table: 'Attendance', records: [{ checkIns: attendanceCount }] }];
  }

  if (/\b(member|members)\b/.test(normalized) && PRIVILEGED_ROLES.has(identity.role)) {
    const [active, total] = await withReadTimeout(async (transaction) => [
      await transaction.member.count({ where: { status: 'ACTIVE' } }),
      await transaction.member.count(),
    ]);
    return [{ table: 'Member', records: [{ activeMembers: active, totalMembers: total }] }];
  }

  if (/\b(expense|expenses|spending)\b/.test(normalized) && PRIVILEGED_ROLES.has(identity.role)) {
    const expenseSummary = await withReadTimeout((transaction) => transaction.expense.aggregate({
      _count: { _all: true },
      _sum: { amount: true },
    }));
    return [{
      table: 'Expense',
      records: [{
        expenseCount: expenseSummary._count._all,
        totalAmount: expenseSummary._sum.amount ?? 0,
      }],
    }];
  }

  return [];
}
