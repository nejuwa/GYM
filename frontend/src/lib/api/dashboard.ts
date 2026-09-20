import { apiFetch } from "./client";
import type { DashboardResponseData } from "@/types";

export function getDashboard(): Promise<{
  success: boolean;
  data: DashboardResponseData;
  source: "db" | "cache";
}> {
  return apiFetch("/dashboard");
}