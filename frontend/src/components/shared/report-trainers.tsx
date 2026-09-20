"use client";

import { useEffect, useState } from "react";
import { Dumbbell, Users, Calendar, CheckCircle2, AlertCircle, RefreshCw } from "lucide-react";
import { getTrainerReport } from "@/lib/api/reports";
import { formatNumber, formatPercent } from "./report-ui";

export function TrainersReportPage() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);
  const [data, setData] = useState<{
    summary: { totalTrainers: number; activeTrainers: number; totalAssignments: number; totalSessions: number; sessionsThisMonth: number };
    workload: Array<{
      trainerId: string;
      trainerName: string;
      specialization: string;
      status: string;
      assignedMembers: number;
      totalSessions: number;
      completed: number;
      scheduled: number;
      cancelled: number;
      sessionsThisMonth: number;
      completionRate: number;
    }>;
  } | null>(null);

  useEffect(() => {
    let active = true;
    setLoading(true);
    setError(null);

    getTrainerReport()
      .then((res) => {
        if (!active) return;
        setData({
          summary: {
            totalTrainers: res?.summary?.totalTrainers ?? 0,
            activeTrainers: res?.summary?.activeTrainers ?? 0,
            totalAssignments: res?.summary?.totalAssignments ?? 0,
            totalSessions: res?.summary?.totalSessions ?? 0,
            sessionsThisMonth: res?.summary?.sessionsThisMonth ?? 0,
          },
          workload: Array.isArray(res?.workload) ? res.workload : [],
        });
      })
      .catch((err) => {
        if (!active) return;
        setError(err instanceof Error ? err.message : "Failed to load trainer report");
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
  }, [refreshKey]);

  const workload = data?.workload ?? [];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-orange-50 text-orange-600">
            <Dumbbell className="h-5 w-5" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-slate-900">Trainer Performance</h1>
            <p className="text-xs text-slate-500">Trainer workload, assigned members, and session completion</p>
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
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-orange-50 text-orange-600">
            <Dumbbell className="h-4 w-4" />
          </div>
          <p className="mt-3 text-2xl font-bold text-slate-900">
            {loading ? "..." : formatNumber(data?.summary?.totalTrainers ?? 0)}
          </p>
          <p className="mt-1 text-xs text-slate-500">Total Trainers</p>
        </div>

        <div className="rounded-xl border border-border bg-white p-5">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-50 text-blue-600">
            <Users className="h-4 w-4" />
          </div>
          <p className="mt-3 text-2xl font-bold text-slate-900">
            {loading ? "..." : formatNumber(data?.summary?.totalAssignments ?? 0)}
          </p>
          <p className="mt-1 text-xs text-slate-500">Active Member Assignments</p>
        </div>

        <div className="rounded-xl border border-border bg-white p-5">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-50 text-emerald-600">
            <Calendar className="h-4 w-4" />
          </div>
          <p className="mt-3 text-2xl font-bold text-slate-900">
            {loading ? "..." : formatNumber(data?.summary?.sessionsThisMonth ?? 0)}
          </p>
          <p className="mt-1 text-xs text-slate-500">Sessions This Month</p>
        </div>

        <div className="rounded-xl border border-border bg-white p-5">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-violet-50 text-violet-600">
            <CheckCircle2 className="h-4 w-4" />
          </div>
          <p className="mt-3 text-2xl font-bold text-slate-900">
            {loading ? "..." : formatNumber(data?.summary?.totalSessions ?? 0)}
          </p>
          <p className="mt-1 text-xs text-slate-500">All-Time Sessions</p>
        </div>
      </div>

      <div className="rounded-xl border border-border bg-white p-5 space-y-4">
        <h2 className="text-sm font-semibold text-slate-900 border-b border-border pb-3">
          Trainer Workload & Completion Table
        </h2>

        {loading ? (
          <div className="space-y-2 py-2">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="h-8 w-full animate-pulse rounded bg-slate-100" />
            ))}
          </div>
        ) : workload.length === 0 ? (
          <div className="py-6 text-center text-sm text-slate-500">No trainer workload recorded</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-border text-slate-500">
                  <th className="pb-2 font-medium">Trainer</th>
                  <th className="pb-2 font-medium">Specialization</th>
                  <th className="pb-2 font-medium text-center">Assigned Members</th>
                  <th className="pb-2 font-medium text-center">Sessions (This Month)</th>
                  <th className="pb-2 font-medium text-center">Completed</th>
                  <th className="pb-2 font-medium text-right">Completion Rate</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {workload.map((t, idx) => (
                  <tr key={t.trainerId || idx} className="hover:bg-slate-50">
                    <td className="py-2.5 font-medium text-slate-900">{t.trainerName}</td>
                    <td className="py-2.5 text-slate-500">{t.specialization || "General"}</td>
                    <td className="py-2.5 text-center font-medium text-slate-700">
                      {formatNumber(t.assignedMembers ?? 0)}
                    </td>
                    <td className="py-2.5 text-center font-medium text-slate-700">
                      {formatNumber(t.sessionsThisMonth ?? 0)}
                    </td>
                    <td className="py-2.5 text-center font-medium text-emerald-600">
                      {formatNumber(t.completed ?? 0)}
                    </td>
                    <td className="py-2.5 text-right font-bold text-slate-900">
                      {formatPercent(t.completionRate ?? 0)}
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
