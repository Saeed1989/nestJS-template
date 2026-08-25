import Link from "next/link";
import { loadIdentity } from "@/lib/identity";
import { LogoutButton } from "./_components/logout-button";

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const identity = await loadIdentity();

  return (
    <div className="min-h-screen">
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
          <nav className="flex items-center gap-6">
            <span className="text-base font-semibold text-slate-900">Admin Portal</span>
            <Link href="/admin" className="text-sm font-medium text-slate-600 hover:text-slate-900">
              Dashboard
            </Link>
            <Link href="/admin/users" className="text-sm font-medium text-slate-600 hover:text-slate-900">
              Users
            </Link>
            <Link href="/admin/audit" className="text-sm font-medium text-slate-600 hover:text-slate-900">
              Audit log
            </Link>
          </nav>
          <div className="flex items-center gap-4">
            {identity && <span className="text-sm text-slate-600">{identity.email}</span>}
            <LogoutButton />
          </div>
        </div>
      </header>
      <main className="mx-auto max-w-6xl px-6 py-8">{children}</main>
    </div>
  );
}
