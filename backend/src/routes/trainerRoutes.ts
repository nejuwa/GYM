import { Router } from 'express';
import {
  getTrainers,
  getTrainerById,
  createTrainer,
  updateTrainer,
  assignMemberToTrainer,
} from '../controllers/trainerController';
import { authenticate, authorize } from '../middlewares/auth';
import { Role } from '../types';

const router = Router();

router.get('/', authenticate, getTrainers);
router.get('/:id', authenticate, getTrainerById);
router.post('/', authenticate, authorize([Role.OWNER, Role.MANAGER]), createTrainer);
router.patch('/:id', authenticate, authorize([Role.OWNER, Role.MANAGER]), updateTrainer);
router.post('/assign-member', authenticate, authorize([Role.OWNER, Role.MANAGER]), assignMemberToTrainer);

export default router;
