"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import {
  ArrowLeft,
  CircleUserRound,
  RefreshCcw,
  Pause,
  Play,
Package as PackageIcon,
  CalendarDays,
  CalendarOff,
  Tag,
  CreditCard,
  Receipt,
  Repeat,
  FileText,
  BadgeCheck,
  Wallet,
  ListChecks,
} from "lucide-react";
import { Card } from "@/components/ui/card";
import { Badge, StatusBadge } from "@/components/ui/badge";
import { Avatar } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Table, type Column } from "@/components/ui/table";
import { Modal } from "@/components/ui/modal";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Alert } from "@/components/ui/alert";
import { PageLoader } from "@/components/ui/spinner";
import { useToast } from "@/components/ui/toast";
import { getMembershipById, renewMembership, updateMembershipStatus } from "@/lib/api/memberships";
import { listPackages } from "@/lib/api/packages";
import { MembershipStatusPill, shortMembershipId } from "@/components/shared/membership-status";
import { useAuth } from "@/providers/auth-provider";
import type { Membership, Package, Payment, PaymentMethod } from "@/types";
import { formatCurrency, formatDate } from "@/lib/utils";

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

interface RenewFields {
  packageId: string;
  pricePaid: string;
  paymentMethod: PaymentMethod;
  notes: string;
}

