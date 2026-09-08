import { Router } from 'express';
import { getExpenses, getExpenseById, createExpense, updateExpense, deleteExpense } from '../controllers/expenseController';
import { authenticate, authorize } from '../middlewares/auth';
import { Role } from '../types';

const router = Router();

router.get('/', authenticate, authorize([Role.OWNER, Role.MANAGER]), getExpenses);
router.get('/:id', authenticate, authorize([Role.OWNER, Role.MANAGER]), getExpenseById);
router.post('/', authenticate, authorize([Role.OWNER, Role.MANAGER]), createExpense);
router.patch('/:id', authenticate, authorize([Role.OWNER, Role.MANAGER]), updateExpense);
router.delete('/:id', authenticate, authorize([Role.OWNER]), deleteExpense);

export default router;
