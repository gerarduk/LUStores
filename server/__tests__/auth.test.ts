import { describe, it, expect, beforeEach, afterEach } from '@jest/globals';
import { requireAuth } from '../localAuth';
import type { Request, Response, NextFunction } from 'express';

// Define interfaces for test data
interface MockUser {
  id: string;
  email: string;
  firstName?: string;
  lastName?: string;
  role: string;
  isActive?: boolean;
  mustChangePassword?: boolean;
  lastLogin?: Date;
}

interface MockResponse extends Partial<Response> {
  status: jest.Mock;
  json: jest.Mock;
  redirect: jest.Mock;
}

// Create mock objects with proper type assertions for testing
const createMockReq = (user?: MockUser | null, isAuthenticated = false, xhr = false, headers = {}): Request => {
  const req = {
    user: user || undefined,
    isAuthenticated: () => isAuthenticated,
    session: {},
    xhr,
    headers,
    method: 'GET',
    originalUrl: '/test'
  };
  return req as unknown as Request;
};

const createMockRes = (): Response => {
  const res: MockResponse = {
    status: jest.fn().mockReturnThis(),
    json: jest.fn().mockReturnThis(),
    redirect: jest.fn().mockReturnThis(),
  };
  return res as unknown as Response;
};

const createMockNext = (): NextFunction => jest.fn() as NextFunction;

describe('Authentication System', () => {
  const originalEnv = process.env.NODE_ENV;
  
  beforeEach(() => {
    jest.clearAllMocks();
  });

  afterEach(() => {
    process.env.NODE_ENV = originalEnv;
  });

  describe('Development Mode Authentication', () => {
    beforeEach(() => {
      process.env.NODE_ENV = 'development';
      process.env.BYPASS_AUTH = 'true'; // Required for dev mode bypass
    });

    it('should bypass authentication in development mode', () => {
      const req = createMockReq();
      const res = createMockRes();
      const next = createMockNext();

      requireAuth(req, res, next);

      expect(next).toHaveBeenCalled();
      expect(req.user).toEqual({
        id: 'dev_admin_001',
        email: 'dev@admin.local',
        firstName: 'Development',
        lastName: 'Admin',
        role: 'admin',
        isActive: true,
        mustChangePassword: false,
        lastLogin: expect.any(Date)
      });
    });

    it('should create mock admin user in development', () => {
      const req = createMockReq();
      const res = createMockRes();
      const next = createMockNext();

      requireAuth(req, res, next);

      expect((req.user as MockUser).role).toBe('admin');
      expect((req.user as MockUser).email).toBe('dev@admin.local');
    });

    afterEach(() => {
      delete process.env.BYPASS_AUTH; // Clean up
    });
  });

  describe('Production Mode Authentication', () => {
    beforeEach(() => {
      process.env.NODE_ENV = 'production';
    });

    it('should require authentication in production mode when user not authenticated', () => {
      const req = createMockReq(null, false);
      const res = createMockRes();
      const next = createMockNext();

      requireAuth(req, res, next);

      expect(next).not.toHaveBeenCalled();
      expect(res.redirect).toHaveBeenCalledWith('/login');
    });

    it('should allow authenticated users in production mode', () => {
      const mockUser = {
        id: 'user123',
        email: 'test@example.com',
        role: 'user'
      };
      const req = createMockReq(mockUser, true);
      const res = createMockRes();
      const next = createMockNext();

      requireAuth(req, res, next);

      expect(next).toHaveBeenCalled();
      expect(res.redirect).not.toHaveBeenCalled();
    });

    it('should return 401 for AJAX requests when not authenticated', () => {
      const req = createMockReq(null, false, true); // xhr = true
      const res = createMockRes();
      const next = createMockNext();

      requireAuth(req, res, next);

      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.json).toHaveBeenCalledWith({
        error: 'Authentication required',
        loginUrl: '/auth/login'
      });
    });

    it('should return 401 for JSON requests when not authenticated', () => {
      const req = createMockReq(null, false, false, { accept: 'application/json' });
      const res = createMockRes();
      const next = createMockNext();

      requireAuth(req, res, next);

      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.json).toHaveBeenCalledWith({
        error: 'Authentication required',
        loginUrl: '/auth/login'
      });
    });
  });

  describe('Password Validation', () => {
    it('should validate strong passwords', async () => {
      const { validatePassword } = await import('../localAuth');
      
      const strongPassword = 'StrongPass123!';
      const result = validatePassword(strongPassword);
      
      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should reject weak passwords', async () => {
      const { validatePassword } = await import('../localAuth');
      
      const weakPasswords = [
        'weak',           // too short
        '12345678',       // no letters
        'password',       // no uppercase/numbers/special
        'Password',       // no numbers/special  
        'Password1',      // no special chars
      ];
      
      for (const password of weakPasswords) {
        const result = validatePassword(password);
        expect(result.valid).toBe(false);
        expect(result.errors.length).toBeGreaterThan(0);
      }
    });

    it('should require minimum length', async () => {
      const { validatePassword } = await import('../localAuth');
      
      const shortPassword = 'A1!';
      const result = validatePassword(shortPassword);
      
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Password must be at least 8 characters long');
    });

    it('should require uppercase letters', async () => {
      const { validatePassword } = await import('../localAuth');
      
      const noUppercase = 'password123!';
      const result = validatePassword(noUppercase);
      
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Password must contain at least one uppercase letter');
    });

    it('should require special characters', async () => {
      const { validatePassword } = await import('../localAuth');
      
      const noSpecial = 'Password123';
      const result = validatePassword(noSpecial);
      
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Password must contain at least one special character');
    });
  });

  describe('Password Hashing', () => {
    it('should hash passwords securely', async () => {
      const { hashPassword, verifyPassword } = await import('../localAuth');
      
      const plainPassword = 'TestPassword123!';
      const hashedPassword = await hashPassword(plainPassword);
      
      expect(hashedPassword).not.toBe(plainPassword);
      expect(hashedPassword.length).toBeGreaterThan(50); // bcrypt hashes are typically 60 chars
      
      const isValid = await verifyPassword(plainPassword, hashedPassword);
      expect(isValid).toBe(true);
      
      const isInvalid = await verifyPassword('wrongpassword', hashedPassword);
      expect(isInvalid).toBe(false);
    });

    it('should generate secure temporary passwords', async () => {
      const { generateTemporaryPassword, validatePassword } = await import('../localAuth');
      
      const tempPassword = generateTemporaryPassword();
      
      expect(tempPassword.length).toBeGreaterThanOrEqual(8);
      
      const validation = validatePassword(tempPassword);
      expect(validation.valid).toBe(true);
    });
  });
});