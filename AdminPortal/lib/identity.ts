import { redirect } from "next/navigation";
import { fetchJson, UpstreamError } from "@/lib/upstream";

export type Identity = { id: string; email: string; roles: string[] };

export async function loadIdentity(): Promise<Identity | null> {
  try {
    return await fetchJson<Identity>("/auth/me");
  } catch (err) {
    if (!(err instanceof UpstreamError) || err.statusCode !== 401) {
      // Non-auth failure (e.g. gateway hiccup) — still render the shell.
      return null;
    }
  }
  // redirect() throws internally — it must be called outside the try/catch
  // above, or Next treats it as just another caught error instead of a
  // navigation signal.
  redirect("/login");
}
