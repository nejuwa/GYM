import { apiFetch, buildQuery } from "./client";
import type { AccountStatus, Role, User } from "@/types";

export interface RoleInfo {
  label: string;
  description: string;
  permissions: string[];
}

export interface RolesCatalog {
  OWNER: RoleInfo;
  MANAGER: RoleInfo;
  TRAINER: RoleInfo;
  MEMBER: RoleInfo;
}

export interface ListUsersParams {
  role?: Role | "ALL";
  status?: AccountStatus | "ALL";
  search?: string;
}

export function getRoles(): Promise<{ success: boolean; roles: RolesCatalog }> {
  return apiFetch("/users/roles/all");
}

export function listUsers(params: ListUsersParams = {}): Promise<{
  success: boolean;
  count: number;
  users: User[];
}> {
  return apiFetch(`/users${buildQuery(params as Record<string, unknown>)}`);
}

export function getUserById(id: string): Promise<{ success: boolean; user: User }> {
  return apiFetch(`/users/${id}`);
}

export function createUser(body: {
  email: string;
  username: string;
  password: string;
  fullName: string;
  role: Role;
  phone?: string;
  avatarUrl?: string;
}): Promise<{ success: boolean; message: string; user: User }> {
  return apiFetch("/users", { method: "POST", body });
}

export function updateUser(
  id: string,
  body: {
    fullName?: string;
    phone?: string | null;
    avatarUrl?: string | null;
    status?: AccountStatus;
    role?: Role;
    password?: string;
  }
): Promise<{ success: boolean; message: string; user: User }> {
  return apiFetch(`/users/${id}`, { method: "PATCH", body });
}

export function updateUserStatus(id: string, status: AccountStatus): Promise<{
  success: boolean;
  message: string;
  user: User;
}> {
  return apiFetch(`/users/${id}/status`, { method: "PATCH", body: { status } });
}

export function deleteUser(id: string): Promise<{ success: boolean; message: string }> {
  return apiFetch(`/users/${id}`, { method: "DELETE" });
}

export function resetUserPassword(id: string, newPassword: string): Promise<{
  success: boolean;
  message: string;
}> {
  return apiFetch(`/users/${id}/reset-password`, { method: "POST", body: { newPassword } });
}