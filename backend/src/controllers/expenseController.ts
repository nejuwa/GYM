import { Response } from 'express';
import prisma from '../config/db';
import { AuthRequest } from '../middlewares/auth';
import { createAuditEntry } from '../middlewares/audit';
import { ExpenseCategory, PaymentMethod } from '../types';

export const getExpenses = async (req: AuthRequest, res: Response) => {
  try {
    const { category, startDate, endDate, search } = req.query;
    const where: any = {};

    if (category && category !== 'ALL') where.category = category as string;

    if (startDate || endDate) {
      where.expenseDate = {};
      if (startDate) where.expenseDate.gte = new Date(String(startDate));
      if (endDate) where.expenseDate.lte = new Date(String(endDate));
    }

    if (search) {
      where.OR = [
        { title: { contains: String(search) } },
        { vendor: { contains: String(search) } },
        { notes: { contains: String(search) } },
      ];
    }

    const expenses = await prisma.expense.findMany({
      where,
      include: {
        recordedBy: { select: { id: true, fullName: true, username: true } },
      },
      orderBy: { expenseDate: 'desc' },
    });

    const totalAmount = expenses.reduce((sum, e) => sum + e.amount, 0);

    // Group by category
    const categoryTotals: Record<string, number> = {};
    for (const exp of expenses) {
      categoryTotals[exp.category] = (categoryTotals[exp.category] || 0) + exp.amount;
    }

    res.json({ success: true, count: expenses.length, totalAmount, categoryTotals, expenses });
  } catch (error: any) {
    res.status(500).json({ success: false, message: 'Failed to fetch expenses' });
  }
};

export const getExpenseById = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const expense = await prisma.expense.findUnique({
      where: { id },
      include: { recordedBy: { select: { id: true, fullName: true } } },
    });

    if (!expense) {
      return res.status(404).json({ success: false, message: 'Expense not found' });
    }

    res.json({ success: true, expense });
  } catch (error: any) {
    res.status(500).json({ success: false, message: 'Failed to retrieve expense' });
  }
};

export const createExpense = async (req: AuthRequest, res: Response) => {
  try {
    const { title, category, amount, expenseDate, paymentMethod, vendor, notes, receiptAttachment } = req.body;

    if (!title || amount === undefined || Number(amount) <= 0) {
      return res.status(400).json({ success: false, message: 'Title and positive amount are required' });
    }

    const newExpense = await prisma.expense.create({
      data: {
        title,
        category: (category as string) || ExpenseCategory.OTHER,
        amount: Number(amount),
        expenseDate: expenseDate ? new Date(expenseDate) : new Date(),
        paymentMethod: (paymentMethod as string) || PaymentMethod.CASH,
        vendor: vendor || null,
        notes: notes || null,
        receiptAttachment: receiptAttachment || null,
        recordedById: req.user?.id,
      },
    });

    createAuditEntry(
      req,
      'CREATE_EXPENSE',
      'EXPENSES',
      `Logged expense "${title}" of $${amount} under category ${category || 'OTHER'}`
    );

    res.status(201).json({ success: true, message: 'Expense created successfully', expense: newExpense });
  } catch (error: any) {
    console.error('Create expense error:', error);
    res.status(500).json({ success: false, message: 'Failed to create expense' });
  }
};

export const updateExpense = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const { title, category, amount, expenseDate, paymentMethod, vendor, notes, receiptAttachment } = req.body;

    const existing = await prisma.expense.findUnique({ where: { id } });
    if (!existing) {
      return res.status(404).json({ success: false, message: 'Expense not found' });
    }

    const updated = await prisma.expense.update({
      where: { id },
      data: {
        title: title ?? existing.title,
        category: category ?? existing.category,
        amount: amount !== undefined ? Number(amount) : existing.amount,
        expenseDate: expenseDate ? new Date(expenseDate) : existing.expenseDate,
        paymentMethod: paymentMethod ?? existing.paymentMethod,
        vendor: vendor !== undefined ? vendor : existing.vendor,
        notes: notes !== undefined ? notes : existing.notes,
        receiptAttachment: receiptAttachment !== undefined ? receiptAttachment : existing.receiptAttachment,
      },
    });

    createAuditEntry(req, 'UPDATE_EXPENSE', 'EXPENSES', `Updated expense "${updated.title}"`);

    res.json({ success: true, message: 'Expense updated successfully', expense: updated });
  } catch (error: any) {
    res.status(500).json({ success: false, message: 'Failed to update expense' });
  }
};

export const deleteExpense = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const existing = await prisma.expense.findUnique({ where: { id } });
    if (!existing) {
      return res.status(404).json({ success: false, message: 'Expense not found' });
    }

    await prisma.expense.delete({ where: { id } });

    createAuditEntry(req, 'DELETE_EXPENSE', 'EXPENSES', `Deleted expense "${existing.title}" ($${existing.amount})`);

    res.json({ success: true, message: 'Expense deleted successfully' });
  } catch (error: any) {
    res.status(500).json({ success: false, message: 'Failed to delete expense' });
  }
};
