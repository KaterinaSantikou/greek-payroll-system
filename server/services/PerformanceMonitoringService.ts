/**
 * Performance Monitoring Service for Authentication System
 * Tracks response times and meets acceptance criteria (< 1.5s login p95)
 */

export interface PerformanceMetric {
  operation: string;
  duration: number;
  timestamp: Date;
  correlationId: string;
  userId?: string;
  success: boolean;
  metadata?: Record<string, any>;
}

export interface PerformanceStats {
  operation: string;
  count: number;
  avg: number;
  p50: number;
  p95: number;
  p99: number;
  min: number;
  max: number;
  successRate: number;
}

// In-memory storage for metrics (would be database/time-series DB in production)
const metrics: PerformanceMetric[] = [];

export class PerformanceMonitoringService {
  /**
   * Start a performance timer
   */
  static startTimer(operation: string, correlationId: string, userId?: string) {
    const startTime = Date.now();
    
    return {
      end: (success: boolean = true, metadata?: Record<string, any>) => {
        const duration = Date.now() - startTime;
        
        const metric: PerformanceMetric = {
          operation,
          duration,
          timestamp: new Date(),
          correlationId,
          userId,
          success,
          metadata,
        };

        metrics.push(metric);

        // Keep only last 10000 metrics to prevent memory issues
        if (metrics.length > 10000) {
          metrics.splice(0, metrics.length - 10000);
        }

        // Log slow operations
        if (duration > 1500) { // 1.5s threshold
          console.warn(`Slow operation detected: ${operation} took ${duration}ms (correlationId: ${correlationId})`);
        }

        return metric;
      }
    };
  }

  /**
   * Record a manual metric
   */
  static recordMetric(metric: PerformanceMetric): void {
    metrics.push(metric);

    // Keep only last 10000 metrics
    if (metrics.length > 10000) {
      metrics.splice(0, metrics.length - 10000);
    }
  }

  /**
   * Get performance statistics for an operation
   */
  static getStats(operation: string, timeRangeHours: number = 24): PerformanceStats {
    const cutoff = new Date(Date.now() - timeRangeHours * 60 * 60 * 1000);
    const operationMetrics = metrics
      .filter(m => m.operation === operation && m.timestamp > cutoff)
      .map(m => m.duration)
      .sort((a, b) => a - b);

    if (operationMetrics.length === 0) {
      return {
        operation,
        count: 0,
        avg: 0,
        p50: 0,
        p95: 0,
        p99: 0,
        min: 0,
        max: 0,
        successRate: 0,
      };
    }

    const successfulOps = metrics
      .filter(m => m.operation === operation && m.timestamp > cutoff && m.success)
      .length;

    return {
      operation,
      count: operationMetrics.length,
      avg: operationMetrics.reduce((a, b) => a + b, 0) / operationMetrics.length,
      p50: this.percentile(operationMetrics, 50),
      p95: this.percentile(operationMetrics, 95),
      p99: this.percentile(operationMetrics, 99),
      min: operationMetrics[0],
      max: operationMetrics[operationMetrics.length - 1],
      successRate: (successfulOps / operationMetrics.length) * 100,
    };
  }

  /**
   * Get all performance statistics
   */
  static getAllStats(timeRangeHours: number = 24): PerformanceStats[] {
    const operations = Array.from(new Set(metrics.map(m => m.operation)));
    return operations.map(op => this.getStats(op, timeRangeHours));
  }

  /**
   * Check if acceptance criteria are met
   */
  static checkAcceptanceCriteria(): {
    loginP95: number;
    signupP95: number;
    mfaChallengeP95: number;
    acceptanceCriteriaMet: boolean;
    details: string[];
  } {
    const loginStats = this.getStats('auth_login', 24);
    const signupStats = this.getStats('auth_signup', 24);
    const mfaStats = this.getStats('auth_mfa_challenge', 24);

    const details: string[] = [];
    let acceptanceCriteriaMet = true;

    // Login should complete in < 1.5s (p95)
    if (loginStats.p95 > 1500) {
      acceptanceCriteriaMet = false;
      details.push(`Login p95 (${loginStats.p95}ms) exceeds 1.5s threshold`);
    }

    // Sign-up should complete reasonably fast
    if (signupStats.p95 > 2000) {
      details.push(`Sign-up p95 (${signupStats.p95}ms) is slow (> 2s)`);
    }

    // MFA challenges should be fast
    if (mfaStats.p95 > 1000) {
      details.push(`MFA challenge p95 (${mfaStats.p95}ms) is slow (> 1s)`);
    }

    if (acceptanceCriteriaMet) {
      details.push('All acceptance criteria met ✅');
    }

    return {
      loginP95: loginStats.p95,
      signupP95: signupStats.p95,
      mfaChallengeP95: mfaStats.p95,
      acceptanceCriteriaMet,
      details,
    };
  }

  /**
   * Calculate percentile from sorted array
   */
  private static percentile(sortedArray: number[], percentile: number): number {
    if (sortedArray.length === 0) return 0;
    
    const index = (percentile / 100) * (sortedArray.length - 1);
    const lower = Math.floor(index);
    const upper = Math.ceil(index);
    
    if (lower === upper) {
      return sortedArray[lower];
    }
    
    const weight = index - lower;
    return sortedArray[lower] * (1 - weight) + sortedArray[upper] * weight;
  }

  /**
   * Get metrics for a specific correlation ID (useful for debugging)
   */
  static getMetricsByCorrelationId(correlationId: string): PerformanceMetric[] {
    return metrics.filter(m => m.correlationId === correlationId);
  }

  /**
   * Clear old metrics (cleanup job)
   */
  static clearOldMetrics(olderThanHours: number = 168): number { // 7 days default
    const cutoff = new Date(Date.now() - olderThanHours * 60 * 60 * 1000);
    const initialLength = metrics.length;
    
    // Remove metrics older than cutoff
    for (let i = metrics.length - 1; i >= 0; i--) {
      if (metrics[i].timestamp < cutoff) {
        metrics.splice(i, 1);
      }
    }
    
    return initialLength - metrics.length;
  }
}

// Cleanup job - run every hour (safely)
import { createSafeInterval } from '../utils/safeScheduler';

createSafeInterval(() => {
  PerformanceMonitoringService.clearOldMetrics(168); // Keep 7 days
}, {
  name: 'Performance Metrics Cleanup',
  enableEnvVar: 'ENABLE_PERF_CLEANUP',
  intervalMs: 60 * 60 * 1000,
  runImmediately: false
});