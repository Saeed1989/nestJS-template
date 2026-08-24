import Link from "next/link";
import { redirect } from "next/navigation";
import { fetchJson, UpstreamError } from "@/lib/upstream";
import { LogoutButton } from "./_components/logout-button";

type Identity = { id: string; email: string; roles: string[] };

async function loadIdentity(): Promise<Identity | null> {
  try {
    return await fetchJson<Identity>("/auth/me");
  } catch (err) {
    if (err instanceof UpstreamError && err.statusCode === 401) {
      redirect("/login");
    }
    // Non-auth failure (e.g. gateway hiccup) — still render the shell.
    return null;
  }
}

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
