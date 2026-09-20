import { AlertTriangle, CheckCircle2, Info, XCircle } from "lucide-react";
import { cn } from "@/lib/utils";

export type AlertVariant = "success" | "error" | "warning" | "info";

export interface AlertProps {
  variant?: AlertVariant;
  title?: string;
  children?: React.ReactNode;
  className?: string;
}

const configs: Record<AlertVariant, { icon: React.ReactNode; classes: string }> = {
  success: {
    icon: <CheckCircle2 className="h-5 w-5 text-emerald-500 shrink-0" />,
    classes: "bg-emerald-50 border-emerald-200 text-emerald-800",
  },
  error: {
    icon: <XCircle className="h-5 w-5 text-red-500 shrink-0" />,
    classes: "bg-red-50 border-red-200 text-red-800",
  },
  warning: {
    icon: <AlertTriangle className="h-5 w-5 text-amber-500 shrink-0" />,
    classes: "bg-amber-50 border-amber-200 text-amber-800",
  },
  info: {
    icon: <Info className="h-5 w-5 text-sky-500 shrink-0" />,
    classes: "bg-sky-50 border-sky-200 text-sky-800",
  },
};

export function Alert({ variant = "info", title, children, className }: AlertProps) {
  const cfg = configs[variant];
  return (
    <div className={cn("flex gap-3 rounded-lg border p-4", cfg.classes, className)}>
      {cfg.icon}
      <div className="min-w-0">
        {title && <p className="text-sm font-semibold">{title}</p>}
        {children && <div className={cn("text-sm", title && "mt-0.5")}>{children}</div>}
      </div>
    </div>
  );
}