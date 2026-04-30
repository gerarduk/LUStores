/**
 * Permission Enforcement Middleware
 *
 * INTEGRATION INSTRUCTIONS:
 * 1. Copy this entire file to server/middleware-permissions.ts
 * 2. Import in routes.ts: import { requireChargeCodeAccess, getCurrentUserId } from './middleware-permissions';
 * 3. Use requireChargeCodeAccess() middleware on sales routes
 */

import type { Request, Response, NextFunction } from 'express';
import { storage } from './storage';

/**
 * Helper function to get current user ID from request
 * Handles both session and JWT authentication
 */
export function getCurrentUserId(req: any): string {
  // Try session first
  if (req.user?.id) {
    return req.user.id;
  }
  // Try JWT claims
  if (req.user?.claims?.sub) {
    return req.user.claims.sub;
  }
  // Fallback
  if (req.user?.userId) {
    return req.user.userId;
  }
  throw new Error('User ID not found in request');
}

/**
 * Middleware to verify user has access to requested charge code
 *
 * How it works:
 * 1. Admin and superuser roles bypass all checks (can use any charge code)
 * 2. Basic users must have explicit charge code assignment
 * 3. Returns 403 with helpful error if access denied
 *
 * Options:
 * - allowAny: Allow route access even if no specific charge code provided
 * - paramName: Name of parameter containing charge code (default: 'chargeCode')
 * - bodyParam: Name of body parameter if different from paramName
 *
 * Usage examples:
 * - app.post('/api/sales', requireChargeCodeAccess(), handler)
 * - app.get('/api/sales', requireChargeCodeAccess({ allowAny: true }), handler)
 */
export function requireChargeCodeAccess(options: {
  allowAny?: boolean;
  paramName?: string;
  bodyParam?: string;
} = {}) {
  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      const userId = getCurrentUserId(req);
      if (!userId) {
        return res.status(401).json({ message: "Authentication required" });
      }

      // Get user to check role
      const user = await storage.getUser(userId);
      if (!user) {
        return res.status(401).json({ message: "User not found" });
      }

      // Admins and managers (superuser) can access any charge code
      if (user.role === 'admin' || user.role === 'superuser') {
        return next();
      }

      // Basic users: must check charge code access
      const paramName = options.paramName || 'chargeCode';
      const bodyParam = options.bodyParam || paramName;

      // Get requested charge code from various sources
      const requestedCode =
        req.body[bodyParam] ||
        req.params[paramName] ||
        req.query[paramName];

      // If no charge code provided
      if (!requestedCode) {
        if (options.allowAny) {
          return next(); // Allow if allowAny is true
        }
        return res.status(400).json({
          message: 'Charge code required',
          hint: 'Please provide a charge code for this operation'
        });
      }

      // Check if user is assigned to this charge code
      const authorizedUsers = await storage.getChargeCodeAuthorizedUsers(requestedCode);
      const hasAccess = authorizedUsers.some(u => u.email === user.email);

      if (!hasAccess) {
        return res.status(403).json({
          message: 'You do not have access to this charge code',
          requestedCode,
          hint: 'Contact your administrator to request access to this charge code'
        });
      }

      // Access granted
      next();
    } catch (error) {
      console.error('Charge code access check error:', error);
      res.status(500).json({
        message: 'Access check failed',
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  };
}

/**
 * Helper middleware to validate pagination parameters
 * Prevents abuse by limiting page size and ensuring positive values
 *
 * Usage: app.get('/api/items', validatePagination, handler)
 */
export function validatePagination(req: any, res: Response, next: NextFunction) {
  const page = parseInt(req.query.page as string) || 1;
  const limit = parseInt(req.query.limit as string) || 10;

  // Validate page number
  if (page < 1) {
    return res.status(400).json({
      message: 'Invalid page number',
      hint: 'Page must be >= 1'
    });
  }

  // Validate and cap limit
  if (limit < 1 || limit > 1000) {
    return res.status(400).json({
      message: 'Invalid limit',
      hint: 'Limit must be between 1 and 1000'
    });
  }

  // Normalize values
  req.query.page = page.toString();
  req.query.limit = Math.min(limit, 100).toString(); // Cap at 100 for safety

  next();
}

/**
 * Helper function to get user's restricted charge codes
 * Returns undefined for admins/managers (no restriction)
 * Returns array of codes for basic users
 *
 * Usage in route handler:
 * const restrictedCodes = await getRestrictedChargeCodes(req.user);
 * const sales = await storage.getSales(page, limit, undefined, undefined, undefined, restrictedCodes);
 */
export async function getRestrictedChargeCodes(user: any): Promise<string[] | undefined> {
  if (!user) return undefined;

  // Admin and managers see all
  if (user.role === 'admin' || user.role === 'superuser') {
    return undefined;
  }

  // Basic users only see their assigned codes
  const allChargeCodes = await storage.getChargeCodes();
  const userAuthorizedCodes: string[] = [];
  
  for (const cc of allChargeCodes) {
    const authorizedUsers = await storage.getChargeCodeAuthorizedUsers(cc.code);
    if (authorizedUsers.some(u => u.email === user.email)) {
      userAuthorizedCodes.push(cc.code);
    }
  }
  
  return userAuthorizedCodes;
}
