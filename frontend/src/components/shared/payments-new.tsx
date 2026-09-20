"use client";

import { useRouter } from "next/navigation";
import { RecordPaymentForm } from "@/components/shared/record-payment-form";
import { Card } from "@/components/ui/card";

export function PaymentNewPage() {
  const router = useRouter();
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-bold text-slate-900">Record Payment</h1>
        <p className="text-sm text-slate-500">Collect a membership fee or record an offline transaction.</p>
      </div>
      <Card className="max-w-2xl" noPadding>
        <div className="p-6">
          <RecordPaymentForm
            onComplete={() => {
              router.push("/payments");
            }}
          />
        </div>
      </Card>
    </div>
  );
}