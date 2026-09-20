"use client";

import { useEffect, useState } from "react";
import { Wallet, CheckCircle2, Clock4, RotateCcw } from "lucide-react";
import { listPayments } from "@/lib/api/payments";
import { getFinancialReport } from "@/lib/api/reports";
import { formatETB } from "@/lib/utils";

interface PaymentKpis {
  monthlyRevenue: number;
  ytdRevenue: number;
  successfulCount: number;
  pendingCount: number;
  pendingAmount: number;
  refundedAmount: number;
}

function startOfMonth(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-01`;
}

function startOfYear(): string {
  return `${new Date().getFullYear()}-01-01`;
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
          <p className="text-xs text-slate-500 mt-1">{label}</p>
          {sub && <div className="mt-1.5">{sub}</div>}
        </>
      )}
    </div>
  );
}

export function PaymentKpis({ refreshKey }: { refreshKey: number }) {
  const [kpis, setKpis] = useState<PaymentKpis | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    const monthStart = startOfMonth();
    const yearStart = startOfYear();

    Promise.all([
      getFinancialReport({ startDate: monthStart }),
      getFinancialReport({ startDate: yearStart }),
      listPayments({ status: "COMPLETED" }),
      listPayments({ status: "PENDING" }),
      listPayments({ status: "REFUNDED" }),
    ])
      .then(([monthly, ytd, completed, pending, refunded]) => {
        if (cancelled) return;
        setKpis({
          monthlyRevenue: monthly.summary.totalRevenue,
          ytdRevenue: ytd.summary.totalRevenue,
          successfulCount: completed.count,
          pendingCount: pending.count,
          pendingAmount: pending.payments.reduce((sum, p) => sum + p.amount, 0),
          refundedAmount: refunded.payments.reduce((sum, p) => sum + p.amount, 0),
        });
        setError(null);
      })
      .catch((e) => {
        if (cancelled) return;
        setError(e instanceof Error ? e.message : "Failed to load payment metrics");
      });

    return () => {
      cancelled = true;
    };
  }, [refreshKey]);

  if (error) {
    return (
      <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
        Failed to load payment metrics: {error}
      </div>
    );
  }

  const loading = kpis === null;

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
      <KpiCard
        loading={loading}
        label="Monthly Revenue"
        value={formatETB(kpis?.monthlyRevenue ?? 0)}
        icon={<Wallet className="h-4 w-4" />}
        accent="bg-emerald-100 text-emerald-700"
        sub={kpis ? <p className="text-xs text-slate-400">YTD: {formatETB(kpis.ytdRevenue)}</p> : undefined}
      />
      <KpiCard
        loading={loading}
        label="Successful Transactions"
        value={kpis?.successfulCount ?? "—"}
        icon={<CheckCircle2 className="h-4 w-4" />}
        accent="bg-sky-100 text-sky-700"
        sub={<p className="text-xs text-slate-400">COMPLETED payments</p>}
      />
      <KpiCard
        loading={loading}
        label="Pending / Outstanding"
        value={kpis?.pendingCount ?? "—"}
        icon={<Clock4 className="h-4 w-4" />}
        accent="bg-amber-100 text-amber-700"
        sub={kpis ? <p className="text-xs text-amber-600 font-medium">{formatETB(kpis.pendingAmount)} outstanding</p> : undefined}
      />
      <KpiCard
        loading={loading}
        label="Refunded"
        value={kpis ? formatETB(kpis.refundedAmount) : "—"}
        icon={<RotateCcw className="h-4 w-4" />}
        accent="bg-rose-100 text-rose-700"
        sub={<p className="text-xs text-slate-400">All-time refunds</p>}
      />
    </div>
  );
}