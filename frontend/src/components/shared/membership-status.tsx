import type { Membership } from "@/types";

const pillTone: Record<string, string> = {
  active: "bg-emerald-50 text-emerald-700 border-emerald-200",
  expiring: "bg-amber-50 text-amber-700 border-amber-200",
  paused: "bg-amber-50 text-amber-700 border-amber-200",
  expired: "bg-slate-100 text-slate-500 border-slate-200",
  canceled: "bg-red-50 text-red-600 border-red-200",
  pending: "bg-sky-50 text-sky-600 border-sky-200",
};

export function membershipStatus(m: Pick<Membership, "status" | "endDate">): { label: string; cls: string } {
  const status = String(m.status ?? "").toUpperCase();
  if (status === "ACTIVE") {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const in7 = new Date(today);
    in7.setDate(in7.getDate() + 7);
    const end = new Date(m.endDate);
    if (end >= today && end <= in7) return { label: "Expiring Soon", cls: pillTone.expiring };
    return { label: "Active", cls: pillTone.active };
  }
  switch (status) {
    case "SUSPENDED":
      return { label: "Paused", cls: pillTone.paused };
    case "EXPIRED":
      return { label: "Expired", cls: pillTone.expired };
    case "CANCELLED":
      return { label: "Canceled", cls: pillTone.canceled };
    case "PENDING":
      return { label: "Pending", cls: pillTone.pending };
    default:
      return { label: status || "—", cls: pillTone.expired };
  }
}

export function MembershipStatusPill({ membership }: { membership: Pick<Membership, "status" | "endDate"> }) {
  const { label, cls } = membershipStatus(membership);
  return (
    <span
      className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-medium whitespace-nowrap ${cls}`}
    >
      {label}
    </span>
  );
}

export function shortMembershipId(id: string): string {
  return `MEM-${id.slice(0, 6).toUpperCase()}`;
}