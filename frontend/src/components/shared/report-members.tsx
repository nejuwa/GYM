"use client";

import { useEffect, useState } from "react";
import { Users, UserCheck, UserX, AlertCircle, RefreshCw } from "lucide-react";
import { getMemberReport } from "@/lib/api/reports";
import { formatNumber } from "./report-ui";

export function MembersReportPage() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);
  const [data, setData] = useState<{
    summary: { totalMembers: number; activeMembers: number; suspendedMembers: number };
    genderStats: Array<{ gender: string; _count: number }>;
    registrationTrends: Array<{ month: string; newMembers: number }>;
  } | null>(null);

  useEffect(() => {
    let active = true;
    setLoading(true);
    setError(null);

    getMemberReport()
      .then((res) => {
        if (!active) return;
        setData({
          summary: {
            totalMembers: res?.summary?.totalMembers ?? 0,
            activeMembers: res?.summary?.activeMembers ?? 0,
            suspendedMembers: res?.summary?.suspendedMembers ?? 0,
          },
          genderStats: Array.isArray(res?.genderStats) ? res.genderStats : [],
          registrationTrends: Array.isArray(res?.registrationTrends) ? res.registrationTrends : [],
        });
      })
      .catch((err) => {
        if (!active) return;
        setError(err instanceof Error ? err.message : "Failed to load member report");
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
  }, [refreshKey]);

  const trends = data?.registrationTrends ?? [];
  const maxTrend = Math.max(1, ...trends.map((t) => t.newMembers ?? 0));

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-50 text-blue-600">
            <Users className="h-5 w-5" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-slate-900">Member Analytics</h1>
            <p className="text-xs text-slate-500">Member growth, demographics, and status metrics</p>
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

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <div className="rounded-xl border border-border bg-white p-5">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-50 text-blue-600">
            <Users className="h-4 w-4" />
          </div>
          <p className="mt-3 text-2xl font-bold text-slate-900">
            {loading ? "..." : formatNumber(data?.summary?.totalMembers ?? 0)}
          </p>
          <p className="mt-1 text-xs text-slate-500">Total Members</p>
        </div>

        <div className="rounded-xl border border-border bg-white p-5">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-50 text-emerald-600">
            <UserCheck className="h-4 w-4" />
          </div>
          <p className="mt-3 text-2xl font-bold text-slate-900">
            {loading ? "..." : formatNumber(data?.summary?.activeMembers ?? 0)}
          </p>
          <p className="mt-1 text-xs text-slate-500">Active Members</p>
        </div>

        <div className="rounded-xl border border-border bg-white p-5">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-amber-50 text-amber-600">
            <UserX className="h-4 w-4" />
          </div>
          <p className="mt-3 text-2xl font-bold text-slate-900">
            {loading ? "..." : formatNumber(data?.summary?.suspendedMembers ?? 0)}
          </p>
          <p className="mt-1 text-xs text-slate-500">Suspended / Inactive</p>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <div className="rounded-xl border border-border bg-white p-5 space-y-4">
          <h2 className="text-sm font-semibold text-slate-900 border-b border-border pb-3">
            New Registrations Trend
          </h2>
          {loading ? (
            <div className="space-y-2 py-2">
              {Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="h-6 w-full animate-pulse rounded bg-slate-100" />
              ))}
            </div>
          ) : trends.length === 0 ? (
            <div className="py-6 text-center text-sm text-slate-500">No registration trend data</div>
          ) : (
            <div className="space-y-3">
              {trends.map((t, idx) => {
                const pct = Math.min(100, Math.max(0, ((t.newMembers ?? 0) / maxTrend) * 100));
                return (
                  <div key={t.month || idx} className="space-y-1 text-xs">
                    <div className="flex justify-between font-medium">
                      <span className="text-slate-700">{t.month}</span>
                      <span className="text-slate-900">{formatNumber(t.newMembers ?? 0)} new</span>
                    </div>
                    <div className="h-2.5 w-full overflow-hidden rounded-full bg-slate-100">
                      <div className="h-full bg-blue-500" style={{ width: `${pct}%` }} />
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        <div className="rounded-xl border border-border bg-white p-5 space-y-4">
          <h2 className="text-sm font-semibold text-slate-900 border-b border-border pb-3">
            Gender Demographics
          </h2>
          {loading ? (
            <div className="space-y-2 py-2">
              {Array.from({ length: 3 }).map((_, i) => (
                <div key={i} className="h-6 w-full animate-pulse rounded bg-slate-100" />
              ))}
            </div>
          ) : (data?.genderStats ?? []).length === 0 ? (
            <div className="py-6 text-center text-sm text-slate-500">No gender data recorded</div>
          ) : (
            <div className="space-y-3">
              {(data?.genderStats ?? []).map((g, idx) => (
                <div key={g.gender || idx} className="flex items-center justify-between text-xs py-1 border-b border-slate-50">
                  <span className="font-medium text-slate-700">{g.gender || "Unspecified"}</span>
                  <span className="font-bold text-slate-900">{formatNumber(g._count ?? 0)}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
