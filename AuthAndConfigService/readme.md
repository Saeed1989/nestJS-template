# Auth & Config Service

Registration, JWT auth, and centralized app config for the microservices
architecture (gateway, auth-config, data). This is the service the others
call to answer "is this token valid, and who does it belong to."

For internal module structure and the access/refresh token model, see
[docs/architecture.md](docs/architecture.md). This README only covers
getting a local instance running and exercising it through Swagger.

## Prerequisites

- Node.js and npm
- PostgreSQL installed natively on the host (no Docker), listening on port 5432

## First-time setup

1. **Copy the env file and fill in real secrets:**

   ```bash
   cp .env.example .env
   ```

   `.env.example` ships with placeholder values — replace `JWT_ACCESS_SECRET`
   and `JWT_REFRESH_SECRET` with real random values before running the
   service, e.g.:

   ```bash
   node -e "console.log(require('crypto').randomBytes(48).toString('hex'))"
   ```

   Run it twice and paste one output into each secret. Leave
   `POSTGRES_ADMIN_URL` pointing at your local Postgres superuser — it's
   only used once, as a bootstrap connection for the next step, and is
   never read by the running app.

2. **Install dependencies:**

   ```bash
   npm install
   ```

3. **Create the app's Postgres role and database:**

   ```bash
   npm run db:setup
   ```

   This runs `scripts/setup-db.ts`, which connects using
   `POSTGRES_ADMIN_URL` and creates the role/database described by
   `DATABASE_URL` (role `user`, database `auth_config_db` by default). It's
   idempotent — safe to re-run.

4. **Run the initial migration:**

   ```bash
   npx prisma migrate dev --name init
   ```

5. **Seed baseline data:**

   ```bash
   npx prisma db seed
   ```

   This creates an admin user for local testing:

   - email: `admin@example.com`
   - password: `Admin123!`
   - roles: `["admin"]`

   You'll need this account to test `POST /config`, since config writes are
   admin-only. Re-running the seed is safe — it checks for the account
   before creating it.

## Running the service

```bash
npm run start:dev
```

Confirm it's up:

```bash
curl http://localhost:3001/health
```

A healthy response looks like:

```json
{ "status": "ok", "database": "up", "timestamp": "..." }
```

## Testing via Swagger

Open **http://localhost:3001/docs**.

This is a full real flow against the running service — there's no mock
mode here.

1. **Get an access token.** Either:
   - `POST /auth/register` with a new email/password/name, or
   - `POST /auth/login` with the seeded admin account
     (`admin@example.com` / `Admin123!`)

   Either call returns an `accessToken` (15m) and `refreshToken` (7d) in the
   response body.

2. **Authorize.** Click **Authorize** in Swagger and paste the
   `accessToken` (no `Bearer ` prefix needed — Swagger adds it).

3. **`GET /auth/me`** — works for any authenticated user. Returns the
   `{ id, email, roles }` payload extracted from your token.

4. **`GET /config`** — also works for any authenticated user (read access
   isn't role-gated). Returns the list of settings currently in the
   database (empty array on a fresh DB, since the seed only creates the
   admin user).

5. **`POST /config`** — admin-only. With the admin token from step 1, this
   succeeds and creates a setting:

   ```json
   { "key": "feature.betaEnabled", "value": "true", "description": "Enables beta features" }
   ```

   If you instead register a plain user in step 1 (roles `["user"]`) and
   try the same call, you'll get:

   ```json
   { "statusCode": 403, "message": "Forbidden resource" }
   ```

   This is `RolesGuard` rejecting a non-admin token — the expected
   behavior, not a bug.

## Troubleshooting

**`psql` not found**
Postgres's `bin` directory isn't on your `PATH`, or your terminal was
opened before the install finished updating it. Reopen the terminal after
confirming the Postgres install added itself to `PATH`.

**Prisma `P1000: Authentication failed`**
Either the app role was never created, or its password doesn't match
`DATABASE_URL`. Check with:

```sql
\du
```

If the role is missing, re-run `npm run db:setup`. If it exists but the
password is wrong (e.g. you edited `DATABASE_URL` after the role was
created), fix it directly:

```sql
ALTER ROLE "user" WITH PASSWORD 'password';
```

**`"user" is a reserved SQL keyword`**
The default role/table name in this project is literally `user`, which
collides with a reserved word in Postgres. In any raw SQL (like the
`ALTER ROLE` above), double-quote it: `"user"`. Unquoted `user` will
either fail or silently refer to the built-in `CURRENT_USER`.

**401 on protected routes (`/auth/me`, `/config`)**
Two common causes:
- The access token expired — they're short-lived (15m by design). Call
  `POST /auth/refresh` with your `refreshToken` to get a new
  `accessToken` without logging in again.
- The `Authorization` header is missing the `Bearer ` prefix. If you're
  calling the API directly (not through Swagger's Authorize button),
  make sure the header is `Authorization: Bearer <accessToken>`.

**Keep `.env` out of git**
`.env` is already gitignored, but it's worth calling out here
specifically: this file holds `JWT_ACCESS_SECRET` and
`JWT_REFRESH_SECRET`, not just DB credentials. Leaking either lets an
attacker mint valid tokens for any user. Never commit it, and rotate both
secrets (which invalidates every outstanding token) if one ever leaks.
