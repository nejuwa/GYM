import { Response } from 'express';
import { Prisma } from '@prisma/client';
import prisma from '../config/db';
import { AuthRequest } from '../middlewares/auth';
import { createAuditEntry } from '../middlewares/audit';
import { notifySessionScheduled } from '../services/notificationService';
import { AccountStatus, Role, SessionStatus } from '../types';
import { hashPassword } from '../utils/password';
import { getUploadedProfileImageUrl } from '../middlewares/profileImageUpload';

export const getTrainers = async (req: AuthRequest, res: Response) => {
  try {
    const { status, search } = req.query;
    const where: any = {};

    if (status && status !== 'ALL') where.status = status as string;
    if (search) {
      where.OR = [
        { fullName: { contains: String(search) } },
        { specialization: { contains: String(search) } },
        { phone: { contains: String(search) } },
      ];
    }

    const trainers = await prisma.trainer.findMany({
      where,
      include: {
        user: { select: { id: true, username: true, email: true, status: true } },
        assignedMembers: {
          where: { status: AccountStatus.ACTIVE },
          include: {
            member: {
              select: { id: true, memberCode: true, fullName: true, phone: true, photo: true },
            },
          },
        },
        _count: {
          select: { sessions: true },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    res.json({ success: true, count: trainers.length, trainers });
  } catch (error: any) {
    res.status(500).json({ success: false, message: 'Failed to fetch trainers' });
  }
};

export const getTrainerById = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const trainer = await prisma.trainer.findUnique({
      where: { id },
      include: {
        user: { select: { id: true, username: true, email: true, role: true } },
        assignedMembers: {
          include: {
            member: {
              include: {
                memberships: {
                  where: { status: 'ACTIVE' },
                  include: { package: true },
                },
              },
            },
          },
        },
        sessions: {
          include: { member: true },
          orderBy: { scheduledDate: 'desc' },
          take: 50,
        },
      },
    });

    if (!trainer) {
      return res.status(404).json({ success: false, message: 'Trainer not found' });
    }

    res.json({ success: true, trainer });
  } catch (error: any) {
    res.status(500).json({ success: false, message: 'Failed to fetch trainer details' });
  }
};

export const createTrainer = async (req: AuthRequest, res: Response) => {
  try {
    const { fullName, phone, email, specialization, bio, photo, password } = req.body;
    const normalizedPhoto = req.file ? getUploadedProfileImageUrl(req, req.file.filename) : photo;

    if (!fullName || !phone || !email || !specialization || !password) {
      return res.status(400).json({ success: false, message: 'Full name, phone, email, specialization, and password are required' });
    }

    const normalizedEmail = String(email).trim().toLowerCase();
    if (!/^(?=.*[A-Za-z])(?=.*\d).{6,}$/.test(String(password))) {
      return res.status(400).json({ success: false, message: 'Password must be at least 6 characters and include letters and numbers' });
    }

    const existingUser = await prisma.user.findFirst({
      where: { email: { equals: normalizedEmail, mode: 'insensitive' } },
    });
    if (existingUser) {
      return res.status(409).json({ success: false, message: 'A trainer with this email already exists' });
    }

    const passwordHash = await hashPassword(String(password));
    const { trainer } = await prisma.$transaction(async (tx) => {
      const baseUsername = normalizedEmail.split('@')[0].replace(/[^a-zA-Z0-9_]/g, '_') || 'trainer';
      let username = baseUsername;
      let suffix = 1;
      while (await tx.user.findUnique({ where: { username } })) {
        username = `${baseUsername}_${suffix}`;
        suffix += 1;
      }

      const user = await tx.user.create({
        data: {
          email: normalizedEmail,
          username,
          passwordHash,
          fullName,
          role: Role.TRAINER,
          status: AccountStatus.ACTIVE,
          phone,
          avatarUrl: normalizedPhoto || `https://api.dicebear.com/7.x/personas/svg?seed=${username}`,
        },
      });
      const trainer = await tx.trainer.create({
        data: {
          fullName,
          phone,
          email: normalizedEmail,
          specialization,
          bio: bio || null,
          photo: normalizedPhoto || `https://api.dicebear.com/7.x/personas/svg?seed=${fullName}`,
          userId: user.id,
          status: AccountStatus.ACTIVE,
        },
      });
      return { user, trainer };
    });

    createAuditEntry(req, 'CREATE_TRAINER', 'TRAINERS', `Registered trainer ${fullName} (${specialization})`);

    res.status(201).json({ success: true, message: 'Trainer registered successfully', trainer });
  } catch (error: any) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
      return res.status(409).json({ success: false, message: 'A trainer with this email already exists' });
    }
    console.error('Create trainer error:', error);
    res.status(500).json({ success: false, message: 'Failed to create trainer' });
  }
};

