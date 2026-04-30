import React, { useState, useEffect } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { getAndClearIntendedDestination } from '@/utils/auth';
import { testLocalStorage, debugStorageContents, getStorageInfo } from '../utils/localStorage-debug';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Separator } from '@/components/ui/separator';
import { useToast } from '@/hooks/use-toast';
import { Eye, EyeOff, University, Lock, Mail } from 'lucide-react';

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Debug localStorage on component mount in production
  useEffect(() => {
    if (process.env.NODE_ENV === 'production') {
      const storageInfo = getStorageInfo();
      console.log('🔍 Storage environment info:', storageInfo);
      debugStorageContents();
    }
    
    // Transfer auth token from cookie to localStorage if present (server-side login)
    const transferTokenFromCookie = () => {
      const cookies = document.cookie.split(';');
      const authTokenCookie = cookies.find(cookie => cookie.trim().startsWith('authToken='));
      
      if (authTokenCookie) {
        const token = authTokenCookie.split('=')[1];
        console.log('🔄 Found auth token in cookie, transferring to localStorage');
        
        try {
          localStorage.setItem('authToken', token);
          console.log('✅ Token transferred from cookie to localStorage');
          
          // Clear the cookie since we're using localStorage for stateless auth
          document.cookie = 'authToken=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;';
          console.log('🧹 Cleared auth token cookie');
          
          // Redirect to intended destination or dashboard
          const intendedDestination = getAndClearIntendedDestination() || '/';
          console.log(`🔄 Redirecting to: ${intendedDestination}`);
          window.location.replace(intendedDestination);
        } catch (error) {
          console.error('❌ Failed to transfer token from cookie:', error);
        }
      }
    };
    
    transferTokenFromCookie();
  }, []);

  // Check if SSO is configured using direct state management
  const [ssoStatus, setSsoStatus] = useState<{ ssoConfigured: boolean }>({ ssoConfigured: false });
  const [ssoLoading, setSsoLoading] = useState(true);
  
  useEffect(() => {
    let mounted = true;
    
    const checkSsoStatus = async () => {
      try {
        setSsoLoading(true);
        const response = await fetch('/api/auth/sso-status', {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
          },
        });
        
        if (response.ok && mounted) {
          const data = await response.json();
          console.log('SSO status check result:', data);
          setSsoStatus(data);
        } else if (mounted) {
          console.log('SSO status check failed, defaulting to disabled');
          setSsoStatus({ ssoConfigured: false });
        }
      } catch (error) {
        console.log('SSO status check error, defaulting to disabled:', error);
        if (mounted) {
          setSsoStatus({ ssoConfigured: false });
        }
      } finally {
        if (mounted) {
          setSsoLoading(false);
        }
      }
    };
    
    checkSsoStatus();
    
    return () => {
      mounted = false;
    };
  }, []);

  // Handle server-side form login
  const handleServerLogin = () => {
    console.log('🔄 Submitting server-side login form');
    const intendedDestination = getAndClearIntendedDestination();
    
    const form = document.createElement('form');
    form.method = 'POST';
    form.action = '/auth/login-redirect';
    form.style.display = 'none';
    
    // Add email field
    const emailInput = document.createElement('input');
    emailInput.type = 'hidden';
    emailInput.name = 'email';
    emailInput.value = email;
    form.appendChild(emailInput);
    
    // Add password field  
    const passwordInput = document.createElement('input');
    passwordInput.type = 'hidden';
    passwordInput.name = 'password';
    passwordInput.value = password;
    form.appendChild(passwordInput);
    
    // Add redirect destination
    const redirectInput = document.createElement('input');
    redirectInput.type = 'hidden';
    redirectInput.name = 'redirectTo';
    redirectInput.value = intendedDestination || '/';
    form.appendChild(redirectInput);
    
    document.body.appendChild(form);
    form.submit();
  };

  const loginMutation = useMutation({
    mutationFn: async (credentials: { email: string; password: string }) => {
      console.log('🔐 Attempting login with stateless authentication...');
      
      const response = await fetch('/auth/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(credentials),
        // Remove credentials: 'include' to avoid cookie dependency
      });

      if (!response.ok) {
        const responseText = await response.text();
        console.log(`❌ Login failed with status ${response.status}:`, responseText);
        
        let errorData;
        try {
          errorData = JSON.parse(responseText);
        } catch {
          // Handle HTML error responses (common E2E issue)
          if (responseText.includes('<!DOCTYPE') || responseText.includes('<html>')) {
            console.error('🚨 Server returned HTML instead of JSON - configuration issue');
            throw new Error('Server configuration error - received HTML instead of JSON response');
          }
          console.error('❌ Invalid JSON response:', responseText.substring(0, 200));
          throw new Error('Login failed - invalid server response');
        }
        
        throw new Error(errorData.message || 'Login failed');
      }

      const responseData = await response.json();
      console.log('✅ Login response received successfully');
      return responseData;
    },
    onSuccess: (data) => {
      console.log('🎉 Login successful, processing response...');
      
      // Store authentication token in localStorage (stateless)
      if (data.token) {
        // Test localStorage availability first in production
        if (process.env.NODE_ENV === 'production') {
          const storageTest = testLocalStorage();
          if (!storageTest.available) {
            console.error('❌ localStorage not available:', storageTest.error);
            toast({
              title: "Storage Error",
              description: "Cannot store authentication. Please ensure cookies/storage are enabled.",
              variant: "destructive",
            });
            return;
          }
        }
        
        try {
          localStorage.setItem('authToken', data.token);
          console.log('🔐 Auth token stored successfully in localStorage');
          
          // Verify the token was actually stored
          const storedToken = localStorage.getItem('authToken');
          if (storedToken === data.token) {
            console.log('✅ Token storage verification successful');
          } else {
            console.error('❌ Token storage verification failed:', { expected: data.token.substring(0, 10), stored: storedToken?.substring(0, 10) });
            toast({
              title: "Storage Warning",
              description: "Authentication may not persist between page reloads.",
              variant: "destructive",
            });
          }
        } catch (error) {
          console.error('❌ Failed to store auth token in localStorage:', error);
          toast({
            title: "Storage Warning",
            description: "Authentication may not persist between page reloads.",
            variant: "destructive",
          });
        }
      } else {
        console.warn('⚠️ No token received in login response - this may cause authentication issues');
        toast({
          title: "Authentication Warning",
          description: "Login succeeded but no authentication token received.",
          variant: "destructive",
        });
      }
      
      // Handle server reload instruction for immediate page reload
      if (data.reload || data.redirectTo) {
        const intendedDestination = getAndClearIntendedDestination();
        const redirectTo = intendedDestination || data.redirectTo || '/';
        console.log(`🔄 Server requested reload - performing immediate navigation to: ${redirectTo}`);
        
        // Use window.location.replace for immediate navigation with cache buster
        window.location.replace(redirectTo + (redirectTo.indexOf('?') === -1 ? '?t=' : '&t=') + Date.now());
        return;
      }
      
      // Fallback: manual redirect with query invalidation
      const intendedDestination = getAndClearIntendedDestination();
      const redirectTo = intendedDestination || data.redirectTo || '/';
      console.log(`🔄 Redirecting to: ${redirectTo} (intended: ${intendedDestination}, backend: ${data.redirectTo})`);
      
      // Invalidate auth query to ensure fresh user data
      queryClient.invalidateQueries({ queryKey: ["/api/auth/user"] });
      
      // Force full page reload for clean state
      setTimeout(() => {
        window.location.replace(redirectTo + (redirectTo.indexOf('?') === -1 ? '?t=' : '&t=') + Date.now());
      }, 100);
    },
    onError: (error: Error) => {
      console.error('❌ Login error:', error);
      const errorMessage = error.message || 'Login failed. Please check your credentials.';
      
      // Provide more specific error messages for common issues
      let displayMessage = errorMessage;
      if (errorMessage.includes('HTML instead of JSON')) {
        displayMessage = 'Server configuration error. Please try again or contact IT support.';
      } else if (errorMessage.includes('invalid server response')) {
        displayMessage = 'Connection error. Please check your network and try again.';
      }
      
      setError(displayMessage);
      
      // Clear any existing tokens on login failure
      localStorage.removeItem('authToken');
      localStorage.removeItem('auth_token'); // Also clear legacy key for compatibility
    }
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!email || !password) {
      setError('Please enter both email and password');
      return;
    }

    // First try client-side API login (more test-friendly). If it fails, fall back to server-side form submit.
    console.log('🔄 Attempting client-side API login (mutateAsync)');
    try {
      await loginMutation.mutateAsync({ email, password });

      // After successful mutation, ensure token is actually stored before returning
      const waitForToken = async (timeout = 1000) => {
        const start = Date.now();
        while (Date.now() - start < timeout) {
          try {
            const t = localStorage.getItem('authToken') || localStorage.getItem('auth_token');
            if (t && t.length > 10) return true;
          } catch {
            // ignore storage errors and keep retrying
          }
          // small delay
           
          await new Promise((r) => setTimeout(r, 100));
        }
        return false;
      };

      const tokenFound = await waitForToken(1000);
      if (tokenFound) {
        console.log('✅ Token detected after API login');
        return;
      }

      console.warn('⚠️ Token not detected after API login, falling back to server-side redirect');
      handleServerLogin();

    } catch (apiErr) {
      console.warn('⚠️ API login failed, falling back to server-side redirect:', apiErr);

      // As a final fallback, use server-side redirect for reliability
      console.log('🔄 Using server-side login with redirect fallback');
      handleServerLogin();
    }
  };

  return (
    <div className="min-h-screen !bg-white dark:!bg-gray-900 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* University Header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-university-blue rounded-full mb-4">
            <University className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-2xl font-bold text-foreground">University Inventory</h1>
          <p className="text-muted-foreground">Management System</p>
        </div>

        <Card className="shadow-lg">
          <CardHeader className="space-y-1">
            <CardTitle className="text-2xl text-center">Sign In</CardTitle>
            <CardDescription className="text-center">
              Enter your credentials to access the inventory system
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* SSO Login Option - only render if SSO is explicitly configured */}
          {(() => {
            // Explicit check: only render SSO button if we have confirmed SSO is configured
            const shouldRenderSSO = !ssoLoading && 
                                   ssoStatus && 
                                   ssoStatus.ssoConfigured === true;
            
            console.log('SSO render decision:', {
              ssoLoading,
              ssoStatus,
              ssoConfigured: ssoStatus?.ssoConfigured,
              shouldRenderSSO
            });
            
            if (!shouldRenderSSO) {
              console.log('SSO button NOT rendered - SSO is disabled or loading');
              return null;
            }
            
            console.log('SSO button RENDERED - SSO is configured');
            return (
              <>
                <Button
                  type="button"
                  variant="outline"
                  className="w-full"
                  onClick={() => window.location.href = '/auth/sso'}
                >
                  <University className="mr-2 h-4 w-4" />
                  Sign in with University Account
                </Button>
                <div className="relative">
                  <div className="absolute inset-0 flex items-center">
                    <Separator className="w-full" />
                  </div>
                  <div className="relative flex justify-center text-xs uppercase">
                    <span className="bg-background px-2 text-muted-foreground">Or continue with email</span>
                  </div>
                </div>
              </>
            );
          })()}

            {/* Local Login Form */}
            <form onSubmit={handleSubmit} className="space-y-4">
              {error && (
                <Alert variant="destructive">
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              )}

              <div className="space-y-2">
                <Label htmlFor="email">Email Address</Label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    id="email"
                    type="email"
                    placeholder="Enter your email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="pl-9"
                    required
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="password">Password</Label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    id="password"
                    type={showPassword ? 'text' : 'password'}
                    placeholder="Enter your password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="pl-9 pr-9"
                    required
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="absolute right-0 top-0 h-full px-3 hover:bg-transparent"
                    onClick={() => setShowPassword(!showPassword)}
                  >
                    {showPassword ? (
                      <EyeOff className="h-4 w-4 text-muted-foreground" />
                    ) : (
                      <Eye className="h-4 w-4 text-muted-foreground" />
                    )}
                  </Button>
                </div>
              </div>

              <Button
                type="submit"
                className="w-full"
                disabled={loginMutation.isPending}
              >
                {loginMutation.isPending ? 'Signing in...' : 'Sign In'}
              </Button>
            </form>

            {/* Backup: Server-Side Form (Hidden, only shown on client-side failure) */}
            {process.env.NODE_ENV === 'development' && (
              <div className="mt-4 pt-4 border-t border-gray-200">
                <details className="cursor-pointer">
                  <summary className="text-sm text-gray-500 hover:text-gray-700">
                    Advanced: Server-Side Login (Fallback)
                  </summary>
                  <form action="/auth/login-redirect" method="POST" className="mt-4 space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="email-server">Email Address</Label>
                      <Input
                        id="email-server"
                        name="email"
                        type="email"
                        placeholder="Enter your email"
                        required
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="password-server">Password</Label>
                      <Input
                        id="password-server"
                        name="password"
                        type="password"
                        placeholder="Enter your password"
                        required
                      />
                    </div>
                    <input type="hidden" name="redirectTo" value="/" />
                    <Button type="submit" className="w-full" variant="outline">
                      Sign In (Server-Side)
                    </Button>
                  </form>
                </details>
              </div>
            )}

            {/* Help Text */}
            <div className="text-center text-sm text-muted-foreground">
              <p>
                Need help accessing your account?{' '}
                <a href="mailto:it-support@university.edu" className="text-university-blue hover:underline">
                  Contact IT Support
                </a>
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Footer */}
        <div className="text-center mt-8 text-sm text-gray-500">
          <p> 2025 University Inventory Management System</p>
          <p>Secure • Reliable • University-Grade</p>
        </div>
      </div>
    </div>
  );
}