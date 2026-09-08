import { Router } from 'express';
import {
  getNotifications,
  markAsRead,
  markAllAsRead,
  sendNotification,
} from '../controllers/notificationController';
import { authenticate, authorize } from '../middlewares/auth';
import { Role } from '../types';

const router = Router();

router.get('/', authenticate, getNotifications);
router.patch('/:id/read', authenticate, markAsRead);
router.patch('/read-all', authenticate, markAllAsRead);
router.post('/send', authenticate, authorize([Role.OWNER, Role.MANAGER]), sendNotification);

export default router;
