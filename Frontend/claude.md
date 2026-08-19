# Demo UI

## Role in the system
A minimal frontend for manually testing the backend (gateway, auth-config, data).
Not a production frontend — no design system beyond Tailwind utilities, no polish
beyond "can I log in and see data."

## Scope — exactly this, nothing more
- Login form → POST /auth/login on the gateway → store the returned accessToken
- On successful login, GET /items on the gateway → render as a plain list
- No register, no create/update/delete, no explicit logout button (refreshing
  the page already clears the in-memory token, same effect)

## Rendering approach (deliberate trade-off, not an oversight)
This app is Client Component only. Next.js's main strength is Server Components
fetching data server-side, but the access token only ever exists in the browser
(in-memory, no cookie) — a Server Component has no way to attach it to a request.
Every component that touches auth state or calls the API must be 'use client'.
Don't move data fetching to a Server Component or a Route Handler — there's no
server-side session to use.

## Talks to
- The gateway only, at http://localhost:3002 — never auth-config or data directly.

## Folder structure
app/
  layout.tsx       — root layout, wraps children in AuthProvider
  page.tsx         — 'use client', renders LoginForm or DataList based on auth state
  globals.css      — Tailwind directives
lib/
  auth-context.tsx — React Context: { token, user }, login()/logout()
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
- Don't persist the token to localStorage — in-memory only, losing it on
  refresh is fine for a demo
- Don't add routing beyond the single page
- Don't add register, create, update, delete, or a logout button — login +
  read-only list is the entire scope
- Don't fetch data in a Server Component or Route Handler
