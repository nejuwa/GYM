import { apiFetch, buildQuery } from "./client";
import type { Payment, PaymentMethod, PaymentStatus } from "@/types";

export interface Receipt {
  receiptNumber: string;
  date: string;
  gymName: string;
  gymAddress: string;
  gymPhone: string;
  member: { name: string; code: string; phone: string };
  items: Array<{ description: string; amount: number }>;
  total: number;
  paymentMethod: PaymentMethod;
  status: PaymentStatus;
  cashier: string;
  notes: string;
}

export function listPayments(params: {
  status?: PaymentStatus | "ALL";
  paymentMethod?: PaymentMethod | "ALL";
  memberId?: string;
  startDate?: string;
  endDate?: string;
  search?: string;
} = {}): Promise<{
  success: boolean;
  count: number;
  totalAmount: number;
  payments: Payment[];
}> {
  return apiFetch(`/payments${buildQuery(params as Record<string, unknown>)}`);
}

export function getPaymentById(id: string): Promise<{
  success: boolean;
  payment: Payment;
  receipt: Receipt;
}> {
  return apiFetch(`/payments/${id}`);
}

export function recordPayment(body: {
  memberId: string;
  amount: number;
  membershipId?: string;
  paymentMethod?: PaymentMethod;
  notes?: string;
  paymentDate?: string | Date;
}): Promise<{ success: boolean; message: string; payment: Payment }> {
  return apiFetch("/payments", { method: "POST", body });
}

export function processRefund(id: string, refundReason?: string): Promise<{
  success: boolean;
  message: string;
  payment: Payment;
}> {
  return apiFetch(`/payments/${id}/refund`, {
    method: "POST",
    body: { refundReason: refundReason ?? undefined },
  });
}