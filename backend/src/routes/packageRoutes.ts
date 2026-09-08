import { Router } from 'express';
import { getPackages, getPackageById, createPackage, updatePackage } from '../controllers/packageController';
import { authenticate, authorize } from '../middlewares/auth';
import { Role } from '../types';

const router = Router();

router.get('/', getPackages);
router.get('/:id', getPackageById);
router.post('/', authenticate, authorize([Role.OWNER, Role.MANAGER]), createPackage);
router.patch('/:id', authenticate, authorize([Role.OWNER, Role.MANAGER]), updatePackage);

export default router;
