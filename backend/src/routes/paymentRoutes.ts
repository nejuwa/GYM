import { Router } from 'express';
import { getPayments, getPaymentById, recordPayment, processRefund } from '../controllers/paymentController';
import { authenticate, authorize } from '../middlewares/auth';
import { Role } from '../types';

const router = Router();

router.get('/', authenticate, getPayments);
router.get('/:id', authenticate, getPaymentById);
router.post('/', authenticate, authorize([Role.OWNER, Role.MANAGER]), recordPayment);
router.post('/:id/refund', authenticate, authorize([Role.OWNER, Role.MANAGER]), processRefund);

export default router;
