"use client";

import { useEffect, useState } from "react";
import { Wallet, PieChart, Tags, TrendingUp } from "lucide-react";
import { listExpenses } from "@/lib/api/expenses";
import { getFinancialReport } from "@/lib/api/reports";
import { formatETB } from "@/lib/utils";
import { expenseCategoryLabels, ExpenseCategoryBadge } from "@/components/shared/expense-status";
import type { ExpenseCategory } from "@/types";

interface ExpenseKpis {
  monthTotal: number;
  ytdTotal: number;
  allTimeTotal: number;
  topCategory: ExpenseCategory | null;
  topCategoryShare: number;
  categoryCount: number;
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

export function ExpenseKpis({ refreshKey }: { refreshKey: number }) {
  const [kpis, setKpis] = useState<ExpenseKpis | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    Promise.all([
      getFinancialReport({ startDate: startOfMonth() }),
      getFinancialReport({ startDate: startOfYear() }),
      listExpenses(),
    ])
      .then(([monthlyFin, ytdFin, all]) => {
        if (cancelled) return;

        const allTimeTotal = all.totalAmount;
        let topCategory: ExpenseCategory | null = null;
        let topAmount = 0;
        let categoryCount = 0;
        for (const [cat, amount] of Object.entries(all.categoryTotals)) {
          categoryCount += 1;
          if (amount > topAmount) {
            topAmount = amount;
            topCategory = cat as ExpenseCategory;
          }
        }

        setKpis({
          monthTotal: monthlyFin.summary.totalExpenses,
          ytdTotal: ytdFin.summary.totalExpenses,
          allTimeTotal,
          topCategory,
          topCategoryShare: allTimeTotal > 0 && topCategory ? Math.round((topAmount / allTimeTotal) * 100) : 0,
          categoryCount,
        });
        setError(null);
      })
      .catch((e) => {
        if (cancelled) return;
        setError(e instanceof Error ? e.message : "Failed to load expense metrics");
      });

    return () => {
      cancelled = true;
    };
  }, [refreshKey]);

  if (error) {
    return (
      <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
        Failed to load expense metrics: {error}
      </div>
    );
  }

  const loading = kpis === null;

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
      <KpiCard
        loading={loading}
        label="Expenses This Month"
        value={formatETB(kpis?.monthTotal ?? 0)}
        icon={<Wallet className="h-4 w-4" />}
        accent="bg-emerald-100 text-emerald-700"
        sub={kpis ? <p className="text-xs text-slate-400">YTD: {formatETB(kpis.ytdTotal)}</p> : undefined}
      />
      <KpiCard
        loading={loading}
        label="Top Expense Category"
        value={kpis?.topCategory ? expenseCategoryLabels[kpis.topCategory] : "—"}
        icon={<PieChart className="h-4 w-4" />}
        accent="bg-amber-100 text-amber-700"
        sub={
          kpis?.topCategory ? (
            <p className="text-xs text-amber-600 font-medium">{kpis.topCategoryShare}% of total spend</p>
          ) : undefined
        }
      />
      <KpiCard
        loading={loading}
        label="Categories Used"
        value={kpis?.categoryCount ?? "—"}
        icon={<Tags className="h-4 w-4" />}
        accent="bg-sky-100 text-sky-700"
        sub={<p className="text-xs text-slate-400">Of 8 tracked categories</p>}
      />
      <KpiCard
        loading={loading}
        label="All-Time Expenses"
        value={formatETB(kpis?.allTimeTotal ?? 0)}
        icon={<TrendingUp className="h-4 w-4" />}
        accent="bg-violet-100 text-violet-700"
        sub={
          kpis?.topCategory ? (
            <ExpenseCategoryBadge category={kpis.topCategory} />
          ) : (
            <p className="text-xs text-slate-400">No expenses yet</p>
          )
        }
      />
    </div>
  );
}