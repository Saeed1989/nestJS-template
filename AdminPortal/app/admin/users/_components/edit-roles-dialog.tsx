"use client";

import { useState } from "react";
import { ROLES } from "@/lib/roles";
import type { AdminUser } from "@/lib/types";
import { Modal } from "./modal";

export function EditRolesDialog({ user, onClose }: { user: AdminUser; onClose: () => void }) {
  const [roles, setRoles] = useState<string[]>(user.roles);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  function toggleRole(role: string) {
    setRoles((prev) => (prev.includes(role) ? prev.filter((r) => r !== role) : [...prev, role]));
  }

  async function handleSubmit() {
    setError(null);

    if (roles.length === 0) {
      setError("Select at least one role");
      return;
    }

    setSubmitting(true);
    try {
      const res = await fetch(`/api/users/${user.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ roles }),
      });
      const data = await res.json();

      if (!res.ok) {
        setError(data?.error?.message ?? "Failed to update roles");
        return;
      }

      onClose();
    } catch {
      setError("Cannot reach the server");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Modal title={`Edit roles — ${user.email}`} onClose={onClose}>
      <div className="flex gap-4">
        {ROLES.map((role) => (
          <label key={role} className="flex items-center gap-2 text-sm text-slate-700">
            <input type="checkbox" checked={roles.includes(role)} onChange={() => toggleRole(role)} />
            {role}
          </label>
        ))}
      </div>

      {error && (
        <p role="alert" className="mt-3 text-sm text-red-600">
          {error}
        </p>
      )}

      <div className="mt-4 flex justify-end gap-2">
        <button
          type="button"
          onClick={onClose}
          className="rounded-md border border-slate-300 px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-100"
        >
          Cancel
        </button>
        <button
          type="button"
          onClick={handleSubmit}
          disabled={submitting}
          className="rounded-md bg-slate-900 px-3 py-2 text-sm font-medium text-white hover:bg-slate-800 disabled:opacity-50"
        >
          {submitting ? "Saving…" : "Save"}
        </button>
      </div>
    </Modal>
  );
}
