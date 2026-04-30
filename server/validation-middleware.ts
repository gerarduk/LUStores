/**
 * Input Validation Middleware
 *
 * Provides reusable validators for common input types to prevent:
 * - SQL injection
 * - XSS attacks
 * - Resource exhaustion
 * - Invalid data types
 */

import { Request, Response, NextFunction } from 'express';

/**
 * Validation error structure
 */
export class ValidationError extends Error {
  statusCode = 400;
  constructor(message: string) {
    super(message);
    this.name = 'ValidationError';
  }
}

/**
 * Validates pagination parameters (page, limit)
 * Already exists in middleware-permissions.ts but included here for completeness
 */
export function validatePaginationParams(req: Request, res: Response, next: NextFunction) {
  const { page, limit } = req.query;

  if (page !== undefined) {
    const pageNum = parseInt(page as string, 10);
    if (isNaN(pageNum) || pageNum < 1) {
      return res.status(400).json({
        error: 'Invalid page number. Must be a positive integer.',
      });
    }
  }

  if (limit !== undefined) {
    const limitNum = parseInt(limit as string, 10);
    if (isNaN(limitNum) || limitNum < 1 || limitNum > 100) {
      return res.status(400).json({
        error: 'Invalid limit. Must be between 1 and 100.',
      });
    }
  }

  next();
}

/**
 * Validates UUID format for IDs
 */
export function validateUUID(paramName: string = 'id') {
  return (req: Request, res: Response, next: NextFunction) => {
    const id = req.params[paramName] as string;
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

    if (!id || !uuidRegex.test(id)) {
      return res.status(400).json({
        error: `Invalid ${paramName}. Must be a valid UUID.`,
      });
    }

    next();
  };
}

/**
 * Validates required fields in request body
 */
export function validateRequiredFields(fields: string[]) {
  return (req: Request, res: Response, next: NextFunction) => {
    const missing: string[] = [];

    for (const field of fields) {
      if (req.body[field] === undefined || req.body[field] === null || req.body[field] === '') {
        missing.push(field);
      }
    }

    if (missing.length > 0) {
      return res.status(400).json({
        error: `Missing required fields: ${missing.join(', ')}`,
      });
    }

    next();
  };
}

/**
 * Validates string length constraints
 */
export function validateStringLength(
  fieldName: string,
  options: { min?: number; max?: number; required?: boolean } = {}
) {
  return (req: Request, res: Response, next: NextFunction) => {
    const value = req.body[fieldName];

    // Check if required
    if (options.required && (!value || typeof value !== 'string')) {
      return res.status(400).json({
        error: `${fieldName} is required and must be a string.`,
      });
    }

    // Skip validation if optional and not provided
    if (!value && !options.required) {
      return next();
    }

    const str = String(value);

    // Check min length
    if (options.min !== undefined && str.length < options.min) {
      return res.status(400).json({
        error: `${fieldName} must be at least ${options.min} characters long.`,
      });
    }

    // Check max length
    if (options.max !== undefined && str.length > options.max) {
      return res.status(400).json({
        error: `${fieldName} must be no more than ${options.max} characters long.`,
      });
    }

    next();
  };
}

/**
 * Validates numeric values and ranges
 */
export function validateNumber(
  fieldName: string,
  options: { min?: number; max?: number; integer?: boolean; required?: boolean } = {}
) {
  return (req: Request, res: Response, next: NextFunction) => {
    const value = req.body[fieldName];

    // Check if required
    if (options.required && value === undefined) {
      return res.status(400).json({
        error: `${fieldName} is required.`,
      });
    }

    // Skip validation if optional and not provided
    if (value === undefined && !options.required) {
      return next();
    }

    const num = Number(value);

    // Check if valid number
    if (isNaN(num)) {
      return res.status(400).json({
        error: `${fieldName} must be a valid number.`,
      });
    }

    // Check if integer required
    if (options.integer && !Number.isInteger(num)) {
      return res.status(400).json({
        error: `${fieldName} must be an integer.`,
      });
    }

    // Check min value
    if (options.min !== undefined && num < options.min) {
      return res.status(400).json({
        error: `${fieldName} must be at least ${options.min}.`,
      });
    }

    // Check max value
    if (options.max !== undefined && num > options.max) {
      return res.status(400).json({
        error: `${fieldName} must be no more than ${options.max}.`,
      });
    }

    next();
  };
}

/**
 * Validates email format
 */
export function validateEmail(fieldName: string = 'email', required: boolean = true) {
  return (req: Request, res: Response, next: NextFunction) => {
    const email = req.body[fieldName];

    if (!email && !required) {
      return next();
    }

    if (!email || typeof email !== 'string') {
      return res.status(400).json({
        error: `${fieldName} is required and must be a string.`,
      });
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return res.status(400).json({
        error: `${fieldName} must be a valid email address.`,
      });
    }

    next();
  };
}

/**
 * Validates date format (ISO 8601)
 */
export function validateDate(fieldName: string, required: boolean = false) {
  return (req: Request, res: Response, next: NextFunction) => {
    const dateStr = req.body[fieldName] || req.query[fieldName];

    if (!dateStr && !required) {
      return next();
    }

    if (!dateStr) {
      return res.status(400).json({
        error: `${fieldName} is required.`,
      });
    }

    const date = new Date(dateStr as string);
    if (isNaN(date.getTime())) {
      return res.status(400).json({
        error: `${fieldName} must be a valid ISO 8601 date.`,
      });
    }

    next();
  };
}

