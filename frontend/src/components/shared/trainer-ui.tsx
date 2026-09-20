import { Badge } from "@/components/ui/badge";
import type { AccountStatus } from "@/types";

export const trainerStatusLabels: Record<AccountStatus, string> = {
  ACTIVE: "Active",
  SUSPENDED: "Suspended",
  DEACTIVATED: "Deactivated",
};

export const trainerStatusOptions: Array<{ value: AccountStatus; label: string }> = [
  { value: "ACTIVE", label: "Active" },
  { value: "SUSPENDED", label: "Suspended" },
  { value: "DEACTIVATED", label: "Deactivated" },
];

const statusTone: Record<AccountStatus, string> = {
  ACTIVE: "bg-emerald-50 text-emerald-700 border-emerald-200",
  SUSPENDED: "bg-amber-50 text-amber-700 border-amber-200",
  DEACTIVATED: "bg-slate-100 text-slate-500 border-slate-200",
};

export function TrainerStatusBadge({ status }: { status: AccountStatus }) {
  return (
    <span
      className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-medium whitespace-nowrap ${statusTone[status] ?? statusTone.DEACTIVATED}`}
    >
      {trainerStatusLabels[status] ?? status}
    </span>
  );
}

export function splitSpecializations(specialization: string): string[] {
  return specialization
    .split(/[,|]/)
    .map((s) => s.trim())
    .filter(Boolean);
}

export function SpecializationChips({ specialization }: { specialization: string }) {
  const skills = splitSpecializations(specialization);
  if (skills.length === 0) {
    return <span className="text-xs text-slate-400">—</span>;
  }
  return (
    <div className="flex flex-wrap gap-1">
      {skills.map((skill) => (
        <Badge key={skill} variant="secondary">
          {skill}
        </Badge>
      ))}
    </div>
  );
}