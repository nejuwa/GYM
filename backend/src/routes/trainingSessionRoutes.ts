import { Router } from 'express';
import {
  getTrainingSessions,
  createTrainingSession,
  updateTrainingSessionStatus,
} from '../controllers/trainerController';
import { authenticate, authorize } from '../middlewares/auth';
import { Role } from '../types';

const router = Router();

router.get('/', authenticate, getTrainingSessions);
router.post('/', authenticate, authorize([Role.OWNER, Role.MANAGER, Role.TRAINER]), createTrainingSession);
router.patch('/:id/status', authenticate, authorize([Role.OWNER, Role.MANAGER, Role.TRAINER]), updateTrainingSessionStatus);

export default router;
