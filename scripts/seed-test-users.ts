/**
 * Test User Seeding Script
 *
 * Creates three test users with different roles for testing the permission system:
 * - Basic User (role: 'user') with assigned charge codes
 * - Manager (role: 'superuser') with no restrictions
 * - Admin (role: 'admin') with full access
 *
 * Usage: npx tsx scripts/seed-test-users.ts
 */

import { db } from '../server/dbConfig';
import { users, chargeCodeAssignments, chargecodes } from '../shared/schema';
import bcrypt from 'bcrypt';
import { eq, and } from 'drizzle-orm';

const TEST_USERS = [
  {
    email: 'basic.user@test.com',
    password: 'password123',
    firstName: 'Basic',
    lastName: 'User',
    role: 'user' as const,
    assignedChargeCodes: ['BIO-001'], // Will assign first charge code found
  },
  {
    email: 'manager@test.com',
    password: 'password123',
    firstName: 'Manager',
    lastName: 'User',
    role: 'superuser' as const,
    assignedChargeCodes: [], // Managers don't need assigned codes
  },
  {
    email: 'admin@test.com',
    password: 'password123',
    firstName: 'Admin',
    lastName: 'User',
    role: 'admin' as const,
    assignedChargeCodes: [], // Admins don't need assigned codes
  },
];

async function seedTestUsers() {
  console.log('🌱 Seeding test users for permission testing...\n');

  let created = 0;
  let skipped = 0;
  let errors = 0;

  // Get first charge code from database for assignment
  const existingChargeCodes = await db.select().from(chargecodes).limit(3);

  if (existingChargeCodes.length === 0) {
    console.warn('⚠️  No charge codes found in database. Basic user will have no codes assigned.');
  }

  for (const testUser of TEST_USERS) {
    try {
      // Check if user already exists
      const existingUser = await db
        .select()
        .from(users)
        .where(eq(users.email, testUser.email))
        .limit(1);

      if (existingUser.length > 0) {
        console.log(`  ⏭️  ${testUser.email} (${testUser.role}) - already exists, skipping`);
        skipped++;
        continue;
      }

      // Hash password
      const hashedPassword = await bcrypt.hash(testUser.password, 10);

      // Create user
      const newUser = await db
        .insert(users)
        .values({
          email: testUser.email,
          password: hashedPassword,
          firstName: testUser.firstName,
          lastName: testUser.lastName,
          role: testUser.role,
          isActive: true,
        })
        .returning();

      console.log(`  ✓ Created ${testUser.email} (${testUser.role})`);
      created++;

      // Assign charge codes for basic user
      if (testUser.role === 'user' && existingChargeCodes.length > 0) {
        const codeToAssign = existingChargeCodes[0].code;

        await db.insert(chargeCodeAssignments).values({
          userId: newUser[0].id,
          chargeCode: codeToAssign,
          assignedBy: newUser[0].id, // Self-assigned for test
          notes: 'Auto-assigned by test seeding script',
        });

        console.log(`    └─ Assigned charge code: ${codeToAssign}`);
      }
    } catch (error) {
      console.error(`  ✗ ${testUser.email}:`, error);
      errors++;
    }
  }

  console.log('\n📊 Summary:');
  console.log(`  Total test users: ${TEST_USERS.length}`);
  console.log(`  Created: ${created}`);
  console.log(`  Skipped (already exist): ${skipped}`);
  console.log(`  Errors: ${errors}`);

  console.log('\n✅ Test user seeding complete!');
  console.log('\n🔐 Test Credentials:');
  console.log('  Basic User:  basic.user@test.com / password123');
  console.log('  Manager:     manager@test.com / password123');
  console.log('  Admin:       admin@test.com / password123');

  console.log('\n📝 Next steps:');
  console.log('  1. Log in with each test user');
  console.log('  2. Verify role-based navigation in sidebar');
  console.log('  3. Test charge code restrictions on Sales page');
  console.log('  4. Verify API permission enforcement');

  process.exit(0);
}

seedTestUsers().catch((error) => {
  console.error('❌ Error seeding test users:', error);
  process.exit(1);
});
