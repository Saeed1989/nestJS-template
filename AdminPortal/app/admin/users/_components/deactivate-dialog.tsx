"use client";

import { useState } from "react";
import type { AdminUser } from "@/lib/types";
import { useApiFetch } from "@/lib/client-fetch";
import { Modal } from "./modal";

export function DeactivateDialog({
  user,
  mode,
  onClose,
}: {
  user: AdminUser;
  mode: "deactivate" | "reactivate";
  onClose: () => void;
}) {
  const apiFetch = useApiFetch();
  const [confirmText, setConfirmText] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const isDeactivate = mode === "deactivate";
  // Cheap insurance on a destructive-looking action — reactivation isn't
  // destructive, so it doesn't need the same friction.
  const canSubmit = isDeactivate ? confirmText === user.email : true;

  async function handleConfirm() {
    setError(null);
    setSubmitting(true);
    try {
      const res = await apiFetch(`/api/users/${user.id}${isDeactivate ? "" : "/reactivate"}`, {
        method: isDeactivate ? "DELETE" : "POST",
      });
      const data = await res.json();

      if (!res.ok) {
        setError(data?.error?.message ?? `Failed to ${mode} user`);
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
    <Modal title={isDeactivate ? "Deactivate user" : "Reactivate user"} onClose={onClose}>
      {isDeactivate ? (
        <>
          <p className="text-sm text-slate-600">
            This disables sign-in for <span className="font-medium text-slate-900">{user.email}</span> and revokes
            their active sessions. Type the email to confirm.
          </p>
          <input
            type="text"
            value={confirmText}
            onChange={(e) => setConfirmText(e.target.value)}
            placeholder={user.email}
            className="mt-3 w-full rounded-md border border-slate-300 px-3 py-2 text-sm outline-none focus:border-slate-500"
          />
        </>
      ) : (
        <p className="text-sm text-slate-600">
          Re-enable sign-in for <span className="font-medium text-slate-900">{user.email}</span>?
        </p>
      )}

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
          onClick={handleConfirm}
          disabled={submitting || !canSubmit}
          className={`rounded-md px-3 py-2 text-sm font-medium text-white disabled:opacity-50 ${
            isDeactivate ? "bg-red-600 hover:bg-red-700" : "bg-slate-900 hover:bg-slate-800"
          }`}
        >
          {submitting ? "Working…" : isDeactivate ? "Deactivate" : "Reactivate"}
        </button>
      </div>
    </Modal>
  );
}
