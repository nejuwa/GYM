"use client";

import { ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "./button";

export interface PaginationProps {
  page: number;
  pageSize: number;
  totalItems: number;
  onPageChange: (page: number) => void;
  onPageSizeChange?: (size: number) => void;
  pageSizeOptions?: number[];
}

export function Pagination({
  page,
  pageSize,
  totalItems,
  onPageChange,
  onPageSizeChange,
  pageSizeOptions = [10, 25, 50, 100],
}: PaginationProps) {
  const totalPages = Math.max(1, Math.ceil(totalItems / pageSize));

  const pageNumbers = () => {
    const pages: number[] = [];
    const start = Math.max(1, page - 2);
    const end = Math.min(totalPages, page + 2);
    for (let i = start; i <= end; i++) pages.push(i);
    return pages;
  };

  return (
    <div className="flex flex-wrap items-center justify-between gap-3 px-5 py-3 border-t border-border">
      <p className="text-xs text-slate-500">
        Showing{" "}
        <span className="font-medium text-slate-700">{totalItems === 0 ? 0 : (page - 1) * pageSize + 1}</span>{" "}
        to <span className="font-medium text-slate-700">{Math.min(page * pageSize, totalItems)}</span> of{" "}
        <span className="font-medium text-slate-700">{totalItems}</span>
      </p>

      <div className="flex items-center gap-1.5">
        {onPageSizeChange && (
          <select
            value={pageSize}
            onChange={(e) => onPageSizeChange(Number(e.target.value))}
            className="h-8 mr-2 rounded-md border border-border bg-white px-2 text-xs text-slate-600 focus:outline-none focus:ring-2 focus:ring-primary/30"
          >
            {pageSizeOptions.map((opt) => (
              <option key={opt} value={opt}>
                {opt} / page
              </option>
            ))}
          </select>
        )}
        <Button variant="outline" size="xs" disabled={page <= 1} onClick={() => onPageChange(1)} aria-label="First page">
          <ChevronsLeft className="h-3.5 w-3.5" />
        </Button>
        <Button variant="outline" size="xs" disabled={page <= 1} onClick={() => onPageChange(page - 1)} aria-label="Previous page">
          <ChevronLeft className="h-3.5 w-3.5" />
        </Button>

        {pageNumbers().map((p) => (
          <button
            key={p}
            onClick={() => onPageChange(p)}
            className={cn(
              "h-8 w-8 rounded-md text-xs font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-primary/30",
              p === page ? "bg-primary text-white" : "text-slate-600 hover:bg-slate-100 border border-border bg-white"
            )}
          >
            {p}
          </button>
        ))}

        <Button variant="outline" size="xs" disabled={page >= totalPages} onClick={() => onPageChange(page + 1)} aria-label="Next page">
          <ChevronRight className="h-3.5 w-3.5" />
        </Button>
        <Button variant="outline" size="xs" disabled={page >= totalPages} onClick={() => onPageChange(totalPages)} aria-label="Last page">
          <ChevronsRight className="h-3.5 w-3.5" />
        </Button>
      </div>
    </div>
  );
}