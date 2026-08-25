import { setSession } from "@/lib/session";
import { requireOrigin } from "@/lib/guards";
import { decodeJwtExpiry } from "@/lib/crypto";

const ADMIN_ROLES = new Set(["admin", "super_admin"]);
const DEFAULT_SKEW_MS = 60_000;

type LoginResponse = {
  accessToken: string;
  refreshToken: string;
  user: { id: string; email: string; roles: string[] };
};

function error(statusCode: number, message: string) {
  return Response.json({ error: { message, statusCode } }, { status: statusCode });
}

export async function POST(request: Request) {
  const originError = requireOrigin(request);
  if (originError) return originError;

  let body: { email?: string; password?: string };
  try {
    body = await request.json();
  } catch {
    return error(400, "Invalid request body");
  }

  if (!body.email || !body.password) {
    return error(400, "Email and password are required");
  }

  const gatewayUrl = process.env.GATEWAY_URL;
  if (!gatewayUrl) throw new Error("GATEWAY_URL is not set");

  let upstream: Response;
  try {
    upstream = await fetch(`${gatewayUrl}/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: body.email, password: body.password }),
      cache: "no-store",
    });
  } catch {
    return error(503, "Cannot reach the gateway");
  }

  if (!upstream.ok) {
    const data = await upstream.json().catch(() => null);
    const message = data?.error?.message ?? data?.message ?? "Login failed";
    return error(upstream.status, message);
  }

  const data: LoginResponse = await upstream.json();

  // Portal-level UX gate, not an authorization decision: auth-config's
  // AdminGuard is what actually enforces access on every admin endpoint.
  // This just avoids handing a session cookie to an account this portal
  // has no use for.
  const isAdmin = data.user.roles.some((role) => ADMIN_ROLES.has(role));
  if (!isAdmin) {
    return error(403, "This account does not have admin access");
  }

  await setSession({
    accessToken: data.accessToken,
    refreshToken: data.refreshToken,
    userId: data.user.id,
    roles: data.user.roles,
    // auth-config doesn't echo an expiry in the response body — read the
    // (unverified) `exp` claim instead, purely to pace proactive refresh.
    expiresAt: decodeJwtExpiry(data.accessToken) ?? Date.now() + DEFAULT_SKEW_MS,
  });

  return Response.json({ userId: data.user.id, email: data.user.email, roles: data.user.roles });
}