export const updateTrainer = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const { fullName, phone, email, specialization, bio, photo, status } = req.body;

    const existing = await prisma.trainer.findUnique({ where: { id } });
    if (!existing) {
      return res.status(404).json({ success: false, message: 'Trainer not found' });
    }

    const normalizedEmail = email !== undefined ? String(email).trim().toLowerCase() : existing.email;
    if (!normalizedEmail) {
      return res.status(400).json({ success: false, message: 'Trainer email is required for login' });
    }

    const emailChanged = normalizedEmail !== existing.email;
    if (emailChanged) {
      const existingUser = await prisma.user.findFirst({
        where: { email: { equals: normalizedEmail, mode: 'insensitive' } },
      });
      if (existingUser && existingUser.id !== existing.userId) {
        return res.status(409).json({ success: false, message: 'A trainer with this email already exists' });
      }
    }

    const uploadedPhoto = req.file ? getUploadedProfileImageUrl(req, req.file.filename) : undefined;
    const nextPhoto = uploadedPhoto ?? (photo !== undefined ? (photo || null) : existing.photo);
    const updated = await prisma.$transaction(async (tx) => {
      if (existing.userId) {
        await tx.user.update({
          where: { id: existing.userId },
          data: {
            email: normalizedEmail,
            fullName: fullName ?? existing.fullName,
            phone: phone ?? existing.phone,
            avatarUrl: nextPhoto,
          },
        });
      }
      return tx.trainer.update({
        where: { id },
        data: {
          fullName: fullName ?? existing.fullName,
          phone: phone ?? existing.phone,
          email: normalizedEmail,
          specialization: specialization ?? existing.specialization,
          bio: bio !== undefined ? bio : existing.bio,
          photo: nextPhoto,
          status: status ?? existing.status,
        },
      });
    });

    createAuditEntry(req, 'UPDATE_TRAINER', 'TRAINERS', `Updated trainer ${updated.fullName}`);

    res.json({ success: true, message: 'Trainer updated successfully', trainer: updated });
  } catch (error: any) {
    res.status(500).json({ success: false, message: 'Failed to update trainer' });
  }
};

export const assignMemberToTrainer = async (req: AuthRequest, res: Response) => {
  try {
    const { trainerId, memberId } = req.body;

    if (!trainerId || !memberId) {
      return res.status(400).json({ success: false, message: 'Trainer ID and Member ID are required' });
    }

    const trainer = await prisma.trainer.findUnique({ where: { id: trainerId } });
    const member = await prisma.member.findUnique({ where: { id: memberId } });

    if (!trainer || !member) {
      return res.status(404).json({ success: false, message: 'Trainer or Member not found' });
    }

    const assignment = await prisma.trainerAssignment.upsert({
      where: { trainerId_memberId: { trainerId, memberId } },
      update: { status: AccountStatus.ACTIVE },
      create: {
        trainerId,
        memberId,
        status: AccountStatus.ACTIVE,
      },
      include: { trainer: true, member: true },
    });

    createAuditEntry(
      req,
      'ASSIGN_TRAINER',
      'TRAINERS',
      `Assigned member ${member.fullName} to trainer ${trainer.fullName}`
    );

    res.json({ success: true, message: 'Member assigned to trainer successfully', assignment });
  } catch (error: any) {
    res.status(500).json({ success: false, message: 'Failed to assign member to trainer' });
  }
};

export const getTrainingSessions = async (req: AuthRequest, res: Response) => {
  try {
    const { trainerId, memberId, status, date } = req.query;
    const where: any = {};

    if (trainerId) where.trainerId = String(trainerId);
    if (memberId) where.memberId = String(memberId);
    if (status && status !== 'ALL') where.status = status as string;

    if (date) {
      const start = new Date(String(date));
      start.setHours(0, 0, 0, 0);
      const end = new Date(start);
      end.setDate(end.getDate() + 1);
      where.scheduledDate = { gte: start, lt: end };
    }

    // Role restrictions
    if (req.user?.role === Role.TRAINER) {
      const tr = await prisma.trainer.findFirst({ where: { userId: req.user.id } });
      if (tr) where.trainerId = tr.id;
    } else if (req.user?.role === Role.MEMBER) {
      const mb = await prisma.member.findFirst({ where: { userId: req.user.id } });
      if (mb) where.memberId = mb.id;
    }

    const sessions = await prisma.trainingSession.findMany({
      where,
      include: {
        trainer: { select: { id: true, fullName: true, phone: true, specialization: true } },
        member: { select: { id: true, memberCode: true, fullName: true, phone: true, photo: true } },
      },
      orderBy: [{ scheduledDate: 'asc' }, { startTime: 'asc' }],
    });

    res.json({ success: true, count: sessions.length, sessions });
  } catch (error: any) {
    res.status(500).json({ success: false, message: 'Failed to fetch training sessions' });
  }
};

