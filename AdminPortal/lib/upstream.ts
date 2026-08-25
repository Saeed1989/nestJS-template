import { redirect } from "next/navigation";
import { getSession, setSession, type SessionPayload } from "./session";
import { decodeJwtExpiry } from "./crypto";

const SKEW_MS = 60_000;

type RefreshResponse = {
  accessToken: string;
  refreshToken: string;
};

// Thrown for anything the upstream itself reported (401 session expired,
// 403 forbidden, 409 conflict, ...). Distinct from a thrown network error,
// which means the gateway is unreachable rather than having rejected us.
export class UpstreamError extends Error {
  statusCode: number;
  constructor(statusCode: number, message: string) {
    super(message);
    this.statusCode = statusCode;
  }
}

function gatewayUrl(path: string): string {
  const base = process.env.GATEWAY_URL;
  if (!base) throw new Error("GATEWAY_URL is not set");
  return `${base}${path}`;
}

async function extractMessage(response: Response): Promise<string> {
  try {
    const data: unknown = await response.clone().json();
    if (data && typeof data === "object") {
      const d = data as Record<string, unknown>;
      const nested = d.error as Record<string, unknown> | undefined;
      if (typeof nested?.message === "string") return nested.message;
      if (typeof d.message === "string") return d.message;
    }
  } catch {
    // upstream didn't return JSON — fall through to the generic message
  }
  return `Upstream error (${response.status})`;
}

async function callGateway(path: string, init: RequestInit, accessToken: string): Promise<Response> {
  return fetch(gatewayUrl(path), {
    ...init,
    headers: { ...(init.headers ?? {}), Authorization: `Bearer ${accessToken}` },
    cache: "no-store",
  });
}

async function refreshSession(session: SessionPayload): Promise<SessionPayload> {
  const res = await fetch(gatewayUrl("/auth/refresh"), {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ refreshToken: session.refreshToken }),
    cache: "no-store",
  });

  if (!res.ok) {
    // Deliberately not clearing the cookie here: this path runs from both
    // Route Handlers and Server Component renders (via fetchJson), and
    // Server Components cannot mutate cookies — doing so throws a Next
    // runtime error, not an UpstreamError, which broke the 401 handling
    // above it. An invalid cookie just keeps failing the same way on every
    // request until it's overwritten by a fresh login.
    throw new UpstreamError(401, "Session expired");
  }

  const refreshed: RefreshResponse = await res.json();
  const updated: SessionPayload = {
    ...session,
    accessToken: refreshed.accessToken,
    refreshToken: refreshed.refreshToken,
    // auth-config doesn't echo an expiry in the response body — read the
    // (unverified) `exp` claim instead. This only paces the proactive
    // refresh; it's never the basis of an authorization decision.
    expiresAt: decodeJwtExpiry(refreshed.accessToken) ?? Date.now() + SKEW_MS,
  };
  await setSession(updated);
  return updated;
}

// Network failures (gateway down) bubble up as plain Error/TypeError here and
// are turned into a 503 by the two callers below. Only a reachable-but-401
// upstream is treated as "session expired".
async function withSession(path: string, init: RequestInit): Promise<Response> {
  const session = await getSession();
  if (!session) throw new UpstreamError(401, "Not authenticated");

  let current = session;
  if (current.expiresAt - Date.now() < SKEW_MS) {
    current = await refreshSession(current);
  }

  let response = await callGateway(path, init, current.accessToken);

  if (response.status === 401) {
    current = await refreshSession(current);
    response = await callGateway(path, init, current.accessToken);
  }

  return response;
}

function errorEnvelope(statusCode: number, message: string): Response {
  return Response.json({ error: { message, statusCode } }, { status: statusCode });
}

/**
 * Every Route Handler (except /api/auth/login, which must set the cookie)
 * goes through this: attaches the bearer token, forwards to the gateway,
 * refreshes-and-retries once on 401, and normalises errors into
 * { error: { message, statusCode } }.
 */
export async function forward(request: Request, path: string, init: RequestInit = {}): Promise<Response> {
  const method = init.method ?? request.method;
  const hasBody = !["GET", "HEAD"].includes(method);
  const contentType = request.headers.get("content-type");

  let response: Response;
  try {
    response = await withSession(path, {
      method,
      body: init.body ?? (hasBody ? await request.text() : undefined),
      headers: contentType ? { "Content-Type": contentType } : undefined,
      ...init,
    });
  } catch (err) {
    if (err instanceof UpstreamError) return errorEnvelope(err.statusCode, err.message);
    return errorEnvelope(503, "Cannot reach the gateway");
  }

  if (!response.ok) return errorEnvelope(response.status, await extractMessage(response));

  const body = await response.text();
  return new Response(body, {
    status: response.status,
    headers: { "Content-Type": response.headers.get("content-type") ?? "application/json" },
  });
}

/**
 * For Server Components that need parsed data directly, without a round trip
 * through this app's own /api/* Route Handlers.
 */
export async function fetchJson<T>(path: string, init: RequestInit = {}): Promise<T> {
  const response = await withSession(path, init);
  if (!response.ok) throw new UpstreamError(response.status, await extractMessage(response));
  return response.json() as Promise<T>;
}

/**
 * Like fetchJson, but for Server Components rendering behind the /admin
 * gate: a 401 means the session cookie is invalid or refresh already
 * failed, so redirect to /login instead of throwing into the render tree.
 */
export async function fetchJsonOrRedirect<T>(path: string, init: RequestInit = {}): Promise<T> {
  try {
    return await fetchJson<T>(path, init);
  } catch (err) {
    if (!(err instanceof UpstreamError) || err.statusCode !== 401) throw err;
  }
  // redirect() throws internally — it must be called outside the try/catch
  // above, or Next treats it as just another caught error instead of a
  // navigation signal (confirmed: inside the catch, this 500'd instead of
  // redirecting).
  redirect("/login");
}
