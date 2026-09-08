import { Response } from 'express';
import prisma from '../config/db';
import { AuthRequest } from '../middlewares/auth';
import { createAuditEntry } from '../middlewares/audit';
import { cache } from '../config/memoryCache';
import { AccountStatus, AttendanceStatus, MembershipStatus, Role } from '../types';

export const getAttendances = async (req: AuthRequest, res: Response) => {
  try {
    const { date, memberId, status, search, limit } = req.query;
    const where: any = {};

    if (status && status !== 'ALL') where.status = status as string;
    if (memberId) where.memberId = String(memberId);

    if (date) {
      const targetDate = new Date(String(date));
      targetDate.setHours(0, 0, 0, 0);
      const nextDay = new Date(targetDate);
      nextDay.setDate(nextDay.getDate() + 1);

      where.createdAt = {
        gte: targetDate,
        lt: nextDay,
      };
    }

    if (search) {
      where.member = {
        OR: [
          { fullName: { contains: String(search) } },
          { memberCode: { contains: String(search) } },
        ],
      };
    }

    // If Member role, restrict to own records
    if (req.user?.role === Role.MEMBER) {
      const ownMember = await prisma.member.findFirst({ where: { userId: req.user.id } });
      if (ownMember) {
        where.memberId = ownMember.id;
      }
    }

    const attendances = await prisma.attendance.findMany({
      where,
      include: {
        member: {
          select: {
            id: true,
            memberCode: true,
            fullName: true,
            phone: true,
            photo: true,
            status: true,
            memberships: {
              where: { status: MembershipStatus.ACTIVE },
              include: { package: true },
              take: 1,
            },
          },
        },
      },
      orderBy: { createdAt: 'desc' },
      take: limit ? Number(limit) : 100,
    });

    res.json({ success: true, count: attendances.length, attendances });
  } catch (error: any) {
    res.status(500).json({ success: false, message: 'Failed to fetch attendance records' });
  }
};

export const checkInQR = async (req: AuthRequest, res: Response) => {
  try {
    const { qrData, memberCode } = req.body;

    if (!qrData && !memberCode) {
      return res.status(400).json({
        success: false,
        granted: false,
        message: 'QR code data or Member Code is required',
      });
    }

    let parsedCode = memberCode;
    if (qrData) {
      try {
        const parsed = JSON.parse(qrData);
        parsedCode = parsed.code || qrData;
      } catch {
        parsedCode = qrData;
      }
    }

    // Prevent rapid duplicate scans with a 15-second in-process lock.
    const scanLockKey = `scan_lock:${parsedCode}`;
    const recentScan = await cache.get(scanLockKey);
    if (recentScan) {
      return res.status(429).json({
        success: false,
        granted: false,
        message: 'Access recently processed. Please wait a moment before scanning again.',
      });
    }

    // Find member
    const member = await prisma.member.findFirst({
      where: {
        OR: [{ memberCode: parsedCode }, { qrCode: qrData }, { id: parsedCode }],
      },
      include: {
        memberships: {
          include: { package: true },
          orderBy: { endDate: 'desc' },
        },
      },
    });

    if (!member) {
      createAuditEntry(req, 'QR_SCAN_UNKNOWN', 'ATTENDANCE', `Unrecognized QR scan payload: ${parsedCode}`, 'FAILURE');
      return res.status(404).json({
        success: false,
        granted: false,
        message: 'Member record not found for this QR code',
      });
    }

    // Check Member account status
    if (member.status !== AccountStatus.ACTIVE) {
      const attendance = await prisma.attendance.create({
        data: {
          memberId: member.id,
          status: AttendanceStatus.REJECTED,
          rejectionReason: `Member account is ${member.status.toLowerCase()}`,
          accessMethod: 'QR_SCAN',
          verifiedBy: req.user?.username || 'Scanner Kiosk',
        },
      });

      return res.status(403).json({
        success: false,
        granted: false,
        rejectionReason: `Account is ${member.status.toLowerCase()}`,
        member: { id: member.id, fullName: member.fullName, memberCode: member.memberCode, photo: member.photo },
        attendance,
      });
    }

    // Check Active Membership
    const now = new Date();
    const activeMembership = member.memberships.find(
      (m) => m.status === MembershipStatus.ACTIVE && new Date(m.endDate) >= now && new Date(m.startDate) <= now
    );

    if (!activeMembership) {
      // Find latest expired or suspended membership to give helpful feedback
      const latestMembership = member.memberships[0];
      const reason = latestMembership
        ? `Membership ${latestMembership.package?.name || ''} is ${latestMembership.status.toLowerCase()} (ended ${new Date(latestMembership.endDate).toLocaleDateString()})`
        : 'No active membership package found';

      const attendance = await prisma.attendance.create({
        data: {
          memberId: member.id,
          status: AttendanceStatus.REJECTED,
          rejectionReason: reason,
          accessMethod: 'QR_SCAN',
          verifiedBy: req.user?.username || 'Scanner Kiosk',
        },
      });

      return res.status(403).json({
        success: false,
        granted: false,
        rejectionReason: reason,
        member: { id: member.id, fullName: member.fullName, memberCode: member.memberCode, photo: member.photo },
        attendance,
      });
    }

    // Grant Entry!
    const attendance = await prisma.attendance.create({
      data: {
        memberId: member.id,
        status: AttendanceStatus.GRANTED,
        accessMethod: 'QR_SCAN',
        verifiedBy: req.user?.username || 'Scanner Kiosk',
      },
    });

    // Set the 15-second debounce lock.
    await cache.set(scanLockKey, 'locked', 15);

    // Invalidate dashboard caches to show the live check-in count.
    await cache.flushPattern('dashboard:*');

    res.json({
      success: true,
      granted: true,
      message: `Welcome, ${member.fullName}! Access Granted.`,
      member: {
        id: member.id,
        fullName: member.fullName,
        memberCode: member.memberCode,
        photo: member.photo,
        packageName: activeMembership.package.name,
        daysRemaining: Math.ceil((new Date(activeMembership.endDate).getTime() - now.getTime()) / (1000 * 60 * 60 * 24)),
      },
      attendance,
    });
  } catch (error: any) {
    console.error('QR Check-in error:', error);
    res.status(500).json({ success: false, granted: false, message: 'Check-in processing error' });
  }
};

