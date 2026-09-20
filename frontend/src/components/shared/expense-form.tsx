"use client";

/* eslint-disable @next/next/no-img-element -- inline data-URI receipt previews */

import { useRef, useState } from "react";
import { FileText, Paperclip, X } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Alert } from "@/components/ui/alert";
import { useToast } from "@/components/ui/toast";
import { createExpense, updateExpense } from "@/lib/api/expenses";
import { formatETB } from "@/lib/utils";
import { expenseCategoryOptions } from "@/components/shared/expense-status";
import type { Expense, ExpenseCategory, PaymentMethod } from "@/types";

const MAX_ATTACHMENT_BYTES = 1.5 * 1024 * 1024;

interface ExpenseFormProps {
  initial?: Expense | null;
  onComplete: (expense: Expense) => void;
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

function localDate(d: Date = new Date()): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

export function ExpenseForm({ initial, onComplete }: ExpenseFormProps) {
  const { toast } = useToast();
  const fileRef = useRef<HTMLInputElement>(null);

  const isEdit = Boolean(initial);

  const [title, setTitle] = useState(initial?.title ?? "");
  const [category, setCategory] = useState<ExpenseCategory>(initial?.category ?? "OTHER");
  const [vendor, setVendor] = useState(initial?.vendor ?? "");
  const [amount, setAmount] = useState(initial ? String(initial.amount) : "");
  const [expenseDate, setExpenseDate] = useState(initial ? localDate(new Date(initial.expenseDate)) : localDate());
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>(initial?.paymentMethod ?? "CASH");
  const [notes, setNotes] = useState(initial?.notes ?? "");
  const [attachment, setAttachment] = useState(initial?.receiptAttachment ?? "");
  const [attachmentName, setAttachmentName] = useState("");
  const [busy, setBusy] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const handleAttach = (file: File | null) => {
    if (!file) return;
    if (file.size > MAX_ATTACHMENT_BYTES) {
      toast("error", "File too large", "Receipt files are capped at 1.5 MB — the backend stores them inline as text.");
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      setAttachment(String(reader.result ?? ""));
      setAttachmentName(file.name);
    };
    reader.onerror = () => toast("error", "Could not read file", "Please try another file.");
    reader.readAsDataURL(file);
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    const next: Record<string, string> = {};
    if (!title.trim()) next.title = "A title is required";
    const amt = Number(amount);
    if (!amount || !isFinite(amt) || amt <= 0) next.amount = "Enter a valid positive amount";
    setErrors(next);
    if (Object.keys(next).length > 0) return;

    const body = {
      title: title.trim(),
      category,
      amount: amt,
      expenseDate,
      paymentMethod,
      vendor: vendor.trim() || undefined,
      notes: notes.trim() || undefined,
      receiptAttachment: attachment || undefined,
    };

    setBusy(true);
    try {
      if (isEdit && initial) {
        const res = await updateExpense(initial.id, {
          ...body,
          receiptAttachment: attachment || "",
        });
        toast("success", "Expense updated", `${formatETB(initial.amount)} · ${res.expense.title}`);
        onComplete(res.expense);
      } else {
        const res = await createExpense(body);
        toast("success", "Expense logged", `${formatETB(res.expense.amount)} · ${res.expense.title}`);
        onComplete(res.expense);
      }
    } catch (err) {
      toast("error", isEdit ? "Failed to update expense" : "Failed to log expense", err instanceof Error ? err.message : "Please try again.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <form onSubmit={submit} noValidate className="space-y-4">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <Input
          label="Title *"
          placeholder="e.g. March electricity bill"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          error={errors.title}
        />
        <Select
          label="Category *"
          value={category}
          onChange={(e) => setCategory(e.target.value as ExpenseCategory)}
          options={expenseCategoryOptions}
        />
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <Input
          label="Vendor / payee"
          placeholder="e.g. Ethio Electric"
          value={vendor}
          onChange={(e) => setVendor(e.target.value)}
        />
        <Input
          label="Amount (ETB) *"
          type="number"
          min="0"
          step="0.01"
          placeholder="0.00"
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
          error={errors.amount}
        />
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <Input type="date" label="Expense date" value={expenseDate} onChange={(e) => setExpenseDate(e.target.value || localDate())} />
        <Select
          label="Paid via"
          value={paymentMethod}
          onChange={(e) => setPaymentMethod(e.target.value as PaymentMethod)}
          options={[
            { value: "CASH", label: "Cash" },
            { value: "CARD", label: "Card" },
            { value: "BANK_TRANSFER", label: "Bank Transfer" },
            { value: "MOBILE_MONEY", label: "Telebirr / Mobile Money" },
          ]}
        />
      </div>
      <div>
        <label className="block text-sm font-medium text-slate-700 mb-1.5">Description / notes</label>
        <Textarea value={notes} onChange={setNotes} placeholder="Optional details about this expense..." />
      </div>
      <div>
        <label className="block text-sm font-medium text-slate-700 mb-1.5">Receipt attachment (optional)</label>
        <input ref={fileRef} type="file" accept="image/*,.pdf" className="hidden" onChange={(e) => handleAttach(e.target.files?.[0] ?? null)} />
        {attachment ? (
          <div className="flex items-center justify-between gap-3 rounded-lg border border-border bg-slate-50 p-3">
            <div className="flex min-w-0 items-center gap-2 text-sm">
              {attachment.startsWith("data:image") ? (
                <img src={attachment} alt="Receipt preview" className="h-10 w-10 rounded object-cover" />
              ) : (
                <FileText className="h-5 w-5 text-slate-400" />
              )}
              <span className="truncate text-slate-600">{attachmentName || "Receipt attached"}</span>
            </div>
            <Button
              size="xs"
              variant="ghost"
              onClick={() => {
                setAttachment("");
                setAttachmentName("");
                if (fileRef.current) fileRef.current.value = "";
              }}
            >
              <X className="h-3.5 w-3.5" /> Remove
            </Button>
          </div>
        ) : (
          <button
            type="button"
            onClick={() => fileRef.current?.click()}
            className="flex w-full items-center justify-center gap-2 rounded-lg border-2 border-dashed border-border bg-white px-4 py-5 text-sm text-slate-500 transition-colors hover:border-primary hover:text-primary"
          >
            <Paperclip className="h-4 w-4" /> Click to attach an image / PDF receipt (max 1.5 MB)
          </button>
        )}
        <p className="mt-1.5 text-xs text-slate-400">
          The backend stores receipt files inline (no upload server) — keep files small.
        </p>
      </div>
      <Alert variant="info" title={isEdit ? "Updating expense" : "Recording expense"}>
        {isEdit
          ? "Saving keeps an audit timestamp. Deletion is available under the record's actions."
          : "Expenses are logged immediately as recorded (no approval workflow)."}
      </Alert>
      <Button type="submit" className="w-full" loading={busy}>
        <FileText className="h-4 w-4" /> {isEdit ? "Save Changes" : "Log Expense"}
      </Button>
    </form>
  );
}