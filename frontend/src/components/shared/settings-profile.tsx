"use client";

import { useEffect, useState } from "react";
import { Alert } from "@/components/ui/alert";
import { Avatar } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { PageLoader } from "@/components/ui/spinner";
import { useToast } from "@/components/ui/toast";
import { getMe, updateMe } from "@/lib/api/auth";
import { useAuth } from "@/providers/auth-provider";
import { ProfileImageUploader } from "@/components/shared/profile-image-uploader";
import type { AuthUser } from "@/types";

type ProfileForm = {
  fullName: string;
  phone: string;
  avatarUrl: string;
};

const emptyForm: ProfileForm = {
  fullName: "",
  phone: "",
  avatarUrl: "",
};

export function SettingsProfilePage() {
  const { refreshUser } = useAuth();
  const { toast } = useToast();
  const [profile, setProfile] = useState<AuthUser | null>(null);
  const [form, setForm] = useState<ProfileForm>(emptyForm);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [formError, setFormError] = useState<string | null>(null);
  const [imageFile, setImageFile] = useState<File | null>(null);

  useEffect(() => {
    let active = true;
    getMe()
      .then((response) => {
        if (!active) return;
        setProfile(response.user);
        setForm({
          fullName: response.user.fullName,
          phone: response.user.phone ?? "",
          avatarUrl: response.user.avatarUrl ?? "",
        });
        setImageFile(null);
      })
      .catch((err) => {
        if (!active) return;
        setError(err instanceof Error ? err.message : "Failed to load profile");
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
  }, []);

  const saveProfile = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const fullName = form.fullName.trim();
    if (!fullName) {
      setFormError("Full name is required.");
      return;
    }

    setFormError(null);
    setSaving(true);
    try {
      const response = await updateMe({
        fullName,
        phone: form.phone.trim() || null,
        avatarUrl: form.avatarUrl.trim() || null,
        imageFile,
      });
      setProfile(response.user);
      setForm({
        fullName: response.user.fullName,
        phone: response.user.phone ?? "",
        avatarUrl: response.user.avatarUrl ?? "",
      });
      setImageFile(null);
      await refreshUser();
      toast("success", "Profile updated", response.message);
    } catch (err) {
      toast("error", "Could not update profile", err instanceof Error ? err.message : "Please try again.");
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <PageLoader label="Loading profile settings..." />;

  if (error || !profile) {
    return (
      <Alert variant="error" title="Profile unavailable">
        {error ?? "Your profile could not be loaded."}
      </Alert>
    );
  }

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Profile settings</h1>
        <p className="mt-1 text-sm text-slate-500">Update the personal details used across your gym account.</p>
      </div>

      <div className="grid gap-6 lg:grid-cols-[0.75fr_1.25fr]">
        <Card title="Account summary" subtitle="Read-only account identity">
          <div className="flex flex-col items-center text-center">
            <Avatar name={profile.fullName} src={profile.avatarUrl ?? undefined} size="lg" />
            <h2 className="mt-4 text-lg font-semibold text-slate-900">{profile.fullName}</h2>
            <p className="mt-1 text-sm text-slate-500">{profile.email}</p>
            <div className="mt-3 flex flex-wrap justify-center gap-2">
              <Badge variant="info">{profile.role}</Badge>
              {profile.status && <Badge variant="success">{profile.status}</Badge>}
            </div>
            <p className="mt-4 text-xs text-slate-500">Username: {profile.username}</p>
          </div>
        </Card>

        <Card title="Personal details" subtitle="Changes are saved to your authenticated profile">
          <form onSubmit={saveProfile} className="space-y-5" noValidate>
            <Input
              label="Full name"
              value={form.fullName}
              onChange={(event) => setForm((current) => ({ ...current, fullName: event.target.value }))}
              error={formError ?? undefined}
              autoComplete="name"
            />
            <Input label="Email" value={profile.email} disabled hint="Email changes are not supported by the current backend API." />
            <Input
              label="Phone"
              value={form.phone}
              onChange={(event) => setForm((current) => ({ ...current, phone: event.target.value }))}
              placeholder="+251..."
              autoComplete="tel"
            />
            <ProfileImageUploader
              url={form.avatarUrl}
              file={imageFile}
              onUrlChange={(avatarUrl) => setForm((current) => ({ ...current, avatarUrl }))}
              onFileChange={setImageFile}
              onError={(message) => toast("error", "Invalid profile image", message)}
              disabled={saving}
              label="Profile image"
            />
            <div className="flex justify-end">
              <Button type="submit" loading={saving}>
                Save profile
              </Button>
            </div>
          </form>
        </Card>
      </div>
    </div>
  );
}
