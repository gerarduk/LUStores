// Simple test file for auth utils focusing on localStorage functions
import { 
  setIntendedDestination, 
  getAndClearIntendedDestination,
  getAuthToken,
  clearAuthToken
} from '../utils/auth';

// Mock localStorage
const localStorageMock = (() => {
  let store: Record<string, string> = {};

  return {
    getItem: jest.fn((key: string) => store[key] || null),
    setItem: jest.fn((key: string, value: string) => {
      store[key] = value;
    }),
    removeItem: jest.fn((key: string) => {
      delete store[key];
    }),
    clear: jest.fn(() => {
      store = {};
    })
  };
})();

// Apply localStorage mock
Object.defineProperty(window, 'localStorage', {
  value: localStorageMock
});

// Mock console.log to avoid noise in tests
const originalConsoleLog = console.log;
beforeAll(() => {
  console.log = jest.fn();
});

afterAll(() => {
  console.log = originalConsoleLog;
});

beforeEach(() => {
  localStorageMock.clear();
  jest.clearAllMocks();
});

describe('Auth Utils - Intended Destination', () => {
  describe('setIntendedDestination', () => {
    test('should store intended destination in localStorage', () => {
      setIntendedDestination('/sales');
      
      expect(localStorageMock.setItem).toHaveBeenCalledWith('intended_destination', '/sales');
    });

    test('should store different paths correctly', () => {
      const testPaths = ['/inventory', '/orders', '/dashboard', '/settings'];
      
      testPaths.forEach(path => {
        setIntendedDestination(path);
        expect(localStorageMock.setItem).toHaveBeenCalledWith('intended_destination', path);
      });
    });

    test('should log the stored destination', () => {
      setIntendedDestination('/inventory');
      
      expect(console.log).toHaveBeenCalledWith('📍 Stored intended destination: /inventory');
    });
  });

  describe('getAndClearIntendedDestination', () => {
    test('should return stored destination and clear it', () => {
      localStorageMock.setItem('intended_destination', '/sales');
      
      const result = getAndClearIntendedDestination();
      
      expect(result).toBe('/sales');
      expect(localStorageMock.removeItem).toHaveBeenCalledWith('intended_destination');
    });

    test('should return default /dashboard when no destination stored', () => {
      const result = getAndClearIntendedDestination();
      
      expect(result).toBe('/dashboard');
    });

    test('should log the retrieved destination', () => {
      localStorageMock.setItem('intended_destination', '/inventory');
      
      getAndClearIntendedDestination();
      
      expect(console.log).toHaveBeenCalledWith('🎯 Retrieved intended destination: /inventory');
    });

    test('should log default destination when none stored', () => {
      getAndClearIntendedDestination();
      
      expect(console.log).toHaveBeenCalledWith('🎯 Retrieved intended destination: /dashboard');
    });

    test('should handle empty string in localStorage', () => {
      localStorageMock.setItem('intended_destination', '');
      
      const result = getAndClearIntendedDestination();
      
      expect(result).toBe('/dashboard');
    });

    test('should handle null value in localStorage', () => {
      localStorageMock.getItem.mockReturnValueOnce(null);
      
      const result = getAndClearIntendedDestination();
      
      expect(result).toBe('/dashboard');
    });
  });

  describe('Auth token functions', () => {
    test('should get auth token from localStorage', () => {
      localStorageMock.setItem('auth_token', 'test_token_123');
      
      const result = getAuthToken();
      
      expect(result).toBe('test_token_123');
    });

    test('should clear auth token from localStorage', () => {
      clearAuthToken();
      
      expect(localStorageMock.removeItem).toHaveBeenCalledWith('auth_token');
    });
  });
});
