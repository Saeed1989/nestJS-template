import { cookies } from "next/headers";
import { SESSION_COOKIE_NAME, encryptSession, decryptSession, type SessionPayload } from "./crypto";

export type { SessionPayload };
export { decryptSession, SESSION_COOKIE_NAME };

const MAX_AGE_SECONDS = 60 * 60 * 24 * 7; // 7 days, matches refresh token lifetime

export async function getSession(): Promise<SessionPayload | null> {
  const store = await cookies();
  const raw = store.get(SESSION_COOKIE_NAME)?.value;
  if (!raw) return null;
  return decryptSession(raw);
}

export async function setSession(payload: SessionPayload): Promise<void> {
  const store = await cookies();
  store.set(SESSION_COOKIE_NAME, await encryptSession(payload), {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "strict",
    path: "/",
    maxAge: MAX_AGE_SECONDS,
  });
}

export async function clearSession(): Promise<void> {
  const store = await cookies();
  store.delete(SESSION_COOKIE_NAME);
}
