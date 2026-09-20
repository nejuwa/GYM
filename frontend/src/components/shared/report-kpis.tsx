"use client";

import { useEffect, useState } from "react";
import { DollarSign, TrendingUp, PiggyBank, Percent } from "lucide-react";
import { getFinancialReport } from "@/lib/api/reports";
import { formatCurrency, formatPercent } from "./report-ui";

function SkeletonCard() {
  return (
    <div className="rounded-xl border border-border bg-white p-5">
      <div className="h-8 w-8 animate-pulse rounded-lg bg-slate-200" />
      <div className="mt-3 h-7 w-20 animate-pulse rounded bg-slate-200" />
      <div className="mt-2 h-3 w-24 animate-pulse rounded bg-slate-100" />
    </div>
  );
}

export function ReportKpis({ refreshKey }: { refreshKey?: number }) {
  const [loading, setLoading] = useState(true);
  const [revenue, setRevenue] = useState(0);
  const [expenses, setExpenses] = useState(0);
  const [netProfit, setNetProfit] = useState(0);
  const [margin, setMargin] = useState(0);

  useEffect(() => {
    let active = true;
    getFinancialReport()
      .then((res) => {
        if (!active) return;
        setRevenue(res.summary.totalRevenue ?? 0);
        setExpenses(res.summary.totalExpenses ?? 0);
        setNetProfit(res.summary.netProfit ?? 0);
        setMargin(typeof res.summary.profitMargin === "number" ? res.summary.profitMargin : 0);
      })
      .catch(() => {
        if (!active) return;
        setRevenue(0);
        setExpenses(0);
        setNetProfit(0);
        setMargin(0);
      })
      .finally(() => active && setLoading(false));
    return () => {
      active = false;
    };
  }, [refreshKey]);

  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
      {loading ? (
        <>
          <SkeletonCard />
          <SkeletonCard />
          <SkeletonCard />
          <SkeletonCard />
        </>
      ) : (
        <>
          <div className="rounded-xl border border-border bg-white p-5">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-50">
              <DollarSign className="h-4 w-4 text-emerald-600" />
            </div>
            <p className="mt-3 text-2xl font-bold text-slate-900">{formatCurrency(revenue)}</p>
            <p className="mt-1 text-xs text-slate-500">Total Revenue</p>
          </div>
          <div className="rounded-xl border border-border bg-white p-5">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-rose-50">
              <TrendingUp className="h-4 w-4 text-rose-600" />
            </div>
            <p className="mt-3 text-2xl font-bold text-slate-900">{formatCurrency(expenses)}</p>
            <p className="mt-1 text-xs text-slate-500">Total Expenses</p>
          </div>
          <div className="rounded-xl border border-border bg-white p-5">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-violet-50">
              <PiggyBank className="h-4 w-4 text-violet-600" />
            </div>
            <p className="mt-3 text-2xl font-bold text-slate-900">{formatCurrency(netProfit)}</p>
            <p className="mt-1 text-xs text-slate-500">Net Profit</p>
          </div>
          <div className="rounded-xl border border-border bg-white p-5">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-sky-50">
              <Percent className="h-4 w-4 text-sky-600" />
            </div>
            <p className="mt-3 text-2xl font-bold text-slate-900">{formatPercent(margin)}</p>
            <p className="mt-1 text-xs text-slate-500">Profit Margin</p>
          </div>
        </>
      )}
    </div>
  );
}
