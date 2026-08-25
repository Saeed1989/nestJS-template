"use client";

import { useCallback, useState, type ChangeEvent } from "react";
import type { AdminUser, ListResponse } from "@/lib/types";
import { CreateUserDialog } from "./create-user-dialog";
import { EditRolesDialog } from "./edit-roles-dialog";
import { DeactivateDialog } from "./deactivate-dialog";

type DialogState =
  | { type: "create" }
  | { type: "edit-roles"; user: AdminUser }
  | { type: "deactivate"; user: AdminUser }
  | { type: "reactivate"; user: AdminUser }
  | null;

export function UserTable({
  initial,
  currentUserId,
  currentUserRoles,
}: {
  initial: ListResponse<AdminUser>;
  currentUserId: string;
  currentUserRoles: string[];
}) {
  const [rows, setRows] = useState(initial.data);
  const [meta, setMeta] = useState(initial.meta);
  const [search, setSearch] = useState("");
  const [includeInactive, setIncludeInactive] = useState(false);
  const [loading, setLoading] = useState(false);
  const [fetchError, setFetchError] = useState<string | null>(null);
  const [dialog, setDialog] = useState<DialogState>(null);

  const isSuperAdmin = currentUserRoles.includes("super_admin");

  const load = useCallback(async (page: number, nextSearch: string, nextIncludeInactive: boolean) => {
    setLoading(true);
    setFetchError(null);
    try {
      const params = new URLSearchParams({ page: String(page), limit: "20" });
      if (nextSearch) params.set("search", nextSearch);
      if (nextIncludeInactive) params.set("includeInactive", "true");

      const res = await fetch(`/api/users?${params}`);
      const data = await res.json();

      if (!res.ok) {
        setFetchError(data?.error?.message ?? "Failed to load users");
        return;
      }

      setRows(data.data);
      setMeta(data.meta);
    } catch {
      setFetchError("Cannot reach the server");
    } finally {
      setLoading(false);
    }
  }, []);

  function handleSearchChange(event: ChangeEvent<HTMLInputElement>) {
    const value = event.target.value;
    setSearch(value);
    void load(1, value, includeInactive);
  }

  function handleIncludeInactiveChange(event: ChangeEvent<HTMLInputElement>) {
    const checked = event.target.checked;
    setIncludeInactive(checked);
    void load(1, search, checked);
  }

  function closeDialog() {
    setDialog(null);
    void load(meta.page, search, includeInactive);
  }

  function canModify(user: AdminUser): { allowed: boolean; reason?: string } {
    if (user.id === currentUserId) return { allowed: false, reason: "You cannot modify your own access" };
    if (user.roles.includes("super_admin") && !isSuperAdmin) {
      return { allowed: false, reason: "Only a super admin can modify a super admin" };
    }
    return { allowed: true };
  }

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-3">
          <input
            type="text"
            placeholder="Search by name or email"
            value={search}
            onChange={handleSearchChange}
            className="w-64 rounded-md border border-slate-300 px-3 py-2 text-sm outline-none focus:border-slate-500"
          />
          <label className="flex items-center gap-2 text-sm text-slate-600">
            <input type="checkbox" checked={includeInactive} onChange={handleIncludeInactiveChange} />
            Show deactivated
          </label>
        </div>
        <button
          type="button"
          onClick={() => setDialog({ type: "create" })}
          className="rounded-md bg-slate-900 px-3 py-2 text-sm font-medium text-white hover:bg-slate-800"
        >
          Create user
        </button>
      </div>

      {fetchError && (
        <p role="alert" className="mt-3 text-sm text-red-600">
          {fetchError}
        </p>
      )}

      <div className="mt-4 overflow-x-auto rounded-md border border-slate-200">
        <table className="min-w-full divide-y divide-slate-200 text-sm">
          <thead className="bg-slate-50">
            <tr>
              <th className="px-4 py-2 text-left font-medium text-slate-600">Email</th>
              <th className="px-4 py-2 text-left font-medium text-slate-600">Roles</th>
              <th className="px-4 py-2 text-left font-medium text-slate-600">Status</th>
              <th className="px-4 py-2 text-right font-medium text-slate-600">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 bg-white">
            {rows.map((user) => {
              const { allowed, reason } = canModify(user);
              return (
                <tr key={user.id}>
                  <td className="px-4 py-2 text-slate-900">{user.email}</td>
                  <td className="px-4 py-2 text-slate-600">{user.roles.join(", ")}</td>
                  <td className="px-4 py-2">
                    <span
                      className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                        user.isActive ? "bg-green-100 text-green-800" : "bg-slate-200 text-slate-600"
                      }`}
                    >
                      {user.isActive ? "Active" : "Deactivated"}
                    </span>
                  </td>
                  <td className="px-4 py-2 text-right">
                    <div className="inline-flex gap-2" title={!allowed ? reason : undefined}>
                      <button
                        type="button"
                        disabled={!allowed}
                        onClick={() => setDialog({ type: "edit-roles", user })}
                        className="rounded-md border border-slate-300 px-2 py-1 text-xs font-medium text-slate-700 hover:bg-slate-100 disabled:opacity-40"
                      >
                        Edit roles
                      </button>
                      <button
                        type="button"
                        disabled={!allowed}
                        onClick={() => setDialog({ type: user.isActive ? "deactivate" : "reactivate", user })}
                        className="rounded-md border border-slate-300 px-2 py-1 text-xs font-medium text-slate-700 hover:bg-slate-100 disabled:opacity-40"
                      >
                        {user.isActive ? "Deactivate" : "Reactivate"}
                      </button>
                    </div>
                  </td>
                </tr>
              );
            })}
            {rows.length === 0 && !loading && (
              <tr>
                <td colSpan={4} className="px-4 py-6 text-center text-slate-500">
                  No users found
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <div className="mt-3 flex items-center justify-between text-sm text-slate-600">
        <span>
          Page {meta.page} of {meta.totalPages} · {meta.total} users
        </span>
        <div className="flex gap-2">
          <button
            type="button"
            disabled={meta.page <= 1 || loading}
            onClick={() => load(meta.page - 1, search, includeInactive)}
            className="rounded-md border border-slate-300 px-3 py-1.5 font-medium text-slate-700 hover:bg-slate-100 disabled:opacity-40"
          >
            Previous
          </button>
          <button
            type="button"
            disabled={meta.page >= meta.totalPages || loading}
            onClick={() => load(meta.page + 1, search, includeInactive)}
            className="rounded-md border border-slate-300 px-3 py-1.5 font-medium text-slate-700 hover:bg-slate-100 disabled:opacity-40"
          >
            Next
          </button>
        </div>
      </div>

      {dialog?.type === "create" && <CreateUserDialog onClose={closeDialog} />}
      {dialog?.type === "edit-roles" && <EditRolesDialog user={dialog.user} onClose={closeDialog} />}
      {(dialog?.type === "deactivate" || dialog?.type === "reactivate") && (
        <DeactivateDialog user={dialog.user} mode={dialog.type} onClose={closeDialog} />
      )}
    </div>
  );
}
