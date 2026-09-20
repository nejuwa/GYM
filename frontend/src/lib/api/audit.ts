import { apiFetch, buildQuery } from "./client";
import type { AuditLog } from "@/types";

export function listAuditLogs(params: {
  module?: string;
  role?: string;
  result?: string;
  search?: string;
  limit?: number;
} = {}): Promise<{ success: boolean; count: number; logs: AuditLog[] }> {
  return apiFetch(`/audit-logs${buildQuery(params as Record<string, unknown>)}`);
}