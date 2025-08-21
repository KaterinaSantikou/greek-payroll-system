/**
 * Performance Monitoring Middleware
 * Integrates monitoring services with Express requests
 */

import { Request, Response, NextFunction } from 'express';
import { productionPerformanceService } from '../services/ProductionPerformanceService';
import { errorTrackingService } from '../services/ErrorTrackingService';

// Extend Express Request type to include performance data
declare global {
  namespace Express {
    interface Request {
      requestId?: string;
      startTime?: number;
      userId?: string;
      companyId?: string;
    }
  }
}

/**
 * Performance monitoring middleware that tracks request metrics
 */
export function performanceMiddleware(req: Request, res: Response, next: NextFunction): void {
  // Generate unique request ID
  req.requestId = Math.random().toString(36).substr(2, 9);
  req.startTime = performance.now();

  // Add request ID to response headers for debugging
  res.setHeader('X-Request-ID', req.requestId);

  // Extract user context if available (assuming it's set by auth middleware)
  if (req.user) {
    req.userId = (req.user as any).id;
    req.companyId = (req.user as any).companyId;
  }

  // Set up response monitoring
  const originalSend = res.send;
  res.send = function(data) {
    const duration = performance.now() - (req.startTime || 0);
    
    // Record performance metrics
    productionPerformanceService.recordRequest({
      method: req.method,
      route: getRoutePattern(req),
      statusCode: res.statusCode,
      duration,
      timestamp: Date.now(),
      userAgent: req.get('User-Agent'),
      userId: req.userId
    });

    // Set error tracking context
    if (req.userId) {
      errorTrackingService.setUser(req.userId, undefined, req.companyId);
    }

    // Track errors
    if (res.statusCode >= 400) {
      errorTrackingService.captureMessage(
        `HTTP ${res.statusCode}: ${req.method} ${req.originalUrl}`,
        res.statusCode >= 500 ? 'error' : 'warning',
        {
          requestId: req.requestId,
          tags: {
            route: getRoutePattern(req),
            method: req.method,
            statusCode: res.statusCode.toString()
          },
          extra: {
            duration,
            userAgent: req.get('User-Agent'),
            ip: req.ip
          }
        }
      );
    }

    return originalSend.call(this, data);
  };

  next();
}

/**
 * Get route pattern for metrics (normalize dynamic routes)
 */
function getRoutePattern(req: Request): string {
  // If route is available, use it
  if (req.route?.path) {
    return req.route.path;
  }

  // Fallback to path normalization
  return req.path
    .replace(/\/\d+/g, '/:id')
    .replace(/\/[a-f0-9-]{36}/g, '/:uuid')
    .replace(/\/[a-f0-9]{24}/g, '/:objectid');
}

/**
 * Error handling middleware with performance tracking
 */
export function errorTrackingMiddleware(
  err: any,
  req: Request,
  res: Response,
  next: NextFunction
): void {
  const duration = performance.now() - (req.startTime || 0);

  // Capture error with full context
  errorTrackingService.captureError(err, {
    requestId: req.requestId,
    userId: req.userId,
    companyId: req.companyId,
    url: req.originalUrl,
    method: req.method,
    userAgent: req.get('User-Agent'),
    ip: req.ip,
    tags: {
      route: getRoutePattern(req),
      method: req.method,
      hasUser: !!req.userId
    },
    extra: {
      duration,
      body: req.body,
      params: req.params,
      query: req.query,
      headers: sanitizeHeaders(req.headers)
    }
  });

  // Record error metrics
  productionPerformanceService.recordRequest({
    method: req.method,
    route: getRoutePattern(req),
    statusCode: err.status || 500,
    duration,
    timestamp: Date.now(),
    userAgent: req.get('User-Agent'),
    userId: req.userId
  });

  // Clear user context
  errorTrackingService.clearUser();

  next(err);
}

/**
 * Sanitize headers for logging (remove sensitive data)
 */
function sanitizeHeaders(headers: any): any {
  const sanitized = { ...headers };
  
  // Remove sensitive headers
  delete sanitized.authorization;
  delete sanitized.cookie;
  delete sanitized['x-api-key'];
  delete sanitized['x-auth-token'];
  
  return sanitized;
}

/**
 * Database query monitoring wrapper
 */
export function monitorDatabaseQuery<T>(
  queryPromise: Promise<T>,
  queryString: string,
  context?: { operation?: string; table?: string }
): Promise<T> {
  const { databaseOptimizationService } = require('../services/DatabaseOptimizationService');
  return databaseOptimizationService.monitorQuery(queryPromise, queryString, context);
}

/**
 * API endpoint performance decorator
 */
export function monitorEndpoint(operationName: string) {
  return function(target: any, propertyKey: string, descriptor: PropertyDescriptor) {
    const originalMethod = descriptor.value;

    descriptor.value = async function(...args: any[]) {
      const startTime = performance.now();
      const span = errorTrackingService.startSpan(operationName, 'api');

      try {
        const result = await originalMethod.apply(this, args);
        const duration = performance.now() - startTime;

        // Log slow operations
        if (duration > 1000) {
          console.warn(`🐌 Slow operation: ${operationName} took ${duration}ms`);
        }

        return result;
      } catch (error) {
        errorTrackingService.captureError(error as Error, {
          tags: { operation: operationName },
          extra: { duration: performance.now() - startTime }
        });
        throw error;
      } finally {
        if (span) span.finish?.();
      }
    };

    return descriptor;
  };
}

/**
 * Rate limiting with performance tracking
 */
export function performanceAwareRateLimit(windowMs: number, max: number) {
  const requests = new Map<string, { count: number; resetTime: number }>();

  return (req: Request, res: Response, next: NextFunction) => {
    const key = req.ip || 'unknown';
    const now = Date.now();
    const resetTime = now + windowMs;

    // Clean up old entries
    if (Math.random() < 0.1) { // 10% chance to cleanup
      for (const [k, v] of requests.entries()) {
        if (v.resetTime < now) {
          requests.delete(k);
        }
      }
    }

    // Check rate limit
    const clientData = requests.get(key) || { count: 0, resetTime };
    
    if (clientData.resetTime < now) {
      clientData.count = 0;
      clientData.resetTime = resetTime;
    }

    clientData.count++;
    requests.set(key, clientData);

    // Set rate limit headers
    res.setHeader('X-RateLimit-Limit', max);
    res.setHeader('X-RateLimit-Remaining', Math.max(0, max - clientData.count));
    res.setHeader('X-RateLimit-Reset', Math.ceil(clientData.resetTime / 1000));

    if (clientData.count > max) {
      // Track rate limit violations
      errorTrackingService.captureMessage(
        `Rate limit exceeded for ${key}`,
        'warning',
        {
          tags: { rateLimitViolation: 'true' },
          extra: {
            ip: key,
            count: clientData.count,
            limit: max,
            route: getRoutePattern(req)
          }
        }
      );

      res.status(429).json({
        error: 'Too Many Requests',
        message: 'Rate limit exceeded. Please try again later.',
        retryAfter: Math.ceil((clientData.resetTime - now) / 1000)
      });
      return;
    }

    next();
  };
}