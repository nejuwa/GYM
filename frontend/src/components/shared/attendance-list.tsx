"use client";

import { useEffect, useRef, useState } from "react";
import {
  ScanLine,
  Search,
  DoorOpen,
  Users,
  Clock,
  CalendarX2,
  Eye,
  LogOut,
  TrendingUp,
  AlertTriangle,
  CheckCircle2,
  XCircle,
} from "lucide-react";
import { Table, type Column } from "@/components/ui/table";
import { Pagination } from "@/components/ui/pagination";
import { Badge } from "@/components/ui/badge";
import { Avatar } from "@/components/ui/avatar";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Modal } from "@/components/ui/modal";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { useToast } from "@/components/ui/toast";
import { useDebounce } from "@/hooks/use-debounce";
import {
  listAttendance,
  correctAttendance,
  checkIn,
  getAttendanceKPIs,
  attendanceRowState,
  attendanceDurationMinutes,
  attendanceTierLabel,
  todayLocalDate,
  type CheckInResponse,
  type AttendanceKPIs,
} from "@/lib/api/attendance";
import { getAttendanceReport } from "@/lib/api/reports";
import { useAuth } from "@/providers/auth-provider";
import type { Attendance, AttendanceStatus } from "@/types";
import { formatDateTime } from "@/lib/utils";

const stateStyle: Record<string, { label: string; cls: string }> = {
  "checked-in": { label: "Checked In", cls: "bg-emerald-50 text-emerald-700 border-emerald-200" },
  "checked-out": { label: "Checked Out", cls: "bg-slate-100 text-slate-600 border-slate-200" },
  denied: { label: "Denied", cls: "bg-red-50 text-red-600 border-red-200" },
};

