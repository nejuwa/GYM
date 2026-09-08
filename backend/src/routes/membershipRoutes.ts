import { Router } from 'express';
import {
  getMemberships,
  getMembershipById,
  createMembership,
  renewMembership,
  updateMembershipStatus,
} from '../controllers/membershipController';
import { authenticate, authorize } from '../middlewares/auth';
import { Role } from '../types';

const router = Router();

router.get('/', authenticate, getMemberships);
router.get('/:id', authenticate, getMembershipById);
router.post('/', authenticate, authorize([Role.OWNER, Role.MANAGER]), createMembership);
router.post('/:id/renew', authenticate, authorize([Role.OWNER, Role.MANAGER]), renewMembership);
router.patch('/:id/status', authenticate, authorize([Role.OWNER, Role.MANAGER]), updateMembershipStatus);

export default router;
