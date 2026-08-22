"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth-context";
import { LoginForm } from "@/components/login-form";

export default function LoginPage() {
  const { token, hydrated } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (hydrated && token) router.replace("/items");
  }, [hydrated, token, router]);

  if (!hydrated || token) return null;
  return <LoginForm />;
}
