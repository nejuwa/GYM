"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { CheckCircle2, Eye, Pencil, Plus, Search, Trash2, XCircle } from "lucide-react";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Modal } from "@/components/ui/modal";
import { Select } from "@/components/ui/select";
import { Table, type Column } from "@/components/ui/table";
import { useToast } from "@/components/ui/toast";
import { useAuth } from "@/providers/auth-provider";
import { listMembers } from "@/lib/api/members";
import { listSessions, deleteSession, updateSession, updateSessionStatus } from "@/lib/api/sessions";
import { listTrainers } from "@/lib/api/trainers";
import { formatDate } from "@/lib/utils";
import { SessionStatusBadge } from "@/components/shared/session-log";
import { SessionStatusKpis } from "@/components/shared/session-kpis";
import type { SessionStatus, TrainingSession } from "@/types";

function localDate(d: Date = new Date()): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

interface SessionEditForm {
  trainerId: string;
  memberId: string;
  title: string;
  scheduledDate: string;
  startTime: string;
  endTime: string;
  notes: string;
}

const emptyEditForm: SessionEditForm = {
  trainerId: "",
  memberId: "",
  title: "",
  scheduledDate: localDate(),
  startTime: "09:00",
  endTime: "10:00",
  notes: "",
};

export function SessionsList() {
  const router = useRouter();
  const { user } = useAuth();
  const { toast } = useToast();

  const canManage = ["OWNER", "MANAGER", "TRAINER"].includes(user?.role ?? "MEMBER");

  const [sessions, setSessions] = useState<TrainingSession[]>([]);
  const [trainers, setTrainers] = useState<Array<{ id: string; fullName: string }>>([]);
  const [members, setMembers] = useState<Array<{ id: string; fullName: string; memberCode: string }>>([]);
  const [status, setStatus] = useState<SessionStatus | "ALL">("ALL");
  const [trainerId, setTrainerId] = useState("ALL");
  const [memberId, setMemberId] = useState("ALL");
  const [selectedDate, setSelectedDate] = useState("");
  const [search, setSearch] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshKey, setRefreshKey] = useState(0);
  const [editTarget, setEditTarget] = useState<TrainingSession | null>(null);
  const [editForm, setEditForm] = useState<SessionEditForm>(emptyEditForm);
  const [editBusy, setEditBusy] = useState(false);
  const [editErrors, setEditErrors] = useState<Record<string, string>>({});
  const [deleteTarget, setDeleteTarget] = useState<TrainingSession | null>(null);
  const [deleteBusy, setDeleteBusy] = useState(false);

  useEffect(() => {
    let active = true;
    Promise.all([
      listTrainers({ status: "ALL" }),
      listMembers({ status: "ALL" }),
    ])
      .then(([trainerRes, memberRes]) => {
        if (!active) return;
        setTrainers(trainerRes.trainers.map((t) => ({ id: t.id, fullName: t.fullName })));
        setMembers(memberRes.members.map((m) => ({ id: m.id, fullName: m.fullName, memberCode: m.memberCode })));
      })
      .catch(() => {
        if (!active) return;
        setTrainers([]);
        setMembers([]);
      });

    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    if (user?.role === "TRAINER" && user.trainerProfile?.id && trainerId === "ALL") {
      setTrainerId(user.trainerProfile.id);
    }
    if (user?.role === "MEMBER" && user.memberProfile?.id && memberId === "ALL") {
      setMemberId(user.memberProfile.id);
    }
  }, [user, trainerId, memberId]);

  useEffect(() => {
    let active = true;
    const params: {
      status?: SessionStatus | "ALL";
      trainerId?: string;
      memberId?: string;
      date?: string;
    } = {};

    if (status !== "ALL") params.status = status;
    if (trainerId !== "ALL") params.trainerId = trainerId;
    if (memberId !== "ALL") params.memberId = memberId;
    if (selectedDate) params.date = selectedDate;

    setLoading(true);
    listSessions(params)
      .then((res) => {
        if (!active) return;
        setSessions(res.sessions);
        setError(null);
      })
      .catch((e) => {
        if (!active) return;
        setSessions([]);
        setError(e instanceof Error ? e.message : "Failed to load sessions");
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
  }, [status, trainerId, memberId, selectedDate, refreshKey]);

  const filteredSessions = useMemo(() => {
    if (!search.trim()) return sessions;
    const q = search.trim().toLowerCase();
    return sessions.filter((session) => {
      const title = session.title.toLowerCase();
      const memberName = session.member?.fullName?.toLowerCase() ?? "";
      const trainerName = session.trainer?.fullName?.toLowerCase() ?? "";
      const memberCode = session.member?.memberCode?.toLowerCase() ?? "";
      return title.includes(q) || memberName.includes(q) || trainerName.includes(q) || memberCode.includes(q);
    });
  }, [sessions, search]);

  const showReset = status !== "ALL" || trainerId !== "ALL" || memberId !== "ALL" || !!selectedDate || !!search;

  const resetFilters = () => {
    setStatus("ALL");
    setTrainerId(user?.role === "TRAINER" && user.trainerProfile?.id ? user.trainerProfile.id : "ALL");
    setMemberId(user?.role === "MEMBER" && user.memberProfile?.id ? user.memberProfile.id : "ALL");
    setSelectedDate("");
    setSearch("");
  };

  const handleStatusUpdate = async (session: TrainingSession, nextStatus: SessionStatus) => {
    try {
      const res = await updateSessionStatus(session.id, nextStatus, session.notes ?? undefined);
      setRefreshKey((v) => v + 1);
      toast("success", `Session marked ${nextStatus.toLowerCase()}`, res.session.title);
    } catch (err) {
      toast("error", "Failed to update status", err instanceof Error ? err.message : "Please try again.");
    }
  };

  const openEdit = (session: TrainingSession) => {
    setEditTarget(session);
    setEditForm({
      trainerId: session.trainerId,
      memberId: session.memberId,
      title: session.title,
      scheduledDate: localDate(new Date(session.scheduledDate)),
      startTime: session.startTime,
      endTime: session.endTime,
      notes: session.notes ?? "",
    });
    setEditErrors({});
  };

  const submitEdit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!editTarget) return;

    const nextErrors: Record<string, string> = {};
    if (!editForm.trainerId) nextErrors.trainerId = "Choose a trainer";
    if (!editForm.memberId) nextErrors.memberId = "Choose a member";
    if (!editForm.title.trim()) nextErrors.title = "Session title is required";
    if (!editForm.scheduledDate) nextErrors.scheduledDate = "Pick a session date";
    if (!editForm.startTime) nextErrors.startTime = "Select start time";
    if (!editForm.endTime) nextErrors.endTime = "Select end time";
    if (editForm.startTime && editForm.endTime && editForm.startTime >= editForm.endTime) {
      nextErrors.endTime = "End time must be later than start time";
    }

    setEditErrors(nextErrors);
    if (Object.keys(nextErrors).length > 0) return;

    setEditBusy(true);
    try {
      const res = await updateSession(editTarget.id, {
        trainerId: editForm.trainerId,
        memberId: editForm.memberId,
        title: editForm.title.trim(),
        scheduledDate: editForm.scheduledDate,
        startTime: editForm.startTime,
        endTime: editForm.endTime,
        notes: editForm.notes.trim() || undefined,
      });
      setEditTarget(null);
      setRefreshKey((v) => v + 1);
      toast("success", "Session updated", res.session.title);
    } catch (err) {
      toast("error", "Failed to update session", err instanceof Error ? err.message : "Please try again.");
    } finally {
      setEditBusy(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setDeleteBusy(true);
    try {
      await deleteSession(deleteTarget.id);
      setDeleteTarget(null);
      setRefreshKey((v) => v + 1);
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
      cell: (session) => (
        <div className="min-w-0">
          <p className="truncate font-medium text-slate-900">{session.title}</p>
          <p className="text-xs text-slate-500">{session.member?.memberCode ?? "—"}</p>
        </div>
      ),
    },
    {
      key: "member",
      header: "Member",
      cell: (session) => (
        <div>
          <p className="font-medium text-slate-800">{session.member?.fullName ?? "Unknown member"}</p>
          <p className="text-xs text-slate-500">{session.member?.phone ?? "—"}</p>
        </div>
      ),
    },
    {
      key: "trainer",
      header: "Trainer",
      cell: (session) => <p className="text-sm text-slate-700">{session.trainer?.fullName ?? "—"}</p>,
    },
    {
      key: "date",
      header: "Date & time",
      cell: (session) => (
        <div className="text-sm text-slate-700">
          <p>{formatDate(session.scheduledDate)}</p>
          <p className="text-xs text-slate-500">
            {session.startTime} — {session.endTime}
          </p>
        </div>
      ),
    },
    {
      key: "status",
      header: "Status",
      cell: (session) => <SessionStatusBadge status={session.status} />,
    },
    {
      key: "actions",
      header: "Actions",
      className: "text-right",
      cell: (session) => (
        <div className="flex items-center justify-end gap-1.5">
          <Button size="xs" variant="outline" onClick={() => router.push(`/sessions/${session.id}`)} aria-label="View session">
            <Eye className="h-3.5 w-3.5" />
          </Button>
          {canManage && (
            <Button size="xs" variant="outline" onClick={() => openEdit(session)} aria-label="Edit session">
              <Pencil className="h-3.5 w-3.5" />
            </Button>
          )}
          {canManage && session.status !== "COMPLETED" && (
            <Button size="xs" variant="outline" onClick={() => handleStatusUpdate(session, "COMPLETED")} aria-label="Mark session complete">
              <CheckCircle2 className="h-3.5 w-3.5" />
            </Button>
          )}
          {canManage && session.status !== "CANCELLED" && (
            <Button size="xs" variant="outline" onClick={() => handleStatusUpdate(session, "CANCELLED")} aria-label="Cancel session">
              <XCircle className="h-3.5 w-3.5" />
            </Button>
          )}
          {canManage && (
            <Button size="xs" variant="outline" onClick={() => setDeleteTarget(session)} aria-label="Delete session">
              <Trash2 className="h-3.5 w-3.5" />
            </Button>
          )}
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      <SessionStatusKpis refreshKey={refreshKey} />

      <div className="rounded-xl border border-border bg-white p-5 shadow-sm">
        <div className="flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
          <div className="flex-1">
            <div className="flex flex-wrap items-center gap-3">
              <div className="w-full sm:w-60">
                <Input
                  type="search"
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                  placeholder="Search session, member or trainer"
                  startIcon={<Search className="h-4 w-4" />}
                />
              </div>
              <div className="w-full sm:w-44">
                <Select
                  aria-label="Status filter"
                  value={status}
                  onChange={(event) => setStatus(event.target.value as SessionStatus | "ALL")}
                  options={[
                    { value: "ALL", label: "All statuses" },
                    { value: "SCHEDULED", label: "Scheduled" },
                    { value: "COMPLETED", label: "Completed" },
                    { value: "CANCELLED", label: "Cancelled" },
                  ]}
                />
              </div>
              <div className="w-full sm:w-52">
                <Select
                  aria-label="Trainer filter"
                  value={trainerId}
                  onChange={(event) => setTrainerId(event.target.value)}
                  options={[
                    { value: "ALL", label: "All trainers" },
                    ...trainers.map((trainer) => ({ value: trainer.id, label: trainer.fullName })),
                  ]}
                />
              </div>
              <div className="w-full sm:w-52">
                <Select
                  aria-label="Member filter"
                  value={memberId}
                  onChange={(event) => setMemberId(event.target.value)}
                  options={[
                    { value: "ALL", label: "All members" },
                    ...members.map((member) => ({ value: member.id, label: `${member.fullName} (${member.memberCode})` })),
                  ]}
                />
              </div>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <div className="w-full sm:w-40">
              <Input
                type="date"
                label="Date"
                value={selectedDate}
                onChange={(event) => setSelectedDate(event.target.value)}
              />
            </div>
            {showReset && (
              <Button variant="outline" size="sm" onClick={resetFilters}>
                Reset
              </Button>
            )}
            {canManage && (
              <Button size="sm" leftIcon={<Plus className="h-4 w-4" />} onClick={() => router.push("/sessions/new")}>
                New session
              </Button>
            )}
          </div>
        </div>
      </div>

      {error ? (
        <Alert variant="error" title="Could not load sessions">
          {error}
        </Alert>
      ) : null}

      <div className="overflow-hidden rounded-xl border border-border bg-white shadow-sm">
        <Table
          columns={columns}
          data={filteredSessions}
          getRowKey={(session) => session.id}
          loading={loading}
          loadingLabel="Loading sessions..."
          emptyTitle="No sessions found"
          emptyMessage="Try changing the filters or create a new training session."
          onRowClick={(session) => router.push(`/sessions/${session.id}`)}
        />
      </div>

      <Modal
        open={Boolean(editTarget)}
        onClose={() => setEditTarget(null)}
        title="Edit session"
        description="Update the appointment details and save your changes."
        size="lg"
      >
        <form onSubmit={submitEdit} className="space-y-5" noValidate>
          <div className="grid gap-4 md:grid-cols-2">
            <Select
              label="Trainer"
              value={editForm.trainerId}
              onChange={(event) => setEditForm((prev) => ({ ...prev, trainerId: event.target.value }))}
              placeholder="Select trainer"
              error={editErrors.trainerId}
              options={trainers.map((trainer) => ({ value: trainer.id, label: trainer.fullName }))}
            />
            <Select
              label="Member"
              value={editForm.memberId}
              onChange={(event) => setEditForm((prev) => ({ ...prev, memberId: event.target.value }))}
              placeholder="Select member"
              error={editErrors.memberId}
              options={members.map((member) => ({ value: member.id, label: `${member.fullName} (${member.memberCode})` }))}
            />
          </div>

          <Input
            label="Session title"
            value={editForm.title}
            onChange={(event) => setEditForm((prev) => ({ ...prev, title: event.target.value }))}
            placeholder="e.g. Strength conditioning"
            error={editErrors.title}
          />

          <div className="grid gap-4 md:grid-cols-3">
            <Input
              label="Date"
              type="date"
              value={editForm.scheduledDate}
              onChange={(event) => setEditForm((prev) => ({ ...prev, scheduledDate: event.target.value }))}
              error={editErrors.scheduledDate}
            />
            <Input
              label="Start time"
              type="time"
              value={editForm.startTime}
              onChange={(event) => setEditForm((prev) => ({ ...prev, startTime: event.target.value }))}
              error={editErrors.startTime}
            />
            <Input
              label="End time"
              type="time"
              value={editForm.endTime}
              onChange={(event) => setEditForm((prev) => ({ ...prev, endTime: event.target.value }))}
              error={editErrors.endTime}
            />
          </div>

          <div>
            <label className="mb-1.5 block text-sm font-medium text-slate-700">Notes (optional)</label>
            <textarea
              value={editForm.notes}
              onChange={(event) => setEditForm((prev) => ({ ...prev, notes: event.target.value }))}
              rows={4}
              placeholder="Add session notes or follow-up instructions"
              className="w-full rounded-lg border border-input bg-white px-3 py-2 text-sm text-foreground transition-colors focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary"
            />
          </div>

          <div className="flex items-center justify-end gap-2 pt-2">
            <Button variant="outline" size="sm" type="button" onClick={() => setEditTarget(null)}>
              Cancel
            </Button>
            <Button size="sm" type="submit" loading={editBusy}>
              Save changes
            </Button>
          </div>
        </form>
      </Modal>

      <Modal
        open={Boolean(deleteTarget)}
        onClose={() => setDeleteTarget(null)}
        title="Delete session"
        description="This action is permanent and cannot be undone."
        size="sm"
        footer={
          <div className="flex items-center justify-end gap-2">
            <Button variant="outline" size="sm" onClick={() => setDeleteTarget(null)}>
              Cancel
            </Button>
            <Button variant="danger" size="sm" loading={deleteBusy} onClick={handleDelete}>
              Delete session
            </Button>
          </div>
        }
      >
        <p className="text-sm text-slate-600">
          Delete <span className="font-semibold text-slate-900">{deleteTarget?.title}</span> for {deleteTarget?.member?.fullName ?? "this member"}?
        </p>
      </Modal>
    </div>
  );
}
