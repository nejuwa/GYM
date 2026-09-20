"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { CalendarPlus, Save } from "lucide-react";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { useToast } from "@/components/ui/toast";
import { useAuth } from "@/providers/auth-provider";
import { listMembers } from "@/lib/api/members";
import { createSession } from "@/lib/api/sessions";
import { listTrainers } from "@/lib/api/trainers";

function localDate(d: Date = new Date()): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

export function SessionNewPage() {
  const router = useRouter();
  const { user } = useAuth();
  const { toast } = useToast();

  const canManage = ["OWNER", "MANAGER", "TRAINER"].includes(user?.role ?? "MEMBER");

  const [trainers, setTrainers] = useState<Array<{ id: string; fullName: string }>>([]);
  const [members, setMembers] = useState<Array<{ id: string; fullName: string; memberCode: string }>>([]);
  const [trainerId, setTrainerId] = useState("");
  const [memberId, setMemberId] = useState("");
  const [title, setTitle] = useState("");
  const [scheduledDate, setScheduledDate] = useState(localDate());
  const [startTime, setStartTime] = useState("09:00");
  const [endTime, setEndTime] = useState("10:00");
  const [notes, setNotes] = useState("");
  const [busy, setBusy] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    let active = true;
    Promise.all([listTrainers({ status: "ALL" }), listMembers({ status: "ALL" })])
      .then(([trainerRes, memberRes]) => {
        if (!active) return;
        setTrainers(trainerRes.trainers.map((trainer) => ({ id: trainer.id, fullName: trainer.fullName })));
        setMembers(memberRes.members.map((member) => ({ id: member.id, fullName: member.fullName, memberCode: member.memberCode })));

        if (user?.role === "TRAINER" && user.trainerProfile?.id) {
          setTrainerId(user.trainerProfile.id);
        }
        if (user?.role === "MEMBER" && user.memberProfile?.id) {
          setMemberId(user.memberProfile.id);
        }
      })
      .catch(() => {
        if (!active) return;
        setTrainers([]);
        setMembers([]);
      });

    return () => {
      active = false;
    };
  }, [user]);

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    const nextErrors: Record<string, string> = {};

    if (!trainerId) nextErrors.trainerId = "Choose a trainer";
    if (!memberId) nextErrors.memberId = "Choose a member";
    if (!title.trim()) nextErrors.title = "Session title is required";
    if (!scheduledDate) nextErrors.scheduledDate = "Pick a session date";
    if (!startTime) nextErrors.startTime = "Select start time";
    if (!endTime) nextErrors.endTime = "Select end time";
    if (startTime && endTime && startTime >= endTime) nextErrors.endTime = "End time must be later than start time";

    setErrors(nextErrors);
    if (Object.keys(nextErrors).length > 0) return;

    setBusy(true);
    try {
      const res = await createSession({
        trainerId,
        memberId,
        title: title.trim(),
        scheduledDate,
        startTime,
        endTime,
        notes: notes.trim() || undefined,
      });
      toast("success", "Session scheduled", res.session.title);
      router.push("/sessions");
    } catch (err) {
      toast("error", "Failed to schedule session", err instanceof Error ? err.message : "Please try again.");
    } finally {
      setBusy(false);
    }
  };

  if (!canManage) {
    return (
      <div className="mx-auto max-w-xl">
        <Alert variant="error" title="Access denied">
          Only managers and trainers can create training sessions.
        </Alert>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">New training session</h1>
        <p className="mt-1 text-sm text-slate-500">Schedule a session for a member and assign the relevant trainer.</p>
      </div>

      <form onSubmit={submit} className="space-y-5 rounded-xl border border-border bg-white p-6 shadow-sm" noValidate>
        <div className="grid gap-4 md:grid-cols-2">
          <Select
            label="Trainer"
            value={trainerId}
            onChange={(event) => setTrainerId(event.target.value)}
            placeholder="Select trainer"
            error={errors.trainerId}
            options={trainers.map((trainer) => ({ value: trainer.id, label: trainer.fullName }))}
          />
          <Select
            label="Member"
            value={memberId}
            onChange={(event) => setMemberId(event.target.value)}
            placeholder="Select member"
            error={errors.memberId}
            options={members.map((member) => ({ value: member.id, label: `${member.fullName} (${member.memberCode})` }))}
          />
        </div>

        <Input
          label="Session title"
          value={title}
          onChange={(event) => setTitle(event.target.value)}
          placeholder="e.g. Strength conditioning"
          error={errors.title}
        />

        <div className="grid gap-4 md:grid-cols-3">
          <Input
            label="Date"
            type="date"
            value={scheduledDate}
            onChange={(event) => setScheduledDate(event.target.value)}
            error={errors.scheduledDate}
          />
          <Input
            label="Start time"
            type="time"
            value={startTime}
            onChange={(event) => setStartTime(event.target.value)}
            error={errors.startTime}
          />
          <Input
            label="End time"
            type="time"
            value={endTime}
            onChange={(event) => setEndTime(event.target.value)}
            error={errors.endTime}
          />
        </div>

        <div>
          <label className="mb-1.5 block text-sm font-medium text-slate-700">Notes (optional)</label>
          <textarea
            value={notes}
            onChange={(event) => setNotes(event.target.value)}
            rows={4}
            placeholder="Add fine details, goals, or follow-up tasks"
            className="w-full rounded-lg border border-input bg-white px-3 py-2 text-sm text-foreground transition-colors focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary"
          />
        </div>

        <div className="flex flex-wrap items-center justify-end gap-3">
          <Button variant="outline" type="button" onClick={() => router.push("/sessions")}>
            Cancel
          </Button>
          <Button type="submit" loading={busy} leftIcon={<CalendarPlus className="h-4 w-4" />}>
            Save session
          </Button>
        </div>
      </form>
    </div>
  );
}
