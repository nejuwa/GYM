import { Request, Response } from 'express';
import QRCode from 'qrcode';
import prisma from '../config/db';
import { AuthRequest } from '../middlewares/auth';
import { createAuditEntry } from '../middlewares/audit';
import { AccountStatus, MembershipStatus, Role } from '../types';
import { hashPassword } from '../utils/password';
import { getUploadedProfileImageUrl } from '../middlewares/profileImageUpload';

export const getMembers = async (req: AuthRequest, res: Response) => {
  try {
    const { status, search, membershipStatus } = req.query;
    const where: any = {};

    if (status && status !== 'ALL') where.status = status as string;
    if (search) {
      where.OR = [
        { fullName: { contains: String(search) } },
        { memberCode: { contains: String(search) } },
        { phone: { contains: String(search) } },
        { email: { contains: String(search) } },
      ];
    }

    if (membershipStatus && membershipStatus !== 'ALL') {
      where.memberships = {
        some: { status: membershipStatus as string },
      };
    }

    // Trainers only see the clients assigned to them
    if (req.user?.role === Role.TRAINER) {
      const trainer = await prisma.trainer.findFirst({ where: { userId: req.user.id } });
      if (!trainer) return res.json({ success: true, count: 0, members: [] });
      where.trainers = { some: { trainerId: trainer.id, status: AccountStatus.ACTIVE } };
    }

    const members = await prisma.member.findMany({
      where,
      include: {
        memberships: {
          include: { package: true },
          orderBy: { createdAt: 'desc' },
          take: 1,
        },
        trainers: {
          where: { status: AccountStatus.ACTIVE },
          include: { trainer: true },
          take: 1,
        },
        _count: {
          select: { attendances: true, payments: true },
        },
      },
      orderBy: { registrationDate: 'desc' },
    });

    res.json({ success: true, count: members.length, members });
  } catch (error: any) {
    console.error('Error fetching members:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch members' });
  }
};

export const getMemberById = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;

    // If Member role, ensure they can only view their own profile
    if (req.user?.role === Role.MEMBER) {
      const ownMember = await prisma.member.findFirst({ where: { userId: req.user.id } });
      if (!ownMember || ownMember.id !== id) {
        return res.status(403).json({ success: false, message: 'Access denied to other member records' });
      }
    }

    const member = await prisma.member.findUnique({
      where: { id },
      include: {
        user: { select: { id: true, email: true, username: true, role: true, status: true } },
        memberships: {
          include: { package: true },
          orderBy: { createdAt: 'desc' },
        },
        attendances: {
          orderBy: { createdAt: 'desc' },
          take: 30,
        },
        payments: {
          orderBy: { paymentDate: 'desc' },
        },
        trainers: {
          include: { trainer: true },
        },
        sessions: {
          include: { trainer: true },
          orderBy: { scheduledDate: 'desc' },
        },
      },
    });

    if (!member) {
      return res.status(404).json({ success: false, message: 'Member not found' });
    }

    res.json({ success: true, member });
  } catch (error: any) {
    res.status(500).json({ success: false, message: 'Failed to fetch member details' });
  }
};

