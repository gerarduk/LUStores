/**
 * Charge Code Validation Unit Tests
 * 
 * Tests the business logic for charge code validation including:
 * 1. Existence validation
 * 2. Date range validation (validFrom/validUntil)
 * 3. Hold status checking
 * 4. User authorization validation 
 * 5. Category exclusion checking
 */

import { describe, it, expect, beforeEach, afterEach } from '@jest/globals';

/**
 * Mock charge code data structure
 */
interface MockChargeCode {
  code: string;
  title: string;
  authorisedBy: string;
  validFrom?: Date;
  validUntil?: Date;
  pin?: string;
  costCentre?: string;
  onHold: boolean;
  holdReason?: string;
  heldAt?: Date;
  heldBy?: string;
  authorizedUsers: Array<{
    id: number;
    userName: string;
    email?: string;
    department?: string;
  }>;
  excludedCategories: number[];
}

/**
 * Mock user data
 */
interface MockUser {
  id: string;
  email: string;
  role: 'user' | 'manager' | 'admin' | 'superuser';
}

/**
 * Validation result
 */
interface ValidationResult {
  isValid: boolean;
  reason?: string;
  warnings?: string[];
}

/**
 * Mock charge code validation service
 */
class MockChargeCodeValidator {
  private chargeCodes: Map<string, MockChargeCode> = new Map();
  private users: Map<string, MockUser> = new Map();

  setupChargeCode(chargeCode: MockChargeCode): void {
    this.chargeCodes.set(chargeCode.code, chargeCode);
  }

  setupUser(user: MockUser): void {
    this.users.set(user.id, user);
  }

