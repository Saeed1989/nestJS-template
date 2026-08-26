import Link from "next/link";
import { fetchJsonOrRedirect } from "@/lib/upstream";
import type { AuditLogEntry, ListResponse } from "@/lib/types";

export default async function AuditPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string }>;
}) {
  const { page: pageParam } = await searchParams;
  const page = Math.max(1, Number(pageParam) || 1);

  const { data: entries, meta } = await fetchJsonOrRedirect<ListResponse<AuditLogEntry>>(
    `/admin/audit?page=${page}&limit=20`,
  );

  return (
    <div>
      <h1 className="text-2xl font-semibold text-slate-900">Audit log</h1>
      <p className="mt-1 text-sm text-slate-600">Every create, update, deactivate, and reactivate on this portal.</p>

      <div className="mt-6 overflow-x-auto rounded-md border border-slate-200">
        <table className="min-w-full divide-y divide-slate-200 text-sm">
          <thead className="bg-slate-50">
            <tr>
              <th className="px-4 py-2 text-left font-medium text-slate-600">When</th>
              <th className="px-4 py-2 text-left font-medium text-slate-600">Action</th>
              <th className="px-4 py-2 text-left font-medium text-slate-600">Actor</th>
              <th className="px-4 py-2 text-left font-medium text-slate-600">Target</th>
              <th className="px-4 py-2 text-left font-medium text-slate-600">Changes</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 bg-white">
            {entries.map((entry) => (
              <tr key={entry.id}>
                <td className="whitespace-nowrap px-4 py-2 text-slate-600">
                  {new Date(entry.createdAt).toLocaleString()}
                </td>
                <td className="px-4 py-2 text-slate-900">{entry.action}</td>
                <td className="px-4 py-2 font-mono text-xs text-slate-600">{entry.actorId}</td>
                <td className="px-4 py-2 font-mono text-xs text-slate-600">{entry.targetUserId}</td>
                <td className="px-4 py-2 font-mono text-xs text-slate-600">{JSON.stringify(entry.changes)}</td>
              </tr>
            ))}
            {entries.length === 0 && (
              <tr>
                <td colSpan={5} className="px-4 py-6 text-center text-slate-500">
                  No audit entries yet
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <div className="mt-3 flex items-center justify-between text-sm text-slate-600">
        <span>
          Page {meta.page} of {meta.totalPages} · {meta.total} entries
        </span>
        <div className="flex gap-2">
          <Link
            href={`/admin/audit?page=${page - 1}`}
            aria-disabled={page <= 1}
            className={`rounded-md border border-slate-300 px-3 py-1.5 font-medium text-slate-700 hover:bg-slate-100 ${
              page <= 1 ? "pointer-events-none opacity-40" : ""
            }`}
          >
            Previous
          </Link>
          <Link
            href={`/admin/audit?page=${page + 1}`}
            aria-disabled={page >= meta.totalPages}
            className={`rounded-md border border-slate-300 px-3 py-1.5 font-medium text-slate-700 hover:bg-slate-100 ${
              page >= meta.totalPages ? "pointer-events-none opacity-40" : ""
            }`}
          >
            Next
          </Link>
        </div>
      </div>
    </div>
  );
}
