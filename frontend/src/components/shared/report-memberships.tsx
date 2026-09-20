"use client";

import { useEffect, useState } from "react";
import { CreditCard, CheckCircle2, Clock, XCircle, AlertCircle, RefreshCw } from "lucide-react";
import { getMembershipReport } from "@/lib/api/reports";
import { formatCurrency, formatNumber } from "./report-ui";

export function MembershipsReportPage() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);
  const [data, setData] = useState<{
    summary: { totalMemberships: number; active: number; expired: number; cancelled: number };
    packagePerformance: Array<{ packageName: string; durationDays: number; totalSold: number; totalRevenue: number }>;
  } | null>(null);

  useEffect(() => {
    let active = true;
    setLoading(true);
    setError(null);

    getMembershipReport()
      .then((res) => {
        if (!active) return;
        setData({
          summary: {
            totalMemberships: res?.summary?.totalMemberships ?? 0,
            active: res?.summary?.active ?? 0,
            expired: res?.summary?.expired ?? 0,
            cancelled: res?.summary?.cancelled ?? 0,
          },
          packagePerformance: Array.isArray(res?.packagePerformance) ? res.packagePerformance : [],
        });
      })
      .catch((err) => {
        if (!active) return;
        setError(err instanceof Error ? err.message : "Failed to load membership report");
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
  }, [refreshKey]);

  const packages = data?.packagePerformance ?? [];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-violet-50 text-violet-600">
            <CreditCard className="h-5 w-5" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-slate-900">Membership Analytics</h1>
            <p className="text-xs text-slate-500">Subscription performance, packages, and statuses</p>
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

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <div className="rounded-xl border border-border bg-white p-5">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-violet-50 text-violet-600">
            <CreditCard className="h-4 w-4" />
          </div>
          <p className="mt-3 text-2xl font-bold text-slate-900">
            {loading ? "..." : formatNumber(data?.summary?.totalMemberships ?? 0)}
          </p>
          <p className="mt-1 text-xs text-slate-500">Total Issued</p>
        </div>

        <div className="rounded-xl border border-border bg-white p-5">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-50 text-emerald-600">
            <CheckCircle2 className="h-4 w-4" />
          </div>
          <p className="mt-3 text-2xl font-bold text-slate-900">
            {loading ? "..." : formatNumber(data?.summary?.active ?? 0)}
          </p>
          <p className="mt-1 text-xs text-slate-500">Active Subscriptions</p>
        </div>

        <div className="rounded-xl border border-border bg-white p-5">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-amber-50 text-amber-600">
            <Clock className="h-4 w-4" />
          </div>
          <p className="mt-3 text-2xl font-bold text-slate-900">
            {loading ? "..." : formatNumber(data?.summary?.expired ?? 0)}
          </p>
          <p className="mt-1 text-xs text-slate-500">Expired</p>
        </div>

        <div className="rounded-xl border border-border bg-white p-5">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-rose-50 text-rose-600">
            <XCircle className="h-4 w-4" />
          </div>
          <p className="mt-3 text-2xl font-bold text-slate-900">
            {loading ? "..." : formatNumber(data?.summary?.cancelled ?? 0)}
          </p>
          <p className="mt-1 text-xs text-slate-500">Cancelled</p>
        </div>
      </div>

      <div className="rounded-xl border border-border bg-white p-5 space-y-4">
        <h2 className="text-sm font-semibold text-slate-900 border-b border-border pb-3">
          Package Sales & Performance
        </h2>

        {loading ? (
          <div className="space-y-2 py-2">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="h-8 w-full animate-pulse rounded bg-slate-100" />
            ))}
          </div>
        ) : packages.length === 0 ? (
          <div className="py-6 text-center text-sm text-slate-500">No package performance data</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-border text-slate-500">
                  <th className="pb-2 font-medium">Package</th>
                  <th className="pb-2 font-medium">Duration</th>
                  <th className="pb-2 font-medium text-right">Subscriptions Sold</th>
                  <th className="pb-2 font-medium text-right">Total Revenue</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {packages.map((pkg, idx) => (
                  <tr key={pkg.packageName || idx} className="hover:bg-slate-50">
                    <td className="py-2.5 font-medium text-slate-900">{pkg.packageName}</td>
                    <td className="py-2.5 text-slate-500">{pkg.durationDays} days</td>
                    <td className="py-2.5 text-right font-medium text-slate-700">
                      {formatNumber(pkg.totalSold ?? 0)}
                    </td>
                    <td className="py-2.5 text-right font-bold text-emerald-600">
                      {formatCurrency(pkg.totalRevenue ?? 0)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
