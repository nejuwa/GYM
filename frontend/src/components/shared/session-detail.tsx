"use client";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { ArrowLeft, CalendarDays, CheckCircle2, Clock3, Trash2, UserRound, XCircle } from "lucide-react";
import { useEffect, useState } from "react";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Modal } from "@/components/ui/modal";
import { useToast } from "@/components/ui/toast";
import { listSessions, deleteSession, updateSessionStatus } from "@/lib/api/sessions";
import { formatDate, formatDateTime } from "@/lib/utils";
import { SessionStatusBadge } from "@/components/shared/session-log";
import type { SessionStatus, TrainingSession } from "@/types";

export function SessionDetailPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const { toast } = useToast();

  const [session, setSession] = useState<TrainingSession | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    let active = true;
    listSessions({ status: "ALL" })
      .then((res) => {
        if (!active) return;
        const found = res.sessions.find((item) => item.id === params.id);
        if (found) {
          setSession(found);
          setError(null);
        } else {
          setSession(null);
          setError("Session not found.");
        }
      })
      .catch((e) => {
        if (!active) return;
        setSession(null);
        setError(e instanceof Error ? e.message : "Failed to load the session");
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
  }, [params.id]);

  const handleStatusUpdate = async (nextStatus: SessionStatus) => {
    if (!session) return;
    setBusy(true);
    try {
      const res = await updateSessionStatus(session.id, nextStatus, session.notes ?? undefined);
      setSession(res.session);
      toast("success", `Session marked ${nextStatus.toLowerCase()}`, res.session.title);
    } catch (err) {
      toast("error", "Failed to update session", err instanceof Error ? err.message : "Please try again.");
    } finally {
      setBusy(false);
    }
  };

  const handleDelete = async () => {
    if (!session) return;
    setBusy(true);
    try {
      await deleteSession(session.id);
      toast("success", "Session deleted", session.title);
      router.push("/sessions");
    } catch (err) {
      toast("error", "Failed to delete session", err instanceof Error ? err.message : "Please try again.");
    } finally {
      setBusy(false);
      setDeleteOpen(false);
    }
  };

  if (loading) {
    return (
      <div className="space-y-4">
        <div className="h-7 w-40 animate-pulse rounded bg-slate-200" />
        <div className="h-52 animate-pulse rounded-xl border border-border bg-slate-100" />
      </div>
    );
  }

  if (error || !session) {
    return (
      <div className="mx-auto max-w-xl space-y-4">
        <Alert variant="error" title="Session unavailable">
          {error ?? "This session could not be loaded."}
        </Alert>
        <div className="flex justify-center">
          <Link href="/sessions">
            <Button variant="outline" leftIcon={<ArrowLeft className="h-4 w-4" />}>
              Back to sessions
            </Button>
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="space-y-3">
          <Link href="/sessions">
            <Button variant="outline" size="sm" leftIcon={<ArrowLeft className="h-4 w-4" />}>
              Back
            </Button>
          </Link>
          <div>
            <h1 className="text-2xl font-bold text-slate-900">{session.title}</h1>
            <div className="mt-2">
              <SessionStatusBadge status={session.status} />
            </div>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {session.status !== "COMPLETED" && (
            <Button
              size="sm"
              variant="success"
              leftIcon={<CheckCircle2 className="h-4 w-4" />}
              onClick={() => handleStatusUpdate("COMPLETED")}
              loading={busy}
            >
              Mark complete
            </Button>
          )}
          {session.status !== "CANCELLED" && (
            <Button
              size="sm"
              variant="outline"
              leftIcon={<XCircle className="h-4 w-4" />}
              onClick={() => handleStatusUpdate("CANCELLED")}
              loading={busy}
            >
              Cancel
            </Button>
          )}
          <Button
            size="sm"
            variant="danger"
            leftIcon={<Trash2 className="h-4 w-4" />}
            onClick={() => setDeleteOpen(true)}
            loading={busy}
          >
            Delete
          </Button>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <div className="rounded-xl border border-border bg-white p-4">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-sky-50 text-sky-600">
            <UserRound className="h-4 w-4" />
          </div>
          <p className="mt-3 text-xs uppercase tracking-wide text-slate-500">Member</p>
          <p className="mt-1 font-semibold text-slate-900">{session.member?.fullName ?? "—"}</p>
          <p className="text-xs text-slate-500">{session.member?.memberCode ?? "—"}</p>
        </div>

        <div className="rounded-xl border border-border bg-white p-4">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-violet-50 text-violet-600">
            <CalendarDays className="h-4 w-4" />
          </div>
          <p className="mt-3 text-xs uppercase tracking-wide text-slate-500">Date</p>
          <p className="mt-1 font-semibold text-slate-900">{formatDate(session.scheduledDate)}</p>
          <p className="text-xs text-slate-500">{formatDateTime(session.scheduledDate)}</p>
        </div>

        <div className="rounded-xl border border-border bg-white p-4">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-amber-50 text-amber-600">
            <Clock3 className="h-4 w-4" />
          </div>
          <p className="mt-3 text-xs uppercase tracking-wide text-slate-500">Time</p>
          <p className="mt-1 font-semibold text-slate-900">{session.startTime} — {session.endTime}</p>
          <p className="text-xs text-slate-500">Session window</p>
        </div>

        <div className="rounded-xl border border-border bg-white p-4">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-emerald-50 text-emerald-600">
            <CheckCircle2 className="h-4 w-4" />
          </div>
          <p className="mt-3 text-xs uppercase tracking-wide text-slate-500">Trainer</p>
          <p className="mt-1 font-semibold text-slate-900">{session.trainer?.fullName ?? "—"}</p>
          <p className="text-xs text-slate-500">{session.trainer?.specialization ?? "—"}</p>
        </div>
      </div>

      <div className="rounded-xl border border-border bg-white p-6 shadow-sm">
        <h2 className="text-lg font-semibold text-slate-900">Session notes</h2>
        <div className="mt-3 rounded-lg bg-slate-50 p-4 text-sm text-slate-700">
          {session.notes?.trim() ? session.notes : "No notes were added for this session."}
        </div>
      </div>

      <Modal
        open={deleteOpen}
        onClose={() => setDeleteOpen(false)}
        title="Delete this session"
        description="This removes the scheduled appointment from the system."
        size="sm"
        footer={
          <div className="flex justify-end gap-2">
            <Button variant="outline" size="sm" onClick={() => setDeleteOpen(false)}>
              Cancel
            </Button>
            <Button variant="danger" size="sm" loading={busy} onClick={handleDelete}>
              Confirm delete
            </Button>
          </div>
        }
      >
        <p className="text-sm text-slate-600">
          Are you sure you want to delete <span className="font-semibold text-slate-900">{session.title}</span>?
        </p>
      </Modal>
    </div>
  );
}
