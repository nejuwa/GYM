"use client";

import { useEffect, useRef, useState } from "react";
import { Monitor, Moon, Sun, SunMoon } from "lucide-react";
import { useTheme, type ThemeMode } from "@/providers/theme-provider";

const options: { value: ThemeMode; label: string; icon: typeof Sun }[] = [
  { value: "light", label: "Light", icon: Sun },
  { value: "dark", label: "Dark", icon: Moon },
  { value: "system", label: "System", icon: Monitor },
];

export function ThemeSwitcher() {
  const { theme, setTheme } = useTheme();
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    const handlePointerDown = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setOpen(false);
      }
    };
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape" && open) {
        setOpen(false);
        triggerRef.current?.focus();
      }
    };
    document.addEventListener("mousedown", handlePointerDown);
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("mousedown", handlePointerDown);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [open]);

  const ActiveIcon = theme === "light" ? Sun : theme === "dark" ? Moon : SunMoon;

  return (
    <div ref={containerRef} className="relative">
      <button
        ref={triggerRef}
        type="button"
        aria-label={`Theme: ${theme}`}
        aria-haspopup="menu"
        aria-expanded={open}
        title="Change theme"
        onClick={() => setOpen((current) => !current)}
        className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg text-slate-500 transition-colors hover:bg-slate-100 hover:text-slate-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
      >
        <ActiveIcon className="h-5 w-5" aria-hidden="true" />
      </button>

      {open && (
        <div
          role="menu"
          aria-label="Choose color theme"
          className="absolute right-0 z-50 mt-2 w-40 rounded-xl border border-border bg-white py-1.5 shadow-lg"
        >
          {options.map(({ value, label, icon: Icon }) => (
            <button
              key={value}
              type="button"
              role="menuitemradio"
              aria-checked={theme === value}
              onClick={() => {
                setTheme(value);
                setOpen(false);
              }}
              className="flex w-full items-center gap-2.5 px-3 py-2 text-sm text-slate-700 transition-colors hover:bg-slate-50 focus-visible:bg-slate-50 focus-visible:outline-none"
            >
              <Icon className="h-4 w-4 text-slate-500" aria-hidden="true" />
              <span>{label}</span>
              {theme === value && (
                <span className="ml-auto text-xs font-medium text-primary" aria-hidden="true">✓</span>
              )}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
