"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Search, Download, Plus, Eye } from "lucide-react";
import { Table, type Column } from "@/components/ui/table";
import { Pagination } from "@/components/ui/pagination";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { Avatar } from "@/components/ui/avatar";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Modal } from "@/components/ui/modal";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/toast";
import { useDebounce } from "@/hooks/use-debounce";
import { createMembership, listMemberships } from "@/lib/api/memberships";
import { listPackages } from "@/lib/api/packages";
import { listMembers } from "@/lib/api/members";
import { MembershipStatusPill, membershipStatus, shortMembershipId } from "@/components/shared/membership-status";
import { useAuth } from "@/providers/auth-provider";
import type { Member, Membership, MembershipStatus, Package, PaymentMethod } from "@/types";
import { formatCurrency, formatDate } from "@/lib/utils";

interface CreateFields {
  memberId: string;
  packageId: string;
  startDate: string;
  paymentMethod: PaymentMethod;
  pricePaid: string;
  autoRenew: boolean;
}

type FieldErrors = Partial<Record<"memberId" | "packageId" | "pricePaid", string>>;

export function MembershipsList() {
  const { user } = useAuth();
  const router = useRouter();
  const { toast } = useToast();

  const [search, setSearch] = useState("");
  const [status, setStatus] = useState<MembershipStatus | "ALL">("ALL");
  const [tier, setTier] = useState("ALL");
  const debouncedSearch = useDebounce(search, 350);

  const [memberships, setMemberships] = useState<Membership[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [resultKey, setResultKey] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [refreshKey, setRefreshKey] = useState(0);

  const [members, setMembers] = useState<Member[]>([]);
  const [packages, setPackages] = useState<Package[]>([]);
  const [createOpen, setCreateOpen] = useState(false);
  const [fields, setFields] = useState<CreateFields>({ memberId: "", packageId: "", startDate: "", paymentMethod: "CASH", pricePaid: "", autoRenew: false });
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  const [createBusy, setCreateBusy] = useState(false);

  const queryKey = `${debouncedSearch}|${status}`;
  const loading = resultKey !== queryKey;
  const currentKeyRef = useRef(queryKey);

  useEffect(() => {
    currentKeyRef.current = queryKey;

    listMemberships({ status, search: debouncedSearch || undefined })
      .then((res) => {
        if (currentKeyRef.current !== queryKey) return;
        setPage(1);
        setMemberships(res.memberships);
        setError(null);
        setResultKey(queryKey);
      })
      .catch((e) => {
        if (currentKeyRef.current !== queryKey) return;
        setError(e instanceof Error ? e.message : "Failed to load memberships");
        setResultKey(queryKey);
      });
  }, [debouncedSearch, status, queryKey, refreshKey]);

  useEffect(() => {
    listPackages({ status: "ACTIVE" })
      .then((res) => setPackages(res.packages))
      .catch(() => {});
    listMembers({ status: "ALL" })
      .then((res) => setMembers(res.members))
      .catch(() => {});
  }, []);

  const role = user?.role ?? "MEMBER";
  const canManage = ["OWNER", "MANAGER"].includes(role);

  const tierOptions = useMemo(() => {
    const names = Array.from(new Set(memberships.map((m) => m.package?.name).filter(Boolean)));
    return names.map((name) => ({ value: name as string, label: name as string }));
  }, [memberships]);

  const display = useMemo(() => {
    if (tier === "ALL") return memberships;
    return memberships.filter((m) => m.package?.name === tier);
  }, [memberships, tier]);

  const totalItems = display.length;
  const pageItems = display.slice((page - 1) * pageSize, page * pageSize);

  const openCreate = () => {
    const today = new Date().toISOString().split("T")[0];
    setFields({
      memberId: members[0]?.id ?? "",
      packageId: packages[0]?.id ?? "",
      startDate: today,
      paymentMethod: "CASH",
      pricePaid: packages[0] ? String(packages[0].price) : "",
      autoRenew: false,
    });
    setFieldErrors({});
    setCreateOpen(true);
  };

  const submitCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    const next: FieldErrors = {};
    if (!fields.memberId) next.memberId = "Select a member";
    if (!fields.packageId) next.packageId = "Select a package";
    const price = Number(fields.pricePaid);
    if (!fields.pricePaid.trim() || isNaN(price) || price < 0) next.pricePaid = "Enter a valid amount";
    setFieldErrors(next);
    if (Object.keys(next).length > 0) {
      toast("error", "Check the form", "Please fix the highlighted fields.");
      return;
    }

    setCreateBusy(true);
    try {
      const res = await createMembership({
        memberId: fields.memberId,
        packageId: fields.packageId,
        startDate: fields.startDate || undefined,
        pricePaid: price,
        paymentMethod: fields.paymentMethod,
        autoRenew: fields.autoRenew,
      });
      setCreateOpen(false);
      setRefreshKey((k) => k + 1);
      toast("success", "Membership created", `${res.membership.member?.fullName ?? ""} · ${res.membership.package?.name}`);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to create membership";
      toast("error", "Create failed", message);
    } finally {
      setCreateBusy(false);
    }
  };

  const exportCsv = () => {
    const header = ["Member", "Code", "Membership ID", "Package", "Start Date", "Expiry Date", "Status"];
    const rows = display.map((m) => [
      m.member?.fullName ?? "",
      m.member?.memberCode ?? "",
      shortMembershipId(m.id),
      m.package?.name ?? "",
      formatDate(m.startDate),
      formatDate(m.endDate),
      membershipStatus(m).label,
    ]);
    const csv = [header, ...rows]
      .map((r) => r.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(","))
      .join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `memberships-${new Date().toISOString().split("T")[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const columns: Array<Column<Membership>> = [
    {
      key: "member",
      header: "Member",
      cell: (m) => (
        <div className="flex items-center gap-3">
          <Avatar name={m.member?.fullName ?? "?"} src={m.member?.photo} size="sm" />
          <div className="min-w-0">
            <p className="font-medium text-slate-900 truncate">{m.member?.fullName ?? "Unknown"}</p>
            {m.member?.memberCode && <p className="text-xs text-slate-500 font-mono">{m.member.memberCode}</p>}
          </div>
        </div>
      ),
    },
    {
      key: "mid",
      header: "Membership ID",
      cell: (m) => <p className="font-mono text-xs text-slate-600">{shortMembershipId(m.id)}</p>,
    },
    {
      key: "package",
      header: "Package",
      cell: (m) => (
        <div>
          <p className="text-sm font-medium text-slate-900">{m.package?.name ?? "Package"}</p>
          <p className="text-xs text-slate-500">{m.package?.durationDays ?? ""} days</p>
        </div>
      ),
    },
    {
      key: "start",
      header: "Start Date",
      cell: (m) => <p className="text-sm text-slate-600">{formatDate(m.startDate)}</p>,
    },
    {
      key: "expiry",
      header: "Expiry Date",
      cell: (m) => <p className="text-sm text-slate-600">{formatDate(m.endDate)}</p>,
    },
    {
      key: "status",
      header: "Status",
      cell: (m) => <MembershipStatusPill membership={m} />,
    },
    {
      key: "action",
      header: "Action",
      className: "text-right",
      cell: (m) => (
        <div onClick={(e) => e.stopPropagation()}>
          <Link href={`/memberships/${m.id}`}>
            <Button size="xs" variant="outline" aria-label={`View ${m.member?.fullName ?? "membership"}`}>
              <Eye className="h-3.5 w-3.5" />
            </Button>
          </Link>
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-5">
      {error && (
        <Alert variant="error" title="Failed to load memberships">
          {error}
          <Button size="sm" variant="outline" className="mt-3" onClick={() => setRefreshKey((k) => k + 1)}>
            Retry
          </Button>
        </Alert>
      )}

      <div className="flex flex-wrap items-center gap-3">
        <div className="w-full sm:w-72">
          <Input
            type="search"
            placeholder="Search members..."
            startIcon={<Search className="h-4 w-4" />}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <div className="w-full sm:w-44">
          <Select
            aria-label="Package filter"
            value={tier}
            onChange={(e) => {
              setTier(e.target.value);
              setPage(1);
            }}
            options={[{ value: "ALL", label: "All packages" }, ...tierOptions]}
          />
        </div>
        <div className="w-full sm:w-44">
          <Select
            aria-label="Status filter"
            value={status}
            onChange={(e) => setStatus(e.target.value as MembershipStatus | "ALL")}
            options={[
              { value: "ALL", label: "All Status" },
              { value: "ACTIVE", label: "Active" },
              { value: "SUSPENDED", label: "Paused" },
              { value: "EXPIRED", label: "Expired" },
              { value: "CANCELLED", label: "Canceled" },
              { value: "PENDING", label: "Pending" },
            ]}
          />
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={() => {
            setSearch("");
            setStatus("ALL");
            setTier("ALL");
          }}
          disabled={!search && status === "ALL" && tier === "ALL"}
        >
          Clear
        </Button>
        <div className="ml-auto">
          <Button variant="outline" size="sm" onClick={exportCsv}>
            <Download className="h-4 w-4" /> Export
          </Button>
        </div>
      </div>

      <div className="rounded-xl border border-border bg-card shadow-sm overflow-hidden">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border px-5 py-4">
          <div className="flex items-center gap-2.5">
            <h2 className="text-lg font-bold text-slate-900">Memberships</h2>
            <Badge variant="default">{totalItems} Total</Badge>
          </div>
          {canManage && (
            <Button onClick={openCreate}>
              <Plus className="h-4 w-4" /> Create Membership
            </Button>
          )}
        </div>

        <Table
          columns={columns}
          data={pageItems}
          getRowKey={(m) => m.id}
          loading={loading}
          headVariant="dark"
          emptyTitle="No memberships found"
          emptyMessage={
            debouncedSearch || status !== "ALL" || tier !== "ALL"
              ? "Try adjusting your search or filters."
              : "Create a membership to get started."
          }
          onRowClick={(m) => router.push(`/memberships/${m.id}`)}
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

      {canManage && (
        <Modal
          open={createOpen}
          onClose={() => setCreateOpen(false)}
          title="Create Membership"
          description="Assign a membership to a member with the chosen package."
          size="lg"
          footer={
            <div className="flex items-center justify-end gap-3">
              <Button variant="ghost" onClick={() => setCreateOpen(false)} disabled={createBusy}>
                Cancel
              </Button>
              <Button onClick={submitCreate} loading={createBusy}>
                <Plus className="h-4 w-4" /> Create Membership
              </Button>
            </div>
          }
        >
          <form id="create-membership-form" onSubmit={submitCreate} noValidate className="grid gap-5 sm:grid-cols-2">
            <div className="sm:col-span-2">
              <Select
                id="cmMember"
                label="Member *"
                placeholder="Select member"
                value={fields.memberId}
                onChange={(e) => {
                  setFields((f) => ({ ...f, memberId: e.target.value }));
                  setFieldErrors((er) => ({ ...er, memberId: undefined }));
                }}
                options={members.map((m) => ({ value: m.id, label: `${m.fullName} (${m.memberCode})` }))}
                error={fieldErrors.memberId}
              />
              {members.length === 0 && <p className="text-xs text-slate-400 mt-1.5">No members available yet.</p>}
            </div>
            <div className="sm:col-span-2">
              <Select
                id="cmPackage"
                label="Package *"
                placeholder="Select package"
                value={fields.packageId}
                onChange={(e) => {
                  const p = packages.find((x) => x.id === e.target.value);
                  setFields((f) => ({ ...f, packageId: e.target.value, pricePaid: p ? String(p.price) : f.pricePaid }));
                  setFieldErrors((er) => ({ ...er, packageId: undefined }));
                }}
                options={packages.map((p) => ({ value: p.id, label: `${p.name} — ${formatCurrency(p.price)} · ${p.durationDays} days` }))}
                error={fieldErrors.packageId}
              />
              {packages.length === 0 && (
                <p className="text-xs text-amber-600 mt-1.5">No active packages. Create one first in Packages.</p>
              )}
            </div>
            <Input
              id="cmStart"
              label="Start date"
              type="date"
              max={new Date(new Date().setDate(new Date().getDate() + 30)).toISOString().split("T")[0]}
              value={fields.startDate}
              onChange={(e) => setFields((f) => ({ ...f, startDate: e.target.value }))}
            />
            <Select
              id="cmMethod"
              label="Payment method"
              value={fields.paymentMethod}
              onChange={(e) => setFields((f) => ({ ...f, paymentMethod: e.target.value as PaymentMethod }))}
              options={[
                { value: "CASH", label: "Cash" },
                { value: "CARD", label: "Card" },
                { value: "BANK_TRANSFER", label: "Bank transfer" },
                { value: "MOBILE_MONEY", label: "Mobile money" },
              ]}
            />
            <div className="sm:col-span-2">
              <Input
                id="cmPrice"
                label="Amount paid (USD)"
                type="number"
                min={0}
                step="0.01"
                value={fields.pricePaid}
                onChange={(e) => {
                  setFields((f) => ({ ...f, pricePaid: e.target.value }));
                  setFieldErrors((er) => ({ ...er, pricePaid: undefined }));
                }}
                error={fieldErrors.pricePaid}
                hint="Defaults to the package price. A COMPLETED payment receipt is recorded automatically."
              />
            </div>
            <div className="sm:col-span-2 flex items-center gap-3 rounded-lg border border-border bg-slate-50 px-4 py-3">
              <Checkbox
                id="cmAutoRenew"
                checked={fields.autoRenew}
                onChange={(e) => setFields((f) => ({ ...f, autoRenew: e.target.checked }))}
              />
              <label htmlFor="cmAutoRenew" className="cursor-pointer">
                <p className="text-sm font-medium text-slate-700">Auto-renew on expiry</p>
                <p className="text-xs text-slate-500">Recharge the same package automatically when this period ends.</p>
              </label>
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
}