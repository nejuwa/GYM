import { apiFetch, buildQuery } from "./client";
import type { Membership, MembershipStatus, Payment, PaymentMethod } from "@/types";

export interface ListMembershipsParams {
  status?: MembershipStatus | "ALL";
  memberId?: string;
  search?: string;
}

export interface CreateMembershipRequest {
  memberId: string;
  packageId: string;
  startDate?: string | Date;
  pricePaid?: number;
  paymentMethod?: PaymentMethod;
  notes?: string;
  autoRenew?: boolean;
}

export function listMemberships(params: ListMembershipsParams = {}): Promise<{
  success: boolean;
  count: number;
  memberships: Membership[];
}> {
  return apiFetch(`/memberships${buildQuery(params as Record<string, unknown>)}`);
}

export function getMembershipById(id: string): Promise<{
  success: boolean;
  membership: Membership;
}> {
  return apiFetch(`/memberships/${id}`);
}

export function createMembership(body: CreateMembershipRequest): Promise<{
  success: boolean;
  message: string;
  membership: Membership;
  payment: Payment;
}> {
  return apiFetch("/memberships", { method: "POST", body });
}

export function renewMembership(
  id: string,
  body: {
    packageId?: string;
    pricePaid?: number;
    paymentMethod?: PaymentMethod;
    notes?: string;
  } = {}
): Promise<{
  success: boolean;
  message: string;
  membership: Membership;
  payment: Payment;
}> {
  return apiFetch(`/memberships/${id}/renew`, { method: "POST", body });
}

export function updateMembershipStatus(
  id: string,
  status: MembershipStatus,
  notes?: string
): Promise<{ success: boolean; message: string; membership: Membership }> {
  return apiFetch(`/memberships/${id}/status`, { method: "PATCH", body: { status, notes } });
}