import { Router } from 'express';
import { getAuditLogs } from '../controllers/auditLogController';
import { authenticate, authorize } from '../middlewares/auth';
import { Role } from '../types';

const router = Router();

router.get('/', authenticate, authorize([Role.OWNER]), getAuditLogs);

export default router;
