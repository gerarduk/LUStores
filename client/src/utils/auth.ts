/**
 * Authentication utilities for stateless token-based auth
 * Replaces cookie/session dependency with localStorage tokens
 */

export interface AuthToken {
  token: string;
  user: {
    id: string;
    email: string;
    firstName: string;
    lastName: string;
    role: string;
  };
}

/**
 * Get stored authentication token from localStorage
 * Check both 'authToken' and 'auth_token' for compatibility
 */
export function getAuthToken(): string | null {
  try {
    const token = localStorage.getItem('authToken') || localStorage.getItem('auth_token');
    // Debug logging for production troubleshooting
    if (typeof process !== 'undefined' && process.env && process.env.NODE_ENV === 'production') {
      console.log('🔐 getAuthToken:', { hasToken: !!token, tokenPrefix: token?.substring(0, 10) });
    }
    return token;
  } catch (error) {
    // Handle localStorage access errors gracefully
    console.warn('localStorage access error:', error);
    return null;
  }
}

/**
 * Store authentication token in localStorage
 */
export function setAuthToken(token: string): void {
  localStorage.setItem('authToken', token);
}

/**
 * Remove authentication token from localStorage
 */
export function clearAuthToken(): void {
  localStorage.removeItem('authToken');
  localStorage.removeItem('auth_token'); // Also clear legacy key for compatibility
}

/**
 * Check if JWT token is expired
 */
export function isTokenExpired(token: string): boolean {
  try {
    const parts = token.split('.');
    if (parts.length !== 3) return true;
    
    const payload = JSON.parse(atob(parts[1]));
    const exp = payload.exp;
    
    if (!exp) return true;
    
    // Check if token is expired (with 5 minute buffer for renewal)
    return Date.now() >= (exp * 1000) - 300000;
  } catch (error) {
    console.error('Error checking token expiration:', error);
    return true;
  }
}

/**
 * Get token expiration date
 */
export function getTokenExpiration(token: string): Date | null {
  try {
    const parts = token.split('.');
    if (parts.length !== 3) return null;
    
    const payload = JSON.parse(atob(parts[1]));
    const exp = payload.exp;
    
    if (!exp) return null;
    
    return new Date(exp * 1000);
  } catch (error) {
    console.error('Error getting token expiration:', error);
    return null;
  }
}

/**
 * Check if user is authenticated (has valid, non-expired token)
 */
export function isAuthenticated(): boolean {
  const token = getAuthToken();
  if (!token) return false;
  
  // Check if it's a JWT token and if it's expired
  if (token.includes('.')) {
    return !isTokenExpired(token);
  }
  
  // For legacy tokens (like user_xxx), assume they're valid
  return true;
}

/**
 * Store intended destination for post-login redirect
 */
export function setIntendedDestination(path: string): void {
  localStorage.setItem('intended_destination', path);
  console.log(`📍 Stored intended destination: ${path}`);
}

/**
 * Get and clear intended destination for post-login redirect
 */
export function getAndClearIntendedDestination(): string {
  const destination = localStorage.getItem('intended_destination') || '/';
  localStorage.removeItem('intended_destination');
  console.log(`🎯 Retrieved intended destination: ${destination}`);
  return destination;
}

/**
 * Make authenticated API request with token in Authorization header
 */
export async function authenticatedFetch(url: string, options: RequestInit = {}): Promise<Response> {
  const token = getAuthToken();
  
  // Debug logging for production (more detailed)
  if (typeof process !== 'undefined' && process.env && process.env.NODE_ENV === 'production') {
    console.log(`🔐 authenticatedFetch to ${url}:`, { 
      hasToken: !!token, 
      tokenPrefix: token?.substring(0, 10),
      method: options.method || 'GET',
      headers: Object.keys(options.headers || {})
    });
  }
  
  const headers = {
    'Content-Type': 'application/json',
    ...options.headers,
  };
  
  // Add Authorization header if token exists
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
    if (typeof process !== 'undefined' && process.env && process.env.NODE_ENV === 'production') {
      console.log('🔐 Added Authorization header to request');
    }
  } else {
    console.warn('⚠️ No auth token found in localStorage for authenticated request');
  }
  
  return fetch(url, {
    ...options,
    headers,
  });
}

/**
 * Get current user info using stateless authentication
 */
export async function getCurrentUser() {
  console.log('🔍 getCurrentUser called - checking authentication status');
  
  const token = getAuthToken();
  if (!token) {
    throw new Error('No authentication token found');
  }
  
  // Check if token is expired before making request
  if (token.includes('.') && isTokenExpired(token)) {
    console.warn('⚠️ Token is expired, clearing auth token');
    clearAuthToken();
    throw new Error('Authentication token expired');
  }
  
  const response = await authenticatedFetch('/api/auth/user');
  
  console.log(`📊 getCurrentUser response:`, { status: response.status, ok: response.ok });
  
  if (!response.ok) {
    // If we get 401, clear the token
    if (response.status === 401) {
      console.warn('⚠️ Received 401, clearing invalid token');
      clearAuthToken();
    }
    console.error(`❌ getCurrentUser failed with status ${response.status}`);
    throw new Error('Failed to get user info');
  }
  
  const userData = await response.json();
  console.log('✅ getCurrentUser succeeded:', { userId: userData?.id, email: userData?.email });
  
  return userData;
}

/**
 * Logout user by clearing token
 * Note: This function only clears the token. Redirect handling should be done by the calling component.
 */
export function logout(): void {
  console.log('🔓 Logout initiated - clearing auth token from localStorage');
  
  // Clear authentication token immediately
  const hadToken = !!getAuthToken();
  clearAuthToken();
  
  console.log(`✅ Auth token cleared successfully (had token: ${hadToken})`);
  
  // Force immediate redirect to login page with cache busting
  console.log('🔄 Forcing immediate redirect to login page');
  try {
    window.location.replace('/login?t=' + Date.now());
  } catch (error) {
    // Fallback if replace fails
    console.warn('Replace failed, using href fallback:', error);
    window.location.href = '/login?t=' + Date.now();
  }
}
