import { Response } from 'express';
import prisma from '../config/db';
import { AuthRequest } from '../middlewares/auth';
import { createAuditEntry } from '../middlewares/audit';
import { Role, AccountStatus, NotificationType } from '../types';
import { notify } from '../services/notificationService';
import { hashPassword } from '../utils/password';
import { assertUserSelfActionAllowed, hardDeleteUserAccount, UserSelfActionError } from '../services/userService';

export const getUsers = async (req: AuthRequest, res: Response) => {
  try {
    const { role, status, search } = req.query;
    const where: any = {};

    if (role && role !== 'ALL') where.role = role as string;
    if (status && status !== 'ALL') where.status = status as string;
    if (search) {
      where.OR = [
        { fullName: { contains: String(search) } },
        { email: { contains: String(search) } },
        { username: { contains: String(search) } },
      ];
    }

    const users = await prisma.user.findMany({
      where,
      select: {
        id: true,
        email: true,
        username: true,
        fullName: true,
        role: true,
        status: true,
        phone: true,
        avatarUrl: true,
        lastLogin: true,
        createdAt: true,
      },
      orderBy: { createdAt: 'desc' },
    });

    res.json({ success: true, count: users.length, users });
  } catch (error: any) {
    res.status(500).json({ success: false, message: 'Failed to fetch users' });
  }
};

export const getUserById = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const user = await prisma.user.findUnique({
      where: { id },
      include: {
        memberProfile: true,
        trainerProfile: true,
      },
    });

    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    const { passwordHash, ...userWithoutPassword } = user;
    res.json({ success: true, user: userWithoutPassword });
  } catch (error: any) {
    res.status(500).json({ success: false, message: 'Error retrieving user' });
  }
};

export const createUser = async (req: AuthRequest, res: Response) => {
  try {
    const { email, username, password, fullName, role, phone, avatarUrl } = req.body;

    if (!email || !username || !password || !fullName || !role) {
      return res.status(400).json({ success: false, message: 'Required fields are missing' });
    }

    const normalizedEmail = String(email).trim().toLowerCase();
    const normalizedUsername = String(username).trim();

    // Only OWNER can create OWNER or MANAGER accounts
    if (role === Role.OWNER && req.user?.role !== Role.OWNER) {
      return res.status(403).json({ success: false, message: 'Only an Owner can create another Owner account' });
    }

    const existing = await prisma.user.findFirst({
      where: {
        OR: [
          { email: { equals: normalizedEmail, mode: 'insensitive' as const } },
          { username: { equals: normalizedUsername, mode: 'insensitive' as const } },
        ],
      },
    });

    if (existing) {
      return res.status(400).json({ success: false, message: 'User with this email or username already exists' });
    }

    const passwordHash = await hashPassword(password);
    const newUser = await prisma.user.create({
      data: {
        email: normalizedEmail,
        username: normalizedUsername,
        passwordHash,
        fullName,
        role,
        phone: phone || null,
        avatarUrl: avatarUrl || `https://api.dicebear.com/7.x/avataaars/svg?seed=${normalizedUsername}`,
        status: AccountStatus.ACTIVE,
      },
    });

    createAuditEntry(req, 'CREATE_USER', 'USERS', `Created user ${username} with role ${role}`);

    const { passwordHash: _, ...createdUser } = newUser;
    res.status(201).json({ success: true, message: 'User created successfully', user: createdUser });
  } catch (error: any) {
    console.error('Create user error:', error);
    res.status(500).json({ success: false, message: 'Failed to create user' });
  }
};

export const updateUser = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const { fullName, phone, avatarUrl, status, role, password } = req.body;

    if (status === AccountStatus.SUSPENDED || status === AccountStatus.DEACTIVATED) {
      assertUserSelfActionAllowed(
        req.user?.id,
        id,
        status === AccountStatus.SUSPENDED ? 'SUSPEND' : 'DEACTIVATE'
      );
    }

    const existingUser = await prisma.user.findUnique({ where: { id } });
    if (!existingUser) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    // Prevent non-owner from elevating someone to Owner or demoting Owner
    if (role && role === Role.OWNER && req.user?.role !== Role.OWNER) {
      return res.status(403).json({ success: false, message: 'Only an Owner can assign Owner role' });
    }

    const updateData: any = {};
    if (fullName !== undefined) updateData.fullName = fullName;
    if (phone !== undefined) updateData.phone = phone;
    if (avatarUrl !== undefined) updateData.avatarUrl = avatarUrl;
    if (status !== undefined) updateData.status = status;
    if (role !== undefined) updateData.role = role;
    if (password) {
      updateData.passwordHash = await hashPassword(password);
    }

    const updatedUser = await prisma.user.update({
      where: { id },
      data: updateData,
    });

    createAuditEntry(req, 'UPDATE_USER', 'USERS', `Updated user details for ${existingUser.username}`);

    const { passwordHash: _, ...safeUser } = updatedUser;
    res.json({ success: true, message: 'User updated successfully', user: safeUser });
  } catch (error: any) {
    if (error instanceof UserSelfActionError) {
      return res.status(error.statusCode).json({ success: false, message: error.message });
    }
    res.status(500).json({ success: false, message: 'Failed to update user' });
  }
};

