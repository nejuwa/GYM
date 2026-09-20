import type { PaymentMethod, PaymentStatus } from "@/types";

export const paymentStatusMeta: Record<PaymentStatus, { label: string; cls: string }> = {
  COMPLETED: { label: "Paid", cls: "bg-emerald-50 text-emerald-700 border-emerald-200" },
  PENDING: { label: "Pending", cls: "bg-amber-50 text-amber-700 border-amber-200" },
  REFUNDED: { label: "Refunded", cls: "bg-rose-50 text-rose-700 border-rose-200" },
};

export function PaymentStatusBadge({ status }: { status: PaymentStatus }) {
  const meta = paymentStatusMeta[status];
  return (
    <span
      className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-medium whitespace-nowrap ${meta.cls}`}
    >
      {meta.label}
    </span>
  );
}

export function paymentMethodLabel(method: PaymentMethod): string {
  switch (method) {
    case "CASH":
      return "Cash";
    case "CARD":
      return "Card";
    case "BANK_TRANSFER":
      return "Bank Transfer";
    case "MOBILE_MONEY":
      return "Telebirr";
    default:
      return method;
  }
}