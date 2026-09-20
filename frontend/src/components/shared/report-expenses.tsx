"use client";

import { useEffect, useState } from "react";
import { TrendingUp, Wallet, AlertCircle, RefreshCw } from "lucide-react";
import { getExpensesReport } from "@/lib/api/reports";
import { formatCurrency, formatNumber } from "./report-ui";

export function ExpensesReportPage() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);
  const [data, setData] = useState<{
    summary: { totalAmount: number; expenseCount: number };
    byCategory: Record<string, { count: number; amount: number }>;
    expenses: Array<{ id: string; title: string; category: string; amount: number; expenseDate: string }>;
  } | null>(null);

  useEffect(() => {
    let active = true;
    setLoading(true);
    setError(null);

    getExpensesReport()
      .then((res) => {
        if (!active) return;
        setData({
          summary: {
            totalAmount: res?.summary?.totalAmount ?? 0,
            expenseCount: res?.summary?.expenseCount ?? 0,
          },
          byCategory: res?.byCategory ?? {},
          expenses: Array.isArray(res?.expenses) ? res.expenses : [],
        });
      })
      .catch((err) => {
        if (!active) return;
        setError(err instanceof Error ? err.message : "Failed to load expenses report");
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
  }, [refreshKey]);

  const catEntries = Object.entries(data?.byCategory ?? {});
  const maxCatAmt = Math.max(1, ...catEntries.map(([, v]) => v.amount ?? 0));

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-rose-50 text-rose-600">
            <TrendingUp className="h-5 w-5" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-slate-900">Expenses Report</h1>
            <p className="text-xs text-slate-500">Outflow totals, category distribution, and recent expenses</p>
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
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-rose-50 text-rose-600">
            <TrendingUp className="h-4 w-4" />
          </div>
          <p className="mt-3 text-2xl font-bold text-slate-900">
            {loading ? "..." : formatCurrency(data?.summary?.totalAmount ?? 0)}
          </p>
          <p className="mt-1 text-xs text-slate-500">Total Expenses</p>
        </div>

        <div className="rounded-xl border border-border bg-white p-5">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-amber-50 text-amber-600">
            <Wallet className="h-4 w-4" />
          </div>
          <p className="mt-3 text-2xl font-bold text-slate-900">
            {loading ? "..." : formatNumber(data?.summary?.expenseCount ?? 0)}
          </p>
          <p className="mt-1 text-xs text-slate-500">Total Recorded Expenses</p>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <div className="rounded-xl border border-border bg-white p-5 space-y-4">
          <h2 className="text-sm font-semibold text-slate-900 border-b border-border pb-3">
            Category Breakdown
          </h2>

          {loading ? (
            <div className="space-y-2 py-2">
              {Array.from({ length: 3 }).map((_, i) => (
                <div key={i} className="h-6 w-full animate-pulse rounded bg-slate-100" />
              ))}
            </div>
          ) : catEntries.length === 0 ? (
            <div className="py-6 text-center text-sm text-slate-500">No expense category data</div>
          ) : (
            <div className="space-y-3">
              {catEntries.map(([cat, item]) => {
                const pct = Math.min(100, Math.max(0, ((item.amount ?? 0) / maxCatAmt) * 100));
                return (
                  <div key={cat} className="space-y-1 text-xs">
                    <div className="flex justify-between font-medium">
                      <span className="text-slate-700">{cat}</span>
                      <span className="text-slate-900">{formatCurrency(item.amount ?? 0)} ({item.count ?? 0} items)</span>
                    </div>
                    <div className="h-2 w-full overflow-hidden rounded-full bg-slate-100">
                      <div className="h-full bg-rose-500" style={{ width: `${pct}%` }} />
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        <div className="rounded-xl border border-border bg-white p-5 space-y-4">
          <h2 className="text-sm font-semibold text-slate-900 border-b border-border pb-3">
            Recent Expense Records
          </h2>

          {loading ? (
            <div className="space-y-2 py-2">
              {Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="h-8 w-full animate-pulse rounded bg-slate-100" />
              ))}
            </div>
          ) : (data?.expenses ?? []).length === 0 ? (
            <div className="py-6 text-center text-sm text-slate-500">No recent expenses</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-border text-slate-500">
                    <th className="pb-2 font-medium">Title</th>
                    <th className="pb-2 font-medium">Category</th>
                    <th className="pb-2 font-medium">Date</th>
                    <th className="pb-2 font-medium text-right">Amount</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {(data?.expenses ?? []).slice(0, 8).map((e, idx) => (
                    <tr key={e.id || idx} className="hover:bg-slate-50">
                      <td className="py-2 font-medium text-slate-900">{e.title || "Expense"}</td>
                      <td className="py-2 text-slate-500">{e.category || "Other"}</td>
                      <td className="py-2 text-slate-500">
                        {e.expenseDate ? new Date(e.expenseDate).toLocaleDateString() : "N/A"}
                      </td>
                      <td className="py-2 text-right font-bold text-rose-600">{formatCurrency(e.amount ?? 0)}</td>
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