export const toggleUserStatus = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    if (!status || !['ACTIVE', 'SUSPENDED', 'DEACTIVATED'].includes(status)) {
      return res.status(400).json({ success: false, message: 'Invalid status value' });
    }

    if (status === AccountStatus.SUSPENDED || status === AccountStatus.DEACTIVATED) {
      assertUserSelfActionAllowed(
        req.user?.id,
        id,
        status === AccountStatus.SUSPENDED ? 'SUSPEND' : 'DEACTIVATE'
      );
    }

    const user = await prisma.user.findUnique({ where: { id } });
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    if (user.role === Role.OWNER && req.user?.role !== Role.OWNER) {
      return res.status(403).json({ success: false, message: 'Cannot modify Owner account status' });
    }

    const updated = await prisma.user.update({
      where: { id },
      data: { status },
    });

    createAuditEntry(req, 'CHANGE_USER_STATUS', 'USERS', `Changed user ${user.username} status to ${status}`);

    res.json({ success: true, message: `User status changed to ${status}`, user: updated });
  } catch (error: any) {
    if (error instanceof UserSelfActionError) {
      return res.status(error.statusCode).json({ success: false, message: error.message });
    }
    res.status(500).json({ success: false, message: 'Failed to change user status' });
  }
};

export const deleteUser = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    assertUserSelfActionAllowed(req.user?.id, id, 'DELETE');

    const user = await prisma.user.findUnique({ where: { id } });
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    if (user.role === Role.OWNER) {
      return res.status(403).json({ success: false, message: 'Owner accounts cannot be deleted from this interface' });
    }

    if (req.user?.role !== Role.OWNER) {
      return res.status(403).json({ success: false, message: 'Only the Owner can delete users' });
    }

    await hardDeleteUserAccount(req.user?.id, id);

    createAuditEntry(req, 'DELETE_USER', 'USERS', `Permanently deleted user ${user.username} and all associated records`);

    res.json({ success: true, message: `User ${user.username} and all associated data have been permanently deleted` });
  } catch (error: any) {
    if (error instanceof UserSelfActionError) {
      return res.status(error.statusCode).json({ success: false, message: error.message });
    }
    console.error('Delete user error:', error);
    res.status(500).json({ success: false, message: 'Failed to delete user' });
  }
};

export const resetUserPassword = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const { newPassword } = req.body;

    if (!newPassword || String(newPassword).length < 6) {
      return res
        .status(400)
        .json({ success: false, message: 'New password must be at least 6 characters' });
    }

    const user = await prisma.user.findUnique({ where: { id } });
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    if (user.role === Role.OWNER && req.user?.role !== Role.OWNER) {
      return res.status(403).json({ success: false, message: 'Cannot reset an Owner password' });
    }

    await prisma.user.update({
      where: { id },
      data: { passwordHash: await hashPassword(String(newPassword)) },
    });

    createAuditEntry(req, 'RESET_PASSWORD', 'USERS', `Reset password for user ${user.username}`);

    await notify({
      recipientId: user.id,
      title: 'Password Reset',
      message: 'An administrator reset your password. Please sign in and change it.',
      type: NotificationType.SYSTEM,
    });

    res.json({ success: true, message: `Password reset for ${user.username}` });
  } catch (error: any) {
    res.status(500).json({ success: false, message: 'Failed to reset password' });
  }
};

export const getRolesAndPermissions = async (req: AuthRequest, res: Response) => {
  try {
    const rolePermissions = {
      OWNER: {
        label: 'Owner (System Administrator)',
        description: 'Complete and unrestricted authority over the entire gym platform, finances, users, and audit logs.',
        permissions: [
          'manage_users',
          'manage_roles',
          'manage_members',
          'manage_packages',
          'manage_memberships',
          'manage_payments',
          'process_refunds',
          'manage_expenses',
          'manage_trainers',
          'view_financial_reports',
          'view_audit_logs',
          'system_configuration',
        ],
      },
      MANAGER: {
        label: 'Manager (Operations Lead)',
        description: 'Responsible for daily operations, memberships, payments, attendance, trainer assignments, and expenses.',
        permissions: [
          'manage_staff_limited',
          'manage_members',
          'manage_packages',
          'manage_memberships',
          'record_payments',
          'manage_expenses',
          'manage_trainers',
          'view_operational_reports',
          'monitor_attendance',
          'send_notifications',
        ],
      },
      TRAINER: {
        label: 'Trainer (Fitness Coach)',
        description: 'Access to assigned member profiles, training schedules, session tracking, and direct notifications.',
        permissions: [
          'view_assigned_members',
          'manage_training_sessions',
          'update_workout_notes',
          'view_own_schedule',
          'receive_notifications',
        ],
      },
      MEMBER: {
        label: 'Member (Gym Customer)',
        description: 'Self-service portal: view personal QR badge, membership validity, attendance log, receipts, and trainer workouts.',
        permissions: [
          'view_own_profile',
          'access_personal_qr',
          'view_own_membership',
          'view_own_attendance',
          'view_own_payments',
          'receive_notifications',
        ],
      },
    };

    res.json({ success: true, roles: rolePermissions });
  } catch (error: any) {
    res.status(500).json({ success: false, message: 'Failed to retrieve roles & permissions' });
  }
};
