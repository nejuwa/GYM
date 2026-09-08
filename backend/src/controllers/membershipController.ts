import { Response } from 'express';
import prisma from '../config/db';
import { AuthRequest } from '../middlewares/auth';
import { createAuditEntry } from '../middlewares/audit';
import { MembershipStatus, PaymentMethod, Role } from '../types';
import { notifyMembershipActivated, notifyPaymentReceived } from '../services/notificationService';

export const getMemberships = async (req: AuthRequest, res: Response) => {
  try {
    const { status, memberId, search } = req.query;
    const where: any = {};

    if (status && status !== 'ALL') where.status = status as string;
    if (memberId) where.memberId = String(memberId);

    // Members only ever see their own subscription history
    if (req.user?.role === Role.MEMBER) {
      const ownMember = await prisma.member.findFirst({ where: { userId: req.user.id } });
      if (!ownMember) return res.json({ success: true, count: 0, memberships: [] });
      where.memberId = ownMember.id;
    }

    if (search) {
      where.member = {
        OR: [
          { fullName: { contains: String(search) } },
          { memberCode: { contains: String(search) } },
        ],
      };
    }

    const memberships = await prisma.membership.findMany({
      where,
      include: {
        member: {
          select: { id: true, memberCode: true, fullName: true, phone: true, photo: true, status: true },
        },
        package: true,
        payments: {
          orderBy: { paymentDate: 'desc' },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    res.json({ success: true, count: memberships.length, memberships });
  } catch (error: any) {
    res.status(500).json({ success: false, message: 'Failed to fetch memberships' });
  }
};

export const getMembershipById = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const membership = await prisma.membership.findUnique({
      where: { id },
      include: {
        member: true,
        package: true,
        payments: { orderBy: { paymentDate: 'desc' } },
      },
    });

    if (!membership) {
      return res.status(404).json({ success: false, message: 'Membership not found' });
    }

    if (req.user?.role === Role.MEMBER) {
      const ownMember = await prisma.member.findFirst({ where: { userId: req.user.id } });
      if (!ownMember || ownMember.id !== membership.memberId) {
        return res.status(403).json({ success: false, message: 'Access denied to other member records' });
      }
    }

    res.json({ success: true, membership });
  } catch (error: any) {
    res.status(500).json({ success: false, message: 'Failed to retrieve membership' });
  }
};

export const createMembership = async (req: AuthRequest, res: Response) => {
  try {
    const { memberId, packageId, startDate, pricePaid, paymentMethod, notes, autoRenew } = req.body;

    if (!memberId || !packageId) {
      return res.status(400).json({ success: false, message: 'Member ID and Package ID are required' });
    }

    const member = await prisma.member.findUnique({ where: { id: memberId } });
    if (!member) return res.status(404).json({ success: false, message: 'Member not found' });

    const pkg = await prisma.package.findUnique({ where: { id: packageId } });
    if (!pkg) return res.status(404).json({ success: false, message: 'Package not found' });

    const start = startDate ? new Date(startDate) : new Date();
    const end = new Date(start);
    end.setDate(end.getDate() + pkg.durationDays);

    const paid = pricePaid !== undefined ? Number(pricePaid) : pkg.price;

    const { membership, payment, receiptNumber } = await prisma.$transaction(async (tx) => {
      const membership = await tx.membership.create({
        data: {
          memberId,
          packageId,
          startDate: start,
          endDate: end,
          status: MembershipStatus.ACTIVE,
          autoRenew: Boolean(autoRenew),
          pricePaid: paid,
          notes: notes || null,
        },
        include: { package: true, member: true },
      });

      const paymentCount = await tx.payment.count();
      const receiptNumber = `REC-${20000 + paymentCount + 1}`;
      const payment = await tx.payment.create({
        data: {
          memberId,
          membershipId: membership.id,
          amount: paid,
          paymentDate: new Date(),
          paymentMethod: (paymentMethod as string) || PaymentMethod.CASH,
          status: 'COMPLETED',
          receiptNumber,
          recordedById: req.user?.id,
          notes: `Subscription payment for ${pkg.name}`,
        },
      });

      return { membership, payment, receiptNumber };
    });

    createAuditEntry(
      req,
      'CREATE_MEMBERSHIP',
      'MEMBERSHIP',
      `Registered membership for ${member.fullName} with package ${pkg.name} until ${end.toISOString().split('T')[0]}`
    );

    await notifyMembershipActivated(memberId, pkg.name, end);
    await notifyPaymentReceived(memberId, paid, receiptNumber);

    res.status(201).json({
      success: true,
      message: 'Membership registered successfully',
      membership,
      payment,
    });
  } catch (error: any) {
    console.error('Create membership error:', error);
    res.status(500).json({ success: false, message: 'Failed to create membership' });
  }
};

export const renewMembership = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const { packageId, pricePaid, paymentMethod, notes } = req.body;

    const existing = await prisma.membership.findUnique({
      where: { id },
      include: { package: true, member: true },
    });

    if (!existing) {
      return res.status(404).json({ success: false, message: 'Membership not found' });
    }

    // Determine package for renewal (existing or newly selected)
    const targetPkgId = packageId || existing.packageId;
    const targetPkg = await prisma.package.findUnique({ where: { id: targetPkgId } });
    if (!targetPkg) return res.status(404).json({ success: false, message: 'Package not found' });

    // Calculate new start date: if currently active, start from existing end date, else today
    const now = new Date();
    const currentEnd = new Date(existing.endDate);
    const newStart = currentEnd > now ? currentEnd : now;
    const newEnd = new Date(newStart);
    newEnd.setDate(newEnd.getDate() + targetPkg.durationDays);

    const paid = pricePaid !== undefined ? Number(pricePaid) : targetPkg.price;

    const { updatedMembership, payment, receiptNumber } = await prisma.$transaction(async (tx) => {
      const updatedMembership = await tx.membership.update({
        where: { id },
        data: {
          packageId: targetPkg.id,
          startDate: newStart,
          endDate: newEnd,
          status: MembershipStatus.ACTIVE,
          pricePaid: paid,
          notes: notes || existing.notes,
        },
        include: { package: true, member: true },
      });

      const paymentCount = await tx.payment.count();
      const receiptNumber = `REC-${30000 + paymentCount + 1}`;
      const payment = await tx.payment.create({
        data: {
          memberId: existing.memberId,
          membershipId: existing.id,
          amount: paid,
          paymentDate: new Date(),
          paymentMethod: (paymentMethod as string) || PaymentMethod.CASH,
          status: 'COMPLETED',
          receiptNumber,
          recordedById: req.user?.id,
          notes: `Renewal payment for ${targetPkg.name} through ${newEnd.toISOString().split('T')[0]}`,
        },
      });

      return { updatedMembership, payment, receiptNumber };
    });

    createAuditEntry(
      req,
      'RENEW_MEMBERSHIP',
      'MEMBERSHIP',
      `Renewed membership for ${existing.member.fullName} until ${newEnd.toISOString().split('T')[0]}`
    );

    await notifyMembershipActivated(existing.memberId, targetPkg.name, newEnd);
    await notifyPaymentReceived(existing.memberId, paid, receiptNumber);

    res.json({
      success: true,
      message: 'Membership renewed successfully',
      membership: updatedMembership,
      payment,
    });
  } catch (error: any) {
    console.error('Renew membership error:', error);
    res.status(500).json({ success: false, message: 'Failed to renew membership' });
  }
};

export const updateMembershipStatus = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const { status, notes } = req.body;

    if (!status) {
      return res.status(400).json({ success: false, message: 'Status is required' });
    }

    const membership = await prisma.membership.findUnique({
      where: { id },
      include: { member: true },
    });

    if (!membership) {
      return res.status(404).json({ success: false, message: 'Membership not found' });
    }

    const updated = await prisma.membership.update({
      where: { id },
      data: {
        status: status as string,
        notes: notes !== undefined ? notes : membership.notes,
      },
    });

    createAuditEntry(
      req,
      'UPDATE_MEMBERSHIP_STATUS',
      'MEMBERSHIP',
      `Changed membership status for ${membership.member.fullName} to ${status}`
    );

    res.json({ success: true, message: `Membership status updated to ${status}`, membership: updated });
  } catch (error: any) {
    res.status(500).json({ success: false, message: 'Failed to update membership status' });
  }
};
