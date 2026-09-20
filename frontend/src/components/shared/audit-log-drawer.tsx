"use client";

import { X } from "lucide-react";
import type { AuditLog } from "@/types";
import { Button } from "@/components/ui/button";

export function AuditLogDrawer({
  log,
  onClose,
}: {
  log: AuditLog | null;
  onClose: () => void;
}) {
  if (!log) return null;

  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      <button
        type="button"
        aria-label="Close audit log details"
        className="absolute inset-0 bg-slate-900/40"
        onClick={onClose}
      />
      <aside className="relative z-10 h-full w-full max-w-md overflow-y-auto bg-white p-6 shadow-2xl">
        <div className="flex items-start justify-between gap-4 border-b border-border pb-4">
          <div>
            <p className="text-xs uppercase tracking-wide text-slate-500">Audit event</p>
            <h2 className="mt-1 text-lg font-semibold text-slate-900">{log.action}</h2>
          </div>
          <Button variant="ghost" size="xs" onClick={onClose} aria-label="Close">
            <X className="h-4 w-4" />
          </Button>
        </div>
        <dl className="mt-6 space-y-4 text-sm">
          <div>
            <dt className="text-xs uppercase tracking-wide text-slate-500">Actor</dt>
            <dd className="mt-1 text-slate-900">{log.userName || "Anonymous"}</dd>
          </div>
          <div>
            <dt className="text-xs uppercase tracking-wide text-slate-500">Role</dt>
            <dd className="mt-1 text-slate-900">{log.role || "—"}</dd>
          </div>
          <div>
            <dt className="text-xs uppercase tracking-wide text-slate-500">Module</dt>
            <dd className="mt-1 text-slate-900">{log.module || "—"}</dd>
          </div>
          <div>
            <dt className="text-xs uppercase tracking-wide text-slate-500">Result</dt>
            <dd className="mt-1 text-slate-900">{log.result || "—"}</dd>
          </div>
          <div>
            <dt className="text-xs uppercase tracking-wide text-slate-500">IP address</dt>
            <dd className="mt-1 font-mono text-slate-900">{log.ipAddress || "—"}</dd>
          </div>
          <div>
            <dt className="text-xs uppercase tracking-wide text-slate-500">Timestamp</dt>
            <dd className="mt-1 text-slate-900">{new Date(log.createdAt).toLocaleString()}</dd>
          </div>
          <div>
            <dt className="text-xs uppercase tracking-wide text-slate-500">Details</dt>
            <dd className="mt-1 whitespace-pre-wrap break-words text-slate-700">{log.details || "—"}</dd>
          </div>
        </dl>
      </aside>
    </div>
  );
}
