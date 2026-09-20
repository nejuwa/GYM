"use client";

import { useEffect, useState } from "react";
import { Users, CalendarCheck2, Link2, Gauge } from "lucide-react";
import { getTrainerReport } from "@/lib/api/reports";

interface TrainerKpis {
  activeTrainers: number;
  sessionsThisMonth: number;
  totalAssignments: number;
  avgCompletionRate: number;
}

function KpiCard({
  label,
  value,
  sub,
  icon,
  accent,
  loading,
}: {
  label: string;
  value: React.ReactNode;
  sub?: React.ReactNode;
  icon: React.ReactNode;
  accent: string;
  loading: boolean;
}) {
  return (
    <div className="rounded-xl border border-border bg-white p-5">
      {loading ? (
        <>
          <div className="h-8 w-8 animate-pulse rounded-lg bg-slate-200" />
          <div className="mt-3 h-7 w-28 animate-pulse rounded bg-slate-200" />
          <div className="mt-2 h-3 w-24 animate-pulse rounded bg-slate-100" />
        </>
      ) : (
        <>
          <div className={`flex h-8 w-8 items-center justify-center rounded-lg ${accent}`}>{icon}</div>
          <p className="mt-3 text-2xl font-bold text-slate-900">{value}</p>
          <p className="mt-1 text-xs text-slate-500">{label}</p>
          {sub && <div className="mt-1.5 text-xs text-slate-400">{sub}</div>}
        </>
      )}
    </div>
  );
}

export function TrainerKpis({ refreshKey }: { refreshKey: number }) {
  const [kpis, setKpis] = useState<TrainerKpis | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    getTrainerReport()
      .then((res) => {
        if (cancelled) return;
        const completed = res.workload.reduce((sum, w) => sum + w.completed, 0);
        const total = res.workload.reduce((sum, w) => sum + w.totalSessions, 0);
        const avgCompletionRate =
          res.workload.length > 0
            ? Math.round((completed / Math.max(total, 1)) * 1000) / 10
            : 0;
        setKpis({
          activeTrainers: res.summary.activeTrainers,
          sessionsThisMonth: res.summary.sessionsThisMonth,
          totalAssignments: res.summary.totalAssignments,
          avgCompletionRate,
        });
        setError(null);
      })
      .catch((e) => {
        if (cancelled) return;
        setError(e instanceof Error ? e.message : "Failed to load trainer metrics");
      });
    return () => {
      cancelled = true;
    };
  }, [refreshKey]);

  if (error) {
    return (
      <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
        Failed to load trainer metrics: {error}
      </div>
    );
  }

  const loading = kpis === null;

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
      <KpiCard
        loading={loading}
        label="Active Trainers"
        value={kpis?.activeTrainers ?? "—"}
        icon={<Users className="h-4 w-4" />}
        accent="bg-emerald-100 text-emerald-700"
      />
      <KpiCard
        loading={loading}
        label="Client Sessions This Month"
        value={kpis?.sessionsThisMonth ?? "—"}
        icon={<CalendarCheck2 className="h-4 w-4" />}
        accent="bg-sky-100 text-sky-700"
      />
      <KpiCard
        loading={loading}
        label="Assigned Client Links"
        value={kpis?.totalAssignments ?? "—"}
        icon={<Link2 className="h-4 w-4" />}
        accent="bg-violet-100 text-violet-700"
      />
      <KpiCard
        loading={loading}
        label="Avg Completion Rate"
        value={kpis ? `${kpis.avgCompletionRate}%` : "—"}
        icon={<Gauge className="h-4 w-4" />}
        accent="bg-amber-100 text-amber-700"
        sub={
          kpis
            ? "Sessions completed ÷ scheduled (all-time)"
            : undefined
        }
      />
    </div>
  );
}