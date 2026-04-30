/**
 * LocalStorage debugging utilities for production troubleshooting
 */

export function testLocalStorage(): { available: boolean; error?: string } {
  try {
    const testKey = '_localStorage_test_';
    const testValue = 'test_value_' + Date.now();
    
    // Test write
    localStorage.setItem(testKey, testValue);
    
    // Test read
    const retrieved = localStorage.getItem(testKey);
    
    // Test delete
    localStorage.removeItem(testKey);
    
    if (retrieved === testValue) {
      console.log('✅ localStorage is fully functional');
      return { available: true };
    } else {
      console.error('❌ localStorage read/write mismatch');
      return { available: false, error: 'Read/write mismatch' };
    }
  } catch (error) {
    console.error('❌ localStorage test failed:', error);
    return { available: false, error: error instanceof Error ? error.message : 'Unknown error' };
  }
}

export function debugStorageContents(): void {
  try {
    console.log('🔍 Current localStorage contents:');
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key) {
        const value = localStorage.getItem(key);
        if (key.includes('auth') || key.includes('token')) {
          console.log(`  ${key}: ${value?.substring(0, 20)}...`);
        } else {
          console.log(`  ${key}: ${value}`);
        }
      }
    }
  } catch (error) {
    console.error('❌ Could not debug localStorage contents:', error);
  }
}

export function getStorageInfo(): { 
  isAvailable: boolean; 
  isSecureContext: boolean; 
  protocol: string; 
  domain: string;
  error?: string;
} {
  const info = {
    isAvailable: false,
    isSecureContext: window.isSecureContext || false,
    protocol: window.location.protocol,
    domain: window.location.hostname,
  };
  
  const testResult = testLocalStorage();
  return {
    ...info,
    isAvailable: testResult.available,
    error: testResult.error
  };
}
