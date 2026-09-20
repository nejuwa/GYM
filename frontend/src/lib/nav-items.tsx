import {
  LayoutDashboard,
  Users,
  Dumbbell,
  CalendarCheck,
  CreditCard,
  Wallet,
  Package,
  FileText,
  Bell,
  UserCog,
  ScrollText,
  Settings,
  ClipboardList,
} from "lucide-react";
import type { Role } from "@/types";

export interface NavItem {
  href: string;
  label: string;
  icon: React.ReactNode;
  roles: Role[];
}

export const navItems: NavItem[] = [
  { href: "/", label: "Dashboard", icon: <LayoutDashboard className="h-[18px] w-[18px]" />, roles: ["OWNER", "MANAGER", "TRAINER", "MEMBER"] },
  { href: "/members", label: "Members", icon: <Users className="h-[18px] w-[18px]" />, roles: ["OWNER", "MANAGER", "TRAINER"] },
  { href: "/packages", label: "Packages", icon: <Package className="h-[18px] w-[18px]" />, roles: ["OWNER", "MANAGER"] },
  { href: "/memberships", label: "Memberships", icon: <FileText className="h-[18px] w-[18px]" />, roles: ["OWNER", "MANAGER", "TRAINER", "MEMBER"] },
  { href: "/attendance", label: "Attendance", icon: <CalendarCheck className="h-[18px] w-[18px]" />, roles: ["OWNER", "MANAGER", "TRAINER", "MEMBER"] },
  { href: "/payments", label: "Payments", icon: <CreditCard className="h-[18px] w-[18px]" />, roles: ["OWNER", "MANAGER", "TRAINER", "MEMBER"] },
  { href: "/expenses", label: "Expenses", icon: <Wallet className="h-[18px] w-[18px]" />, roles: ["OWNER", "MANAGER"] },
  { href: "/trainers", label: "Trainers", icon: <Dumbbell className="h-[18px] w-[18px]" />, roles: ["OWNER", "MANAGER"] },
  { href: "/sessions", label: "Sessions", icon: <ClipboardList className="h-[18px] w-[18px]" />, roles: ["OWNER", "MANAGER", "TRAINER", "MEMBER"] },
  { href: "/reports", label: "Reports", icon: <FileText className="h-[18px] w-[18px]" />, roles: ["OWNER", "MANAGER"] },
  { href: "/users", label: "Users", icon: <UserCog className="h-[18px] w-[18px]" />, roles: ["OWNER", "MANAGER"] },
  { href: "/notifications", label: "Notifications", icon: <Bell className="h-[18px] w-[18px]" />, roles: ["OWNER", "MANAGER", "TRAINER", "MEMBER"] },
  { href: "/audit", label: "Audit Logs", icon: <ScrollText className="h-[18px] w-[18px]" />, roles: ["OWNER"] },
  { href: "/settings", label: "Settings", icon: <Settings className="h-[18px] w-[18px]" />, roles: ["OWNER", "MANAGER", "TRAINER", "MEMBER"] },
];

export function findCurrentPage(pathname: string, items: NavItem[]): NavItem {
  if (pathname === "/") return items[0];

  let best = items[0];
  for (const item of items) {
    if (item.href !== "/" && pathname.startsWith(item.href)) {
      if (item.href.length > best.href.length || best.href === "/") {
        best = item;
      }
    }
  }
  return best;
}