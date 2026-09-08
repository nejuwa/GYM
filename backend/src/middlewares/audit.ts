import prisma from '../config/db';
import { AuthRequest } from './auth';

interface AuditParams {
  userId?: string;
  userName: string;
  role: string;
  action: string;
  module: string;
  details?: string;
  ipAddress?: string;
  result?: 'SUCCESS' | 'FAILURE';
}

export const logAudit = async (params: AuditParams) => {
  try {
    await prisma.auditLog.create({
      data: {
        userId: params.userId || null,
        userName: params.userName,
        role: params.role,
        action: params.action,
        module: params.module,
        details: params.details || null,
        ipAddress: params.ipAddress || null,
        result: params.result || 'SUCCESS',
      },
    });
  } catch (err) {
    console.error('Failed to write audit log:', err);
  }
};

export const createAuditEntry = (
  req: AuthRequest,
  action: string,
  module: string,
  details?: string,
  result: 'SUCCESS' | 'FAILURE' = 'SUCCESS',
  overrideUser?: AuthRequest['user']
) => {
  const user = overrideUser || req?.user;
  const ip =
    (req?.headers?.['x-forwarded-for'] as string) || req?.socket?.remoteAddress || '127.0.0.1';

  logAudit({
    userId: user?.id,
    userName: user?.fullName || user?.username || 'Anonymous',
    role: user?.role || 'GUEST',
    action,
    module,
    details,
    ipAddress: ip,
    result,
  });
};
