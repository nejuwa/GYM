import { apiFetch, buildQuery, toMultipartFormData } from "./client";
import type { AccountStatus, Trainer } from "@/types";

export function listTrainers(params: { status?: AccountStatus | "ALL"; search?: string } = {}): Promise<{
  success: boolean;
  count: number;
  trainers: Trainer[];
}> {
  return apiFetch(`/trainers${buildQuery(params as Record<string, unknown>)}`);
}

export function getTrainerById(id: string): Promise<{ success: boolean; trainer: Trainer }> {
  return apiFetch(`/trainers/${id}`);
}

export function createTrainer(body: {
  fullName: string;
  phone: string;
  email: string;
  specialization: string;
  password: string;
  bio?: string;
  photo?: string | null;
  imageFile?: File | null;
}): Promise<{ success: boolean; message: string; trainer: Trainer }> {
  const { imageFile, ...fields } = body;
  return apiFetch("/trainers", {
    method: "POST",
    body: imageFile ? toMultipartFormData(fields, imageFile) : fields,
  });
}

export function updateTrainer(
  id: string,
  body: Partial<{
    fullName: string;
    phone: string;
    email: string;
    specialization: string;
    bio: string;
    photo: string | null;
    status: AccountStatus;
    imageFile?: File | null;
  }>
): Promise<{ success: boolean; message: string; trainer: Trainer }> {
  const { imageFile, ...fields } = body;
  return apiFetch(`/trainers/${id}`, {
    method: "PATCH",
    body: imageFile ? toMultipartFormData(fields, imageFile) : fields,
  });
}

export function assignMemberToTrainer(trainerId: string, memberId: string): Promise<{
  success: boolean;
  message: string;
  assignment: {
    id: string;
    trainerId: string;
    memberId: string;
    assignedDate: string;
    status: AccountStatus;
    trainer: Trainer;
    member: {
      id: string;
      fullName: string;
      memberCode: string;
      phone: string;
      email?: string | null;
      gender: string;
      photo?: string | null;
    };
  };
}> {
  return apiFetch("/trainers/assign-member", { method: "POST", body: { trainerId, memberId } });
}