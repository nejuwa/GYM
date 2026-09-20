import { Router } from 'express';
import { getMembers, getMemberById, createMember, updateMember, getMemberQRCode } from '../controllers/memberController';
import { authenticate, authorize } from '../middlewares/auth';
import { Role } from '../types';
import { profileImageUpload } from '../middlewares/profileImageUpload';

const router = Router();

router.get('/', authenticate, authorize([Role.OWNER, Role.MANAGER, Role.TRAINER]), getMembers);
router.get('/:id', authenticate, getMemberById);
router.get('/:id/qr', authenticate, getMemberQRCode);
router.post('/', authenticate, authorize([Role.OWNER, Role.MANAGER]), profileImageUpload.single('profileImage'), createMember);
router.patch('/:id', authenticate, authorize([Role.OWNER, Role.MANAGER]), profileImageUpload.single('profileImage'), updateMember);

export default router;
