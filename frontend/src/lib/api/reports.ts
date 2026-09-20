import { apiFetch, buildQuery } from "./client";
import type {
  AttendanceReportResponse,
  ExpenseReportResponse,
  FinancialReportResponse,
  MemberReportResponse,
  MembershipReportResponse,
  PaymentReportResponse,
  TrainerReportResponse,
} from "@/types";

export function getFinancialReport(params: {
  startDate?: string;
  endDate?: string;
} = {}): Promise<{
  success: boolean;
  summary: FinancialReportResponse["summary"];
  monthlySummary: FinancialReportResponse["monthlySummary"];
  expensesByCategory: FinancialReportResponse["expensesByCategory"];
  paymentsByMethod: FinancialReportResponse["paymentsByMethod"];
}> {
  return apiFetch(`/reports/financial${buildQuery(params as Record<string, unknown>)}`);
}

export function getMemberReport(): Promise<{
  success: boolean;
  summary: MemberReportResponse["summary"];
  genderStats: MemberReportResponse["genderStats"];
  registrationTrends: MemberReportResponse["registrationTrends"];
}> {
  return apiFetch("/reports/members");
}

export function getMembershipReport(): Promise<{
  success: boolean;
  summary: MembershipReportResponse["summary"];
  packagePerformance: MembershipReportResponse["packagePerformance"];
}> {
  return apiFetch("/reports/memberships");
}

export function getAttendanceReport(): Promise<{
  success: boolean;
  summary: AttendanceReportResponse["summary"];
  dailyTrends: AttendanceReportResponse["dailyTrends"];
  hourlyDistribution: AttendanceReportResponse["hourlyDistribution"];
}> {
  return apiFetch("/reports/attendance");
}

export function getTrainerReport(): Promise<{
  success: boolean;
  summary: TrainerReportResponse["summary"];
  workload: TrainerReportResponse["workload"];
}> {
  return apiFetch("/reports/trainers");
}

export function getPaymentsReport(): Promise<{
  success: boolean;
  summary: PaymentReportResponse["summary"];
  byMethod: PaymentReportResponse["byMethod"];
  payments: PaymentReportResponse["payments"];
}> {
  return apiFetch("/reports/payments");
}

export function getExpensesReport(): Promise<{
  success: boolean;
  summary: ExpenseReportResponse["summary"];
  byCategory: ExpenseReportResponse["byCategory"];
  expenses: ExpenseReportResponse["expenses"];
}> {
  return apiFetch("/reports/expenses");
}