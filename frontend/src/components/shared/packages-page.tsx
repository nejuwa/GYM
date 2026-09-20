"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { Search, RefreshCw, Plus, Package as PackageIcon, Pencil, Users, Ban, Check, CalendarDays } from "lucide-react";
import { Table, type Column } from "@/components/ui/table";
import { Pagination } from "@/components/ui/pagination";
import { StatusBadge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Modal } from "@/components/ui/modal";
import { useToast } from "@/components/ui/toast";
import { createPackage, listPackages, updatePackage } from "@/lib/api/packages";
import { useAuth } from "@/providers/auth-provider";
import type { AccountStatus, Package } from "@/types";
import { formatCurrency } from "@/lib/utils";

function featureText(features?: string | string[] | null): string {
  if (!features) return "";
  const parts = Array.isArray(features)
    ? features
    : (() => {
        try {
          const parsed = JSON.parse(String(features));
          return Array.isArray(parsed) ? parsed.map(String) : [String(features)];
        } catch {
          return String(features)
            .split(",")
            .map((s) => s.trim())
            .filter(Boolean);
        }
      })();
  return parts.map(String).join(", ");
}

interface CreateFields {
  name: string;
  durationDays: string;
  price: string;
  status: AccountStatus;
  description: string;
  features: string;
}

const initialCreateFields: CreateFields = {
  name: "",
  durationDays: "",
  price: "",
  status: "ACTIVE",
  description: "",
  features: "",
};

type FieldErrors = Partial<Record<"name" | "durationDays" | "price", string>>;

