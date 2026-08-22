"use client";

import { use, useEffect, useState, FormEvent } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useAuth } from "@/lib/auth-context";
import { apiFetch } from "@/lib/api";

type Item = { id: string; title: string; description?: string | null; [key: string]: unknown };

export default function ItemDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const { token, hydrated } = useAuth();
  const router = useRouter();

  const [item, setItem] = useState<Item | null>(null);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [loadError, setLoadError] = useState<string | null>(null);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    if (hydrated && !token) router.replace("/login");
  }, [hydrated, token, router]);

  useEffect(() => {
    if (!hydrated || !token) return;
    apiFetch(`/items/${id}`, token)
      .then((data: Item) => {
        setItem(data);
        setTitle(data.title);
        setDescription(data.description ?? "");
      })
      .catch(() => setLoadError("Failed to load item."));
  }, [hydrated, token, id]);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setSaveError(null);
    setSaved(false);
    try {
      const updated = await apiFetch(`/items/${id}`, token, {
        method: "PATCH",
        body: JSON.stringify({ title, description }),
      });
      setItem(updated);
      setSaved(true);
    } catch {
      setSaveError("Failed to save item. You may not have permission to edit it.");
    }
  }

  if (!hydrated || !token) return null;
  if (loadError) return <p className="text-red-600 text-sm max-w-sm mx-auto mt-16">{loadError}</p>;
  if (!item) return <p className="max-w-sm mx-auto mt-16">Loading…</p>;

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-3 max-w-sm mx-auto mt-16">
      <Link href="/items" className="text-sm text-blue-600">
        &larr; Back to items
      </Link>
      <h1 className="text-xl font-semibold">Edit item</h1>
      <input
        type="text"
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        className="border rounded px-3 py-2"
        required
      />
      <textarea
        value={description}
        onChange={(e) => setDescription(e.target.value)}
        className="border rounded px-3 py-2"
        rows={4}
      />
      <button type="submit" className="bg-black text-white rounded px-3 py-2">
        Save
      </button>
      {saved && <p className="text-green-600 text-sm">Saved.</p>}
      {saveError && <p className="text-red-600 text-sm">{saveError}</p>}
    </form>
  );
}
