/**
 * Encryption for the admin_session cookie payload.
 *
 * Pure Web Crypto (no `next/headers`) so this module can be imported from
 * both Route Handlers/Server Components (Node runtime) and middleware.ts
 * (Edge runtime) without pulling in APIs the Edge runtime doesn't have.
 */

export const SESSION_COOKIE_NAME = "admin_session";

export type SessionPayload = {
  accessToken: string;
  refreshToken: string;
  userId: string;
  roles: string[];
  expiresAt: number;
};

function isSessionPayload(value: unknown): value is SessionPayload {
  if (typeof value !== "object" || value === null) return false;
  const v = value as Record<string, unknown>;
  return (
    typeof v.accessToken === "string" &&
    typeof v.refreshToken === "string" &&
    typeof v.userId === "string" &&
    Array.isArray(v.roles) &&
    v.roles.every((r) => typeof r === "string") &&
    typeof v.expiresAt === "number"
  );
}

// Decodes (never verifies) the `exp` claim of a JWT, purely to schedule a
// proactive refresh. Never used for an authorization decision — auth-config
// re-checks the token on every upstream call regardless, so a wrong or
// missing claim here just means an extra refresh, not a security gap.
export function decodeJwtExpiry(token: string): number | null {
  try {
    const payloadB64 = token.split(".")[1];
    if (!payloadB64) return null;
    const json = new TextDecoder().decode(fromBase64Url(payloadB64));
    const payload: unknown = JSON.parse(json);
    const exp = (payload as { exp?: unknown }).exp;
    return typeof exp === "number" ? exp * 1000 : null;
  } catch {
    return null;
  }
}

function toBase64Url(bytes: Uint8Array): string {
  let binary = "";
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

function fromBase64Url(value: string): Uint8Array {
  const padded = value
    .replace(/-/g, "+")
    .replace(/_/g, "/")
    .padEnd(value.length + ((4 - (value.length % 4)) % 4), "=");
  const binary = atob(padded);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return bytes;
}

async function getKey(): Promise<CryptoKey> {
  const secret = process.env.SESSION_SECRET;
  if (!secret) throw new Error("SESSION_SECRET is not set");
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(secret));
  return crypto.subtle.importKey("raw", digest, "AES-GCM", false, ["encrypt", "decrypt"]);
}

export async function encryptSession(payload: SessionPayload): Promise<string> {
  const key = await getKey();
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const plaintext = new TextEncoder().encode(JSON.stringify(payload));
  const ciphertext = await crypto.subtle.encrypt({ name: "AES-GCM", iv }, key, plaintext);
  return `${toBase64Url(iv)}.${toBase64Url(new Uint8Array(ciphertext))}`;
}

// Never throws — a corrupt or tampered cookie is just treated as "no session".
export async function decryptSession(value: string): Promise<SessionPayload | null> {
  try {
    const [ivPart, dataPart] = value.split(".");
    if (!ivPart || !dataPart) return null;
    const key = await getKey();
    const iv = fromBase64Url(ivPart);
    const data = fromBase64Url(dataPart);
    const plaintext = await crypto.subtle.decrypt(
      { name: "AES-GCM", iv: iv as BufferSource },
      key,
      data as BufferSource,
    );
    const payload: unknown = JSON.parse(new TextDecoder().decode(plaintext));
    return isSessionPayload(payload) ? payload : null;
  } catch {
    return null;
  }
}
