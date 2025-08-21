/**
 * Error Tracking Service with Sentry Integration
 * Comprehensive error monitoring and performance tracking
 */

import * as Sentry from '@sentry/node';
import { nodeProfilingIntegration } from '@sentry/profiling-node';
import { envConfig } from '../lib/envConfig';

export interface ErrorContext {
  userId?: string;
  companyId?: string;
  requestId?: string;
  userAgent?: string;
  ip?: string;
  url?: string;
  method?: string;
  tags?: Record<string, string>;
  extra?: Record<string, any>;
}

export interface PerformanceMetrics {
  responseTime: number;
  dbQueryTime?: number;
  memoryUsage: number;
  cpuUsage?: number;
  endpoint: string;
  statusCode: number;
  userCount?: number;
}

export class ErrorTrackingService {
  private initialized = false;

  constructor() {
    this.initializeSentry();
  }

  /**
   * Initialize Sentry error tracking
   */
  private initializeSentry(): void {
    if (this.initialized) return;

    const dsn = envConfig.SENTRY_DSN;
    if (!dsn) {
      console.warn('⚠️ Sentry DSN not configured - error tracking disabled');
      return;
    }

    try {
      Sentry.init({
        dsn,
        environment: envConfig.NODE_ENV,
        integrations: [
          // HTTP request tracing
          Sentry.httpIntegration(),
          // Express.js integration
          Sentry.expressIntegration(),
          // Performance profiling
          nodeProfilingIntegration(),
          // Database tracing
          Sentry.postgresIntegration(),
        ],
        // Performance monitoring
        tracesSampleRate: envConfig.NODE_ENV === 'production' ? 0.1 : 1.0,
        // Profiling
        profilesSampleRate: envConfig.NODE_ENV === 'production' ? 0.1 : 1.0,
        // Release tracking
        release: process.env.REPL_ID || 'development',
        // Server name
        serverName: process.env.REPL_SLUG || 'payrollsync',
        // Before send hook for filtering
        beforeSend: (event) => {
          // Filter out health check requests
          if (event.request?.url?.includes('/health')) {
            return null;
          }
          
          // Filter sensitive data
          if (event.extra) {
            delete event.extra.password;
            delete event.extra.token;
            delete event.extra.secret;
          }
          
          return event;
        },
        // Enhanced request data
        sendDefaultPii: false, // GDPR compliance
      });

      this.initialized = true;
      console.log('✅ Sentry error tracking initialized');
      
    } catch (error) {
      console.error('❌ Failed to initialize Sentry:', error);
    }
  }

  /**
   * Capture an error with context
   */
  captureError(error: Error, context?: ErrorContext): string | undefined {
    if (!this.initialized) {
      console.error('Error (Sentry not initialized):', error);
      return undefined;
    }

    return Sentry.withScope((scope) => {
      if (context) {
        // Set user context
        if (context.userId) {
          scope.setUser({
            id: context.userId,
            ip_address: context.ip
          });
        }

        // Set request context
        if (context.url) {
          scope.setContext('request', {
            url: context.url,
            method: context.method,
            userAgent: context.userAgent
          });
        }

        // Set tags
        if (context.tags) {
          Object.entries(context.tags).forEach(([key, value]) => {
            scope.setTag(key, value);
          });
        }

        // Set extra data
        if (context.extra) {
          Object.entries(context.extra).forEach(([key, value]) => {
            scope.setExtra(key, value);
          });
        }

        // Set company context
        if (context.companyId) {
          scope.setTag('company', context.companyId);
        }

        // Set request ID for tracing
        if (context.requestId) {
          scope.setTag('requestId', context.requestId);
        }
      }

      return Sentry.captureException(error);
    });
  }

  /**
   * Capture a message with level
   */
  captureMessage(message: string, level: 'debug' | 'info' | 'warning' | 'error' | 'fatal' = 'info', context?: ErrorContext): string | undefined {
    if (!this.initialized) {
      console.log(`Message (${level}):`, message);
      return undefined;
    }

    return Sentry.withScope((scope) => {
      scope.setLevel(level);
      
      if (context?.tags) {
        Object.entries(context.tags).forEach(([key, value]) => {
          scope.setTag(key, value);
        });
      }

      return Sentry.captureMessage(message);
    });
  }

  /**
   * Start a performance span
   */
  startSpan(name: string, operation: string = 'http'): any {
    if (!this.initialized) return null;

    return Sentry.startSpan({
      name,
      op: operation,
    }, () => {});
  }

  /**
   * Record performance metrics
   */
  recordPerformance(metrics: PerformanceMetrics): void {
    if (!this.initialized) return;

    Sentry.withScope((scope) => {
      scope.setTag('endpoint', metrics.endpoint);
      scope.setTag('statusCode', metrics.statusCode.toString());
      
      scope.setExtra('responseTime', metrics.responseTime);
      scope.setExtra('memoryUsage', metrics.memoryUsage);
      
      if (metrics.dbQueryTime) {
        scope.setExtra('dbQueryTime', metrics.dbQueryTime);
      }
      
      if (metrics.userCount) {
        scope.setExtra('activeUsers', metrics.userCount);
      }

      // Send performance data
      Sentry.addBreadcrumb({
        category: 'performance',
        message: `${metrics.endpoint} - ${metrics.responseTime}ms`,
        level: 'info',
        data: {
          responseTime: metrics.responseTime,
          statusCode: metrics.statusCode,
          memoryUsage: metrics.memoryUsage
        }
      });
    });
  }

  /**
   * Set user context for current scope
   */
  setUser(userId: string, email?: string, companyId?: string): void {
    if (!this.initialized) return;

    Sentry.setUser({
      id: userId,
      email,
      ...(companyId && { company: companyId })
    });
  }

  /**
   * Clear user context
   */
  clearUser(): void {
    if (!this.initialized) return;
    Sentry.setUser(null);
  }

  /**
   * Add breadcrumb for debugging
   */
  addBreadcrumb(message: string, category: string = 'default', data?: any): void {
    if (!this.initialized) return;

    Sentry.addBreadcrumb({
      message,
      category,
      level: 'info',
      data
    });
  }

  /**
   * Flush all pending events (useful for shutdown)
   */
  async flush(timeout: number = 2000): Promise<boolean> {
    if (!this.initialized) return true;
    return await Sentry.flush(timeout);
  }

  /**
   * Get Sentry request handler for Express
   */
  getRequestHandler() {
    if (!this.initialized) return (req: any, res: any, next: any) => next();
    return Sentry.setupExpressErrorHandler;
  }

  /**
   * Get Sentry tracing handler for Express
   */
  getTracingHandler() {
    if (!this.initialized) return (req: any, res: any, next: any) => next();
    return (req: any, res: any, next: any) => next(); // Modern Sentry auto-instruments
  }

  /**
   * Get Sentry error handler for Express
   */
  getErrorHandler() {
    if (!this.initialized) return (err: any, req: any, res: any, next: any) => next(err);
    return Sentry.setupExpressErrorHandler;
  }

  /**
   * Health check for error tracking service
   */
  healthCheck(): { status: 'healthy' | 'unhealthy'; details: any } {
    return {
      status: this.initialized ? 'healthy' : 'unhealthy',
      details: {
        initialized: this.initialized,
        environment: envConfig.NODE_ENV,
        hasDsn: !!envConfig.SENTRY_DSN,
        version: require('@sentry/node/package.json').version
      }
    };
  }
}

// Export singleton instance
export const errorTrackingService = new ErrorTrackingService();