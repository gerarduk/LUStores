import { describe, it, expect, beforeEach } from '@jest/globals';
import { generateToken, verifyToken, isTokenExpired } from '../jwt';
import { getAuthToken, setAuthToken, clearAuthToken, isAuthenticated } from '../../client/src/utils/auth';

// Mock localStorage for Node.js testing environment
const localStorageMock = {
  getItem: jest.fn(),
  setItem: jest.fn(),
  removeItem: jest.fn(),
  clear: jest.fn(),
};
global.localStorage = localStorageMock as any;

describe('JWT Authentication System', () => {
  const mockUser = {
    id: 'test-user-001',
    email: 'test@university.edu',
    firstName: 'Test',
    lastName: 'User',
    role: 'admin'
  };

  beforeEach(() => {
    // Clear all mocks before each test
    jest.clearAllMocks();
    localStorageMock.getItem.mockReturnValue(null);
  });

  describe('JWT Token Generation and Verification', () => {
    it('should generate a valid JWT token', () => {
      const token = generateToken(mockUser);
      
      expect(token).toBeDefined();
      expect(typeof token).toBe('string');
      expect(token.split('.')).toHaveLength(3); // JWT should have 3 parts
    });

    it('should verify a valid JWT token', () => {
      const token = generateToken(mockUser);
      const payload = verifyToken(token);
      
      expect(payload).toBeDefined();
      expect(payload?.userId).toBe(mockUser.id);
      expect(payload?.email).toBe(mockUser.email);
      expect(payload?.firstName).toBe(mockUser.firstName);
      expect(payload?.lastName).toBe(mockUser.lastName);
      expect(payload?.role).toBe(mockUser.role);
    });

    it('should reject an invalid JWT token', () => {
      const invalidToken = 'invalid.token.here';
      const payload = verifyToken(invalidToken);
      
      expect(payload).toBeNull();
    });

    it('should detect expired tokens correctly', () => {
      const token = generateToken(mockUser);
      
      // Token should not be expired immediately after creation
      expect(isTokenExpired(token)).toBe(false);
    });
  });

  describe('Local Storage Token Management', () => {
    it('should store token in localStorage', () => {
      const token = 'test-token-123';
      setAuthToken(token);
      
      expect(localStorageMock.setItem).toHaveBeenCalledWith('authToken', token);
    });

    it('should retrieve token from localStorage (primary key)', () => {
      const token = 'test-token-123';
      localStorageMock.getItem.mockImplementation((key) => {
        if (key === 'authToken') return token;
        return null;
      });
      
      const retrievedToken = getAuthToken();
      expect(retrievedToken).toBe(token);
      expect(localStorageMock.getItem).toHaveBeenCalledWith('authToken');
    });

    it('should retrieve token from localStorage (fallback key)', () => {
      const token = 'test-token-123';
      localStorageMock.getItem.mockImplementation((key) => {
        if (key === 'authToken') return null;
        if (key === 'auth_token') return token;
        return null;
      });
      
      const retrievedToken = getAuthToken();
      expect(retrievedToken).toBe(token);
      expect(localStorageMock.getItem).toHaveBeenCalledWith('authToken');
      expect(localStorageMock.getItem).toHaveBeenCalledWith('auth_token');
    });

    it('should clear both token keys from localStorage', () => {
      clearAuthToken();
      
      expect(localStorageMock.removeItem).toHaveBeenCalledWith('authToken');
      expect(localStorageMock.removeItem).toHaveBeenCalledWith('auth_token');
    });

    it('should return null when no token is stored', () => {
      localStorageMock.getItem.mockReturnValue(null);
      
      const retrievedToken = getAuthToken();
      expect(retrievedToken).toBeNull();
    });
  });

  describe('Authentication Status Checks', () => {
    it('should return false when no token is present', () => {
      localStorageMock.getItem.mockReturnValue(null);
      
      expect(isAuthenticated()).toBe(false);
    });

    it('should return true when valid JWT token is present', () => {
      const token = generateToken(mockUser);
      localStorageMock.getItem.mockReturnValue(token);
      
      expect(isAuthenticated()).toBe(true);
    });

    it('should return false when expired JWT token is present', () => {
      // Create a token that expires immediately (this is a simplified test)
      const expiredToken = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOiJ0ZXN0IiwiZXhwIjoxfQ.invalid';
      localStorageMock.getItem.mockReturnValue(expiredToken);
      
      expect(isAuthenticated()).toBe(false);
    });

    it('should return true for legacy tokens (backward compatibility)', () => {
      const legacyToken = 'user_12345';
      localStorageMock.getItem.mockReturnValue(legacyToken);
      
      expect(isAuthenticated()).toBe(true);
    });
  });

  describe('Error Handling', () => {
    it('should handle malformed JWT tokens gracefully', () => {
      const malformedToken = 'not.a.valid.jwt.token';
      
      expect(() => verifyToken(malformedToken)).not.toThrow();
      expect(verifyToken(malformedToken)).toBeNull();
    });

    it('should handle localStorage access errors gracefully', () => {
      localStorageMock.getItem.mockImplementation(() => {
        throw new Error('localStorage access denied');
      });
      
      expect(() => getAuthToken()).not.toThrow();
      expect(getAuthToken()).toBeNull();
    });

    it('should handle token expiration parsing errors', () => {
      const invalidJWT = 'invalid.jwt.structure';
      
      expect(() => isTokenExpired(invalidJWT)).not.toThrow();
      expect(isTokenExpired(invalidJWT)).toBe(true);
    });
  });

  describe('Database Authentication Flow', () => {
    it('should verify admin user structure matches expected format', () => {
      const adminUser = {
        id: 'admin_001',
        email: 'admin@university.edu',
        firstName: 'Admin',
        lastName: 'University',
        role: 'admin'
      };
      
      const token = generateToken(adminUser);
      const payload = verifyToken(token);
      
      expect(payload).toBeDefined();
      expect(payload?.userId).toBe('admin_001');
      expect(payload?.email).toBe('admin@university.edu');
      expect(payload?.firstName).toBe('Admin');
      expect(payload?.lastName).toBe('University');
      expect(payload?.role).toBe('admin');
    });

    it('should handle special characters in user data', () => {
      const userWithSpecialChars = {
        id: 'user-with-apostrophe',
        email: "o'connor@university.edu",
        firstName: "O'Connor",
        lastName: "Mac'Donald",
        role: 'user'
      };
      
      const token = generateToken(userWithSpecialChars);
      const payload = verifyToken(token);
      
      expect(payload).toBeDefined();
      expect(payload?.firstName).toBe("O'Connor");
      expect(payload?.lastName).toBe("Mac'Donald");
    });
  });
});