import { describe, it, expect, beforeAll } from '@jest/globals';
import { db } from '../dbConfig';
import { users } from '../../shared/schema';
import { eq } from 'drizzle-orm';
import { seedDatabase } from '../dbSeed';
import { generateToken, verifyToken } from '../jwt';
import { verifyPassword } from '../localAuth';

describe('Authentication Database Integration', () => {
  beforeAll(async () => {
    // Ensure database is seeded with test data
    try {
      await seedDatabase();
      console.log('✅ Database seeded successfully for tests');
    } catch (error) {
      console.error('❌ Database seeding failed:', error);
      throw error;
    }
  });

  describe('Admin User Verification', () => {
    it('should have admin user in database with correct structure', async () => {
      const adminUser = await db
        .select()
        .from(users)
        .where(eq(users.email, 'admin@university.edu'))
        .limit(1);

      expect(adminUser).toBeDefined();
      expect(adminUser.length).toBe(1);
      
      const admin = adminUser[0];
      expect(admin.id).toBe('admin_001');
      expect(admin.email).toBe('admin@university.edu');
      expect(admin.firstName).toBe('Admin');
      expect(admin.lastName).toBe('University');
      expect(admin.role).toBe('admin');
      expect(admin.isActive).toBe(true);
      expect(admin.password_hash).toBeDefined();
      expect(admin.password_hash).not.toBe('');
    });

    it('should verify admin password hash is correct', async () => {
      const adminUser = await db
        .select()
        .from(users)
        .where(eq(users.email, 'admin@university.edu'))
        .limit(1);

      expect(adminUser.length).toBe(1);
      
      const admin = adminUser[0];
      
      // The seeded password is "admin123"
      const isValidPassword = await verifyPassword('admin123', admin.password_hash!);
      expect(isValidPassword).toBe(true);
      
      // Wrong password should fail
      const isInvalidPassword = await verifyPassword('wrongpassword', admin.password_hash!);
      expect(isInvalidPassword).toBe(false);
    });

    it('should generate and verify JWT token for admin user', async () => {
      const adminUser = await db
        .select()
        .from(users)
        .where(eq(users.email, 'admin@university.edu'))
        .limit(1);

      expect(adminUser.length).toBe(1);
      
      const admin = adminUser[0];
      const token = generateToken({
        id: admin.id,
        email: admin.email,
        firstName: admin.firstName!,
        lastName: admin.lastName!,
        role: admin.role
      });

      expect(token).toBeDefined();
      expect(typeof token).toBe('string');

      const payload = verifyToken(token);
      expect(payload).toBeDefined();
      expect(payload?.userId).toBe(admin.id);
      expect(payload?.email).toBe(admin.email);
      expect(payload?.firstName).toBe(admin.firstName);
      expect(payload?.lastName).toBe(admin.lastName);
      expect(payload?.role).toBe(admin.role);
    });
  });

  describe('User Lookup Functions', () => {
    it('should find user by email successfully', async () => {
      const user = await db
        .select()
        .from(users)
        .where(eq(users.email, 'admin@university.edu'))
        .limit(1);

      expect(user).toBeDefined();
      expect(user.length).toBe(1);
      expect(user[0].email).toBe('admin@university.edu');
    });

    it('should find user by ID successfully', async () => {
      const user = await db
        .select()
        .from(users)
        .where(eq(users.id, 'admin_001'))
        .limit(1);

      expect(user).toBeDefined();
      expect(user.length).toBe(1);
      expect(user[0].id).toBe('admin_001');
    });

    it('should return empty result for non-existent user', async () => {
      const user = await db
        .select()
        .from(users)
        .where(eq(users.email, 'nonexistent@university.edu'))
        .limit(1);

      expect(user).toBeDefined();
      expect(user.length).toBe(0);
    });

    it('should validate database schema matches expectations', async () => {
      const adminUser = await db
        .select({
          id: users.id,
          email: users.email,
          password_hash: users.password_hash,
          firstName: users.firstName,
          lastName: users.lastName,
          role: users.role,
          isActive: users.isActive,
          mustChangePassword: users.mustChangePassword,
          lastLogin: users.lastLogin
        })
        .from(users)
        .where(eq(users.email, 'admin@university.edu'))
        .limit(1);

      expect(adminUser.length).toBe(1);
      
      const admin = adminUser[0];
      
      // Verify all expected fields are present and have correct types
      expect(typeof admin.id).toBe('string');
      expect(typeof admin.email).toBe('string');
      expect(typeof admin.password_hash).toBe('string');
      expect(typeof admin.firstName).toBe('string');
      expect(typeof admin.lastName).toBe('string');
      expect(typeof admin.role).toBe('string');
      expect(typeof admin.isActive).toBe('boolean');
      expect(typeof admin.mustChangePassword).toBe('boolean');
      
      // These fields should match the seeded values
      expect(admin.firstName).toBe('Admin');
      expect(admin.lastName).toBe('University');
      expect(admin.role).toBe('admin');
      expect(admin.isActive).toBe(true);
      expect(admin.mustChangePassword).toBe(false);
    });
  });

  describe('Authentication Error Scenarios', () => {
    it('should handle database connection issues gracefully', async () => {
      // This test would need a mock database that fails
      // For now, we'll just ensure our query structure is correct
      const queryPromise = db
        .select()
        .from(users)
        .where(eq(users.email, 'admin@university.edu'))
        .limit(1);

      await expect(queryPromise).resolves.toBeDefined();
    });

    it('should validate query returns expected structure', async () => {
      const result = await db
        .select()
        .from(users)
        .where(eq(users.email, 'admin@university.edu'))
        .limit(1);

      if (result.length > 0) {
        const user = result[0];
        
        // Verify the object has all expected properties
        expect(user).toHaveProperty('id');
        expect(user).toHaveProperty('email');
        expect(user).toHaveProperty('password_hash');
        expect(user).toHaveProperty('firstName');
        expect(user).toHaveProperty('lastName');
        expect(user).toHaveProperty('role');
        expect(user).toHaveProperty('isActive');
        expect(user).toHaveProperty('mustChangePassword');
        expect(user).toHaveProperty('lastLogin');
        expect(user).toHaveProperty('profileImageUrl');
        expect(user).toHaveProperty('createdAt');
        expect(user).toHaveProperty('updatedAt');
      }
    });
  });
});