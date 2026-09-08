import { Router } from 'express';
import { login, refresh, getMe, updateMe, changePassword } from '../controllers/authController';
import { authenticate } from '../middlewares/auth';

const router = Router();

router.post('/login', login);
router.post('/refresh', refresh);
router.get('/me', authenticate, getMe);
router.patch('/me', authenticate, updateMe);
router.post('/change-password', authenticate, changePassword);

export default router;
