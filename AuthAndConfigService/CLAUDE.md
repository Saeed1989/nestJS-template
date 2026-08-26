# Auth & config service

## Role in the system
One of three services in a larger microservices architecture (gateway, auth-config, data).
The data service already exists and depends on this service's POST /auth/validate —
once this is running, flip the data service from AUTH_MODE=mock to AUTH_MODE=remote
and point it at this service's URL.

## Responsibility
- Registration, login, and JWT issuance (access + refresh token pair)
- POST /auth/validate — the single source of truth other services call to check
  "is this token valid, and who does it belong to"
- Role-based access control (roles: string array, e.g. ["user"], ["user","admin"])
- Centralized app config at /config — readable by any authenticated user,
  writable by admins only
- Owns its own Postgres database (auth_config_db), isolated from the data service

## Auth model
- Access token: short-lived (15m), used on every request
- Refresh token: long-lived (7d), used only to get a new access token
- Signed with separate secrets (JWT_ACCESS_SECRET, JWT_REFRESH_SECRET)
- tokenVersion on the User row invalidates all outstanding refresh tokens at
  once when incremented — this is how "log out everywhere" works

## Data model
- User: id, email (unique), passwordHash (bcrypt), name, roles (default ["user"]), tokenVersion (default 0)
- Setting: id, key (unique), value, description

## Stack
- NestJS 10, TypeScript, PostgreSQL + Prisma
- @nestjs/jwt, @nestjs/passport, passport-jwt, passport-local, bcrypt
- class-validator/class-transformer, global ValidationPipe (whitelist + transform)
- Prisma client output to src/generated/prisma

## Commands
- npm run start:dev
- npx prisma generate / npx prisma migrate dev
- npm run db:setup — bootstraps the Postgres role/database, same pattern as
  the data service's scripts/setup-db.ts

## Don'ts
- Never return passwordHash in any response, not even to admins
- Never skip the tokenVersion check on refresh — a stolen refresh token must
  become useless the moment tokenVersion is bumped
- /auth/validate is read-only — no writes, it's on the hot path for every
  other service's protected requests
  

  ## Dev tooling
- Swagger/OpenAPI at /docs, via @nestjs/swagger + the Nest CLI plugin
- Local DB bootstrap script (scripts/setup-db.ts) — creates the Postgres role/database
- Seed script — inserts baseline data for local testing (e.g. an admin user),
  so /config writes and role-gated routes can be tested immediately after setup
  without manually promoting a user via SQL