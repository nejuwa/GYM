"use client";

import { cn } from "@/lib/utils";

export interface TabsProps {
  tabs: Array<{ value: string; label: React.ReactNode }>;
  value: string;
  onChange: (value: string) => void;
}

export function Tabs({ tabs, value, onChange }: TabsProps) {
  return (
    <div className="flex border-b border-border overflow-x-auto">
      {tabs.map((tab) => (
        <button
          key={tab.value}
          onClick={() => onChange(tab.value)}
          className={cn(
            "px-4 py-2.5 text-sm font-medium whitespace-nowrap transition-colors border-b-2 -mb-px focus:outline-none",
            value === tab.value
              ? "border-primary text-primary"
              : "border-transparent text-slate-500 hover:text-slate-800 hover:border-slate-300"
          )}
        >
          {tab.label}
        </button>
      ))}
    </div>
  );
}