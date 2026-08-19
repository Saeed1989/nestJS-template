/**
 * Idempotent local seed data.
 *
 * Creates a baseline admin user so /config writes and role-gated routes
 * can be tested immediately after setup, without manually promoting a
 * user via SQL.
 *
 * Run: npx prisma db seed
 */

import * as bcrypt from 'bcryptjs';
import { PrismaClient } from '../src/generated/prisma';

const prisma = new PrismaClient();

const ADMIN_EMAIL = 'admin@example.com';
const ADMIN_PASSWORD = 'Admin123!';

async function main(): Promise<void> {
  const existing = await prisma.user.findUnique({ where: { email: ADMIN_EMAIL } });

  if (existing) {
    console.log(`– Admin user exists : ${ADMIN_EMAIL}`);
  } else {
    const passwordHash = await bcrypt.hash(ADMIN_PASSWORD, 10);
    await prisma.user.create({
      data: {
        email: ADMIN_EMAIL,
        passwordHash,
        name: 'Admin',
        roles: ['admin'],
      },
    });
    console.log(`✓ Created admin user : ${ADMIN_EMAIL} / ${ADMIN_PASSWORD}`);
  }
}

main()
  .catch((err) => {
    console.error('\nSeed failed:', err.message);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
