import { Router } from 'express';
import authRoutes from './authRoutes';
import dashboardRoutes from './dashboardRoutes';
import userRoutes from './userRoutes';
import memberRoutes from './memberRoutes';
import packageRoutes from './packageRoutes';
import membershipRoutes from './membershipRoutes';
import attendanceRoutes from './attendanceRoutes';
import paymentRoutes from './paymentRoutes';
import expenseRoutes from './expenseRoutes';
import trainerRoutes from './trainerRoutes';
import trainingSessionRoutes from './trainingSessionRoutes';
import notificationRoutes from './notificationRoutes';
import reportRoutes from './reportRoutes';
import auditLogRoutes from './auditLogRoutes';

const router = Router();

router.use('/auth', authRoutes);
router.use('/dashboard', dashboardRoutes);
router.use('/users', userRoutes);
router.use('/members', memberRoutes);
router.use('/packages', packageRoutes);
router.use('/memberships', membershipRoutes);
router.use('/attendance', attendanceRoutes);
router.use('/payments', paymentRoutes);
router.use('/expenses', expenseRoutes);
router.use('/trainers', trainerRoutes);
router.use('/training-sessions', trainingSessionRoutes);
router.use('/notifications', notificationRoutes);
router.use('/reports', reportRoutes);
router.use('/audit-logs', auditLogRoutes);

// Health check endpoint
router.get('/health', (req, res) => {
  res.json({
    status: 'online',
    timestamp: new Date().toISOString(),
    service: 'GYMMIS Core API (Chagni Gym)',
    version: '1.0.0',
  });
});

export default router;
