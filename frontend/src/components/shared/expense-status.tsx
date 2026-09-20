import type { ExpenseCategory } from "@/types";

export const expenseCategoryLabels: Record<ExpenseCategory, string> = {
  EQUIPMENT: "Equipment",
  UTILITIES: "Utilities",
  RENT: "Rent",
  SALARIES: "Salaries / Payroll",
  MAINTENANCE: "Maintenance",
  MARKETING: "Marketing",
  SUPPLIES: "Supplies",
  OTHER: "Other",
};

export const expenseCategoryOptions: Array<{ value: ExpenseCategory; label: string }> = [
  { value: "EQUIPMENT", label: "Equipment" },
  { value: "UTILITIES", label: "Utilities" },
  { value: "RENT", label: "Rent" },
  { value: "SALARIES", label: "Salaries / Payroll" },
  { value: "MAINTENANCE", label: "Maintenance" },
  { value: "MARKETING", label: "Marketing" },
  { value: "SUPPLIES", label: "Supplies" },
  { value: "OTHER", label: "Other" },
];

const categoryTone: Record<ExpenseCategory, string> = {
  EQUIPMENT: "bg-sky-50 text-sky-700 border-sky-200",
  UTILITIES: "bg-amber-50 text-amber-700 border-amber-200",
  RENT: "bg-violet-50 text-violet-700 border-violet-200",
  SALARIES: "bg-emerald-50 text-emerald-700 border-emerald-200",
  MAINTENANCE: "bg-orange-50 text-orange-700 border-orange-200",
  MARKETING: "bg-fuchsia-50 text-fuchsia-700 border-fuchsia-200",
  SUPPLIES: "bg-cyan-50 text-cyan-700 border-cyan-200",
  OTHER: "bg-slate-100 text-slate-600 border-slate-200",
};

export function ExpenseCategoryBadge({ category }: { category: ExpenseCategory }) {
  return (
    <span
      className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-medium whitespace-nowrap ${categoryTone[category]}`}
    >
      {expenseCategoryLabels[category]}
    </span>
  );
}

export function ExpenseStatusPill({ createdAt }: { createdAt: string }) {
  return (
    <span
      title={`Recorded ${new Date(createdAt).toLocaleString()}`}
      className="inline-flex items-center rounded-full border border-slate-200 bg-slate-50 px-2.5 py-0.5 text-xs font-medium text-slate-600"
    >
      Recorded
    </span>
  );
}