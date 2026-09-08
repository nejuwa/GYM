import { Response } from 'express';
import prisma from '../config/db';
import { AuthRequest } from '../middlewares/auth';
import { MembershipStatus, AccountStatus, AttendanceStatus, SessionStatus } from '../types';

export const getFinancialReport = async (req: AuthRequest, res: Response) => {
  try {
    const { startDate, endDate } = req.query;
    const paymentWhere: any = { status: 'COMPLETED' };
    const expenseWhere: any = {};

    if (startDate || endDate) {
      paymentWhere.paymentDate = {};
      expenseWhere.expenseDate = {};
      if (startDate) {
        paymentWhere.paymentDate.gte = new Date(String(startDate));
        expenseWhere.expenseDate.gte = new Date(String(startDate));
      }
      if (endDate) {
        paymentWhere.paymentDate.lte = new Date(String(endDate));
        expenseWhere.expenseDate.lte = new Date(String(endDate));
      }
    }

    const totalRevenueAgg = await prisma.payment.aggregate({
      where: paymentWhere,
      _sum: { amount: true },
      _count: { id: true },
    });

    const totalExpensesAgg = await prisma.expense.aggregate({
      where: expenseWhere,
      _sum: { amount: true },
      _count: { id: true },
    });

    const totalRevenue = totalRevenueAgg._sum.amount || 0;
    const totalExpenses = totalExpensesAgg._sum.amount || 0;
    const netProfit = totalRevenue - totalExpenses;
    const profitMargin = totalRevenue > 0 ? ((netProfit / totalRevenue) * 100).toFixed(1) : 0;

    // Monthly breakdown (last 12 months)
    const now = new Date();
    const monthlySummary: any[] = [];

    for (let i = 11; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const mEnd = new Date(d.getFullYear(), d.getMonth() + 1, 0, 23, 59, 59);
      const monthLabel = d.toLocaleString('default', { month: 'short', year: 'numeric' });

      const rev = await prisma.payment.aggregate({
        where: { paymentDate: { gte: d, lte: mEnd }, status: 'COMPLETED' },
        _sum: { amount: true },
      });
      const exp = await prisma.expense.aggregate({
        where: { expenseDate: { gte: d, lte: mEnd } },
        _sum: { amount: true },
      });

      const r = rev._sum.amount || 0;
      const e = exp._sum.amount || 0;
      monthlySummary.push({
        month: monthLabel,
        revenue: r,
        expenses: e,
        netProfit: r - e,
      });
    }

    // Category breakdown for expenses
    const expensesByCategory = await prisma.expense.groupBy({
      by: ['category'],
      where: expenseWhere,
      _sum: { amount: true },
      _count: { id: true },
    });

    // Payment method breakdown
    const paymentsByMethod = await prisma.payment.groupBy({
      by: ['paymentMethod'],
      where: paymentWhere,
      _sum: { amount: true },
      _count: { id: true },
    });

    res.json({
      success: true,
      summary: {
        totalRevenue,
        totalExpenses,
        netProfit,
        profitMargin: Number(profitMargin),
        transactionsCount: totalRevenueAgg._count.id,
        expensesCount: totalExpensesAgg._count.id,
      },
      monthlySummary,
      expensesByCategory,
      paymentsByMethod,
    });
  } catch (error: any) {
    res.status(500).json({ success: false, message: 'Failed to generate financial report' });
  }
};

export const getMemberReport = async (req: AuthRequest, res: Response) => {
  try {
    const totalMembers = await prisma.member.count();
    const activeMembers = await prisma.member.count({ where: { status: AccountStatus.ACTIVE } });
    const suspendedMembers = await prisma.member.count({ where: { status: AccountStatus.SUSPENDED } });

    // Gender breakdown
    const genderStats = await prisma.member.groupBy({
      by: ['gender'],
      _count: { id: true },
    });

    // Registrations by month (last 6 months)
    const now = new Date();
    const registrationTrends: any[] = [];
    for (let i = 5; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const mEnd = new Date(d.getFullYear(), d.getMonth() + 1, 0, 23, 59, 59);
      const monthLabel = d.toLocaleString('default', { month: 'short' });

      const count = await prisma.member.count({
        where: { registrationDate: { gte: d, lte: mEnd } },
      });

      registrationTrends.push({ month: monthLabel, newMembers: count });
    }

    res.json({
      success: true,
      summary: { totalMembers, activeMembers, suspendedMembers },
      genderStats,
      registrationTrends,
    });
  } catch (error: any) {
    res.status(500).json({ success: false, message: 'Failed to generate member report' });
  }
};

export const getMembershipReport = async (req: AuthRequest, res: Response) => {
  try {
    const totalMemberships = await prisma.membership.count();
    const active = await prisma.membership.count({ where: { status: MembershipStatus.ACTIVE } });
    const expired = await prisma.membership.count({ where: { status: MembershipStatus.EXPIRED } });
    const cancelled = await prisma.membership.count({ where: { status: MembershipStatus.CANCELLED } });

    // Package Popularity
    const byPackage = await prisma.membership.groupBy({
      by: ['packageId'],
      _count: { id: true },
      _sum: { pricePaid: true },
    });

    const packages = await prisma.package.findMany();
    const pkgMap = new Map(packages.map((p) => [p.id, p]));

    const packagePerformance = byPackage.map((item) => ({
      packageName: pkgMap.get(item.packageId)?.name || 'Unknown',
      durationDays: pkgMap.get(item.packageId)?.durationDays || 0,
      totalSold: item._count.id,
      totalRevenue: item._sum.pricePaid || 0,
    }));

    res.json({
      success: true,
      summary: { totalMemberships, active, expired, cancelled },
      packagePerformance,
    });
  } catch (error: any) {
    res.status(500).json({ success: false, message: 'Failed to generate membership report' });
  }
};

