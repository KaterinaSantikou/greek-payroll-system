// =============================================================================
// SENTRY CONFIGURATION - SERVER SIDE
// =============================================================================

import * as Sentry from '@sentry/node';

/**
 * Initialize Sentry for server-side error tracking and performance monitoring
 */
export function initializeSentry() {
  // Only initialize in production or if explicitly enabled
  if (process.env.NODE_ENV !== 'production' && process.env.ENABLE_SENTRY !== 'true') {
    console.log('[SENTRY] Disabled in development (set ENABLE_SENTRY=true to enable)');
    return;
  }

  if (!process.env.SENTRY_DSN) {
    console.warn('[SENTRY] Warning: SENTRY_DSN not set, skipping initialization');
    return;
  }

  Sentry.init({
    dsn: process.env.SENTRY_DSN,
    environment: process.env.NODE_ENV || 'development',
    integrations: [
      // Add Node.js integrations
      Sentry.httpIntegration({ tracing: true }),
      Sentry.expressIntegration({ router: true }),
      Sentry.postgresIntegration(),
      
      // Custom integration for request IDs
      Sentry.requestDataIntegration({
        include: {
          request: ['headers', 'method', 'url'],
          user: false // We'll handle PII redaction manually
        }
      })
    ],
    
    // Performance monitoring
    tracesSampleRate: process.env.NODE_ENV === 'production' ? 0.1 : 1.0,
    profilesSampleRate: process.env.NODE_ENV === 'production' ? 0.1 : 1.0,
    
    // PII and sensitive data filtering
    beforeSend(event) {
      return redactPII(event);
    },
    
    beforeSendTransaction(event) {
      return redactPII(event);
    },

    // Request ID tracking
    initialScope: {
      tags: {
        service: 'payrollsync-api',
        version: process.env.npm_package_version || '1.0.0'
      }
    }
  });

  console.log('[SENTRY] ✅ Initialized for server-side monitoring');
}

/**
 * PII Redaction - Remove sensitive data from Sentry events
 */
function redactPII(event: any): any | null {
  if (!event) return null;

  // Redact sensitive headers
  if (event.request?.headers) {
    const sensitiveHeaders = [
      'authorization',
      'cookie',
      'session-id',
      'x-api-key',
      'x-auth-token'
    ];
    
    for (const header of sensitiveHeaders) {
      if (event.request.headers[header]) {
        event.request.headers[header] = '[Redacted]';
      }
    }
  }

  // Redact sensitive fields from request data
  if (event.request?.data) {
    const sensitiveFields = [
      'password',
      'ssn',
      'social_security_number', 
      'afm', // Greek tax number
      'amka', // Greek social security number
      'email',
      'phone',
      'iban',
      'credit_card',
      'bank_account'
    ];
    
    event.request.data = redactSensitiveFields(event.request.data, sensitiveFields);
  }

  // Redact exception data
  if (event.exception?.values) {
    for (const exception of event.exception.values) {
      if (exception.stacktrace?.frames) {
        for (const frame of exception.stacktrace.frames) {
          if (frame.vars) {
            frame.vars = redactSensitiveFields(frame.vars, [
              'password', 'token', 'secret', 'key', 'afm', 'amka', 'ssn'
            ]);
          }
        }
      }
    }
  }

  return event;
}

/**
 * Recursively redact sensitive fields from objects
 */
function redactSensitiveFields(obj: any, sensitiveFields: string[]): any {
  if (!obj || typeof obj !== 'object') return obj;
  
  if (Array.isArray(obj)) {
    return obj.map(item => redactSensitiveFields(item, sensitiveFields));
  }
  
  const redacted = { ...obj };
  
  for (const [key, value] of Object.entries(redacted)) {
    const lowerKey = key.toLowerCase();
    
    // Check if field name contains sensitive keywords
    const isSensitive = sensitiveFields.some(field => 
      lowerKey.includes(field.toLowerCase())
    );
    
    if (isSensitive) {
      if (typeof value === 'string' && value.length > 0) {
        // Show first 2 and last 2 characters for debugging
        redacted[key] = value.length > 4 
          ? `${value.slice(0, 2)}***${value.slice(-2)}`
          : '[Redacted]';
      } else {
        redacted[key] = '[Redacted]';
      }
    } else if (typeof value === 'object') {
      redacted[key] = redactSensitiveFields(value, sensitiveFields);
    }
  }
  
  return redacted;
}

/**
 * Add request ID to Sentry scope for correlation
 */
export function setSentryRequestId(requestId: string, userId?: string) {
  Sentry.configureScope(scope => {
    scope.setTag('request_id', requestId);
    scope.setContext('request', {
      id: requestId,
      timestamp: new Date().toISOString()
    });
    
    if (userId) {
      scope.setUser({
        id: userId
      });
    }
  });
}

/**
 * Capture custom metrics and events
 */
export function captureCustomMetric(name: string, value: number, tags?: Record<string, string>) {
  Sentry.metrics.gauge(name, value, {
    tags: {
      service: 'payrollsync',
      ...tags
    }
  });
}

/**
 * Apply Sentry error handling to Express app (call after all routes)
 * Using modern Sentry v8+ API
 */
export function setupSentryErrorHandler(app: any) {
  try {
    // Use the modern setupExpressErrorHandler API
    if (typeof Sentry.setupExpressErrorHandler === 'function') {
      Sentry.setupExpressErrorHandler(app);
      console.log('[SENTRY] ✅ Express error handler configured');
    } else {
      // Fallback to manual error handler
      app.use((err: any, req: any, res: any, next: any) => {
        // Only capture 5xx errors and specific 4xx errors
        if (err.status >= 500 || err.status === 401 || err.status === 403) {
          Sentry.captureException(err);
        }
        next(err);
      });
      console.log('[SENTRY] ✅ Fallback error handler configured');
    }
  } catch (error) {
    console.warn('[SENTRY] Warning: Could not configure error handler:', error);
  }
}

/**
 * Create Sentry request tracking middleware (optional - integration handles most)
 */
export function createSentryRequestHandler() {
  return (req: any, res: any, next: any) => {
    // Add request ID to Sentry scope if available
    if (req.requestId) {
      Sentry.configureScope(scope => {
        scope.setTag('request_id', req.requestId);
      });
    }
    next();
  };
}

export { Sentry };