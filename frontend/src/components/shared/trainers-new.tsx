"use client";

import { useRouter } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { TrainerForm } from "@/components/shared/trainer-form";

export function TrainerNewPage() {
  const router = useRouter();

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Add Trainer</h1>
          <p className="mt-1 text-sm text-slate-500">Register a trainer and create their login account.</p>
        </div>
        <Button variant="outline" size="sm" onClick={() => router.push("/trainers")}>
          <ArrowLeft className="h-4 w-4" /> Back
        </Button>
      </div>

      <div className="rounded-xl border border-border bg-card p-5 shadow-sm">
        <TrainerForm initial={null} onComplete={() => router.push("/trainers")} />
      </div>
    </div>
  );
}