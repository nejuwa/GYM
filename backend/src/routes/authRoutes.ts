import { Router } from 'express';
import { login, refresh, logout, getMe, updateMe, changePassword } from '../controllers/authController';
import { authenticate } from '../middlewares/auth';
import { profileImageUpload } from '../middlewares/profileImageUpload';

const router = Router();

router.post('/login', login);
router.post('/refresh', refresh);
router.post('/logout', authenticate, logout);
router.get('/me', authenticate, getMe);
router.patch('/me', authenticate, profileImageUpload.single('profileImage'), updateMe);
router.post('/change-password', authenticate, changePassword);

export default router;
