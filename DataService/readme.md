# Data Service

NestJS 10 REST API with PostgreSQL (via Prisma). One of three services in a larger microservices architecture — gateway, auth-config, and this one.

For internal module structure, guards, interceptors, and naming conventions see [docs/architecture.md](docs/architecture.md).

---

## 1. Prerequisites

- **Node.js 20+** and **npm 10+** — [nodejs.org](https://nodejs.org)
- **PostgreSQL** installed natively on the host, listening on port **5432** — [postgresql.org/download](https://www.postgresql.org/download/)

  After installation, confirm `psql` is on your PATH:
  ```bash
  psql --version
  ```
  If the command is not found, PostgreSQL's `bin` directory was not added to PATH, or the terminal was opened before the installer updated it. Close and reopen the terminal, then check your system PATH if it still fails.

---

## 2. First-time setup

### 2a. Copy the environment file

```bash
cp .env.example .env
```

Open `.env` and fill in the values for your machine. The defaults assume a locally installed PostgreSQL with the `postgres` superuser:

| Variable | Purpose | Default in `.env.example` |
|---|---|---|
| `DATABASE_URL` | App connection string — role, password, host, and database the service uses at runtime | `postgresql://user:password@localhost:5432/data_db` |
| `POSTGRES_ADMIN_URL` | Superuser connection used **once** by `db:setup` to create the app role and database. The running app never reads this variable. | `postgresql://postgres:postgres@localhost:5432/postgres` |
| `AUTH_MODE` | Token validation mode. `mock` returns a fixed user for any token; `remote` calls the real auth service (not built yet). | `mock` |
| `PORT` | HTTP port the service binds to | `3000` |

> **Keep `.env` gitignored.** Local credentials are intentionally simple — never commit or share this file.

### 2b. Install dependencies

```bash
npm install
```

### 2c. Create the Postgres role and database

```bash
npm run db:setup
```

This runs `scripts/setup-db.ts`, which:

1. Parses `DATABASE_URL` to extract the target role name, password, and database name.
2. Connects to Postgres using `POSTGRES_ADMIN_URL` (the superuser connection) — necessary because the target role doesn't exist yet.
3. Creates the role if it doesn't exist.
4. Creates the database if it doesn't exist, owned by that role.

The script is idempotent — running it again after the first time prints "already exists" for each resource and exits cleanly. `POSTGRES_ADMIN_URL` is never used after this point; the running application connects exclusively via `DATABASE_URL`.

### 2d. Apply migrations

```bash
npx prisma migrate dev --name init
```

This creates the `Item` table in the database. Re-run with a new `--name` whenever you add a migration.

### 2e. (Optional) Seed mock data

```bash
npm run seed
```

Inserts 6 sample items across three owner IDs. The first three are owned by the mock user so you can immediately test write routes. Safe to re-run — it clears and re-inserts every time.

---

## 3. Running the service

```bash
npm run start:dev
```

The service compiles and starts in watch mode. You should see:

```
Data service listening on port 3000
Swagger UI at http://localhost:3000/docs
```

**Confirm it's up** by hitting the health endpoint:

```bash
curl http://localhost:3000/health
```

Expected response when the database is reachable:

```json
{ "status": "ok", "database": "up", "timestamp": "..." }
```

---

## 4. Testing via Swagger

Open **http://localhost:3000/docs** in a browser.

### Auth in mock mode

With `AUTH_MODE=mock` (the default), the service accepts any Bearer token value and returns a fixed internal user. This is intentional — the real auth service doesn't exist yet. When you click **Authorize** in Swagger and paste any string (e.g. `mock-token`), all protected routes will succeed as that mock user. This is not a security gap in the service logic; the `MockTokenValidator` will be replaced by a real HTTP call to the auth service once it exists, with no changes to guards or routes.

### Worked example: create and retrieve an item

**Step 1 — Authorize**

Click the **Authorize** button (top right), enter any string in the Bearer token field, and click Authorize.

**Step 2 — Create an item**

Expand `POST /items`, click **Try it out**, and submit:

```json
{
  "title": "My first item",
  "description": "Created via Swagger"
}
```

The response includes the new item's `id`.

**Step 3 — Retrieve it**

Expand `GET /items` and execute — your new item appears in the list.
Or use `GET /items/{id}` with the `id` from step 2 to fetch it directly.

---

## 5. Troubleshooting

### `psql: command not found`

PostgreSQL's `bin` directory is not on PATH, or the terminal was opened before the installer modified PATH. Close and reopen the terminal. If the problem persists, find the `bin` directory (e.g. `C:\Program Files\PostgreSQL\16\bin` on Windows) and add it to your system PATH manually.

### Prisma error `P1000` — authentication failed

The role either was never created or its password doesn't match `DATABASE_URL`.

Check whether the role exists:

```sql
-- connect as the postgres superuser
psql -U postgres -c "\du"
```

If the role is missing, `db:setup` didn't run or failed — run it again and check the output for errors.

If the role exists but the password is wrong, reset it to match the password in `DATABASE_URL`:

```sql
psql -U postgres -c "ALTER ROLE \"user\" WITH PASSWORD 'password';"
```

### `"user"` is a reserved SQL keyword

If you kept the default role name `user` from `.env.example`, raw SQL must double-quote it (`"user"`). You do not need to quote it in `DATABASE_URL` or in `psql` commands that take the role name as a flag value — only inside SQL statement strings. The `db:setup` script handles this automatically.

### The app starts but `.env` values aren't picked up

Make sure the file is named exactly `.env` (not `.env.txt` or `copy of .env.example`) and lives at the project root alongside `package.json`. The env validation class will throw at boot and print which variable is missing if `DATABASE_URL` is not set.
