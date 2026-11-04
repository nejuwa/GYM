"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useSyncExternalStore } from "react";

export type ThemeMode = "light" | "dark" | "system";

interface ThemeContextValue {
  theme: ThemeMode;
  setTheme: (theme: ThemeMode) => void;
}

const STORAGE_KEY = "gymmis_theme";
const CHANGE_EVENT = "gymmis-theme-change";
const ThemeContext = createContext<ThemeContextValue | null>(null);

function isThemeMode(value: string | null): value is ThemeMode {
  return value === "light" || value === "dark" || value === "system";
}

function subscribeTheme(onChange: () => void) {
  window.addEventListener("storage", onChange);
  window.addEventListener(CHANGE_EVENT, onChange);
  return () => {
    window.removeEventListener("storage", onChange);
    window.removeEventListener(CHANGE_EVENT, onChange);
  };
}

function getThemeSnapshot(): ThemeMode {
  const storedTheme = localStorage.getItem(STORAGE_KEY);
  return isThemeMode(storedTheme) ? storedTheme : "system";
}

function getServerThemeSnapshot(): ThemeMode {
  return "system";
}

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const theme = useSyncExternalStore(subscribeTheme, getThemeSnapshot, getServerThemeSnapshot);

  useEffect(() => {
    const root = document.documentElement;
    root.dataset.theme = theme;
    root.classList.toggle(
      "dark",
      theme === "dark"
        || (theme === "system" && window.matchMedia("(prefers-color-scheme: dark)").matches),
    );

    if (theme !== "system") return;
    const media = window.matchMedia("(prefers-color-scheme: dark)");
    const updateSystemTheme = (event: MediaQueryListEvent) => {
      root.classList.toggle("dark", event.matches);
    };
    media.addEventListener("change", updateSystemTheme);
    return () => media.removeEventListener("change", updateSystemTheme);
  }, [theme]);

  const setTheme = useCallback((nextTheme: ThemeMode) => {
    localStorage.setItem(STORAGE_KEY, nextTheme);
    window.dispatchEvent(new Event(CHANGE_EVENT));
  }, []);
  const value = useMemo(() => ({ theme, setTheme }), [theme, setTheme]);

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme() {
  const context = useContext(ThemeContext);
  if (!context) throw new Error("useTheme must be used within ThemeProvider");
  return context;
}
