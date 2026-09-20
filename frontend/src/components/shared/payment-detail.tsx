"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { ArrowLeft, Printer, RotateCcw, BellRing } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Alert } from "@/components/ui/alert";
import { PageLoader } from "@/components/ui/spinner";
import { Modal } from "@/components/ui/modal";
import { useToast } from "@/components/ui/toast";
import { useAuth } from "@/providers/auth-provider";
import { getPaymentById, processRefund, type Receipt } from "@/lib/api/payments";
import { sendNotification } from "@/lib/api/notifications";
import { formatDateTime, formatETB } from "@/lib/utils";
import { paymentMethodLabel } from "@/components/shared/payment-status";
import { ReceiptView } from "@/components/shared/payment-receipt-view";
import type { Payment } from "@/types";

export function PaymentDetailPage() {
  const params = useParams<{ id: string }>();
  const id = params?.id;
  const { user } = useAuth();
  const { toast } = useToast();
  const canManage = ["OWNER", "MANAGER"].includes(user?.role ?? "MEMBER");

  const [payment, setPayment] = useState<Payment | null>(null);
  const [receipt, setReceipt] = useState<Receipt | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [refundOpen, setRefundOpen] = useState(false);
  const [refundReason, setRefundReason] = useState("");
  const [refundBusy, setRefundBusy] = useState(false);
  const [refundError, setRefundError] = useState<string | null>(null);

  useEffect(() => {
    if (!id) return;
    let cancelled = false;
    getPaymentById(id)
      .then((res) => {
        if (cancelled) return;
        setPayment(res.payment);
        setReceipt(res.receipt);
        setError(null);
      })
      .catch((e) => {
        if (cancelled) return;
        setError(e instanceof Error ? e.message : "Failed to load payment details");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [id]);

  const runRefund = async () => {
    if (!payment) return;
    if (!refundReason.trim()) {
      setRefundError("A refund reason is required.");
      return;
    }
    setRefundBusy(true);
    setRefundError(null);
    try {
      const res = await processRefund(payment.id, refundReason.trim());
      setPayment({ ...payment, status: "REFUNDED", notes: res.payment.notes });
      setRefundOpen(false);
      setRefundReason("");
      toast("success", "Refund processed", `${res.payment.receiptNumber} marked as REFUNDED.`);
    } catch (err) {
      setRefundError(err instanceof Error ? err.message : "Failed to process refund.");
    } finally {
      setRefundBusy(false);
    }
  };

  const runReminder = async () => {
    if (!payment?.member?.userId) {
      toast("error", "Cannot send reminder", "This member has no login account to receive notifications.");
      return;
    }
    try {
      await sendNotification({
        title: "Payment Reminder",
        message: `Dear ${payment.member.fullName}, this is a reminder regarding payment ${payment.receiptNumber} of ${formatETB(payment.amount)}. Please settle at the front desk.`,
        recipientId: payment.member.userId,
        type: "PAYMENT",
      });
      toast("success", "Reminder sent", `Notification delivered to ${payment.member.fullName}.`);
    } catch (err) {
      toast("error", "Failed to send reminder", err instanceof Error ? err.message : "Please try again.");
    }
  };

  if (loading) return <PageLoader label="Loading payment details..." />;

  if (error || !payment || !receipt) {
    return (
      <Alert variant="error" title="Failed to load payment">
        {error ?? "Payment record not found."}
        <Link href="/payments" className="mt-3 inline-block">
          <Button variant="outline" size="sm">
            Back to Payments
          </Button>
        </Link>
      </Alert>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <Link href="/payments">
            <Button variant="outline" size="sm" aria-label="Back to payments">
              <ArrowLeft className="h-4 w-4" /> Payments
            </Button>
          </Link>
          <div>
            <h1 className="text-xl font-bold text-slate-900">{payment.receiptNumber}</h1>
            <p className="text-sm text-slate-500">
              Recorded {formatDateTime(payment.paymentDate)} · {paymentMethodLabel(payment.paymentMethod)}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {canManage && payment.status !== "REFUNDED" && (
            <Button variant="outline" onClick={runReminder}>
              <BellRing className="h-4 w-4" /> Send Reminder
            </Button>
          )}
          {canManage && payment.status !== "REFUNDED" && (
            <Button variant="danger" onClick={() => setRefundOpen(true)}>
              <RotateCcw className="h-4 w-4" /> Process Refund
            </Button>
          )}
          <Button variant="outline" onClick={() => window.print()}>
            <Printer className="h-4 w-4" /> Print / PDF
          </Button>
        </div>
      </div>

      {payment.status === "REFUNDED" && (
        <Alert variant="info" title={`Refunded payment · ${formatETB(payment.amount)}`}>
          This transaction has been refunded. See the note field for the refund reason.
        </Alert>
      )}

      <ReceiptView receipt={receipt} />

      {canManage && (
        <Modal
          open={refundOpen}
          onClose={() => setRefundOpen(false)}
          title="Process Refund"
          description={`${payment.receiptNumber} · ${payment.member?.fullName ?? "Member"} · ${formatETB(payment.amount)}`}
          size="sm"
          footer={
            <div className="flex items-center justify-end gap-3">
              <Button variant="ghost" onClick={() => setRefundOpen(false)} disabled={refundBusy}>
                Cancel
              </Button>
              <Button variant="danger" onClick={runRefund} loading={refundBusy}>
                <RotateCcw className="h-4 w-4" /> Confirm Full Refund
              </Button>
            </div>
          }
        >
          <div className="space-y-4">
            <Alert variant="warning" title="Full refund">
              This marks the entire {formatETB(payment.amount)} as refunded. The operation cannot be partially applied.
            </Alert>
            <div>
              <label htmlFor="refund-reason" className="block text-sm font-medium text-slate-700 mb-1.5">
                Refund reason <span className="text-red-500">*</span>
              </label>
              <textarea
                id="refund-reason"
                value={refundReason}
                onChange={(e) => setRefundReason(e.target.value)}
                rows={3}
                placeholder="e.g. Duplicate charge, member requested cancellation..."
                className="w-full rounded-lg border border-input bg-white px-3 py-2 text-sm text-foreground transition-colors focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary"
              />
              {refundError && <p className="mt-1 text-xs text-red-600">{refundError}</p>}
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}