import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import prisma from '../config/db';
import { Role, AccountStatus } from '../types';

export interface AuthRequest extends Request {
  user?: {
    id: string;
    email: string;
    username: string;
    role: Role | string;
    fullName: string;
    status: AccountStatus | string;
  };
}

export const authenticate = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ success: false, message: 'Authentication required. Please log in.' });
    }

    const token = authHeader.split(' ')[1];
    const secret = process.env.JWT_SECRET;

    if (!secret) {
      return res.status(500).json({ success: false, message: 'JWT_SECRET is not configured on the server.' });
    }

    const decoded = jwt.verify(token, secret) as {
      id: string;
      email: string;
      username: string;
      role: Role;
      fullName: string;
    };

    // Verify user is still active in DB
    const user = await prisma.user.findUnique({
      where: { id: decoded.id },
      select: { id: true, email: true, username: true, role: true, fullName: true, status: true },
    });

    if (!user) {
      return res.status(401).json({ success: false, message: 'User account no longer exists.' });
    }

    if (user.status !== AccountStatus.ACTIVE) {
      return res.status(403).json({
        success: false,
        message: `Account is ${user.status.toLowerCase()}. Access denied. Please contact management.`,
      });
    }

    req.user = user;
    next();
  } catch (error) {
    return res.status(401).json({ success: false, message: 'Invalid or expired token.' });
  }
};

export const authorize = (allowedRoles: (Role | string)[]) => {
  return (req: AuthRequest, res: Response, next: NextFunction) => {
    if (!req.user) {
      return res.status(401).json({ success: false, message: 'Unauthorized' });
    }

    if (!allowedRoles.includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        message: `Access denied. Requires one of: [${allowedRoles.join(', ')}]`,
      });
    }

    next();
  };
};
