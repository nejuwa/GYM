"use client";

import { useEffect, useMemo, useState } from "react";
import { ScrollText, Search, Loader2, ShieldCheck, ShieldAlert, User, RefreshCw, FileText } from "lucide-react";
import { listAuditLogs } from "@/lib/api/audit";
import type { AuditLog } from "@/types";
import { cn } from "@/lib/utils";

const MODULES = ["ALL", "AUTH", "MEMBER", "MEMBERSHIP", "PAYMENT", "PACKAGE", "TRAINER", "SESSION", "EXPENSE", "ATTENDANCE"];

function timeAgo(iso: string): string {
  const t = new Date(iso).getTime();
  if (Number.isNaN(t)) return iso;
  const s = Math.max(0, (Date.now() - t) / 1000);
  if (s < 60) return "just now";
  const m = Math.floor(s / 60);
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  return `${Math.floor(h / 24)}d ago`;
}

export function AuditLogsPage() {
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [count, setCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [module, setModule] = useState("ALL");
  const [search, setSearch] = useState("");
  const [limit, setLimit] = useState(100);
  const [refreshKey, setRefreshKey] = useState(0);

  useEffect(() => {
    let active = true;
    setLoading(true);
    setError(null);

    listAuditLogs({
      module: module === "ALL" ? undefined : module,
      search: search || undefined,
      limit,
    })
      .then((res) => {
        if (!active) return;
        setLogs(Array.isArray(res.logs) ? res.logs : []);
        setCount(res.count ?? 0);
      })
      .catch((e) => {
        if (!active) return;
        setError(e instanceof Error ? e.message : "Failed to load audit logs");
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
  }, [module, search, limit, refreshKey]);

  const kpis = useMemo(() => {
    const today = new Date().toISOString().slice(0, 10);
    const todayCount = logs.filter((l) => (l.createdAt ?? "").slice(0, 10) === today).length;
    const failures = logs.filter((l) => l.result === "FAILURE").length;
    const actors = new Set(logs.map((l) => l.userName).filter(Boolean)).size;
    return { todayCount, failures, actors };
  }, [logs]);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-violet-50 text-violet-600">
            <ScrollText className="h-5 w-5" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-slate-900">Audit Logs</h1>
            <p className="text-xs text-slate-500">System activity and security event trail</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setRefreshKey((k) => k + 1)}
            className="flex h-9 items-center gap-1.5 rounded-xl bg-slate-900 px-3 text-xs font-semibold text-white hover:bg-slate-800"
          >
            <RefreshCw className={cn("h-3.5 w-3.5", loading && "animate-spin")} /> Refresh
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <div className="rounded-xl border border-border bg-white p-4">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-sky-50">
            <ShieldCheck className="h-4 w-4 text-sky-600" />
          </div>
          <p className="mt-3 text-2xl font-bold text-slate-900">{loading ? "â€¦" : kpis.todayCount}</p>
          <p className="mt-1 text-xs text-slate-500">Events today</p>
        </div>
        <div className="rounded-xl border border-border bg-white p-4">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-rose-50">
            <ShieldAlert className="h-4 w-4 text-rose-600" />
          </div>
          <p className="mt-3 text-2xl font-bold text-slate-900">{loading ? "â€¦" : kpis.failures}</p>
          <p className="mt-1 text-xs text-slate-500">Failed attempts</p>
        </div>
        <div className="rounded-xl border border-border bg-white p-4">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-50">
            <User className="h-4 w-4 text-emerald-600" />
          </div>
          <p className="mt-3 text-2xl font-bold text-slate-900">{loading ? "â€¦" : kpis.actors}</p>
          <p className="mt-1 text-xs text-slate-500">Distinct actors</p>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <div className="relative">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search actor, action, IPâ€¦"
            className="h-9 w-56 rounded-xl border border-border bg-white pl-9 pr-3 text-xs focus:border-violet-500 focus:outline-none"
          />
        </div>
        <select
          value={module}
          onChange={(e) => setModule(e.target.value)}
          className="h-9 rounded-xl border border-border bg-white px-2 text-xs focus:border-violet-500 focus:outline-none"
        >
          {MODULES.map((m) => (
            <option key={m} value={m}>
              {m === "ALL" ? "All modules" : m}
            </option>
          ))}
        </select>
        <select value={limit} onChange={(e) => setLimit(Number(e.target.value))} className="h-9 rounded-xl border border-border bg-white px-2 text-xs focus:border-violet-500 focus:outline-none">
          {[50, 100, 150].map((n) => (
            <option key={n} value={n}>
              {n}
            </option>
          ))}
        </select>
      </div>

      {error && <div className="rounded-xl border border-rose-200 bg-rose-50 p-3 text-xs text-rose-700">{error}</div>}

      <div className="overflow-hidden rounded-xl border border-border bg-white">
        {loading ? (
          <div className="flex items-center gap-2 p-6 text-xs text-slate-500">
            <Loader2 className="h-4 w-4 animate-spin" /> Loading audit logsâ€¦
          </div>
        ) : logs.length === 0 ? (
          <div className="p-6 text-center text-xs text-slate-500">No audit logs found.</div>
        ) : (
          <table className="min-w-full divide-y divide-border text-left text-xs">
            <thead className="bg-slate-50 text-[10px] uppercase tracking-wide text-slate-500">
              <tr>
                <th className="px-4 py-2.5 font-semibold">Time</th>
                <th className="px-4 py-2.5 font-semibold">Actor</th>
                <th className="px-4 py-2.5 font-semibold">Module</th>
                <th className="px-4 py-2.5 font-semibold">Action</th>
                <th className="px-4 py-2.5 font-semibold">Details</th>
                <th className="px-4 py-2.5 font-semibold">IP</th>
                <th className="px-4 py-2.5 font-semibold">Result</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {logs.map((log) => (
                <tr key={log.id} className="hover:bg-slate-50">
                  <td className="whitespace-nowrap px-4 py-2.5 text-slate-500">
                    {timeAgo(log.createdAt)}
                    <div className="text-[10px] text-slate-300">{new Date(log.createdAt).toLocaleString()}</div>
                  </td>
                  <td className="font-medium text-slate-900">
                    {log.userName || "Anonymous"}
                    <div className="text-[10px] text-slate-400">{log.user?.email ?? ""}</div>
                  </td>
                  <td className="text-slate-600">{log.module}</td>
                  <td className="font-medium text-slate-700">{log.action}</td>
                  <td className="max-w-[240px] truncate text-slate-500" title={log.details ?? undefined}>
                    {log.details ?? "â€”"}
                  </td>
                  <td className="whitespace-nowrap font-mono text-[10px] text-slate-400">{log.ipAddress ?? "â€”"}</td>
                  <td>
                    <span className={cn("inline-flex rounded-full px-2 py-0.5 text-[10px] font-semibold", log.result === "SUCCESS" ? "bg-emerald-50 text-emerald-700" : "bg-rose-50 text-rose-700")}>
                      {log.result ?? "UNKNOWN"}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      <p className="text-[11px] text-slate-400">
        Showing {logs.length} of {count} events Â· filters are applied client-side within the fetched set
      </p>
    </div>
  );
}
