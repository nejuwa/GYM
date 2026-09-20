"use client";

import { useEffect, useState } from "react";
import { ArrowLeft, Send } from "lucide-react";
import { useRouter } from "next/navigation";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { useToast } from "@/components/ui/toast";
import { sendNotification } from "@/lib/api/notifications";
import { listUsers } from "@/lib/api/users";
import { useAuth } from "@/providers/auth-provider";
import type { NotificationType, User } from "@/types";

const typeOptions: Array<{ value: NotificationType; label: string }> = [
  { value: "ANNOUNCEMENT", label: "Announcement" },
  { value: "SYSTEM", label: "System" },
  { value: "MEMBERSHIP", label: "Membership" },
  { value: "PAYMENT", label: "Payment" },
  { value: "ATTENDANCE", label: "Attendance" },
];

export function NotificationSendPage() {
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();
  const { toast } = useToast();
  const [users, setUsers] = useState<User[]>([]);
  const [recipientId, setRecipientId] = useState("");
  const [type, setType] = useState<NotificationType>("ANNOUNCEMENT");
  const [title, setTitle] = useState("");
  const [message, setMessage] = useState("");
  const [loadingUsers, setLoadingUsers] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (authLoading || !user || !["OWNER", "MANAGER"].includes(user.role)) return;
    listUsers()
      .then((response) => setUsers(response.users))
      .catch((err) => setError(err instanceof Error ? err.message : "Failed to load recipients"))
      .finally(() => setLoadingUsers(false));
  }, [authLoading, user]);

  const submit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!title.trim() || !message.trim()) {
      setError("Title and message are required.");
      return;
    }
    setError(null);
    setSaving(true);
    try {
      await sendNotification({
        title: title.trim(),
        message: message.trim(),
        type,
        recipientId: recipientId || undefined,
      });
      toast("success", "Notification sent", recipientId ? "The selected user will receive it." : "The notification was broadcast to all users.");
      router.push("/notifications");
    } catch (err) {
      toast("error", "Could not send notification", err instanceof Error ? err.message : "Please try again.");
    } finally {
      setSaving(false);
    }
  };

  if (!authLoading && (!user || !["OWNER", "MANAGER"].includes(user.role))) {
    return <Alert variant="error" title="Access denied">Only owners and managers can send notifications.</Alert>;
  }

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Send notification</h1>
          <p className="mt-1 text-sm text-slate-500">Send a targeted notification or broadcast an announcement.</p>
        </div>
        <Button variant="outline" size="sm" onClick={() => router.push("/notifications")} leftIcon={<ArrowLeft className="h-4 w-4" />}>Back</Button>
      </div>

      <Card>
        <form onSubmit={submit} className="space-y-5" noValidate>
          {error && <Alert variant="error" title="Unable to send notification">{error}</Alert>}
          <Select
            label="Recipient"
            value={recipientId}
            onChange={(event) => setRecipientId(event.target.value)}
            options={users.map((item) => ({ value: item.id, label: `${item.fullName} (${item.role})` }))}
            placeholder={loadingUsers ? "Loading users..." : "All users (broadcast)"}
            disabled={loadingUsers}
            hint="Leave this empty to send a global broadcast."
          />
          <Select label="Type" value={type} onChange={(event) => setType(event.target.value as NotificationType)} options={typeOptions} />
          <Input label="Title" value={title} onChange={(event) => setTitle(event.target.value)} placeholder="Membership renewal reminder" />
          <div className="space-y-1.5">
            <label htmlFor="notification-message" className="block text-sm font-medium text-slate-700">Message</label>
            <textarea
              id="notification-message"
              value={message}
              onChange={(event) => setMessage(event.target.value)}
              placeholder="Write the notification message..."
              rows={6}
              className="w-full rounded-lg border border-input bg-white px-3 py-2 text-sm text-foreground placeholder:text-slate-400 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/30"
            />
          </div>
          <div className="flex justify-end">
            <Button type="submit" loading={saving} leftIcon={<Send className="h-4 w-4" />}>Send notification</Button>
          </div>
        </form>
      </Card>
    </div>
  );
}
