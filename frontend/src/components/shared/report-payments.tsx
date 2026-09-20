"use client";

import { useEffect, useState } from "react";
import { DollarSign, CreditCard, AlertCircle, RefreshCw } from "lucide-react";
import { getPaymentsReport } from "@/lib/api/reports";
import { formatCurrency, formatNumber } from "./report-ui";

export function PaymentsReportPage() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);
  const [data, setData] = useState<{
    summary: { totalAmount: number; paymentCount: number };
    byMethod: Record<string, { count: number; amount: number }>;
    payments: Array<{ id: string; amount: number; paymentMethod: string; paymentDate: string }>;
  } | null>(null);

  useEffect(() => {
    let active = true;
    setLoading(true);
    setError(null);

    getPaymentsReport()
      .then((res) => {
        if (!active) return;
        setData({
          summary: {
            totalAmount: res?.summary?.totalAmount ?? 0,
            paymentCount: res?.summary?.paymentCount ?? 0,
          },
          byMethod: res?.byMethod ?? {},
          payments: Array.isArray(res?.payments) ? res.payments : [],
        });
      })
      .catch((err) => {
        if (!active) return;
        setError(err instanceof Error ? err.message : "Failed to load payments report");
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
  }, [refreshKey]);

  const methodEntries = Object.entries(data?.byMethod ?? {});
  const maxMethodAmt = Math.max(1, ...methodEntries.map(([, v]) => v.amount ?? 0));

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-50 text-emerald-600">
            <DollarSign className="h-5 w-5" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-slate-900">Payments Report</h1>
            <p className="text-xs text-slate-500">Collected payment totals, method breakdown, and recent transactions</p>
          </div>
        </div>

        <button
          onClick={() => setRefreshKey((k) => k + 1)}
          className="flex h-9 w-9 items-center justify-center rounded-xl border border-border bg-white text-slate-600 hover:bg-slate-50 transition-colors"
          title="Refresh"
        >
          <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
        </button>
      </div>

      {error && (
        <div className="flex items-center gap-3 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
          <AlertCircle className="h-5 w-5 shrink-0 text-red-500" />
          <span>{error}</span>
        </div>
      )}

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div className="rounded-xl border border-border bg-white p-5">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-50 text-emerald-600">
            <DollarSign className="h-4 w-4" />
          </div>
          <p className="mt-3 text-2xl font-bold text-slate-900">
            {loading ? "..." : formatCurrency(data?.summary?.totalAmount ?? 0)}
          </p>
          <p className="mt-1 text-xs text-slate-500">Total Payments Collected</p>
        </div>

        <div className="rounded-xl border border-border bg-white p-5">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-50 text-blue-600">
            <CreditCard className="h-4 w-4" />
          </div>
          <p className="mt-3 text-2xl font-bold text-slate-900">
            {loading ? "..." : formatNumber(data?.summary?.paymentCount ?? 0)}
          </p>
          <p className="mt-1 text-xs text-slate-500">Total Transactions</p>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <div className="rounded-xl border border-border bg-white p-5 space-y-4">
          <h2 className="text-sm font-semibold text-slate-900 border-b border-border pb-3">
            Payment Method Breakdown
          </h2>

          {loading ? (
            <div className="space-y-2 py-2">
              {Array.from({ length: 3 }).map((_, i) => (
                <div key={i} className="h-6 w-full animate-pulse rounded bg-slate-100" />
              ))}
            </div>
          ) : methodEntries.length === 0 ? (
            <div className="py-6 text-center text-sm text-slate-500">No payment method data</div>
          ) : (
            <div className="space-y-3">
              {methodEntries.map(([method, item]) => {
                const pct = Math.min(100, Math.max(0, ((item.amount ?? 0) / maxMethodAmt) * 100));
                return (
                  <div key={method} className="space-y-1 text-xs">
                    <div className="flex justify-between font-medium">
                      <span className="text-slate-700">{method}</span>
                      <span className="text-slate-900">{formatCurrency(item.amount ?? 0)} ({item.count ?? 0} txns)</span>
                    </div>
                    <div className="h-2 w-full overflow-hidden rounded-full bg-slate-100">
                      <div className="h-full bg-emerald-500" style={{ width: `${pct}%` }} />
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        <div className="rounded-xl border border-border bg-white p-5 space-y-4">
          <h2 className="text-sm font-semibold text-slate-900 border-b border-border pb-3">
            Recent Payment Records
          </h2>

          {loading ? (
            <div className="space-y-2 py-2">
              {Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="h-8 w-full animate-pulse rounded bg-slate-100" />
              ))}
            </div>
          ) : (data?.payments ?? []).length === 0 ? (
            <div className="py-6 text-center text-sm text-slate-500">No recent payments</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-border text-slate-500">
                    <th className="pb-2 font-medium">Date</th>
                    <th className="pb-2 font-medium">Method</th>
                    <th className="pb-2 font-medium text-right">Amount</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {(data?.payments ?? []).slice(0, 8).map((p, idx) => (
                    <tr key={p.id || idx} className="hover:bg-slate-50">
                      <td className="py-2 text-slate-600">
                        {p.paymentDate ? new Date(p.paymentDate).toLocaleDateString() : "N/A"}
                      </td>
                      <td className="py-2 font-medium text-slate-700">{p.paymentMethod || "Other"}</td>
                      <td className="py-2 text-right font-bold text-emerald-600">{formatCurrency(p.amount ?? 0)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