  /**
   * Validate charge code for use in sales
   */
  async validateChargeCode(
    code: string, 
    userId: string, 
    itemCategories: number[] = []
  ): Promise<ValidationResult> {
    // 1. Check if charge code exists
    const chargeCode = this.chargeCodes.get(code);
    if (!chargeCode) {
      return { 
        isValid: false, 
        reason: 'Charge code not found' 
      };
    }

    // 2. Check if charge code is on hold
    if (chargeCode.onHold) {
      return { 
        isValid: false, 
        reason: chargeCode.holdReason || 'Charge code is currently on hold' 
      };
    }

    // 3. Check date validity
    const now = new Date();
    
    if (chargeCode.validFrom && now < chargeCode.validFrom) {
      return { 
        isValid: false, 
        reason: `Charge code not yet valid (valid from ${chargeCode.validFrom.toISOString().split('T')[0]})` 
      };
    }

    if (chargeCode.validUntil && now > chargeCode.validUntil) {
      return { 
        isValid: false, 
        reason: `Charge code has expired (expired on ${chargeCode.validUntil.toISOString().split('T')[0]})` 
      };
    }

    // 4. Check user authorization
    const user = this.users.get(userId);
    if (!user) {
      return { 
        isValid: false, 
        reason: 'User not found' 
      };
    }

    // Admins and superusers can use any charge code
    if (user.role === 'admin' || user.role === 'superuser') {
      return { isValid: true };
    }

    // Check if user is in authorized users list
    const isAuthorized = chargeCode.authorizedUsers.some(authUser => 
      authUser.email === user.email
    );

    if (!isAuthorized) {
      return { 
        isValid: false, 
        reason: 'You are not authorized to use this charge code' 
      };
    }

    // 5. Check category exclusions
    const excludedCategories = itemCategories.filter(categoryId => 
      chargeCode.excludedCategories.includes(categoryId)
    );

    if (excludedCategories.length > 0) {
      return { 
        isValid: false, 
        reason: `This charge code cannot be used for items in category ${excludedCategories.join(', ')}`
      };
    }

    // 6. Check for upcoming expiry warnings
    const warnings: string[] = [];
    if (chargeCode.validUntil) {
      const daysUntilExpiry = Math.ceil((chargeCode.validUntil.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
      if (daysUntilExpiry <= 30 && daysUntilExpiry > 0) {
        warnings.push(`Charge code will expire in ${daysUntilExpiry} days`);
      }
    }

    return { 
      isValid: true,
      warnings: warnings.length > 0 ? warnings : undefined
    };
  }

  /**
   * Check if user can be assigned to charge code
   */
  async canAssignUserToChargeCode(userId: string, chargeCode: string, assignedByUserId: string): Promise<ValidationResult> {
    // Check if assigning user has permission
    const assigningUser = this.users.get(assignedByUserId);
    if (!assigningUser) {
      return { 
        isValid: false, 
        reason: 'Assigning user not found' 
      };
    }

    if (assigningUser.role !== 'admin' && assigningUser.role !== 'superuser') {
      return { 
        isValid: false, 
        reason: 'Only administrators can assign charge codes' 
      };
    }

    // Check if charge code exists
    const code = this.chargeCodes.get(chargeCode);
    if (!code) {
      return { 
        isValid: false, 
        reason: 'Charge code not found' 
      };
    }

    // Check if target user exists
    const targetUser = this.users.get(userId);
    if (!targetUser) {
      return { 
        isValid: false, 
        reason: 'Target user not found' 
      };
    }

    return { isValid: true };
  }

  /**
   * Validate charge code creation data
   */
  validateChargeCodeCreation(data: Partial<MockChargeCode>): ValidationResult {
    if (!data.code) {
      return { isValid: false, reason: 'Charge code is required' };
    }

    if (!data.title) {
      return { isValid: false, reason: 'Title is required' };
    }

    // Check code format
    if (!/^[A-Z0-9-_]+$/i.test(data.code)) {
      return { isValid: false, reason: 'Charge code can only contain letters, numbers, hyphens, and underscores' };
    }

    // Check if code already exists
    if (this.chargeCodes.has(data.code)) {
      return { isValid: false, reason: 'Charge code already exists' };
    }

    // Validate date range
    if (data.validFrom && data.validUntil) {
      if (data.validFrom >= data.validUntil) {
        return { isValid: false, reason: 'Valid until date must be after valid from date' };
      }
    }

    return { isValid: true };
  }

  reset(): void {
    this.chargeCodes.clear();
    this.users.clear();
  }
}

describe('Charge Code Validation Unit Tests', () => {
  let validator: MockChargeCodeValidator;

  beforeEach(() => {
    validator = new MockChargeCodeValidator();
  });

  afterEach(() => {
    validator.reset();
  });

  describe('Basic existence validation', () => {
    
    it('should reject non-existent charge codes', async () => {
      const result = await validator.validateChargeCode('NONEXISTENT', 'user1');
      
      expect(result.isValid).toBe(false);
      expect(result.reason).toBe('Charge code not found');
    });

    it('should accept valid existing charge codes', async () => {
      validator.setupChargeCode({
        code: 'VALID001',
        title: 'Valid Charge Code',
        authorisedBy: 'admin1',
        onHold: false,
        authorizedUsers: [{ id: 1, userName: 'Test User', email: 'user@test.com' }],
        excludedCategories: []
      });

      validator.setupUser({
        id: 'user1',
        email: 'user@test.com',
        role: 'user'
      });

      const result = await validator.validateChargeCode('VALID001', 'user1');
      
      expect(result.isValid).toBe(true);
    });
  });

  describe('Date range validation', () => {
    
    beforeEach(() => {
      validator.setupUser({
        id: 'user1',
        email: 'user@test.com',
        role: 'user'
      });
    });

    it('should reject codes not yet valid', async () => {
      const futureDate = new Date();
      futureDate.setDate(futureDate.getDate() + 10);

      validator.setupChargeCode({
        code: 'FUTURE001',
        title: 'Future Charge Code',
        authorisedBy: 'admin1',
        validFrom: futureDate,
        onHold: false,
        authorizedUsers: [{ id: 1, userName: 'Test User', email: 'user@test.com' }],
        excludedCategories: []
      });

      const result = await validator.validateChargeCode('FUTURE001', 'user1');
      
      expect(result.isValid).toBe(false);
      expect(result.reason).toContain('not yet valid');
    });

    it('should reject expired codes', async () => {
      const pastDate = new Date();
      pastDate.setDate(pastDate.getDate() - 10);

      validator.setupChargeCode({
        code: 'EXPIRED001',
        title: 'Expired Charge Code',
        authorisedBy: 'admin1',
        validUntil: pastDate,
        onHold: false,
        authorizedUsers: [{ id: 1, userName: 'Test User', email: 'user@test.com' }],
        excludedCategories: []
      });

      const result = await validator.validateChargeCode('EXPIRED001', 'user1');
      
      expect(result.isValid).toBe(false);
      expect(result.reason).toContain('has expired');
    });

    it('should accept codes within valid date range', async () => {
      const pastDate = new Date();
      pastDate.setDate(pastDate.getDate() - 10);
      const futureDate = new Date();
      futureDate.setDate(futureDate.getDate() + 10);

      validator.setupChargeCode({
        code: 'CURRENT001',
        title: 'Current Charge Code',
        authorisedBy: 'admin1',
        validFrom: pastDate,
        validUntil: futureDate,
        onHold: false,
        authorizedUsers: [{ id: 1, userName: 'Test User', email: 'user@test.com' }],
        excludedCategories: []
      });

      const result = await validator.validateChargeCode('CURRENT001', 'user1');
      
      expect(result.isValid).toBe(true);
    });

    it('should warn about upcoming expiry', async () => {
      const futureDate = new Date();
      futureDate.setDate(futureDate.getDate() + 15); // 15 days from now

      validator.setupChargeCode({
        code: 'EXPIRING001',
        title: 'Expiring Charge Code',
        authorisedBy: 'admin1',
        validUntil: futureDate,
        onHold: false,
        authorizedUsers: [{ id: 1, userName: 'Test User', email: 'user@test.com' }],
        excludedCategories: []
      });

      const result = await validator.validateChargeCode('EXPIRING001', 'user1');
      
      expect(result.isValid).toBe(true);
      expect(result.warnings).toContain('Charge code will expire in 15 days');
    });
  });

  describe('Hold status validation', () => {
    
    beforeEach(() => {
      validator.setupUser({
        id: 'user1',
        email: 'user@test.com',
        role: 'user'
      });
    });

    it('should reject codes on hold', async () => {
      validator.setupChargeCode({
        code: 'ONHOLD001',
        title: 'On Hold Charge Code',
        authorisedBy: 'admin1',
        onHold: true,
        holdReason: 'Budget exceeded',
        authorizedUsers: [{ id: 1, userName: 'Test User', email: 'user@test.com' }],
        excludedCategories: []
      });

      const result = await validator.validateChargeCode('ONHOLD001', 'user1');
      
      expect(result.isValid).toBe(false);
      expect(result.reason).toBe('Budget exceeded');
    });

    it('should reject codes on hold with default message', async () => {
      validator.setupChargeCode({
        code: 'ONHOLD002',
        title: 'On Hold Charge Code',
        authorisedBy: 'admin1',
        onHold: true,
        authorizedUsers: [{ id: 1, userName: 'Test User', email: 'user@test.com' }],
        excludedCategories: []
      });

      const result = await validator.validateChargeCode('ONHOLD002', 'user1');
      
      expect(result.isValid).toBe(false);
      expect(result.reason).toBe('Charge code is currently on hold');
    });
  });

  describe('User authorization validation', () => {
    
    it('should allow admins to use any charge code', async () => {
      validator.setupChargeCode({
        code: 'ADMIN001',
        title: 'Admin Test Code',
        authorisedBy: 'admin1',
        onHold: false,
        authorizedUsers: [], // No specific users listed
        excludedCategories: []
      });

      validator.setupUser({
        id: 'admin1',
        email: 'admin@test.com',
        role: 'admin'
      });

      const result = await validator.validateChargeCode('ADMIN001', 'admin1');
      
      expect(result.isValid).toBe(true);
    });

    it('should allow superusers to use any charge code', async () => {
      validator.setupChargeCode({
        code: 'SUPER001',
        title: 'Super Test Code',
        authorisedBy: 'admin1',
        onHold: false,
        authorizedUsers: [],
        excludedCategories: []
      });

      validator.setupUser({
        id: 'super1',
        email: 'super@test.com',
        role: 'superuser'
      });

      const result = await validator.validateChargeCode('SUPER001', 'super1');
      
      expect(result.isValid).toBe(true);
    });

    it('should reject regular users not in authorized list', async () => {
      validator.setupChargeCode({
        code: 'RESTRICTED001',
        title: 'Restricted Charge Code',
        authorisedBy: 'admin1',
        onHold: false,
        authorizedUsers: [
          { id: 1, userName: 'Authorized User', email: 'authorized@test.com' }
        ],
        excludedCategories: []
      });

      validator.setupUser({
        id: 'user1',
        email: 'unauthorized@test.com',
        role: 'user'
      });

      const result = await validator.validateChargeCode('RESTRICTED001', 'user1');
      
      expect(result.isValid).toBe(false);
      expect(result.reason).toBe('You are not authorized to use this charge code');
    });

    it('should accept users in authorized list', async () => {
      validator.setupChargeCode({
        code: 'AUTHORIZED001',
        title: 'Authorized Charge Code',
        authorisedBy: 'admin1',
        onHold: false,
        authorizedUsers: [
          { id: 1, userName: 'Authorized User', email: 'authorized@test.com' }
        ],
        excludedCategories: []
      });

      validator.setupUser({
        id: 'user1',
        email: 'authorized@test.com',
        role: 'user'
      });

      const result = await validator.validateChargeCode('AUTHORIZED001', 'user1');
      
      expect(result.isValid).toBe(true);
    });
  });

  describe('Category exclusion validation', () => {
    
    beforeEach(() => {
      validator.setupUser({
        id: 'user1',
        email: 'user@test.com',
        role: 'admin' // Use admin to bypass authorization checks
      });
    });

    it('should reject items from excluded categories', async () => {
      validator.setupChargeCode({
        code: 'EXCLUDE001',
        title: 'Category Excluding Code',
        authorisedBy: 'admin1',
        onHold: false,
        authorizedUsers: [],
        excludedCategories: [1, 2, 3] // Exclude categories 1, 2, 3
      });

      const result = await validator.validateChargeCode('EXCLUDE001', 'user1', [1, 4, 5]);
      
      expect(result.isValid).toBe(false);
      expect(result.reason).toBe('This charge code cannot be used for items in category 1');
    });

    it('should accept items from allowed categories', async () => {
      validator.setupChargeCode({
        code: 'ALLOW001',
        title: 'Allowing Code',
        authorisedBy: 'admin1',
        onHold: false,
        authorizedUsers: [],
        excludedCategories: [1, 2, 3] // Exclude categories 1, 2, 3
      });

      const result = await validator.validateChargeCode('ALLOW001', 'user1', [4, 5, 6]); // Only allowed categories
      
      expect(result.isValid).toBe(true);
    });

    it('should handle multiple excluded categories in result', async () => {
      validator.setupChargeCode({
        code: 'MULTIEXCLUDE001',
        title: 'Multi Exclude Code',
        authorisedBy: 'admin1',
        onHold: false,
        authorizedUsers: [],
        excludedCategories: [1, 2, 3]
      });

      const result = await validator.validateChargeCode('MULTIEXCLUDE001', 'user1', [1, 2, 4]);
      
      expect(result.isValid).toBe(false);
      expect(result.reason).toContain('1, 2');
    });
  });

  describe('Assignment validation', () => {
    
    it('should allow admins to assign charge codes', async () => {
      validator.setupUser({
        id: 'admin1',
        email: 'admin@test.com',
        role: 'admin'
      });

      validator.setupUser({
        id: 'user1',
        email: 'user@test.com',
        role: 'user'
      });

      validator.setupChargeCode({
        code: 'ASSIGN001',
        title: 'Assignable Code',
        authorisedBy: 'admin1',
        onHold: false,
        authorizedUsers: [],
        excludedCategories: []
      });

      const result = await validator.canAssignUserToChargeCode('user1', 'ASSIGN001', 'admin1');
      
      expect(result.isValid).toBe(true);
    });

    it('should reject assignment by regular users', async () => {
      validator.setupUser({
        id: 'user1',
        email: 'user1@test.com',
        role: 'user'
      });

      validator.setupUser({
        id: 'user2',
        email: 'user2@test.com',
        role: 'user'
      });

      const result = await validator.canAssignUserToChargeCode('user2', 'ASSIGN001', 'user1');
      
      expect(result.isValid).toBe(false);
      expect(result.reason).toBe('Only administrators can assign charge codes');
    });

    it('should reject assignment to non-existent users', async () => {
      validator.setupUser({
        id: 'admin1',
        email: 'admin@test.com',
        role: 'admin'
      });

      const result = await validator.canAssignUserToChargeCode('nonexistent', 'ASSIGN001', 'admin1');
      
      expect(result.isValid).toBe(false);
      expect(result.reason).toBe('Target user not found');
    });

    it('should reject assignment of non-existent charge codes', async () => {
      validator.setupUser({
        id: 'admin1',
        email: 'admin@test.com',
        role: 'admin'
      });

      validator.setupUser({
        id: 'user1',
        email: 'user@test.com',
        role: 'user'
      });

      const result = await validator.canAssignUserToChargeCode('user1', 'NONEXISTENT', 'admin1');
      
      expect(result.isValid).toBe(false);
      expect(result.reason).toBe('Charge code not found');
    });
  });

  describe('Creation validation', () => {
    
    it('should require charge code and title', () => {
      const result = validator.validateChargeCodeCreation({});
      
      expect(result.isValid).toBe(false);
      expect(result.reason).toBe('Charge code is required');
    });

    it('should require title when code provided', () => {
      const result = validator.validateChargeCodeCreation({ code: 'TEST001' });
      
      expect(result.isValid).toBe(false);
      expect(result.reason).toBe('Title is required');
    });

    it('should validate code format', () => {
      const result = validator.validateChargeCodeCreation({
        code: 'INVALID CODE!',
        title: 'Test Title'
      });
      
      expect(result.isValid).toBe(false);
      expect(result.reason).toContain('letters, numbers, hyphens, and underscores');
    });

    it('should accept valid format codes', () => {
      const result = validator.validateChargeCodeCreation({
        code: 'VALID-CODE_123',
        title: 'Test Title'
      });
      
      expect(result.isValid).toBe(true);
    });

    it('should reject duplicate codes', () => {
      validator.setupChargeCode({
        code: 'DUPLICATE001',
        title: 'Existing Code',
        authorisedBy: 'admin1',
        onHold: false,
        authorizedUsers: [],
        excludedCategories: []
      });

      const result = validator.validateChargeCodeCreation({
        code: 'DUPLICATE001',
        title: 'New Title'
      });
      
      expect(result.isValid).toBe(false);
      expect(result.reason).toBe('Charge code already exists');
    });

    it('should validate date ranges', () => {
      const validFrom = new Date('2025-06-01');
      const validUntil = new Date('2025-01-01'); // Before validFrom

      const result = validator.validateChargeCodeCreation({
        code: 'DATETEST001',
        title: 'Date Test',
        validFrom,
        validUntil
      });
      
      expect(result.isValid).toBe(false);
      expect(result.reason).toBe('Valid until date must be after valid from date');
    });
  });

  describe('Edge cases and error handling', () => {
    
    it('should handle missing user gracefully', async () => {
      validator.setupChargeCode({
        code: 'VALID001',
        title: 'Valid Code',
        authorisedBy: 'admin1',
        onHold: false,
        authorizedUsers: [],
        excludedCategories: []
      });

      const result = await validator.validateChargeCode('VALID001', 'nonexistent');
      
      expect(result.isValid).toBe(false);
      expect(result.reason).toBe('User not found');
    });

    it('should handle empty category arrays', async () => {
      validator.setupChargeCode({
        code: 'EMPTY001',
        title: 'Empty Categories',
        authorisedBy: 'admin1',
        onHold: false,
        authorizedUsers: [],
        excludedCategories: []
      });

      validator.setupUser({
        id: 'user1',
        email: 'user@test.com',
        role: 'admin'
      });

      const result = await validator.validateChargeCode('EMPTY001', 'user1', []);
      
      expect(result.isValid).toBe(true);
    });

    it('should handle exact expiry date edge case', async () => {
      // Set validUntil to exactly now
      const now = new Date();
      
      validator.setupChargeCode({
        code: 'EXACTEXPIRY001',
        title: 'Exact Expiry',
        authorisedBy: 'admin1',
        validUntil: now,
        onHold: false,
        authorizedUsers: [],
        excludedCategories: []
      });

      validator.setupUser({
        id: 'user1',
        email: 'user@test.com',
        role: 'admin'
      });

      // Wait a tiny bit to ensure 'now' is in the past
      await new Promise(resolve => setTimeout(resolve, 1));

      const result = await validator.validateChargeCode('EXACTEXPIRY001', 'user1');
      
      expect(result.isValid).toBe(false);
      expect(result.reason).toContain('has expired');
    });
  });
});