function DurationBadge({ minutes }: { minutes: number | null }) {
  if (minutes == null) return <span className="text-xs text-slate-400">In facility</span>;
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  const label = h > 0 ? `${h}h ${m}m` : `${m}m`;
  return (
    <span className="inline-flex items-center rounded-full bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-600">
      {label}
    </span>
  );
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
          <div className="mt-3 h-7 w-24 animate-pulse rounded bg-slate-200" />
          <div className="mt-2 h-3 w-32 animate-pulse rounded bg-slate-100" />
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

interface HourlyPoint {
  hour: number;
  label: string;
  visits: number;
}

function TrendBars({ data, peak }: { data: HourlyPoint[]; peak: string | null }) {
  const max = Math.max(1, ...data.map((d) => d.visits));
  return (
    <div>
      <div className="flex h-40 items-end gap-0.5">
        {data.map((d) => {
          const isPeak = peak === d.label;
          const pct = Math.max(d.visits > 0 ? 4 : 2, Math.round((d.visits / max) * 100));
          return (
            <div
              key={d.hour}
              title={`${d.label} — ${d.visits} visits`}
              className={`flex-1 rounded-t ${isPeak ? "bg-brand" : "bg-slate-200 hover:bg-slate-300"}`}
              style={{ height: `${pct}%` }}
            />
          );
        })}
      </div>
      <div className="mt-2 flex gap-0.5 text-[10px] text-slate-400">
        {data.map((d) => (
          <span key={d.hour} className="flex-1 text-center">
            {d.hour % 4 === 0 ? d.label : ""}
          </span>
        ))}
      </div>
    </div>
  );
}

export function AttendanceList() {
  const { user } = useAuth();
  const { toast } = useToast();

  const canManage = ["OWNER", "MANAGER"].includes(user?.role ?? "MEMBER");

  const [today] = useState(() => todayLocalDate());
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState<AttendanceStatus | "ALL">("ALL");
  const [date, setDate] = useState(today);
  const debouncedSearch = useDebounce(search, 350);

  const [attendances, setAttendances] = useState<Attendance[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [resultKey, setResultKey] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [refreshKey, setRefreshKey] = useState(0);

  const [kpis, setKpis] = useState<AttendanceKPIs | null>(null);
  const [kpiError, setKpiError] = useState<string | null>(null);
  const [kpiKey, setKpiKey] = useState<string | null>(null);

  const [report, setReport] = useState<{ hourlyDistribution: HourlyPoint[]; peakHour: string | null } | null>(null);
  const [reportError, setReportError] = useState<string | null>(null);

  const [quickOpen, setQuickOpen] = useState(false);
  const [quickCode, setQuickCode] = useState("");
  const [quickBusy, setQuickBusy] = useState(false);
  const [quickResult, setQuickResult] = useState<CheckInResponse | null>(null);
  const quickInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!quickOpen) return;
    const t = window.setTimeout(() => quickInputRef.current?.focus(), 60);
    return () => window.clearTimeout(t);
  }, [quickOpen]);

  const [checkoutTarget, setCheckoutTarget] = useState<Attendance | null>(null);
  const [checkoutBusy, setCheckoutBusy] = useState(false);

  const [detailTarget, setDetailTarget] = useState<Attendance | null>(null);

  const queryKey = `${date}|${debouncedSearch}|${status}`;
  const loading = resultKey !== queryKey;
  const currentKeyRef = useRef(queryKey);

  useEffect(() => {
    currentKeyRef.current = queryKey;

    listAttendance({ date, status, search: debouncedSearch || undefined, limit: 1000 })
      .then((res) => {
        if (currentKeyRef.current !== queryKey) return;
        setPage(1);
        setAttendances(res.attendances);
        setError(null);
        setResultKey(queryKey);
      })
      .catch((e) => {
        if (currentKeyRef.current !== queryKey) return;
        setError(e instanceof Error ? e.message : "Failed to load attendance records");
        setResultKey(queryKey);
      });
  }, [date, debouncedSearch, status, queryKey, refreshKey]);

  const kpiFetchKey = `kpis:${refreshKey}`;
  useEffect(() => {
    let cancelled = false;

    getAttendanceKPIs()
      .then((res) => {
        if (cancelled) return;
        setKpis(res);
        setKpiError(null);
      })
      .catch((e) => {
        if (cancelled) return;
        setKpiError(e instanceof Error ? e.message : "Failed to load attendance KPIs");
      })
      .finally(() => {
        if (!cancelled) setKpiKey(kpiFetchKey);
      });

    return () => {
      cancelled = true;
    };
  }, [kpiFetchKey]);

  useEffect(() => {
    let cancelled = false;

    getAttendanceReport()
      .then((res) => {
        if (cancelled) return;
        setReport({ hourlyDistribution: res.hourlyDistribution, peakHour: res.summary.peakHour });
        setReportError(null);
      })
      .catch((e) => {
        if (cancelled) return;
        setReportError(e instanceof Error ? e.message : "Failed to load attendance report");
      });

    return () => {
      cancelled = true;
    };
  }, [refreshKey]);

  const totalItems = attendances.length;
  const pageItems = attendances.slice((page - 1) * pageSize, page * pageSize);

  const runQuickCheckIn = async (e: React.FormEvent) => {
    e.preventDefault();
    const code = quickCode.trim();
    if (!code) {
      toast("error", "Enter a code", "Scan or type the member code before checking in.");
      return;
    }
    setQuickBusy(true);
    setQuickResult(null);
    try {
      const res = await checkIn({ memberCode: code });
      setQuickResult(res);
      if (res.granted) {
        toast("success", "Member Checked In Successfully", res.message);
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to process check-in";
      toast("error", "Check-in failed", message);
    } finally {
      setQuickBusy(false);
    }
  };

  const recordCheckout = async () => {
    if (!checkoutTarget) return;
    setCheckoutBusy(true);
    try {
      await correctAttendance(checkoutTarget.id, { exitTime: new Date() });
      setCheckoutTarget(null);
      setRefreshKey((k) => k + 1);
      toast("success", "Checked out", `${checkoutTarget.member?.fullName ?? "Member"} marked as checked out.`);
    } catch (err) {
      toast("error", "Check-out failed", err instanceof Error ? err.message : "Failed to record check-out");
    } finally {
      setCheckoutBusy(false);
    }
  };

  const closeQuick = () => {
    setQuickOpen(false);
    if (quickResult?.success) {
      setQuickCode("");
      setQuickResult(null);
      setRefreshKey((k) => k + 1);
    } else {
      setQuickCode("");
      setQuickResult(null);
    }
  };

  const columns: Array<Column<Attendance>> = [
    {
      key: "member",
      header: "Member",
      cell: (a) => (
        <div className="flex items-center gap-3">
          <Avatar name={a.member?.fullName ?? "?"} src={a.member?.photo} size="sm" />
          <div className="min-w-0">
            <p className="font-medium text-slate-900 truncate">{a.member?.fullName ?? "Unknown"}</p>
            {a.member?.memberCode && <p className="text-xs text-slate-500 font-mono">{a.member.memberCode}</p>}
          </div>
        </div>
      ),
    },
    {
      key: "tier",
      header: "Tier",
      cell: (a) => {
        const tier = attendanceTierLabel(a);
        return tier ? <Badge variant="secondary">{tier}</Badge> : <span className="text-xs text-slate-400">—</span>;
      },
    },
    {
      key: "in",
      header: "Check-in",
      cell: (a) => <p className="text-sm text-slate-600">{formatDateTime(a.entryTime)}</p>,
    },
    {
      key: "out",
      header: "Check-out",
      cell: (a) => (a.exitTime ? <p className="text-sm text-slate-600">{formatDateTime(a.exitTime)}</p> : <span className="text-xs text-slate-400">—</span>),
    },
    {
      key: "duration",
      header: "Duration",
      cell: (a) => <DurationBadge minutes={attendanceDurationMinutes(a)} />,
    },
    {
      key: "method",
      header: "Method",
      cell: (a) => (
        <div>
          <Badge variant="secondary">{a.accessMethod.replace("_", " ")}</Badge>
          {a.verifiedBy && <p className="mt-1 text-xs text-slate-400">{a.verifiedBy}</p>}
        </div>
      ),
    },
    {
      key: "status",
      header: "Status",
      cell: (a) => {
        const st = stateStyle[attendanceRowState(a)];
        return (
          <span
            title={a.rejectionReason ?? undefined}
            className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-medium whitespace-nowrap ${st.cls}`}
          >
            {st.label}
          </span>
        );
      },
    },
    {
      key: "actions",
      header: "Actions",
      className: "text-right",
      cell: (a) => (
        <div className="flex items-center justify-end gap-1.5">
          {canManage && attendanceRowState(a) === "checked-in" && (
            <Button size="xs" variant="outline" onClick={() => setCheckoutTarget(a)} aria-label="Manual check-out">
              <LogOut className="h-3.5 w-3.5" />
            </Button>
          )}
          <Button size="xs" variant="outline" onClick={() => setDetailTarget(a)} aria-label="View logs">
            <Eye className="h-3.5 w-3.5" />
          </Button>
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      {kpiError && (
        <Alert variant="error" title="Failed to load attendance overview">
          {kpiError}
          <Button size="sm" variant="outline" className="mt-3" onClick={() => setRefreshKey((k) => k + 1)}>
            Retry
          </Button>
        </Alert>
      )}

      {error && (
        <Alert variant="error" title="Failed to load attendance records">
          {error}
          <Button size="sm" variant="outline" className="mt-3" onClick={() => setRefreshKey((k) => k + 1)}>
            Retry
          </Button>
        </Alert>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        <KpiCard
          loading={kpiKey === null}
          label="Check-ins Today"
          value={kpis?.checkInsToday ?? "—"}
          icon={<DoorOpen className="h-4 w-4" />}
          accent="bg-emerald-100 text-emerald-700"
          sub={<p className="text-xs text-emerald-600 font-medium">{kpis ? "GRANTED entries" : "\u00A0"}</p>}
        />
        <KpiCard
          loading={kpiKey === null}
          label="Currently In Facility"
          value={kpis?.inFacilityNow ?? "—"}
          icon={<Users className="h-4 w-4" />}
          accent="bg-sky-100 text-sky-700"
          sub={<p className="text-xs text-sky-600 font-medium">{kpis ? "No exit time recorded" : "\u00A0"}</p>}
        />
        <KpiCard
          loading={kpiKey === null}
          label="Peak Hour (90 days)"
          value={kpis?.peakHour ?? "—"}
          icon={<Clock className="h-4 w-4" />}
          accent="bg-amber-100 text-amber-700"
          sub={kpis ? <p className="text-xs text-amber-600 font-medium">{kpis.successRate}% grant rate</p> : undefined}
        />
        <KpiCard
          loading={kpiKey === null}
          label="Overdue Memberships"
          value={kpis?.overdueMemberships ?? "—"}
          icon={<CalendarX2 className="h-4 w-4" />}
          accent="bg-red-100 text-red-700"
          sub={<p className="text-xs text-slate-400">EXPIRED memberships</p>}
        />
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <div className="w-full sm:w-72">
          <Input
            type="search"
            placeholder="Search name or member code..."
            startIcon={<Search className="h-4 w-4" />}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <Input type="date" value={date} max={today} onChange={(e) => setDate(e.target.value || today)} className="w-full sm:w-44" />
        <div className="w-full sm:w-44">
          <Select
            aria-label="Status filter"
            value={status}
            onChange={(e) => setStatus(e.target.value as AttendanceStatus | "ALL")}
            options={[
              { value: "ALL", label: "All status" },
              { value: "GRANTED", label: "Granted" },
              { value: "REJECTED", label: "Denied" },
            ]}
          />
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={() => {
            setSearch("");
            setStatus("ALL");
            setDate(today);
          }}
          disabled={!search && status === "ALL" && date === today}
        >
          Clear
        </Button>
        {canManage && (
          <div className="ml-auto">
            <Button onClick={() => setQuickOpen(true)}>
              <ScanLine className="h-4 w-4" /> Quick Check-in
            </Button>
          </div>
        )}
      </div>

      <div className="rounded-xl border border-border bg-card shadow-sm overflow-hidden">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border px-5 py-4">
          <div className="flex items-center gap-2.5">
            <h2 className="text-lg font-bold text-slate-900">Attendance Log</h2>
            <Badge variant="default">{totalItems} records</Badge>
            {loading && <Badge variant="secondary">Refreshing...</Badge>}
          </div>
        </div>

        <Table
          columns={columns}
          data={pageItems}
          getRowKey={(a) => a.id}
          loading={loading}
          emptyTitle="No attendance records"
          emptyMessage={
            search || status !== "ALL"
              ? "Try adjusting your filters."
              : "No check-ins recorded for this date."
          }
          footer={
            totalItems > 0 ? (
              <Pagination
                page={page}
                pageSize={pageSize}
                totalItems={totalItems}
                onPageChange={setPage}
                onPageSizeChange={(s) => {
                  setPageSize(s);
                  setPage(1);
                }}
                pageSizeOptions={[10, 25, 50, 100]}
              />
            ) : undefined
          }
        />
      </div>

      <Card
        title="Hourly Check-in Trends"
        subtitle="Distribution of granted entries by hour (last 90 days)"
        action={report?.peakHour ? <Badge variant="info">Peak: {report.peakHour}</Badge> : undefined}
      >
        {reportError ? (
          <Alert variant="error" title="Failed to load chart data">
            {reportError}
          </Alert>
        ) : !report ? (
          <div className="flex h-40 items-end gap-0.5">
            {Array.from({ length: 24 }, (_, i) => (
              <div key={i} className="flex-1 animate-pulse rounded-t bg-slate-200" style={{ height: `${20 + ((i * 7) % 70)}%` }} />
            ))}
          </div>
        ) : report.hourlyDistribution.length === 0 || report.hourlyDistribution.every((d) => d.visits === 0) ? (
          <div className="flex flex-col items-center justify-center gap-2 py-8 text-center">
            <TrendingUp className="h-8 w-8 text-slate-300" />
            <p className="text-sm text-slate-400">No visit data yet to chart.</p>
          </div>
        ) : (
          <TrendBars data={report.hourlyDistribution} peak={report.peakHour} />
        )}
      </Card>

      {canManage && (
        <Modal
          open={quickOpen}
          onClose={closeQuick}
          title="Quick Check-in"
          description="Scan or type a member code to grant or deny entry."
          size="md"
          footer={
            quickResult ? (
              <div className="flex items-center justify-end gap-3">
                <Button
                  variant="outline"
                  onClick={() => {
                    setQuickCode("");
                    setQuickResult(null);
                  }}
                >
                  <ScanLine className="h-4 w-4" /> New scan
                </Button>
                <Button onClick={closeQuick}>Done</Button>
              </div>
            ) : undefined
          }
        >
          {quickResult ? (
            <div className="space-y-4">
              {quickResult.granted ? (
                <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-5">
                  <div className="flex items-center gap-2 text-emerald-700">
                    <CheckCircle2 className="h-5 w-5" />
                    <p className="font-semibold">{quickResult.message}</p>
                  </div>
                  {quickResult.member && (
                    <div className="mt-4 flex items-center gap-3">
                      <Avatar name={quickResult.member.fullName} src={quickResult.member.photo} size="lg" />
                      <div>
                        <p className="font-semibold text-slate-900">{quickResult.member.fullName}</p>
                        <p className="font-mono text-xs text-slate-500">{quickResult.member.memberCode}</p>
                        {quickResult.member.packageName && (
                          <p className="text-xs text-slate-600 mt-0.5">
                            {quickResult.member.packageName} · {quickResult.member.daysRemaining} days left
                          </p>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                <div className="rounded-xl border border-red-200 bg-red-50 p-5">
                  <div className="flex items-center gap-2 text-red-600">
                    <XCircle className="h-5 w-5" />
                    <p className="font-semibold">Access Denied</p>
                  </div>
                  <p className="mt-2 text-sm text-red-700">
                    {quickResult.rejectionReason ?? quickResult.message}
                  </p>
                  {quickResult.member && (
                    <div className="mt-4 flex items-center gap-3">
                      <Avatar name={quickResult.member.fullName} src={quickResult.member.photo} size="lg" />
                      <div>
                        <p className="font-semibold text-slate-900">{quickResult.member.fullName}</p>
                        <p className="font-mono text-xs text-slate-500">{quickResult.member.memberCode}</p>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          ) : (
            <form id="quick-checkin-form" onSubmit={runQuickCheckIn} noValidate className="space-y-4">
              <Input
                id="qcCode"
                ref={quickInputRef}
                label="Member code or QR data"
                placeholder="e.g. CHG-1001 or paste QR JSON"
                value={quickCode}
                onChange={(e) => setQuickCode(e.target.value)}
              />
              <Button type="submit" className="w-full" loading={quickBusy}>
                <ScanLine className="h-4 w-4" /> Process entry
              </Button>
              {canManage && (
                <Alert variant="info" title="How it works">
                  Valid active memberships are granted automatically; expired or suspended memberships are denied
                  with the backend-provided reason.
                </Alert>
              )}
            </form>
          )}
        </Modal>
      )}

      {canManage && (
        <Modal
          open={checkoutTarget !== null}
          onClose={() => setCheckoutTarget(null)}
          title="Manual Check-out"
          description={checkoutTarget ? `${checkoutTarget.member?.fullName ?? "Member"} has not left the facility.` : undefined}
          size="sm"
          footer={
            <div className="flex items-center justify-end gap-3">
              <Button variant="ghost" onClick={() => setCheckoutTarget(null)} disabled={checkoutBusy}>
                Cancel
              </Button>
              <Button onClick={recordCheckout} loading={checkoutBusy}>
                <LogOut className="h-4 w-4" /> Confirm Check-out
              </Button>
            </div>
          }
        >
          <p className="text-sm text-slate-600">
            This records the check-out time via the backend <code className="text-xs">correct</code> endpoint and
            updates the duration.
          </p>
        </Modal>
      )}

      <Modal
        open={detailTarget !== null}
        onClose={() => setDetailTarget(null)}
        title="Attendance record"
        description="Full log details from the API payload"
        size="md"
        footer={
          <div className="flex items-center justify-end gap-3">
            <Button variant="ghost" onClick={() => setDetailTarget(null)}>
              Close
            </Button>
          </div>
        }
      >
        {detailTarget && (
          <div className="space-y-4">
            <div className="flex items-center gap-3">
              <Avatar name={detailTarget.member?.fullName ?? "?"} src={detailTarget.member?.photo} size="lg" />
              <div>
                <p className="font-semibold text-slate-900">{detailTarget.member?.fullName ?? "Unknown"}</p>
                <p className="font-mono text-xs text-slate-500">{detailTarget.member?.memberCode}</p>
              </div>
            </div>
            <div className="space-y-2 text-sm">
              {[
                ["Status", attendanceRowState(detailTarget) === "denied" ? "Denied" : attendanceRowState(detailTarget) === "checked-out" ? "Checked Out" : "Checked In"],
                ["Entered", formatDateTime(detailTarget.entryTime)],
                ["Exited", detailTarget.exitTime ? formatDateTime(detailTarget.exitTime) : "—"],
                ["Duration", attendanceDurationMinutes(detailTarget) != null ? `${Math.floor((attendanceDurationMinutes(detailTarget) ?? 0) / 60)}h ${(attendanceDurationMinutes(detailTarget) ?? 0) % 60}m` : "In facility"],
                ["Method", detailTarget.accessMethod.replace("_", " ")],
                ["Verified by", detailTarget.verifiedBy ?? "—"],
                ["Recorded", formatDateTime(detailTarget.createdAt)],
              ].map(([label, value]) => (
                <div key={label} className="flex items-start justify-between gap-4 border-b border-border/60 pb-2">
                  <span className="text-slate-500">{label}</span>
                  <span className="font-medium text-slate-800 text-right">{value}</span>
                </div>
              ))}
              {detailTarget.rejectionReason && (
                <div className="flex items-start gap-2 rounded-lg bg-red-50 border border-red-200 p-3 text-sm text-red-700">
                  <AlertTriangle className="h-4 w-4 shrink-0 mt-0.5" />
                  <span>{detailTarget.rejectionReason}</span>
                </div>
              )}
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}