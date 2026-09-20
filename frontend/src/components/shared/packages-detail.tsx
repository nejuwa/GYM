"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { ArrowLeft, Package as PackageIcon, Tag, CalendarDays, Users, Pencil, Ban, Check, Save } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Badge, StatusBadge } from "@/components/ui/badge";
import { Avatar } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Modal } from "@/components/ui/modal";
import { Table, type Column } from "@/components/ui/table";
import { PageLoader } from "@/components/ui/spinner";
import { Alert } from "@/components/ui/alert";
import { useToast } from "@/components/ui/toast";
import { getPackageById, updatePackage } from "@/lib/api/packages";
import type { AccountStatus, Membership, Package } from "@/types";
import { formatCurrency, formatDate } from "@/lib/utils";

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

function featuresToForm(features?: string | string[] | null): string {
  if (!features) return "";
  if (Array.isArray(features)) return features.join(", ");
  try {
    const parsed = JSON.parse(String(features));
    if (Array.isArray(parsed)) return parsed.map(String).join(", ");
    return String(features);
  } catch {
    return String(features);
  }
}

interface EditFields {
  name: string;
  durationDays: string;
  price: string;
  status: AccountStatus;
  description: string;
  features: string;
}

type FieldErrors = Partial<Record<"name" | "durationDays" | "price", string>>;

