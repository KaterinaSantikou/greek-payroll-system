// =============================================================================
// SENTRY CONFIGURATION - CLIENT SIDE (REACT)
// =============================================================================

import * as Sentry from '@sentry/react';

/**
 * Initialize Sentry for client-side error tracking and performance monitoring
 */
export function initializeClientSentry() {
  // Only initialize in production or if explicitly enabled
  if (
    import.meta.env.MODE !== 'production' &&
    import.meta.env.VITE_ENABLE_SENTRY !== 'true'
  ) {
    console.log(
      '[SENTRY] Client disabled in development (set VITE_ENABLE_SENTRY=true to enable)'
    );
    return;
  }

  if (!import.meta.env.VITE_SENTRY_DSN) {
    console.warn(
      '[SENTRY] Warning: VITE_SENTRY_DSN not set, skipping client initialization'
    );
    return;
  }

  Sentry.init({
    dsn: import.meta.env.VITE_SENTRY_DSN,
    environment: import.meta.env.MODE || 'development',

    integrations: [
      Sentry.browserTracingIntegration(),
      Sentry.replayIntegration({
        maskAllText: true, // PII protection
        blockAllMedia: true, // Don't record media
        maskAllInputs: true, // Mask form inputs for PII protection
      }),
    ],

    // Performance monitoring
    tracesSampleRate: import.meta.env.MODE === 'production' ? 0.1 : 1.0,

    // Session replay (for debugging)
    replaysSessionSampleRate: 0.1,
    replaysOnErrorSampleRate: 1.0,

    // PII protection
    beforeSend(event, hint) {
      return redactClientPII(event);
    },

    // Initial scope
    initialScope: {
      tags: {
        component: 'payrollsync-frontend',
        version: import.meta.env.VITE_APP_VERSION || '1.0.0',
      },
    },
  });

  console.log('[SENTRY] ✅ Initialized for client-side monitoring');
}

/**
 * Client-side PII redaction
 */
function redactClientPII(event: Sentry.Event): Sentry.Event | null {
  if (!event) return null;

  // Redact form data and user inputs
  if (event.request?.data) {
    event.request.data = redactSensitiveClientData(event.request.data);
  }

  // Redact breadcrumbs (user interactions)
  if (event.breadcrumbs) {
    event.breadcrumbs = event.breadcrumbs.map(breadcrumb => {
      if (
        breadcrumb.category === 'ui.input' ||
        breadcrumb.category === 'ui.click'
      ) {
        // Remove potentially sensitive data from form interactions
        if (breadcrumb.data) {
          breadcrumb.data = redactSensitiveClientData(breadcrumb.data);
        }
      }
      return breadcrumb;
    });
  }

  // Redact exception data
  if (event.exception?.values) {
    for (const exception of event.exception.values) {
      if (exception.stacktrace?.frames) {
        for (const frame of exception.stacktrace.frames) {
          if (frame.vars) {
            frame.vars = redactSensitiveClientData(frame.vars);
          }
        }
      }
    }
  }

  return event;
}

/**
 * Redact sensitive data from client-side objects
 */
function redactSensitiveClientData(data: any): any {
  if (!data || typeof data !== 'object') return data;

  if (Array.isArray(data)) {
    return data.map(item => redactSensitiveClientData(item));
  }

  const sensitiveKeys = [
    'password',
    'token',
    'secret',
    'key',
    'afm',
    'amka',
    'ssn',
    'email',
    'phone',
    'iban',
    'credit_card',
    'authorization',
    'session',
    'cookie',
    'csrf',
  ];

  const redacted: any = {};
  for (const [key, value] of Object.entries(data)) {
    const keyLower = key.toLowerCase();
    const isSensitive = sensitiveKeys.some(sensitive =>
      keyLower.includes(sensitive)
    );

    if (isSensitive) {
      redacted[key] = '[Redacted]';
    } else if (typeof value === 'object') {
      redacted[key] = redactSensitiveClientData(value);
    } else {
      redacted[key] = value;
    }
  }

  return redacted;
}

/**
 * Set user context for Sentry (with PII protection)
 */
export function setSentryUser(userId: string, email?: string) {
  Sentry.setUser({
    id: userId,
    // Don't set email in production for PII protection
    email: import.meta.env.MODE === 'development' ? email : undefined,
  });
}

/**
 * Set custom context for debugging
 */
export function setSentryContext(key: string, context: Record<string, any>) {
  Sentry.setContext(key, redactSensitiveClientData(context));
}

/**
 * Capture custom client metrics
 */
export function captureClientMetric(
  name: string,
  value: number,
  tags?: Record<string, string>
) {
  // Note: Sentry metrics API not available in current version
  console.debug(`[SENTRY] Metric: ${name} = ${value}`, tags);
}

/**
 * Higher-order component for error boundary
 */
export const SentryErrorBoundary = Sentry.withErrorBoundary;

export { Sentry };
