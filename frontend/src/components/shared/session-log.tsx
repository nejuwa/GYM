"use client";

import { useEffect, useState } from "react";
import { Plus, CheckCircle2, XCircle, Pencil, Trash2 } from "lucide-react";
import { Table, type Column } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Modal } from "@/components/ui/modal";
import { Select } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { useToast } from "@/components/ui/toast";
import { listSessions, createSession, updateSession, updateSessionStatus, deleteSession } from "@/lib/api/sessions";
import { formatDateTime } from "@/lib/utils";
import type { SessionStatus, TrainingSession } from "@/types";

const sessionStatusLabels: Record<SessionStatus, string> = {
  SCHEDULED: "Scheduled",
  COMPLETED: "Completed",
  CANCELLED: "Cancelled",
};

const sessionStatusTone: Record<SessionStatus, string> = {
  SCHEDULED: "bg-sky-50 text-sky-700 border-sky-200",
  COMPLETED: "bg-emerald-50 text-emerald-700 border-emerald-200",
  CANCELLED: "bg-red-50 text-red-700 border-red-200",
};

export function SessionStatusBadge({ status }: { status: SessionStatus }) {
  return (
    <span
      className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-medium whitespace-nowrap ${sessionStatusTone[status]}`}
    >
      {sessionStatusLabels[status]}
    </span>
  );
}

function localDate(d: Date = new Date()): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

interface SessionFormState {
  title: string;
  scheduledDate: string;
  startTime: string;
  endTime: string;
  notes: string;
}

const emptyForm: SessionFormState = { title: "", scheduledDate: localDate(), startTime: "10:00", endTime: "11:00", notes: "" };

function sessionToForm(s: TrainingSession): SessionFormState {
  return {
    title: s.title,
    scheduledDate: localDate(new Date(s.scheduledDate)),
    startTime: s.startTime,
    endTime: s.endTime,
    notes: s.notes ?? "",
  };
}

export function SessionLog({
  trainerId,
  memberPicker,
  refreshKey: externalRefresh,
}: {
  trainerId: string;
  memberPicker?: () => Promise<Array<{ id: string; fullName: string; memberCode: string }>>;
  refreshKey?: number;
}) {
  const { toast } = useToast();

  const [sessions, setSessions] = useState<TrainingSession[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [resultKey, setResultKey] = useState<string | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);

  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<TrainingSession | null>(null);
  const [form, setForm] = useState<SessionFormState>(emptyForm);
  const [memberId, setMemberId] = useState("");
  const [members, setMembers] = useState<Array<{ id: string; fullName: string; memberCode: string }>>([]);
  const [busy, setBusy] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const [deleteTarget, setDeleteTarget] = useState<TrainingSession | null>(null);
  const [deleteBusy, setDeleteBusy] = useState(false);

  const queryKey = String(trainerId);
  const loading = resultKey !== queryKey;

  useEffect(() => {
    let cancelled = false;
    listSessions({ trainerId, status: "ALL" })
      .then((res) => {
        if (cancelled) return;
        setSessions(res.sessions);
        setError(null);
        setResultKey(queryKey);
      })
      .catch((e) => {
        if (cancelled) return;
        setError(e instanceof Error ? e.message : "Failed to load sessions");
        setResultKey(queryKey);
      });
    return () => {
      cancelled = true;
    };
  }, [trainerId, queryKey, refreshKey, externalRefresh]);

  const openNew = async () => {
    setEditing(null);
    setForm(emptyForm);
    setMemberId("");
    setErrors({});
    setFormOpen(true);
    if (memberPicker) {
      try {
        setMembers(await memberPicker());
      } catch {
        setMembers([]);
      }
    }
  };

  const openEdit = (s: TrainingSession) => {
    setEditing(s);
    setForm(sessionToForm(s));
    setMemberId(s.memberId);
    setErrors({});
    setFormOpen(true);
  };

  const submitForm = async (e: React.FormEvent) => {
    e.preventDefault();
    const next: Record<string, string> = {};
    if (!form.title.trim()) next.title = "Session title is required";
    if (form.startTime >= form.endTime) next.endTime = "End time must be after start time";
    if (!memberPicker || !memberId) next.memberId = memberPicker ? "Choose a member" : "";
    setErrors(next);
    if (Object.keys(next).length > 0) return;

    setBusy(true);
    try {
      if (editing) {
        const res = await updateSession(editing.id, {
          title: form.title.trim(),
          scheduledDate: form.scheduledDate,
          startTime: form.startTime,
          endTime: form.endTime,
          notes: form.notes.trim() || undefined,
        });
        toast("success", "Session updated", res.session.title);
      } else {
        const res = await createSession({
          trainerId,
          memberId,
          title: form.title.trim(),
          scheduledDate: form.scheduledDate,
          startTime: form.startTime,
          endTime: form.endTime,
          notes: form.notes.trim() || undefined,
        });
        toast("success", "Session scheduled", res.session.title);
      }
      setFormOpen(false);
      setRefreshKey((k) => k + 1);
    } catch (err) {
      toast("error", "Failed to save session", err instanceof Error ? err.message : "Please try again.");
    } finally {
      setBusy(false);
    }
  };

  const setStatus = async (s: TrainingSession, status: SessionStatus) => {
    try {
      const res = await updateSessionStatus(s.id, status);
      toast("success", `Session marked ${status.toLowerCase()}`, res.session.title);
      setRefreshKey((k) => k + 1);
    } catch (err) {
      toast("error", "Failed to update session", err instanceof Error ? err.message : "Please try again.");
    }
  };

  const runDelete = async () => {
    if (!deleteTarget) return;
    setDeleteBusy(true);
    try {
      await deleteSession(deleteTarget.id);
      setDeleteTarget(null);
      setRefreshKey((k) => k + 1);
      toast("success", "Session deleted", deleteTarget.title);
    } catch (err) {
      toast("error", "Failed to delete session", err instanceof Error ? err.message : "Please try again.");
    } finally {
      setDeleteBusy(false);
    }
  };

  const columns: Array<Column<TrainingSession>> = [
    {
      key: "title",
      header: "Session",
      cell: (s) => (
        <div className="min-w-0">
          <p className="font-medium text-slate-900 truncate">{s.title}</p>
          <p className="text-xs text-slate-500">
            {memberPicker ? s.member?.fullName : `${s.member?.memberCode ?? ""} ${s.member?.fullName ?? ""}`.trim()}
          </p>
        </div>
      ),
    },
    {
      key: "when",
      header: "Date & Time",
      cell: (s) => (
        <div className="text-sm">
          <p className="text-slate-700">{formatDateTime(s.scheduledDate)}</p>
          <p className="text-xs text-slate-500">
            {s.startTime} – {s.endTime}
          </p>
        </div>
      ),
    },
    {
      key: "status",
      header: "Status",
      cell: (s) => <SessionStatusBadge status={s.status} />,
    },
    {
      key: "actions",
      header: "Actions",
      className: "text-right",
      cell: (s) => (
        <div className="flex items-center justify-end gap-1.5">
          {s.status === "SCHEDULED" && (
            <>
              <Button
                size="xs"
                variant="outline"
                onClick={() => setStatus(s, "COMPLETED")}
                title="Mark completed"
                aria-label="Mark completed"
              >
                <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" />
              </Button>
              <Button
                size="xs"
                variant="outline"
                onClick={() => setStatus(s, "CANCELLED")}
                title="Cancel session"
                aria-label="Cancel session"
              >
                <XCircle className="h-3.5 w-3.5 text-red-600" />
              </Button>
              <Button size="xs" variant="outline" onClick={() => openEdit(s)} title="Reschedule" aria-label="Reschedule">
                <Pencil className="h-3.5 w-3.5" />
              </Button>
            </>
          )}
          <Button size="xs" variant="outline" onClick={() => setDeleteTarget(s)} title="Delete session" aria-label="Delete session">
            <Trash2 className="h-3.5 w-3.5" />
          </Button>
        </div>
      ),
    },
  ];

  return (
    <div>
      <div className="mb-3 flex items-center justify-between gap-3">
        <p className="text-xs text-slate-500">
          {loading ? "Loading sessions..." : `${sessions.length} scheduled right now`}
        </p>
        <Button size="sm" onClick={openNew}>
          <Plus className="h-4 w-4" /> Schedule
        </Button>
      </div>

      {error && <p className="mb-3 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">{error}</p>}

      <Table
        columns={columns}
        data={sessions}
        getRowKey={(s) => s.id}
        loading={loading}
        emptyTitle="No sessions yet"
        emptyMessage="Schedule a training session for this trainer."
      />

      <Modal
        open={formOpen}
        onClose={() => setFormOpen(false)}
        title={editing ? "Reschedule Session" : "Schedule Session"}
        description={editing ? `Editing ${editing.title}` : "Create a new training session."}
        size="md"
        footer={
          <div className="flex items-center justify-end">
            <Button variant="ghost" onClick={() => setFormOpen(false)}>
              Cancel
            </Button>
          </div>
        }
      >
        <form onSubmit={submitForm} noValidate className="space-y-4">
          <Input
            label="Session title *"
            placeholder="e.g. Strength & Conditioning"
            value={form.title}
            onChange={(e) => setForm({ ...form, title: e.target.value })}
            error={errors.title}
          />
          {memberPicker && (
            <Select
              label="Member *"
              value={memberId}
              onChange={(e) => setMemberId(e.target.value)}
              options={[
                { value: "", label: "Select a member..." },
                ...members.map((m) => ({ value: m.id, label: `${m.fullName} (${m.memberCode})` })),
              ]}
              error={errors.memberId}
            />
          )}
          <Input
            type="date"
            label="Date *"
            value={form.scheduledDate}
            onChange={(e) => setForm({ ...form, scheduledDate: e.target.value || localDate() })}
          />
          <div className="grid grid-cols-2 gap-4">
            <Input
              type="time"
              label="Start *"
              value={form.startTime}
              onChange={(e) => setForm({ ...form, startTime: e.target.value })}
            />
            <Input
              type="time"
              label="End *"
              value={form.endTime}
              onChange={(e) => setForm({ ...form, endTime: e.target.value })}
              error={errors.endTime}
            />
          </div>
          <div>
            <label className="mb-1.5 block text-sm font-medium text-slate-700">Notes</label>
            <textarea
              value={form.notes}
              onChange={(e) => setForm({ ...form, notes: e.target.value })}
              rows={3}
              placeholder="Optional session notes..."
              className="w-full rounded-lg border border-input bg-white px-3 py-2 text-sm text-foreground transition-colors focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary"
            />
          </div>
          <Button type="submit" className="w-full" loading={busy}>
            {editing ? "Save Changes" : "Schedule Session"}
          </Button>
        </form>
      </Modal>

      <Modal
        open={deleteTarget !== null}
        onClose={() => setDeleteTarget(null)}
        title="Delete Session"
        description={deleteTarget?.title}
        size="sm"
        footer={
          <div className="flex items-center justify-end gap-3">
            <Button variant="ghost" onClick={() => setDeleteTarget(null)} disabled={deleteBusy}>
              Cancel
            </Button>
            <Button variant="danger" onClick={runDelete} loading={deleteBusy}>
              <Trash2 className="h-4 w-4" /> Delete
            </Button>
          </div>
        }
      >
        <p className="text-sm text-slate-600">This permanently removes the training session.</p>
      </Modal>
    </div>
  );
}