"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth-context";
import { LoginForm } from "@/components/login-form";

export default function LoginPage() {
  const { token } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (token) router.replace("/items");
  }, [token, router]);

  if (token) return null;
  return <LoginForm />;
}
