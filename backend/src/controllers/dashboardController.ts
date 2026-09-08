import { Response } from 'express';
import prisma from '../config/db';
import { AuthRequest } from '../middlewares/auth';
import { cache } from '../config/memoryCache';
import { Role, MembershipStatus, AccountStatus } from '../types';

export const getDashboardData = async (req: AuthRequest, res: Response) => {
  try {
    const user = req.user!;
    const cacheKey = `dashboard:${user.role}:${user.id}`;

    // Check the short-lived in-process cache before querying PostgreSQL.
    const cachedData = await cache.get(cacheKey);
    if (cachedData) {
      return res.json({ success: true, data: JSON.parse(cachedData), source: 'cache' });
    }

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    const firstDayOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
    const lastDayOfMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0, 23, 59, 59);

    let dashboardData: any = {};

    if (user.role === Role.OWNER || user.role === Role.MANAGER) {
      // 1. Total & Active Members
      const totalMembers = await prisma.member.count();
      const activeMembers = await prisma.member.count({
        where: { status: AccountStatus.ACTIVE },
      });

      // 2. Active Memberships & Expiring Soon (within 7 days)
      const in7Days = new Date(today);
      in7Days.setDate(in7Days.getDate() + 7);

      const activeMemberships = await prisma.membership.count({
        where: { status: MembershipStatus.ACTIVE },
      });
      const expiringSoon = await prisma.membership.count({
        where: {
          status: MembershipStatus.ACTIVE,
          endDate: { gte: today, lte: in7Days },
        },
      });

      // 3. Today's Attendance
      const todayAttendance = await prisma.attendance.count({
        where: {
          createdAt: { gte: today, lt: tomorrow },
          status: 'GRANTED',
        },
      });

      // 4. Financials (This Month)
      const monthlyPayments = await prisma.payment.aggregate({
        where: {
          paymentDate: { gte: firstDayOfMonth, lte: lastDayOfMonth },
          status: 'COMPLETED',
        },
        _sum: { amount: true },
      });
      const monthlyRevenue = monthlyPayments._sum.amount || 0;

      const monthlyExpensesAgg = await prisma.expense.aggregate({
        where: {
          expenseDate: { gte: firstDayOfMonth, lte: lastDayOfMonth },
        },
        _sum: { amount: true },
      });
      const monthlyExpenses = monthlyExpensesAgg._sum.amount || 0;
      const netProfit = monthlyRevenue - monthlyExpenses;

      // 5. Total Trainers & Active Staff
      const totalTrainers = await prisma.trainer.count({
        where: { status: AccountStatus.ACTIVE },
      });

      // 6. Recent Attendances (Last 8)
      const recentAttendance = await prisma.attendance.findMany({
        take: 8,
        orderBy: { createdAt: 'desc' },
        include: {
          member: {
            select: { id: true, fullName: true, memberCode: true, photo: true },
          },
        },
      });

      // 7. Recent Transactions (Last 5)
      const recentPayments = await prisma.payment.findMany({
        take: 5,
        orderBy: { paymentDate: 'desc' },
        include: {
          member: { select: { fullName: true, memberCode: true } },
        },
      });

      // 8. 6-Month Financial Trend Chart Data
      const monthTrends: any[] = [];
      for (let i = 5; i >= 0; i--) {
        const d = new Date(today.getFullYear(), today.getMonth() - i, 1);
        const mEnd = new Date(d.getFullYear(), d.getMonth() + 1, 0, 23, 59, 59);
        const monthName = d.toLocaleString('default', { month: 'short' });

        const rev = await prisma.payment.aggregate({
          where: { paymentDate: { gte: d, lte: mEnd }, status: 'COMPLETED' },
          _sum: { amount: true },
        });
        const exp = await prisma.expense.aggregate({
          where: { expenseDate: { gte: d, lte: mEnd } },
          _sum: { amount: true },
        });

        monthTrends.push({
          month: monthName,
          revenue: rev._sum.amount || 0,
          expenses: exp._sum.amount || 0,
          profit: (rev._sum.amount || 0) - (exp._sum.amount || 0),
        });
      }

      // 9. Membership Package Distribution
      const packageDistribution = await prisma.membership.groupBy({
        by: ['packageId'],
        where: { status: MembershipStatus.ACTIVE },
        _count: { id: true },
      });

      const packages = await prisma.package.findMany();
      const packageMap = new Map(packages.map((p) => [p.id, p.name]));
      const packageStats = packageDistribution.map((item) => ({
        packageName: packageMap.get(item.packageId) || 'Unknown',
        count: item._count.id,
      }));

      dashboardData = {
        role: user.role,
        kpis: {
          totalMembers,
          activeMembers,
          activeMemberships,
          expiringSoon,
          todayAttendance,
          monthlyRevenue,
          monthlyExpenses,
          netProfit,
          totalTrainers,
        },
        recentAttendance,
        recentPayments,
        monthTrends,
        packageStats,
      };
    } else if (user.role === Role.TRAINER) {
      const trainer = await prisma.trainer.findFirst({
        where: { userId: user.id },
      });

      if (!trainer) {
        return res.status(404).json({ success: false, message: 'Trainer profile not found' });
      }

      // Trainer's assigned members
      const assignedCount = await prisma.trainerAssignment.count({
        where: { trainerId: trainer.id, status: AccountStatus.ACTIVE },
      });

      // Today's sessions
      const todaySessions = await prisma.trainingSession.findMany({
        where: {
          trainerId: trainer.id,
          scheduledDate: { gte: today, lt: tomorrow },
        },
        include: {
          member: { select: { fullName: true, phone: true, photo: true } },
        },
        orderBy: { startTime: 'asc' },
      });

      // Upcoming sessions this week
      const upcomingSessions = await prisma.trainingSession.findMany({
        where: {
          trainerId: trainer.id,
          scheduledDate: { gte: today },
        },
        take: 10,
        include: {
          member: { select: { fullName: true, phone: true, photo: true } },
        },
        orderBy: { scheduledDate: 'asc' },
      });

      // Assigned Members List
      const members = await prisma.trainerAssignment.findMany({
        where: { trainerId: trainer.id, status: AccountStatus.ACTIVE },
        include: {
          member: {
            include: {
              memberships: {
                where: { status: MembershipStatus.ACTIVE },
                include: { package: true },
              },
            },
          },
        },
      });

      dashboardData = {
        role: user.role,
        trainer,
        kpis: {
          assignedMembersCount: assignedCount,
          todaySessionsCount: todaySessions.length,
          totalUpcomingSessions: upcomingSessions.length,
        },
        todaySessions,
        upcomingSessions,
        assignedMembers: members.map((m) => m.member),
      };
    } else if (user.role === Role.MEMBER) {
      const totalMembers = await prisma.member.count();
      const member = await prisma.member.findFirst({
        where: { userId: user.id },
        include: {
          memberships: {
            include: { package: true },
            orderBy: { createdAt: 'desc' },
          },
          trainers: {
            where: { status: AccountStatus.ACTIVE },
            include: { trainer: true },
          },
        },
      });

      if (!member) {
        return res.status(404).json({ success: false, message: 'Member record not found' });
      }

      const activeMembership = member.memberships.find(
        (m) => m.status === MembershipStatus.ACTIVE && new Date(m.endDate) >= new Date()
      );

      // Attendance history (Last 10)
      const attendances = await prisma.attendance.findMany({
        where: { memberId: member.id },
        take: 10,
        orderBy: { createdAt: 'desc' },
      });

      // Total visits this month
      const monthlyVisits = await prisma.attendance.count({
        where: {
          memberId: member.id,
          status: 'GRANTED',
          date: { gte: firstDayOfMonth, lte: lastDayOfMonth },
        },
      });

      // Payment history
      const payments = await prisma.payment.findMany({
        where: { memberId: member.id },
        take: 5,
        orderBy: { paymentDate: 'desc' },
      });

      // Upcoming sessions
      const sessions = await prisma.trainingSession.findMany({
        where: { memberId: member.id, scheduledDate: { gte: today } },
        include: { trainer: true },
        orderBy: { scheduledDate: 'asc' },
      });

      dashboardData = {
        role: user.role,
        member,
        activeMembership,
        kpis: {
          totalMembers,
          monthlyVisits,
          membershipStatus: activeMembership ? 'ACTIVE' : 'EXPIRED/NONE',
          daysRemaining: activeMembership
            ? Math.max(0, Math.ceil((new Date(activeMembership.endDate).getTime() - Date.now()) / (1000 * 60 * 60 * 24)))
            : 0,
        },
        attendances,
        payments,
        sessions,
      };
    }

    // Cache result for 45 seconds.
    await cache.set(cacheKey, JSON.stringify(dashboardData), 45);

    res.json({ success: true, data: dashboardData, source: 'db' });
  } catch (error: any) {
    console.error('Dashboard error:', error);
    res.status(500).json({ success: false, message: 'Failed to load dashboard data' });
  }
};
