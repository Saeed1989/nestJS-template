"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth-context";
import { DataList } from "@/components/data-list";

export default function ItemsPage() {
  const { token } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!token) router.replace("/login");
  }, [token, router]);

  if (!token) return null;
  return <DataList />;
}
