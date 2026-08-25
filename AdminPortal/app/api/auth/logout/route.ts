import { getSession, clearSession } from "@/lib/session";
import { requireOrigin } from "@/lib/guards";

export async function POST(request: Request) {
  const originError = requireOrigin(request);
  if (originError) return originError;

  const session = await getSession();
  if (session) {
    try {
      await fetch(`${process.env.GATEWAY_URL}/auth/logout`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${session.accessToken}`,
        },
        body: JSON.stringify({ refreshToken: session.refreshToken }),
        cache: "no-store",
      });
    } catch {
      // Best-effort: clearing the local cookie below is what actually logs
      // the browser out. A failure here just leaves the refresh token valid
      // upstream until it expires on its own.
    }
  }

  await clearSession();
  return Response.json({ ok: true });
}
