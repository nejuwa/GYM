"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { ArrowLeft, Search, Link2, Check } from "lucide-react";
import { Avatar } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Alert } from "@/components/ui/alert";
import { useToast } from "@/components/ui/toast";
import { useDebounce } from "@/hooks/use-debounce";
import { getTrainerById, assignMemberToTrainer } from "@/lib/api/trainers";
import { listMembers } from "@/lib/api/members";
import { TrainerStatusBadge } from "@/components/shared/trainer-ui";
import type { AccountStatus, Member, Trainer } from "@/types";

interface TrainerResponse {
  success: boolean;
  trainer: Trainer;
}

export function TrainerAssignPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const { toast } = useToast();

  const id = String(params.id);

  const [result, setResult] = useState<TrainerResponse | null>(null);
  const [error, setError] = useState<string | null>(null);

  const [members, setMembers] = useState<Member[]>([]);
  const [membersError, setMembersError] = useState<string | null>(null);
  const [membersKey, setMembersKey] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const debouncedSearch = useDebounce(search, 350);

  const [assigning, setAssigning] = useState<string | null>(null);

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
      });
    return () => {
      cancelled = true;
    };
  }, [id]);

  useEffect(() => {
    let cancelled = false;
    listMembers({ status: "ALL", search: debouncedSearch || undefined })
      .then((res) => {
        if (cancelled) return;
        setMembers(res.members);
        setMembersError(null);
        setMembersKey(debouncedSearch);
      })
      .catch((e) => {
        if (cancelled) return;
        setMembersError(e instanceof Error ? e.message : "Failed to load members");
        setMembersKey(debouncedSearch);
      });
    return () => {
      cancelled = true;
    };
  }, [debouncedSearch]);

  const trainer = result?.trainer ?? null;
  const loading = result === null && error === null;

  const assignedIds = new Set((trainer?.assignedMembers ?? []).map((a) => a.memberId));

  const runAssign = async (memberId: string) => {
    setAssigning(memberId);
    try {
      const res = await assignMemberToTrainer(id, memberId);
      toast("success", "Client linked", res.assignment.member.fullName);
      getTrainerById(id)
        .then(setResult)
        .catch(() => undefined);
    } catch (err) {
      toast("error", "Failed to assign client", err instanceof Error ? err.message : "Please try again.");
    } finally {
      setAssigning(null);
    }
  };

  const membersLoading = membersKey !== debouncedSearch;

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Assign Clients</h1>
          {trainer && (
            <p className="mt-1 flex items-center gap-2 text-sm text-slate-500">
              {trainer.fullName} <TrainerStatusBadge status={trainer.status as AccountStatus} />
            </p>
          )}
        </div>
        <Button variant="outline" size="sm" onClick={() => (trainer ? router.push(`/trainers/${trainer.id}`) : router.push("/trainers"))}>
          <ArrowLeft className="h-4 w-4" /> Back
        </Button>
      </div>

      {error && (
        <Alert variant="error" title="Could not load trainer">
          {error}
        </Alert>
      )}

      <div className="overflow-hidden rounded-xl border border-border bg-card shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border px-5 py-4">
          <div className="flex items-center gap-2.5">
            <h2 className="text-lg font-bold text-slate-900">Members</h2>
            {trainer && <span className="text-sm text-slate-500">{assignedIds.size} already linked</span>}
          </div>
          <div className="w-full sm:w-64">
            <Input
              type="search"
              placeholder="Search members..."
              startIcon={<Search className="h-4 w-4" />}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
        </div>
        {membersError && <p className="border-b border-border bg-red-50 px-5 py-3 text-sm text-red-700">{membersError}</p>}
        {members.length === 0 && !membersLoading ? (
          <p className="px-5 py-8 text-center text-sm text-slate-400">No members match this search.</p>
        ) : (
          <div className="divide-y divide-border">
            {members.map((m) => {
              const assigned = assignedIds.has(m.id);
              return (
                <div key={m.id} className="flex items-center gap-3 px-5 py-3">
                  <Avatar src={m.photo} name={m.fullName} size="sm" />
                  <div className="min-w-0 flex-1">
                    <p className="font-medium text-slate-900">{m.fullName}</p>
                    <p className="font-mono text-xs text-slate-500">
                      {m.memberCode} · {m.phone}
                    </p>
                  </div>
                  {assigned ? (
                    <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-xs font-medium text-emerald-700">
                      <Check className="h-3.5 w-3.5" /> Linked
                    </span>
                  ) : (
                    <Button size="sm" variant="outline" onClick={() => runAssign(m.id)} loading={assigning === m.id}>
                      <Link2 className="h-3.5 w-3.5" /> Assign
                    </Button>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}