export function PackagesPage() {
  const { user } = useAuth();
  const { toast } = useToast();

  const [search, setSearch] = useState("");
  const [status, setStatus] = useState<AccountStatus | "ALL">("ALL");

  const [packages, setPackages] = useState<Package[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [resultKey, setResultKey] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [refreshKey, setRefreshKey] = useState(0);

  const [createOpen, setCreateOpen] = useState(false);
  const [fields, setFields] = useState<CreateFields>(initialCreateFields);
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  const [submitting, setSubmitting] = useState(false);

  const [actionTarget, setActionTarget] = useState<Package | null>(null);
  const [actionBusy, setActionBusy] = useState(false);

  const queryKey = status;
  const loading = resultKey !== queryKey;
  const currentKeyRef = useRef(queryKey);

  useEffect(() => {
    currentKeyRef.current = queryKey;

    listPackages({ status })
      .then((res) => {
        if (currentKeyRef.current !== queryKey) return;
        setPage(1);
        setPackages(res.packages);
        setError(null);
        setResultKey(queryKey);
      })
      .catch((e) => {
        if (currentKeyRef.current !== queryKey) return;
        setError(e instanceof Error ? e.message : "Failed to load packages");
        setResultKey(queryKey);
      });
  }, [status, queryKey, refreshKey]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return packages;
    return packages.filter(
      (p) =>
        p.name.toLowerCase().includes(q) ||
        (p.description ?? "").toLowerCase().includes(q) ||
        featureText(p.features).toLowerCase().includes(q)
    );
  }, [search, packages]);

  if (user && !["OWNER", "MANAGER"].includes(user.role)) {
    return (
      <Alert variant="info" title="No access">
        Your account does not have permission to manage membership packages.
      </Alert>
    );
  }

  const totalItems = filtered.length;
  const pageItems = filtered.slice((page - 1) * pageSize, page * pageSize);

  const columns: Array<Column<Package>> = [
    {
      key: "package",
      header: "Package",
      cell: (p) => (
        <div className="flex items-start gap-3">
          <span
            className={`mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-lg ${
              p.status === "ACTIVE" ? "bg-primary-light text-primary" : "bg-slate-100 text-slate-500"
            }`}
          >
            <PackageIcon className="h-4 w-4" />
          </span>
          <div className="min-w-0">
            <p className="font-medium text-slate-900 truncate">{p.name}</p>
            {p.description && <p className="text-xs text-slate-500 truncate">{p.description}</p>}
          </div>
        </div>
      ),
    },
    {
      key: "features",
      header: "Features",
      cell: (p) => {
        const text = featureText(p.features);
        return text ? (
          <p className="text-xs text-slate-600 line-clamp-2">{text}</p>
        ) : (
          <p className="text-xs text-slate-400">—</p>
        );
      },
    },
    {
      key: "duration",
      header: "Duration",
      cell: (p) => (
        <div>
          <p className="text-sm font-medium text-slate-900">{p.durationDays} days</p>
          <p className="text-xs text-slate-500">
            {Math.round((p.durationDays / 30) * 10) / 10} months
          </p>
        </div>
      ),
    },
    {
      key: "price",
      header: "Price",
      cell: (p) => <p className="text-sm font-semibold text-slate-900">{formatCurrency(p.price)}</p>,
    },
    {
      key: "subscribers",
      header: "Subscribers",
      cell: (p) => (
        <div className="flex items-center gap-2 text-sm text-slate-600">
          <Users className="h-3.5 w-3.5 text-slate-400" />
          {p._count?.memberships ?? 0}
        </div>
      ),
    },
    {
      key: "status",
      header: "Status",
      cell: (p) => <StatusBadge status={p.status} />,
    },
    {
      key: "actions",
      header: "Actions",
      className: "text-right",
      cell: (p) => (
        <div className="flex items-center justify-end gap-1.5">
          <Link href={`/packages/${p.id}`}>
            <Button size="xs" variant="outline" aria-label={`Edit ${p.name}`}>
              <Pencil className="h-3.5 w-3.5" />
            </Button>
          </Link>
          {p.status === "DEACTIVATED" ? (
            <Button
              size="xs"
              variant="outline"
              aria-label={`Activate ${p.name}`}
              onClick={() => setActionTarget(p)}
            >
              <Check className="h-3.5 w-3.5 text-emerald-600" />
            </Button>
          ) : (
            <Button
              size="xs"
              variant="outline"
              aria-label={`Deactivate ${p.name}`}
              onClick={() => setActionTarget(p)}
            >
              <Ban className="h-3.5 w-3.5 text-red-600" />
            </Button>
          )}
        </div>
      ),
    },
  ];

  const openCreateModal = () => {
    setFields(initialCreateFields);
    setFieldErrors({});
    setCreateOpen(true);
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    const next: FieldErrors = {};
    if (!fields.name.trim()) next.name = "Package name is required";
    const days = Number(fields.durationDays);
    if (!fields.durationDays.trim() || !Number.isInteger(days) || days <= 0)
      next.durationDays = "Enter a whole number of days greater than 0";
    const price = Number(fields.price);
    if (!fields.price.trim() || isNaN(price) || price < 0) next.price = "Enter a valid price";
    setFieldErrors(next);
    if (Object.keys(next).length > 0) {
      toast("error", "Check the form", "Please fix the highlighted fields.");
      return;
    }

    setSubmitting(true);
    try {
      const res = await createPackage({
        name: fields.name.trim(),
        durationDays: days,
        price,
        status: fields.status,
        description: fields.description.trim() || undefined,
        features: fields.features.trim() || undefined,
      });
      setCreateOpen(false);
      setFields(initialCreateFields);
      setRefreshKey((k) => k + 1);
      toast("success", "Package created", `${res.package.name} is now available.`);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to create package";
      toast("error", "Create failed", message);
    } finally {
      setSubmitting(false);
    }
  };

  const confirmAction = async () => {
    if (!actionTarget) return;
    const deactivating = actionTarget.status === "ACTIVE" || actionTarget.status === "SUSPENDED";
    const nextStatus: AccountStatus = deactivating ? "DEACTIVATED" : "ACTIVE";
    setActionBusy(true);
    try {
      await updatePackage(actionTarget.id, { status: nextStatus });
      setRefreshKey((k) => k + 1);
      toast(
        "success",
        deactivating ? "Package deactivated" : "Package activated",
        `${actionTarget.name} is now ${deactivating ? "DEACTIVATED" : "ACTIVE"}.`
      );
      setActionTarget(null);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to update package";
      toast("error", "Update failed", message);
    } finally {
      setActionBusy(false);
    }
  };

  const deactivating = actionTarget?.status === "ACTIVE" || actionTarget?.status === "SUSPENDED";

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-3">
        <div className="w-full sm:w-72">
          <Input
            type="search"
            placeholder="Search packages..."
            startIcon={<Search className="h-4 w-4" />}
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(1);
            }}
          />
        </div>
        <div className="w-full sm:w-44">
          <Select
            aria-label="Package status"
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
        <Button
          variant="outline"
          size="sm"
          onClick={() => {
            setSearch("");
            setStatus("ALL");
          }}
          disabled={!search && status === "ALL"}
        >
          <RefreshCw className="h-3.5 w-3.5" /> Reset
        </Button>
        <div className="ml-auto">
          <Button onClick={openCreateModal}>
            <Plus className="h-4 w-4" /> Add New Package
          </Button>
        </div>
      </div>

      {error && (
        <Alert variant="error" title="Failed to load packages">
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
          getRowKey={(p) => p.id}
          loading={loading}
          emptyTitle="No packages found"
          emptyMessage={
            search || status !== "ALL"
              ? "Try adjusting your search or filters."
              : "Create your first membership package to get started."
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

      {!loading && !error && (
        <p className="flex items-center gap-1.5 text-xs text-slate-500">
          <CalendarDays className="h-3.5 w-3.5" />
          Showing {filtered.length} package{filtered.length !== 1 ? "s" : ""} in total.
        </p>
      )}

      <Modal
        open={createOpen}
        onClose={() => setCreateOpen(false)}
        title="Add New Package"
        description="Create a membership package available to members."
        size="lg"
        footer={
          <div className="flex items-center justify-end gap-3">
            <Button variant="ghost" onClick={() => setCreateOpen(false)} disabled={submitting}>
              Cancel
            </Button>
            <Button onClick={handleCreate} loading={submitting}>
              <Plus className="h-4 w-4" /> Create Package
            </Button>
          </div>
        }
      >
        <form id="package-create-form" onSubmit={handleCreate} noValidate className="grid gap-5 sm:grid-cols-2">
          <div className="sm:col-span-2">
            <Input
              id="pkgName"
              label="Package name *"
              placeholder="e.g. Elite VIP Annual"
              value={fields.name}
              onChange={(e) => {
                setFields((f) => ({ ...f, name: e.target.value }));
                setFieldErrors((er) => ({ ...er, name: undefined }));
              }}
              error={fieldErrors.name}
            />
          </div>
          <Input
            id="pkgDuration"
            label="Duration (days) *"
            type="number"
            min={1}
            step={1}
            placeholder="e.g. 365"
            value={fields.durationDays}
            onChange={(e) => {
              setFields((f) => ({ ...f, durationDays: e.target.value }));
              setFieldErrors((er) => ({ ...er, durationDays: undefined }));
            }}
            error={fieldErrors.durationDays}
          />
          <Input
            id="pkgPrice"
            label="Price (USD) *"
            type="number"
            min={0}
            step="0.01"
            placeholder="e.g. 420"
            value={fields.price}
            onChange={(e) => {
              setFields((f) => ({ ...f, price: e.target.value }));
              setFieldErrors((er) => ({ ...er, price: undefined }));
            }}
            error={fieldErrors.price}
          />
          <div className="sm:col-span-2">
            <Select
              id="pkgStatus"
              label="Status"
              value={fields.status}
              onChange={(e) => setFields((f) => ({ ...f, status: e.target.value as AccountStatus }))}
              options={[
                { value: "ACTIVE", label: "Active" },
                { value: "SUSPENDED", label: "Suspended" },
                { value: "DEACTIVATED", label: "Deactivated" },
              ]}
            />
          </div>
          <div className="sm:col-span-2">
            <Input
              id="pkgDesc"
              label="Description"
              placeholder="Short summary shown to members"
              value={fields.description}
              onChange={(e) => setFields((f) => ({ ...f, description: e.target.value }))}
            />
          </div>
          <div className="sm:col-span-2">
            <Input
              id="pkgFeatures"
              label="Features"
              placeholder="Comma-separated, e.g. Gym access, Sauna, Group classes"
              value={fields.features}
              onChange={(e) => setFields((f) => ({ ...f, features: e.target.value }))}
              hint="Optional list of perks included with this package."
            />
          </div>
        </form>
      </Modal>

      <Modal
        open={actionTarget !== null}
        onClose={() => setActionTarget(null)}
        title={deactivating ? "Deactivate package" : "Activate package"}
        size="sm"
        footer={
          <div className="flex items-center justify-end gap-3">
            <Button variant="ghost" onClick={() => setActionTarget(null)} disabled={actionBusy}>
              Cancel
            </Button>
            <Button variant={deactivating ? "danger" : "success"} onClick={confirmAction} loading={actionBusy}>
              {deactivating ? (
                <Ban className="h-4 w-4" />
              ) : (
                <Check className="h-4 w-4" />
              )}
              {deactivating ? "Deactivate" : "Activate"}
            </Button>
          </div>
        }
      >
        {actionTarget && (
          <p className="text-sm text-slate-600">
            {deactivating ? (
              <>
                This will set <span className="font-semibold text-slate-900">{actionTarget.name}</span> to{" "}
                DEACTIVATED. It will no longer appear as an option for new memberships, but existing memberships
                remain active.
              </>
            ) : (
              <>
                This will set <span className="font-semibold text-slate-900">{actionTarget.name}</span> to ACTIVE
                and make it available for new memberships again.
              </>
            )}
          </p>
        )}
      </Modal>
    </div>
  );
}