"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, ShieldCheck, UserPlus } from "lucide-react";
import { Alert } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { useToast } from "@/components/ui/toast";
import { useAuth } from "@/providers/auth-provider";
import { createUser, getRoles, type RolesCatalog } from "@/lib/api/users";
import type { Role } from "@/types";

interface UserFormState {
  fullName: string;
  email: string;
  username: string;
  password: string;
  phone: string;
  role: Role;
}

const emptyForm: UserFormState = {
  fullName: "",
  email: "",
  username: "",
  password: "",
  phone: "",
  role: "MANAGER",
};

export function UserNewPage() {
  const router = useRouter();
  const { user } = useAuth();
  const { toast } = useToast();

  const canManageUsers = ["OWNER", "MANAGER"].includes(user?.role ?? "MEMBER");
  const roleOptions: Array<{ value: Role; label: string }> = ([
    { value: "OWNER", label: "Owner" },
    { value: "MANAGER", label: "Manager" },
    { value: "TRAINER", label: "Trainer" },
    { value: "MEMBER", label: "Member" },
  ] as const satisfies ReadonlyArray<{ value: Role; label: string }>).filter(
    (option) => user?.role === "OWNER" || option.value !== "OWNER"
  ) as Array<{ value: Role; label: string }>;

  const [form, setForm] = useState<UserFormState>(emptyForm);
  const [busy, setBusy] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [catalog, setCatalog] = useState<Partial<RolesCatalog>>({});
  const [loadingRoles, setLoadingRoles] = useState(true);

  useEffect(() => {
    let active = true;
    getRoles()
      .then((res) => {
        if (!active) return;
        setCatalog(res.roles);
      })
      .catch(() => {
        if (!active) return;
        setCatalog({});
      })
      .finally(() => {
        if (active) setLoadingRoles(false);
      });

    return () => {
      active = false;
    };
  }, []);

  const permissions = useMemo(
    () => catalog[form.role]?.permissions ?? [],
    [catalog, form.role]
  );

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    const nextErrors: Record<string, string> = {};

    if (!form.fullName.trim()) nextErrors.fullName = "Full name is required";
    if (!form.email.trim()) nextErrors.email = "Email is required";
    if (!form.username.trim()) nextErrors.username = "Username is required";
    if (!form.password || form.password.length < 6) nextErrors.password = "Password must be at least 6 characters";
    if (!form.role) nextErrors.role = "Select a role";

    setErrors(nextErrors);
    if (Object.keys(nextErrors).length > 0) return;

    setBusy(true);
    try {
      const res = await createUser({
        fullName: form.fullName.trim(),
        email: form.email.trim(),
        username: form.username.trim(),
        password: form.password,
        phone: form.phone.trim() || undefined,
        role: form.role,
      });
      toast("success", "User created", `${res.user.fullName} (${res.user.role})`);
      router.push("/users");
    } catch (err) {
      toast("error", "Could not create user", err instanceof Error ? err.message : "Please try again.");
    } finally {
      setBusy(false);
    }
  };

  if (!canManageUsers) {
    return (
      <div className="mx-auto max-w-xl">
        <Alert variant="error" title="Access denied">
          You do not have permission to create users.
        </Alert>
      </div>
    );
  }

  const roleMeta = catalog[form.role];

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Register a new user</h1>
          <p className="mt-1 text-sm text-slate-500">Create a user account with the correct role and access profile.</p>
        </div>
        <Button variant="outline" size="sm" onClick={() => router.push("/users")} leftIcon={<ArrowLeft className="h-4 w-4" />}>
          Back to users
        </Button>
      </div>

      <div className="grid gap-6 lg:grid-cols-[1.3fr_0.7fr]">
        <form onSubmit={submit} className="space-y-5 rounded-xl border border-border bg-white p-6 shadow-sm" noValidate>
          <div className="grid gap-4 md:grid-cols-2">
            <Input
              label="Full name"
              value={form.fullName}
              onChange={(event) => setForm((prev) => ({ ...prev, fullName: event.target.value }))}
              placeholder="Jane Doe"
              error={errors.fullName}
            />
            <Select
              label="Role"
              value={form.role}
              onChange={(event) => setForm((prev) => ({ ...prev, role: event.target.value as Role }))}
              options={roleOptions}
              error={errors.role}
            />
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <Input
              label="Email"
              type="email"
              value={form.email}
              onChange={(event) => setForm((prev) => ({ ...prev, email: event.target.value }))}
              placeholder="user@example.com"
              error={errors.email}
            />
            <Input
              label="Username"
              value={form.username}
              onChange={(event) => setForm((prev) => ({ ...prev, username: event.target.value }))}
              placeholder="username"
              error={errors.username}
            />
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <Input
              label="Password"
              type="password"
              value={form.password}
              onChange={(event) => setForm((prev) => ({ ...prev, password: event.target.value }))}
              placeholder="********"
              error={errors.password}
            />
            <Input
              label="Phone (optional)"
              value={form.phone}
              onChange={(event) => setForm((prev) => ({ ...prev, phone: event.target.value }))}
              placeholder="+251..."
            />
          </div>

          <div className="flex items-center justify-end gap-3 pt-2">
            <Button variant="outline" type="button" onClick={() => router.push("/users")}>
              Cancel
            </Button>
            <Button type="submit" loading={busy} leftIcon={<UserPlus className="h-4 w-4" />}>
              Create user
            </Button>
          </div>
        </form>

        <div className="rounded-xl border border-border bg-slate-50 p-5 shadow-sm">
          <div className="flex items-center gap-2 text-slate-800">
            <ShieldCheck className="h-4 w-4 text-primary" />
            <h2 className="text-lg font-semibold">Access permissions</h2>
          </div>

          {loadingRoles ? (
            <p className="mt-4 text-sm text-slate-500">Loading role permissions…</p>
          ) : roleMeta ? (
            <div className="mt-4 space-y-4">
              <div>
                <p className="text-xs uppercase tracking-wide text-slate-500">Role</p>
                <p className="mt-1 font-semibold text-slate-900">{roleMeta.label}</p>
              </div>
              <p className="text-sm text-slate-600">{roleMeta.description}</p>
              <div className="flex flex-wrap gap-2">
                {permissions.length ? (
                  permissions.map((permission) => (
                    <Badge key={permission} variant="secondary" className="rounded-full">
                      {permission}
                    </Badge>
                  ))
                ) : (
                  <span className="text-sm text-slate-500">No permissions available</span>
                )}
              </div>
            </div>
          ) : (
            <p className="mt-4 text-sm text-slate-500">Role metadata unavailable.</p>
          )}
        </div>
      </div>
    </div>
  );
}
