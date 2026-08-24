import Link from "next/link";

export default function AdminHomePage() {
  return (
    <div>
      <h1 className="text-2xl font-semibold text-slate-900">Dashboard</h1>
      <p className="mt-2 text-slate-600">Manage admin access and review activity on this portal.</p>
      <div className="mt-6 flex gap-4">
        <Link
          href="/admin/users"
          className="rounded-md border border-slate-300 bg-white px-4 py-3 text-sm font-medium text-slate-900 hover:bg-slate-50"
        >
          Users →
        </Link>
        <Link
          href="/admin/audit"
          className="rounded-md border border-slate-300 bg-white px-4 py-3 text-sm font-medium text-slate-900 hover:bg-slate-50"
        >
          Audit log →
        </Link>
      </div>
    </div>
  );
}
