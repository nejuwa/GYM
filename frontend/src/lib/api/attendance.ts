import { apiFetch, buildQuery, ApiError } from "./client";
import type { Attendance, AttendanceStatus } from "@/types";
import { listMemberships } from "./memberships";
import { getAttendanceReport } from "./reports";

export interface CheckInResponse {
  success: boolean;
  granted: boolean;
  message: string;
  member?: {
    id: string;
    fullName: string;
    memberCode: string;
    photo?: string | null;
    packageName?: string;
    daysRemaining?: number;
  };
  attendance?: Attendance;
  rejectionReason?: string;
}

export function listAttendance(params: {
  date?: string;
  memberId?: string;
  status?: AttendanceStatus | "ALL";
  search?: string;
  limit?: number;
} = {}): Promise<{ success: boolean; count: number; attendances: Attendance[] }> {
  return apiFetch(`/attendance${buildQuery(params as Record<string, unknown>)}`);
}

export async function checkIn(body: { memberCode?: string; qrData?: string }): Promise<CheckInResponse> {
  try {
    return await apiFetch<CheckInResponse>("/attendance/check-in", { method: "POST", body });
  } catch (err) {
    if (err instanceof ApiError && err.data) {
      const d = err.data as Partial<CheckInResponse>;
      return {
        success: false,
        granted: false,
        message: d.message ?? `Access denied (${err.status})`,
        rejectionReason: d.rejectionReason,
        member: d.member,
        attendance: d.attendance,
      };
    }
    throw err;
  }
}

export function manualCheckIn(body: {
  memberId: string;
  status?: AttendanceStatus;
  rejectionReason?: string;
}): Promise<{ success: boolean; message: string; attendance: Attendance }> {
  return apiFetch("/attendance/manual-check-in", { method: "POST", body });
}

export function correctAttendance(
  id: string,
  body: {
    status?: AttendanceStatus;
    rejectionReason?: string | null;
    entryTime?: string | Date;
    exitTime?: string | Date;
  }
): Promise<{ success: boolean; message: string; attendance: Attendance }> {
  return apiFetch(`/attendance/${id}/correct`, { method: "PATCH", body });
}

export type AttendanceRowState = "checked-in" | "checked-out" | "denied";

export function attendanceRowState(a: Attendance): AttendanceRowState {
  if (a.status === "REJECTED") return "denied";
  return a.exitTime ? "checked-out" : "checked-in";
}

export function attendanceDurationMinutes(a: Attendance): number | null {
  if (!a.exitTime) return null;
  const start = a.entryTime ? new Date(a.entryTime).getTime() : 0;
  const end = a.exitTime ? new Date(a.exitTime).getTime() : 0;
  if (!isFinite(start) || !isFinite(end) || end < start) return 0;
  return Math.max(0, Math.round((end - start) / 60000));
}

export function attendanceTierLabel(a: Attendance): string | null {
  return a.member?.memberships?.[0]?.package?.name ?? null;
}

export interface AttendanceKPIs {
  checkInsToday: number;
  inFacilityNow: number;
  peakHour: string | null;
  successRate: number | string;
  overdueMemberships: number;
}

export function todayLocalDate(d: Date = new Date()): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

export async function getAttendanceKPIs(): Promise<AttendanceKPIs> {
  const today = todayLocalDate();
  const [todayRes, reportRes, overdueRes] = await Promise.all([
    listAttendance({ date: today, limit: 1000 }),
    getAttendanceReport(),
    listMemberships({ status: "EXPIRED" }),
  ]);

  const grantedRows = todayRes.attendances.filter((a) => a.status === "GRANTED");

  return {
    checkInsToday: grantedRows.length,
    inFacilityNow: grantedRows.filter((a) => !a.exitTime).length,
    peakHour: reportRes.summary.peakHour ?? null,
    successRate: reportRes.summary.successRate,
    overdueMemberships: overdueRes.count,
  };
}