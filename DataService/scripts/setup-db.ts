/**
 * Idempotent local DB bootstrap.
 *
 * Reads DATABASE_URL to derive the target role, password, and database name.
 * Connects via POSTGRES_ADMIN_URL (defaults to the local postgres superuser)
 * because the target role may not exist yet on a first run.
 *
 * Run:  npm run db:setup
 * Safe: re-running never errors — it checks before creating.
 */

import { Client } from 'pg';
import * as fs from 'fs';
import * as path from 'path';

// ---------------------------------------------------------------------------
// Load .env manually — we deliberately avoid NestJS/ConfigModule here so this
// script can run before the app is wired up.
// ---------------------------------------------------------------------------
function loadEnv(): void {
  const envPath = path.resolve(__dirname, '..', '.env');
  if (!fs.existsSync(envPath)) {
    return; // rely on shell environment if .env is absent
  }
  const lines = fs.readFileSync(envPath, 'utf8').split('\n');
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const eqIndex = trimmed.indexOf('=');
    if (eqIndex === -1) continue;
    const key = trimmed.slice(0, eqIndex).trim();
    const value = trimmed.slice(eqIndex + 1).trim();
    if (!(key in process.env)) {
      process.env[key] = value;
    }
  }
}

// ---------------------------------------------------------------------------
// Parse a postgres connection string into its components.
// Supports:  postgresql://user:password@host:port/database
// ---------------------------------------------------------------------------
interface ConnectionParts {
  user: string;
  password: string;
  host: string;
  port: number;
  database: string;
}

function parseUrl(url: string): ConnectionParts {
  const parsed = new URL(url);
  if (!parsed.username) throw new Error(`No username found in URL: ${url}`);
  if (!parsed.hostname) throw new Error(`No host found in URL: ${url}`);
  if (!parsed.pathname || parsed.pathname === '/') {
    throw new Error(`No database name found in URL: ${url}`);
  }
  return {
    user: decodeURIComponent(parsed.username),
    password: decodeURIComponent(parsed.password),
    host: parsed.hostname,
    port: parsed.port ? parseInt(parsed.port, 10) : 5432,
    database: parsed.pathname.slice(1), // strip leading /
  };
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------
async function main(): Promise<void> {
  loadEnv();

  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) {
    throw new Error('DATABASE_URL is not set. Copy .env.example to .env and fill it in.');
  }

  const adminUrl =
    process.env.POSTGRES_ADMIN_URL ?? 'postgresql://postgres:postgres@localhost:5432/postgres';

  const target = parseUrl(databaseUrl);
  const admin = parseUrl(adminUrl);

  console.log(`Admin connection : ${admin.user}@${admin.host}:${admin.port}/${admin.database}`);
  console.log(`Target role      : ${target.user}`);
  console.log(`Target database  : ${target.database}`);
  console.log('');

  const client = new Client({
    user: admin.user,
    password: admin.password,
    host: admin.host,
    port: admin.port,
    database: admin.database,
  });

  await client.connect();

  try {
    // -----------------------------------------------------------------------
    // Role
    // -----------------------------------------------------------------------
    const roleResult = await client.query(
      `SELECT 1 FROM pg_roles WHERE rolname = $1`,
      [target.user],
    );

    if (roleResult.rowCount === 0) {
      // Password must be quoted with double-dollar or escaped; use a
      // parameterised-style workaround via format — pg doesn't support
      // parameters in DDL, so we sanitise manually (role name is identifier,
      // password is a literal string we escape).
      const escapedRole = target.user.replace(/"/g, '""');
      const escapedPassword = target.password.replace(/'/g, "''");
      await client.query(
        `CREATE ROLE "${escapedRole}" WITH LOGIN PASSWORD '${escapedPassword}'`,
      );
      console.log(`✓ Created role     : ${target.user}`);
    } else {
      console.log(`– Role exists      : ${target.user}`);
    }

    // -----------------------------------------------------------------------
    // Database
    // -----------------------------------------------------------------------
    const dbResult = await client.query(
      `SELECT 1 FROM pg_database WHERE datname = $1`,
      [target.database],
    );

    if (dbResult.rowCount === 0) {
      // CREATE DATABASE cannot run inside a transaction block — pg sends each
      // query in autocommit mode by default, so this is fine.
      const escapedDb = target.database.replace(/"/g, '""');
      const escapedRole = target.user.replace(/"/g, '""');
      await client.query(
        `CREATE DATABASE "${escapedDb}" OWNER "${escapedRole}"`,
      );
      console.log(`✓ Created database : ${target.database}`);
    } else {
      console.log(`– Database exists  : ${target.database}`);
    }
  } finally {
    await client.end();
  }

  console.log('');
  console.log('Bootstrap complete. Next step:');
  console.log('  npx prisma migrate dev');
}

main().catch((err) => {
  console.error('\nSetup failed:', err.message);
  process.exit(1);
});
