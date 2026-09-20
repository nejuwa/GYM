import { apiFetch, buildQuery } from "./client";
import type { Expense, ExpenseCategory, PaymentMethod } from "@/types";

export function listExpenses(params: {
  category?: ExpenseCategory | "ALL";
  startDate?: string;
  endDate?: string;
  search?: string;
} = {}): Promise<{
  success: boolean;
  count: number;
  totalAmount: number;
  categoryTotals: Partial<Record<ExpenseCategory, number>>;
  expenses: Expense[];
}> {
  return apiFetch(`/expenses${buildQuery(params as Record<string, unknown>)}`);
}

export function getExpenseById(id: string): Promise<{ success: boolean; expense: Expense }> {
  return apiFetch(`/expenses/${id}`);
}

export function createExpense(body: {
  title: string;
  amount: number;
  category?: ExpenseCategory;
  expenseDate?: string | Date;
  paymentMethod?: PaymentMethod;
  vendor?: string;
  notes?: string;
  receiptAttachment?: string;
}): Promise<{ success: boolean; message: string; expense: Expense }> {
  return apiFetch("/expenses", { method: "POST", body });
}

export function updateExpense(
  id: string,
  body: Partial<{
    title: string;
    amount: number;
    category: ExpenseCategory;
    expenseDate: string | Date;
    paymentMethod: PaymentMethod;
    vendor: string;
    notes: string;
    receiptAttachment: string;
  }>
): Promise<{ success: boolean; message: string; expense: Expense }> {
  return apiFetch(`/expenses/${id}`, { method: "PATCH", body });
}

export function deleteExpense(id: string): Promise<{ success: boolean; message: string }> {
  return apiFetch(`/expenses/${id}`, { method: "DELETE" });
}