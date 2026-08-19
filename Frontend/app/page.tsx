"use client";

import { useAuth } from "@/lib/auth-context";
import { LoginForm } from "@/components/login-form";
import { DataList } from "@/components/data-list";

export default function Home() {
  const { token } = useAuth();
  return token ? <DataList /> : <LoginForm />;
}
