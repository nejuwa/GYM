import { apiFetch, buildQuery } from "./client";
import type { SessionStatus, TrainingSession } from "@/types";

export function listSessions(params: {
  trainerId?: string;
  memberId?: string;
  status?: SessionStatus | "ALL";
  date?: string;
} = {}): Promise<{ success: boolean; count: number; sessions: TrainingSession[] }> {
  return apiFetch(`/training-sessions${buildQuery(params as Record<string, unknown>)}`);
}

export function createSession(body: {
  trainerId: string;
  memberId: string;
  title: string;
  scheduledDate: string | Date;
  startTime: string;
  endTime: string;
  notes?: string;
}): Promise<{ success: boolean; message: string; session: TrainingSession }> {
  return apiFetch("/training-sessions", { method: "POST", body });
}

export function updateSessionStatus(
  id: string,
  status: SessionStatus,
  notes?: string
): Promise<{ success: boolean; message: string; session: TrainingSession }> {
  return apiFetch(`/training-sessions/${id}/status`, {
    method: "PATCH",
    body: { status, notes: notes ?? undefined },
  });
}

export function updateSession(
  id: string,
  body: Partial<{
    trainerId: string;
    memberId: string;
    title: string;
    scheduledDate: string | Date;
    startTime: string;
    endTime: string;
    status: SessionStatus;
    notes: string;
  }>
): Promise<{ success: boolean; message: string; session: TrainingSession }> {
  return apiFetch(`/training-sessions/${id}`, { method: "PATCH", body });
}

export function deleteSession(id: string): Promise<{ success: boolean; message: string }> {
  return apiFetch(`/training-sessions/${id}`, { method: "DELETE" });
}