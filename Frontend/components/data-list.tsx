"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/lib/auth-context";
import { apiFetch } from "@/lib/api";

type Item = { id: string | number; [key: string]: unknown };

export function DataList() {
  const { token } = useAuth();
  const [items, setItems] = useState<Item[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    apiFetch("/items", token)
      .then(setItems)
      .catch(() => setError("Failed to load items."));
  }, [token]);

  if (error) return <p className="text-red-600 text-sm max-w-sm mx-auto mt-16">{error}</p>;
  if (!items) return <p className="max-w-sm mx-auto mt-16">Loading…</p>;

  return (
    <ul className="flex flex-col gap-2 max-w-sm mx-auto mt-16">
      {items.map((item) => (
        <li key={item.id} className="border rounded px-3 py-2">
          {JSON.stringify(item)}
        </li>
      ))}
    </ul>
  );
}
