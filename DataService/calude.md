# Data service

## Role in the system
One of three services in a larger microservices architecture (gateway, auth-config, data).
This file covers the data service only — it's being built independently, and the
auth-config service does not exist in this workspace yet.

See @docs/architecture.md for the full module/guard/interceptor breakdown and naming conventions.

## Responsibility
- Owns its own Postgres database (data_db) via Prisma — isolated from any other service
- CRUD endpoints for [your resource] — id, ownerId, plus your domain fields
- Reads (GET) are public; writes (POST/PATCH/DELETE) require a valid access token

## External dependency (not built yet — stub it)
In the target architecture, writes verify tokens by calling:
  POST http://<auth-service-host>/auth/validate  body: { token }
  response: { valid: boolean, user: { id, email, roles } }

Until that service exists, put a TokenValidator interface behind the guard with two
implementations:
- MockTokenValidator — returns a fixed fake user, used now (AUTH_MODE=mock)
- RemoteTokenValidator — the real HTTP call, used later (AUTH_MODE=remote)
Only the env var and the validator implementation change later — the guard and every
route using it stay identical.

## Data model
- id, title, description, ownerId, createdAt, updatedAt (rename to your real domain)
- Every write checks ownerId === requester.id, or requester has the "admin" role

## Stack
- NestJS 10, TypeScript, PostgreSQL + Prisma
- class-validator/class-transformer, global ValidationPipe (whitelist + transform)
- Prisma client output to src/generated/prisma

## Commands
- npm run start:dev
- npx prisma generate / npx prisma migrate dev
- docker compose up -d for local Postgres

## Don'ts
- Don't hardcode the mock user in more than one place — one constant, reused
- Don't decode JWTs locally here, even once the real auth service exists — always verify
  via the remote call, never inline JWT logic in this service