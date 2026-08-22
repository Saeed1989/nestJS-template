# Demo UI

## Role in the system
A minimal frontend for manually testing the backend (gateway, auth-config, data).
Not a production frontend — no design system beyond Tailwind utilities, no polish
beyond "can I log in and see data."

## Scope — exactly this, nothing more
- Login form on /login → POST /auth/login on the gateway → store the returned
  accessToken → redirect to /items
- /items → GET /items on the gateway → render as a plain list; redirects to
  /login if there's no in-memory token (e.g. after a refresh)
- / redirects to /login or /items depending on whether a token is held
- No register, no create/update/delete, no explicit logout button (refreshing
  the page already clears the in-memory token, same effect)

## Rendering approach (deliberate trade-off, not an oversight)
This app is Client Component only. Next.js's main strength is Server Components
fetching data server-side, but the access token is held in React state, only
mirrored into a plain (non-httpOnly) session cookie so a reload can rehydrate
it — it's never read server-side, so a Server Component still has no way to
attach it to a request. Every component that touches auth state or calls the
API must be 'use client'. Don't move data fetching to a Server Component or a
Route Handler — there's no server-side session to use.

## Talks to
- The gateway only, at http://localhost:3002 — never auth-config or data directly.

## Folder structure
app/
  layout.tsx       — root layout, wraps children in AuthProvider
  page.tsx         — 'use client', redirects to /login or /items based on auth state
  login/page.tsx   — 'use client', renders LoginForm; redirects to /items if already
                      authed
  items/page.tsx   — 'use client', renders DataList; redirects to /login if no token
  globals.css      — Tailwind directives
lib/
  auth-context.tsx — React Context: { token, user, hydrated }, login()/logout();
                      mirrors the token into a session cookie (cleared when the
                      browser closes) and rehydrates from it on mount
  api.ts           — fetch wrapper, base URL = gateway, attaches Bearer token
components/
  login-form.tsx
  data-list.tsx    — renders GET /items

## Stack
- Next.js (App Router), Tailwind CSS
- Plain fetch — no axios, no React Query, no Redux
- React Context for the token, in-memory only

## Port
- Dev server on 3003 (next dev -p 3003) — 3000/3001/3002 are already taken by
  data, auth-config, and gateway

## Don'ts
- Don't persist the token to localStorage — it's mirrored to a session cookie
  only (cleared when the browser closes, not on a plain reload) and read back
  via `hydrated` in AuthProvider, not localStorage
- Don't add routing beyond /, /login, and /items
- Don't add register, create, update, delete, or a logout button — login +
  read-only list is the entire scope
- Don't fetch data in a Server Component or Route Handler
