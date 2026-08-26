import { fetchJsonOrRedirect } from "@/lib/upstream";
import { loadIdentity } from "@/lib/identity";
import type { AdminUser, ListResponse } from "@/lib/types";
import { UserTable } from "./_components/user-table";

export default async function UsersPage() {
  const [identity, initial] = await Promise.all([
    loadIdentity(),
    fetchJsonOrRedirect<ListResponse<AdminUser>>("/admin/users?page=1&limit=20"),
  ]);

  return (
    <div>
      <h1 className="text-2xl font-semibold text-slate-900">Users</h1>
      <p className="mt-1 text-sm text-slate-600">Manage who can sign in to this portal.</p>

      <div className="mt-6">
        <UserTable initial={initial} currentUserId={identity?.id ?? ""} currentUserRoles={identity?.roles ?? []} />
      </div>
    </div>
  );
}
