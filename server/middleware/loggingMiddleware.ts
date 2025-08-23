/**
 * Logging Middleware
 * Automatically logs HTTP requests, responses, and errors with full context
 */

import { Request, Response, NextFunction } from 'express';
import { CentralLogAggregationService } from '../services/CentralLogAggregationService';
import { nanoid } from 'nanoid';

// Extend Express Request interface to include logging context
declare global {
  namespace Express {
    interface Request {
      requestId: string;
      sessionId?: string;
      startTime: number;
      logger: LoggerInstance;
    }
  }
}

export interface LoggerInstance {
  debug: (message: string, metadata?: Record<string, any>) => Promise<void>;
  info: (message: string, metadata?: Record<string, any>) => Promise<void>;
  warn: (message: string, metadata?: Record<string, any>, error?: Error) => Promise<void>;
  error: (message: string, metadata?: Record<string, any>, error?: Error) => Promise<void>;
  fatal: (message: string, metadata?: Record<string, any>, error?: Error) => Promise<void>;
}

/**
 * Creates a logger instance bound to request context
 */
function createRequestLogger(req: Request, service: string = 'api'): LoggerInstance {
  // Feature gate: only use central logging if enabled
  if (process.env.ENABLE_LOGGING === 'false') {
    return {
      debug: async (message: string) => console.debug(`[${service}] ${message}`),
      info: async (message: string) => console.info(`[${service}] ${message}`),
      warn: async (message: string) => console.warn(`[${service}] ${message}`),
      error: async (message: string) => console.error(`[${service}] ${message}`),
      fatal: async (message: string) => console.error(`[${service}] FATAL: ${message}`)
    };
  }
  
  const logger = CentralLogAggregationService.getInstance();
  
  const baseContext = {
    service,
    component: 'http',
    category: 'request',
    userId: req.user?.claims?.sub,
    sessionId: req.sessionId || req.session?.id,
    requestId: req.requestId,
    request: {
      method: req.method,
      url: req.originalUrl,
      ipAddress: req.ip,
      userAgent: req.get('User-Agent'),
    },
    tags: [
      'http',
      req.method.toLowerCase(),
      getRouteCategory(req.originalUrl),
    ],
  };

  return {
    debug: async (message: string, metadata: Record<string, any> = {}) => {
      await logger.debug(message, { ...baseContext, metadata });
    },
    info: async (message: string, metadata: Record<string, any> = {}) => {
      await logger.info(message, { ...baseContext, metadata });
    },
    warn: async (message: string, metadata: Record<string, any> = {}, error?: Error) => {
      await logger.warn(message, { ...baseContext, metadata }, error);
    },
    error: async (message: string, metadata: Record<string, any> = {}, error?: Error) => {
      await logger.error(message, { ...baseContext, metadata }, error);
    },
    fatal: async (message: string, metadata: Record<string, any> = {}, error?: Error) => {
      await logger.fatal(message, { ...baseContext, metadata }, error);
    },
  };
}

/**
 * Request logging middleware
 */
export function requestLoggingMiddleware(service: string = 'api') {
  return (req: Request, res: Response, next: NextFunction) => {
    // Generate unique request ID
    req.requestId = nanoid();
    req.startTime = Date.now();
    
    // Extract session ID from various sources
    req.sessionId = req.sessionID || req.session?.id || req.get('X-Session-ID');
    
    // Create request-scoped logger
    req.logger = createRequestLogger(req, service);

    // Log incoming request
    req.logger.info(`${req.method} ${req.originalUrl}`, {
      headers: filterSensitiveHeaders(req.headers),
      query: req.query,
      params: req.params,
      bodySize: req.get('Content-Length') || '0',
    });

    // Override res.json to log responses
    const originalJson = res.json;
    res.json = function(body: any) {
      const duration = Date.now() - req.startTime;
      const statusCode = res.statusCode;
      
      // Log response
      req.logger.info(`${req.method} ${req.originalUrl} - ${statusCode}`, {
        statusCode,
        duration,
        responseSize: JSON.stringify(body).length,
        headers: filterSensitiveHeaders(res.getHeaders()),
        performance: {
          duration,
          statusCode,
        },
      });

      return originalJson.call(this, body);
    };

    // Override res.status to capture status changes
    const originalStatus = res.status;
    res.status = function(code: number) {
      if (code >= 400) {
        const duration = Date.now() - req.startTime;
        req.logger.warn(`HTTP ${code} - ${req.method} ${req.originalUrl}`, {
          statusCode: code,
          duration,
          performance: {
            duration,
            statusCode: code,
          },
        });
      }
      return originalStatus.call(this, code);
    };

    next();
  };
}