export const createMember = async (req: AuthRequest, res: Response) => {
  try {
    const {
      fullName,
      gender,
      dateOfBirth,
      phone,
      email,
      address,
      photo,
      emergencyContact,
      initialPackageId,
      password,
      username,
    } = req.body;

    if (!fullName || !phone || !gender || !password) {
      return res.status(400).json({ success: false, message: 'Full name, phone, gender, and password are required' });
    }

    const uploadedPhoto = req.file ? getUploadedProfileImageUrl(req, req.file.filename) : undefined;
    const normalizedPhoto = uploadedPhoto ?? photo;
    const normalizedEmail = email ? String(email).trim().toLowerCase() : null;
    const normalizedUsername = username
      ? String(username).trim()
      : (normalizedEmail ? normalizedEmail.split('@')[0] : `member${Date.now()}`);

    if (!/^(?=.*[A-Za-z])(?=.*\d).{6,}$/.test(String(password))) {
      return res.status(400).json({ success: false, message: 'Password must be at least 6 characters and include letters and numbers' });
    }

    const duplicateUser = await prisma.user.findFirst({
      where: {
        OR: [
          ...(normalizedEmail ? [{ email: { equals: normalizedEmail, mode: 'insensitive' as const } }] : []),
          { username: { equals: normalizedUsername, mode: 'insensitive' as const } },
        ],
      },
    });

    if (duplicateUser) {
      return res.status(400).json({ success: false, message: 'An account with this username or email already exists' });
    }

    const packageId = initialPackageId
      || (await prisma.package.findFirst({ where: { status: AccountStatus.ACTIVE }, orderBy: { price: 'asc' } }))?.id;
    if (!packageId) {
      return res.status(400).json({ success: false, message: 'No active membership package is available yet' });
    }

    const passwordHash = await hashPassword(String(password));
    const { user, member } = await prisma.$transaction(async (tx) => {
      const user = await tx.user.create({
        data: {
          email: normalizedEmail || `${normalizedUsername}@gymmis.local`,
          username: normalizedUsername,
          passwordHash,
          fullName,
          role: Role.MEMBER,
          status: AccountStatus.ACTIVE,
          phone,
          avatarUrl: normalizedPhoto || `https://api.dicebear.com/7.x/avataaars/svg?seed=${normalizedUsername}`,
        },
      });

      const count = await tx.member.count();
      const memberCode = `CHG-${1000 + count + 1}`;
      const qrCodePayload = JSON.stringify({ code: memberCode, gym: 'CHAGNI_GYM', created: new Date().toISOString() });
      const member = await tx.member.create({
        data: {
          userId: user.id,
          memberCode,
          fullName,
          gender,
          dateOfBirth: dateOfBirth ? new Date(dateOfBirth) : null,
          phone,
          email: normalizedEmail,
          address: address || null,
          photo: normalizedPhoto || `https://api.dicebear.com/7.x/shapes/svg?seed=${memberCode}`,
          emergencyContact: emergencyContact || null,
          status: AccountStatus.ACTIVE,
          qrCode: qrCodePayload,
        },
      });

      const pkg = await tx.package.findUnique({ where: { id: packageId } });
      if (!pkg) {
        throw new Error('Package not found');
      }

        const startDate = new Date();
        const endDate = new Date();
        endDate.setDate(endDate.getDate() + pkg.durationDays);

        const membership = await tx.membership.create({
          data: {
            memberId: member.id,
            packageId: pkg.id,
            startDate,
            endDate,
            status: MembershipStatus.ACTIVE,
            pricePaid: pkg.price,
            notes: 'Membership created by authorized staff',
          },
        });

        const payCount = await tx.payment.count();
        await tx.payment.create({
          data: {
            memberId: member.id,
            membershipId: membership.id,
            amount: pkg.price,
            paymentMethod: 'CASH',
            status: 'COMPLETED',
            receiptNumber: `REC-${10000 + payCount + 1}`,
            recordedById: req.user?.id,
            notes: `Initial registration fee for package ${pkg.name}`,
          },
        });

      return { user, member };
    });

    createAuditEntry(req, 'CREATE_MEMBER', 'MEMBERS', `Registered new member ${fullName} (${member.memberCode})`);

    res.status(201).json({
      success: true,
      message: 'Member registered successfully. Login account and membership are active.',
      member,
      user: { id: user.id, username: user.username, email: user.email, role: user.role },
    });
  } catch (error: any) {
    console.error('Create member error:', error);
    if (error?.message === 'Package not found') {
      return res.status(404).json({ success: false, message: 'Package not found' });
    }
    res.status(500).json({ success: false, message: 'Failed to create member' });
  }
};

export const updateMember = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const { fullName, gender, dateOfBirth, phone, email, address, photo, emergencyContact, status } = req.body;

    const existing = await prisma.member.findUnique({ where: { id } });
    if (!existing) {
      return res.status(404).json({ success: false, message: 'Member not found' });
    }

    const uploadedPhoto = req.file ? getUploadedProfileImageUrl(req, req.file.filename) : undefined;
    const nextPhoto = uploadedPhoto ?? (photo !== undefined ? (photo || null) : existing.photo);
    const photoChanged = uploadedPhoto !== undefined || photo !== undefined;
    const updated = await prisma.$transaction(async (tx) => {
      const member = await tx.member.update({
        where: { id },
        data: {
          fullName: fullName ?? existing.fullName,
          gender: gender ?? existing.gender,
          dateOfBirth: dateOfBirth ? new Date(dateOfBirth) : existing.dateOfBirth,
          phone: phone ?? existing.phone,
          email: email !== undefined ? email : existing.email,
          address: address !== undefined ? address : existing.address,
          photo: nextPhoto,
          emergencyContact: emergencyContact !== undefined ? emergencyContact : existing.emergencyContact,
          status: status ?? existing.status,
        },
      });

      if (existing.userId && photoChanged) {
        await tx.user.update({
          where: { id: existing.userId },
          data: { avatarUrl: nextPhoto },
        });
      }

      return member;
    });

    createAuditEntry(req, 'UPDATE_MEMBER', 'MEMBERS', `Updated member information for ${updated.fullName} (${updated.memberCode})`);

    res.json({ success: true, message: 'Member updated successfully', member: updated });
  } catch (error: any) {
    res.status(500).json({ success: false, message: 'Failed to update member' });
  }
};

export const getMemberQRCode = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    if (req.user?.role === Role.MEMBER) {
      const ownMember = await prisma.member.findFirst({ where: { userId: req.user.id } });
      if (!ownMember || ownMember.id !== id) {
        return res.status(403).json({ success: false, message: 'Access denied to other member records' });
      }
    }

    const member = await prisma.member.findUnique({
      where: { id },
      include: {
        memberships: {
          where: { status: MembershipStatus.ACTIVE },
          include: { package: true },
          take: 1,
        },
      },
    });

    if (!member) {
      return res.status(404).json({ success: false, message: 'Member not found' });
    }

    // Generate Base64 Data URL for the QR code image
    const qrDataUrl = await QRCode.toDataURL(member.qrCode, {
      errorCorrectionLevel: 'H',
      margin: 2,
      scale: 8,
      color: {
        dark: '#0f172a',
        light: '#ffffff',
      },
    });

    res.json({
      success: true,
      member: {
        id: member.id,
        memberCode: member.memberCode,
        fullName: member.fullName,
        status: member.status,
        activeMembership: member.memberships[0] || null,
      },
      qrCodeData: member.qrCode,
      qrImage: qrDataUrl,
    });
  } catch (error: any) {
    res.status(500).json({ success: false, message: 'Failed to generate QR code' });
  }
};
