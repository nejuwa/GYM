"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ArrowLeft, UserCheck, AlertTriangle } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Select } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/toast";
import { manualCheckIn } from "@/lib/api/attendance";
import { listMembers } from "@/lib/api/members";
import { useAuth } from "@/providers/auth-provider";
import type { AttendanceStatus, Member } from "@/types";
import { formatDateTime } from "@/lib/utils";

export function ManualCheckInForm() {
  const { user } = useAuth();
  const { toast } = useToast();
  const canManage = ["OWNER", "MANAGER"].includes(user?.role ?? "MEMBER");

  const [members, setMembers] = useState<Member[]>([]);
  const [memberId, setMemberId] = useState("");
  const [status, setStatus] = useState<AttendanceStatus>("GRANTED");
  const [reason, setReason] = useState("");
  const [busy, setBusy] = useState(false);
  const [record, setRecord] = useState<{ memberId: string; name: string; status: AttendanceStatus; time: string } | null>(null);

  useEffect(() => {
    listMembers({ status: "ALL" })
      .then((res) => {
        setMembers(res.members);
        if (res.members.length > 0) setMemberId(res.members[0].id);
      })
      .catch(() => {});
  }, []);

  if (!canManage) {
    return (
      <div className="max-w-lg mx-auto space-y-5">
        <Link href="/attendance" className="inline-flex items-center gap-1.5 text-sm text-slate-500 hover:text-slate-900">
          <ArrowLeft className="h-4 w-4" /> Back to Attendance
        </Link>
        <Alert variant="error" title="Access restricted">
          Only OWNER and MANAGER roles can record manual check-ins.
        </Alert>
      </div>
    );
  }

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!memberId) {
      toast("error", "No member selected", "Choose a member to check in.");
      return;
    }

    setBusy(true);
    setRecord(null);
    try {
      const res = await manualCheckIn({
        memberId,
        status,
        rejectionReason: status === "REJECTED" ? (reason || "Manual staff override") : undefined,
      });
      const member = members.find((m) => m.id === memberId);
      setRecord({ memberId, name: member?.fullName ?? "Member", status, time: res.attendance.entryTime });
      toast("success", "Attendance recorded", `${member?.fullName ?? "Member"} — ${status}`);
      setReason("");
    } catch (err) {
      toast("error", "Failed", err instanceof Error ? err.message : "Manual check-in failed");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="mx-auto max-w-xl space-y-5">
      <Link href="/attendance" className="inline-flex items-center gap-1.5 text-sm text-slate-500 hover:text-slate-900">
        <ArrowLeft className="h-4 w-4" /> Back to Attendance
      </Link>

      <Card title="Manual Check-in" subtitle="Override access status for a member (OWNER/MANAGER only)">
        {record ? (
          <div className="space-y-5">
            <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-5 text-center">
              <UserCheck className="mx-auto h-8 w-8 text-emerald-600" />
              <p className="mt-2 font-semibold text-emerald-700">Attendance recorded</p>
              <p className="mt-1 text-sm text-slate-700">
                {record.name} — {record.status}
              </p>
              <p className="text-xs text-slate-500 mt-0.5">Recorded at {formatDateTime(record.time)}</p>
            </div>
            <div className="flex gap-3 justify-center">
              <Button variant="ghost" onClick={() => setRecord(null)}>
                New check-in
              </Button>
              <Link href="/attendance">
                <Button>View log</Button>
              </Link>
            </div>
          </div>
        ) : (
          <form onSubmit={submit} noValidate className="space-y-5">
            {members.length === 0 && (
              <Alert variant="warning" title="No members available">
                Register at least one member before using manual check-in.
              </Alert>
            )}

            <Select
              id="mcMember"
              label="Member *"
              placeholder="Select member"
              value={memberId}
              onChange={(e) => setMemberId(e.target.value)}
              options={members.map((m) => ({ value: m.id, label: `${m.fullName} (${m.memberCode})` }))}
            />

            <Select
              id="mcStatus"
              label="Status"
              value={status}
              onChange={(e) => setStatus(e.target.value as AttendanceStatus)}
              options={[
                { value: "GRANTED", label: "Grant access" },
                { value: "REJECTED", label: "Deny access" },
              ]}
            />

            {status === "REJECTED" && (
              <Input
                id="mcReason"
                label="Rejection reason"
                placeholder="e.g. Late payment, policy violation"
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                startIcon={<AlertTriangle className="h-4 w-4 text-amber-500" />}
              />
            )}

            <Button className="w-full" loading={busy}>
              <UserCheck className="h-4 w-4" /> Record check-in
            </Button>
          </form>
        )}
      </Card>
    </div>
  );
}