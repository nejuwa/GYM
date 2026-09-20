"use client";

import { useRouter } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ExpenseForm } from "@/components/shared/expense-form";

export function ExpenseNewPage() {
  const router = useRouter();

  const handleComplete = () => {
    router.push("/expenses");
  };

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Log New Expense</h1>
          <p className="mt-1 text-sm text-slate-500">Record an operational expense for the gym.</p>
        </div>
        <Button variant="outline" size="sm" onClick={() => router.push("/expenses")}>
          <ArrowLeft className="h-4 w-4" /> Back
        </Button>
      </div>

      <div className="rounded-xl border border-border bg-card p-5 shadow-sm">
        <ExpenseForm initial={null} onComplete={handleComplete} />
      </div>
    </div>
  );
}