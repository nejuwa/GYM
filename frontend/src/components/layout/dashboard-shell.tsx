"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Sidebar } from "./sidebar";
import { Navbar } from "./navbar";
import { useAuth } from "@/providers/auth-provider";
import { PageLoader } from "@/components/ui/spinner";
import { RagAssistant } from "@/components/rag/rag-assistant";

export function DashboardShell({ children }: { children: React.ReactNode }) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [assistantOpen, setAssistantOpen] = useState(false);
  const [assistantUnread, setAssistantUnread] = useState(false);
  const { user, loading } = useAuth();
  const router = useRouter();
  const openAssistant = useCallback(() => {
    setAssistantUnread(false);
    setAssistantOpen(true);
  }, []);
  const closeAssistant = useCallback(() => setAssistantOpen(false), []);
  const updateAssistantUnread = useCallback((unread: boolean) => {
    setAssistantUnread(unread);
  }, []);

  useEffect(() => {
    if (!loading && !user) {
      router.replace("/login");
    }
  }, [loading, user, router]);

  if (loading || !user) {
    return <PageLoader label="Loading your dashboard..." />;
  }

  return (
    <div className="flex min-h-screen bg-[#F8FAFC]">
      <Sidebar open={sidebarOpen} onClose={() => setSidebarOpen(false)} />
      <div className="flex-1 flex flex-col min-w-0">
        <Navbar
          onMenuClick={() => setSidebarOpen(true)}
          onAiClick={openAssistant}
          assistantUnread={assistantUnread}
        />
        <RagAssistant
          open={assistantOpen}
          onClose={closeAssistant}
          onUnreadChange={updateAssistantUnread}
        />
        <main className="flex-1 p-4 sm:p-6 lg:p-8 max-w-[1600px] w-full mx-auto">{children}</main>
      </div>
    </div>
  );
}