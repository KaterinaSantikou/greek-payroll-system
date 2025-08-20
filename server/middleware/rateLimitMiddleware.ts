import type { Request, Response, NextFunction } from 'express';
import { RateLimitService } from '../services/RateLimitService';

/**
 * Rate limiting middleware factory
 */
export function rateLimitMiddleware(endpoint: string) {
  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      const ipAddress = (req.ip || req.connection.remoteAddress || '').replace(/^::ffff:/, '');
      const email = req.body?.email; // Optional email for user-specific limits
      
      const result = await RateLimitService.checkRateLimit(ipAddress, endpoint, email);
      
      // Add rate limit headers
      res.set({
        'X-RateLimit-Remaining': result.remainingAttempts.toString(),
        'X-RateLimit-Reset': result.resetAt.toISOString(),
        'X-RateLimit-Total': result.totalAttempts.toString(),
      });
      
      if (!result.allowed) {
        if (result.retryAfter) {
          res.set('Retry-After', result.retryAfter.toString());
        }
        
        return res.status(429).json({
          error: 'Too many requests. Please try again later.',
          code: 'RATE_LIMITED',
          retryAfter: result.retryAfter,
          resetAt: result.resetAt.toISOString(),
        });
      }
      
      next();
    } catch (error) {
      console.error('Rate limit middleware error:', error);
      // Allow through on error to prevent blocking all requests
      next();
    }
  };
}