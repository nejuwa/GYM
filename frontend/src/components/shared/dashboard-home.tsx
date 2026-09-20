"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  Users,
  CreditCard,
  Wallet,
  Dumbbell,
  CalendarCheck,
  TrendingUp,
  TrendingDown,
  ArrowRight,
  Timer,
} from "lucide-react";
import { Card } from "@/components/ui/card";
import { Badge, StatusBadge } from "@/components/ui/badge";
import { Avatar } from "@/components/ui/avatar";
import { PageLoader } from "@/components/ui/spinner";
import { Alert } from "@/components/ui/alert";
import { getDashboard } from "@/lib/api/dashboard";
import type {
  OwnerManagerDashboard,
  TrainerDashboard,
  MemberDashboard,
  DashboardResponseData,
} from "@/types";
import { formatCurrency, formatDate, formatDateTime } from "@/lib/utils";

function StatCard({
  label,
  value,
  icon,
  tone = "default",
}: {
  label: string;
  value: string | number;
  icon: React.ReactNode;
  tone?: "default" | "success" | "danger" | "warning";
}) {
  const tones = {
    default: "bg-white text-slate-900",
    success: "bg-emerald-50 text-emerald-700",
    danger: "bg-red-50 text-red-700",
    warning: "bg-amber-50 text-amber-700",
  };
  return (
    <Card className="p-5" noPadding>
      <div className="flex items-start justify-between">
        <div>
          <p className="text-xs font-medium uppercase tracking-wide text-slate-500">{label}</p>
          <p className="mt-1.5 text-2xl font-bold">{value}</p>
        </div>
        <div className={`flex h-10 w-10 items-center justify-center rounded-lg ${tones[tone]}`}>{icon}</div>
      </div>
    </Card>
  );
}

export function DashboardHome() {
  const [data, setData] = useState<DashboardResponseData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    getDashboard()
      .then((res) => {
        setData(res.data);
        setError(null);
      })
      .catch((e) => setError(e instanceof Error ? e.message : "Failed to load dashboard"))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <PageLoader label="Loading dashboard..." />;

  if (error || !data) {
    return (
      <Alert variant="error" title="Unable to load dashboard">
        {error ?? "No data available"}
      </Alert>
    );
  }

  if (data.role === "OWNER" || data.role === "MANAGER") {
    return <OwnerManagerView data={data as OwnerManagerDashboard} />;
  }
  if (data.role === "TRAINER") {
    return <TrainerView data={data as TrainerDashboard} />;
  }
  return <MemberView data={data as MemberDashboard} />;
}

