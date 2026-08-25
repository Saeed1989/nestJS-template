# NestJS microservices template

A small system of five independently deployable projects, each with its own
repo, its own CLAUDE.md, and its own detailed README. This file is the map
that ties them together — for setup specifics on any one service, see its
own README.

## What it does

- Registers and authenticates users with JWT access/refresh tokens
- Enforces role-based access control (`user`, `admin`, `super_admin`)
- CRUD for a simple "item" resource, with per-owner write permissions
- Centralized app configuration store, readable by anyone, admin-writable
- A public gateway that proxies every service and rate-limits requests
- A minimal demo frontend: log in and browse items
- A full admin portal: list/search users, create accounts, edit roles,
  deactivate/reactivate users, and review an audit log of every admin action

## Architecture

| Service | Port | Responsibility | Depends on |
|---|---|---|---|
| auth-config | 3001 | Auth (JWT), RBAC, /config store | Postgres (auth_config_db) |
| data-service | 3000 | /items CRUD | Postgres (data_db), auth-config (token validation) |
| gateway | 3002 | Public entry point, reverse-proxies to the three below | auth-config, data-service |
| demo-ui | 3003 | Next.js UI: login + read-only item list | gateway only |
| admin-ui | 3004 | Next.js admin portal: list/create users, edit roles, deactivate/reactivate, audit log | gateway only |

Only the gateway is meant to be public-facing. Everything else — including
the demo UI and the admin portal in a real deployment — talks to the
gateway, never directly to auth-config or data-service. admin-ui has no
database of its own; all user data lives in `auth_config_db` and is reached
only through auth-config's `AdminModule`.

## Prerequisites

- Node.js 20+
- PostgreSQL installed natively (no Docker), one local instance serving
  both `auth_config_db` and `data_db`

## First-time setup

Order matters — data-service's remote token validation needs auth-config
already running to succeed, and the gateway/demo-ui need both backends up
to show anything real.

1. **Postgres**: confirm it's running and reachable at `localhost:5432`
2. **auth-config**: `npm install`, `npm run db:setup`, `npx prisma migrate dev`, then its seed command — see `auth-config/README.md`
3. **data-service**: `npm install`, `npm run db:setup`, `npx prisma migrate dev` — see `data-service/README.md`. Confirm `.env` has `AUTH_MODE=remote` and `AUTH_SERVICE_URL=http://localhost:3001`, not the original `mock` value from early development
4. **gateway**: `npm install` — no database, nothing to migrate
5. **demo-ui**: `npm install`
6. **admin-ui**: `npm install` — no database of its own, nothing to migrate. Seed a `super_admin` user via auth-config's seed command first (see step 2) so there's something to log in with — see `admin-ui/README.md`

## Running everything

Each in its own terminal, in this order:

```bash
# terminal 1
cd auth-config && npm run start:dev      # :3001

# terminal 2
cd data-service && npm run start:dev     # :3000

# terminal 3
cd gateway && npm run start:dev          # :3002

# terminal 4
cd demo-ui && npm run dev -- -p 3003     # :3003

# terminal 5
cd admin-ui && npm run dev               # :3004 (already fixed in its own package.json)
```

## Testing the whole system end to end

The demo UI deliberately has no register form (see its CLAUDE.md) — create
a test user via auth-config's own Swagger first:

1. Open `http://localhost:3001/docs` → `POST /auth/register` → create a user
2. Create a sample item so there's something to see: `POST /items` via
   `http://localhost:3000/docs` (data-service's own Swagger), using the
   accessToken from step 1
3. Open `http://localhost:3003`, log in with the same credentials
4. Confirm the item from step 2 renders in the list

If step 4 fails but steps 1–3 work, the gateway's proxy or CORS config is
the first place to look — everything up to that point never touches the
gateway.

To check the admin portal: seed auth-config's baseline `super_admin` user
(its seed command, see step 2 of setup), open `http://localhost:3004`, and
log in with those credentials. You should land on `/admin` and be able to
list users, create one, edit its roles, and deactivate/reactivate it.

## Full port map

| Port | Service |
|---|---|
| 3000 | data-service |
| 3001 | auth-config |
| 3002 | gateway |
| 3003 | demo-ui |
| 3004 | admin-ui |
| 5432 | Postgres |

## Troubleshooting

Common issues (`psql` not found, Prisma `P1000` auth errors, the Windows
query-engine file lock) are covered in each backend service's own README,
since the fixes are identical regardless of which service hit them. Port
conflicts between these five are the one issue specific to running them
together — the table above is the source of truth if something's binding
to the wrong port.