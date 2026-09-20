import { apiFetch, toMultipartFormData } from "./client";
import type { AuthUser, LoginResponse, RefreshResponse } from "@/types";

export function login(
  usernameOrEmail: string,
  password: string
): Promise<LoginResponse> {
  return apiFetch("/auth/login", {
    method: "POST",
    body: { usernameOrEmail, password },
  });
}

export function refreshToken(
  refreshToken: string
): Promise<RefreshResponse> {
  return apiFetch("/auth/refresh", {
    method: "POST",
    body: { refreshToken },
  });
}

export function logout(): Promise<{ success: boolean; message: string }> {
  return apiFetch("/auth/logout", { method: "POST" });
}

export function getMe(): Promise<{ success: boolean; user: AuthUser }> {
  return apiFetch("/auth/me");
}

export function updateMe(body: {
  fullName?: string;
  phone?: string | null;
  avatarUrl?: string | null;
  photo?: string | null;
  imageFile?: File | null;
}): Promise<{ success: boolean; message: string; user: AuthUser }> {
  const { imageFile, ...fields } = body;
  return apiFetch("/auth/me", {
    method: "PATCH",
    body: imageFile ? toMultipartFormData(fields, imageFile) : fields,
  });
}

export function changePassword(body: {
  currentPassword: string;
  newPassword: string;
}): Promise<{ success: boolean; message: string }> {
  return apiFetch("/auth/change-password", { method: "PATCH", body });
}