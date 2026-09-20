"use client";

/* eslint-disable @next/next/no-img-element -- inline data-URI receipt previews */

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { ArrowLeft, Pencil, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Modal } from "@/components/ui/modal";
import { Alert } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/components/ui/toast";
import { useAuth } from "@/providers/auth-provider";
import { getExpenseById, deleteExpense } from "@/lib/api/expenses";
import { formatDateTime, formatETB } from "@/lib/utils";
import { paymentMethodLabel } from "@/components/shared/payment-status";
import { ExpenseCategoryBadge } from "@/components/shared/expense-status";
import { ExpenseForm } from "@/components/shared/expense-form";
import type { Expense } from "@/types";

interface ExpenseResponse {
  success: boolean;
  expense: Expense;
}

function isImageData(v: string): boolean {
  return v.startsWith("data:image");
}

function isHttpUrl(v: string): boolean {
  return /^https?:\/\//i.test(v);
}

export function ExpenseEditPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const { user } = useAuth();
  const { toast } = useToast();

  const canManage = ["OWNER", "MANAGER"].includes(user?.role ?? "MEMBER");
  const isOwner = user?.role === "OWNER";

  const [result, setResult] = useState<ExpenseResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);

  const [editorOpen, setEditorOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleteBusy, setDeleteBusy] = useState(false);

  const id = String(params.id);

  useEffect(() => {
    let cancelled = false;
    getExpenseById(id)
      .then((res) => {
        if (cancelled) return;
        setResult(res);
        setError(null);
      })
      .catch((e) => {
        if (cancelled) return;
        setError(e instanceof Error ? e.message : "Failed to load expense");
        setResult(null);
      });
    return () => {
      cancelled = true;
    };
  }, [id, refreshKey]);

  const expense = result?.expense ?? null;
  const loading = result === null && error === null;

  const runDelete = async () => {
    if (!expense) return;
    setDeleteBusy(true);
    try {
      await deleteExpense(expense.id);
      toast("success", "Expense deleted", `${expense.title} was removed.`);
      router.push("/expenses");
    } catch (err) {
      toast("error", "Failed to delete expense", err instanceof Error ? err.message : "Please try again.");
      setDeleteBusy(false);
    }
  };

  if (loading) {
    return (
      <div className="mx-auto max-w-2xl space-y-4">
        <div className="h-8 w-56 animate-pulse rounded bg-slate-200" />
        <div className="h-64 animate-pulse rounded-xl border border-border bg-slate-100" />
      </div>
    );
  }

  if (error || !expense) {
    return (
      <div className="mx-auto max-w-2xl">
        <Alert variant="error" title="Could not load expense">
          {error ?? "Expense not found."}
          <Button
            size="sm"
            variant="outline"
            className="mt-3"
            onClick={() => {
              setRefreshKey((k) => k + 1);
            }}
          >
            Retry
          </Button>
        </Alert>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">{expense.title}</h1>
          <p className="mt-1 text-sm text-slate-500">{formatDateTime(expense.expenseDate)}</p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={() => router.push("/expenses")}>
            <ArrowLeft className="h-4 w-4" /> Back
          </Button>
          {canManage && (
            <Button variant="outline" size="sm" onClick={() => setEditorOpen(true)}>
              <Pencil className="h-4 w-4" /> Edit
            </Button>
          )}
          {isOwner && (
            <Button variant="danger" size="sm" onClick={() => setDeleteOpen(true)}>
              <Trash2 className="h-4 w-4" /> Delete
            </Button>
          )}
        </div>
      </div>

      <div className="rounded-xl border border-border bg-card p-5 shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-3 pb-4">
          <div className="flex flex-wrap items-center gap-2.5">
            <ExpenseCategoryBadge category={expense.category} />
            <Badge variant="secondary">{paymentMethodLabel(expense.paymentMethod)}</Badge>
          </div>
          <span className="text-2xl font-bold text-slate-900">{formatETB(expense.amount)}</span>
        </div>

        <div className="space-y-2 border-t border-border pt-4 text-sm">
          {[
            ["Category", expense.category === "OTHER" ? "Other" : expense.category.charAt(0) + expense.category.slice(1).toLowerCase()],
            ["Vendor / payee", expense.vendor ?? "—"],
            ["Recorded by", expense.recordedBy?.fullName ?? "—"],
            ["Recorded at", formatDateTime(expense.createdAt)],
            ["Last updated", formatDateTime(expense.updatedAt)],
          ].map(([label, value]) => (
            <div key={label} className="flex items-start justify-between gap-4 border-b border-border/60 pb-2">
              <span className="text-slate-500">{label}</span>
              <span className="text-right font-medium text-slate-800">{value}</span>
            </div>
          ))}
          {expense.notes && (
            <div className="rounded-lg border border-border bg-slate-50 p-3 text-sm text-slate-600">
              <span className="font-semibold">Note: </span>
              {expense.notes}
            </div>
          )}
        </div>

        {expense.receiptAttachment && (
          <div className="mt-4 border-t border-border pt-4">
            <p className="mb-1.5 text-sm font-medium text-slate-700">Receipt attachment</p>
            {isImageData(expense.receiptAttachment) ? (
              <img src={expense.receiptAttachment} alt="Receipt" className="max-h-80 w-full rounded-lg border border-border bg-slate-50 object-contain" />
            ) : isHttpUrl(expense.receiptAttachment) ? (
              <a href={expense.receiptAttachment} target="_blank" rel="noreferrer" className="text-sm font-medium text-primary hover:underline">
                Open receipt link →
              </a>
            ) : (
              <p className="break-all rounded-lg border border-border bg-slate-50 p-3 text-xs text-slate-500">
                {expense.receiptAttachment}
              </p>
            )}
          </div>
        )}
      </div>

      {canManage && (
        <Modal
          open={editorOpen}
          onClose={() => setEditorOpen(false)}
          title="Edit Expense"
          description={`Updating ${expense.title}`}
          size="md"
        >
          <ExpenseForm
            initial={expense}
            onComplete={() => {
              setEditorOpen(false);
              setRefreshKey((k) => k + 1);
            }}
          />
        </Modal>
      )}

      {isOwner && (
        <Modal
          open={deleteOpen}
          onClose={() => setDeleteOpen(false)}
          title="Delete Expense"
          description={`${expense.title} · ${formatETB(expense.amount)}`}
          size="sm"
          footer={
            <div className="flex items-center justify-end gap-3">
              <Button variant="ghost" onClick={() => setDeleteOpen(false)} disabled={deleteBusy}>
                Cancel
              </Button>
              <Button variant="danger" onClick={runDelete} loading={deleteBusy}>
                <Trash2 className="h-4 w-4" /> Delete Forever
              </Button>
            </div>
          }
        >
          <Alert variant="warning" title="Permanent deletion">
            This permanently removes the expense record. The action is logged in the audit trail.
          </Alert>
        </Modal>
      )}
    </div>
  );
}