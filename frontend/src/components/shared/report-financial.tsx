"use client";

import { useEffect, useState } from "react";
import { BarChart3, Calendar, RefreshCw, AlertCircle } from "lucide-react";
import { getFinancialReport } from "@/lib/api/reports";
import { ReportKpis } from "./report-kpis";
import { formatCurrency, formatNumber, REPORT_PRESETS, presetRange } from "./report-ui";

export function FinancialReportPage() {
  const [preset, setPreset] = useState("MTD");
  const [refreshKey, setRefreshKey] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [reportData, setReportData] = useState<{
    monthlySummary: Array<{ month: string; revenue: number; expenses: number; netProfit: number }>;
    expensesByCategory: Array<{ category: string; _sum?: { amount: number }; _count?: { id: number } }>;
    paymentsByMethod: Array<{ paymentMethod: string; _sum?: { amount: number }; _count?: { id: number } }>;
  } | null>(null);

  useEffect(() => {
    let active = true;
    setLoading(true);
    setError(null);

    const range = presetRange(preset);
    const params = range ? { startDate: range.startDate, endDate: range.endDate } : {};

    getFinancialReport(params)
      .then((res) => {
        if (!active) return;
        setReportData({
          monthlySummary: Array.isArray(res?.monthlySummary) ? res.monthlySummary : [],
          expensesByCategory: Array.isArray(res?.expensesByCategory) ? res.expensesByCategory : [],
          paymentsByMethod: Array.isArray(res?.paymentsByMethod) ? res.paymentsByMethod : [],
        });
      })
      .catch((err) => {
        if (!active) return;
        setError(err instanceof Error ? err.message : "Failed to load financial report data");
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
  }, [preset, refreshKey]);

  const handleRefresh = () => {
    setRefreshKey((prev) => prev + 1);
  };

  const monthlyList = reportData?.monthlySummary ?? [];
  const maxRevenue = Math.max(1, ...monthlyList.map((m) => m.revenue ?? 0));

  const expensesCat = reportData?.expensesByCategory ?? [];
  const maxCatExpense = Math.max(1, ...expensesCat.map((c) => c._sum?.amount ?? 0));

  const paymentsMethod = reportData?.paymentsByMethod ?? [];
  const maxMethodPayment = Math.max(1, ...paymentsMethod.map((p) => p._sum?.amount ?? 0));

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-2">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-50 text-emerald-600">
            <BarChart3 className="h-5 w-5" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-slate-900">Financial Report</h1>
            <p className="text-xs text-slate-500">Revenue, expenses, and net profitability breakdown</p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <div className="flex items-center gap-1 rounded-xl border border-border bg-white p-1 text-xs">
            <Calendar className="ml-2 h-3.5 w-3.5 text-slate-400" />
            {REPORT_PRESETS.map((p) => (
              <button
                key={p.value}
                onClick={() => setPreset(p.value)}
                className={`rounded-lg px-2.5 py-1 font-medium transition-colors ${
                  preset === p.value
                    ? "bg-slate-900 text-white"
                    : "text-slate-600 hover:bg-slate-100"
                }`}
              >
                {p.label}
              </button>
            ))}
          </div>

          <button
            onClick={handleRefresh}
            className="flex h-9 w-9 items-center justify-center rounded-xl border border-border bg-white text-slate-600 hover:bg-slate-50 transition-colors"
            title="Refresh Report"
          >
            <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
          </button>
        </div>
      </div>

      <ReportKpis refreshKey={refreshKey} />

      {error && (
        <div className="flex items-center gap-3 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
          <AlertCircle className="h-5 w-5 shrink-0 text-red-500" />
          <span>{error}</span>
        </div>
      )}

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <div className="rounded-xl border border-border bg-white p-5 space-y-4">
          <div className="flex items-center justify-between border-b border-border pb-3">
            <h2 className="text-sm font-semibold text-slate-900">Monthly Performance Trend</h2>
            <span className="text-xs text-slate-500">{monthlyList.length} periods recorded</span>
          </div>

          {loading ? (
            <div className="space-y-3 py-2">
              {Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="space-y-1">
                  <div className="h-3 w-16 animate-pulse rounded bg-slate-200" />
                  <div className="h-6 w-full animate-pulse rounded bg-slate-100" />
                </div>
              ))}
            </div>
          ) : monthlyList.length === 0 ? (
            <div className="py-8 text-center text-sm text-slate-500">
              No monthly performance data available for this range.
            </div>
          ) : (
            <div className="space-y-3 py-1">
              {monthlyList.map((m, idx) => {
                const revPct = Math.min(100, Math.max(0, ((m.revenue ?? 0) / maxRevenue) * 100));
                return (
                  <div key={m.month || idx} className="space-y-1">
                    <div className="flex justify-between text-xs font-medium">
                      <span className="text-slate-700">{m.month}</span>
                      <span className="text-emerald-600">{formatCurrency(m.revenue ?? 0)}</span>
                    </div>
                    <div className="h-3.5 w-full overflow-hidden rounded-full bg-slate-100 flex">
                      <div
                        className="h-full bg-emerald-500 transition-all duration-300"
                        style={{ width: `${revPct}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        <div className="space-y-6">
          <div className="rounded-xl border border-border bg-white p-5 space-y-4">
            <div className="flex items-center justify-between border-b border-border pb-3">
              <h2 className="text-sm font-semibold text-slate-900">Expenses by Category</h2>
            </div>

            {loading ? (
              <div className="space-y-2 py-2">
                {Array.from({ length: 3 }).map((_, i) => (
                  <div key={i} className="h-5 w-full animate-pulse rounded bg-slate-100" />
                ))}
              </div>
            ) : expensesCat.length === 0 ? (
              <div className="py-6 text-center text-sm text-slate-500">
                No expense breakdown available.
              </div>
            ) : (
              <div className="space-y-3">
                {expensesCat.map((c, idx) => {
                  const amt = c._sum?.amount ?? 0;
                  const catPct = Math.min(100, Math.max(0, (amt / maxCatExpense) * 100));
                  return (
                    <div key={c.category || idx} className="space-y-1 text-xs">
                      <div className="flex justify-between font-medium">
                        <span className="text-slate-700">{c.category || "Uncategorized"}</span>
                        <span className="text-slate-900">{formatCurrency(amt)}</span>
                      </div>
                      <div className="h-2 w-full overflow-hidden rounded-full bg-slate-100">
                        <div
                          className="h-full bg-rose-500 transition-all duration-300"
                          style={{ width: `${catPct}%` }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          <div className="rounded-xl border border-border bg-white p-5 space-y-4">
            <div className="flex items-center justify-between border-b border-border pb-3">
              <h2 className="text-sm font-semibold text-slate-900">Payments by Method</h2>
            </div>

            {loading ? (
              <div className="space-y-2 py-2">
                {Array.from({ length: 3 }).map((_, i) => (
                  <div key={i} className="h-5 w-full animate-pulse rounded bg-slate-100" />
                ))}
              </div>
            ) : paymentsMethod.length === 0 ? (
              <div className="py-6 text-center text-sm text-slate-500">
                No payment breakdown available.
              </div>
            ) : (
              <div className="space-y-3">
                {paymentsMethod.map((p, idx) => {
                  const amt = p._sum?.amount ?? 0;
                  const methodPct = Math.min(100, Math.max(0, (amt / maxMethodPayment) * 100));
                  return (
                    <div key={p.paymentMethod || idx} className="space-y-1 text-xs">
                      <div className="flex justify-between font-medium">
                        <span className="text-slate-700">{p.paymentMethod || "Other"}</span>
                        <span className="text-slate-900">{formatCurrency(amt)} ({formatNumber(p._count?.id ?? 0)} txns)</span>
                      </div>
                      <div className="h-2 w-full overflow-hidden rounded-full bg-slate-100">
                        <div
                          className="h-full bg-sky-500 transition-all duration-300"
                          style={{ width: `${methodPct}%` }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
