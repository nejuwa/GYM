"use client";

import { usePathname, useRouter } from "next/navigation";
import { Alert } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Tabs } from "@/components/ui/tabs";

type SettingsTab = {
  value: string;
  label: string;
  href?: string;
  status: "available" | "planned";
  description: string;
};

const settingsTabs: SettingsTab[] = [
  {
    value: "profile",
    label: "Profile",
    href: "/settings/profile",
    status: "available",
    description: "Manage your authenticated account profile.",
  },
  {
    value: "security",
    label: "Security",
    href: "/settings/password",
    status: "available",
    description: "Change your current account password.",
  },
  {
    value: "business",
    label: "Business profile",
    status: "planned",
    description: "Organization details and operating hours require backend settings endpoints.",
  },
  {
    value: "notifications",
    label: "Notifications",
    status: "planned",
    description: "Email, SMS, automation, and webhook configuration require backend settings endpoints.",
  },
  {
    value: "roles",
    label: "Roles & permissions",
    status: "planned",
    description: "Role metadata is currently read-only; role mutation endpoints are not available.",
  },
  {
    value: "system",
    label: "System",
    status: "planned",
    description: "Health is available; backup and maintenance controls require backend endpoints.",
  },
];

export function SettingsShell() {
  const pathname = usePathname();
  const router = useRouter();
  const activeTab = settingsTabs.find((tab) => tab.href === pathname)?.value ?? "profile";

  const tabs = settingsTabs.map((tab) => ({
    value: tab.value,
    label: (
      <span className="inline-flex items-center gap-2">
        {tab.label}
        {tab.status === "planned" && <Badge variant="neutral">Unavailable</Badge>}
      </span>
    ),
  }));

  const selectTab = (value: string) => {
    const tab = settingsTabs.find((item) => item.value === value);
    if (tab?.href) router.push(tab.href);
  };

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Settings & configuration</h1>
        <p className="mt-1 text-sm text-slate-500">
          Manage supported account settings while keeping unavailable controls aligned with the backend API.
        </p>
      </div>

      <div className="rounded-xl border border-border bg-white p-2 shadow-sm">
        <Tabs tabs={tabs} value={activeTab} onChange={selectTab} />
      </div>

      <Alert variant="info" title="Backend-aligned settings">
        Only tabs with implemented backend endpoints are enabled. Unsupported organization, integration,
        backup, and maintenance settings will be added when their backend contracts are available.
      </Alert>
    </div>
  );
}
