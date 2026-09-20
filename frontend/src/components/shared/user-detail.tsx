"use client";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { ArrowLeft, KeyRound, Mail, Phone, ShieldCheck, UserRound } from "lucide-react";
import { useEffect, useState } from "react";
import { Alert } from "@/components/ui/alert";
import { Avatar } from "@/components/ui/avatar";
import { Badge, StatusBadge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Modal } from "@/components/ui/modal";
import { PageLoader } from "@/components/ui/spinner";
import { useToast } from "@/components/ui/toast";
import { useAuth } from "@/providers/auth-provider";
import { getRoles, getUserById, resetUserPassword, updateUserStatus, type RolesCatalog } from "@/lib/api/users";
import { formatDate } from "@/lib/utils";
import type { AccountStatus, User } from "@/types";

export function UserDetailPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const { toast } = useToast();
  const { user: currentUser } = useAuth();

  const [user, setUser] = useState<User | null>(null);
  const [catalog, setCatalog] = useState<Partial<RolesCatalog>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [resetOpen, setResetOpen] = useState(false);
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    let active = true;
    Promise.all([getUserById(String(params.id)), getRoles()])
      .then(([userRes, rolesRes]) => {
        if (!active) return;
        setUser(userRes.user);
        setCatalog(rolesRes.roles);
        setError(null);
      })
      .catch((e) => {
        if (!active) return;
        setUser(null);
        setError(e instanceof Error ? e.message : "Failed to load user");
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
  }, [params.id]);

  const toggleStatus = async () => {
    if (!user) return;
    const nextStatus: AccountStatus = user.status === "ACTIVE" ? "DEACTIVATED" : "ACTIVE";
    setBusy(true);
    try {
      const res = await updateUserStatus(user.id, nextStatus);
      setUser(res.user);
      toast("success", `User ${nextStatus === "ACTIVE" ? "activated" : "deactivated"}`, res.user.fullName);
    } catch (err) {
      toast("error", "Failed to update status", err instanceof Error ? err.message : "Please try again.");
    } finally {
      setBusy(false);
    }
  };

  const resetPassword = async () => {
    if (!user || !password || password.length < 6) {
      toast("error", "Password too short", "Use at least 6 characters.");
      return;
    }

    setBusy(true);
    try {
      await resetUserPassword(user.id, password);
      setResetOpen(false);
      setPassword("");
      toast("success", "Password reset", user.username);
    } catch (err) {
      toast("error", "Failed to reset password", err instanceof Error ? err.message : "Please try again.");
    } finally {
      setBusy(false);
    }
  };

  if (loading) {
    return <PageLoader label="Loading user profile..." />;
  }

  if (error || !user) {
    return (
      <div className="mx-auto max-w-xl space-y-4">
        <Alert variant="error" title="User unavailable">
          {error ?? "User not found."}
        </Alert>
        <Link href="/users">
          <Button variant="outline" leftIcon={<ArrowLeft className="h-4 w-4" />}>
            Back to users
          </Button>
        </Link>
      </div>
    );
  }

  const roleInfo = catalog[user.role];
  const canChangeStatus = currentUser?.role === "OWNER" || user.role !== "OWNER";

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="flex items-center gap-4">
          <Avatar
            name={user.fullName}
            src={user.avatarUrl ?? user.memberProfile?.photo ?? user.trainerProfile?.photo}
            size="lg"
            status={user.status}
          />
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="text-2xl font-bold text-slate-900">{user.fullName}</h1>
              <Badge variant={user.role === "OWNER" ? "default" : user.role === "MANAGER" ? "info" : user.role === "TRAINER" ? "success" : "secondary"}>
                {user.role}
              </Badge>
              <StatusBadge status={user.status} />
            </div>
            <p className="mt-1 text-sm text-slate-500">{user.username} • Joined {formatDate(user.createdAt)}</p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Button variant="outline" size="sm" onClick={() => router.push("/users")} leftIcon={<ArrowLeft className="h-4 w-4" />}>
            Back
          </Button>
          <Button variant="outline" size="sm" onClick={() => setResetOpen(true)} leftIcon={<KeyRound className="h-4 w-4" />}>
            Reset password
          </Button>
          {canChangeStatus && (
            <Button variant={user.status === "ACTIVE" ? "danger" : "success"} size="sm" onClick={toggleStatus} loading={busy}>
              {user.status === "ACTIVE" ? "Deactivate" : "Activate"}
            </Button>
          )}
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-[1.2fr_0.8fr]">
        <div className="space-y-6">
          <div className="rounded-xl border border-border bg-white p-5 shadow-sm">
            <h2 className="text-lg font-semibold text-slate-900">Account details</h2>
            <div className="mt-4 grid gap-4 md:grid-cols-2">
              <div className="flex items-start gap-3">
                <Mail className="h-4 w-4 text-slate-400 mt-0.5" />
                <div>
                  <p className="text-xs uppercase tracking-wide text-slate-500">Email</p>
                  <p className="text-sm font-medium text-slate-800">{user.email}</p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <Phone className="h-4 w-4 text-slate-400 mt-0.5" />
                <div>
                  <p className="text-xs uppercase tracking-wide text-slate-500">Phone</p>
                  <p className="text-sm font-medium text-slate-800">{user.phone ?? "—"}</p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <UserRound className="h-4 w-4 text-slate-400 mt-0.5" />
                <div>
                  <p className="text-xs uppercase tracking-wide text-slate-500">Username</p>
                  <p className="text-sm font-medium text-slate-800">{user.username}</p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <ShieldCheck className="h-4 w-4 text-slate-400 mt-0.5" />
                <div>
                  <p className="text-xs uppercase tracking-wide text-slate-500">Role</p>
                  <p className="text-sm font-medium text-slate-800">{user.role}</p>
                </div>
              </div>
            </div>
          </div>

          {(user.memberProfile || user.trainerProfile) && (
            <div className="rounded-xl border border-border bg-white p-5 shadow-sm">
              <h2 className="text-lg font-semibold text-slate-900">Linked profile</h2>
              <div className="mt-4 space-y-3 text-sm text-slate-700">
                {user.memberProfile && (
                  <div className="rounded-lg bg-slate-50 p-3">
                    <p className="font-semibold text-slate-900">Member profile</p>
                    <p>{user.memberProfile.fullName}</p>
                    <p className="text-slate-500">Member code: {user.memberProfile.memberCode}</p>
                  </div>
                )}
                {user.trainerProfile && (
                  <div className="rounded-lg bg-slate-50 p-3">
                    <p className="font-semibold text-slate-900">Trainer profile</p>
                    <p>{user.trainerProfile.fullName}</p>
                    <p className="text-slate-500">Specialization: {user.trainerProfile.specialization}</p>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        <div className="rounded-xl border border-border bg-slate-50 p-5 shadow-sm">
          <div className="flex items-center gap-2 text-slate-800">
            <ShieldCheck className="h-4 w-4 text-primary" />
            <h2 className="text-lg font-semibold">Role permissions</h2>
          </div>

          {roleInfo ? (
            <div className="mt-4 space-y-4">
              <div>
                <p className="text-xs uppercase tracking-wide text-slate-500">Role</p>
                <p className="mt-1 font-semibold text-slate-900">{roleInfo.label}</p>
              </div>
              <p className="text-sm text-slate-600">{roleInfo.description}</p>
              <div className="flex flex-wrap gap-2">
                {roleInfo.permissions.map((permission) => (
                  <Badge key={permission} variant="secondary" className="rounded-full">
                    {permission}
                  </Badge>
                ))}
              </div>
            </div>
          ) : (
            <p className="mt-4 text-sm text-slate-500">No permission metadata found for this role.</p>
          )}
        </div>
      </div>

      <Modal
        open={resetOpen}
        onClose={() => {
          setResetOpen(false);
          setPassword("");
        }}
        title="Reset password"
        description="Create a new password for this user account."
        size="sm"
      >
        <div className="space-y-4">
          <Input
            label="New password"
            type="password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            placeholder="Minimum 6 characters"
          />
          <div className="flex justify-end gap-2">
            <Button variant="outline" size="sm" onClick={() => setResetOpen(false)}>
              Cancel
            </Button>
            <Button size="sm" loading={busy} onClick={resetPassword}>
              Save password
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
