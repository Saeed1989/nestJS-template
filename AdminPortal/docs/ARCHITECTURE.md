# admin-ui — Architecture

Back-office portal. Next.js App Router application containing both a thin BFF
API layer (Route Handlers) and the React frontend. Port 3004. No database.

## Contents

1. [Request path](#request-path)
2. [Session and authentication](#session-and-authentication)
3. [Route Handler layer](#route-handler-layer)
4. [Upstream contract (auth-config AdminModule)](#upstream-contract-auth-config-adminmodule)
5. [Frontend structure](#frontend-structure)
6. [Authorization model](#authorization-model)
7. [Data lifecycle concerns](#data-lifecycle-concerns)
8. [Environment variables](#environment-variables)
9. [Error handling](#error-handling)
10. [Growth path](#growth-path)

---

## Request path

```
Browser (React Client Component)
  │  fetch('/api/users')            same-origin, cookie sent automatically
  ▼
Route Handler  (app/api/users/route.ts)          ← this repo, server side
  │  reads session cookie, decrypts, extracts access token
  │  attaches Authorization: Bearer <token>
  ▼
gateway :3002  /admin/users
  │  http-proxy-middleware, ThrottlerGuard, Helmet
  ▼
auth-config :3001  AdminModule
  │  AdminGuard → service layer → Prisma
  ▼
auth_config_db
```

Four hops, but only one of them is new infrastructure — the Route Handler,
which is roughly ten lines per endpoint.

The browser has no knowledge of the gateway, auth-config, or any token. From
its perspective the entire system is `/api/*` on its own origin.

---

## Session and authentication

### Why cookies here and not in-browser memory

demo-ui holds its access token in a React state variable and loses it on
refresh. That is acceptable for a demo with a login form and a read-only list.
It is not acceptable for a portal where an admin fills in a create-user form,
tabs away, and comes back.

More importantly: an admin session is a higher-value credential. Keeping it
`httpOnly` means XSS in the admin UI cannot exfiltrate it.

### Cookie contents

A single cookie, `admin_session`, containing an encrypted (not merely signed)
payload:

```ts
{
  accessToken: string,    // 15m lifetime, from auth-config
  refreshToken: string,   // 7d lifetime
  userId: string,
  roles: string[],        // cached for UI rendering only — never for authorization
  expiresAt: number       // access token expiry, epoch ms
}
```

Cookie attributes: `httpOnly`, `secure` (production), `SameSite=Strict`,
`path=/`, `maxAge` matching the refresh token's 7 days.

Encryption uses `SESSION_SECRET`, which is **separate from** auth-config's
`JWT_ACCESS_SECRET` and `JWT_REFRESH_SECRET`. This repo must not be able to mint
or verify JWTs — it only carries them.

The cached `roles` array drives UI affordances (show or hide the Create User
button). It is **never** the basis of an authorization decision. Every decision
is made by auth-config, on every request.

### Refresh flow

Handled entirely server-side inside a shared helper:

1. Route Handler calls `getSession()`
2. If `expiresAt` is within a 60-second skew window, refresh proactively
3. Otherwise forward the request; on a `401` from upstream, refresh once and
   retry the original request exactly once
4. If refresh returns `401`, clear the cookie and return `401` to the browser,
   which redirects to `/login`

Never retry more than once. A refresh loop against a service that is down is
worse than a clean failure.

### middleware.ts

Matches `/admin/:path*`. Checks for the presence and decryptability of
`admin_session`; redirects to `/login` if absent or corrupt.

This is a **presence check, not an authorization check.** It stops unauthenticated
users from loading the shell. It does not and cannot verify that the session
belongs to an admin — only auth-config can do that, and it does so on every API
call.

### CSRF

Mitigated by `SameSite=Strict` plus an `Origin` header check on all mutating
Route Handlers (`POST`, `PATCH`, `DELETE`). Reject if `Origin` is present and
does not match `APP_ORIGIN`.

---

## Route Handler layer

```
app/api/
├── auth/
│   ├── login/route.ts        POST   — exchange credentials for a session cookie
│   ├── logout/route.ts       POST   — clear cookie, tell auth-config to bump tokenVersion
│   └── me/route.ts           GET    — current admin's identity, for the header
├── users/
│   ├── route.ts              GET    — paginated list
│   │                         POST   — create
│   └── [id]/
│       ├── route.ts          PATCH  — update roles / profile
│       │                     DELETE — soft delete (deactivate)
│       └── reactivate/route.ts  POST
└── audit/route.ts            GET    — paginated audit log
```

### Shared helpers (`lib/`)

- `lib/session.ts` — `getSession()`, `setSession()`, `clearSession()`, encryption
- `lib/upstream.ts` — `forward(request, path, init)`: the single function that
  attaches the Bearer token, calls the gateway, handles the 401-refresh-retry,
  and normalises errors. **Every Route Handler goes through this.**
- `lib/guards.ts` — `requireOrigin(request)` for CSRF

A Route Handler that does anything more than call `forward()` and return its
result is a signal that logic has leaked out of auth-config. The one legitimate
exception is `/api/auth/login`, which must set the cookie.

### Canonical handler shape

```ts
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  return forward(request, `/admin/users?${searchParams}`);
}
```

---

## Upstream contract (auth-config AdminModule)

These endpoints are **implemented in auth-config**, not here. Documented so the
frontend can be built against a known shape. All are mounted under `/admin` and
guarded by `AdminGuard` (requires `admin` or `super_admin`).

| Method | Path | Purpose |
|---|---|---|
| GET | `/admin/users` | Paginated list. Query: `page`, `limit`, `search`, `includeInactive` |
| POST | `/admin/users` | Create with email, password, roles |
| GET | `/admin/users/:id` | Single user |
| PATCH | `/admin/users/:id` | Update roles and/or profile fields |
| DELETE | `/admin/users/:id` | Soft delete — sets `isActive: false`, bumps `tokenVersion` |
| POST | `/admin/users/:id/reactivate` | Sets `isActive: true` |
| GET | `/admin/audit` | Paginated audit log |

### Response shapes

List:

```ts
{
  data: AdminUser[],
  meta: { page: number, limit: number, total: number, totalPages: number }
}
```

`AdminUser`:

```ts
{
  id: string,
  email: string,
  roles: string[],
  isActive: boolean,
  mustChangePassword: boolean,
  createdAt: string,
  updatedAt: string
}
```

A password hash is never present in any response. If one appears, that is a
bug in auth-config's serialisation, not something to filter out here.

### Server-enforced invariants

Enforced in auth-config's service layer, inside the same transaction as the
write. Listed here because the UI must handle each resulting error:

| Invariant | Status | UI handling |
|---|---|---|
| Cannot deactivate or demote yourself | `409` | Disable the row's own actions; show inline error if attempted |
| Cannot remove the last `super_admin` | `409` | Show error banner on the roles dialog |
| A plain `admin` cannot modify a `super_admin` | `403` | Hide actions on super-admin rows for non-super admins |
| Email already exists | `409` | Field-level error on the create form |
| Role not in the known set | `400` | Should be unreachable — the UI offers a fixed list |

---

## Frontend structure

```
app/
├── login/page.tsx                    Client Component — the only unauthenticated page
├── admin/
│   ├── layout.tsx                    Server Component — shell, nav, current-admin header
│   ├── users/
│   │   ├── page.tsx                  Server Component — fetches page 1, renders table
│   │   └── _components/
│   │       ├── user-table.tsx        Client — pagination, search, row actions
│   │       ├── create-user-dialog.tsx    Client — form
│   │       ├── edit-roles-dialog.tsx     Client — role multi-select
│   │       └── deactivate-dialog.tsx     Client — confirmation
│   └── audit/page.tsx                Server Component — audit log table
└── api/                              (see above)
```

Server Components do initial data fetches by calling `forward()` directly —
same helper, no HTTP round-trip to our own API. Client Components fetch
`/api/*` for subsequent interactions.

### Component notes

- **Role selection is a fixed multi-select**, not free text. The list of roles
  is a constant shared between this repo and auth-config's static map.
- **Deactivation requires typing the user's email to confirm.** Cheap
  insurance on a destructive-looking action.
- **The create form shows the generated or entered password exactly once**,
  with a copy button and a clear note that it will not be shown again.
- **Row actions are disabled, not hidden, when the current admin lacks
  permission** — with a tooltip explaining why. Hiding them makes the UI feel
  broken; disabling explains it.

---

## Authorization model

Current: **roles only.**

```
super_admin  → everything, including managing other admins
admin        → manage users with role `user`; cannot touch super admins
user         → no access to this portal at all
```

Permissions are derived in auth-config through a static map:

```ts
const ROLE_PERMISSIONS = {
  super_admin: ['user:read', 'user:write', 'user:delete', 'admin:manage'],
  admin:       ['user:read', 'user:write', 'user:delete'],
  user:        [],
};
```

No `Permission` table, no `RolePermission` join, no per-user overrides. The
admin UI edits roles; permissions follow.

### Why not relational permissions now

For a four-service reference architecture, a static map gives the full
authorization *behaviour* with zero schema cost, and the guard's public
interface (`@RequirePermission('user:write')`) is identical either way. Moving
to a relational model later means replacing the map lookup with a database
lookup inside the guard — no controller changes, no UI contract change beyond
swapping the role multi-select for a permission matrix.

The seam is deliberate. Do not scatter role-name string comparisons
(`user.roles.includes('admin')`) through controllers; that is what forecloses
the upgrade.

---

## Data lifecycle concerns

### Soft delete is mandatory

`Item.ownerId` in `data_db` has **no foreign key** to `auth_config_db` — they
are separate databases owned by separate services. Nothing at the database level
prevents deleting a user who owns items, and doing so leaves items whose
ownership checks can never resolve.

Therefore: `DELETE /admin/users/:id` sets `isActive: false` and bumps
`tokenVersion`. The row stays. Ownership lookups continue to work. The user
cannot log in and their refresh tokens are dead.

Hard delete would require a reassign-or-block policy coordinated across two
services. Out of scope.

### Role changes must take effect immediately

An access token carries the roles it was minted with and lives for 15 minutes.
A demotion that takes 15 minutes to apply is a security hole.

The system's existing design solves this: data-service validates every write by
calling auth-config's `POST /auth/validate` rather than decoding the JWT
locally. That endpoint must return the user's **current** roles and
`isActive` status read from the database — not the roles echoed from the token
payload.

Additionally, every role change and deactivation bumps `tokenVersion`, which
invalidates all outstanding refresh tokens for that user.

> This is only true in practice if data-service is actually running
> `RemoteTokenValidator` rather than `AUTH_MODE=mock`. Verify before relying on it.

### Admin-set passwords

The admin who creates a user knows that user's password. `mustChangePassword`
is set to `true` on creation, and the user is forced through a change-password
flow on first login (implemented in auth-config, surfaced by demo-ui — not this
portal).

Hashing uses auth-config's existing implementation and parameters. This repo
never hashes anything.

### Audit log

Every create, update, deactivate, and reactivate writes an `AuditLog` row in
`auth_config_db`, in the same transaction as the change:

```
id, actorId, action, targetUserId, changes (jsonb), createdAt, ip
```

Written by auth-config. Read-only here. Trivial to add now, impossible to
backfill.

---

## Environment variables

```
# Upstream — server-only, never NEXT_PUBLIC_
GATEWAY_URL=http://localhost:3002

# Session
SESSION_SECRET=<32+ random bytes, base64>   # distinct from all JWT secrets
APP_ORIGIN=http://localhost:3004            # for the CSRF origin check

# Next
PORT=3004
```

There are deliberately **no** `NEXT_PUBLIC_*` variables. If one becomes
necessary, it is a signal that something is being done client-side that should
be done in a Route Handler.

---

## Error handling

`forward()` normalises everything into a consistent envelope:

```ts
{ error: { message: string, statusCode: number, code?: string } }
```

Rules:

- **Preserve upstream status codes and messages.** A `409` about the last super
  admin is far more useful to an admin than a generic failure.
- **Never leak upstream URLs or stack traces** into a client response.
- **Gateway unreachable** → `503` with a message naming the gateway
  specifically, so the operator knows which of five processes to restart.
- **Client-side**, `403` and `409` render as inline form or dialog errors;
  `401` triggers a redirect to login; `5xx` renders a page-level banner with a
  retry.

---

## Growth path

Things deliberately not built, with the seam that makes each addable:

| Feature | Seam |
|---|---|
| Per-user permission overrides | Guard interface already permission-based; swap the static map for a DB lookup |
| Cross-service views (user + item count) | Add a Route Handler that calls two gateway paths and composes — no new service |
| Bulk CSV import | New `POST /admin/users/bulk` in auth-config; this repo only uploads |
| SSO / OIDC | Login Route Handler is the single place tokens enter the system |
| IP allowlisting on the admin surface | `middleware.ts`, or the gateway if it should apply before proxying |

None of these require a separate back-office backend service. If one is ever
genuinely needed, the trigger is admin logic that belongs to no existing domain
service — not composition, which Route Handlers already handle.