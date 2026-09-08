import { Router } from 'express';
import {
  getFinancialReport,
  getMemberReport,
  getMembershipReport,
  getAttendanceReport,
  getTrainerReport,
} from '../controllers/reportController';
import { authenticate, authorize } from '../middlewares/auth';
import { Role } from '../types';

const router = Router();

router.get('/financial', authenticate, authorize([Role.OWNER, Role.MANAGER]), getFinancialReport);
router.get('/members', authenticate, authorize([Role.OWNER, Role.MANAGER]), getMemberReport);
router.get('/memberships', authenticate, authorize([Role.OWNER, Role.MANAGER]), getMembershipReport);
router.get('/attendance', authenticate, authorize([Role.OWNER, Role.MANAGER]), getAttendanceReport);
router.get('/trainers', authenticate, authorize([Role.OWNER, Role.MANAGER]), getTrainerReport);

export default router;