/**
 * Validates enum/choice values
 */
export function validateEnum(fieldName: string, allowedValues: string[], required: boolean = true) {
  return (req: Request, res: Response, next: NextFunction) => {
    const value = req.body[fieldName] || req.query[fieldName];

    if (!value && !required) {
      return next();
    }

    if (!value) {
      return res.status(400).json({
        error: `${fieldName} is required.`,
      });
    }

    if (!allowedValues.includes(value as string)) {
      return res.status(400).json({
        error: `${fieldName} must be one of: ${allowedValues.join(', ')}`,
      });
    }

    next();
  };
}

/**
 * Sanitizes string input to prevent XSS
 * Strips HTML tags and encodes special characters
 */
export function sanitizeString(fieldName: string) {
  return (req: Request, res: Response, next: NextFunction) => {
    const value = req.body[fieldName];

    if (value && typeof value === 'string') {
      // Remove HTML tags
      let sanitized = value.replace(/<[^>]*>/g, '');

      // Encode special characters
      sanitized = sanitized
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#x27;')
        .replace(/\//g, '&#x2F;');

      req.body[fieldName] = sanitized;
    }

    next();
  };
}

/**
 * Validates array input
 */
export function validateArray(
  fieldName: string,
  options: { minLength?: number; maxLength?: number; required?: boolean } = {}
) {
  return (req: Request, res: Response, next: NextFunction) => {
    const value = req.body[fieldName];

    if (!value && !options.required) {
      return next();
    }

    if (!Array.isArray(value)) {
      return res.status(400).json({
        error: `${fieldName} must be an array.`,
      });
    }

    if (options.minLength !== undefined && value.length < options.minLength) {
      return res.status(400).json({
        error: `${fieldName} must contain at least ${options.minLength} items.`,
      });
    }

    if (options.maxLength !== undefined && value.length > options.maxLength) {
      return res.status(400).json({
        error: `${fieldName} must contain no more than ${options.maxLength} items.`,
      });
    }

    next();
  };
}

/**
 * Rate limiting helper (basic implementation)
 * For production, use express-rate-limit package instead
 */
const requestCounts = new Map<string, { count: number; resetTime: number }>();

export function rateLimit(options: { windowMs?: number; maxRequests?: number } = {}) {
  const windowMs = options.windowMs || 60000; // 1 minute default
  const maxRequests = options.maxRequests || 100; // 100 requests per window

  return (req: Request, res: Response, next: NextFunction) => {
    const identifier = req.ip || 'unknown';
    const now = Date.now();

    const record = requestCounts.get(identifier);

    if (!record || now > record.resetTime) {
      // New window
      requestCounts.set(identifier, {
        count: 1,
        resetTime: now + windowMs,
      });
      return next();
    }

    if (record.count >= maxRequests) {
      return res.status(429).json({
        error: 'Too many requests. Please try again later.',
        retryAfter: Math.ceil((record.resetTime - now) / 1000),
      });
    }

    record.count++;
    next();
  };
}

/**
 * Composite validator for common sale/order creation
 */
export function validateSaleCreation(req: Request, res: Response, next: NextFunction) {
  const { chargeCode, items, totalPrice } = req.body;

  const errors: string[] = [];

  // Validate charge code
  if (!chargeCode || typeof chargeCode !== 'string') {
    errors.push('chargeCode is required and must be a string');
  }

  // Validate items array
  if (!Array.isArray(items) || items.length === 0) {
    errors.push('items must be a non-empty array');
  } else {
    items.forEach((item, index) => {
      if (!item.itemId) errors.push(`items[${index}].itemId is required`);
      if (!item.quantity || item.quantity <= 0) errors.push(`items[${index}].quantity must be > 0`);
      if (!item.price || item.price < 0) errors.push(`items[${index}].price must be >= 0`);
    });
  }

  // Validate total price
  if (totalPrice === undefined || typeof totalPrice !== 'number' || totalPrice < 0) {
    errors.push('totalPrice is required and must be a non-negative number');
  }

  if (errors.length > 0) {
    return res.status(400).json({
      error: 'Validation failed',
      details: errors,
    });
  }

  next();
}

/**
 * Composite validator for inventory item creation
 */
export function validateInventoryItem(req: Request, res: Response, next: NextFunction) {
  const { sku, name, price, quantity } = req.body;

  const errors: string[] = [];

  if (!sku || typeof sku !== 'string' || sku.length > 100) {
    errors.push('sku is required, must be a string, and max 100 characters');
  }

  if (!name || typeof name !== 'string' || name.length > 255) {
    errors.push('name is required, must be a string, and max 255 characters');
  }

  if (price === undefined || typeof price !== 'number' || price < 0) {
    errors.push('price is required and must be a non-negative number');
  }

  if (quantity !== undefined && (typeof quantity !== 'number' || quantity < 0)) {
    errors.push('quantity must be a non-negative number');
  }

  if (errors.length > 0) {
    return res.status(400).json({
      error: 'Validation failed',
      details: errors,
    });
  }

  next();
}