export const manualCheckIn = async (req: AuthRequest, res: Response) => {
  try {
    const { memberId, status, rejectionReason } = req.body;

    if (!memberId) {
      return res.status(400).json({ success: false, message: 'Member ID is required' });
    }

    const member = await prisma.member.findUnique({
      where: { id: memberId },
      include: { memberships: { where: { status: MembershipStatus.ACTIVE } } },
    });

    if (!member) return res.status(404).json({ success: false, message: 'Member not found' });

    const attendance = await prisma.attendance.create({
      data: {
        memberId,
        status: (status as string) || AttendanceStatus.GRANTED,
        rejectionReason: status === AttendanceStatus.REJECTED ? (rejectionReason || 'Manual staff override') : null,
        accessMethod: 'MANUAL',
        verifiedBy: req.user?.username || 'Staff',
      },
    });

    createAuditEntry(req, 'MANUAL_CHECKIN', 'ATTENDANCE', `Manual check-in recorded for ${member.fullName}`);

    res.status(201).json({ success: true, message: 'Attendance recorded', attendance });
  } catch (error: any) {
    res.status(500).json({ success: false, message: 'Failed to record manual attendance' });
  }
};

export const correctAttendance = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const { status, rejectionReason, entryTime, exitTime } = req.body;

    const existing = await prisma.attendance.findUnique({ where: { id } });
    if (!existing) {
      return res.status(404).json({ success: false, message: 'Attendance record not found' });
    }

    const isStaff = req.user?.role === Role.OWNER || req.user?.role === Role.MANAGER;
    if (!isStaff) {
      const member = await prisma.member.findFirst({ where: { userId: req.user?.id } });
      if (!member || member.id !== existing.memberId) {
        return res.status(403).json({ success: false, message: 'You can only correct your own attendance records.' });
      }
    }

    const updated = await prisma.attendance.update({
      where: { id },
      data: {
        status: status !== undefined ? (status as string) : existing.status,
        rejectionReason: rejectionReason !== undefined ? rejectionReason : existing.rejectionReason,
        entryTime: entryTime ? new Date(entryTime) : existing.entryTime,
        exitTime: exitTime ? new Date(exitTime) : existing.exitTime,
      },
    });

    createAuditEntry(req, 'CORRECT_ATTENDANCE', 'ATTENDANCE', `Corrected attendance record ID ${id}`);

    res.json({ success: true, message: 'Attendance corrected successfully', attendance: updated });
  } catch (error: any) {
    res.status(500).json({ success: false, message: 'Failed to correct attendance' });
  }
};
