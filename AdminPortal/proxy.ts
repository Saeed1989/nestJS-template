import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { SESSION_COOKIE_NAME, decryptSession } from "@/lib/crypto";

// Presence/decryptability check only — this cannot verify the session
// belongs to an admin, only that a well-formed session exists. Every admin
// action is re-authorized by auth-config on every request regardless.
export async function proxy(request: NextRequest) {
  const raw = request.cookies.get(SESSION_COOKIE_NAME)?.value;
  const session = raw ? await decryptSession(raw) : null;

  if (!session) {
    return NextResponse.redirect(new URL("/login", request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: "/admin/:path*",
};
