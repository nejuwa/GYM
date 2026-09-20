"use client";

import { useEffect, useState } from "react";
import { UserCheck, CalendarCheck, Clock, AlertCircle, RefreshCw } from "lucide-react";
import { getAttendanceReport } from "@/lib/api/reports";
import { formatNumber, formatPercent } from "./report-ui";

export function AttendanceReportPage() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);
  const [data, setData] = useState<{
    summary: {
      totalVisits: number;
      granted: number;
      rejected: number;
      successRate: number | string;
      peakHour: string | null;
      weekdayVisits: number;
      weekendVisits: number;
    };
    dailyTrends: Array<{ date: string; granted: number; rejected: number; total: number }>;
    hourlyDistribution: Array<{ hour: number; label: string; visits: number }>;
  } | null>(null);

  useEffect(() => {
    let active = true;
    setLoading(true);
    setError(null);

    getAttendanceReport()
      .then((res) => {
        if (!active) return;
        setData({
          summary: {
            totalVisits: res?.summary?.totalVisits ?? 0,
            granted: res?.summary?.granted ?? 0,
            rejected: res?.summary?.rejected ?? 0,
            successRate: res?.summary?.successRate ?? 0,
            peakHour: res?.summary?.peakHour ?? null,
            weekdayVisits: res?.summary?.weekdayVisits ?? 0,
            weekendVisits: res?.summary?.weekendVisits ?? 0,
          },
          dailyTrends: Array.isArray(res?.dailyTrends) ? res.dailyTrends : [],
          hourlyDistribution: Array.isArray(res?.hourlyDistribution) ? res.hourlyDistribution : [],
        });
      })
      .catch((err) => {
        if (!active) return;
        setError(err instanceof Error ? err.message : "Failed to load attendance report");
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
  }, [refreshKey]);

  const hourly = data?.hourlyDistribution ?? [];
  const maxHourly = Math.max(1, ...hourly.map((h) => h.visits ?? 0));

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-sky-50 text-sky-600">
            <UserCheck className="h-5 w-5" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-slate-900">Attendance Analytics</h1>
            <p className="text-xs text-slate-500">Check-in traffic, hourly peak distribution, and access stats</p>
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
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-sky-50 text-sky-600">
            <CalendarCheck className="h-4 w-4" />
          </div>
          <p className="mt-3 text-2xl font-bold text-slate-900">
            {loading ? "..." : formatNumber(data?.summary?.totalVisits ?? 0)}
          </p>
          <p className="mt-1 text-xs text-slate-500">Total Check-ins</p>
        </div>

        <div className="rounded-xl border border-border bg-white p-5">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-50 text-emerald-600">
            <UserCheck className="h-4 w-4" />
          </div>
          <p className="mt-3 text-2xl font-bold text-slate-900">
            {loading ? "..." : formatNumber(data?.summary?.granted ?? 0)}
          </p>
          <p className="mt-1 text-xs text-slate-500">Access Granted</p>
        </div>

        <div className="rounded-xl border border-border bg-white p-5">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-purple-50 text-purple-600">
            <Clock className="h-4 w-4" />
          </div>
          <p className="mt-3 text-2xl font-bold text-slate-900">
            {loading ? "..." : (data?.summary?.peakHour || "N/A")}
          </p>
          <p className="mt-1 text-xs text-slate-500">Peak Check-in Hour</p>
        </div>

        <div className="rounded-xl border border-border bg-white p-5">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-50 text-emerald-600">
            <UserCheck className="h-4 w-4" />
          </div>
          <p className="mt-3 text-2xl font-bold text-slate-900">
            {loading ? "..." : formatPercent(data?.summary?.successRate ?? 0)}
          </p>
          <p className="mt-1 text-xs text-slate-500">Access Success Rate</p>
        </div>
      </div>

      <div className="rounded-xl border border-border bg-white p-5 space-y-4">
        <h2 className="text-sm font-semibold text-slate-900 border-b border-border pb-3">
          Hourly Traffic Distribution
        </h2>

        {loading ? (
          <div className="space-y-2 py-2">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="h-5 w-full animate-pulse rounded bg-slate-100" />
            ))}
          </div>
        ) : hourly.length === 0 ? (
          <div className="py-6 text-center text-sm text-slate-500">No hourly attendance data</div>
        ) : (
          <div className="space-y-2.5">
            {hourly.map((h, idx) => {
              const pct = Math.min(100, Math.max(0, ((h.visits ?? 0) / maxHourly) * 100));
              return (
                <div key={h.hour ?? idx} className="space-y-1 text-xs">
                  <div className="flex justify-between font-medium">
                    <span className="text-slate-700">{h.label || `${h.hour}:00`}</span>
                    <span className="text-slate-900">{formatNumber(h.visits ?? 0)} visits</span>
                  </div>
                  <div className="h-2 w-full overflow-hidden rounded-full bg-slate-100">
                    <div className="h-full bg-sky-500" style={{ width: `${pct}%` }} />
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
