import { PrismaClient } from '../src/generated/prisma';

const prisma = new PrismaClient();

// Matches the MOCK_USER constant in mock-token-validator.ts
const MOCK_USER_ID = 'mock-user-id-0000-0000-000000000001';
const OTHER_USER_ID = 'other-user-id-0000-0000-000000000002';
const ADMIN_USER_ID = 'admin-user-id-0000-0000-000000000003';

const items = [
  // Items owned by the mock user (useful for testing ownership-protected routes)
  {
    title: 'Mock User Item 1',
    description: 'Owned by the default mock user. PATCH and DELETE should succeed with mock auth.',
    ownerId: MOCK_USER_ID,
  },
  {
    title: 'Mock User Item 2',
    description: 'Second item owned by the mock user.',
    ownerId: MOCK_USER_ID,
  },
  {
    title: 'Mock User Item — no description',
    description: null,
    ownerId: MOCK_USER_ID,
  },
  // Items owned by a different user (PATCH / DELETE should return 403 with mock auth)
  {
    title: 'Other User Item 1',
    description: 'Owned by a different user. PATCH and DELETE should return 403 with mock auth.',
    ownerId: OTHER_USER_ID,
  },
  {
    title: 'Other User Item 2',
    description: null,
    ownerId: OTHER_USER_ID,
  },
  // Items owned by an admin user
  {
    title: 'Admin Item',
    description: 'Owned by an admin-role user.',
    ownerId: ADMIN_USER_ID,
  },
];

async function main() {
  console.log('Seeding database...');

  // Clear existing data so the seed is idempotent
  await prisma.item.deleteMany();

  for (const item of items) {
    await prisma.item.create({ data: item });
  }

  console.log(`Seeded ${items.length} items.`);
  console.log(`  Mock user (${MOCK_USER_ID}): ${items.filter((i) => i.ownerId === MOCK_USER_ID).length} items`);
  console.log(`  Other user (${OTHER_USER_ID}): ${items.filter((i) => i.ownerId === OTHER_USER_ID).length} items`);
  console.log(`  Admin user (${ADMIN_USER_ID}): ${items.filter((i) => i.ownerId === ADMIN_USER_ID).length} items`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
