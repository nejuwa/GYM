"use client";

/* eslint-disable @next/next/no-img-element -- inline data-URI receipt previews */

import { useEffect, useRef, useState } from "react";
import { Search, Plus, Pencil, Trash2, Eye, Paperclip, FileText } from "lucide-react";
import { Table, type Column } from "@/components/ui/table";
import { Pagination } from "@/components/ui/pagination";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Modal } from "@/components/ui/modal";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/toast";
import { useDebounce } from "@/hooks/use-debounce";
import { useAuth } from "@/providers/auth-provider";
import { listExpenses, deleteExpense } from "@/lib/api/expenses";
import { formatDateTime, formatETB } from "@/lib/utils";
import { paymentMethodLabel } from "@/components/shared/payment-status";
import { ExpenseCategoryBadge, ExpenseStatusPill, expenseCategoryOptions } from "@/components/shared/expense-status";
import { ExpenseKpis } from "@/components/shared/expense-kpis";
import { ExpenseForm } from "@/components/shared/expense-form";
import type { Expense, ExpenseCategory } from "@/types";

function isImageData(v: string): boolean {
  return v.startsWith("data:image");
}

function isHttpUrl(v: string): boolean {
  return /^https?:\/\//i.test(v);
}

export function ExpensesList() {
  const { user } = useAuth();
  const { toast } = useToast();
  const canManage = ["OWNER", "MANAGER"].includes(user?.role ?? "MEMBER");
  const isOwner = user?.role === "OWNER";

  const [search, setSearch] = useState("");
  const [category, setCategory] = useState<ExpenseCategory | "ALL">("ALL");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const debouncedSearch = useDebounce(search, 350);

  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [resultKey, setResultKey] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [refreshKey, setRefreshKey] = useState(0);

  const [editorOpen, setEditorOpen] = useState(false);
  const [editTarget, setEditTarget] = useState<Expense | null>(null);

  const [detailTarget, setDetailTarget] = useState<Expense | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Expense | null>(null);
  const [deleteBusy, setDeleteBusy] = useState(false);
  const deleteRef = useRef<HTMLButtonElement>(null);

  const queryKey = `${debouncedSearch}|${category}|${startDate}|${endDate}`;
  const loading = resultKey !== queryKey;
  const currentKeyRef = useRef(queryKey);

  useEffect(() => {
    currentKeyRef.current = queryKey;
    listExpenses({
      category,
      startDate: startDate || undefined,
      endDate: endDate || undefined,
      search: debouncedSearch || undefined,
    })
      .then((res) => {
        if (currentKeyRef.current !== queryKey) return;
        setPage(1);
        setExpenses(res.expenses);
        setError(null);
        setResultKey(queryKey);
      })
      .catch((e) => {
        if (currentKeyRef.current !== queryKey) return;
        setError(e instanceof Error ? e.message : "Failed to load expenses");
        setResultKey(queryKey);
      });
  }, [debouncedSearch, category, startDate, endDate, queryKey, refreshKey]);

  useEffect(() => {
    if (deleteTarget) {
      const t = window.setTimeout(() => deleteRef.current?.focus(), 60);
      return () => window.clearTimeout(t);
    }
  }, [deleteTarget]);

  const openCreate = () => {
    setEditTarget(null);
    setEditorOpen(true);
  };

  const openEdit = (e: Expense) => {
    setEditTarget(e);
    setEditorOpen(true);
  };

  const runDelete = async () => {
    if (!deleteTarget) return;
    setDeleteBusy(true);
    try {
      await deleteExpense(deleteTarget.id);
      setDeleteTarget(null);
      setRefreshKey((k) => k + 1);
      toast("success", "Expense deleted", `${deleteTarget.title} was removed.`);
    } catch (err) {
      toast("error", "Failed to delete expense", err instanceof Error ? err.message : "Please try again.");
    } finally {
      setDeleteBusy(false);
    }
  };

  const totalItems = expenses.length;
  const pageItems = expenses.slice((page - 1) * pageSize, page * pageSize);
  const showReset = Boolean(search || category !== "ALL" || startDate || endDate);

  const columns: Array<Column<Expense>> = [
    {
      key: "title",
      header: "Expense / Vendor",
      cell: (e) => (
        <div className="min-w-0">
          <p className="font-medium text-slate-900 truncate">{e.title}</p>
          {e.vendor ? <p className="text-xs text-slate-500">{e.vendor}</p> : <p className="text-xs text-slate-400">—</p>}
        </div>
      ),
    },
    {
      key: "category",
      header: "Category",
      cell: (e) => <ExpenseCategoryBadge category={e.category} />,
    },
    {
      key: "amount",
      header: "Amount",
      cell: (e) => <p className="font-semibold text-slate-900">{formatETB(e.amount)}</p>,
    },
    {
      key: "date",
      header: "Date",
      cell: (e) => <p className="text-sm text-slate-600">{formatDateTime(e.expenseDate)}</p>,
    },
    {
      key: "method",
      header: "Paid Via",
      cell: (e) => <Badge variant="secondary">{paymentMethodLabel(e.paymentMethod)}</Badge>,
    },
    {
      key: "status",
      header: "Status",
      cell: (e) => <ExpenseStatusPill createdAt={e.createdAt} />,
    },
    {
      key: "receipt",
      header: "Receipt",
      cell: (e) =>
        e.receiptAttachment ? (
          isHttpUrl(e.receiptAttachment) ? (
            <a
              href={e.receiptAttachment}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-1 text-xs font-medium text-primary hover:underline"
            >
              <Paperclip className="h-3 w-3" /> Link
            </a>
          ) : isImageData(e.receiptAttachment) ? (
            <span className="inline-flex items-center gap-1.5 text-xs text-slate-600">
              <img src={e.receiptAttachment} alt="receipt" className="h-6 w-6 rounded object-cover" />
              Attached
            </span>
          ) : (
            <span className="inline-flex items-center gap-1 text-xs text-slate-600">
              <FileText className="h-3 w-3" /> Attached
            </span>
          )
        ) : (
          <span className="text-xs text-slate-400">—</span>
        ),
    },
    {
      key: "actions",
      header: "Actions",
      className: "text-right",
      cell: (e) => (
        <div className="flex items-center justify-end gap-1.5">
          <Button size="xs" variant="outline" onClick={() => setDetailTarget(e)} aria-label="View details">
            <Eye className="h-3.5 w-3.5" />
          </Button>
          {canManage && (
            <Button size="xs" variant="outline" onClick={() => openEdit(e)} aria-label="Edit expense">
              <Pencil className="h-3.5 w-3.5" />
            </Button>
          )}
          {isOwner && (
            <Button size="xs" variant="outline" onClick={() => setDeleteTarget(e)} aria-label="Delete expense">
              <Trash2 className="h-3.5 w-3.5 text-red-600" />
            </Button>
          )}
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      <ExpenseKpis refreshKey={refreshKey} />

      <div className="flex flex-wrap items-center gap-3">
        <div className="w-full sm:w-64">
          <Input
            type="search"
            placeholder="Search title, vendor or notes..."
            startIcon={<Search className="h-4 w-4" />}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <div className="w-full sm:w-44">
          <Select
            aria-label="Category filter"
            value={category}
            onChange={(e) => setCategory(e.target.value as ExpenseCategory | "ALL")}
            options={[{ value: "ALL", label: "All categories" }, ...expenseCategoryOptions]}
          />
        </div>
        <Input
          type="date"
          aria-label="Start date"
          value={startDate}
          max={endDate || undefined}
          onChange={(e) => setStartDate(e.target.value)}
          className="w-full sm:w-40"
        />
        <Input
          type="date"
          aria-label="End date"
          value={endDate}
          min={startDate || undefined}
          onChange={(e) => setEndDate(e.target.value)}
          className="w-full sm:w-40"
        />
        <Button
          variant="outline"
          size="sm"
          disabled={!showReset}
          onClick={() => {
            setSearch("");
            setCategory("ALL");
            setStartDate("");
            setEndDate("");
          }}
        >
          Clear
        </Button>
        {canManage && (
          <div className="ml-auto">
            <Button onClick={openCreate}>
              <Plus className="h-4 w-4" /> Log Expense
            </Button>
          </div>
        )}
      </div>

      {error && (
        <Alert variant="error" title="Failed to load expenses">
          {error}
          <Button size="sm" variant="outline" className="mt-3" onClick={() => setRefreshKey((k) => k + 1)}>
            Retry
          </Button>
        </Alert>
      )}

      <div className="rounded-xl border border-border bg-card shadow-sm overflow-hidden">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border px-5 py-4">
          <div className="flex items-center gap-2.5">
            <h2 className="text-lg font-bold text-slate-900">Expenses &amp; Audit</h2>
            <Badge variant="default">{totalItems} records</Badge>
            {loading && <Badge variant="secondary">Refreshing...</Badge>}
          </div>
        </div>
        <Table
          columns={columns}
          data={pageItems}
          getRowKey={(e) => e.id}
          loading={loading}
          emptyTitle="No expenses found"
          emptyMessage={showReset ? "Try adjusting your filters." : "Log an expense to see it listed here."}
          footer={
            totalItems > 0 ? (
              <Pagination
                page={page}
                pageSize={pageSize}
                totalItems={totalItems}
                onPageChange={setPage}
                onPageSizeChange={(s) => {
                  setPageSize(s);
                  setPage(1);
                }}
                pageSizeOptions={[10, 25, 50, 100]}
              />
            ) : undefined
          }
        />
      </div>

      {canManage && (
        <Modal
          open={editorOpen}
          onClose={() => setEditorOpen(false)}
          title={editTarget ? "Edit Expense" : "Log New Expense"}
          description={editTarget ? `Updating ${editTarget.title}` : "Record an operational expense."}
          size="md"
          footer={
            <div className="flex items-center justify-end">
              <Button variant="ghost" onClick={() => setEditorOpen(false)}>
                Cancel
              </Button>
            </div>
          }
        >
          <ExpenseForm
            initial={editTarget}
            onComplete={() => {
              setEditorOpen(false);
              setRefreshKey((k) => k + 1);
              setResultKey(null);
            }}
          />
        </Modal>
      )}

      <Modal
        open={detailTarget !== null}
        onClose={() => setDetailTarget(null)}
        title="Expense Details"
        description={detailTarget ? `${detailTarget.title} · ${formatDateTime(detailTarget.expenseDate)}` : undefined}
        size="md"
        footer={
          <div className="flex items-center justify-end gap-3">
            {detailTarget && canManage && (
              <Button
                variant="outline"
                onClick={() => {
                  const t = detailTarget;
                  setDetailTarget(null);
                  openEdit(t);
                }}
              >
                <Pencil className="h-4 w-4" /> Edit
              </Button>
            )}
            <Button variant="ghost" onClick={() => setDetailTarget(null)}>
              Close
            </Button>
          </div>
        }
      >
        {detailTarget && (
          <div className="space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-2.5">
                <ExpenseCategoryBadge category={detailTarget.category} />
                <Badge variant="secondary">{paymentMethodLabel(detailTarget.paymentMethod)}</Badge>
              </div>
              <span className="text-xl font-bold text-slate-900">{formatETB(detailTarget.amount)}</span>
            </div>
            <div className="space-y-2 text-sm">
              {[
                ["Title", detailTarget.title],
                ["Vendor", detailTarget.vendor ?? "—"],
                ["Date", formatDateTime(detailTarget.expenseDate)],
                ["Recorded by", detailTarget.recordedBy?.fullName ?? "—"],
                ["Created", formatDateTime(detailTarget.createdAt)],
                ["Last updated", formatDateTime(detailTarget.updatedAt)],
              ].map(([label, value]) => (
                <div key={label} className="flex items-start justify-between gap-4 border-b border-border/60 pb-2">
                  <span className="text-slate-500">{label}</span>
                  <span className="font-medium text-slate-800 text-right">{value}</span>
                </div>
              ))}
              {detailTarget.notes && (
                <div className="rounded-lg bg-slate-50 border border-border p-3 text-sm text-slate-600">
                  <span className="font-semibold">Note: </span>
                  {detailTarget.notes}
                </div>
              )}
            </div>
            {detailTarget.receiptAttachment && (
              <div>
                <p className="text-sm font-medium text-slate-700 mb-1.5">Receipt attachment</p>
                {isImageData(detailTarget.receiptAttachment) ? (
                  <img
                    src={detailTarget.receiptAttachment}
                    alt="Receipt"
                    className="max-h-72 w-full rounded-lg border border-border object-contain bg-slate-50"
                  />
                ) : isHttpUrl(detailTarget.receiptAttachment) ? (
                  <a
                    href={detailTarget.receiptAttachment}
                    target="_blank"
                    rel="noreferrer"
                    className="text-sm font-medium text-primary hover:underline"
                  >
                    Open receipt link →
                  </a>
                ) : (
                  <p className="break-all rounded-lg border border-border bg-slate-50 p-3 text-xs text-slate-500">
                    {detailTarget.receiptAttachment}
                  </p>
                )}
              </div>
            )}
          </div>
        )}
      </Modal>

      {isOwner && (
        <Modal
          open={deleteTarget !== null}
          onClose={() => setDeleteTarget(null)}
          title="Delete Expense"
          description={deleteTarget ? `${deleteTarget.title} · ${formatETB(deleteTarget.amount)}` : undefined}
          size="sm"
          footer={
            <div className="flex items-center justify-end gap-3">
              <Button variant="ghost" onClick={() => setDeleteTarget(null)} disabled={deleteBusy}>
                Cancel
              </Button>
              <Button variant="danger" ref={deleteRef} onClick={runDelete} loading={deleteBusy}>
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