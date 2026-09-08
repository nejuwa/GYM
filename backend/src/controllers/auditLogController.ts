import { Response } from 'express';
import prisma from '../config/db';
import { AuthRequest } from '../middlewares/auth';

export const getAuditLogs = async (req: AuthRequest, res: Response) => {
  try {
    const { module, role, result, search, limit } = req.query;
    const where: any = {};

    if (module && module !== 'ALL') where.module = String(module);
    if (role && role !== 'ALL') where.role = String(role);
    if (result && result !== 'ALL') where.result = String(result);

    if (search) {
      where.OR = [
        { userName: { contains: String(search) } },
        { action: { contains: String(search) } },
        { details: { contains: String(search) } },
        { ipAddress: { contains: String(search) } },
      ];
    }

    const logs = await prisma.auditLog.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      take: limit ? Number(limit) : 150,
      include: {
        user: { select: { id: true, username: true, email: true } },
      },
    });

    res.json({ success: true, count: logs.length, logs });
  } catch (error: any) {
    res.status(500).json({ success: false, message: 'Failed to fetch audit logs' });
  }
};