export function PackageDetailPage() {
  const params = useParams<{ id: string }>();
  const id = params.id;
  const router = useRouter();
  const { toast } = useToast();

  const [pkg, setPkg] = useState<Package | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loaded, setLoaded] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);

  const [editOpen, setEditOpen] = useState(false);
  const [fields, setFields] = useState<EditFields | null>(null);
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  const [saving, setSaving] = useState(false);

  const [actionOpen, setActionOpen] = useState(false);
  const [actionBusy, setActionBusy] = useState(false);

  useEffect(() => {
    getPackageById(id)
      .then((res) => {
        setPkg(res.package);
        setError(null);
      })
      .catch((e) => {
        setError(e instanceof Error ? e.message : "Failed to load package");
      })
      .finally(() => setLoaded(true));
  }, [id, refreshKey]);

  if (!loaded) {
    return <PageLoader label="Loading package..." />;
  }

  if (error || !pkg) {
    return (
      <div className="max-w-2xl mx-auto">
        <Alert variant="error" title="Unable to load package">
          {error ?? "Package record not found."}
        </Alert>
        <div className="mt-4 text-center">
          <Button variant="outline" onClick={() => router.push("/packages")}>
            Back to Packages
          </Button>
        </div>
      </div>
    );
  }

  const memberships = pkg.memberships ?? [];
  const deactivating = pkg.status === "ACTIVE" || pkg.status === "SUSPENDED";
  const months = Math.round((pkg.durationDays / 30) * 10) / 10;

  const openEditModal = () => {
    setFields({
      name: pkg.name,
      durationDays: String(pkg.durationDays),
      price: String(pkg.price),
      status: pkg.status,
      description: pkg.description ?? "",
      features: featuresToForm(pkg.features),
    });
    setFieldErrors({});
    setEditOpen(true);
  };

  const setField = (key: keyof EditFields, value: string) => {
    setFields((f) => (f ? { ...f, [key]: value } : f));
    setFieldErrors((e) => ({ ...e, [key]: undefined }));
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!fields) return;
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

    setSaving(true);
    try {
      await updatePackage(id, {
        name: fields.name.trim(),
        durationDays: days,
        price,
        status: fields.status,
        description: fields.description.trim() || undefined,
        features: fields.features.trim() || undefined,
      });
      setEditOpen(false);
      setRefreshKey((k) => k + 1);
      toast("success", "Package updated", "The package details have been saved.");
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to update package";
      toast("error", "Update failed", message);
    } finally {
      setSaving(false);
    }
  };

  const confirmToggleStatus = async () => {
    if (!pkg) return;
    const nextStatus: AccountStatus = deactivating ? "DEACTIVATED" : "ACTIVE";
    setActionBusy(true);
    try {
      await updatePackage(id, { status: nextStatus });
      setActionOpen(false);
      setRefreshKey((k) => k + 1);
      toast(
        "success",
        deactivating ? "Package deactivated" : "Package activated",
        `${pkg.name} is now ${deactivating ? "DEACTIVATED" : "ACTIVE"}.`
      );
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to update package";
      toast("error", "Update failed", message);
    } finally {
      setActionBusy(false);
    }
  };

  const membershipColumns: Array<Column<Membership>> = [
    {
      key: "member",
      header: "Member",
      cell: (m) => (
        <div className="flex items-center gap-2.5">
          <Avatar name={m.member?.fullName ?? "?"} size="sm" />
          <div>
            <p className="text-sm font-medium text-slate-900">{m.member?.fullName ?? "Unknown"}</p>
            {m.member?.memberCode && <p className="text-xs font-mono text-slate-500">{m.member.memberCode}</p>}
          </div>
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
      key: "paid",
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

  return (
    <div className="space-y-6">
      <Button variant="ghost" size="sm" onClick={() => router.push("/packages")} className="-ml-2">
        <ArrowLeft className="h-4 w-4" /> Back to Packages
      </Button>

      <div className="rounded-2xl border border-border bg-white shadow-sm overflow-hidden">
        <div className="bg-gradient-to-r from-[#0F172A] to-[#1e293b] px-6 py-6">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div className="flex items-center gap-4">
              <span
                className={`flex h-14 w-14 shrink-0 items-center justify-center rounded-xl ${
                  pkg.status === "ACTIVE" ? "bg-primary text-white" : "bg-slate-700 text-slate-300"
                }`}
              >
                <PackageIcon className="h-7 w-7" />
              </span>
              <div>
                <div className="flex items-center gap-2.5">
                  <h1 className="text-2xl font-bold text-white">{pkg.name}</h1>
                  <StatusBadge status={pkg.status} />
                </div>
                <p className="mt-1 flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-slate-300">
                  <span className="inline-flex items-center gap-1.5">
                    <Tag className="h-3.5 w-3.5 text-slate-400" /> {formatCurrency(pkg.price)}
                  </span>
                  <span className="inline-flex items-center gap-1.5">
                    <CalendarDays className="h-3.5 w-3.5 text-slate-400" />
                    {pkg.durationDays} days ({months} months)
                  </span>
                </p>
                {pkg.description && <p className="mt-2 max-w-xl text-xs text-slate-400">{pkg.description}</p>}
              </div>
            </div>
            <div className="flex flex-wrap gap-2">
              <Button
                variant="outline"
                size="sm"
                className="bg-white/10 border-white/20 text-white hover:bg-white/20"
                onClick={() => setActionOpen(true)}
              >
                {deactivating ? <Ban className="h-3.5 w-3.5" /> : <Check className="h-3.5 w-3.5" />}
                {deactivating ? "Deactivate" : "Activate"}
              </Button>
              <Button size="sm" onClick={openEditModal}>
                <Pencil className="h-3.5 w-3.5" /> Edit Package
              </Button>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 p-5">
          <div className="rounded-xl border border-border bg-white p-4">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-red-50 text-primary">
              <Tag className="h-4 w-4" />
            </div>
            <p className="mt-3 text-xl font-bold text-slate-900">{formatCurrency(pkg.price)}</p>
            <p className="text-xs text-slate-500">Price</p>
          </div>
          <div className="rounded-xl border border-border bg-white p-4">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-sky-50 text-sky-600">
              <CalendarDays className="h-4 w-4" />
            </div>
            <p className="mt-3 text-xl font-bold text-slate-900">{pkg.durationDays} days</p>
            <p className="text-xs text-slate-500">Duration · {months} months</p>
          </div>
          <div className="rounded-xl border border-border bg-white p-4">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-50 text-emerald-600">
              <Users className="h-4 w-4" />
            </div>
            <p className="mt-3 text-xl font-bold text-slate-900">{memberships.length}</p>
            <p className="text-xs text-slate-500">Recent subscriptions</p>
          </div>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2 rounded-xl border border-border bg-card shadow-sm">
          <div className="flex items-center justify-between gap-4 border-b border-border px-5 py-3.5">
            <div>
              <h3 className="text-sm font-semibold text-slate-900">Recent Memberships</h3>
              <p className="text-xs text-slate-500 mt-0.5">Latest subscriptions using this package.</p>
            </div>
          </div>
          <Table
            columns={membershipColumns}
            data={memberships}
            getRowKey={(m) => m.id}
            emptyTitle="No subscriptions yet"
            emptyMessage="Memberships bought with this package will appear here."
            footer={
              <div className="px-5 py-3 border-t border-border text-right">
                <Button size="sm" variant="ghost" onClick={() => router.push("/memberships")}>
                  View all memberships
                </Button>
              </div>
            }
          />
        </div>

        <div className="space-y-6">
          <Card title="Package Details" subtitle="Stored package attributes.">
            <div className="space-y-4 text-sm">
              <div>
                <p className="text-xs text-slate-500">Name</p>
                <p className="font-medium text-slate-900">{pkg.name}</p>
              </div>
              <div>
                <p className="text-xs text-slate-500">Price</p>
                <p className="font-medium text-slate-900">{formatCurrency(pkg.price)}</p>
              </div>
              <div>
                <p className="text-xs text-slate-500">Duration</p>
                <p className="font-medium text-slate-900">
                  {pkg.durationDays} days ({months} months)
                </p>
              </div>
              <div>
                <p className="text-xs text-slate-500">Status</p>
                <StatusBadge status={pkg.status} />
              </div>
              <div>
                <p className="text-xs text-slate-500">Description</p>
                <p className="font-medium text-slate-900">{pkg.description || "—"}</p>
              </div>
              <div>
                <p className="text-xs text-slate-500">Features</p>
                <p className="font-medium text-slate-900">{featureText(pkg.features) || "—"}</p>
              </div>
              <div className="border-t border-border pt-3 text-xs text-slate-500">
                <p>Created {formatDate(pkg.createdAt)}</p>
                <p className="mt-1">Updated {formatDate(pkg.updatedAt)}</p>
              </div>
            </div>
          </Card>
        </div>
      </div>

      <Modal
        open={editOpen}
        onClose={() => setEditOpen(false)}
        title="Edit Package"
        description={`Update details for ${pkg.name}.`}
        size="lg"
        footer={
          <div className="flex items-center justify-end gap-3">
            <Button variant="ghost" onClick={() => setEditOpen(false)} disabled={saving}>
              Cancel
            </Button>
            <Button onClick={handleSave} loading={saving}>
              <Save className="h-4 w-4" /> Save Changes
            </Button>
          </div>
        }
      >
        {fields && (
          <form id="package-edit-form" onSubmit={handleSave} noValidate className="grid gap-5 sm:grid-cols-2">
            <div className="sm:col-span-2">
              <Input
                id="pkgName"
                label="Package name *"
                value={fields.name}
                onChange={(e) => setField("name", e.target.value)}
                error={fieldErrors.name}
              />
            </div>
            <Input
              id="pkgDuration"
              label="Duration (days) *"
              type="number"
              min={1}
              step={1}
              value={fields.durationDays}
              onChange={(e) => setField("durationDays", e.target.value)}
              error={fieldErrors.durationDays}
            />
            <Input
              id="pkgPrice"
              label="Price (USD) *"
              type="number"
              min={0}
              step="0.01"
              value={fields.price}
              onChange={(e) => setField("price", e.target.value)}
              error={fieldErrors.price}
            />
            <div className="sm:col-span-2">
              <Select
                id="pkgStatus"
                label="Status"
                value={fields.status}
                onChange={(e) => setField("status", e.target.value as AccountStatus)}
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
                value={fields.description}
                onChange={(e) => setField("description", e.target.value)}
              />
            </div>
            <div className="sm:col-span-2">
              <Input
                id="pkgFeatures"
                label="Features"
                placeholder="Comma-separated, e.g. Gym access, Sauna, Group classes"
                value={fields.features}
                onChange={(e) => setField("features", e.target.value)}
                hint="Optional list of perks included with this package."
              />
            </div>
          </form>
        )}
      </Modal>

      <Modal
        open={actionOpen}
        onClose={() => setActionOpen(false)}
        title={deactivating ? "Deactivate package" : "Activate package"}
        size="sm"
        footer={
          <div className="flex items-center justify-end gap-3">
            <Button variant="ghost" onClick={() => setActionOpen(false)} disabled={actionBusy}>
              Cancel
            </Button>
            <Button variant={deactivating ? "danger" : "success"} onClick={confirmToggleStatus} loading={actionBusy}>
              {deactivating ? <Ban className="h-4 w-4" /> : <Check className="h-4 w-4" />}
              {deactivating ? "Deactivate" : "Activate"}
            </Button>
          </div>
        }
      >
        <p className="text-sm text-slate-600">
          {deactivating ? (
            <>
              This will set <span className="font-semibold text-slate-900">{pkg.name}</span> to DEACTIVATED. It
              will no longer appear as an option for new memberships, but existing memberships remain active.
            </>
          ) : (
            <>
              This will set <span className="font-semibold text-slate-900">{pkg.name}</span> to ACTIVE and make
              it available for new memberships again.
            </>
          )}
        </p>
      </Modal>
    </div>
  );
}