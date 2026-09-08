import { Router } from 'express';
import { getUsers, getUserById, createUser, updateUser, toggleUserStatus, deleteUser, resetUserPassword, getRolesAndPermissions } from '../controllers/userController';
import { authenticate, authorize } from '../middlewares/auth';
import { Role } from '../types';

const router = Router();

router.get('/roles/all', authenticate, getRolesAndPermissions);
router.get('/', authenticate, authorize([Role.OWNER, Role.MANAGER]), getUsers);
router.get('/:id', authenticate, authorize([Role.OWNER, Role.MANAGER]), getUserById);
router.post('/', authenticate, authorize([Role.OWNER, Role.MANAGER]), createUser);
router.patch('/:id', authenticate, authorize([Role.OWNER, Role.MANAGER]), updateUser);
router.patch('/:id/status', authenticate, authorize([Role.OWNER, Role.MANAGER]), toggleUserStatus);
router.delete('/:id', authenticate, authorize([Role.OWNER]), deleteUser);
router.post('/:id/reset-password', authenticate, authorize([Role.OWNER, Role.MANAGER]), resetUserPassword);

export default router;
