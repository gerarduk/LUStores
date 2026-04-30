import bcrypt from 'bcrypt';
import passport from 'passport';
import { Strategy as LocalStrategy } from 'passport-local';
import session from 'express-session';
import type { Express, RequestHandler } from 'express';
import connectPg from 'connect-pg-simple';
import { storage } from './storage';
import validator from 'validator';
import { generateToken, verifyToken } from './jwt';

// Extended session interface
declare module "express-session" {
  interface SessionData {
    returnTo?: string;
  }
}

// Password security configuration
const SALT_ROUNDS = 12;
const MIN_PASSWORD_LENGTH = 8;

export interface CreateUserData {
  email: string;
  password: string;
  firstName: string;
  lastName: string;
  role?: 'user' | 'superuser' | 'admin';
}

export interface ChangePasswordData {
  currentPassword: string;
  newPassword: string;
}

// Password validation
export function validatePassword(password: string): { valid: boolean; errors: string[] } {
  const errors: string[] = [];

  if (password.length < MIN_PASSWORD_LENGTH) {
    errors.push(`Password must be at least ${MIN_PASSWORD_LENGTH} characters long`);
  }

  if (!/[A-Z]/.test(password)) {
    errors.push('Password must contain at least one uppercase letter');
  }

  if (!/[a-z]/.test(password)) {
    errors.push('Password must contain at least one lowercase letter');
  }

  if (!/[0-9]/.test(password)) {
    errors.push('Password must contain at least one number');
  }

  if (!/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password)) {
    errors.push('Password must contain at least one special character');
  }

  return {
    valid: errors.length === 0,
    errors
  };
}

// Hash password using bcrypt
export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, SALT_ROUNDS);
}

// Verify password against hash
export async function verifyPassword(password: string, hash: string): Promise<boolean> {
  return bcrypt.compare(password, hash);
}

// Generate temporary password
export function generateTemporaryPassword(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789!@#$%';
  let password = '';
  
  // Ensure at least one of each required character type
  password += 'ABCDEFGHJKLMNPQRSTUVWXYZ'[Math.floor(Math.random() * 25)]; // Uppercase
  password += 'abcdefghijkmnpqrstuvwxyz'[Math.floor(Math.random() * 25)]; // Lowercase
  password += '23456789'[Math.floor(Math.random() * 8)]; // Number
  password += '!@#$%'[Math.floor(Math.random() * 5)]; // Special char
  
  // Fill the rest randomly
  for (let i = 4; i < 12; i++) {
    password += chars[Math.floor(Math.random() * chars.length)];
  }
  
  // Shuffle the password
  return password.split('').sort(() => Math.random() - 0.5).join('');
}

