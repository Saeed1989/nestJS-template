"use client";

import { createContext, useContext, useState, useEffect, ReactNode } from "react";
import { apiFetch } from "./api";

type User = Record<string, unknown>;

type AuthContextValue = {
  token: string | null;
  user: User | null;
  hydrated: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => void;
};

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

const TOKEN_COOKIE = "accessToken";

function getCookie(name: string): string | null {
  const match = document.cookie.match(new RegExp(`(?:^|; )${name}=([^;]*)`));
  return match ? decodeURIComponent(match[1]) : null;
}

function setCookie(name: string, value: string) {
  // No max-age/expires: a session cookie, cleared when the browser closes.
  document.cookie = `${name}=${encodeURIComponent(value)}; path=/; SameSite=Lax`;
}

function clearCookie(name: string) {
  document.cookie = `${name}=; path=/; max-age=0`;
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [token, setToken] = useState<string | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    setToken(getCookie(TOKEN_COOKIE));
    setHydrated(true);
  }, []);

  async function login(email: string, password: string) {
    const data = await apiFetch("/auth/login", null, {
      method: "POST",
      body: JSON.stringify({ email, password }),
    });
    setToken(data.accessToken);
    setUser(data.user ?? null);
    setCookie(TOKEN_COOKIE, data.accessToken);
  }

  function logout() {
    setToken(null);
    setUser(null);
    clearCookie(TOKEN_COOKIE);
  }

  return (
    <AuthContext.Provider value={{ token, user, hydrated, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
