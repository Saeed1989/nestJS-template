"use client";

import { useState, FormEvent } from "react";
import { useAuth } from "@/lib/auth-context";

export function LoginForm() {
  const { login } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    try {
      await login(email, password);
    } catch {
      setError("Login failed. Check your credentials.");
    }
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-3 max-w-sm mx-auto mt-16">
      <h1 className="text-xl font-semibold">Log in</h1>
      <input
        type="email"
        placeholder="Email"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        className="border rounded px-3 py-2"
        required
      />
      <input
        type="password"
        placeholder="Password"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
        className="border rounded px-3 py-2"
        required
      />
      <button type="submit" className="bg-black text-white rounded px-3 py-2">
        Log in
      </button>
      {error && <p className="text-red-600 text-sm">{error}</p>}
    </form>
  );
}