export const getAttendanceReport = async (req: AuthRequest, res: Response) => {
  try {
    const totalVisits = await prisma.attendance.count();
    const granted = await prisma.attendance.count({ where: { status: AttendanceStatus.GRANTED } });
    const rejected = await prisma.attendance.count({ where: { status: AttendanceStatus.REJECTED } });

    // Last 14 days attendance trend
    const now = new Date();
    const dailyTrends: any[] = [];

    for (let i = 13; i >= 0; i--) {
      const d = new Date(now);
      d.setDate(d.getDate() - i);
      d.setHours(0, 0, 0, 0);

      const nextDay = new Date(d);
      nextDay.setDate(nextDay.getDate() + 1);

      const dayGranted = await prisma.attendance.count({
        where: { createdAt: { gte: d, lt: nextDay }, status: AttendanceStatus.GRANTED },
      });
      const dayRejected = await prisma.attendance.count({
        where: { createdAt: { gte: d, lt: nextDay }, status: AttendanceStatus.REJECTED },
      });

      dailyTrends.push({
        date: d.toLocaleDateString('default', { month: 'short', day: 'numeric' }),
        granted: dayGranted,
        rejected: dayRejected,
        total: dayGranted + dayRejected,
      });
    }

    // Peak hour heatmap + weekday vs weekend split over the last 90 days
    const since = new Date(now);
    since.setDate(since.getDate() - 90);

    const recentVisits = await prisma.attendance.findMany({
      where: { status: AttendanceStatus.GRANTED, entryTime: { gte: since } },
      select: { entryTime: true },
    });

    const hourlyDistribution = Array.from({ length: 24 }, (_, hour) => ({
      hour,
      label: `${String(hour).padStart(2, '0')}:00`,
      visits: 0,
    }));
    let weekdayVisits = 0;
    let weekendVisits = 0;

    for (const visit of recentVisits) {
      hourlyDistribution[visit.entryTime.getHours()].visits += 1;
      const day = visit.entryTime.getDay();
      if (day === 0 || day === 6) weekendVisits += 1;
      else weekdayVisits += 1;
    }

    const peakHour = hourlyDistribution.reduce((a, b) => (b.visits > a.visits ? b : a));

    res.json({
      success: true,
      summary: {
        totalVisits,
        granted,
        rejected,
        successRate: totalVisits > 0 ? ((granted / totalVisits) * 100).toFixed(1) : 100,
        peakHour: peakHour.visits > 0 ? peakHour.label : null,
        weekdayVisits,
        weekendVisits,
      },
      dailyTrends,
      hourlyDistribution,
    });
  } catch (error: any) {
    res.status(500).json({ success: false, message: 'Failed to generate attendance report' });
  }
};

export const getTrainerReport = async (req: AuthRequest, res: Response) => {
  try {
    const trainers = await prisma.trainer.findMany({
      include: {
        assignedMembers: { where: { status: AccountStatus.ACTIVE }, select: { id: true } },
        sessions: { select: { status: true, scheduledDate: true } },
      },
      orderBy: { fullName: 'asc' },
    });

    const monthStart = new Date();
    monthStart.setDate(1);
    monthStart.setHours(0, 0, 0, 0);

    const workload = trainers.map((trainer) => {
      const completed = trainer.sessions.filter((s) => s.status === SessionStatus.COMPLETED).length;
      const cancelled = trainer.sessions.filter((s) => s.status === SessionStatus.CANCELLED).length;
      const scheduled = trainer.sessions.filter((s) => s.status === SessionStatus.SCHEDULED).length;
      const sessionsThisMonth = trainer.sessions.filter((s) => s.scheduledDate >= monthStart).length;
      const totalSessions = trainer.sessions.length;

      return {
        trainerId: trainer.id,
        trainerName: trainer.fullName,
        specialization: trainer.specialization,
        status: trainer.status,
        assignedMembers: trainer.assignedMembers.length,
        totalSessions,
        completed,
        scheduled,
        cancelled,
        sessionsThisMonth,
        completionRate: totalSessions > 0 ? Number(((completed / totalSessions) * 100).toFixed(1)) : 0,
      };
    });

    const summary = {
      totalTrainers: trainers.length,
      activeTrainers: trainers.filter((t) => t.status === AccountStatus.ACTIVE).length,
      totalAssignments: workload.reduce((sum, t) => sum + t.assignedMembers, 0),
      totalSessions: workload.reduce((sum, t) => sum + t.totalSessions, 0),
      sessionsThisMonth: workload.reduce((sum, t) => sum + t.sessionsThisMonth, 0),
    };

    res.json({ success: true, summary, workload });
  } catch (error: any) {
    res.status(500).json({ success: false, message: 'Failed to generate trainer report' });
  }
};