export function MembershipDetailPage() {
  const params = useParams<{ id: string }>();
  const id = params.id;
  const { user } = useAuth();
  const { toast } = useToast();

  const canManage = ["OWNER", "MANAGER"].includes(user?.role ?? "MEMBER");

  const [membership, setMembership] = useState<Membership | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loaded, setLoaded] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);

  const [packages, setPackages] = useState<Package[]>([]);
  const [renewOpen, setRenewOpen] = useState(false);
  const [renewFields, setRenewFields] = useState<RenewFields>({ packageId: "", pricePaid: "", paymentMethod: "CASH", notes: "" });
  const [renewErrors, setRenewErrors] = useState<Partial<Record<"packageId" | "pricePaid", string>>>({});
  const [renewBusy, setRenewBusy] = useState(false);

  const [statusAction, setStatusAction] = useState<"pause" | "resume" | null>(null);
  const [statusBusy, setStatusBusy] = useState(false);

  const currentIdRef = useRef(id);

  useEffect(() => {
    currentIdRef.current = id;

    getMembershipById(id)
      .then((res) => {
        if (currentIdRef.current !== id) return;
        setMembership(res.membership);
        setError(null);
      })
      .catch((e) => {
        if (currentIdRef.current !== id) return;
        setError(e instanceof Error ? e.message : "Failed to load membership");
      })
      .finally(() => {
        if (currentIdRef.current === id) setLoaded(true);
      });
  }, [id, refreshKey]);

  useEffect(() => {
    listPackages({ status: "ACTIVE" })
      .then((res) => setPackages(res.packages))
      .catch(() => {});
  }, []);

  const m = membership;

  const expiry = m ? new Date(m.endDate) : null;
  const now = new Date();
  const expired = expiry ? expiry < now : false;
  const daysRemaining = expiry ? Math.max(0, Math.ceil((expiry.getTime() - now.getTime()) / 86400000)) : 0;

  const paymentCount = m?.payments?.length ?? 0;
  const totalPaid = (m?.payments ?? []).reduce((sum, p) => sum + p.amount, 0);
  const billingMethod = m?.payments?.[0]?.paymentMethod;

  const packageOptions = useMemo(() => {
    const opts = packages.map((p) => ({ value: p.id, label: `${p.name} — ${p.durationDays} days · ${formatCurrency(p.price)}` }));
    if (m && !packages.some((p) => p.id === m.packageId)) {
      opts.unshift({ value: m.packageId, label: `${m.package?.name ?? "Current package"} — ${m.package?.durationDays ?? "?"} days · ${formatCurrency(m.pricePaid)}` });
    }
    return opts;
  }, [packages, m]);

  const openRenew = () => {
    if (!m) return;
    const pkg = packages.find((p) => p.id === m.packageId) ?? m.package;
    setRenewFields({
      packageId: m.packageId,
      pricePaid: pkg ? String(m.package && pkg.id === m.packageId && !packages.some((x) => x.id === m.packageId) ? m.pricePaid : pkg.price) : "",
      paymentMethod: "CASH",
      notes: "",
    });
    setRenewErrors({});
    setRenewOpen(true);
  };

  const submitRenew = async (e: React.FormEvent) => {
    e.preventDefault();
    const next: typeof renewErrors = {};
    if (!renewFields.packageId) next.packageId = "Select a package";
    const price = Number(renewFields.pricePaid);
    if (!renewFields.pricePaid.trim() || isNaN(price) || price < 0) next.pricePaid = "Enter a valid amount";
    setRenewErrors(next);
    if (Object.keys(next).length > 0) {
      toast("error", "Check the form", "Please fix the highlighted fields.");
      return;
    }

    setRenewBusy(true);
    try {
      const res = await renewMembership(id, {
        packageId: renewFields.packageId,
        pricePaid: price,
        paymentMethod: renewFields.paymentMethod,
        notes: renewFields.notes || undefined,
      });
      setRenewOpen(false);
      setRefreshKey((k) => k + 1);
      toast("success", "Membership renewed", `${res.membership.package?.name} · renewed to ${formatDate(res.membership.endDate)}`);
    } catch (err) {
      toast("error", "Renew failed", err instanceof Error ? err.message : "Failed to renew membership");
    } finally {
      setRenewBusy(false);
    }
  };

  const submitStatusChange = async () => {
    if (!statusAction || !m) return;
    const nextStatus = statusAction === "pause" ? "SUSPENDED" : "ACTIVE";
    setStatusBusy(true);
    try {
      const res = await updateMembershipStatus(m.id, nextStatus, statusAction === "pause" ? "Paused by staff" : "Resumed");
      setStatusAction(null);
      setRefreshKey((k) => k + 1);
      toast("success", statusAction === "pause" ? "Membership paused" : "Membership resumed", res.membership.status);
    } catch (err) {
      toast("error", "Update failed", err instanceof Error ? err.message : "Failed to update membership status");
    } finally {
      setStatusBusy(false);
    }
  };

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
      cell: (p) => <Badge variant="secondary">{p.paymentMethod.replace("_", " ")}</Badge>,
    },
    {
      key: "status",
      header: "Status",
      cell: (p) => <StatusBadge status={p.status} />,
    },
  ];

  if (!loaded) {
    return <PageLoader label="Loading membership details..." />;
  }

  if (error || !m) {
    return (
      <div className="max-w-2xl mx-auto">
        <Alert variant="error" title="Unable to load membership">
          {error ?? "Membership record not found."}
        </Alert>
        <div className="mt-4 text-center">
          <Link href="/memberships">
            <Button variant="outline">Back to Memberships</Button>
          </Link>
        </div>
      </div>
    );
  }

  const active = m.status === "ACTIVE";

  return (
    <div className="space-y-6">
      <Link href="/memberships" className="inline-flex items-center gap-1.5 text-sm font-medium text-slate-500 hover:text-slate-900">
        <ArrowLeft className="h-4 w-4" /> Back to Memberships
      </Link>

      <div className="rounded-2xl border border-border bg-white shadow-sm overflow-hidden">
        <div className="bg-gradient-to-r from-[#0F172A] to-[#1e293b] px-6 py-6">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div className="flex items-center gap-4">
              <Avatar name={m.member?.fullName ?? "?"} src={m.member?.photo} size="xl" />
              <div>
                <div className="flex flex-wrap items-center gap-2.5">
                  <h1 className="text-2xl font-bold text-white">{m.member?.fullName ?? "Member"}</h1>
                  <MembershipStatusPill membership={m} />
                </div>
                <p className="mt-1 font-mono text-sm text-slate-300">
                  {shortMembershipId(m.id)}
                  {m.member?.memberCode ? ` · ${m.member.memberCode}` : ""}
                </p>
                <div className="mt-2 flex flex-wrap items-center gap-2 text-xs text-slate-300">
                  <BadgeCheck className="h-3.5 w-3.5 text-emerald-400" />
                  {m.package?.name} · {formatDate(m.startDate)} — {formatDate(m.endDate)}
                </div>
              </div>
            </div>
            <div className="flex flex-wrap gap-2">
              {m.member && (
                <Link href={`/members/${m.member.id}`}>
                  <Button variant="outline" size="sm" className="bg-white/10 border-white/20 text-white hover:bg-white/20">
                    <CircleUserRound className="h-3.5 w-3.5" /> View Member
                  </Button>
                </Link>
              )}
              {canManage && active && (
                <Button variant="outline" size="sm" className="bg-white/10 border-white/20 text-white hover:bg-white/20" onClick={() => setStatusAction("pause")}>
                  <Pause className="h-3.5 w-3.5" /> Pause
                </Button>
              )}
              {canManage && m.status === "SUSPENDED" && (
                <Button variant="outline" size="sm" className="bg-white/10 border-white/20 text-white hover:bg-white/20" onClick={() => setStatusAction("resume")}>
                  <Play className="h-3.5 w-3.5" /> Resume
                </Button>
              )}
              {canManage && (
                <Button size="sm" onClick={openRenew}>
                  <RefreshCcw className="h-3.5 w-3.5" /> Renew
                </Button>
              )}
            </div>
          </div>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-px bg-border/60">
          <StatTile
            label="Duration"
            value={`${m.package?.durationDays ?? "—"} days`}
            icon={<CalendarDays className="h-4 w-4" />}
            accent="bg-emerald-100 text-emerald-700"
          />
          <StatTile
            label="Amount paid"
            value={formatCurrency(m.pricePaid)}
            icon={<CreditCard className="h-4 w-4" />}
            accent="bg-sky-100 text-sky-700"
          />
          <StatTile
            label="Days remaining"
            value={expired ? "Expired" : daysRemaining}
            icon={<CalendarOff className="h-4 w-4" />}
            accent="bg-amber-100 text-amber-700"
          />
          <StatTile
            label="Payments made"
            value={paymentCount}
            icon={<Wallet className="h-4 w-4" />}
            accent="bg-violet-100 text-violet-700"
          />
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-1">
          <div className="flex items-center gap-2 border-b border-border px-5 py-4">
            <ListChecks className="h-4 w-4 text-brand" />
            <h2 className="text-lg font-bold text-slate-900">Membership details</h2>
          </div>
          <div className="space-y-4 px-5 py-4">
            <DetailRow icon={<PackageIcon className="h-4 w-4" />} label="Package" value={m.package?.name ?? "—"} />
            <DetailRow icon={<CalendarDays className="h-4 w-4" />} label="Start date" value={formatDate(m.startDate)} />
            <DetailRow icon={<CalendarOff className="h-4 w-4" />} label="Expiry date" value={formatDate(m.endDate)} />
            <DetailRow icon={<Tag className="h-4 w-4" />} label="Package duration" value={m.package ? `${m.package.durationDays} days` : "—"} />
            <DetailRow icon={<CreditCard className="h-4 w-4" />} label="Amount paid" value={formatCurrency(m.pricePaid)} />
            <DetailRow
              icon={<Receipt className="h-4 w-4" />}
              label="Billing method"
              value={billingMethod ? billingMethod.replace("_", " ") : "—"}
            />
            <DetailRow
              icon={<Repeat className="h-4 w-4" />}
              label="Auto-renew"
              value={<Badge variant={m.autoRenew ? "success" : "secondary"}>{m.autoRenew ? "On" : "Off"}</Badge>}
            />
            {m.notes && <DetailRow icon={<FileText className="h-4 w-4" />} label="Notes" value={m.notes} />}
            <DetailRow icon={<BadgeCheck className="h-4 w-4" />} label="Created" value={formatDate(m.createdAt)} />
          </div>
        </Card>

        <Card className="lg:col-span-2">
          <div className="flex items-center gap-2 border-b border-border px-5 py-4">
            <Wallet className="h-4 w-4 text-brand" />
            <h2 className="text-lg font-bold text-slate-900">Payment history</h2>
            <Badge variant="secondary" className="ml-auto">{totalPaid > 0 ? formatCurrency(totalPaid) : "No payments"}</Badge>
          </div>
          <Table
            columns={paymentColumns}
            data={m.payments ?? []}
            getRowKey={(p) => p.id}
            emptyTitle="No payments recorded"
            emptyMessage="Payments will appear here when this membership is created or renewed."
          />
        </Card>
      </div>

      {canManage && (
        <>
          <Modal
            open={renewOpen}
            onClose={() => setRenewOpen(false)}
            title="Renew membership"
            description={m.member ? `Extend ${m.member.fullName}'s membership by choosing a package and payment details.` : "Extend this membership."}
            size="lg"
            footer={
              <div className="flex items-center justify-end gap-3">
                <Button variant="ghost" onClick={() => setRenewOpen(false)} disabled={renewBusy}>
                  Cancel
                </Button>
                <Button onClick={submitRenew} loading={renewBusy}>
                  <RefreshCcw className="h-4 w-4" /> Renew
                </Button>
              </div>
            }
          >
            <form id="renew-membership-form" onSubmit={submitRenew} noValidate className="grid gap-5 sm:grid-cols-2">
              <div className="sm:col-span-2">
                <Select
                  id="rnPackage"
                  label="Package *"
                  value={renewFields.packageId}
                  onChange={(e) => {
                    const p = packages.find((x) => x.id === e.target.value);
                    setRenewFields((f) => ({ ...f, packageId: e.target.value, pricePaid: p ? String(p.price) : f.pricePaid }));
                    setRenewErrors((er) => ({ ...er, packageId: undefined }));
                  }}
                  options={packageOptions}
                  error={renewErrors.packageId}
                />
              </div>
              <Select
                id="rnMethod"
                label="Payment method"
                value={renewFields.paymentMethod}
                onChange={(e) => setRenewFields((f) => ({ ...f, paymentMethod: e.target.value as PaymentMethod }))}
                options={[
                  { value: "CASH", label: "Cash" },
                  { value: "CARD", label: "Card" },
                  { value: "BANK_TRANSFER", label: "Bank transfer" },
                  { value: "MOBILE_MONEY", label: "Mobile money" },
                ]}
              />
              <Input
                id="rnPrice"
                label="Amount paid (USD)"
                type="number"
                min={0}
                step="0.01"
                value={renewFields.pricePaid}
                onChange={(e) => {
                  setRenewFields((f) => ({ ...f, pricePaid: e.target.value }));
                  setRenewErrors((er) => ({ ...er, pricePaid: undefined }));
                }}
                error={renewErrors.pricePaid}
              />
              <div className="sm:col-span-2">
                <Input
                  id="rnNotes"
                  label="Notes (optional)"
                  value={renewFields.notes}
                  onChange={(e) => setRenewFields((f) => ({ ...f, notes: e.target.value }))}
                  placeholder="e.g. Renewed for 3 months"
                />
              </div>
            </form>
          </Modal>

          <Modal
            open={statusAction !== null}
            onClose={() => setStatusAction(null)}
            title={statusAction === "pause" ? "Pause membership" : "Resume membership"}
            description={
              statusAction === "pause"
                ? `Pausing ${m.member?.fullName ?? "this member"}'s membership blocks check-ins until you resume it.`
                : `Allow ${m.member?.fullName ?? "this member"} to check in again.`
            }
            size="md"
            footer={
              <div className="flex items-center justify-end gap-3">
                <Button variant="ghost" onClick={() => setStatusAction(null)} disabled={statusBusy}>
                  Cancel
                </Button>
                <Button variant={statusAction === "pause" ? "danger" : "primary"} onClick={submitStatusChange} loading={statusBusy}>
                  {statusAction === "pause" ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
                  {statusAction === "pause" ? "Pause" : "Resume"}
                </Button>
              </div>
            }
          >
            <Alert
              variant={statusAction === "pause" ? "warning" : "info"}
              title={statusAction === "pause" ? "Temporary" : "Reactivates immediately"}
            >
              {statusAction === "pause"
                ? "You can resume at any time; the expiry date stays unchanged."
                : "The membership will be Active again and usable for check-in."}
            </Alert>
          </Modal>
        </>
      )}
    </div>
  );
}