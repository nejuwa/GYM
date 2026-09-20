"use client";

import { useEffect, useRef, useState } from "react";
import { Search, Eye, RotateCcw, Plus, Printer, BellRing } from "lucide-react";
import { Table, type Column } from "@/components/ui/table";
import { Pagination } from "@/components/ui/pagination";
import { Badge } from "@/components/ui/badge";
import { Avatar } from "@/components/ui/avatar";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Modal } from "@/components/ui/modal";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/toast";
import { useDebounce } from "@/hooks/use-debounce";
import { useAuth } from "@/providers/auth-provider";
import { listPayments, getPaymentById, processRefund, type Receipt } from "@/lib/api/payments";
import { sendNotification } from "@/lib/api/notifications";
import { formatDateTime, formatETB } from "@/lib/utils";
import { paymentMethodLabel, PaymentStatusBadge } from "@/components/shared/payment-status";
import { PaymentKpis } from "@/components/shared/payment-kpis";
import { RecordPaymentForm } from "@/components/shared/record-payment-form";
import { ReceiptView } from "@/components/shared/payment-receipt-view";
import type { Payment, PaymentMethod, PaymentStatus } from "@/types";

function localDate(d: Date = new Date()): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

export function PaymentsList() {
  const { user } = useAuth();
  const { toast } = useToast();
  const canManage = ["OWNER", "MANAGER"].includes(user?.role ?? "MEMBER");

  const [search, setSearch] = useState("");
  const [status, setStatus] = useState<PaymentStatus | "ALL">("ALL");
  const [method, setMethod] = useState<PaymentMethod | "ALL">("ALL");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const debouncedSearch = useDebounce(search, 350);

  const [payments, setPayments] = useState<Payment[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [resultKey, setResultKey] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [refreshKey, setRefreshKey] = useState(0);

  const [collectOpen, setCollectOpen] = useState(false);

  const [receiptTarget, setReceiptTarget] = useState<Payment | null>(null);
  const [receipt, setReceipt] = useState<Receipt | null>(null);
  const [receiptBusy, setReceiptBusy] = useState(false);

  const [refundTarget, setRefundTarget] = useState<Payment | null>(null);
  const [refundReason, setRefundReason] = useState("");
  const [refundBusy, setRefundBusy] = useState(false);
  const [refundError, setRefundError] = useState<string | null>(null);
  const refundInputRef = useRef<HTMLTextAreaElement>(null);

  const queryKey = `${debouncedSearch}|${status}|${method}|${startDate}|${endDate}`;
  const loading = resultKey !== queryKey;
  const currentKeyRef = useRef(queryKey);

  useEffect(() => {
    currentKeyRef.current = queryKey;
    listPayments({
      search: debouncedSearch || undefined,
      status,
      paymentMethod: method,
      startDate: startDate || undefined,
      endDate: endDate || undefined,
    })
      .then((res) => {
        if (currentKeyRef.current !== queryKey) return;
        setPage(1);
        setPayments(res.payments);
        setError(null);
        setResultKey(queryKey);
      })
      .catch((e) => {
        if (currentKeyRef.current !== queryKey) return;
        setError(e instanceof Error ? e.message : "Failed to load transactions");
        setResultKey(queryKey);
      });
  }, [debouncedSearch, status, method, startDate, endDate, queryKey, refreshKey]);

  const openReceipt = (p: Payment) => {
  setReceipt(null);
  setReceiptBusy(true);
  setReceiptTarget(p);
};

useEffect(() => {
  if (!receiptTarget) return;
  let cancelled = false;
  getPaymentById(receiptTarget.id)
    .then((res) => {
      if (cancelled) return;
      setReceipt(res.receipt);
    })
    .catch(() => {
      if (cancelled) return;
      toast("error", "Failed to load receipt", "Could not retrieve the receipt details.");
    })
    .finally(() => {
      if (!cancelled) setReceiptBusy(false);
    });
  return () => {
    cancelled = true;
  };
}, [receiptTarget, toast]);

  useEffect(() => {
    if (refundTarget && refundTarget.status !== "REFUNDED") {
      const t = window.setTimeout(() => refundInputRef.current?.focus(), 60);
      return () => window.clearTimeout(t);
    }
  }, [refundTarget]);

  const openCollect = () => {
    setCollectOpen(true);
  };

  const runRefund = async () => {
    if (!refundTarget) return;
    if (!refundReason.trim()) {
      setRefundError("A refund reason is required.");
      return;
    }
    setRefundBusy(true);
    setRefundError(null);
    try {
      const res = await processRefund(refundTarget.id, refundReason.trim());
      setRefundTarget(null);
      setRefundReason("");
      setRefreshKey((k) => k + 1);
      toast("success", "Refund processed", `${res.payment.receiptNumber} marked as REFUNDED.`);
    } catch (err) {
      setRefundError(err instanceof Error ? err.message : "Failed to process refund.");
    } finally {
      setRefundBusy(false);
    }
  };

  const runReminder = async (p: Payment) => {
    if (!p.member?.userId) {
      toast("error", "Cannot send reminder", "This member has no login account to receive notifications.");
      return;
    }
    try {
      await sendNotification({
        title: "Payment Reminder",
        message: `Dear ${p.member.fullName}, this is a reminder regarding payment ${p.receiptNumber} of ${formatETB(p.amount)}. Please settle at the front desk. — ${p.member.fullName ? "Chagni Gym" : "Chagni Gym"}`,
        recipientId: p.member.userId,
        type: "PAYMENT",
      });
      toast("success", "Reminder sent", `Notification delivered to ${p.member.fullName}.`);
    } catch (err) {
      toast("error", "Failed to send reminder", err instanceof Error ? err.message : "Please try again.");
    }
  };

  const totalItems = payments.length;
  const pageItems = payments.slice((page - 1) * pageSize, page * pageSize);
  const showReset = Boolean(search || status !== "ALL" || method !== "ALL" || startDate || endDate);

  const columns: Array<Column<Payment>> = [
    {
      key: "receipt",
      header: "Transaction ID",
      cell: (p) => <span className="font-mono text-xs font-semibold text-slate-700">{p.receiptNumber}</span>,
    },
    {
      key: "member",
      header: "Member",
      cell: (p) => (
        <div className="flex items-center gap-3">
          <Avatar name={p.member?.fullName ?? "?"} src={p.member?.photo} size="sm" />
          <div className="min-w-0">
            <p className="font-medium text-slate-900 truncate">{p.member?.fullName ?? "Unknown"}</p>
            {p.member?.memberCode && <p className="text-xs text-slate-500 font-mono">{p.member.memberCode}</p>}
          </div>
        </div>
      ),
    },
    {
      key: "package",
      header: "Membership",
      cell: (p) =>
        p.membership?.package?.name ? (
          <Badge variant="secondary">{p.membership.package.name}</Badge>
        ) : (
          <span className="text-xs text-slate-400">General / Fee</span>
        ),
    },
    {
      key: "amount",
      header: "Amount",
      cell: (p) => <p className="font-semibold text-slate-900">{formatETB(p.amount)}</p>,
    },
    {
      key: "method",
      header: "Method",
      cell: (p) => <Badge variant="secondary">{paymentMethodLabel(p.paymentMethod)}</Badge>,
    },
    {
      key: "date",
      header: "Date",
      cell: (p) => <p className="text-sm text-slate-600">{formatDateTime(p.paymentDate)}</p>,
    },
    {
      key: "status",
      header: "Status",
      cell: (p) => <PaymentStatusBadge status={p.status} />,
    },
    {
      key: "actions",
      header: "Actions",
      className: "text-right",
      cell: (p) => (
        <div className="flex items-center justify-end gap-1.5">
          <Button size="xs" variant="outline" onClick={() => openReceipt(p)} aria-label="View receipt">
            <Eye className="h-3.5 w-3.5" />
          </Button>
          {canManage && p.status !== "REFUNDED" && (
            <Button
              size="xs"
              variant="outline"
              onClick={() => {
                setRefundTarget(p);
                setRefundReason("");
                setRefundError(null);
              }}
              aria-label="Process refund"
            >
              <RotateCcw className="h-3.5 w-3.5" />
            </Button>
          )}
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      <PaymentKpis refreshKey={refreshKey} />

      <div className="flex flex-wrap items-center gap-3">
        <div className="w-full sm:w-64">
          <Input
            type="search"
            placeholder="Search name, code or receipt..."
            startIcon={<Search className="h-4 w-4" />}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <div className="w-full sm:w-40">
          <Select
            aria-label="Status filter"
            value={status}
            onChange={(e) => setStatus(e.target.value as PaymentStatus | "ALL")}
            options={[
              { value: "ALL", label: "All statuses" },
              { value: "COMPLETED", label: "Paid" },
              { value: "PENDING", label: "Pending" },
              { value: "REFUNDED", label: "Refunded" },
            ]}
          />
        </div>
        <div className="w-full sm:w-44">
          <Select
            aria-label="Payment method filter"
            value={method}
            onChange={(e) => setMethod(e.target.value as PaymentMethod | "ALL")}
            options={[
              { value: "ALL", label: "All methods" },
              { value: "CASH", label: "Cash" },
              { value: "CARD", label: "Card" },
              { value: "BANK_TRANSFER", label: "Bank Transfer" },
              { value: "MOBILE_MONEY", label: "Telebirr" },
            ]}
          />
        </div>
        <Input
          type="date"
          aria-label="Start date"
          value={startDate}
          max={endDate || localDate()}
          onChange={(e) => setStartDate(e.target.value)}
          className="w-full sm:w-40"
        />
        <Input
          type="date"
          aria-label="End date"
          value={endDate}
          max={localDate()}
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
            setStatus("ALL");
            setMethod("ALL");
            setStartDate("");
            setEndDate("");
          }}
        >
          Clear
        </Button>
        {canManage && (
          <div className="ml-auto">
            <Button onClick={openCollect}>
              <Plus className="h-4 w-4" /> Record Payment
            </Button>
          </div>
        )}
      </div>

      {error && (
        <Alert variant="error" title="Failed to load transactions">
          {error}
          <Button size="sm" variant="outline" className="mt-3" onClick={() => setRefreshKey((k) => k + 1)}>
            Retry
          </Button>
        </Alert>
      )}

      <div className="rounded-xl border border-border bg-card shadow-sm overflow-hidden">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border px-5 py-4">
          <div className="flex items-center gap-2.5">
            <h2 className="text-lg font-bold text-slate-900">Transactions &amp; Invoices</h2>
            <Badge variant="default">{totalItems} records</Badge>
            {loading && <Badge variant="secondary">Refreshing...</Badge>}
          </div>
        </div>
        <Table
          columns={columns}
          data={pageItems}
          getRowKey={(p) => p.id}
          loading={loading}
          emptyTitle="No transactions found"
          emptyMessage={showReset ? "Try adjusting your filters." : "Record a payment to see it listed here."}
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
          open={collectOpen}
          onClose={() => setCollectOpen(false)}
          title="Record Payment"
          description="Collect a membership fee or record an offline transaction."
          size="md"
          footer={
            <div className="flex items-center justify-end">
              <Button variant="ghost" onClick={() => setCollectOpen(false)}>
                Cancel
              </Button>
            </div>
          }
        >
          <RecordPaymentForm
            onComplete={() => {
              setCollectOpen(false);
              setRefreshKey((k) => k + 1);
            }}
          />
        </Modal>
      )}

      <Modal
        open={receiptTarget !== null}
        onClose={() => setReceiptTarget(null)}
        title="Receipt & Invoice"
        size="md"
        footer={
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              {receipt && canManage && (
                <Button
                  variant="outline"
                  onClick={() => runReminder(receiptTarget as Payment)}
                  disabled={!receiptTarget?.member?.userId}
                  title={
                    receiptTarget?.member?.userId
                      ? "Send payment reminder to this member"
                      : "Member has no login account for notifications"
                  }
                >
                  <BellRing className="h-4 w-4" /> Send Reminder
                </Button>
              )}
            </div>
            <div className="flex items-center gap-2">
              <Button variant="outline" onClick={() => window.print()}>
                <Printer className="h-4 w-4" /> Print / PDF
              </Button>
              <Button variant="ghost" onClick={() => setReceiptTarget(null)}>
                Close
              </Button>
            </div>
          </div>
        }
      >
        {receiptTarget && receiptBusy && (
          <div className="space-y-3">
            <div className="h-8 w-40 animate-pulse rounded bg-slate-200" />
            <div className="h-64 animate-pulse rounded bg-slate-100" />
          </div>
        )}
        {receiptTarget && !receiptBusy && receipt && <ReceiptView receipt={receipt} />}
        {receiptTarget && !receiptBusy && !receipt && (
          <p className="text-sm text-slate-500 py-6 text-center">Receipt could not be loaded.</p>
        )}
      </Modal>

      {canManage && (
        <Modal
          open={refundTarget !== null}
          onClose={() => setRefundTarget(null)}
          title="Process Refund"
          description={
            refundTarget
              ? `${refundTarget.receiptNumber} · ${refundTarget.member?.fullName ?? "Member"} · ${formatETB(refundTarget.amount)}`
              : undefined
          }
          size="sm"
          footer={
            <div className="flex items-center justify-end gap-3">
              <Button variant="ghost" onClick={() => setRefundTarget(null)} disabled={refundBusy}>
                Cancel
              </Button>
              <Button variant="danger" onClick={runRefund} loading={refundBusy}>
                <RotateCcw className="h-4 w-4" /> Confirm Full Refund
              </Button>
            </div>
          }
        >
          <div className="space-y-4">
            {refundTarget?.status === "REFUNDED" ? (
              <Alert variant="info" title="Already refunded">
                This payment is already marked as REFUNDED.
              </Alert>
            ) : (
              <>
                <Alert variant="warning" title="Full refund">
                  This marks the entire {formatETB(refundTarget?.amount ?? 0)} as refunded in the system. The operation
                  cannot be partially applied.
                </Alert>
                <div>
                  <label htmlFor="refund-reason" className="block text-sm font-medium text-slate-700 mb-1.5">
                    Refund reason <span className="text-red-500">*</span>
                  </label>
                  <textarea
                    id="refund-reason"
                    ref={refundInputRef}
                    value={refundReason}
                    onChange={(e) => setRefundReason(e.target.value)}
                    rows={3}
                    placeholder="e.g. Duplicate charge, member requested cancellation..."
                    className="w-full rounded-lg border border-input bg-white px-3 py-2 text-sm text-foreground transition-colors focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary disabled:cursor-not-allowed disabled:opacity-50"
                  />
                  {refundError && <p className="mt-1 text-xs text-red-600">{refundError}</p>}
                </div>
              </>
            )}
          </div>
        </Modal>
      )}
    </div>
  );
}