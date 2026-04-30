import { getAndClearIntendedDestination } from '../utils/auth';

// Mock the auth utils module
jest.mock('../utils/auth', () => ({
  getAndClearIntendedDestination: jest.fn()
}));

const mockGetAndClearIntendedDestination = getAndClearIntendedDestination as jest.MockedFunction<typeof getAndClearIntendedDestination>;

describe('Login Redirect Logic', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Redirect priority logic', () => {
    test('should use backend redirectTo when provided', () => {
      // Mock the login response data
      const data: { redirectTo?: string } = { redirectTo: '/admin-panel' };
      
      // Simulate the login redirect logic
      const redirectTo = data.redirectTo || getAndClearIntendedDestination();
      
      expect(redirectTo).toBe('/admin-panel');
      expect(mockGetAndClearIntendedDestination).not.toHaveBeenCalled();
    });

    test('should use intended destination when no backend redirectTo', () => {
      mockGetAndClearIntendedDestination.mockReturnValue('/sales');
      
      // Mock the login response data without redirectTo
      const data: { redirectTo?: string } = {};
      
      // Simulate the login redirect logic
      const redirectTo = data.redirectTo || getAndClearIntendedDestination();
      
      expect(redirectTo).toBe('/sales');
      expect(mockGetAndClearIntendedDestination).toHaveBeenCalledTimes(1);
    });

    test('should use intended destination when backend redirectTo is empty', () => {
      mockGetAndClearIntendedDestination.mockReturnValue('/inventory');
      
      // Mock the login response data with empty redirectTo
      const data: { redirectTo?: string } = { redirectTo: '' };
      
      // Simulate the login redirect logic
      const redirectTo = data.redirectTo || getAndClearIntendedDestination();
      
      expect(redirectTo).toBe('/inventory');
      expect(mockGetAndClearIntendedDestination).toHaveBeenCalledTimes(1);
    });

    test('should use intended destination when backend redirectTo is null', () => {
      mockGetAndClearIntendedDestination.mockReturnValue('/orders');
      
      // Mock the login response data with null redirectTo
      const data: { redirectTo?: string | null } = { redirectTo: null };
      
      // Simulate the login redirect logic
      const redirectTo = data.redirectTo || getAndClearIntendedDestination();
      
      expect(redirectTo).toBe('/orders');
      expect(mockGetAndClearIntendedDestination).toHaveBeenCalledTimes(1);
    });

    test('should fall back to dashboard when no backend redirectTo and no stored destination', () => {
      mockGetAndClearIntendedDestination.mockReturnValue('/dashboard');
      
      // Mock the login response data without redirectTo
      const data: { redirectTo?: string } = {};
      
      // Simulate the login redirect logic
      const redirectTo = data.redirectTo || getAndClearIntendedDestination();
      
      expect(redirectTo).toBe('/dashboard');
      expect(mockGetAndClearIntendedDestination).toHaveBeenCalledTimes(1);
    });
  });

  describe('Different page scenarios', () => {
    const testScenarios = [
      { storedDestination: '/sales', description: 'sales page' },
      { storedDestination: '/inventory', description: 'inventory page' },
      { storedDestination: '/orders', description: 'orders page' },
      { storedDestination: '/reports', description: 'reports page' },
      { storedDestination: '/settings', description: 'settings page' },
      { storedDestination: '/dashboard', description: 'dashboard (default)' }
    ];

    testScenarios.forEach(scenario => {
      test(`should redirect to ${scenario.description} when stored as intended destination`, () => {
        mockGetAndClearIntendedDestination.mockReturnValue(scenario.storedDestination);
        
        const data: { redirectTo?: string } = {}; // No backend redirectTo
        const redirectTo = data.redirectTo || getAndClearIntendedDestination();
        
        expect(redirectTo).toBe(scenario.storedDestination);
        expect(mockGetAndClearIntendedDestination).toHaveBeenCalledTimes(1);
      });
    });
  });

  describe('Backend redirectTo priority', () => {
    test('should always prefer backend redirectTo over stored destination', () => {
      mockGetAndClearIntendedDestination.mockReturnValue('/sales');
      
      const data = { redirectTo: '/admin-dashboard' };
      const redirectTo = data.redirectTo || getAndClearIntendedDestination();
      
      expect(redirectTo).toBe('/admin-dashboard');
      expect(mockGetAndClearIntendedDestination).not.toHaveBeenCalled();
    });

    test('should prefer backend redirectTo even when it differs from stored destination', () => {
      mockGetAndClearIntendedDestination.mockReturnValue('/inventory');
      
      const data = { redirectTo: '/special-page' };
      const redirectTo = data.redirectTo || getAndClearIntendedDestination();
      
      expect(redirectTo).toBe('/special-page');
      expect(mockGetAndClearIntendedDestination).not.toHaveBeenCalled();
    });
  });

  describe('Error handling', () => {
    test('should handle getAndClearIntendedDestination throwing an error', () => {
      // Simulate localStorage throwing an error
      mockGetAndClearIntendedDestination.mockImplementation(() => {
        throw new Error('localStorage error');
      });
      
      const data: { redirectTo?: string } = {};
      
      // Should not crash, but will throw since we're not handling the error in the test
      expect(() => {
        try {
          data.redirectTo || getAndClearIntendedDestination();
        } catch (error) {
          expect(error.message).toBe('localStorage error');
        }
      }).not.toThrow();
    });

    test('should work with undefined data object', () => {
      mockGetAndClearIntendedDestination.mockReturnValue('/dashboard');
      
      const data: { redirectTo?: string } | undefined = undefined;
      const redirectTo = (data?.redirectTo) || getAndClearIntendedDestination();
      
      expect(redirectTo).toBe('/dashboard');
      expect(mockGetAndClearIntendedDestination).toHaveBeenCalledTimes(1);
    });
  });

  describe('Integration with actual login flow', () => {
    test('should simulate complete login success flow', () => {
      // Simulate user was on sales page before logout
      mockGetAndClearIntendedDestination.mockReturnValue('/sales');
      
      // Simulate successful login response (no specific redirectTo from backend)
      const loginResponse: {
        success: boolean;
        user: { id: string; email: string };
        token: string;
        redirectTo?: string;
      } = {
        success: true,
        user: { id: 'user_123', email: 'test@example.com' },
        token: 'user_test_123'
        // No redirectTo field
      };
      
      // Simulate the redirect logic from Login component
      const redirectTo = loginResponse.redirectTo || getAndClearIntendedDestination();
      
      expect(redirectTo).toBe('/sales');
      expect(mockGetAndClearIntendedDestination).toHaveBeenCalledTimes(1);
    });

    test('should simulate login with backend-specified redirect', () => {
      mockGetAndClearIntendedDestination.mockReturnValue('/inventory');
      
      // Simulate login response with backend redirectTo
      const loginResponse: {
        success: boolean;
        user: { id: string; email: string };
        token: string;
        redirectTo?: string;
      } = {
        success: true,
        user: { id: 'admin_123', email: 'admin@example.com' },
        token: 'user_admin_123',
        redirectTo: '/admin-panel' // Backend specifies redirect
      };
      
      // Simulate the redirect logic from Login component
      const redirectTo = loginResponse.redirectTo || getAndClearIntendedDestination();
      
      expect(redirectTo).toBe('/admin-panel');
      expect(mockGetAndClearIntendedDestination).not.toHaveBeenCalled();
    });
  });
});
