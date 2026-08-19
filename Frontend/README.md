# Demo UI

A minimal frontend for manually testing the backend (gateway, auth-config, data).
Not a production frontend — no design system beyond Tailwind utilities, no polish
beyond "can I log in and see data."

## Scope

- Login form → `POST /auth/login` on the gateway → store the returned `accessToken`
- On successful login, `GET /items` on the gateway → render as a plain list
- No register, no create/update/delete, no explicit logout button (refreshing
  the page already clears the in-memory token, same effect)

## Stack

- [Next.js](https://nextjs.org/) (App Router)
- Tailwind CSS
- Plain `fetch` — no axios, no React Query, no Redux
- React Context for the token, in-memory only

## Rendering approach

This app is Client Component only. The access token only ever exists in the
browser (in-memory, no cookie), so there's no server-side session a Server
Component could use to fetch data. Every component that touches auth state or
calls the API is `'use client'`.

## Talks to

The gateway only, at `http://localhost:3002` — never auth-config or data directly.

## Getting started

Install dependencies and start the dev server:

```bash
npm install
npm run dev
```

The app runs on [http://localhost:3003](http://localhost:3003) (3000/3001/3002
are already taken by data, auth-config, and gateway). Make sure the gateway is
running first.

## Folder structure

```
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
```

## Scripts

| Command         | Description                     |
| ---------------- | -------------------------------- |
| `npm run dev`    | Start dev server on port 3003    |
| `npm run build`  | Production build                 |
| `npm run start`  | Serve the production build       |
| `npm run lint`   | Run ESLint                       |

## Don'ts

- Don't persist the token to `localStorage` — in-memory only, losing it on
  refresh is fine for a demo
- Don't add routing beyond the single page
- Don't add register, create, update, delete, or a logout button — login +
  read-only list is the entire scope
- Don't fetch data in a Server Component or Route Handler
