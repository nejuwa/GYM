"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import {
  Phone,
  Mail,
  MapPin,
  CalendarDays,
  Cake,
  Pencil,
  QrCode,
  CircleUserRound,
  Users,
  CreditCard,
  CalendarCheck,
  ClipboardList,
  UserPlus,
  BadgeCheck,
} from "lucide-react";
import { Card } from "@/components/ui/card";
import { Badge, StatusBadge } from "@/components/ui/badge";
import { Avatar } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Tabs } from "@/components/ui/tabs";
import { Table, type Column } from "@/components/ui/table";
import { PageLoader } from "@/components/ui/spinner";
import { Alert } from "@/components/ui/alert";
import { getMemberById } from "@/lib/api/members";
import type {
  Attendance,
  Membership,
  Member as MemberType,
  Payment,
  TrainingSession,
  TrainerAssignment,
} from "@/types";
import { formatCurrency, formatDate, formatDateTime } from "@/lib/utils";

function DetailRow({ icon, label, value }: { icon: React.ReactNode; label: string; value: React.ReactNode }) {
  return (
    <div className="flex items-start gap-3">
      <span className="mt-0.5 text-slate-400">{icon}</span>
      <div className="min-w-0">
        <p className="text-xs text-slate-500">{label}</p>
        <p className="text-sm font-medium text-slate-900 break-words">{value ?? "—"}</p>
      </div>
    </div>
  );
}

function StatTile({
  label,
  value,
  icon,
  accent,
}: {
  label: string;
  value: React.ReactNode;
  icon: React.ReactNode;
  accent?: string;
}) {
  return (
    <div className="rounded-xl border border-border bg-white p-4">
      <div className={`flex h-8 w-8 items-center justify-center rounded-lg ${accent ?? "bg-slate-100 text-slate-600"}`}>
        {icon}
      </div>
      <p className="mt-3 text-xl font-bold text-slate-900">{value}</p>
      <p className="text-xs text-slate-500">{label}</p>
    </div>
  );
}