// Setup local authentication
export async function setupLocalAuth(app: Express) {
  // Trust proxy for HTTPS redirects
  app.set('trust proxy', 1);
  
  // Validate session secret in production
  if (process.env.NODE_ENV === 'production' && (!process.env.SESSION_SECRET || process.env.SESSION_SECRET === 'your-secret-key-here' || process.env.SESSION_SECRET.length < 32)) {
    throw new Error('SESSION_SECRET must be set to a secure value (32+ characters) in production environment');
  }

  // Setup session middleware
  const sessionTtl = 7 * 24 * 60 * 60 * 1000; // 1 week
  const pgStore = connectPg(session);
  const sessionStore = new pgStore({
    conString: process.env.DATABASE_URL,
    createTableIfMissing: false,
    ttl: sessionTtl,
    tableName: "sessions",
  });

  // Compute cookie/security flags once so behavior is consistent
  const isProduction = process.env.NODE_ENV === 'production';
  const enableHttps = (process.env.FORCE_HTTPS === 'true' || process.env.HTTPS === 'true');
  const cookieSecure = isProduction && enableHttps;
  const cookieSameSite: 'strict' | 'lax' = isProduction ? 'strict' : 'lax';
  
  app.use(session({
    secret: process.env.SESSION_SECRET!,
    store: sessionStore,
    resave: false,
    saveUninitialized: false,
    cookie: {
      httpOnly: true,
      secure: cookieSecure,
      maxAge: sessionTtl,
      sameSite: cookieSameSite,
      path: '/',
    },
  }));
  
  // Initialize Passport
  app.use(passport.initialize());
  app.use(passport.session());

  // Local Strategy
  passport.use(new LocalStrategy(
    {
      usernameField: 'email',
      passwordField: 'password'
    },
    async (email, password, done) => {
      try {
        // Find user by email
        const user = await storage.getUserByEmail(email);
        
        if (!user) {
          return done(null, false, { message: 'Invalid email or password' });
        }

        if (!user.isActive) {
          return done(null, false, { message: 'Account is disabled' });
        }

        // Check if user has a password (SSO users might not)
        if (!user.password_hash) {
          return done(null, false, { message: 'Please use Single Sign-On to access your account' });
        }

        // Verify password
        const isValid = await verifyPassword(password, user.password_hash);
        
        if (!isValid) {
          return done(null, false, { message: 'Invalid email or password' });
        }

        // Update last login
        await storage.updateUserLastLogin(user.id);

        return done(null, user);
      } catch (error) {
        return done(error);
      }
    }
  ));

  // Passport serialization
  passport.serializeUser((user: any, done) => {
    done(null, user.id);
  });

  passport.deserializeUser(async (id: string, done) => {
    try {
      const user = await storage.getUser(id);
      done(null, user);
    } catch (error) {
      done(error, null);
    }
  });

  // Local authentication routes
  console.log('🔐 REGISTERING /auth/login route...');
  app.post('/auth/login', (req, res, next) => {
    console.log('🔐 /auth/login route HIT with body:', req.body);
    console.log('Login attempt:', req.body);
    passport.authenticate('local', (err: any, user: any, info: any) => {
      console.log('Auth result:', { err, user: user ? { id: user.id, email: user.email } : null, info });

      if (err) {
        return res.status(500).json({ message: 'Authentication error', error: err.message });
      }

      if (!user) {
        return res.status(401).json({ message: info?.message || 'Authentication failed' });
      }

      req.logIn(user, (err) => {
        if (err) {
          console.log('Login error:', err);
          return res.status(500).json({ message: 'Login error', error: err.message });
        }

        // Clear any session returnTo (for session-based flows)
        const sessionReturnTo = req.session?.returnTo;
        delete req.session?.returnTo;

        // Generate proper JWT token
        const jwtToken = generateToken({
          id: user.id,
          email: user.email,
          firstName: user.firstName,
          lastName: user.lastName,
          role: user.role
        });

        // Also set a non-httpOnly cookie so navigations pick up the token immediately
        try {
          res.cookie('authToken', jwtToken, {
            httpOnly: false,
            secure: cookieSecure,
            sameSite: cookieSameSite,
            maxAge: sessionTtl,
            path: '/',
          });
        } catch (e) {
          console.warn('Could not set auth cookie:', e);
        }

        // Prepare response payload including redirect instruction for clients/tests
        const redirectTo = req.body?.redirectTo || sessionReturnTo || '/';

        const response = {
          success: true,
          user: {
            id: user.id,
            email: user.email,
            firstName: user.firstName,
            lastName: user.lastName,
            role: user.role
          },
          token: jwtToken,
          redirectTo,
          reload: true
        };

        console.log('🔐 Sending login response:', {
          success: response.success,
          userId: response.user.id,
          token: response.token,
          redirectTo: response.redirectTo
        });

        // If the client expects HTML (form submit / full page flow) respond with an HTML page that sets token and performs a full reload/redirect.
        const accept = (req.headers.accept || '').toString();
        let wantsHtml = accept.includes('text/html') || req.headers['content-type'] === 'application/x-www-form-urlencoded' || !!req.body?.redirectTo;
        // Allow forcing HTML behavior in CI/E2E via environment variable for determinism
        if (process.env.FORCE_HTML_LOGIN === 'true') {
          wantsHtml = true;
          console.log('🔁 FORCE_HTML_LOGIN enabled - responding with HTML redirect for /auth/login');
        }

        if (wantsHtml) {
          // Send a small HTML page that writes the token to localStorage and then forces a full navigation
          return res.send(`
            <!DOCTYPE html>
            <html>
            <head>
              <meta charset="utf-8" />
              <meta http-equiv="Cache-Control" content="no-store" />
              <title>Signing in...</title>
            </head>
            <body>
              <div style="display:flex;align-items:center;justify-content:center;height:100vh;font-family:Arial, sans-serif;">
                <div style="text-align:center;">
                  <div style="margin-bottom:16px;">✅ Login successful — signing you in</div>
                  <div style="width:36px;height:36px;border:4px solid #f3f3f3;border-top:4px solid #3498db;border-radius:50%;animation:spin 0.9s linear infinite;margin:0 auto"></div>
                </div>
              </div>
              <style>@keyframes spin{0%{transform:rotate(0deg)}100%{transform:rotate(360deg)}}</style>
              <script>
                (function(){
                  try {
                    const token = '${jwtToken}';
                    // Save token to localStorage for SPA runtime
                    localStorage.setItem('authToken', token);
                    // Also set legacy key
                    localStorage.removeItem('auth_token');
                    // Set cookie (for non-httpOnly availability) - will also be set by server but ensure client side too
                    document.cookie = 'authToken=' + token + '; path=/; max-age=' + (${sessionTtl} / 1000) + '; ' + (location.protocol === 'https:' ? 'secure; ' : '');
                    console.log('✅ Auth token saved and cookie set by client');
                  } catch (e) { console.error('Error storing auth token:', e); }

                  // Force a full navigation to ensure app picks up auth state; include cache buster
                  var dest = '${redirectTo}';
                  setTimeout(function(){
                    try { window.location.replace(dest + (dest.indexOf('?') === -1 ? '?t=' : '&t=') + Date.now()); }
                    catch(e){ window.location.href = dest + (dest.indexOf('?') === -1 ? '?t=' : '&t=') + Date.now(); }
                  }, 150);
                })();
              </script>
            </body>
            </html>
          `);
        }

        // Default: return JSON with reload instruction and cookie already set
        return res.json(response);
      });
    })(req, res, next);
  });

  // Add server-side login with redirect for form submissions and full page reload
  app.post('/auth/login-redirect', (req, res, next) => {
    console.log('🔄 Login with redirect attempt:', req.body.email);
    passport.authenticate('local', (err: any, user: any, info: any) => {
      console.log('Auth result for redirect:', { err, user: user ? { id: user.id, email: user.email } : null, info });
      
      if (err) {
        console.error('Authentication error:', err);
        return res.redirect('/login?error=' + encodeURIComponent('Authentication error occurred'));
      }
      
      if (!user) {
        console.log('Authentication failed:', info?.message);
        return res.redirect('/login?error=' + encodeURIComponent(info?.message || 'Invalid credentials'));
      }
      
      req.logIn(user, (err) => {
        if (err) {
          console.error('Login error:', err);
          return res.redirect('/login?error=' + encodeURIComponent('Login error occurred'));
        }
        
        // Generate JWT token for stateless authentication
        const jwtToken = generateToken({
          id: user.id,
          email: user.email,
          firstName: user.firstName,
          lastName: user.lastName,
          role: user.role
        });

        console.log('✅ Login successful for redirect, setting token and sending reload page');
        
        // Get redirect destination from form or default to dashboard
        const redirectTo = req.body.redirectTo || '/';
        console.log(`🔄 Will redirect successful login to: ${redirectTo}`);
        
        // Send HTML page that sets the token and forces full reload
        res.send(`
          <!DOCTYPE html>
          <html>
          <head>
            <title>Signing in...</title>
          </head>
          <body>
            <div style="display: flex; justify-content: center; align-items: center; height: 100vh; font-family: Arial, sans-serif;">
              <div style="text-align: center;">
                <div style="margin-bottom: 20px;">✅ Login successful! Redirecting...</div>
                <div style="width: 40px; height: 40px; border: 4px solid #f3f3f3; border-top: 4px solid #3498db; border-radius: 50%; animation: spin 1s linear infinite; margin: 0 auto;"></div>
              </div>
            </div>
            <style>
              @keyframes spin {
                0% { transform: rotate(0deg); }
                100% { transform: rotate(360deg); }
              }
            </style>
            <script>
              console.log('🔐 Client-side login token setup starting...');
              
              try {
                // Set the auth token in localStorage
                const token = '${jwtToken}';
                localStorage.setItem('authToken', token);
                console.log('✅ Auth token set in localStorage');
                
                // Clear any old auth data
                localStorage.removeItem('auth_token'); // old key if it exists
                console.log('✅ Old auth data cleared');
                
              } catch (e) {
                console.error('❌ Error setting auth token:', e);
              }
              
              // Force full page navigation to destination
              setTimeout(() => {
                console.log('🔄 Redirecting to ${redirectTo} with full page reload...');
                window.location.href = '${redirectTo}?t=' + Date.now();
              }, 1000);
            </script>
          </body>
          </html>
        `);
      });
    })(req, res, next);
  });

  // Logout
  app.post('/auth/logout', (req, res) => {
    req.logout(() => {
      // Return a reload instruction for clients/tests to act on (consistent with login flow)
      res.json({ success: true, reload: true, redirectTo: '/login' });
    });
  });

  // Add GET logout endpoint for direct browser navigation with full reload
  app.get('/auth/logout', (req, res) => {
    console.log('🔓 Logout request received - clearing all auth state and forcing reload');
    req.logout((err: any) => {
      if (err) {
        console.error('Logout error:', err);
      }
      console.log('✅ Session cleared, clearing auth cookie');
      
      // Clear the authentication cookie completely
      res.clearCookie('authToken', {
        httpOnly: false,
        secure: cookieSecure,
        sameSite: cookieSameSite,
        path: '/',
      });
      
      // Also clear any potential session cookies
      res.clearCookie('connect.sid');
      
      console.log('🔄 Sending HTML page that clears localStorage and redirects');
      
      // Send an HTML page that clears localStorage and forces redirect
      res.send(`
        <!DOCTYPE html>
        <html>
        <head>
          <title>Signing out...</title>
        </head>
        <body>
          <div style="display: flex; justify-content: center; align-items: center; height: 100vh; font-family: Arial, sans-serif;">
            <div style="text-align: center;">
              <div style="margin-bottom: 20px;">🔓 Signing you out...</div>
              <div style="width: 40px; height: 40px; border: 4px solid #f3f3f3; border-top: 4px solid #3498db; border-radius: 50%; animation: spin 1s linear infinite; margin: 0 auto;"></div>
            </div>
          </div>
          <style>
            @keyframes spin {
              0% { transform: rotate(0deg); }
              100% { transform: rotate(360deg); }
            }
          </style>
          <script>
            console.log('🔓 Client-side logout cleanup starting...');
            
            // Clear all localStorage items related to auth
            try {
              localStorage.removeItem('authToken');
              localStorage.removeItem('auth_token');
              localStorage.removeItem('intended_destination');
              console.log('✅ localStorage cleared');
            } catch (e) {
              console.log('⚠️ Error clearing localStorage:', e);
            }
            
            // Clear sessionStorage too
            try {
              sessionStorage.clear();
              console.log('✅ sessionStorage cleared');
            } catch (e) {
              console.log('⚠️ Error clearing sessionStorage:', e);
            }
            
            // Force full page reload to login with cache busting
            setTimeout(() => {
              console.log('🔄 Redirecting to login with full page reload...');
              window.location.href = '/login?t=' + Date.now();
            }, 1000);
          </script>
        </body>
        </html>
      `);
    });
  });

  // Get current user - JWT TOKEN VERSION
  app.get('/api/auth/user', async (req, res) => {
    try {
      // Check for Authorization header with Bearer token
      const authHeader = req.headers.authorization;
      if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return res.status(401).json({ message: 'No authentication token provided' });
      }

      const token = authHeader.substring(7); // Remove 'Bearer ' prefix
      
      // Verify JWT token
      const payload = verifyToken(token);
      if (payload) {
        // Get fresh user data from database to ensure it's still active
        const user = await storage.getUser(payload.userId);
        
        if (!user || !user.isActive) {
          return res.status(401).json({ message: 'Invalid or inactive user' });
        }
        
        return res.json({
          id: user.id,
          email: user.email,
          firstName: user.firstName,
          lastName: user.lastName,
          role: user.role,
          isActive: user.isActive,
          lastLogin: user.lastLogin,
          mustChangePassword: user.mustChangePassword,
          showPickingList: user.showPickingList
        });
      }
      
      // Only allow legacy tokens in development/test environments
      if (process.env.NODE_ENV === 'development' || process.env.NODE_ENV === 'test') {
        // Fallback: For E2E tests, accept simple user ID token format
        if (token.startsWith('user_')) {
          const userId = token.substring(5); // Remove 'user_' prefix to get actual user ID
          console.log(`🔐 DEV/TEST: Legacy token validation: token='${token}' -> userId='${userId}'`);
          const user = await storage.getUser(userId);
          
          if (!user || !user.isActive) {
            return res.status(401).json({ message: 'Invalid or inactive user' });
          }
          
          return res.json({
            id: user.id,
            email: user.email,
            firstName: user.firstName,
            lastName: user.lastName,
            role: user.role,
            isActive: user.isActive,
            lastLogin: user.lastLogin,
            mustChangePassword: user.mustChangePassword,
            showPickingList: user.showPickingList
          });
        }
        
        // Development admin fallback
        if (token === 'dev_admin_token') {
          console.log(`🔐 DEV/TEST: Using development admin token`);
          return res.json({
            id: 'test-admin',
            email: 'admin@test.com',
            firstName: 'Test',
            lastName: 'Admin',
            role: 'admin',
            isActive: true,
            mustChangePassword: false,
            lastLogin: new Date(),
            showPickingList: true
          });
        }
      }
      
      return res.status(401).json({ message: 'Invalid authentication token' });
      
    } catch (error) {
      console.error('Auth user error:', error);
      return res.status(500).json({ message: 'Authentication error' });
    }
  });

  // Test endpoint to check database user (for debugging) - SECURED
  app.get('/api/test/user/:email', requireAuth, requireRole(['admin']), async (req, res) => {
    try {
      const user = await storage.getUserByEmail(req.params.email as string);
      if (user) {
        res.json({
          found: true,
          user: {
            id: user.id,
            email: user.email,
            hasPassword: !!user.password_hash,
            isActive: user.isActive,
            role: user.role,
            firstName: user.firstName,
            lastName: user.lastName
          }
        });
      } else {
        res.json({ found: false });
      }
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  return true;
}

// Authentication middleware
export const requireAuth: RequestHandler = async (req, res, next) => {
  console.log(`🔐 requireAuth: ${req.method} ${req.path}, NODE_ENV=${process.env.NODE_ENV}`);
  
  // Only bypass authentication in development if specifically enabled via env var
  if ((process.env.NODE_ENV === 'development' || !process.env.NODE_ENV) && process.env.BYPASS_AUTH === 'true') {
    console.log('🔓 Development admin override active - bypassing authentication');
    // Create a mock admin user for development
    (req as any).user = {
      id: 'dev_admin_001',
      email: 'dev@admin.local',
      firstName: 'Development',
      lastName: 'Admin',
      role: 'admin',
      isActive: true,
      mustChangePassword: false,
      lastLogin: new Date()
    };
    return next();
  }

  // REMOVED: Dangerous development auth bypass that was allowing unauthenticated access in production

  // Check for session-based authentication first
  console.log(`🔐 Checking session authentication...`);
  if (req.isAuthenticated() && req.user) {
    console.log(`🔐 Session authentication successful for user: ${(req.user as any).id}`);
    return next();
  }
  
  // Check for Authorization header with Bearer token (for JWT and API calls)
  console.log(`🔐 Checking Bearer token authentication...`);
  const authHeader = req.headers.authorization;
  console.log(`🔐 Authorization header:`, authHeader);
  console.log(`🔐 Accept header:`, req.headers.accept);
  console.log(`🔐 Content-Type header:`, req.headers['content-type']);
  console.log(`🔐 Request is XHR:`, req.xhr);
  console.log(`🔐 All request headers:`, Object.keys(req.headers).reduce((acc, key) => {
    if (key.toLowerCase().includes('auth') || key.toLowerCase().includes('accept') || key.toLowerCase().includes('content')) {
      acc[key] = req.headers[key];
    }
    return acc;
  }, {} as Record<string, any>));
  
  if (authHeader && authHeader.startsWith('Bearer ')) {
    const token = authHeader.substring(7); // Remove 'Bearer ' prefix
    console.log(`🔐 Processing Bearer token:`, token.substring(0, 20) + '...');
    
    try {
      // First try JWT token verification
      const payload = verifyToken(token);
      if (payload) {
        // Get fresh user data from database
        const user = await storage.getUser(payload.userId);
        
        if (user && user.isActive) {
          // Attach user to request for downstream middleware
          (req as any).user = {
            id: user.id,
            email: user.email,
            firstName: user.firstName,
            lastName: user.lastName,
            role: user.role,
            isActive: user.isActive,
            lastLogin: user.lastLogin,
            mustChangePassword: user.mustChangePassword
          };
          console.log('🔐 JWT authentication successful for user:', (req as any).user.id);
          return next();
        }
      }
      
      // Only allow legacy tokens in development/test environments
      if (process.env.NODE_ENV === 'development' || process.env.NODE_ENV === 'test') {
        // Fallback: For E2E tests, accept simple user ID token format
        if (token.startsWith('user_')) {
          const userId = token.substring(5); // Remove 'user_' prefix to get actual user ID
          console.log(`🔐 DEV/TEST: Legacy token validation in requireAuth: token='${token}' -> userId='${userId}'`);
          const user = await storage.getUser(userId);
          
          if (user && user.isActive) {
            // Attach user to request for downstream middleware
            (req as any).user = {
              id: user.id,
              email: user.email,
              firstName: user.firstName,
              lastName: user.lastName,
              role: user.role,
              isActive: user.isActive,
              lastLogin: user.lastLogin,
              mustChangePassword: user.mustChangePassword
            };
            return next();
          }
        }
        
        // Development admin fallback for E2E compatibility
        if (token === 'dev_admin_token') {
          console.log(`🔐 DEV/TEST: Using development admin token in requireAuth`);
          (req as any).user = {
            id: 'test-admin',
            email: 'admin@test.com',
            firstName: 'Test',
            lastName: 'Admin',
            role: 'admin',
            isActive: true,
            mustChangePassword: false,
            lastLogin: new Date()
          };
          return next();
        }
      }
    } catch (error) {
      console.error('Error validating token:', error);
    }
  }
  
  console.log('🔐 Authentication failed, redirecting to login');
  
  // Store the attempted URL for redirect after login
  if (req.method === 'GET' && !req.xhr) {
    req.session!.returnTo = req.originalUrl;
  }
  
  console.log('🔐 Checking response type - xhr:', req.xhr, 'accept header:', req.headers.accept);
  console.log('🔐 Accept includes JSON:', req.headers.accept?.includes('application/json'));
  
  if (req.xhr || req.headers.accept?.includes('application/json')) {
    console.log('🔐 Returning 401 JSON response');
    return res.status(401).json({ 
      error: 'Authentication required',
      loginUrl: '/auth/login'
    });
  }
  
  console.log('🔐 Redirecting to /login');
  res.redirect('/login');
};

// Role-based authorization middleware
export function requireRole(roles: string | string[]) {
  const allowedRoles = Array.isArray(roles) ? roles : [roles];
  
  return (req: any, res: any, next: any) => {
    if (!req.isAuthenticated() || !req.user) {
      return res.status(401).json({ error: 'Authentication required' });
    }
    
    if (!allowedRoles.includes(req.user.role)) {
      return res.status(403).json({ 
        error: 'Insufficient permissions',
        required: allowedRoles,
        current: req.user.role
      });
    }
    
    next();
  };
}

// User management functions
export async function createUser(userData: CreateUserData): Promise<any> {
  // Validate email
  if (!validator.isEmail(userData.email)) {
    throw new Error('Invalid email address');
  }

  // Validate password
  const passwordValidation = validatePassword(userData.password);
  if (!passwordValidation.valid) {
    throw new Error(`Password validation failed: ${passwordValidation.errors.join(', ')}`);
  }

  // Check if user already exists
  const existingUser = await storage.getUserByEmail(userData.email);
  if (existingUser) {
    throw new Error('User with this email already exists');
  }

  // Hash password
  const passwordHash = await hashPassword(userData.password);

  // Create user
  const newUser = await storage.createLocalUser({
    email: userData.email,
    password_hash: passwordHash,
    firstName: userData.firstName,
    lastName: userData.lastName,
    role: userData.role || 'user',
    isActive: true,
    mustChangePassword: false
  });

  return newUser;
}

export async function changeUserPassword(userId: string, passwordData: ChangePasswordData): Promise<void> {
  // Get current user
  const user = await storage.getUser(userId);
  if (!user) {
    throw new Error('User not found');
  }

  // Verify current password if user has one
  if (user.password_hash && passwordData.currentPassword) {
    const isValid = await verifyPassword(passwordData.currentPassword, user.password_hash);
    if (!isValid) {
      throw new Error('Current password is incorrect');
    }
  }

  // Validate new password
  const passwordValidation = validatePassword(passwordData.newPassword);
  if (!passwordValidation.valid) {
    throw new Error(`Password validation failed: ${passwordValidation.errors.join(', ')}`);
  }

  // Hash new password
  const newPasswordHash = await hashPassword(passwordData.newPassword);

  // Update user
  await storage.updateUserPassword(userId, newPasswordHash);
}

export async function resetUserPassword(userId: string, adminId: string): Promise<string> {
  // Generate temporary password
  const tempPassword = generateTemporaryPassword();
  const passwordHash = await hashPassword(tempPassword);

  // Update user with temporary password
  await storage.updateUserPassword(userId, passwordHash, true); // mustChangePassword = true

  // Log the password reset action
  console.log(`Password reset by admin ${adminId} for user ${userId}`);

  return tempPassword;
}