import { apiFetch, buildQuery } from "./client";
import type { AccountStatus, Package } from "@/types";

export function listPackages(params: { status?: AccountStatus | "ALL" } = {}): Promise<{
  success: boolean;
  count: number;
  packages: Package[];
}> {
  return apiFetch(`/packages${buildQuery(params as Record<string, unknown>)}`);
}

export function getPackageById(id: string): Promise<{ success: boolean; package: Package }> {
  return apiFetch(`/packages/${id}`);
}

export function createPackage(body: {
  name: string;
  durationDays: number;
  price: number;
  description?: string;
  features?: string[] | string;
  status?: AccountStatus;
}): Promise<{ success: boolean; message: string; package: Package }> {
  return apiFetch("/packages", { method: "POST", body });
}

export function updatePackage(
  id: string,
  body: Partial<{
    name: string;
    durationDays: number;
    price: number;
    description?: string;
    features?: string[] | string;
    status?: AccountStatus;
  }>
): Promise<{ success: boolean; message: string; package: Package }> {
  return apiFetch(`/packages/${id}`, { method: "PATCH", body });
}