/**
 * Error logging middleware (should be used after other error handlers)
 */
export function errorLoggingMiddleware(service: string = 'api') {
  return (error: Error, req: Request, res: Response, next: NextFunction) => {
    const duration = Date.now() - req.startTime;
    const statusCode = res.statusCode || 500;

    // Create logger if not exists (in case error occurs before request middleware)
    if (!req.logger) {
      req.logger = createRequestLogger(req, service);
    }

    // Log error with full context
    req.logger.error(`Unhandled error in ${req.method} ${req.originalUrl}`, {
      errorName: error.name,
      errorMessage: error.message,
      statusCode,
      duration,
      stack: error.stack,
      body: sanitizeRequestBody(req.body),
      params: req.params,
      query: req.query,
      performance: {
        duration,
        statusCode,
      },
    }, error);

    next(error);
  };
}

/**
 * Performance monitoring middleware
 */
export function performanceLoggingMiddleware(service: string = 'api') {
  return (req: Request, res: Response, next: NextFunction) => {
    // Skip performance logging for health checks and static assets
    if (shouldSkipPerformanceLogging(req.originalUrl)) {
      return next();
    }

    const startTime = Date.now();
    
    res.on('finish', () => {
      const duration = Date.now() - startTime;
      const statusCode = res.statusCode;
      
      // Create logger if needed
      if (!req.logger) {
        req.logger = createRequestLogger(req, service);
      }

      // Log performance metrics
      if (duration > 1000) { // Log slow requests (>1s)
        req.logger.warn(`Slow request: ${req.method} ${req.originalUrl}`, {
          duration,
          statusCode,
          category: 'performance',
          performance: {
            duration,
            statusCode,
          },
          tags: ['slow_request', 'performance'],
        });
      } else if (duration > 500) { // Log moderately slow requests (>500ms)
        req.logger.info(`Request performance: ${req.method} ${req.originalUrl}`, {
          duration,
          statusCode,
          category: 'performance',
          performance: {
            duration,
            statusCode,
          },
          tags: ['performance'],
        });
      }
    });

    next();
  };
}

/**
 * Security event logging middleware
 */
export function securityLoggingMiddleware(service: string = 'security') {
  return (req: Request, res: Response, next: NextFunction) => {
    // Log security-relevant events
    const securityEvents = [];

    // Check for suspicious patterns
    if (hasSuspiciousUserAgent(req.get('User-Agent'))) {
      securityEvents.push('suspicious_user_agent');
    }

    if (hasSuspiciousPath(req.originalUrl)) {
      securityEvents.push('suspicious_path');
    }

    if (hasExcessiveHeaders(req.headers)) {
      securityEvents.push('excessive_headers');
    }

    if (securityEvents.length > 0) {
      const logger = createRequestLogger(req, service);
      logger.warn(`Security event detected: ${securityEvents.join(', ')}`, {
        events: securityEvents,
        category: 'security',
        userAgent: req.get('User-Agent'),
        path: req.originalUrl,
        headers: filterSensitiveHeaders(req.headers),
        tags: ['security', ...securityEvents],
      });
    }

    next();
  };
}

/**
 * Business event logging helper
 */
