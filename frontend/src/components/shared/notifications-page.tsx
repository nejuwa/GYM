"use client";

import Link from "next/link";
import { Bell, CheckCheck, Megaphone, Trash2 } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { Alert } from "@/components/ui/alert";
import { Badge, StatusBadge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { PageLoader } from "@/components/ui/spinner";
import { useToast } from "@/components/ui/toast";
import { deleteNotification, getNotifications, markAllAsRead, markAsRead } from "@/lib/api/notifications";
import { useAuth } from "@/providers/auth-provider";
import { formatDate } from "@/lib/utils";
import type { Notification } from "@/types";

const typeLabels: Record<Notification["type"], string> = {
  MEMBERSHIP: "Membership",
  PAYMENT: "Payment",
  ATTENDANCE: "Attendance",
  SYSTEM: "System",
  ANNOUNCEMENT: "Announcement",
};

const typeVariants: Record<Notification["type"], "default" | "success" | "warning" | "info" | "secondary"> = {
  MEMBERSHIP: "info",
  PAYMENT: "success",
  ATTENDANCE: "warning",
  SYSTEM: "secondary",
  ANNOUNCEMENT: "default",
};

export function NotificationsPage() {
  const { user, loading: authLoading } = useAuth();
  const { toast } = useToast();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [markingAll, setMarkingAll] = useState(false);

  const loadNotifications = useCallback(async () => {
    setLoading(true);
    try {
      const response = await getNotifications();
      setNotifications(response.notifications);
      setUnreadCount(response.unreadCount);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load notifications");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!authLoading && user) {
      void Promise.resolve().then(loadNotifications);
    }
  }, [authLoading, user, loadNotifications]);

  const readNotification = async (notification: Notification) => {
    if (notification.isRead) return;
    setBusyId(notification.id);
    try {
      const response = await markAsRead(notification.id);
      setNotifications((current) => current.map((item) => item.id === notification.id ? response.notification : item));
      setUnreadCount((count) => Math.max(0, count - 1));
    } catch (err) {
      toast("error", "Could not mark notification as read", err instanceof Error ? err.message : "Please try again.");
    } finally {
      setBusyId(null);
    }
  };

  const markEverythingRead = async () => {
    if (!unreadCount) return;
    setMarkingAll(true);
    try {
      await markAllAsRead();
      setNotifications((current) => current.map((item) => ({ ...item, isRead: true })));
      setUnreadCount(0);
      toast("success", "Notifications marked as read");
    } catch (err) {
      toast("error", "Could not mark notifications as read", err instanceof Error ? err.message : "Please try again.");
    } finally {
      setMarkingAll(false);
    }
  };

  const removeNotification = async (notification: Notification) => {
    setBusyId(notification.id);
    try {
      await deleteNotification(notification.id);
      setNotifications((current) => current.filter((item) => item.id !== notification.id));
      if (!notification.isRead) setUnreadCount((count) => Math.max(0, count - 1));
      toast("success", "Notification deleted");
    } catch (err) {
      toast("error", "Could not delete notification", err instanceof Error ? err.message : "Please try again.");
    } finally {
      setBusyId(null);
    }
  };

  if (authLoading || loading) return <PageLoader label="Loading notifications..." />;

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Notifications</h1>
          <p className="mt-1 text-sm text-slate-500">
            {unreadCount ? `${unreadCount} unread notification${unreadCount === 1 ? "" : "s"}` : "You are all caught up."}
          </p>
        </div>
        <div className="flex gap-2">
          {user && ["OWNER", "MANAGER"].includes(user.role) && (
            <Link href="/notifications/send">
              <Button size="sm" leftIcon={<Megaphone className="h-4 w-4" />}>Send notification</Button>
            </Link>
          )}
          <Button variant="outline" size="sm" onClick={markEverythingRead} loading={markingAll} disabled={!unreadCount} leftIcon={<CheckCheck className="h-4 w-4" />}>
            Mark all read
          </Button>
        </div>
      </div>

      {error && <Alert variant="error" title="Could not load notifications">{error}</Alert>}

      {!error && !notifications.length && (
        <Card>
          <div className="flex flex-col items-center py-12 text-center">
            <Bell className="h-10 w-10 text-slate-300" />
            <h2 className="mt-4 font-semibold text-slate-900">No notifications</h2>
            <p className="mt-1 text-sm text-slate-500">New account, membership, payment, and announcement updates will appear here.</p>
          </div>
        </Card>
      )}

      <div className="space-y-3">
        {notifications.map((notification) => (
          <Card key={notification.id} className={notification.isRead ? "" : "border-primary/30 bg-primary-light/20"}>
            <div className="flex items-start gap-4">
              <div className="mt-1 rounded-full bg-white p-2 shadow-sm">
                <Bell className="h-4 w-4 text-primary" />
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <h2 className="font-semibold text-slate-900">{notification.title}</h2>
                  <Badge variant={typeVariants[notification.type]}>{typeLabels[notification.type]}</Badge>
                  {!notification.isRead && <StatusBadge status="PENDING" />}
                </div>
                <p className="mt-2 whitespace-pre-wrap text-sm text-slate-600">{notification.message}</p>
                <p className="mt-3 text-xs text-slate-500">{formatDate(notification.createdAt)}</p>
              </div>
              <div className="flex shrink-0 gap-1">
                {!notification.isRead && (
                  <Button size="xs" variant="outline" onClick={() => readNotification(notification)} loading={busyId === notification.id}>
                    Mark read
                  </Button>
                )}
                <Button size="xs" variant="ghost" onClick={() => removeNotification(notification)} loading={busyId === notification.id} aria-label="Delete notification">
                  <Trash2 className="h-4 w-4 text-slate-500" />
                </Button>
              </div>
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
}
