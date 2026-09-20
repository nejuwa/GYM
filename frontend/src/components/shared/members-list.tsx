"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Search, RefreshCw, ChevronRight, CalendarDays } from "lucide-react";
import { Table, type Column } from "@/components/ui/table";
import { Pagination } from "@/components/ui/pagination";
import { Avatar } from "@/components/ui/avatar";
import { Badge, StatusBadge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { useDebounce } from "@/hooks/use-debounce";
import { listMembers } from "@/lib/api/members";
import { useAuth } from "@/providers/auth-provider";
import type { AccountStatus, Member, MembershipStatus } from "@/types";
import { formatDate } from "@/lib/utils";

export function MembersList() {
  const { user } = useAuth();
  const router = useRouter();

  const [search, setSearch] = useState("");
  const [status, setStatus] = useState<AccountStatus | "ALL">("ALL");
  const [membershipStatus, setMembershipStatus] = useState<MembershipStatus | "ALL">("ALL");
  const debouncedSearch = useDebounce(search, 350);

  const [members, setMembers] = useState<Member[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [resultKey, setResultKey] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [refreshKey, setRefreshKey] = useState(0);

  const queryKey = `${debouncedSearch}|${status}|${membershipStatus}`;
  const loading = resultKey !== queryKey;
  const currentKeyRef = useRef(queryKey);

  useEffect(() => {
    currentKeyRef.current = queryKey;

    listMembers({
      search: debouncedSearch || undefined,
      status,
      membershipStatus,
    })
      .then((res) => {
        if (currentKeyRef.current !== queryKey) return;
        setPage(1);
        setMembers(res.members);
        setError(null);
        setResultKey(queryKey);
      })
      .catch((e) => {
        if (currentKeyRef.current !== queryKey) return;
        setError(e instanceof Error ? e.message : "Failed to load members");
        setResultKey(queryKey);
      });
  }, [debouncedSearch, status, membershipStatus, queryKey, refreshKey]);

  if (user?.role === "MEMBER") {
    return (
      <Alert variant="info" title="No access">
        Your account does not have permission to view the members directory.
      </Alert>
    );
  }

  const totalItems = members.length;
  const pageItems = members.slice((page - 1) * pageSize, page * pageSize);

  const columns: Array<Column<Member>> = [
    {
      key: "member",
      header: "Member",
      cell: (m) => (
        <div className="flex items-center gap-3">
          <Avatar name={m.fullName} src={m.photo} size="sm" />
          <div className="min-w-0">
            <p className="font-medium text-slate-900 truncate">{m.fullName}</p>
            <p className="text-xs text-slate-500 font-mono">{m.memberCode}</p>
          </div>
        </div>
      ),
    },
    {
      key: "contact",
      header: "Contact",
      cell: (m) => (
        <div className="min-w-0">
          <p className="text-slate-700 truncate">{m.phone || "—"}</p>
          {m.email && <p className="text-xs text-slate-500 truncate">{m.email}</p>}
        </div>
      ),
    },
    {
      key: "membership",
      header: "Membership",
      cell: (m) => {
        const latest = m.memberships?.[0];
        return latest ? (
          <div className="flex items-center gap-2">
            <span className="text-slate-700 font-medium">{latest.package?.name ?? "Package"}</span>
            <StatusBadge status={latest.status} />
          </div>
        ) : (
          <Badge variant="neutral">No membership</Badge>
        );
      },
    },
    {
      key: "registered",
      header: "Registered",
      cell: (m) => (
        <p className="text-sm text-slate-600">
          {formatDate(m.registrationDate ?? m.createdAt)}
        </p>
      ),
    },
    {
      key: "stats",
      header: "Activity",
      cell: (m) => (
        <div className="flex flex-col text-xs text-slate-500">
          <span>{m._count?.attendances ?? 0} visits</span>
          <span>{m._count?.payments ?? 0} payments</span>
        </div>
      ),
    },
    {
      key: "status",
      header: "Status",
      cell: (m) => (
        <div className="flex items-center justify-between gap-2">
          <StatusBadge status={m.status} />
          <ChevronRight className="h-4 w-4 text-slate-300" />
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-3">
        <div className="w-full sm:w-72">
          <Input
            type="search"
            placeholder="Search by name, code, phone or email..."
            startIcon={<Search className="h-4 w-4" />}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <div className="w-full sm:w-44">
          <Select
            aria-label="Member status"
            value={status}
            onChange={(e) => setStatus(e.target.value as AccountStatus | "ALL")}
            options={[
              { value: "ALL", label: "All statuses" },
              { value: "ACTIVE", label: "Active" },
              { value: "SUSPENDED", label: "Suspended" },
              { value: "DEACTIVATED", label: "Deactivated" },
            ]}
          />
        </div>
        <div className="w-full sm:w-48">
          <Select
            aria-label="Membership status"
            value={membershipStatus}
            onChange={(e) => setMembershipStatus(e.target.value as MembershipStatus | "ALL")}
            options={[
              { value: "ALL", label: "All memberships" },
              { value: "ACTIVE", label: "Active" },
              { value: "EXPIRED", label: "Expired" },
              { value: "SUSPENDED", label: "Suspended" },
              { value: "CANCELLED", label: "Cancelled" },
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
            setMembershipStatus("ALL");
          }}
          disabled={!search && status === "ALL" && membershipStatus === "ALL"}
        >
          <RefreshCw className="h-3.5 w-3.5" /> Reset
        </Button>
      </div>

      {error && (
        <Alert variant="error" title="Failed to load members">
          {error}
          <Button size="sm" variant="outline" className="mt-3" onClick={() => setRefreshKey((k) => k + 1)}>
            Retry
          </Button>
        </Alert>
      )}

      <div className="rounded-xl border border-border bg-card shadow-sm">
        <Table
          columns={columns}
          data={pageItems}
          getRowKey={(m) => m.id}
          loading={loading}
          emptyTitle="No members found"
          emptyMessage={
            debouncedSearch || status !== "ALL" || membershipStatus !== "ALL"
              ? "Try adjusting your search or filters."
              : "Register your first member to get started."
          }
          onRowClick={(m) => router.push(`/members/${m.id}`)}
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

      {!loading && !error && (
        <p className="flex items-center gap-1.5 text-xs text-slate-500">
          <CalendarDays className="h-3.5 w-3.5" />
          Showing {members.length} member{members.length !== 1 ? "s" : ""} in total.
        </p>
      )}
    </div>
  );
}