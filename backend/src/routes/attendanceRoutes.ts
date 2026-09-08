import { Router } from 'express';
import {
  getAttendances,
  checkInQR,
  manualCheckIn,
  correctAttendance,
} from '../controllers/attendanceController';
import { authenticate, authorize } from '../middlewares/auth';
import { Role } from '../types';

const router = Router();

router.get('/', authenticate, getAttendances);
router.post('/check-in', authenticate, checkInQR);
router.post('/manual-check-in', authenticate, authorize([Role.OWNER, Role.MANAGER]), manualCheckIn);
router.patch('/:id/correct', authenticate, correctAttendance);

export default router;
