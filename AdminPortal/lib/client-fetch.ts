"use client";

import { useRouter } from "next/navigation";
import { useCallback } from "react";

// Every authenticated admin-ui action should fetch through this instead of
// a raw fetch(): a 401 means the session cookie is invalid or refresh
// already failed server-side, so send the browser to /login instead of
// leaving the caller to show a raw "not authenticated" error inline.
export function useApiFetch() {
  const router = useRouter();

  return useCallback(
    async (input: string, init?: RequestInit): Promise<Response> => {
      const res = await fetch(input, init);
      if (res.status === 401) {
        router.push("/login");
      }
      return res;
    },
    [router],
  );
}