export const createTrainingSession = async (req: AuthRequest, res: Response) => {
  try {
    const { trainerId, memberId, title, scheduledDate, startTime, endTime, notes } = req.body;

    if (!trainerId || !memberId || !title || !scheduledDate || !startTime || !endTime) {
      return res.status(400).json({ success: false, message: 'Required session fields are missing' });
    }

    const session = await prisma.trainingSession.create({
      data: {
        trainerId,
        memberId,
        title,
        scheduledDate: new Date(scheduledDate),
        startTime,
        endTime,
        notes: notes || null,
        status: SessionStatus.SCHEDULED,
      },
      include: { trainer: true, member: true },
    });

    createAuditEntry(
      req,
      'CREATE_SESSION',
      'TRAINERS',
      `Scheduled session "${title}" with trainer ${session.trainer.fullName} for member ${session.member.fullName}`
    );

    await notifySessionScheduled(
      session.memberId,
      session.trainer.userId,
      title,
      session.scheduledDate,
      session.startTime
    );

    res.status(201).json({ success: true, message: 'Session scheduled successfully', session });
  } catch (error: any) {
    console.error('Create session error:', error);
    res.status(500).json({ success: false, message: 'Failed to schedule training session' });
  }
};

export const updateTrainingSessionStatus = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const { status, notes } = req.body;

    const existing = await prisma.trainingSession.findUnique({ where: { id } });
    if (!existing) {
      return res.status(404).json({ success: false, message: 'Training session not found' });
    }

    const updated = await prisma.trainingSession.update({
      where: { id },
      data: {
        status: status !== undefined ? (status as string) : existing.status,
        notes: notes !== undefined ? notes : existing.notes,
      },
    });

    createAuditEntry(
      req,
      'UPDATE_SESSION_STATUS',
      'TRAINERS',
      `Session "${existing.title}" marked as ${updated.status}`
    );

    res.json({ success: true, message: `Session status updated to ${status}`, session: updated });
  } catch (error: any) {
    res.status(500).json({ success: false, message: 'Failed to update session status' });
  }
};

export const updateTrainingSession = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const { trainerId, memberId, title, scheduledDate, startTime, endTime, status, notes } = req.body;

    const existing = await prisma.trainingSession.findUnique({ where: { id } });
    if (!existing) {
      return res.status(404).json({ success: false, message: 'Training session not found' });
    }

    if (trainerId !== undefined) {
      const trainer = await prisma.trainer.findUnique({ where: { id: trainerId } });
      if (!trainer) return res.status(404).json({ success: false, message: 'Trainer not found' });
    }

    if (memberId !== undefined) {
      const member = await prisma.member.findUnique({ where: { id: memberId } });
      if (!member) return res.status(404).json({ success: false, message: 'Member not found' });
    }

    const updated = await prisma.trainingSession.update({
      where: { id },
      data: {
        trainerId: trainerId ?? existing.trainerId,
        memberId: memberId ?? existing.memberId,
        title: title ?? existing.title,
        scheduledDate: scheduledDate ? new Date(scheduledDate) : existing.scheduledDate,
        startTime: startTime ?? existing.startTime,
        endTime: endTime ?? existing.endTime,
        status: status ?? existing.status,
        notes: notes !== undefined ? notes : existing.notes,
      },
      include: { trainer: true, member: true },
    });

    createAuditEntry(req, 'UPDATE_SESSION', 'TRAINERS', `Updated training session "${updated.title}"`);
    res.json({ success: true, message: 'Training session updated successfully', session: updated });
  } catch (error: any) {
    res.status(500).json({ success: false, message: 'Failed to update training session' });
  }
};

export const deleteTrainingSession = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const existing = await prisma.trainingSession.findUnique({ where: { id } });
    if (!existing) {
      return res.status(404).json({ success: false, message: 'Training session not found' });
    }

    await prisma.trainingSession.delete({ where: { id } });
    createAuditEntry(req, 'DELETE_SESSION', 'TRAINERS', `Deleted training session "${existing.title}"`);
    res.json({ success: true, message: 'Training session deleted successfully' });
  } catch (error: any) {
    res.status(500).json({ success: false, message: 'Failed to delete training session' });
  }
};
