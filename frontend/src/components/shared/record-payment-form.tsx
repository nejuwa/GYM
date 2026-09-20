"use client";

import { useEffect, useState } from "react";
import { ScanLine } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Alert } from "@/components/ui/alert";
import { useToast } from "@/components/ui/toast";
import { listMembers } from "@/lib/api/members";
import { listMemberships } from "@/lib/api/memberships";
import { recordPayment } from "@/lib/api/payments";
import { formatETB } from "@/lib/utils";
import type { Member, Membership, Payment, PaymentMethod } from "@/types";

interface RecordPaymentFormProps {
  onComplete: (payment: Payment) => void;
  defaultMemberId?: string;
}

function localDate(d: Date = new Date()): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function Textarea({
  value,
  onChange,
  placeholder,
  rows = 3,
}: {
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  rows?: number;
}) {
  return (
    <textarea
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      rows={rows}
      className="w-full rounded-lg border border-input bg-white px-3 py-2 text-sm text-foreground transition-colors focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary disabled:cursor-not-allowed disabled:opacity-50"
    />
  );
}

export function RecordPaymentForm({ onComplete, defaultMemberId }: RecordPaymentFormProps) {
  const { toast } = useToast();

  const [members, setMembers] = useState<Member[]>([]);
  const [memberships, setMemberships] = useState<Membership[]>([]);
  const [memberId, setMemberId] = useState(defaultMemberId ?? "");
  const [membershipId, setMembershipId] = useState("");
  const [amount, setAmount] = useState("");
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>("CASH");
  const [paymentDate, setPaymentDate] = useState(() => localDate());
  const [notes, setNotes] = useState("");
  const [busy, setBusy] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    listMembers({ status: "ALL" })
      .then((res) => setMembers(res.members))
      .catch(() => setMembers([]));
  }, []);

  useEffect(() => {
    if (!memberId) return;
    let cancelled = false;
    listMemberships({ memberId, status: "ALL" })
      .then((res) => {
        if (!cancelled) setMemberships(res.memberships);
      })
      .catch(() => {
        if (!cancelled) setMemberships([]);
      });
    return () => {
      cancelled = true;
    };
  }, [memberId]);

  const handleMemberChange = (v: string) => {
    setMemberId(v);
    setMembershipId("");
    setMemberships([]);
    setAmount("");
  };

  const handleMembershipChange = (v: string) => {
    setMembershipId(v);
    const m = memberships.find((x) => x.id === v);
    if (m && m.pricePaid != null) setAmount(String(m.pricePaid));
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    const next: Record<string, string> = {};
    if (!memberId) next.memberId = "Select a member";
    const amt = Number(amount);
    if (!amount || !isFinite(amt) || amt <= 0) next.amount = "Enter a valid positive amount";
    setErrors(next);
    if (Object.keys(next).length > 0) return;

    setBusy(true);
    try {
      const res = await recordPayment({
        memberId,
        membershipId: membershipId || undefined,
        amount: amt,
        paymentMethod,
        notes: notes.trim() || undefined,
        paymentDate,
      });
      toast("success", "Payment recorded", `${res.payment.receiptNumber} · ${formatETB(res.payment.amount)}`);
      onComplete(res.payment);
    } catch (err) {
      toast("error", "Failed to record payment", err instanceof Error ? err.message : "Please try again.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <form onSubmit={submit} noValidate className="space-y-4">
      <Select
        label="Member"
        value={memberId}
        onChange={(e) => handleMemberChange(e.target.value)}
        placeholder="Select member"
        error={errors.memberId}
        options={members.map((m) => ({ value: m.id, label: `${m.fullName} (${m.memberCode})` }))}
      />
      <Select
        label="Linked membership / package"
        value={membershipId}
        onChange={(e) => handleMembershipChange(e.target.value)}
        placeholder={memberId ? "Select membership (optional)" : "Select a member first"}
        disabled={!memberId}
        options={memberships.map((m) => ({
          value: m.id,
          label: `${m.package?.name ?? "Package"} · ${formatETB(m.pricePaid ?? 0)} · ends ${new Date(m.endDate).toLocaleDateString()}`,
        }))}
        hint="Choosing a membership pre-fills the amount; optional for general fees."
      />
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <Input
          label="Amount (ETB)"
          type="number"
          min="0"
          step="0.01"
          placeholder="0.00"
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
          error={errors.amount}
        />
        <Input type="date" label="Payment date" value={paymentDate} max={localDate()} onChange={(e) => setPaymentDate(e.target.value || localDate())} />
      </div>
      <Select
        label="Payment method"
        value={paymentMethod}
        onChange={(e) => setPaymentMethod(e.target.value as PaymentMethod)}
        options={[
          { value: "CASH", label: "Cash" },
          { value: "CARD", label: "Card" },
          { value: "BANK_TRANSFER", label: "Bank Transfer" },
          { value: "MOBILE_MONEY", label: "Telebirr / Mobile Money" },
        ]}
      />
      <div>
        <label className="block text-sm font-medium text-slate-700 mb-1.5">Note (optional)</label>
        <Textarea value={notes} onChange={setNotes} placeholder="e.g. Monthly membership fee — Elite VIP Annual" />
      </div>
      <Alert variant="info" title="Receipt number">
        The receipt number (REC-xxxxx) is auto-generated by the backend on submission. Payment is recorded as
        COMPLETED immediately.
      </Alert>
      <Button type="submit" className="w-full" loading={busy}>
        <ScanLine className="h-4 w-4" /> Record Payment
      </Button>
    </form>
  );
}