function OwnerManagerView({ data }: { data: OwnerManagerDashboard }) {
  const k = data.kpis;
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        <StatCard label="Total Members" value={k.totalMembers} icon={<Users className="h-5 w-5" />} />
        <StatCard label="Active Members" value={k.activeMembers} icon={<Users className="h-5 w-5" />} tone="success" />
        <StatCard label="Active Memberships" value={k.activeMemberships} icon={<CreditCard className="h-5 w-5" />} />
        <StatCard label="Expiring Soon" value={k.expiringSoon} icon={<Timer className="h-5 w-5" />} tone="warning" />
        <StatCard label="Today's Attendance" value={k.todayAttendance} icon={<CalendarCheck className="h-5 w-5" />} />
        <StatCard label="Monthly Revenue" value={formatCurrency(k.monthlyRevenue)} icon={<TrendingUp className="h-5 w-5" />} tone="success" />
        <StatCard label="Monthly Expenses" value={formatCurrency(k.monthlyExpenses)} icon={<Wallet className="h-5 w-5" />} tone="danger" />
        <StatCard label="Net Profit" value={formatCurrency(k.netProfit)} icon={<TrendingDown className="h-5 w-5" />} />
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        <div className="xl:col-span-2 space-y-6">
          <Card title="Recent Attendance" subtitle="Latest check-ins">
            {data.recentAttendance.length === 0 ? (
              <p className="text-sm text-slate-400 py-6 text-center">No attendance recorded yet.</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-border text-left text-xs uppercase text-slate-500">
                      <th className="px-4 py-2.5">Member</th>
                      <th className="px-4 py-2.5">Check-in</th>
                      <th className="px-4 py-2.5">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.recentAttendance.map((a) => (
                      <tr key={a.id} className="border-b border-border/60">
                        <td className="px-4 py-2.5">
                          <div className="flex items-center gap-2.5">
                            <Avatar name={a.member?.fullName ?? "?"} size="xs" />
                            <span className="font-medium">{a.member?.fullName}</span>
                          </div>
                        </td>
                        <td className="px-4 py-2.5 text-slate-600">{formatDateTime(a.entryTime)}</td>
                        <td className="px-4 py-2.5">
                          <StatusBadge status={a.status} />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </Card>

          <Card title="Recent Payments" subtitle="Latest transactions">
            {data.recentPayments.length === 0 ? (
              <p className="text-sm text-slate-400 py-6 text-center">No payments recorded yet.</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-border text-left text-xs uppercase text-slate-500">
                      <th className="px-4 py-2.5">Receipt</th>
                      <th className="px-4 py-2.5">Member</th>
                      <th className="px-4 py-2.5">Amount</th>
                      <th className="px-4 py-2.5">Method</th>
                      <th className="px-4 py-2.5">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.recentPayments.map((p) => (
                      <tr key={p.id} className="border-b border-border/60">
                        <td className="px-4 py-2.5 font-mono text-xs text-slate-600">{p.receiptNumber}</td>
                        <td className="px-4 py-2.5 font-medium">{p.member?.fullName}</td>
                        <td className="px-4 py-2.5 font-medium">{formatCurrency(p.amount)}</td>
                        <td className="px-4 py-2.5 text-slate-600">{p.paymentMethod.replace("_", " ")}</td>
                        <td className="px-4 py-2.5">
                          <StatusBadge status={p.status} />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </Card>
        </div>

        <div className="space-y-6">
          <Card title="Monthly Trends" subtitle="Last 6 months">
            <div className="space-y-3">
              {data.monthTrends.map((m) => (
                <div key={m.month} className="flex items-center justify-between text-sm">
                  <span className="text-slate-600 font-medium">{m.month}</span>
                  <div className="flex gap-3 text-xs">
                    <span className="text-emerald-600 font-medium">{formatCurrency(m.revenue)}</span>
                    <span className="text-red-500 font-medium">{formatCurrency(m.expenses)}</span>
                    <span className="text-slate-900 font-semibold">{formatCurrency(m.profit)}</span>
                  </div>
                </div>
              ))}
            </div>
          </Card>

          <Card title="Package Stats" subtitle="Active memberships by package">
            <div className="space-y-3">
              {data.packageStats.map((p, i) => (
                <div key={`${p.name}-${i}`} className="flex items-center justify-between text-sm">
                  <span className="text-slate-600">{p.name}</span>
                  <Badge variant="info">{p.count}</Badge>
                </div>
              ))}
              {data.packageStats.length === 0 && (
                <p className="text-sm text-slate-400 py-4 text-center">No package stats yet.</p>
              )}
            </div>
          </Card>

          <Card className="bg-gradient-to-br from-[#0F172A] to-[#1e293b] text-white" noPadding>
            <div className="p-5">
              <h3 className="text-sm font-semibold">Quick Actions</h3>
              <div className="mt-3 grid grid-cols-2 gap-2">
                <Link href="/members/new" className="flex items-center gap-1.5 text-xs font-medium bg-white/10 rounded-lg px-3 py-2 hover:bg-white/20 transition-colors">
                  <Users className="h-3.5 w-3.5" /> Register Member
                </Link>
                <Link href="/attendance" className="flex items-center gap-1.5 text-xs font-medium bg-white/10 rounded-lg px-3 py-2 hover:bg-white/20 transition-colors">
                  <CalendarCheck className="h-3.5 w-3.5" /> Check-In
                </Link>
                <Link href="/payments/new" className="flex items-center gap-1.5 text-xs font-medium bg-white/10 rounded-lg px-3 py-2 hover:bg-white/20 transition-colors">
                  <CreditCard className="h-3.5 w-3.5" /> Record Payment
                </Link>
                <Link href="/reports" className="flex items-center gap-1.5 text-xs font-medium bg-white/10 rounded-lg px-3 py-2 hover:bg-white/20 transition-colors">
                  <ArrowRight className="h-3.5 w-3.5" /> Reports
                </Link>
              </div>
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}

function TrainerView({ data }: { data: TrainerDashboard }) {
  const k = data.kpis;
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <StatCard label="Assigned Clients" value={k.assignedMembersCount} icon={<Users className="h-5 w-5" />} />
        <StatCard label="Sessions Today" value={k.todaySessionsCount} icon={<CalendarCheck className="h-5 w-5" />} tone="success" />
        <StatCard label="Upcoming Sessions" value={k.totalUpcomingSessions} icon={<Dumbbell className="h-5 w-5" />} tone="warning" />
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        <Card title="Today's Sessions">
          {data.todaySessions.length === 0 ? (
            <p className="text-sm text-slate-400 py-6 text-center">No sessions scheduled today.</p>
          ) : (
            <div className="space-y-3">
              {data.todaySessions.map((s) => (
                <div key={s.id} className="flex items-center justify-between rounded-lg border border-border p-3">
                  <div>
                    <p className="text-sm font-semibold">{s.title}</p>
                    <p className="text-xs text-slate-500">
                      {s.member?.fullName} · {s.startTime} - {s.endTime}
                    </p>
                  </div>
                  <StatusBadge status={s.status} />
                </div>
              ))}
            </div>
          )}
        </Card>

        <Card title="Upcoming Sessions">
          {data.upcomingSessions.length === 0 ? (
            <p className="text-sm text-slate-400 py-6 text-center">No upcoming sessions.</p>
          ) : (
            <div className="space-y-3">
              {data.upcomingSessions.map((s) => (
                <div key={s.id} className="flex items-center justify-between rounded-lg border border-border p-3">
                  <div>
                    <p className="text-sm font-semibold">{s.title}</p>
                    <p className="text-xs text-slate-500">
                      {s.member?.fullName} · {formatDate(s.scheduledDate)} · {s.startTime}
                    </p>
                  </div>
                  <Badge variant="info">{s.status}</Badge>
                </div>
              ))}
            </div>
          )}
        </Card>
      </div>

      <Card title="Assigned Members">
        {data.assignedMembers.length === 0 ? (
          <p className="text-sm text-slate-400 py-6 text-center">No members assigned yet.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border text-left text-xs uppercase text-slate-500">
                  <th className="px-4 py-2.5">Member</th>
                  <th className="px-4 py-2.5">Code</th>
                  <th className="px-4 py-2.5">Phone</th>
                </tr>
              </thead>
              <tbody>
                {data.assignedMembers.map((a) => (
                  <tr key={a.id} className="border-b border-border/60">
                    <td className="px-4 py-2.5">
                      <div className="flex items-center gap-2.5">
                        <Avatar name={a.member?.fullName ?? "?"} size="xs" />
                        <span className="font-medium">{a.member?.fullName}</span>
                      </div>
                    </td>
                    <td className="px-4 py-2.5 font-mono text-xs text-slate-600">{a.member?.memberCode}</td>
                    <td className="px-4 py-2.5 text-slate-600">{a.member?.phone}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </div>
  );
}

function MemberView({ data }: { data: MemberDashboard }) {
  const k = data.kpis;
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        <StatCard label="Membership Status" value={k.membershipStatus} icon={<CreditCard className="h-5 w-5" />} />
        <StatCard
          label="Days Remaining"
          value={k.daysRemaining}
          icon={<Timer className="h-5 w-5" />}
          tone={k.daysRemaining <= 7 ? "warning" : "success"}
        />
        <StatCard label="Monthly Visits" value={k.monthlyVisits} icon={<CalendarCheck className="h-5 w-5" />} />
        <StatCard label="Total Members" value={k.totalMembers} icon={<Users className="h-5 w-5" />} />
      </div>

      {data.activeMembership && (
        <Alert variant="info" title="Your Active Membership">
          <div className="flex flex-wrap items-center gap-x-6 gap-y-2 text-sm">
            <span className="font-semibold">{data.activeMembership.package?.name}</span>
            <span>Start: {formatDate(data.activeMembership.startDate)}</span>
            <span>End: {formatDate(data.activeMembership.endDate)}</span>
          </div>
        </Alert>
      )}

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        <Card title="Recent Attendance">
          {data.attendances.length === 0 ? (
            <p className="text-sm text-slate-400 py-6 text-center">No check-ins yet.</p>
          ) : (
            <div className="space-y-2.5">
              {data.attendances.map((a) => (
                <div key={a.id} className="flex items-center justify-between text-sm">
                  <span className="text-slate-600">{formatDateTime(a.entryTime)}</span>
                  <StatusBadge status={a.status} />
                </div>
              ))}
            </div>
          )}
        </Card>

        <Card title="Recent Payments">
          {data.payments.length === 0 ? (
            <p className="text-sm text-slate-400 py-6 text-center">No payments yet.</p>
          ) : (
            <div className="space-y-2.5">
              {data.payments.map((p) => (
                <div key={p.id} className="flex items-center justify-between text-sm">
                  <span className="text-slate-600">{formatDate(p.paymentDate)}</span>
                  <span className="font-semibold">{formatCurrency(p.amount)}</span>
                </div>
              ))}
            </div>
          )}
        </Card>

        <Card title="Upcoming Sessions">
          {data.sessions.length === 0 ? (
            <div className="text-sm text-slate-400 py-6 text-center">
              No sessions scheduled.
              <Link href="/sessions" className="block mt-2 text-primary font-medium hover:underline">
                View sessions
              </Link>
            </div>
          ) : (
            <div className="space-y-2.5">
              {data.sessions.map((s) => (
                <div key={s.id} className="rounded-lg border border-border p-3">
                  <p className="text-sm font-semibold">{s.title}</p>
                  <p className="text-xs text-slate-500">
                    {s.trainer?.fullName} · {formatDate(s.scheduledDate)} · {s.startTime}
                  </p>
                </div>
              ))}
            </div>
          )}
        </Card>
      </div>
    </div>
  );
}