import { apiFetch } from "./client";
import type { Notification, NotificationType } from "@/types";

export function getNotifications(): Promise<{
  success: boolean;
  unreadCount: number;
  notifications: Notification[];
}> {
  return apiFetch("/notifications");
}

export function markAsRead(id: string): Promise<{
  success: boolean;
  notification: Notification;
}> {
  return apiFetch(`/notifications/${id}/read`, { method: "PATCH" });
}

export function markAllAsRead(): Promise<{ success: boolean; message: string }> {
  return apiFetch("/notifications/read-all", { method: "PATCH" });
}

export function deleteNotification(id: string): Promise<{ success: boolean; message: string }> {
  return apiFetch(`/notifications/${id}`, { method: "DELETE" });
}

export function sendNotification(body: {
  title: string;
  message: string;
  recipientId?: string;
  type?: NotificationType;
}): Promise<{ success: boolean; message: string; notification: Notification }> {
  return apiFetch("/notifications/send", { method: "POST", body });
}