export interface DatePreset {
  value: string;
  label: string;
}

export function localDate(d: Date = new Date()): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

export function presetRange(
  preset: string,
  today: Date = new Date()
): { startDate: string; endDate: string } | null {
  const endDate = localDate(today);
  const d = (offsetDays: number) => {
    const copy = new Date(today);
    copy.setDate(copy.getDate() - offsetDays);
    return localDate(copy);
  };
  switch (preset) {
    case "TODAY":
      return { startDate: endDate, endDate };
    case "7D":
      return { startDate: d(6), endDate };
    case "MTD": {
      const m = localDate(new Date(today.getFullYear(), today.getMonth(), 1));
      return { startDate: m, endDate };
    }
    case "YTD": {
      const y = localDate(new Date(today.getFullYear(), 0, 1));
      return { startDate: y, endDate };
    }
    case "30D":
      return { startDate: d(29), endDate };
    case "90D":
      return { startDate: d(89), endDate };
    default:
      return null;
  }
}

export const REPORT_PRESETS: DatePreset[] = [
  { value: "TODAY", label: "Today" },
  { value: "7D", label: "Last 7 days" },
  { value: "MTD", label: "Month to date" },
  { value: "YTD", label: "Year to date" },
  { value: "30D", label: "Last 30 days" },
  { value: "90D", label: "Last 90 days" },
];

export function formatNumber(n: number): string {
  return new Intl.NumberFormat("en-US").format(n);
}

export function formatCurrency(n: number): string {
  return new Intl.NumberFormat("en-ET", {
    style: "currency",
    currency: "ETB",
    maximumFractionDigits: 2,
  }).format(n);
}

export function formatPercent(n: number | string): string {
  const num = typeof n === "string" ? parseFloat(n) : n;
  return Number.isFinite(num) ? `${num.toFixed(1)}%` : "—";
}
