import { Request, Response, NextFunction } from "express";
import { nanoid } from "nanoid";
import { createSafeInterval } from '../utils/safeScheduler';

interface IdempotencyCache {
  [key: string]: {
    response: any;
    timestamp: number;
    statusCode: number;
  };
}

const idempotencyCache: IdempotencyCache = {};
const CACHE_TTL = 24 * 60 * 60 * 1000; // 24 hours

/**
 * Idempotency middleware for write operations
 * Ensures duplicate requests with same idempotency key return same response
 */
export const idempotencyMiddleware = (req: Request, res: Response, next: NextFunction) => {
  // Only apply to write operations (POST, PUT, PATCH, DELETE)
  if (!['POST', 'PUT', 'PATCH', 'DELETE'].includes(req.method)) {
    return next();
  }

  const idempotencyKey = req.headers['idempotency-key'] as string;
  
  if (!idempotencyKey) {
    return res.status(400).json({ 
      error: "Idempotency-Key header is required for write operations" 
    });
  }

  // Check if we have a cached response
  const cached = idempotencyCache[idempotencyKey];
  if (cached) {
    const isExpired = Date.now() - cached.timestamp > CACHE_TTL;
    
    if (!isExpired) {
      return res.status(cached.statusCode).json(cached.response);
    } else {
      // Clean up expired cache entry
      delete idempotencyCache[idempotencyKey];
    }
  }

  // Store the original send function
  const originalSend = res.send;
  const originalJson = res.json;
  const originalStatus = res.status;
  let statusCode = 200;

  // Override status to capture status code
  res.status = function(code: number) {
    statusCode = code;
    return originalStatus.call(this, code);
  };

  // Override json to cache successful responses
  res.json = function(body: any) {
    if (statusCode >= 200 && statusCode < 300) {
      idempotencyCache[idempotencyKey] = {
        response: body,
        timestamp: Date.now(),
        statusCode
      };
    }
    return originalJson.call(this, body);
  };

  // Store idempotency key in request for access in handlers
  (req as any).idempotencyKey = idempotencyKey;
  
  next();
};

/**
 * Clean up expired idempotency cache entries
 */
export const cleanupIdempotencyCache = () => {
  const now = Date.now();
  Object.keys(idempotencyCache).forEach(key => {
    if (now - idempotencyCache[key].timestamp > CACHE_TTL) {
      delete idempotencyCache[key];
    }
  });
};

// Run cleanup every hour (safely)

createSafeInterval(cleanupIdempotencyCache, {
  name: 'Idempotency Cache Cleanup',
  enableEnvVar: 'ENABLE_CACHE_CLEANUP',
  intervalMs: 60 * 60 * 1000,
  runImmediately: false
});