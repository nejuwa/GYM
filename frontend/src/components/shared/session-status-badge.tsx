import { Badge } from "@/components/ui/badge";
import type { SessionStatus } from "@/types";
import { SessionStatusBadge } from "./session-log";

export const SESSION_STATUS_OPTIONS: Array<{
  value: SessionStatus | "ALL";
  label: string;
}> = [
  { value: "ALL", label: "All statuses" },
  { value: "SCHEDULED", label: "Scheduled" },
  { value: "COMPLETED", label: "Completed" },
  { value: "CANCELLED", label: "Cancelled" },
];

export function sessionStatusMeta(
  status: SessionStatus
): { badge: "slate" | "blue" | "green" | "red"; label: string } {
  const map: Record<SessionStatus, { badge: "slate" | "blue" | "green" | "red"; label: string }> = {
    SCHEDULED: { badge: "blue", label: "Scheduled" },
    COMPLETED: { badge: "green", label: "Completed" },
    CANCELLED: { badge: "red", label: "Cancelled" },
  };
  return map[status];
}

export { SessionStatusBadge };
