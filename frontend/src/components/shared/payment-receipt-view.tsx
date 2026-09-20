import { formatDate, formatDateTime, formatETB } from "@/lib/utils";
import { paymentMethodLabel, PaymentStatusBadge } from "@/components/shared/payment-status";
import type { Receipt } from "@/lib/api/payments";

export function ReceiptView({ receipt }: { receipt: Receipt }) {
  return (
    <div className="space-y-4 print:p-0">
      <div className="rounded-xl border border-border bg-white overflow-hidden">
        <div className="bg-slate-900 px-6 py-4 text-white">
          <p className="text-lg font-bold">{receipt.gymName}</p>
          <p className="text-xs text-slate-300">{receipt.gymAddress}</p>
          <p className="text-xs text-slate-300">{receipt.gymPhone}</p>
        </div>
        <div className="p-6">
          <div className="flex flex-wrap items-start justify-between gap-3 border-b border-border pb-4">
            <div>
              <p className="text-xs uppercase tracking-wide text-slate-500">Receipt</p>
              <p className="font-mono text-sm font-semibold text-slate-900">{receipt.receiptNumber}</p>
              <p className="text-xs text-slate-500 mt-1">{formatDateTime(receipt.date)}</p>
            </div>
            <PaymentStatusBadge status={receipt.status} />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 py-4 text-sm">
            <div>
              <p className="text-xs text-slate-500">Billed to</p>
              <p className="font-semibold text-slate-900">{receipt.member.name}</p>
            </div>
            <div>
              <p className="text-xs text-slate-500">Member code</p>
              <p className="font-mono text-slate-700">{receipt.member.code}</p>
            </div>
            <div>
              <p className="text-xs text-slate-500">Phone</p>
              <p className="text-slate-700">{receipt.member.phone || "—"}</p>
            </div>
          </div>

          <div className="overflow-hidden rounded-lg border border-border">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border bg-slate-50 text-left text-xs uppercase text-slate-500">
                  <th className="px-4 py-2.5">Description</th>
                  <th className="px-4 py-2.5 text-right">Amount</th>
                </tr>
              </thead>
              <tbody>
                {receipt.items.map((item, i) => (
                  <tr key={i} className="border-b border-border/60">
                    <td className="px-4 py-2.5 text-slate-700">{item.description}</td>
                    <td className="px-4 py-2.5 text-right font-medium text-slate-900">{formatETB(item.amount)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            <div className="flex items-center justify-between bg-slate-50 px-4 py-3">
              <span className="text-sm font-semibold text-slate-900">Total</span>
              <span className="text-base font-bold text-slate-900">{formatETB(receipt.total)}</span>
            </div>
          </div>

          <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
            <div>
              <p className="text-xs text-slate-500">Payment method</p>
              <p className="font-medium text-slate-800">{paymentMethodLabel(receipt.paymentMethod)}</p>
            </div>
            <div>
              <p className="text-xs text-slate-500">Cashier</p>
              <p className="font-medium text-slate-800">{receipt.cashier}</p>
            </div>
          </div>

          {receipt.notes && (
            <div className="mt-4 rounded-lg bg-slate-50 border border-border p-3 text-xs text-slate-600">
              <span className="font-semibold">Note: </span>
              {receipt.notes}
            </div>
          )}

          <p className="mt-5 text-center text-[11px] text-slate-400">
            Thank you for using {receipt.gymName}. This receipt was generated on {formatDate(receipt.date)}.
          </p>
        </div>
      </div>
    </div>
  );
}