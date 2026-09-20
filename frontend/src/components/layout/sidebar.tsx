"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { LogOut, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { Logo } from "@/components/ui/logo";
import { Avatar } from "@/components/ui/avatar";
import { useAuth } from "@/providers/auth-provider";
import { navItems, findCurrentPage } from "@/lib/nav-items";

export function Sidebar({ open, onClose }: { open: boolean; onClose: () => void }) {
  const pathname = usePathname();
  const { user, logout } = useAuth();

  const role = user?.role ?? "MEMBER";
  const items = navItems.filter((n) => n.roles.includes(role));
  const activeItem = findCurrentPage(pathname, items);

  return (
    <>
      {open && <div className="fixed inset-0 z-40 bg-slate-900/50 lg:hidden" onClick={onClose} />}
      <aside
        className={cn(
          "fixed lg:sticky top-0 h-screen w-64 shrink-0 bg-[#0F172A] text-slate-300 flex flex-col z-50 transition-transform lg:translate-x-0",
          open ? "translate-x-0" : "-translate-x-full"
        )}
      >
        <div className="flex items-center justify-between px-5 py-5 border-b border-white/10">
          <Link href="/" onClick={onClose}>
            <Logo size="sm" variant="light" />
          </Link>
          <button className="lg:hidden text-slate-400 hover:text-white" onClick={onClose} aria-label="Close menu">
            <X className="h-5 w-5" />
          </button>
        </div>

        <nav className="flex-1 overflow-y-auto py-4 px-3 space-y-1">
          {items.map((item) => {
            const active = activeItem?.href === item.href;
            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={onClose}
                className={cn(
                  "flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
                  active ? "bg-[#E50914] text-white" : "text-slate-400 hover:text-white hover:bg-white/5"
                )}
              >
                {item.icon}
                {item.label}
              </Link>
            );
          })}
        </nav>

        <div className="border-t border-white/10 p-3">
          <div className="flex items-center gap-3 rounded-lg px-2 py-2">
            <Avatar name={user?.fullName ?? "User"} size="sm" />
            <div className="min-w-0 flex-1">
              <p className="text-sm font-medium text-white truncate">{user?.fullName}</p>
              <p className="text-xs text-slate-500">{role.charAt(0) + role.slice(1).toLowerCase()}</p>
            </div>
            <button
              onClick={logout}
              className="text-slate-400 hover:text-red-400 hover:bg-white/5 rounded-lg p-1.5 transition-colors focus:outline-none"
              aria-label="Logout"
            >
              <LogOut className="h-4 w-4" />
            </button>
          </div>
        </div>
      </aside>
    </>
  );
}