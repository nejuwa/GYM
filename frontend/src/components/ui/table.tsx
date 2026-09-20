"use client";

import { Inbox } from "lucide-react";
import { cn } from "@/lib/utils";
import { InlineLoader } from "./spinner";

export interface Column<T> {
  key?: string;
  header: React.ReactNode;
  cell: (row: T) => React.ReactNode;
  width?: string;
  className?: string;
}

export interface TableProps<T> {
  columns: Array<Column<T>>;
  data: T[];
  getRowKey: (row: T) => string;
  loading?: boolean;
  loadingLabel?: string;
  emptyTitle?: string;
  emptyMessage?: string;
  onRowClick?: (row: T) => void;
  footer?: React.ReactNode;
  headVariant?: "default" | "dark";
}

export function Table<T>({
  columns,
  data,
  getRowKey,
  loading = false,
  loadingLabel = "Loading...",
  emptyTitle = "No records found",
  emptyMessage = "There is nothing to display yet.",
  onRowClick,
  footer,
  headVariant = "default",
}: TableProps<T>) {
  const darkHead = headVariant === "dark";
  return (
    <div className="w-full">
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className={darkHead ? "bg-[#0F172A]" : "border-b border-border bg-slate-50/80"}>
              {columns.map((col, i) => (
                <th
                  key={col.key ?? i}
                  style={col.width ? { width: col.width } : undefined}
                  className={cn(
                    "px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide whitespace-nowrap",
                    darkHead ? "text-slate-300" : "text-slate-500",
                    col.className
                  )}
                >
                  {col.header}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={columns.length}>
                  <InlineLoader label={loadingLabel} />
                </td>
              </tr>
            ) : data.length === 0 ? (
              <tr>
                <td colSpan={columns.length}>
                  <div className="flex flex-col items-center justify-center py-14 text-slate-400">
                    <Inbox className="h-10 w-10 mb-3 text-slate-300" />
                    <p className="text-sm font-medium text-slate-500">{emptyTitle}</p>
                    <p className="text-xs mt-1">{emptyMessage}</p>
                  </div>
                </td>
              </tr>
            ) : (
              data.map((row) => (
                <tr
                  key={getRowKey(row)}
                  onClick={onRowClick ? () => onRowClick(row) : undefined}
                  className={cn("border-b border-border transition-colors", onRowClick && "cursor-pointer hover:bg-slate-50")}
                >
                  {columns.map((col, i) => (
                    <td key={col.key ?? i} className={cn("px-4 py-3 align-middle", col.className)}>
                      {col.cell(row)}
                    </td>
                  ))}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
      {footer}
    </div>
  );
}