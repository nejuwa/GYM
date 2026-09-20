"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Eye, KeyRound, Pencil, Plus, Power, Search, ShieldCheck, Trash2 } from "lucide-react";
import { Alert } from "@/components/ui/alert";
import { Avatar } from "@/components/ui/avatar";
import { Badge, StatusBadge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Modal } from "@/components/ui/modal";
import { Select } from "@/components/ui/select";
import { Table, type Column } from "@/components/ui/table";
import { PageLoader } from "@/components/ui/spinner";
import { useToast } from "@/components/ui/toast";
import { useAuth } from "@/providers/auth-provider";
import { createUser, deleteUser, getRoles, listUsers, resetUserPassword, updateUser, updateUserStatus, type RolesCatalog } from "@/lib/api/users";
import { formatDate } from "@/lib/utils";
import type { AccountStatus, Role, User } from "@/types";

type RoleFilter = Role | "ALL";

type UserFormState = {
  fullName: string;
  email: string;
  username: string;
  password: string;
  phone: string;
  role: Role;
};

const emptyForm: UserFormState = {
  fullName: "",
  email: "",
  username: "",
  password: "",
  phone: "",
  role: "MANAGER",
};

export function UsersList() {
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();
  const { toast } = useToast();

  const canManageUsers = ["OWNER", "MANAGER"].includes(user?.role ?? "MEMBER");
  const canCreateOwner = user?.role === "OWNER";

  const [users, setUsers] = useState<User[]>([]);
  const [roleCatalog, setRoleCatalog] = useState<Partial<RolesCatalog>>({});
  const [status, setStatus] = useState<AccountStatus | "ALL">("ALL");
  const [role, setRole] = useState<RoleFilter>("ALL");
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [refreshKey, setRefreshKey] = useState(0);
  const [error, setError] = useState<string | null>(null);

  const [editorOpen, setEditorOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [form, setForm] = useState<UserFormState>(emptyForm);
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});
  const [formBusy, setFormBusy] = useState(false);

  const [deleteTarget, setDeleteTarget] = useState<User | null>(null);
  const [deleteBusy, setDeleteBusy] = useState(false);

  const [resetTarget, setResetTarget] = useState<User | null>(null);
  const [resetPassword, setResetPassword] = useState("");
  const [resetBusy, setResetBusy] = useState(false);

  useEffect(() => {
    if (authLoading || !canManageUsers) {
      setLoading(false);
      return;
    }

    let active = true;
    getRoles()
      .then((res) => {
        if (!active) return;
        setRoleCatalog(res.roles);
      })
      .catch(() => {
        if (!active) return;
        setRoleCatalog({});
      });
    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    let active = true;
    setLoading(true);
    listUsers({ status, role, search: search || undefined })
      .then((res) => {
        if (!active) return;
        setUsers(res.users);
        setError(null);
      })
      .catch((e) => {
        if (!active) return;
        setUsers([]);
        setError(e instanceof Error ? e.message : "Failed to load users");
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
  }, [authLoading, canManageUsers, status, role, search, refreshKey]);

  const roleOptions: Array<{ value: RoleFilter; label: string }> = [
    { value: "ALL", label: "All roles" },
    { value: "OWNER", label: "Owner" },
    { value: "MANAGER", label: "Manager" },
    { value: "TRAINER", label: "Trainer" },
    { value: "MEMBER", label: "Member" },
  ];

  const createRoleOptions = roleOptions.filter((option) => option.value !== "ALL" && (canCreateOwner || option.value !== "OWNER"));
  const showReset = status !== "ALL" || role !== "ALL" || !!search;
  const selectedRoleInfo = roleCatalog[form.role];

  if (authLoading) {
    return <PageLoader label="Checking user-management access..." />;
  }

  if (!canManageUsers) {
    return (
      <div className="mx-auto max-w-xl">
        <Alert variant="error" title="Access denied">
          Only owners and managers can view and manage user accounts.
        </Alert>
      </div>
    );
  }

  const resetFilters = () => {
    setStatus("ALL");
    setRole("ALL");
    setSearch("");
  };

  const openCreate = () => {
    setEditingUser(null);
    setForm({ ...emptyForm, role: canCreateOwner ? "OWNER" : "MANAGER" });
    setFormErrors({});
    setEditorOpen(true);
  };

  const openEdit = (target: User) => {
    setEditingUser(target);
    setForm({
      fullName: target.fullName,
      email: target.email,
      username: target.username,
      password: "",
      phone: target.phone ?? "",
      role: target.role,
    });
    setFormErrors({});
    setEditorOpen(true);
  };

  const submitForm = async (event: React.FormEvent) => {
    event.preventDefault();
    const nextErrors: Record<string, string> = {};

    if (!form.fullName.trim()) nextErrors.fullName = "Full name is required";
    if (!form.email.trim()) nextErrors.email = "Email is required";
    if (!form.username.trim()) nextErrors.username = "Username is required";
    if (!editingUser && (!form.password || form.password.length < 6)) {
      nextErrors.password = "Password must be at least 6 characters";
    }

    setFormErrors(nextErrors);
    if (Object.keys(nextErrors).length > 0) return;

    setFormBusy(true);
    try {
      if (editingUser) {
        const res = await updateUser(editingUser.id, {
          fullName: form.fullName.trim(),
          phone: form.phone.trim() || null,
          role: form.role,
          password: form.password || undefined,
        });
        toast("success", "User updated", res.user.fullName);
      } else {
        const res = await createUser({
          fullName: form.fullName.trim(),
          email: form.email.trim(),
          username: form.username.trim(),
          password: form.password,
          phone: form.phone.trim() || undefined,
          role: form.role,
        });
        toast("success", "User created", `${res.user.fullName} (${res.user.role})`);
      }
      setEditorOpen(false);
      setRefreshKey((value) => value + 1);
    } catch (err) {
      toast("error", editingUser ? "Failed to update user" : "Failed to create user", err instanceof Error ? err.message : "Please try again.");
    } finally {
      setFormBusy(false);
    }
  };

  const toggleStatus = async (target: User) => {
    const nextStatus: AccountStatus = target.status === "ACTIVE" ? "DEACTIVATED" : "ACTIVE";
    try {
      const res = await updateUserStatus(target.id, nextStatus);
      setRefreshKey((value) => value + 1);
      toast("success", `User ${nextStatus === "ACTIVE" ? "activated" : "deactivated"}`, res.user.fullName);
    } catch (err) {
      toast("error", "Failed to update user status", err instanceof Error ? err.message : "Please try again.");
    }
  };

  const performDelete = async () => {
    if (!deleteTarget) return;
    setDeleteBusy(true);
    try {
      await deleteUser(deleteTarget.id);
      setDeleteTarget(null);
      setRefreshKey((value) => value + 1);
      toast("success", "User deleted", deleteTarget.fullName);
    } catch (err) {
      toast("error", "Failed to delete user", err instanceof Error ? err.message : "Please try again.");
    } finally {
      setDeleteBusy(false);
    }
  };

  const performPasswordReset = async () => {
    if (!resetTarget || !resetPassword || resetPassword.length < 6) {
      toast("error", "Password too short", "New password must be at least 6 characters.");
      return;
    }

    setResetBusy(true);
    try {
      await resetUserPassword(resetTarget.id, resetPassword);
      setResetTarget(null);
      setResetPassword("");
      toast("success", "Password reset", resetTarget.username);
    } catch (err) {
      toast("error", "Failed to reset password", err instanceof Error ? err.message : "Please try again.");
    } finally {
      setResetBusy(false);
    }
  };

  const columns: Array<Column<User>> = [
    {
      key: "user",
      header: "User",
      cell: (item) => (
        <div className="flex items-center gap-3 min-w-0">
          <Avatar
            name={item.fullName}
            src={item.avatarUrl ?? item.memberProfile?.photo ?? item.trainerProfile?.photo}
            size="md"
            status={item.status}
          />
          <div className="min-w-0">
            <p className="truncate font-medium text-slate-900">{item.fullName}</p>
            <p className="text-xs text-slate-500">{item.username}</p>
          </div>
        </div>
      ),
    },
    {
      key: "contact",
      header: "Contact",
      cell: (item) => (
        <div className="text-sm text-slate-700">
          <p>{item.email}</p>
          <p className="text-xs text-slate-500">{item.phone ?? "No phone"}</p>
        </div>
      ),
    },
    {
      key: "role",
      header: "Role",
      cell: (item) => (
        <Badge variant={item.role === "OWNER" ? "default" : item.role === "MANAGER" ? "info" : item.role === "TRAINER" ? "success" : "secondary"}>
          {item.role}
        </Badge>
      ),
    },
    {
      key: "status",
      header: "Status",
      cell: (item) => <StatusBadge status={item.status} />,
    },
    {
      key: "lastLogin",
      header: "Last Login",
      cell: (item) => <p className="text-sm text-slate-600">{item.lastLogin ? formatDate(item.lastLogin) : "Never"}</p>,
    },
    {
      key: "actions",
      header: "Actions",
      className: "text-right",
      cell: (item) => (
        <div className="flex items-center justify-end gap-1.5">
          <Button size="xs" variant="outline" onClick={(event) => { event.stopPropagation(); router.push(`/users/${item.id}`); }} aria-label="View user">
            <Eye className="h-3.5 w-3.5" />
          </Button>
          {canManageUsers && (
            <>
              <Button size="xs" variant="outline" onClick={(event) => { event.stopPropagation(); openEdit(item); }} aria-label="Edit user">
                <Pencil className="h-3.5 w-3.5" />
              </Button>
              <Button size="xs" variant="outline" onClick={(event) => { event.stopPropagation(); void toggleStatus(item); }} aria-label="Toggle user status">
                <Power className="h-3.5 w-3.5" />
              </Button>
              <Button size="xs" variant="outline" onClick={(event) => { event.stopPropagation(); setResetPassword(""); setResetTarget(item); }} aria-label="Reset password">
                <KeyRound className="h-3.5 w-3.5" />
              </Button>
            </>
          )}
          {user?.role === "OWNER" && item.role !== "OWNER" && (
            <Button size="xs" variant="outline" onClick={(event) => { event.stopPropagation(); setDeleteTarget(item); }} aria-label="Delete user">
              <Trash2 className="h-3.5 w-3.5" />
            </Button>
          )}
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Users & access</h1>
          <p className="mt-1 text-sm text-slate-500">Manage every user type and the permissions attached to each role.</p>
        </div>
        {canManageUsers && (
          <Button size="sm" leftIcon={<Plus className="h-4 w-4" />} onClick={openCreate}>
            New user
          </Button>
        )}
      </div>

      <div className="rounded-xl border border-border bg-white p-5 shadow-sm">
        <div className="flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
          <div className="flex-1 flex flex-wrap gap-3">
            <div className="w-full sm:w-64">
              <Input
                type="search"
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Search name, email or username"
                startIcon={<Search className="h-4 w-4" />}
              />
            </div>
            <div className="w-full sm:w-40">
              <Select
                aria-label="Role filter"
                value={role}
                onChange={(event) => setRole(event.target.value as RoleFilter)}
                options={roleOptions}
              />
            </div>
            <div className="w-full sm:w-40">
              <Select
                aria-label="Status filter"
                value={status}
                onChange={(event) => setStatus(event.target.value as AccountStatus | "ALL")}
                options={[
                  { value: "ALL", label: "All statuses" },
                  { value: "ACTIVE", label: "Active" },
                  { value: "SUSPENDED", label: "Suspended" },
                  { value: "DEACTIVATED", label: "Deactivated" },
                ]}
              />
            </div>
          </div>

          {showReset && (
            <Button variant="outline" size="sm" onClick={resetFilters}>
              Reset
            </Button>
          )}
        </div>
      </div>

      {error ? (
        <Alert variant="error" title="Could not load users">
          {error}
        </Alert>
      ) : null}

      <div className="overflow-hidden rounded-xl border border-border bg-white shadow-sm">
        <Table
          columns={columns}
          data={users}
          getRowKey={(item) => item.id}
          loading={loading}
          loadingLabel="Loading users..."
          emptyTitle="No users found"
          emptyMessage="Try changing the filters or add a new user."
          onRowClick={(item) => router.push(`/users/${item.id}`)}
        />
      </div>

      <Modal
        open={editorOpen}
        onClose={() => setEditorOpen(false)}
        title={editingUser ? "Edit user" : "Create user"}
        description={editingUser ? "Update account details and role access." : "Register a new gym user and assign their role."}
        size="lg"
      >
        <form onSubmit={submitForm} className="space-y-5" noValidate>
          <div className="grid gap-4 md:grid-cols-2">
            <Input
              label="Full name"
              value={form.fullName}
              onChange={(event) => setForm((prev) => ({ ...prev, fullName: event.target.value }))}
              error={formErrors.fullName}
            />
            <Select
              label="Role"
              value={form.role}
              onChange={(event) => setForm((prev) => ({ ...prev, role: event.target.value as Role }))}
              options={createRoleOptions as Array<{ value: Role; label: string }>}
              error={formErrors.role}
            />
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <Input
              label="Email"
              type="email"
              value={form.email}
              disabled={Boolean(editingUser)}
              onChange={(event) => setForm((prev) => ({ ...prev, email: event.target.value }))}
              error={formErrors.email}
            />
            <Input
              label="Username"
              value={form.username}
              disabled={Boolean(editingUser)}
              onChange={(event) => setForm((prev) => ({ ...prev, username: event.target.value }))}
              error={formErrors.username}
            />
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            {!editingUser && (
              <Input
                label="Password"
                type="password"
                value={form.password}
                onChange={(event) => setForm((prev) => ({ ...prev, password: event.target.value }))}
                error={formErrors.password}
              />
            )}
            <Input
              label="Phone"
              value={form.phone}
              onChange={(event) => setForm((prev) => ({ ...prev, phone: event.target.value }))}
            />
          </div>

          {selectedRoleInfo && (
            <div className="rounded-lg border border-border bg-slate-50 p-4">
              <div className="flex items-center gap-2 text-slate-800">
                <ShieldCheck className="h-4 w-4 text-primary" />
                <p className="font-semibold">{selectedRoleInfo.label}</p>
              </div>
              <p className="mt-2 text-sm text-slate-600">{selectedRoleInfo.description}</p>
              <div className="mt-3 flex flex-wrap gap-2">
                {selectedRoleInfo.permissions.map((permission) => (
                  <Badge key={permission} variant="secondary" className="rounded-full">
                    {permission}
                  </Badge>
                ))}
              </div>
            </div>
          )}

          <div className="flex items-center justify-end gap-2 pt-2">
            <Button variant="outline" size="sm" type="button" onClick={() => setEditorOpen(false)}>
              Cancel
            </Button>
            <Button size="sm" type="submit" loading={formBusy}>
              {editingUser ? "Save changes" : "Create user"}
            </Button>
          </div>
        </form>
      </Modal>

      <Modal
        open={Boolean(deleteTarget)}
        onClose={() => setDeleteTarget(null)}
        title="Delete user"
        description="This permanently removes the user and associated records."
        size="sm"
        footer={
          <div className="flex justify-end gap-2">
            <Button variant="outline" size="sm" onClick={() => setDeleteTarget(null)}>
              Cancel
            </Button>
            <Button variant="danger" size="sm" loading={deleteBusy} onClick={performDelete}>
              Delete
            </Button>
          </div>
        }
      >
        <p className="text-sm text-slate-700">Are you sure you want to delete {deleteTarget?.fullName}? This action cannot be undone.</p>
      </Modal>

      <Modal
        open={Boolean(resetTarget)}
        onClose={() => {
          setResetTarget(null);
          setResetPassword("");
        }}
        title="Reset password"
        description="Send a new temporary password for this account."
        size="sm"
      >
        <div className="space-y-4">
          <Input
            label="New password"
            type="password"
            value={resetPassword}
            onChange={(event) => setResetPassword(event.target.value)}
            placeholder="Minimum 6 characters"
          />
          <div className="flex justify-end gap-2">
            <Button variant="outline" size="sm" onClick={() => setResetTarget(null)}>
              Cancel
            </Button>
            <Button size="sm" loading={resetBusy} onClick={performPasswordReset}>
              Reset password
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
