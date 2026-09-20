import { cn } from "@/lib/utils";

export type BadgeVariant = "default" | "success" | "warning" | "danger" | "info" | "secondary" | "neutral";

export interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  variant?: BadgeVariant;
}

const variantClasses: Record<BadgeVariant, string> = {
  default: "bg-primary-light text-primary border border-red-100",
  success: "bg-success-light text-success-foreground border border-emerald-100",
  warning: "bg-warning-light text-warning-foreground border border-amber-100",
  danger: "bg-red-50 text-red-700 border border-red-100",
  info: "bg-sky-50 text-sky-700 border border-sky-100",
  secondary: "bg-slate-100 text-slate-700 border border-slate-200",
  neutral: "bg-slate-50 text-slate-500 border border-slate-100",
};

export function Badge({ variant = "default", className, children, ...props }: BadgeProps) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-medium whitespace-nowrap",
        variantClasses[variant],
        className
      )}
      {...props}
    >
      {children}
    </span>
  );
}

export function StatusBadge({ status }: { status?: string | null }) {
  const map: Record<string, BadgeVariant> = {
    ACTIVE: "success",
    GRANTED: "success",
    COMPLETED: "success",
    CONFIRMED: "success",
    SUSPENDED: "warning",
    PENDING: "warning",
    EXPIRED: "neutral",
    SCHEDULED: "info",
    DEACTIVATED: "secondary",
    CANCELLED: "danger",
    REJECTED: "danger",
    REFUNDED: "danger",
    FAILED: "danger",
  };
  const safe = typeof status === "string" ? status : "";
  const variant: BadgeVariant = (safe && map[safe]) || "neutral";
  return <Badge variant={variant}>{formatStatus(safe)}</Badge>;
}

export function formatStatus(status: string | null | undefined): string {
  if (!status) return "—";
  return String(status)
    .split("_")
    .map((w) => w.charAt(0) + w.slice(1).toLowerCase())
    .join(" ");
}