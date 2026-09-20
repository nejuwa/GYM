"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { UserPlus, CheckCircle2, ArrowRight, UserRound, KeyRound, Package2 } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Alert } from "@/components/ui/alert";
import { Badge, StatusBadge } from "@/components/ui/badge";
import { useToast } from "@/components/ui/toast";
import { listPackages } from "@/lib/api/packages";
import { createMember } from "@/lib/api/members";
import { useAuth } from "@/providers/auth-provider";
import type { Member, Package } from "@/types";
import { formatCurrency } from "@/lib/utils";
import { ProfileImageUploader } from "@/components/shared/profile-image-uploader";

const PASSWORD_RE = /^(?=.*[A-Za-z])(?=.*\d).{6,}$/;
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

interface FormFields {
  fullName: string;
  gender: string;
  dateOfBirth: string;
  phone: string;
  email: string;
  address: string;
  emergencyContact: string;
  username: string;
  password: string;
  packageId: string;
}

type FieldErrors = Partial<Record<keyof FormFields, string>>;

const initialFields: FormFields = {
  fullName: "",
  gender: "",
  dateOfBirth: "",
  phone: "",
  email: "",
  address: "",
  emergencyContact: "",
  username: "",
  password: "",
  packageId: "",
};

export function MemberNewPage() {
  const { user } = useAuth();
  const router = useRouter();
  const { toast } = useToast();

  const [fields, setFields] = useState<FormFields>(initialFields);
  const [errors, setErrors] = useState<FieldErrors>({});
  const [packages, setPackages] = useState<Package[]>([]);
  const [packagesLoading, setPackagesLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [serverError, setServerError] = useState<string | null>(null);
  const [created, setCreated] = useState<Member | null>(null);
  const [photoUrl, setPhotoUrl] = useState("");
  const [imageFile, setImageFile] = useState<File | null>(null);

  useEffect(() => {
    listPackages({ status: "ACTIVE" })
      .then((res) => {
        setPackages(res.packages);
        setFields((f) => (f.packageId ? f : { ...f, packageId: res.packages[0]?.id ?? "" }));
      })
      .catch(() => {
        setServerError("Could not load membership packages. Please refresh and try again.");
      })
      .finally(() => setPackagesLoading(false));
  }, []);

  const setField = (key: keyof FormFields, value: string) => {
    setFields((f) => ({ ...f, [key]: value }));
    setErrors((e) => ({ ...e, [key]: undefined }));
    setServerError(null);
  };

  const validate = (): boolean => {
    const next: FieldErrors = {};

    if (!fields.fullName.trim()) next.fullName = "Full name is required";
    if (!fields.gender) next.gender = "Select a gender";
    if (!fields.phone.trim()) next.phone = "Phone number is required";
    else if (fields.phone.trim().replace(/\D/g, "").length < 9) next.phone = "Enter a valid phone number";

    if (fields.email.trim() && !EMAIL_RE.test(fields.email.trim())) {
      next.email = "Enter a valid email address";
    }

    if (fields.dateOfBirth) {
      const dob = new Date(fields.dateOfBirth);
      if (isNaN(dob.getTime())) next.dateOfBirth = "Invalid date";
      else if (dob > new Date()) next.dateOfBirth = "Date of birth cannot be in the future";
    }

    if (!fields.password) {
      next.password = "Password is required";
    } else if (!PASSWORD_RE.test(fields.password)) {
      next.password = "Password must be at least 6 characters and include letters and numbers";
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

    setSubmitting(true);
    try {
      const res = await createMember({
        fullName: fields.fullName.trim(),
        gender: fields.gender,
        dateOfBirth: fields.dateOfBirth ? new Date(fields.dateOfBirth).toISOString() : undefined,
        phone: fields.phone.trim(),
        email: fields.email.trim() || undefined,
        address: fields.address.trim() || undefined,
        emergencyContact: fields.emergencyContact.trim() || undefined,
        username: fields.username.trim() || undefined,
        password: fields.password,
        initialPackageId: fields.packageId || undefined,
        photo: photoUrl.trim() || undefined,
        imageFile,
      });
      setCreated(res.member);
      setFields(initialFields);
      setPhotoUrl("");
      setImageFile(null);
      toast("success", "Member registered", `${res.member.fullName} (${res.member.memberCode})`);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to register member";
      setServerError(message);
      toast("error", "Registration failed", message);
    } finally {
      setSubmitting(false);
    }
  };

  if (user?.role === "MEMBER") {
    return (
      <Alert variant="info" title="No access">
        Your account does not have permission to register new members.
      </Alert>
    );
  }

  if (created) {
    return (
      <Card className="max-w-xl mx-auto text-center p-8">
        <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-emerald-100 mb-4">
          <CheckCircle2 className="h-8 w-8 text-emerald-600" />
        </div>
        <h2 className="text-xl font-bold text-slate-900">Member Registered Successfully</h2>
        <p className="mt-2 text-sm text-slate-500">
          Login account and membership are active. You can now issue the member&apos;s QR code or record a check-in.
        </p>
        <div className="mt-5 inline-flex items-center gap-3 rounded-xl border border-border bg-slate-50 px-6 py-4">
          <div className="text-left">
            <p className="text-xs text-slate-500">Member code</p>
            <p className="font-mono text-lg font-semibold text-slate-900">{created.memberCode}</p>
          </div>
          {created.memberships?.[0] && (
            <div className="text-left border-l border-border pl-4">
              <p className="text-xs text-slate-500">Membership</p>
              <p className="text-sm font-medium text-slate-900">{created.memberships[0].package?.name}</p>
            </div>
          )}
        </div>
        <div className="mt-7 flex flex-wrap justify-center gap-3">
          <Button onClick={() => router.push(`/members/${created.id}`)} rightIcon={<ArrowRight className="h-4 w-4" />}>
            View Member Profile
          </Button>
          <Button variant="outline" onClick={() => setCreated(null)}>
            Register Another Member
          </Button>
        </div>
      </Card>
    );
  }

  const selectedPackage = packages.find((p) => p.id === fields.packageId);

  return (
    <form onSubmit={handleSubmit} noValidate className="space-y-6 max-w-4xl">
      {serverError && (
        <Alert variant="error" title="Unable to register member">
          {serverError}
        </Alert>
      )}

      <Card title="Personal Information" subtitle="The member&apos;s basic details.">
        <div className="grid gap-5 sm:grid-cols-2">
          <div className="sm:col-span-2">
            <Input
              id="fullName"
              label="Full name *"
              startIcon={<UserRound className="h-4 w-4" />}
              placeholder="e.g. John Doe"
              value={fields.fullName}
              onChange={(e) => setField("fullName", e.target.value)}
              error={errors.fullName}
            />
          </div>
          <Select
            id="gender"
            label="Gender *"
            placeholder="Select gender"
            value={fields.gender}
            onChange={(e) => setField("gender", e.target.value)}
            options={[
              { value: "MALE", label: "Male" },
              { value: "FEMALE", label: "Female" },
            ]}
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
            placeholder="e.g. +251 911 000 000"
            value={fields.phone}
            onChange={(e) => setField("phone", e.target.value)}
            error={errors.phone}
          />
          <Input
            id="email"
            label="Email"
            type="email"
            placeholder="member@example.com"
            value={fields.email}
            onChange={(e) => setField("email", e.target.value)}
            error={errors.email}
          />
          <Input
            id="address"
            label="Address"
            placeholder="City, area"
            value={fields.address}
            onChange={(e) => setField("address", e.target.value)}
          />
          <Input
            id="emergencyContact"
            label="Emergency contact"
            placeholder="Alternative phone number"
            value={fields.emergencyContact}
            onChange={(e) => setField("emergencyContact", e.target.value)}
          />
        </div>
      </Card>

      <Card title="Login Account" subtitle="Credentials used by the member to sign in.">
        <div className="grid gap-5 sm:grid-cols-2">
          <Input
            id="username"
            label="Username"
            startIcon={<UserRound className="h-4 w-4" />}
            placeholder="Optional - defaults to email prefix"
            autoComplete="off"
            value={fields.username}
            onChange={(e) => setField("username", e.target.value)}
          />
          <Input
            id="password"
            label="Password *"
            type="password"
            startIcon={<KeyRound className="h-4 w-4" />}
            placeholder="At least 6 characters with letters and numbers"
            autoComplete="new-password"
            value={fields.password}
            onChange={(e) => setField("password", e.target.value)}
            error={errors.password}
            hint="Must be at least 6 characters and include both letters and numbers."
          />
        </div>
      </Card>

      <Card title="Profile Image" subtitle="Upload a local image or use an image URL.">
        <ProfileImageUploader
          url={photoUrl}
          file={imageFile}
          onUrlChange={setPhotoUrl}
          onFileChange={setImageFile}
          onError={(message) => toast("error", "Invalid profile image", message)}
          disabled={submitting}
        />
      </Card>

      <Card title="Initial Membership" subtitle="A membership is created automatically for the chosen package.">
        <div className="space-y-4">
          {packagesLoading ? (
            <p className="text-sm text-slate-500">Loading active packages...</p>
          ) : packages.length === 0 ? (
            <Alert variant="warning" title="No active packages">
              Create an active membership package before registering members.
            </Alert>
          ) : (
            <div className="space-y-3">
              {packages.map((pkg) => {
                const active = fields.packageId === pkg.id;
                return (
                  <label
                    key={pkg.id}
                    className={`flex cursor-pointer items-start justify-between gap-4 rounded-xl border p-4 transition-colors ${
                      active ? "border-primary bg-primary-light" : "border-border hover:bg-slate-50"
                    }`}
                  >
                    <input
                      type="radio"
                      name="package"
                      className="sr-only"
                      checked={active}
                      onChange={() => setField("packageId", pkg.id)}
                    />
                    <div className="flex items-center gap-3">
                      <Package2 className={`h-5 w-5 ${active ? "text-primary" : "text-slate-400"}`} />
                      <div>
                        <p className="text-sm font-semibold text-slate-900">
                          {pkg.name} <Badge variant="secondary">{pkg.durationDays} days</Badge>
                        </p>
                        {pkg.description && (
                          <p className="text-xs text-slate-500 mt-0.5">{pkg.description}</p>
                        )}
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-bold text-slate-900">{formatCurrency(pkg.price)}</p>
                      <StatusBadge status={pkg.status} />
                    </div>
                  </label>
                );
              })}
            </div>
          )}
          {selectedPackage && (
            <p className="text-xs text-slate-500">
              A payment receipt for {formatCurrency(selectedPackage.price)} will be recorded automatically and the
              membership will be active immediately.
            </p>
          )}
        </div>
      </Card>

      <div className="flex items-center justify-end gap-3">
        <Button type="button" variant="ghost" onClick={() => router.push("/members")} disabled={submitting}>
          Cancel
        </Button>
        <Button type="submit" loading={submitting} disabled={packagesLoading || packages.length === 0}>
          <UserPlus className="h-4 w-4" /> Register Member
        </Button>
      </div>
    </form>
  );
}