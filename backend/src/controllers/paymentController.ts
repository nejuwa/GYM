import { Response } from 'express';
import prisma from '../config/db';
import { AuthRequest } from '../middlewares/auth';
import { createAuditEntry } from '../middlewares/audit';
import { notifyPaymentReceived } from '../services/notificationService';
import { PaymentMethod, PaymentStatus, Role } from '../types';

export const getPayments = async (req: AuthRequest, res: Response) => {
  try {
    const { status, paymentMethod, memberId, startDate, endDate, search } = req.query;
    const where: any = {};

    if (status && status !== 'ALL') where.status = status as string;
    if (paymentMethod && paymentMethod !== 'ALL') where.paymentMethod = paymentMethod as string;
    if (memberId) where.memberId = String(memberId);

    if (startDate || endDate) {
      where.paymentDate = {};
      if (startDate) where.paymentDate.gte = new Date(String(startDate));
      if (endDate) where.paymentDate.lte = new Date(String(endDate));
    }

    if (search) {
      where.OR = [
        { receiptNumber: { contains: String(search) } },
        { member: { fullName: { contains: String(search) } } },
        { member: { memberCode: { contains: String(search) } } },
      ];
    }

    // If Member role, restrict to own payments
    if (req.user?.role === Role.MEMBER) {
      const ownMember = await prisma.member.findFirst({ where: { userId: req.user.id } });
      if (ownMember) {
        where.memberId = ownMember.id;
      }
    }

    const payments = await prisma.payment.findMany({
      where,
      include: {
        member: { select: { id: true, memberCode: true, fullName: true, phone: true, email: true } },
        membership: { include: { package: true } },
        recordedBy: { select: { id: true, username: true, fullName: true } },
      },
      orderBy: { paymentDate: 'desc' },
    });

    const totalAmount = payments
      .filter((p) => p.status === PaymentStatus.COMPLETED)
      .reduce((sum, p) => sum + p.amount, 0);

    res.json({ success: true, count: payments.length, totalAmount, payments });
  } catch (error: any) {
    res.status(500).json({ success: false, message: 'Failed to fetch payments' });
  }
};

export const getPaymentById = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const payment = await prisma.payment.findUnique({
      where: { id },
      include: {
        member: true,
        membership: { include: { package: true } },
        recordedBy: { select: { id: true, fullName: true, username: true } },
      },
    });

    if (!payment) {
      return res.status(404).json({ success: false, message: 'Payment record not found' });
    }

    // Receipt Structure for direct invoice printing
    const receiptData = {
      receiptNumber: payment.receiptNumber,
      date: payment.paymentDate,
      gymName: 'CHAGNI GYM & FITNESS CENTER',
      gymAddress: 'Main Fitness Boulevard, Chagni, Ethiopia',
      gymPhone: '+251 911 234 567',
      member: {
        name: payment.member.fullName,
        code: payment.member.memberCode,
        phone: payment.member.phone,
      },
      items: [
        {
          description: payment.membership?.package?.name
            ? `Membership Package: ${payment.membership.package.name} (${payment.membership.package.durationDays} Days)`
            : 'Gym Service Fee / General Payment',
          amount: payment.amount,
        },
      ],
      total: payment.amount,
      paymentMethod: payment.paymentMethod,
      status: payment.status,
      cashier: payment.recordedBy?.fullName || 'System Cashier',
      notes: payment.notes,
    };

    res.json({ success: true, payment, receipt: receiptData });
  } catch (error: any) {
    res.status(500).json({ success: false, message: 'Failed to retrieve payment details' });
  }
};

export const recordPayment = async (req: AuthRequest, res: Response) => {
  try {
    const { memberId, membershipId, amount, paymentMethod, notes, paymentDate } = req.body;

    if (!memberId || amount === undefined || Number(amount) <= 0) {
      return res.status(400).json({ success: false, message: 'Valid member and positive amount are required' });
    }

    const member = await prisma.member.findUnique({ where: { id: memberId } });
    if (!member) return res.status(404).json({ success: false, message: 'Member not found' });

    const count = await prisma.payment.count();
    const receiptNumber = `REC-${40000 + count + 1}`;

    const payment = await prisma.payment.create({
      data: {
        memberId,
        membershipId: membershipId || null,
        amount: Number(amount),
        paymentMethod: (paymentMethod as string) || PaymentMethod.CASH,
        status: PaymentStatus.COMPLETED,
        receiptNumber,
        notes: notes || null,
        paymentDate: paymentDate ? new Date(paymentDate) : new Date(),
        recordedById: req.user?.id,
      },
      include: {
        member: true,
        membership: { include: { package: true } },
      },
    });

    createAuditEntry(
      req,
      'RECORD_PAYMENT',
      'PAYMENTS',
      `Recorded payment of $${amount} (${paymentMethod}) for ${member.fullName}, Receipt: ${receiptNumber}`
    );

    await notifyPaymentReceived(memberId, Number(amount), receiptNumber);

    res.status(201).json({ success: true, message: 'Payment recorded successfully', payment });
  } catch (error: any) {
    console.error('Record payment error:', error);
    res.status(500).json({ success: false, message: 'Failed to record payment' });
  }
};

export const processRefund = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const { refundReason } = req.body;

    const payment = await prisma.payment.findUnique({
      where: { id },
      include: { member: true },
    });

    if (!payment) {
      return res.status(404).json({ success: false, message: 'Payment record not found' });
    }

    if (payment.status === PaymentStatus.REFUNDED) {
      return res.status(400).json({ success: false, message: 'This payment is already marked as refunded' });
    }

    const updated = await prisma.payment.update({
      where: { id },
      data: {
        status: PaymentStatus.REFUNDED,
        notes: payment.notes
          ? `${payment.notes} | Refunded on ${new Date().toLocaleDateString()}: ${refundReason || 'No reason provided'}`
          : `Refunded on ${new Date().toLocaleDateString()}: ${refundReason || 'No reason provided'}`,
      },
    });

    createAuditEntry(
      req,
      'PROCESS_REFUND',
      'PAYMENTS',
      `Processed refund of $${payment.amount} for receipt ${payment.receiptNumber} (${payment.member.fullName})`
    );

    res.json({ success: true, message: 'Refund processed successfully', payment: updated });
  } catch (error: any) {
    res.status(500).json({ success: false, message: 'Failed to process refund' });
  }
};
