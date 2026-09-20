import { Request, Response } from 'express';
import prisma from '../config/db';
import { AuthRequest } from '../middlewares/auth';
import { createAuditEntry } from '../middlewares/audit';
import { AccountStatus } from '../types';
import { signAccessToken, signRefreshToken, verifyRefreshToken } from '../utils/token';
import { comparePassword, hashPassword } from '../utils/password';
import { getUploadedProfileImageUrl } from '../middlewares/profileImageUpload';

export const login = async (req: Request, res: Response) => {
  try {
    const { usernameOrEmail, password } = req.body;

    if (!usernameOrEmail || !password) {
      return res.status(400).json({ success: false, message: 'Username/Email and Password are required' });
    }

    const normalizedIdentifier = String(usernameOrEmail).trim();

    const user = await prisma.user.findFirst({
      where: {
        OR: [
          { username: { equals: normalizedIdentifier, mode: 'insensitive' } },
          { email: { equals: normalizedIdentifier.toLowerCase(), mode: 'insensitive' } },
        ],
      },
      include: {
        memberProfile: true,
        trainerProfile: true,
      },
    });

    if (!user) {
      return res.status(401).json({ success: false, message: 'Invalid credentials' });
    }

    const isMatch = await comparePassword(password, user.passwordHash);
    if (!isMatch) {
      createAuditEntry(req as AuthRequest, 'LOGIN_FAILED', 'AUTH', 'Incorrect password attempt', 'FAILURE', {
        id: user.id,
        username: user.username,
        fullName: user.fullName,
        role: user.role,
        email: user.email,
        status: user.status,
      });
      return res.status(401).json({ success: false, message: 'Invalid credentials' });
    }

    if (user.status !== AccountStatus.ACTIVE) {
      return res.status(403).json({
        success: false,
        message: `Account is ${user.status.toLowerCase()}. Access denied.`,
      });
    }

    // Update last login
    await prisma.user.update({
      where: { id: user.id },
      data: { lastLogin: new Date() },
    });

    const token = signAccessToken({
      id: user.id,
      email: user.email,
      username: user.username,
      role: user.role,
      fullName: user.fullName,
    });
    const refreshToken = signRefreshToken(user.id);

    (req as any).user = { id: user.id, username: user.username, fullName: user.fullName, role: user.role, email: user.email, status: user.status };
    createAuditEntry(
      req as AuthRequest,
      'LOGIN_SUCCESS',
      'AUTH',
      `User ${user.username} logged in successfully.`,
      'SUCCESS',
      {
        id: user.id,
        username: user.username,
        fullName: user.fullName,
        role: user.role,
        email: user.email,
        status: user.status,
      }
    );

    res.json({
      success: true,
      message: 'Login successful',
      token,
      refreshToken,
      user: {
        id: user.id,
        email: user.email,
        username: user.username,
        role: user.role,
        fullName: user.fullName,
        phone: user.phone,
        avatarUrl: user.avatarUrl,
        memberProfile: user.memberProfile,
        trainerProfile: user.trainerProfile,
      },
    });
  } catch (error: any) {
    console.error('Login error:', error);
    res.status(500).json({ success: false, message: 'Internal server error during login' });
  }
};

export const refresh = async (req: Request, res: Response) => {
  try {
    const { refreshToken } = req.body;

    if (!refreshToken) {
      return res.status(400).json({ success: false, message: 'Refresh token is required' });
    }

    let userId: string;
    try {
      ({ id: userId } = verifyRefreshToken(refreshToken));
    } catch {
      return res.status(401).json({ success: false, message: 'Invalid or expired refresh token' });
    }

    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user || user.status !== AccountStatus.ACTIVE) {
      return res.status(401).json({ success: false, message: 'Account is no longer active' });
    }

    const token = signAccessToken({
      id: user.id,
      email: user.email,
      username: user.username,
      role: user.role,
      fullName: user.fullName,
    });

    res.json({ success: true, token, refreshToken: signRefreshToken(user.id) });
  } catch (error: any) {
    res.status(500).json({ success: false, message: 'Failed to refresh session' });
  }
};