export function logBusinessEvent(
  req: Request,
  event: string,
  details: Record<string, any> = {},
  level: 'info' | 'warn' | 'error' = 'info'
) {
  if (!req.logger) {
    req.logger = createRequestLogger(req, 'business');
  }

  const message = `Business event: ${event}`;
  const metadata = {
    event,
    ...details,
    category: 'business',
    tags: ['business_event', event.toLowerCase().replace(/\s+/g, '_')],
  };

  switch (level) {
    case 'warn':
      req.logger.warn(message, metadata);
      break;
    case 'error':
      req.logger.error(message, metadata);
      break;
    default:
      req.logger.info(message, metadata);
  }
}

// Helper functions

function getRouteCategory(url: string): string {
  if (url.startsWith('/api/auth')) return 'auth';
  if (url.startsWith('/api/payroll')) return 'payroll';
  if (url.startsWith('/api/employees')) return 'hr';
  if (url.startsWith('/api/time')) return 'time_tracking';
  if (url.startsWith('/api/compliance')) return 'compliance';
  if (url.startsWith('/api/security')) return 'security';
  if (url.startsWith('/api/reports')) return 'reporting';
  if (url.startsWith('/api/payments')) return 'payments';
  if (url.startsWith('/api/disaster-recovery')) return 'disaster_recovery';
  if (url.startsWith('/api/health')) return 'health';
  return 'general';
}

function filterSensitiveHeaders(headers: any): Record<string, any> {
  const filtered = { ...headers };
  const sensitiveKeys = [
    'authorization',
    'cookie',
    'x-api-key',
    'x-auth-token',
    'x-session-token',
  ];

  sensitiveKeys.forEach(key => {
    if (filtered[key]) {
      filtered[key] = '[REDACTED]';
    }
  });

  return filtered;
}

function sanitizeRequestBody(body: any): any {
  if (!body || typeof body !== 'object') return body;

  const sanitized = { ...body };
  const sensitiveFields = [
    'password',
    'token',
    'secret',
    'key',
    'authorization',
    'credential',
    'ssn',
    'taxId',
    'bankAccount',
    'creditCard',
  ];

  function sanitizeRecursive(obj: any): any {
    if (Array.isArray(obj)) {
      return obj.map(sanitizeRecursive);
    }
    
    if (obj && typeof obj === 'object') {
      const result: any = {};
      for (const [key, value] of Object.entries(obj)) {
        const lowerKey = key.toLowerCase();
        if (sensitiveFields.some(field => lowerKey.includes(field))) {
          result[key] = '[REDACTED]';
        } else {
          result[key] = sanitizeRecursive(value);
        }
      }
      return result;
    }
    
    return obj;
  }

  return sanitizeRecursive(sanitized);
}

function shouldSkipPerformanceLogging(url: string): boolean {
  const skipPatterns = [
    '/health',
    '/ping',
    '/metrics',
    '/favicon.ico',
    '/robots.txt',
    '/static/',
    '/assets/',
  ];

  return skipPatterns.some(pattern => url.includes(pattern));
}

function hasSuspiciousUserAgent(userAgent?: string): boolean {
  if (!userAgent) return false;
  
  const suspiciousPatterns = [
    /sqlmap/i,
    /nikto/i,
    /nessus/i,
    /burp/i,
    /crawler/i,
    /bot.*bot/i,
    /scanner/i,
  ];

  return suspiciousPatterns.some(pattern => pattern.test(userAgent));
}

function hasSuspiciousPath(path: string): boolean {
  const suspiciousPatterns = [
    /\.\./,
    /admin/i,
    /config/i,
    /\.env/i,
    /\.git/i,
    /wp-admin/i,
    /phpmyadmin/i,
    /eval\(/i,
    /exec\(/i,
    /system\(/i,
  ];

  return suspiciousPatterns.some(pattern => pattern.test(path));
}

function hasExcessiveHeaders(headers: any): boolean {
  return Object.keys(headers).length > 50;
}