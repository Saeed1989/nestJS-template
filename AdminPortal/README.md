# Admin Portal

Back-office portal for user administration. One deployable that contains
both its own API layer (Next.js Route Handlers, acting as a thin
backend-for-frontend) and its React frontend. Port **3004**.

admin-ui has **no database of its own**. All user data lives in
`auth_config_db` and is reached only through auth-config's `AdminModule`,
by way of the gateway. This README only covers getting a local instance
running and exercising it end to end. For the session model, the Route
Handler contract, and the authorization rules, see
[docs/ARCHITECTURE.md](docs/ARCHITECTURE.md).

## Scope

- Admin login (a session separate from demo-ui's)
- List users, with pagination and search
- Create a user with an initial password and roles
- Edit a user's roles
- Deactivate (soft-delete) and reactivate a user
- View the audit log

Out of scope: anything touching `/items` or data-service, `/config`
management, self-service registration or password reset, and a
user-facing profile page. See `CLAUDE.md` for the full list and the
reasoning behind it.

## Stack

- Next.js (App Router), Server Components by default — Client Components
  only where interactivity demands it (forms, dialogs, table controls)
- Tailwind CSS, no component library
- Plain `fetch` — no axios, no React Query, no Redux

## Session model

Deliberately different from demo-ui. Tokens never reach the browser: login
posts to this app's own `/api/auth/login`, which calls auth-config and
stores the access/refresh pair in an encrypted, `httpOnly`,
`SameSite=Strict` cookie. Every admin action goes through a same-origin
Route Handler that reads that cookie server-side, attaches it as a Bearer
header, and forwards to the gateway. `proxy.ts` (Next 16's replacement for
`middleware.ts`) gates every `/admin/:path*` route on that cookie being
present and decryptable.

Full detail — refresh timing, the 401-retry-once rule, CSRF, cookie
contents — is in `docs/ARCHITECTURE.md`.

## Talks to

The gateway only, at `http://localhost:3002` — never auth-config directly.
Server-to-server would work, but the gateway is the documented single
entry point and carries the rate limiting.

## Prerequisites

- Node.js 20+
- auth-config and the gateway running, with auth-config's Postgres
  instance reachable — admin-ui has no database of its own, so there's
  nothing here to migrate or seed. See the top-level
  [README.md](../README.md) for bringing up the whole system.

## First-time setup

1. **Copy the env file:**

   ```bash
   cp .env.example .env.local
   ```

   Generate a real `SESSION_SECRET` (32+ random bytes, base64) — it must
   be distinct from auth-config's `JWT_ACCESS_SECRET`/`JWT_REFRESH_SECRET`,
   since this app must never be able to mint or verify a JWT itself, only
   carry one:

   ```bash
   node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"
   ```

   Leave `GATEWAY_URL` and `APP_ORIGIN` at their defaults for local dev.

2. **Install dependencies:**

   ```bash
   npm install
   ```

3. **Seed an admin account.** admin-ui can't create its own first user —
   that would be a chicken-and-egg problem, and user creation belongs to
   auth-config anyway. From `auth-config`:

   ```bash
   npx prisma db seed
   ```

   This creates `admin@example.com` / `Admin123!` with `roles: ["super_admin"]`.
   Idempotent — safe to re-run.

## Running the service

```bash
npm run dev
```

The port is already fixed in `package.json` (`next dev -p 3004`). Confirm
it's up:

```bash
curl http://localhost:3004/login
```

## Testing the whole flow

With auth-config, the gateway, and admin-ui all running:

1. Open **http://localhost:3004** — you're redirected to `/login`.
2. Sign in with `admin@example.com` / `Admin123!`. You land on `/admin`.
3. **Users** — list, search, and paginate. The table shows every seeded
   user from `auth_config_db`.
4. **Create a user** — fill in email/name/password, pick at least one
   role, submit. The password is shown exactly once with a copy button.
5. **Edit roles** — open a row's "Edit roles" dialog, change the
   selection, save. Try it on your own row: it's disabled, since an admin
   can't modify their own access.
6. **Deactivate / reactivate** — deactivating requires typing the user's
   email to confirm. Once deactivated, that user can no longer log in
   anywhere in the system, immediately — not just after their token
   expires.
7. **Audit log** — `/admin/audit` shows every create/update/deactivate/
   reactivate, newest first.

If a plain `admin` (not `super_admin`) tries to touch a `super_admin` row,
every action is disabled with a tooltip explaining why — that's
auth-config enforcing it, not just the UI hiding buttons.

## Folder structure

```
app/
  login/page.tsx                 — the only unauthenticated page
  admin/
    layout.tsx                   — shell, nav, current-admin header
    page.tsx                     — dashboard
    users/page.tsx                — Server Component, initial fetch + table
    users/_components/            — create/edit-roles/deactivate dialogs, table
    audit/page.tsx                — paginated, read-only
  api/
    auth/{login,logout,me}/       — session Route Handlers
    users/, users/[id]/,
    users/[id]/reactivate/        — forward()-only Route Handlers
    audit/                        — forward()-only Route Handler
proxy.ts                         — gates /admin/:path* on session presence
lib/
  session.ts, crypto.ts           — encrypted cookie read/write
  upstream.ts                     — forward(), fetchJson(), the 401-refresh-retry logic
  identity.ts                     — current-admin lookup for Server Components
  client-fetch.ts                 — useApiFetch(), redirects to /login on a 401
  guards.ts                       — CSRF origin check
  roles.ts, types.ts              — shared role list and response shapes
```

## Scripts

| Command | Description |
|---|---|
| `npm run dev` | Start dev server on port 3004 |
| `npm run build` | Production build |
| `npm run start` | Serve the production build |
| `npm run lint` | Run ESLint |

## Troubleshooting

**Every admin action fails with a 503**
`GATEWAY_URL` is wrong, or the gateway isn't running. The error message
names the gateway specifically so you know which of the five processes to
check.

**403 "Origin does not match this application"**
Every mutating Route Handler (`POST`/`PATCH`/`DELETE`) checks the
`Origin` header against `APP_ORIGIN`. If you're calling one directly with
curl instead of through the browser, add `-H "Origin: http://localhost:3004"`.

**Logged in, but immediately redirected back to `/login`**
The session cookie is present but auth-config rejected it — most likely
the account was deactivated, or `auth-config`'s database isn't the one
you think it is. Check by logging in directly against the gateway:
`POST http://localhost:3002/auth/login`.

**Role changes or deactivation "not taking effect"**
Confirm you're testing against auth-config's `/auth/validate` path (i.e.
this isn't about `/items` — `data-service` is a separate concern, and its
own `AUTH_MODE=mock`/`remote` setting has nothing to do with this app).
Within admin-ui itself, role/deactivation changes take effect immediately
on the next request — there's no caching layer to clear.

**Password isn't shown again after closing the create-user dialog**
That's by design — see the Scope section above. There's currently no
"reset a user's password" flow in this portal, so if it's lost before
being handed off, the only recourse today is deactivating that account
and creating a new one.

## Don'ts

- Don't add `localStorage`, `sessionStorage`, or any client-held token
- Don't call data-service or auth-config directly — go through the gateway
- Don't put authorization logic in Route Handlers or Client Components —
  every rule enforced here must also be enforced by auth-config
- Don't add a database, an ORM, or Prisma to this repo
- Don't reuse demo-ui's client-only token pattern here

See `CLAUDE.md` for the full list and the reasoning behind each one.
