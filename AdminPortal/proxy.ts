import { NextRequest, NextResponse } from "next/server";
import { decryptSession, SESSION_COOKIE_NAME } from "./lib/crypto";

export const config = {
  matcher: ["/admin/:path*"],
};

// Presence-and-decryptability check only. It stops unauthenticated browsers
// from loading the shell — it cannot and does not verify admin authorization,
// which auth-config re-checks on every API call regardless.
export async function proxy(request: NextRequest) {
  const raw = request.cookies.get(SESSION_COOKIE_NAME)?.value;
  const session = raw ? await decryptSession(raw) : null;

  if (!session) {
    const loginUrl = new URL("/login", request.url);
    loginUrl.searchParams.set("from", request.nextUrl.pathname);
    return NextResponse.redirect(loginUrl);
  }

  return NextResponse.next();
}