export const logout = async (req: AuthRequest, res: Response) => {
  createAuditEntry(req, 'LOGOUT', 'AUTH', 'User logged out successfully');
  res.json({ success: true, message: 'Logout successful' });
};

export const getMe = async (req: AuthRequest, res: Response) => {
  try {
    if (!req.user) {
      return res.status(401).json({ success: false, message: 'Not authenticated' });
    }

    const user = await prisma.user.findUnique({
      where: { id: req.user.id },
      include: {
        memberProfile: {
          include: {
            memberships: {
              include: { package: true },
              orderBy: { createdAt: 'desc' },
            },
          },
        },
        trainerProfile: true,
      },
    });

    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    res.json({
      success: true,
      user: {
        id: user.id,
        email: user.email,
        username: user.username,
        role: user.role,
        status: user.status,
        fullName: user.fullName,
        phone: user.phone,
        avatarUrl: user.avatarUrl,
        memberProfile: user.memberProfile,
        trainerProfile: user.trainerProfile,
      },
    });
  } catch (error: any) {
    res.status(500).json({ success: false, message: 'Error retrieving user profile' });
  }
};

export const updateMe = async (req: AuthRequest, res: Response) => {
  try {
    const { fullName, phone, avatarUrl, photo } = req.body;

    if (fullName !== undefined && !String(fullName).trim()) {
      return res.status(400).json({ success: false, message: 'Full name cannot be empty' });
    }

    const uploadedImageUrl = req.file ? getUploadedProfileImageUrl(req, req.file.filename) : undefined;
    const normalizedAvatarUrl = uploadedImageUrl ?? avatarUrl ?? photo;

    const user = await prisma.user.update({
      where: { id: req.user!.id },
      data: {
        ...(fullName !== undefined ? { fullName: String(fullName).trim() } : {}),
        ...(phone !== undefined ? { phone: phone || null } : {}),
        ...(normalizedAvatarUrl !== undefined ? { avatarUrl: normalizedAvatarUrl || null } : {}),
      },
      select: {
        id: true,
        email: true,
        username: true,
        role: true,
        status: true,
        fullName: true,
        phone: true,
        avatarUrl: true,
      },
    });

    const member = await prisma.member.findFirst({ where: { userId: req.user!.id } });
    if (member && normalizedAvatarUrl !== undefined) {
      await prisma.member.update({
        where: { id: member.id },
        data: { photo: normalizedAvatarUrl || null },
      });
    }

    createAuditEntry(req, 'PROFILE_UPDATE', 'AUTH', 'User updated their own profile');

    res.json({ success: true, message: 'Profile updated successfully', user });
  } catch (error: any) {
    res.status(500).json({ success: false, message: 'Failed to update profile' });
  }
};

export const changePassword = async (req: AuthRequest, res: Response) => {
  try {
    const { currentPassword, newPassword } = req.body;
    if (!currentPassword || !newPassword) {
      return res.status(400).json({ success: false, message: 'Both current and new password are required' });
    }

    if (newPassword.length < 6) {
      return res.status(400).json({ success: false, message: 'New password must be at least 6 characters' });
    }

    const user = await prisma.user.findUnique({
      where: { id: req.user!.id },
    });

    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    const isMatch = await comparePassword(currentPassword, user.passwordHash);
    if (!isMatch) {
      return res.status(400).json({ success: false, message: 'Current password is incorrect' });
    }

    const newHash = await hashPassword(newPassword);
    await prisma.user.update({
      where: { id: user.id },
      data: { passwordHash: newHash },
    });

    createAuditEntry(req, 'PASSWORD_CHANGE', 'AUTH', 'Password updated successfully');

    res.json({ success: true, message: 'Password changed successfully' });
  } catch (error: any) {
    res.status(500).json({ success: false, message: 'Failed to change password' });
  }
};
