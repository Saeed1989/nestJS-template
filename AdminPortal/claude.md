# CLAUDE.md — admin-ui

## Role in the system

Back-office portal for user administration. One deployable that contains **both**
its own API layer (Next.js Route Handlers, acting as a BFF) and its frontend
(React). Port **3004**.

This is the fifth repo in the system. The other four:

| Service | Port | Role |
|---|---|---|
| auth-config | 3001 | JWT auth, RBAC, `/config` store. Owns `auth_config_db`. |
| data-service | 3000 | `/items` CRUD. Owns `data_db`. |
| gateway | 3002 | Reverse proxy to the two above. No DB, no logic. |
| demo-ui | 3003 | Minimal public demo. Login + read-only item list. |
| **admin-ui** | **3004** | **This repo. Admin portal.** |

admin-ui has **no database of its own**. All user data lives in
`auth_config_db` and is reached only through auth-config's `AdminModule`.

## Scope

In scope:

- Admin login (separate session from demo-ui)
- List users, with pagination and search
- Create a user with an initial password and roles
- Edit a user's roles and profile fields
- Deactivate (soft-delete) and reactivate a user
- View the audit log

Out of scope — do not build these without being asked:

- Anything touching `/items` or data-service
- Anything touching `/config` (that stays in auth-config's own surface)
- Self-service registration or password reset by email
- A user-facing profile page
- Multi-tenant or organisation concepts

## The one rule that matters most

**Route Handlers are dumb. All business rules live in auth-config.**

Route handlers exist to do exactly three things:

1. Read the session cookie
2. Attach the access token as a Bearer header
3. Forward the request to the gateway and return the response

Nothing else. Specifically, the following belong to auth-config's `AdminModule`
and must **never** be reimplemented here:

- "Cannot delete the last super admin"
- "Cannot demote or deactivate yourself"
- "A non-super-admin cannot modify a super admin"
- Password hashing
- Audit log writes
- Role validation

If any of those rules live in this repo, there are two sources of truth for
authorization, and anyone calling auth-config directly bypasses them entirely.
The frontend is not a security boundary.

The UI may *mirror* these rules for usability — greying out a disabled Delete
button is fine — but the server must enforce them independently, and the UI must
handle the error response when it does.

## Session model

Deliberately different from demo-ui. demo-ui keeps its token in browser memory
only; that is correct for a public demo and wrong for an admin portal.

Here:

- Tokens never reach the browser
- Login posts to this app's own `/api/auth/login`, which calls auth-config and
  stores the access/refresh pair in an **encrypted, `httpOnly`, `SameSite=Strict`
  cookie**
- Every admin action goes through a same-origin Route Handler that reads the
  cookie server-side
- Refresh is server-side: on a 401 from upstream, refresh once and retry
  transparently; if refresh fails, clear the cookie and redirect to login

Do not add `localStorage`, `sessionStorage`, or any client-held token. Do not
expose the token to a Client Component through props or a context.

## Conventions

- **Next.js App Router.** Route Handlers under `app/api/`, pages under `app/`.
- **Talk to the gateway (3002), not to auth-config (3001) directly.** Server-to-
  server would work, but the gateway is the documented single entry point and
  carries the rate limiting.
- **Tailwind**, matching demo-ui's setup. No component library unless asked.
- **Server Components by default.** Client Components only where interactivity
  demands it (forms, dialogs, table controls) — the inverse of demo-ui.
- **`middleware.ts` gates every `/admin` route** on a valid session. One place,
  not a per-page check.
- Env vars for upstream URLs and secrets are **server-only**. Never prefix them
  with `NEXT_PUBLIC_`.
- Errors from upstream are surfaced with their real message and status. Do not
  swallow a 403 into a generic "something went wrong".

## Authorization decision (current)

**Roles only.** `User.roles` is a `string[]`. The set is fixed:
`super_admin`, `admin`, `user`. Permissions are derived from roles via a static
map in auth-config — there is no `Permission` table and no per-user override.

Editing a user's access therefore means **selecting roles**, not ticking
individual permission checkboxes.

If this changes to relational permissions later, the guard interface in
auth-config is designed to absorb it without the UI contract changing shape —
see `docs/architecture.md`.

## Don'ts

- Don't add a database, an ORM, or Prisma to this repo
- Don't call data-service or auth-config directly — go through the gateway
- Don't put authorization logic in Route Handlers or Client Components
- Don't hard-delete users (see architecture.md on orphaned `Item.ownerId`)
- Don't reuse demo-ui's client-only token pattern here
- Don't create a second password-hashing implementation — auth-config owns it
- Don't add `/config` management UI to this portal without being asked

## Before you start a session

Check whether data-service is still on `AUTH_MODE=mock`. If it is, any
end-to-end verification involving item ownership is meaningless, and role
changes cannot be properly tested. Flag it rather than working around it.

<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->
