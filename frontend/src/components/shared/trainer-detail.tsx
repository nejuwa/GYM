"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { ArrowLeft, Pencil, Power, Link2, Phone, Mail } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Modal } from "@/components/ui/modal";
import { Alert } from "@/components/ui/alert";
import { Avatar } from "@/components/ui/avatar";
import { useToast } from "@/components/ui/toast";
import { useAuth } from "@/providers/auth-provider";
import { getTrainerById, updateTrainer } from "@/lib/api/trainers";
import { formatDate, formatDateTime } from "@/lib/utils";
import { TrainerStatusBadge, SpecializationChips } from "@/components/shared/trainer-ui";
import { TrainerForm } from "@/components/shared/trainer-form";
import { SessionLog } from "@/components/shared/session-log";
import type { AccountStatus, Trainer } from "@/types";

interface TrainerResponse {
  success: boolean;
  trainer: Trainer;
}

export function TrainerDetailPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const { user } = useAuth();
  const { toast } = useToast();

  const canManage = ["OWNER", "MANAGER"].includes(user?.role ?? "MEMBER");

  const [result, setResult] = useState<TrainerResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);

  const [editorOpen, setEditorOpen] = useState(false);
  const [toggleOpen, setToggleOpen] = useState(false);
  const [toggleBusy, setToggleBusy] = useState(false);

  const id = String(params.id);

  useEffect(() => {
    let cancelled = false;
    getTrainerById(id)
      .then((res) => {
        if (cancelled) return;
        setResult(res);
        setError(null);
      })
      .catch((e) => {
        if (cancelled) return;
        setError(e instanceof Error ? e.message : "Failed to load trainer");
        setResult(null);
      });
    return () => {
      cancelled = true;
    };
  }, [id, refreshKey]);

  const trainer = result?.trainer ?? null;
  const loading = result === null && error === null;

  const runToggle = async () => {
    if (!trainer) return;
    const next = trainer.status === "ACTIVE" ? "DEACTIVATED" : "ACTIVE";
    setToggleBusy(true);
    try {
      const res = await updateTrainer(trainer.id, { status: next });
      setToggleOpen(false);
      setRefreshKey((k) => k + 1);
      toast("success", next === "ACTIVE" ? "Trainer activated" : "Trainer deactivated", res.trainer.fullName);
    } catch (err) {
      toast("error", "Failed to update trainer status", err instanceof Error ? err.message : "Please try again.");
    } finally {
      setToggleBusy(false);
    }
  };

  if (loading) {
    return (
      <div className="mx-auto max-w-5xl space-y-4">
        <div className="h-8 w-64 animate-pulse rounded bg-slate-200" />
        <div className="h-64 animate-pulse rounded-xl border border-border bg-slate-100" />
      </div>
    );
  }

  if (error || !trainer) {
    return (
      <div className="mx-auto max-w-2xl">
        <Alert variant="error" title="Could not load trainer">
          {error ?? "Trainer not found."}
          <Button size="sm" variant="outline" className="mt-3" onClick={() => setRefreshKey((k) => k + 1)}>
            Retry
          </Button>
        </Alert>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="flex items-center gap-4">
          <Avatar src={trainer.photo} name={trainer.fullName} size="xl" status={trainer.status as "ACTIVE" | "SUSPENDED" | "DEACTIVATED"} />
          <div>
            <div className="flex flex-wrap items-center gap-2.5">
              <h1 className="text-2xl font-bold text-slate-900">{trainer.fullName}</h1>
              <TrainerStatusBadge status={trainer.status as AccountStatus} />
            </div>
            <p className="mt-1 flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-slate-500">
              {trainer.phone && (
                <span className="inline-flex items-center gap-1.5">
                  <Phone className="h-3.5 w-3.5" /> {trainer.phone}
                </span>
              )}
              {trainer.email && (
                <span className="inline-flex items-center gap-1.5">
                  <Mail className="h-3.5 w-3.5" /> {trainer.email}
                </span>
              )}
              <span>Joined {formatDate(trainer.createdAt)}</span>
            </p>
            <div className="mt-2">
              <SpecializationChips specialization={trainer.specialization} />
            </div>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Button variant="outline" size="sm" onClick={() => router.push("/trainers")}>
            <ArrowLeft className="h-4 w-4" /> Back
          </Button>
          {canManage && (
            <>
              <Button variant="outline" size="sm" onClick={() => router.push(`/trainers/${trainer.id}/assign`)}>
                <Link2 className="h-4 w-4" /> Assign Clients
              </Button>
              <Button variant="outline" size="sm" onClick={() => setEditorOpen(true)}>
                <Pencil className="h-4 w-4" /> Edit
              </Button>
              <Button variant={trainer.status === "ACTIVE" ? "danger" : "success"} size="sm" onClick={() => setToggleOpen(true)}>
                <Power className="h-4 w-4" /> {trainer.status === "ACTIVE" ? "Deactivate" : "Activate"}
              </Button>
            </>
          )}
        </div>
      </div>

      {trainer.bio && (
        <div className="rounded-xl border border-border bg-slate-50 p-4 text-sm text-slate-600">
          <span className="font-semibold text-slate-700">Bio / certifications: </span>
          {trainer.bio}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="space-y-6">
          <div className="overflow-hidden rounded-xl border border-border bg-card shadow-sm">
            <div className="border-b border-border px-5 py-4">
              <h2 className="text-lg font-bold text-slate-900">Assigned Clients</h2>
              <p className="text-xs text-slate-500">{trainer.assignedMembers?.length ?? 0} clients linked</p>
            </div>
            {trainer.assignedMembers?.length ? (
              <div className="divide-y divide-border">
                {trainer.assignedMembers.map((a) => {
                  const member = a.member;
                  const membership = member?.memberships?.[0];
                  return (
                    <div key={a.id} className="flex items-center gap-3 px-5 py-3">
                      <button
                        type="button"
                        className="flex min-w-0 flex-1 items-center gap-3 text-left"
                        onClick={() => member && router.push(`/members/${member.id}`)}
                      >
                        <Avatar src={member?.photo} name={member?.fullName ?? "?"} size="sm" />
                        <div className="min-w-0">
                          <p className="truncate font-medium text-slate-900">{member?.fullName}</p>
                          <p className="font-mono text-xs text-slate-500">{member?.memberCode}</p>
                        </div>
                      </button>
                      <div className="text-right text-xs">
                        {membership ? (
                          <>
                            <p className="font-medium text-slate-700">{membership.package?.name}</p>
                            <p className="text-slate-400">since {formatDate(a.assignedDate)}</p>
                          </>
                        ) : (
                          <p className="text-slate-400">No active plan</p>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <p className="px-5 py-6 text-sm text-slate-400 text-center">No clients assigned yet.</p>
            )}
          </div>
        </div>

        <div className="space-y-6">
          <div className="overflow-hidden rounded-xl border border-border bg-card shadow-sm">
            <div className="border-b border-border px-5 py-4">
              <h2 className="text-lg font-bold text-slate-900">Schedule / Session Log</h2>
              <p className="text-xs text-slate-500">
                Live training sessions across all clients — the trainer timetable.
              </p>
            </div>
            <div className="p-5">
              <SessionLog
                trainerId={trainer.id}
                memberPicker={async () =>
                  (trainer.assignedMembers ?? [])
                    .filter((a) => a.member)
                    .map((a) => ({
                      id: a.member!.id,
                      fullName: a.member!.fullName,
                      memberCode: a.member!.memberCode,
                    }))
                }
              />
            </div>
          </div>
        </div>
      </div>

      {canManage && (
        <Modal
          open={editorOpen}
          onClose={() => setEditorOpen(false)}
          title="Edit Trainer"
          description={`Updating ${trainer.fullName}`}
          size="md"
        >
          <TrainerForm
            initial={trainer}
            onComplete={() => {
              setEditorOpen(false);
              setRefreshKey((k) => k + 1);
            }}
          />
        </Modal>
      )}

      {canManage && (
        <Modal
          open={toggleOpen}
          onClose={() => setToggleOpen(false)}
          title={trainer.status === "ACTIVE" ? "Deactivate Trainer" : "Activate Trainer"}
          description={trainer.fullName}
          size="sm"
          footer={
            <div className="flex items-center justify-end gap-3">
              <Button variant="ghost" onClick={() => setToggleOpen(false)} disabled={toggleBusy}>
                Cancel
              </Button>
              <Button variant={trainer.status === "ACTIVE" ? "danger" : "success"} onClick={runToggle} loading={toggleBusy}>
                <Power className="h-4 w-4" /> {trainer.status === "ACTIVE" ? "Deactivate" : "Activate"}
              </Button>
            </div>
          }
        >
          <p className="text-sm text-slate-600">
            {trainer.status === "ACTIVE"
              ? "Deactivated trainers are hidden from the active roster. Sessions and assignments are preserved."
              : "This trainer will become active and appear in the roster again."}
          </p>
        </Modal>
      )}
    </div>
  );
}