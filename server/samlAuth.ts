/**
 * ⚠️ DEPRECATED/UNUSED FILE
 * 
 * This file provides SAML authentication setup, but it is NOT currently used in the application.
 * 
 * Current Status:
 * - setupSamlAuth() is never imported or called anywhere in the codebase
 * - universitySso.ts handles SAML authentication instead (with similar implementation)
 * - replitAuth.ts handles Replit OIDC (also unused)
 * - localAuth.ts provides the active fallback authentication
 * 
 * Recommendation:
 * 1. If SAML is needed: Delete this file and use universitySso.ts instead (consolidate)
 * 2. If SAML is not needed: Delete this entire file to reduce confusion
 * 3. If this is intended to be an alternative: Document when/why to use it
 * 
 * Redundant Functions:
 * - createSamlStrategy() - Similar to universitySso.ts
 * - setupSamlAuth() - Similar to setupUniversitySso()
 * - Route handlers (/auth/saml, /auth/logout, etc) - Duplicated in universitySso.ts
 */

import { Strategy as SamlStrategy, SamlConfig } from "@node-saml/passport-saml";
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

// University SAML Strategy
export function createSamlStrategy(config?: SamlConfig) {
  const samlConfig = config || {
    entryPoint: process.env.SAML_ENTRY_POINT!,
    issuer: process.env.SAML_ISSUER!,
    callbackUrl: process.env.SAML_CALLBACK_URL!,
    idpCert: process.env.SAML_CERT!.replace(/\\n/g, '\n'), // Changed from 'cert' to 'idpCert'
    acceptedClockSkewMs: 60000,
    identifierFormat: "urn:oasis:names:tc:SAML:1.1:nameid-format:emailAddress",
  };

  const signonVerify = async function(profile: any, done: any) {
    try {
      // Extract user information from SAML response
      const userInfo = {
        id: profile.nameID || profile['urn:oid:0.9.2342.19200300.100.1.1'], // uid
        email: profile.nameID || profile['urn:oid:0.9.2342.19200300.100.1.3'], // mail
        firstName: profile['urn:oid:2.5.4.42'] || profile.givenName || '', // givenName
        lastName: profile['urn:oid:2.5.4.4'] || profile.surname || '', // sn
        displayName: profile['urn:oid:2.16.840.1.113730.3.1.241'] || profile.displayName || '',
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
  };

  const logoutVerify = async function(profile: any, done: any) {
    // Handle logout verification if needed
    return done(null, null);
  };

  return new SamlStrategy(samlConfig, signonVerify, logoutVerify);
}

// Session configuration for SAML
export function getSamlSession() {
  const sessionTtl = 7 * 24 * 60 * 60 * 1000; // 1 week
  const pgStore = connectPg(session);
  const sessionStore = new pgStore({
    conString: process.env.DATABASE_URL,
    createTableIfMissing: false,
    ttl: sessionTtl,
    tableName: "sessions",
  });
  
  return session({
    secret: process.env.SESSION_SECRET!,
    store: sessionStore,
    resave: false,
    saveUninitialized: false,
    cookie: {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      maxAge: sessionTtl,
      sameSite: 'lax', // Required for SAML redirects
    },
  });
}

// Setup SAML Authentication
export async function setupSamlAuth(app: Express) {
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
    throw new Error(`Missing required SAML environment variables: ${missingVars.join(', ')}`);
  }

  // Trust proxy for HTTPS redirects
  app.set('trust proxy', 1);
  
  // Setup session middleware
  app.use(getSamlSession());
  
  // Initialize Passport
  app.use(passport.initialize());
  app.use(passport.session());

  // Create SAML strategy
  const samlConfig: SamlConfig = {
    entryPoint: process.env.SAML_ENTRY_POINT!,
    issuer: process.env.SAML_ISSUER!,
    callbackUrl: process.env.SAML_CALLBACK_URL!,
    idpCert: process.env.SAML_CERT!.replace(/\\n/g, '\n'), // Handle newlines in cert
    decryptionPvk: process.env.SAML_DECRYPTION_PVK?.replace(/\\n/g, '\n'),
    signatureAlgorithm: (process.env.SAML_SIGNATURE_ALGORITHM as any) || 'sha256',
    digestAlgorithm: (process.env.SAML_DIGEST_ALGORITHM as any) || 'sha256',
  };

  passport.use('saml', createSamlStrategy() as any);

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
  app.get('/auth/saml', passport.authenticate('saml', {
    successRedirect: '/',
    failureRedirect: '/auth/login/fail'
  }));

  // SAML callback (ACS - Assertion Consumer Service)
  app.post('/auth/saml/callback', 
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

  // SAML metadata endpoint - simplified approach
  app.get('/auth/saml/metadata', (req, res) => {
    // Return a basic XML response for now - this should be properly configured
    // based on your SAML IdP requirements
    res.type('application/xml');
    res.send(`<?xml version="1.0" encoding="UTF-8"?>
<EntityDescriptor xmlns="urn:oasis:names:tc:SAML:2.0:metadata">
  <SPSSODescriptor>
    <KeyDescriptor use="signing">
      <KeyInfo>
        <X509Data>
          <X509Certificate>${process.env.SAML_CERT?.replace(/\n/g, '')}</X509Certificate>
        </X509Data>
      </KeyInfo>
    </KeyDescriptor>
    <AssertionConsumerService Binding="urn:oasis:names:tc:SAML:2.0:bindings:HTTP-POST" 
                             Location="${process.env.SAML_CALLBACK_URL}" index="0"/>
  </SPSSODescriptor>
</EntityDescriptor>`);
  });

  // Logout - simplified approach
  app.get('/auth/logout', (req, res) => {
    console.log('🔓 SAML Logout request received - clearing session and redirecting');
    if (req.user) {
      // Simple logout without SAML logout URL
      req.logout((err: any) => {
        if (err) {
          console.error('Logout error:', err);
        }
        console.log('✅ User session cleared, redirecting to login page');
        res.redirect('/login');
      });
    } else {
      console.log('ℹ️ No active session, redirecting to login page');
      res.redirect('/login');
    }
  });

  // Login failure page
  app.get('/auth/login/fail', (req, res) => {
    res.status(401).json({
      error: 'Authentication failed',
      message: 'Please contact your system administrator if this problem persists.'
    });
  });
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
      loginUrl: '/auth/saml'
    });
  }
  
  res.redirect('/auth/saml');
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

// Get user info helper
export function getUserInfo(req: any) {
  return req.user ? {
    id: req.user.id,
    email: req.user.email,
    firstName: req.user.firstName,
    lastName: req.user.lastName,
    role: req.user.role,
    isActive: req.user.isActive,
  } : null;
}