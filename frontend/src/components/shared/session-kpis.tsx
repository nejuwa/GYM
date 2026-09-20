"use client";

import { useEffect, useState } from "react";
import { CalendarClock, Clock, CheckCircle2, XCircle } from "lucide-react";
import { listSessions } from "@/lib/api/sessions";

export function SessionStatusKpis({ refreshKey }: { refreshKey?: number }) {
  const [total, setTotal] = useState(0);
  const [scheduled, setScheduled] = useState(0);
  const [completed, setCompleted] = useState(0);
  const [cancelled, setCancelled] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    Promise.all([
      listSessions(),
      listSessions({ status: "SCHEDULED" }),
      listSessions({ status: "COMPLETED" }),
      listSessions({ status: "CANCELLED" }),
    ])
      .then(([all, sched, done, canc]) => {
        if (!active) return;
        setTotal(all?.count ?? 0);
        setScheduled(sched?.count ?? 0);
        setCompleted(done?.count ?? 0);
        setCancelled(canc?.count ?? 0);
      })
      .catch(() => {
        if (!active) return;
        setTotal(0);
        setScheduled(0);
        setCompleted(0);
        setCancelled(0);
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [refreshKey]);

  const cards = [
    { label: "Total sessions", value: total, accent: "bg-blue-50 text-blue-600", icon: <CalendarClock className="h-4 w-4" /> },
    { label: "Scheduled", value: scheduled, accent: "bg-amber-50 text-amber-600", icon: <Clock className="h-4 w-4" /> },
    { label: "Completed", value: completed, accent: "bg-emerald-50 text-emerald-600", icon: <CheckCircle2 className="h-4 w-4" /> },
    { label: "Cancelled", value: cancelled, accent: "bg-rose-50 text-rose-600", icon: <XCircle className="h-4 w-4" /> },
  ];

  if (loading) {
    return (
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="rounded-xl border border-border bg-white p-5">
            <div className="h-8 w-8 animate-pulse rounded-lg bg-slate-200" />
            <div className="mt-3 h-7 w-16 animate-pulse rounded bg-slate-200" />
            <div className="mt-2 h-3 w-24 animate-pulse rounded bg-slate-100" />
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
      {cards.map((c) => (
        <div key={c.label} className="rounded-xl border border-border bg-white p-5">
          <div className={`flex h-8 w-8 items-center justify-center rounded-lg ${c.accent}`}>{c.icon}</div>
          <p className="mt-3 text-2xl font-bold text-slate-900">{c.value}</p>
          <p className="mt-1 text-xs text-slate-500">{c.label}</p>
        </div>
      ))}
    </div>
  );
}
