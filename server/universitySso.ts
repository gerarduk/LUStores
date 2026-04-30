import { Strategy as SamlStrategy } from "@node-saml/passport-saml";
import passport = require("passport");
import session = require("express-session");
import type { Express, RequestHandler } from "express";
import connectPg = require("connect-pg-simple");
import { storage } from "./storage";

// Extended session interface
declare module "express-session" {
  interface SessionData {
    returnTo?: string;
  }
}

// Setup University SSO Authentication
export async function setupUniversitySso(app: Express) {
  // Validate required environment variables
  const requiredVars = [
    'SAML_ENTRY_POINT',
    'SAML_ISSUER', 
    'SAML_CALLBACK_URL',
    'SAML_CERT',
    'SESSION_SECRET'
  ];

  const missingVars = requiredVars.filter(varName => !process.env[varName]);
  if (missingVars.length > 0) {
    console.warn(`Missing SAML environment variables: ${missingVars.join(', ')}. SAML authentication disabled.`);
    return false;
  }

  // Trust proxy for HTTPS redirects
  app.set('trust proxy', 1);
  
  // Setup session middleware
  const sessionTtl = 7 * 24 * 60 * 60 * 1000; // 1 week
  const pgStore = connectPg(session);
  const sessionStore = new pgStore({
    conString: process.env.DATABASE_URL,
    createTableIfMissing: false,
    ttl: sessionTtl,
    tableName: "sessions",
  });
  
  app.use(session({
    secret: process.env.SESSION_SECRET!,
    store: sessionStore,
    resave: false,
    saveUninitialized: false,
    cookie: {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production' && (process.env.FORCE_HTTPS === 'true' || process.env.HTTPS === 'true'),
      maxAge: sessionTtl,
      sameSite: 'lax',
    },
  }));
  
  // Initialize Passport
  app.use(passport.initialize());
  app.use(passport.session());

  // Create SAML strategy
  const samlStrategy = new SamlStrategy(
    {
      entryPoint: process.env.SAML_ENTRY_POINT!,
      issuer: process.env.SAML_ISSUER!,
      callbackUrl: process.env.SAML_CALLBACK_URL!,
      idpCert: process.env.SAML_CERT!.replace(/\\n/g, '\n'), // Changed from 'cert' to 'idpCert'
      acceptedClockSkewMs: 60000,
      identifierFormat: "urn:oasis:names:tc:SAML:1.1:nameid-format:emailAddress",
    },
    async function(profile: any, done: any) {
      try {
        // Extract user information from SAML response
        const userInfo = {
          id: profile.nameID || profile['urn:oid:0.9.2342.19200300.100.1.1'], // uid
          email: profile.nameID || profile['urn:oid:0.9.2342.19200300.100.1.3'], // mail
          firstName: profile['urn:oid:2.5.4.42'] || profile.givenName || '', // givenName
          lastName: profile['urn:oid:2.5.4.4'] || profile.surname || '', // sn
          department: profile['urn:oid:2.5.4.11'] || profile.department || '', // ou
          affiliation: profile['urn:oid:1.3.6.1.4.1.5923.1.1.1.1'] || '', // eduPersonAffiliation
        };

        // Determine user role based on affiliation
        let role = 'user';
        if (userInfo.affiliation) {
          const affiliations = Array.isArray(userInfo.affiliation) 
            ? userInfo.affiliation 
            : [userInfo.affiliation];
          
          if (affiliations.includes('faculty') || affiliations.includes('staff')) {
            role = 'manager';
          }
          if (affiliations.includes('admin') || userInfo.department?.toLowerCase().includes('it')) {
            role = 'admin';
          }
        }

        // Upsert user in database
        const user = await storage.upsertUser({
          id: userInfo.id,
          email: userInfo.email,
          firstName: userInfo.firstName,
          lastName: userInfo.lastName,
          role: role,
          isActive: true,
        });

        return done(null, user);
      } catch (error) {
        console.error('SAML authentication error:', error);
        return done(error, null);
      }
    },
    async function(profile: any, done: any) {
      // Handle logout verification if needed
      return done(null, null);
    }
  );

  passport.use('saml', samlStrategy as any);

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

  // SAML Routes
  
  // Initiate SAML login
  app.get('/auth/sso', passport.authenticate('saml', {
    successRedirect: '/',
    failureRedirect: '/auth/login/fail'
  }));

  // SAML callback (ACS - Assertion Consumer Service)
  app.post('/auth/sso/callback', 
    passport.authenticate('saml', {
      failureRedirect: '/auth/login/fail',
      failureFlash: true
    }),
    (req, res) => {
      // Successful authentication
      const returnTo = req.session?.returnTo || '/';
      delete req.session?.returnTo;
      res.redirect(returnTo);
    }
  );

  // SAML metadata endpoint
  app.get('/auth/sso/metadata', (req, res) => {
    try {
      const metadata = samlStrategy.generateServiceProviderMetadata(
        process.env.SAML_CERT!,
        process.env.SAML_CERT!
      );
      res.type('application/xml');
      res.send(metadata);
    } catch (error) {
      console.error('Error generating SAML metadata:', error);
      res.status(500).send('Error generating metadata');
    }
  });

  // Logout
  app.get('/auth/logout', (req, res) => {
    console.log('🔓 University SSO Logout request received - clearing session and redirecting');
    req.logout(() => {
      console.log('✅ University SSO session cleared, redirecting to login page');
      res.redirect('/login');
    });
  });

  // Login failure page
  app.get('/auth/login/fail', (req, res) => {
    res.status(401).json({
      error: 'Authentication failed',
      message: 'Please contact your system administrator if this problem persists.'
    });
  });

  return true;
}

// Authentication middleware
export const requireAuth: RequestHandler = (req, res, next) => {
  if (req.isAuthenticated() && req.user) {
    return next();
  }
  
  // Store the attempted URL for redirect after login
  if (req.method === 'GET' && !req.xhr) {
    req.session!.returnTo = req.originalUrl;
  }
  
  if (req.xhr || req.headers.accept?.includes('application/json')) {
    return res.status(401).json({ 
      error: 'Authentication required',
      loginUrl: '/auth/sso'
    });
  }
  
  res.redirect('/auth/sso');
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