"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Search, Plus, Pencil, Eye, Link2, Power, Mail, Phone } from "lucide-react";
import { Table, type Column } from "@/components/ui/table";
import { Pagination } from "@/components/ui/pagination";
import { Badge } from "@/components/ui/badge";
import { Avatar } from "@/components/ui/avatar";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Modal } from "@/components/ui/modal";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/toast";
import { useDebounce } from "@/hooks/use-debounce";
import { useAuth } from "@/providers/auth-provider";
import { listTrainers, updateTrainer } from "@/lib/api/trainers";
import { formatDate } from "@/lib/utils";
import { TrainerStatusBadge, SpecializationChips, trainerStatusOptions } from "@/components/shared/trainer-ui";
import { TrainerKpis } from "@/components/shared/trainer-kpis";
import { TrainerForm } from "@/components/shared/trainer-form";
import type { AccountStatus, Trainer } from "@/types";

export function TrainersList() {
  const router = useRouter();
  const { user } = useAuth();
  const { toast } = useToast();
  const canManage = ["OWNER", "MANAGER"].includes(user?.role ?? "MEMBER");

  const [search, setSearch] = useState("");
  const [status, setStatus] = useState<AccountStatus | "ALL">("ALL");
  const [specialization, setSpecialization] = useState("ALL");
  const debouncedSearch = useDebounce(search, 350);

  const [trainers, setTrainers] = useState<Trainer[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [resultKey, setResultKey] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [refreshKey, setRefreshKey] = useState(0);

  const [editorOpen, setEditorOpen] = useState(false);
  const [editTarget, setEditTarget] = useState<Trainer | null>(null);

  const [toggleTarget, setToggleTarget] = useState<Trainer | null>(null);
  const [toggleBusy, setToggleBusy] = useState(false);
  const toggleRef = useRef<HTMLButtonElement>(null);

  const queryKey = `${debouncedSearch}|${status}`;
  const loading = resultKey !== queryKey;

  useEffect(() => {
    let cancelled = false;
    listTrainers({ status, search: debouncedSearch || undefined })
      .then((res) => {
        if (cancelled) return;
        setTrainers(res.trainers);
        setError(null);
        setResultKey(queryKey);
      })
      .catch((e) => {
        if (cancelled) return;
        setError(e instanceof Error ? e.message : "Failed to load trainers");
        setResultKey(queryKey);
      });
    return () => {
      cancelled = true;
    };
  }, [debouncedSearch, status, queryKey, refreshKey]);

  useEffect(() => {
    if (toggleTarget) {
      const t = window.setTimeout(() => toggleRef.current?.focus(), 60);
      return () => window.clearTimeout(t);
    }
  }, [toggleTarget]);

  const allSkills = Array.from(new Set(trainers.flatMap((t) => t.specialization.split(",").map((s) => s.trim()).filter(Boolean)))).sort();

  const filtered = specialization === "ALL" ? trainers : trainers.filter((t) => t.specialization.toLowerCase().includes(specialization.toLowerCase()));
  const totalItems = filtered.length;
  const pageItems = filtered.slice((page - 1) * pageSize, page * pageSize);
  const showReset = Boolean(search || status !== "ALL" || specialization !== "ALL");

  const resetFilters = () => {
    setSearch("");
    setStatus("ALL");
    setSpecialization("ALL");
  };

  const openCreate = () => {
    setEditTarget(null);
    setEditorOpen(true);
  };

  const openEdit = (t: Trainer) => {
    setEditTarget(t);
    setEditorOpen(true);
  };

  const runToggle = async () => {
    if (!toggleTarget) return;
    const nextStatus = toggleTarget.status === "ACTIVE" ? "DEACTIVATED" : "ACTIVE";
    setToggleBusy(true);
    try {
      const res = await updateTrainer(toggleTarget.id, { status: nextStatus });
      setToggleTarget(null);
      setRefreshKey((k) => k + 1);
      toast(
        "success",
        nextStatus === "ACTIVE" ? "Trainer activated" : "Trainer deactivated",
        res.trainer.fullName
      );
    } catch (err) {
      toast("error", "Failed to update trainer status", err instanceof Error ? err.message : "Please try again.");
    } finally {
      setToggleBusy(false);
    }
  };

  const columns: Array<Column<Trainer>> = [
    {
      key: "trainer",
      header: "Trainer",
      cell: (t) => (
        <div className="flex items-center gap-3 min-w-0">
          <Avatar src={t.photo} name={t.fullName} size="sm" status={t.status as "ACTIVE" | "SUSPENDED" | "DEACTIVATED"} />
          <div className="min-w-0">
            <p className="font-medium text-slate-900 truncate">{t.fullName}</p>
            <p className="flex flex-wrap items-center gap-x-3 gap-y-0.5 text-xs text-slate-500">
              <span className="inline-flex items-center gap-1"><Phone className="h-3 w-3" />{t.phone}</span>
              {t.email && <span className="inline-flex items-center gap-1"><Mail className="h-3 w-3" />{t.email}</span>}
            </p>
          </div>
        </div>
      ),
    },
    {
      key: "specialization",
      header: "Specializations",
      cell: (t) => <SpecializationChips specialization={t.specialization} />,
    },
    {
      key: "clients",
      header: "Clients",
      cell: (t) => (
        <div className="text-sm">
          <span className="font-semibold text-slate-900">{t.assignedMembers?.length ?? 0}</span>{" "}
          <span className="text-slate-500">assigned</span>
          {t._count?.sessions !== undefined && (
            <span className="block text-xs text-slate-400">{t._count.sessions} total sessions</span>
          )}
        </div>
      ),
    },
    {
      key: "status",
      header: "Status",
      cell: (t) => <TrainerStatusBadge status={t.status as AccountStatus} />,
    },
    {
      key: "joined",
      header: "Joined",
      cell: (t) => <p className="text-sm text-slate-600">{formatDate(t.createdAt)}</p>,
    },
    {
      key: "actions",
      header: "Actions",
      className: "text-right",
      cell: (t) => (
        <div className="flex items-center justify-end gap-1.5">
          <Button size="xs" variant="outline" onClick={() => router.push(`/trainers/${t.id}`)} title="View profile" aria-label="View profile">
            <Eye className="h-3.5 w-3.5" />
          </Button>
          {canManage && (
            <>
              <Button size="xs" variant="outline" onClick={() => router.push(`/trainers/${t.id}/assign`)} title="Assign clients" aria-label="Assign clients">
                <Link2 className="h-3.5 w-3.5" />
              </Button>
              <Button size="xs" variant="outline" onClick={() => openEdit(t)} title="Edit trainer" aria-label="Edit trainer">
                <Pencil className="h-3.5 w-3.5" />
              </Button>
              <Button
                size="xs"
                variant="outline"
                onClick={() => setToggleTarget(t)}
                title={t.status === "ACTIVE" ? "Deactivate" : "Activate"}
                aria-label="Toggle status"
              >
                <Power
                  className={`h-3.5 w-3.5 ${t.status === "ACTIVE" ? "text-amber-600" : "text-emerald-600"}`}
                />
              </Button>
            </>
          )}
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      <TrainerKpis refreshKey={refreshKey} />

      <div className="flex flex-wrap items-center gap-3">
        <div className="w-full sm:w-64">
          <Input
            type="search"
            placeholder="Search name, skill or phone..."
            startIcon={<Search className="h-4 w-4" />}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <div className="w-full sm:w-40">
          <Select
            aria-label="Status filter"
            value={status}
            onChange={(e) => setStatus(e.target.value as AccountStatus | "ALL")}
            options={[{ value: "ALL", label: "All statuses" }, ...trainerStatusOptions]}
          />
        </div>
        <div className="w-full sm:w-44">
          <Select
            aria-label="Specialization filter"
            value={specialization}
            onChange={(e) => setSpecialization(e.target.value)}
            options={[{ value: "ALL", label: "All specializations" }, ...allSkills.map((s) => ({ value: s, label: s }))]}
          />
        </div>
        <Button variant="outline" size="sm" disabled={!showReset} onClick={resetFilters}>
          Clear
        </Button>
        {canManage && (
          <div className="ml-auto">
            <Button onClick={openCreate}>
              <Plus className="h-4 w-4" /> Add Trainer
            </Button>
          </div>
        )}
      </div>

      {error && (
        <Alert variant="error" title="Failed to load trainers">
          {error}
          <Button size="sm" variant="outline" className="mt-3" onClick={() => setRefreshKey((k) => k + 1)}>
            Retry
          </Button>
        </Alert>
      )}

      <div className="overflow-hidden rounded-xl border border-border bg-card shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border px-5 py-4">
          <div className="flex items-center gap-2.5">
            <h2 className="text-lg font-bold text-slate-900">Trainer Roster</h2>
            <Badge variant="default">{totalItems} trainers</Badge>
            {loading && <Badge variant="secondary">Refreshing...</Badge>}
          </div>
        </div>
        <Table
          columns={columns}
          data={pageItems}
          getRowKey={(t) => t.id}
          loading={loading}
          emptyTitle="No trainers found"
          emptyMessage={showReset ? "Try adjusting your filters." : "Add a trainer to start building your roster."}
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
          open={editorOpen}
          onClose={() => setEditorOpen(false)}
          title={editTarget ? "Edit Trainer" : "Add Trainer"}
          description={editTarget ? `Updating ${editTarget.fullName}` : "Register a new trainer."}
          size="md"
          footer={
            <div className="flex items-center justify-end">
              <Button variant="ghost" onClick={() => setEditorOpen(false)}>
                Cancel
              </Button>
            </div>
          }
        >
          <TrainerForm
            initial={editTarget}
            onComplete={() => {
              setEditorOpen(false);
              setRefreshKey((k) => k + 1);
              setResultKey(null);
            }}
          />
        </Modal>
      )}

      <Modal
        open={toggleTarget !== null}
        onClose={() => setToggleTarget(null)}
        title={toggleTarget?.status === "ACTIVE" ? "Deactivate Trainer" : "Activate Trainer"}
        description={toggleTarget?.fullName}
        size="sm"
        footer={
          <div className="flex items-center justify-end gap-3">
            <Button variant="ghost" onClick={() => setToggleTarget(null)} disabled={toggleBusy}>
              Cancel
            </Button>
            <Button ref={toggleRef} onClick={runToggle} loading={toggleBusy} variant={toggleTarget?.status === "ACTIVE" ? "danger" : "success"}>
              <Power className="h-4 w-4" /> {toggleTarget?.status === "ACTIVE" ? "Deactivate" : "Activate"}
            </Button>
          </div>
        }
      >
        <p className="text-sm text-slate-600">
          {toggleTarget?.status === "ACTIVE"
            ? "Deactivated trainers are hidden from the active roster. Their linked login account is unaffected."
            : "This trainer will become active and appear in the roster again."}
        </p>
      </Modal>
    </div>
  );
}