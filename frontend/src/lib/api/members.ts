import { apiFetch, buildQuery, toMultipartFormData } from "./client";
import type { AccountStatus, Member, MembershipStatus } from "@/types";

export interface ListMembersParams {
  status?: AccountStatus | "ALL";
  search?: string;
  membershipStatus?: MembershipStatus | "ALL";
}

export function listMembers(params: ListMembersParams = {}): Promise<{
  success: boolean;
  count: number;
  members: Member[];
}> {
  return apiFetch(`/members${buildQuery(params as Record<string, unknown>)}`);
}

export function getMemberById(id: string): Promise<{ success: boolean; member: Member }> {
  return apiFetch(`/members/${id}`);
}

export function getMemberQR(id: string): Promise<{
  success: boolean;
  member: {
    id: string;
    memberCode: string;
    fullName: string;
    status: AccountStatus;
    activeMembership?: { id: string; package?: { name: string } | null; endDate: string } | null;
  };
  qrCodeData: string;
  qrImage: string;
}> {
  return apiFetch(`/members/${id}/qr`);
}

export function createMember(body: {
  fullName: string;
  gender: string;
  phone: string;
  password: string;
  dateOfBirth?: string | Date;
  email?: string;
  address?: string;
  photo?: string;
  imageFile?: File | null;
  emergencyContact?: string;
  username?: string;
  initialPackageId?: string;
}): Promise<{
  success: boolean;
  message: string;
  member: Member;
  user: { id: string; username: string; email: string; role: string };
}> {
  const { imageFile, ...fields } = body;
  return apiFetch("/members", {
    method: "POST",
    body: imageFile ? toMultipartFormData(fields, imageFile) : fields,
  });
}

export function updateMember(
  id: string,
  body: {
    fullName?: string;
    gender?: string;
    dateOfBirth?: string | Date | null;
    phone?: string;
    email?: string | null;
    address?: string | null;
    photo?: string | null;
    emergencyContact?: string | null;
    status?: AccountStatus;
    imageFile?: File | null;
  }
): Promise<{ success: boolean; message: string; member: Member }> {
  const { imageFile, ...fields } = body;
  return apiFetch(`/members/${id}`, {
    method: "PATCH",
    body: imageFile ? toMultipartFormData(fields, imageFile) : fields,
  });
}