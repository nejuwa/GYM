"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { Save, UserRound } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Alert } from "@/components/ui/alert";
import { PageLoader } from "@/components/ui/spinner";
import { useToast } from "@/components/ui/toast";
import { getMemberById, updateMember } from "@/lib/api/members";
import type { AccountStatus } from "@/types";
import { ProfileImageUploader } from "@/components/shared/profile-image-uploader";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

interface FormFields {
  fullName: string;
  gender: string;
  dateOfBirth: string;
  phone: string;
  email: string;
  address: string;
  emergencyContact: string;
  photo: string;
  status: AccountStatus;
}

type FieldErrors = Partial<Record<keyof FormFields, string>>;

export function MemberEditPage() {
  const params = useParams<{ id: string }>();
  const id = params.id;
  const router = useRouter();
  const { toast } = useToast();

  const [fields, setFields] = useState<FormFields | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [loaded, setLoaded] = useState(false);
  const [errors, setErrors] = useState<FieldErrors>({});
  const [serverError, setServerError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [imageFile, setImageFile] = useState<File | null>(null);

  useEffect(() => {
    getMemberById(id)
      .then((res) => {
        const m = res.member;
        setFields({
          fullName: m.fullName,
          gender: m.gender,
          dateOfBirth: m.dateOfBirth ? m.dateOfBirth.slice(0, 10) : "",
          phone: m.phone,
          email: m.email ?? "",
          address: m.address ?? "",
          emergencyContact: m.emergencyContact ?? "",
          photo: m.photo ?? "",
          status: m.status,
        });
        setImageFile(null);
      })
      .catch((e) => {
        setLoadError(e instanceof Error ? e.message : "Failed to load member");
      })
      .finally(() => setLoaded(true));
  }, [id]);

  if (!loaded) {
    return <PageLoader label="Loading member profile..." />;
  }

  if (loadError || !fields) {
    return (
      <div className="max-w-2xl mx-auto">
        <Alert variant="error" title="Unable to load member">
          {loadError ?? "Member record not found."}
        </Alert>
        <div className="mt-4 text-center">
          <Button variant="outline" onClick={() => router.push("/members")}>
            Back to Members
          </Button>
        </div>
      </div>
    );
  }

  const setField = (key: keyof FormFields, value: string) => {
    setFields((f) => (f ? { ...f, [key]: value } : f));
    setErrors((e) => ({ ...e, [key]: undefined }));
    setServerError(null);
  };

  const validate = (): boolean => {
    const next: FieldErrors = {};
    if (!fields.fullName.trim()) next.fullName = "Full name is required";
    if (!fields.gender.trim()) next.gender = "Select a gender";
    if (!fields.phone.trim()) next.phone = "Phone number is required";
    else if (fields.phone.trim().replace(/\D/g, "").length < 9) next.phone = "Enter a valid phone number";
    if (fields.email.trim() && !EMAIL_RE.test(fields.email.trim())) next.email = "Enter a valid email address";
    if (fields.dateOfBirth) {
      const dob = new Date(fields.dateOfBirth);
      if (isNaN(dob.getTime())) next.dateOfBirth = "Invalid date";
      else if (dob > new Date()) next.dateOfBirth = "Date of birth cannot be in the future";
    }
    setErrors(next);
    return Object.keys(next).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setServerError(null);
    if (!validate()) {
      toast("error", "Check the form", "Please fix the highlighted fields.");
      return;
    }

    setSaving(true);
    try {
      await updateMember(id, {
        fullName: fields.fullName.trim(),
        gender: fields.gender,
        dateOfBirth: fields.dateOfBirth ? new Date(fields.dateOfBirth).toISOString() : null,
        phone: fields.phone.trim(),
        email: fields.email.trim() || null,
        address: fields.address.trim() || null,
        emergencyContact: fields.emergencyContact.trim() || null,
        photo: fields.photo.trim() || null,
        imageFile,
        status: fields.status,
      });
      toast("success", "Member updated", "The member profile has been saved.");
      router.push(`/members/${id}`);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to update member";
      setServerError(message);
      toast("error", "Update failed", message);
    } finally {
      setSaving(false);
    }
  };

  const genderOptions = [
    ...(fields.gender ? [{ value: fields.gender, label: fields.gender }] : []),
    ...["MALE", "FEMALE"]
      .filter((g) => g !== fields.gender)
      .map((g) => ({ value: g, label: g })),
  ];

  return (
    <form onSubmit={handleSubmit} noValidate className="space-y-6 max-w-3xl">
      {serverError && (
        <Alert variant="error" title="Unable to update member">
          {serverError}
        </Alert>
      )}

      <Card title="Personal Information" subtitle="Update the member&apos;s profile details.">
        <div className="grid gap-5 sm:grid-cols-2">
          <div className="sm:col-span-2">
            <Input
              id="fullName"
              label="Full name *"
              startIcon={<UserRound className="h-4 w-4" />}
              value={fields.fullName}
              onChange={(e) => setField("fullName", e.target.value)}
              error={errors.fullName}
            />
          </div>
          <Select
            id="gender"
            label="Gender *"
            value={fields.gender}
            onChange={(e) => setField("gender", e.target.value)}
            options={genderOptions}
            error={errors.gender}
          />
          <Input
            id="dateOfBirth"
            label="Date of birth"
            type="date"
            max={new Date().toISOString().split("T")[0]}
            value={fields.dateOfBirth}
            onChange={(e) => setField("dateOfBirth", e.target.value)}
            error={errors.dateOfBirth}
          />
          <Input
            id="phone"
            label="Phone *"
            value={fields.phone}
            onChange={(e) => setField("phone", e.target.value)}
            error={errors.phone}
          />
          <Input
            id="email"
            label="Email"
            type="email"
            value={fields.email}
            onChange={(e) => setField("email", e.target.value)}
            error={errors.email}
          />
          <Input
            id="address"
            label="Address"
            value={fields.address}
            onChange={(e) => setField("address", e.target.value)}
          />
          <Input
            id="emergencyContact"
            label="Emergency contact"
            value={fields.emergencyContact}
            onChange={(e) => setField("emergencyContact", e.target.value)}
          />
        </div>
      </Card>

      <Card title="Account & Profile Image">
        <div className="grid gap-5 sm:grid-cols-2">
          <Select
            id="status"
            label="Member status"
            value={fields.status}
            onChange={(e) => setField("status", e.target.value as AccountStatus)}
            options={[
              { value: "ACTIVE", label: "Active" },
              { value: "SUSPENDED", label: "Suspended" },
              { value: "DEACTIVATED", label: "Deactivated" },
            ]}
          />
          <ProfileImageUploader
            url={fields.photo}
            file={imageFile}
            onUrlChange={(photo) => setField("photo", photo)}
            onFileChange={setImageFile}
            onError={(message) => toast("error", "Invalid profile image", message)}
            disabled={saving}
            label="Profile image"
          />
        </div>
      </Card>

      <div className="flex items-center justify-end gap-3">
        <Button type="button" variant="ghost" onClick={() => router.push(`/members/${id}`)} disabled={saving}>
          Cancel
        </Button>
        <Button type="submit" loading={saving}>
          <Save className="h-4 w-4" /> Save Changes
        </Button>
      </div>
    </form>
  );
}