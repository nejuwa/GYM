"use client";

import { useState } from "react";
import { CheckCircle2, KeyRound, LockKeyhole } from "lucide-react";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { useToast } from "@/components/ui/toast";
import { changePassword } from "@/lib/api/auth";

const PASSWORD_RE = /^(?=.*[A-Za-z])(?=.*\d).{6,}$/;

type PasswordFields = {
  currentPassword: string;
  newPassword: string;
  confirmPassword: string;
};

const emptyFields: PasswordFields = {
  currentPassword: "",
  newPassword: "",
  confirmPassword: "",
};

export function SettingsPasswordPage() {
  const { toast } = useToast();
  const [fields, setFields] = useState<PasswordFields>(emptyFields);
  const [errors, setErrors] = useState<Partial<Record<keyof PasswordFields, string>>>({});
  const [saving, setSaving] = useState(false);
  const [success, setSuccess] = useState(false);

  const setField = (key: keyof PasswordFields, value: string) => {
    setFields((current) => ({ ...current, [key]: value }));
    setErrors((current) => ({ ...current, [key]: undefined }));
    setSuccess(false);
  };

  const submit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const nextErrors: Partial<Record<keyof PasswordFields, string>> = {};

    if (!fields.currentPassword) nextErrors.currentPassword = "Enter your current password";
    if (!PASSWORD_RE.test(fields.newPassword)) {
      nextErrors.newPassword = "Use at least 6 characters with letters and numbers";
    }
    if (fields.newPassword !== fields.confirmPassword) {
      nextErrors.confirmPassword = "Passwords do not match";
    }

    setErrors(nextErrors);
    if (Object.keys(nextErrors).length > 0) {
      toast("error", "Check your password", "Please fix the highlighted fields.");
      return;
    }

    setSaving(true);
    setSuccess(false);
    try {
      const response = await changePassword({
        currentPassword: fields.currentPassword,
        newPassword: fields.newPassword,
      });
      setFields(emptyFields);
      setSuccess(true);
      toast("success", "Password updated", response.message);
    } catch (error) {
      toast("error", "Could not update password", error instanceof Error ? error.message : "Please try again.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Password settings</h1>
        <p className="mt-1 text-sm text-slate-500">Update the password used to sign in to your account.</p>
      </div>

      {success && (
        <Alert variant="success" title="Password updated">
          Your password has been changed successfully.
        </Alert>
      )}

      <Card title="Change password" subtitle="Choose a password you do not use anywhere else.">
        <form onSubmit={submit} noValidate className="max-w-xl space-y-5">
          <Input
            id="currentPassword"
            label="Current password"
            type="password"
            startIcon={<LockKeyhole className="h-4 w-4" />}
            value={fields.currentPassword}
            onChange={(event) => setField("currentPassword", event.target.value)}
            error={errors.currentPassword}
            autoComplete="current-password"
          />
          <Input
            id="newPassword"
            label="New password"
            type="password"
            startIcon={<KeyRound className="h-4 w-4" />}
            value={fields.newPassword}
            onChange={(event) => setField("newPassword", event.target.value)}
            error={errors.newPassword}
            hint="At least 6 characters with both letters and numbers."
            autoComplete="new-password"
          />
          <Input
            id="confirmPassword"
            label="Confirm new password"
            type="password"
            startIcon={<CheckCircle2 className="h-4 w-4" />}
            value={fields.confirmPassword}
            onChange={(event) => setField("confirmPassword", event.target.value)}
            error={errors.confirmPassword}
            autoComplete="new-password"
          />
          <div className="flex justify-end pt-2">
            <Button type="submit" loading={saving}>
              Update password
            </Button>
          </div>
        </form>
      </Card>
    </div>
  );
}
