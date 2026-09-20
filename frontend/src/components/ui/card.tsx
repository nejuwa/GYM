import { cn } from "@/lib/utils";

export interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  title?: string;
  subtitle?: string;
  action?: React.ReactNode;
  noPadding?: boolean;
}

export function Card({ title, subtitle, action, noPadding, className, children, ...props }: CardProps) {
  return (
    <div className={cn("rounded-xl border border-border bg-card shadow-sm", className)} {...props}>
      {(title || action) && (
        <div className="flex items-center justify-between gap-4 border-b border-border px-5 py-3.5">
          <div>
            {title && <h3 className="text-sm font-semibold text-slate-900">{title}</h3>}
            {subtitle && <p className="text-xs text-slate-500 mt-0.5">{subtitle}</p>}
          </div>
          {action && <div>{action}</div>}
        </div>
      )}
      <div className={cn(!noPadding && "p-5")}>{children}</div>
    </div>
  );
}