export function MemberDetailPage() {
  const params = useParams<{ id: string }>();
  const id = params.id;

  const [member, setMember] = useState<MemberType | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loaded, setLoaded] = useState(false);
  const [tab, setTab] = useState("memberships");

  useEffect(() => {
    getMemberById(id)
      .then((res) => {
        setMember(res.member);
        setError(null);
      })
      .catch((e) => {
        setError(e instanceof Error ? e.message : "Failed to load member");
      })
      .finally(() => setLoaded(true));
  }, [id]);

  if (!loaded) {
    return <PageLoader label="Loading member profile..." />;
  }

  if (error || !member) {
    return (
      <div className="max-w-2xl mx-auto">
        <Alert variant="error" title="Unable to load member">
          {error ?? "Member record not found."}
        </Alert>
        <div className="mt-4 text-center">
          <Link href="/members">
            <Button variant="outline">Back to Members</Button>
          </Link>
        </div>
      </div>
    );
  }

  const latestMembership = member.memberships?.[0] ?? null;
  const totalSpent = (member.payments ?? []).reduce((sum, p) => sum + p.amount, 0);
  const activeTrainer = (member.trainers ?? []).find((t) => t.status === "ACTIVE");

  const membershipColumns: Array<Column<Membership>> = [
    {
      key: "package",
      header: "Package",
      cell: (m) => (
        <div>
          <p className="font-medium text-slate-900">{m.package?.name ?? "Package"}</p>
          <p className="text-xs text-slate-500">{m.package?.durationDays} days</p>
        </div>
      ),
    },
    {
      key: "period",
      header: "Period",
      cell: (m) => (
        <p className="text-sm text-slate-600">
          {formatDate(m.startDate)} — {formatDate(m.endDate)}
        </p>
      ),
    },
    {
      key: "price",
      header: "Paid",
      cell: (m) => <p className="text-sm font-medium">{formatCurrency(m.pricePaid)}</p>,
    },
    {
      key: "renew",
      header: "Auto-renew",
      cell: (m) => (m.autoRenew ? <Badge variant="info">Yes</Badge> : <Badge variant="neutral">No</Badge>),
    },
    {
      key: "status",
      header: "Status",
      cell: (m) => <StatusBadge status={m.status} />,
    },
  ];

  const attendanceColumns: Array<Column<Attendance>> = [
    {
      key: "in",
      header: "Check-in",
      cell: (a) => <p className="text-sm text-slate-700">{formatDateTime(a.entryTime)}</p>,
    },
    {
      key: "method",
      header: "Method",
      cell: (a) => <Badge variant="secondary">{a.accessMethod}</Badge>,
    },
    {
      key: "status",
      header: "Status",
      cell: (a) => <StatusBadge status={a.status} />,
    },
  ];

  const paymentColumns: Array<Column<Payment>> = [
    {
      key: "receipt",
      header: "Receipt",
      cell: (p) => <p className="font-mono text-xs text-slate-600">{p.receiptNumber}</p>,
    },
    {
      key: "date",
      header: "Date",
      cell: (p) => <p className="text-sm text-slate-600">{formatDate(p.paymentDate)}</p>,
    },
    {
      key: "amount",
      header: "Amount",
      cell: (p) => <p className="text-sm font-medium">{formatCurrency(p.amount)}</p>,
    },
    {
      key: "method",
      header: "Method",
      cell: (p) => <p className="text-sm text-slate-600">{p.paymentMethod.replace("_", " ")}</p>,
    },
    {
      key: "status",
      header: "Status",
      cell: (p) => <StatusBadge status={p.status} />,
    },
  ];

  const sessionColumns: Array<Column<TrainingSession>> = [
    {
      key: "title",
      header: "Session",
      cell: (s) => <p className="font-medium text-slate-900">{s.title}</p>,
    },
    {
      key: "trainer",
      header: "Trainer",
      cell: (s) => <p className="text-sm text-slate-600">{s.trainer?.fullName ?? "—"}</p>,
    },
    {
      key: "date",
      header: "Date",
      cell: (s) => <p className="text-sm text-slate-600">{formatDate(s.scheduledDate)}</p>,
    },
    {
      key: "time",
      header: "Time",
      cell: (s) => (
        <p className="text-sm text-slate-600">
          {s.startTime} — {s.endTime}
        </p>
      ),
    },
    {
      key: "status",
      header: "Status",
      cell: (s) => <StatusBadge status={s.status} />,
    },
  ];

  const assignmentColumns: Array<Column<TrainerAssignment>> = [
    {
      key: "trainer",
      header: "Trainer",
      cell: (a) => (
        <div className="flex items-center gap-2.5">
          <Avatar name={a.trainer?.fullName ?? "?"} size="xs" />
          <div>
            <p className="text-sm font-medium text-slate-900">{a.trainer?.fullName}</p>
            <p className="text-xs text-slate-500">{a.trainer?.specialization}</p>
          </div>
        </div>
      ),
    },
    {
      key: "assigned",
      header: "Assigned",
      cell: (a) => <p className="text-sm text-slate-600">{formatDate(a.assignedDate)}</p>,
    },
    {
      key: "status",
      header: "Status",
      cell: (a) => <StatusBadge status={a.status} />,
    },
  ];

  const tabs = [
    { value: "memberships", label: `Memberships (${member.memberships?.length ?? 0})` },
    { value: "attendance", label: `Attendance (${member.attendances?.length ?? 0})` },
    { value: "payments", label: `Payments (${member.payments?.length ?? 0})` },
    { value: "sessions", label: `Sessions (${member.sessions?.length ?? 0})` },
    { value: "trainers", label: `Trainers (${member.trainers?.length ?? 0})` },
  ];

  const assignments = member.trainers ?? [];

  return (
    <div className="space-y-6">
      <div className="rounded-2xl border border-border bg-white shadow-sm overflow-hidden">
        <div className="bg-gradient-to-r from-[#0F172A] to-[#1e293b] px-6 py-6">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div className="flex items-center gap-4">
              <Avatar name={member.fullName} src={member.photo} size="xl" />
              <div>
                <div className="flex items-center gap-2.5">
                  <h1 className="text-2xl font-bold text-white">{member.fullName}</h1>
                  <StatusBadge status={member.status} />
                </div>
                <p className="mt-1 font-mono text-sm text-slate-300">{member.memberCode}</p>
                {latestMembership && (
                  <div className="mt-2 flex flex-wrap items-center gap-2 text-xs text-slate-300">
                    <BadgeCheck className="h-3.5 w-3.5 text-emerald-400" />
                    {latestMembership.package?.name} · {formatDate(latestMembership.startDate)} —{" "}
                    {formatDate(latestMembership.endDate)}
                    <StatusBadge status={latestMembership.status} />
                  </div>
                )}
              </div>
            </div>
            <div className="flex flex-wrap gap-2">
              <Link href={`/members/${member.id}/edit`}>
                <Button variant="outline" size="sm" className="bg-white/10 border-white/20 text-white hover:bg-white/20">
                  <Pencil className="h-3.5 w-3.5" /> Edit Member
                </Button>
              </Link>
              <Link href={`/members/${member.id}/qr`}>
                <Button size="sm">
                  <QrCode className="h-3.5 w-3.5" /> View QR Code
                </Button>
              </Link>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-px bg-border/60">
          <StatTile
            label="Memberships"
            value={member.memberships?.length ?? 0}
            icon={<Users className="h-4 w-4" />}
            accent="bg-red-50 text-primary"
          />
          <StatTile
            label="Total paid"
            value={formatCurrency(totalSpent)}
            icon={<CreditCard className="h-4 w-4" />}
            accent="bg-emerald-50 text-emerald-600"
          />
          <StatTile
            label="Visits"
            value={member.attendances?.length ?? 0}
            icon={<CalendarCheck className="h-4 w-4" />}
            accent="bg-sky-50 text-sky-600"
          />
          <StatTile
            label="Sessions"
            value={member.sessions?.length ?? 0}
            icon={<ClipboardList className="h-4 w-4" />}
            accent="bg-amber-50 text-amber-600"
          />
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2 rounded-xl border border-border bg-card shadow-sm">
          <Tabs tabs={tabs} value={tab} onChange={setTab} />

          {tab === "memberships" && (
            <Table
              columns={membershipColumns}
              data={member.memberships ?? []}
              getRowKey={(m) => m.id}
              emptyTitle="No memberships yet"
              emptyMessage="Register a membership to get started."
              footer={
                <div className="px-5 py-3 border-t border-border">
                  <Link href="/memberships/new">
                    <Button size="sm" variant="outline" leftIcon={<UserPlus className="h-3.5 w-3.5" />}>
                      New Membership
                    </Button>
                  </Link>
                </div>
              }
            />
          )}

          {tab === "attendance" && (
            <Table
              columns={attendanceColumns}
              data={member.attendances ?? []}
              getRowKey={(a) => a.id}
              emptyTitle="No attendance recorded"
              emptyMessage="Check-ins will appear here."
            />
          )}

          {tab === "payments" && (
            <Table
              columns={paymentColumns}
              data={member.payments ?? []}
              getRowKey={(p) => p.id}
              emptyTitle="No payments recorded"
              emptyMessage="Payments will appear here."
            />
          )}

          {tab === "sessions" && (
            <Table
              columns={sessionColumns}
              data={member.sessions ?? []}
              getRowKey={(s) => s.id}
              emptyTitle="No training sessions"
              emptyMessage="Sessions with assigned trainers will appear here."
            />
          )}

          {tab === "trainers" && (
            <Table
              columns={assignmentColumns}
              data={assignments}
              getRowKey={(a) => a.id}
              emptyTitle="No trainer assignments"
              emptyMessage="Assign a trainer to help this member train."
            />
          )}
        </div>

        <div className="space-y-6">
          <Card title="Contact Details">
            <div className="space-y-4">
              <DetailRow icon={<Phone className="h-4 w-4" />} label="Phone" value={member.phone} />
              <DetailRow icon={<Mail className="h-4 w-4" />} label="Email" value={member.email} />
              <DetailRow icon={<MapPin className="h-4 w-4" />} label="Address" value={member.address} />
              <DetailRow icon={<Cake className="h-4 w-4" />} label="Date of birth" value={formatDate(member.dateOfBirth)} />
              <DetailRow icon={<CalendarDays className="h-4 w-4" />} label="Registered" value={formatDate(member.registrationDate ?? member.createdAt)} />
              <DetailRow
                icon={<CircleUserRound className="h-4 w-4" />}
                label="Emergency contact"
                value={
                  member.emergencyContact ? (
                    <span className="flex items-center gap-2">
                      <Phone className="h-3.5 w-3.5 text-slate-400" /> {member.emergencyContact}
                    </span>
                  ) : null
                }
              />
              {member.user && (
                <DetailRow
                  icon={<CircleUserRound className="h-4 w-4" />}
                  label="Linked account"
                  value={
                    <span className="flex items-center gap-2">
                      @{member.user.username}
                      <StatusBadge status={member.user.status} />
                    </span>
                  }
                />
              )}
            </div>
          </Card>

          <Card title="Current Trainer">
            {activeTrainer ? (
              <div className="flex items-center gap-3">
                <Avatar name={activeTrainer.trainer?.fullName ?? "?"} size="md" />
                <div>
                  <p className="text-sm font-semibold text-slate-900">{activeTrainer.trainer?.fullName}</p>
                  <p className="text-xs text-slate-500">{activeTrainer.trainer?.specialization}</p>
                </div>
              </div>
            ) : (
              <p className="text-sm text-slate-500">No trainer assigned yet.</p>
            )}
          </Card>
        </div>
      </div>
    </div>
  );
}