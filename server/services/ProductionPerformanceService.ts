/**
 * Production Performance Monitoring Service
 * Real-time application performance tracking and optimization
 */

import { performance } from 'perf_hooks';
import { register, Counter, Histogram, Gauge, collectDefaultMetrics } from 'prom-client';
import { errorTrackingService } from './ErrorTrackingService';
import { envConfig } from '../lib/envConfig';

interface RequestMetrics {
  method: string;
  route: string;
  statusCode: number;
  duration: number;
  timestamp: number;
  userAgent?: string;
  userId?: string;
}

interface DatabaseMetrics {
  query: string;
  duration: number;
  rowCount?: number;
  error?: boolean;
}

export class ProductionPerformanceService {
  private requestCounter: Counter<string>;
  private requestDuration: Histogram<string>;
  private databaseDuration: Histogram<string>;
  private activeConnections: Gauge<string>;
  private memoryUsage: Gauge<string>;
  private cpuUsage: Gauge<string>;
  private eventLoopLag: Gauge<string>;
  
  private recentRequests: RequestMetrics[] = [];
  private maxRecentRequests = 1000;
  private monitoringInterval: NodeJS.Timeout | null = null;

  constructor() {
    this.initializeMetrics();
    this.startMonitoring();
  }

  /**
   * Initialize Prometheus metrics
   */
  private initializeMetrics(): void {
    // Clear existing metrics
    register.clear();

    // Collect default Node.js metrics
    collectDefaultMetrics({
      register,
      prefix: 'payrollsync_',
    });

    // HTTP request metrics
    this.requestCounter = new Counter({
      name: 'payrollsync_http_requests_total',
      help: 'Total number of HTTP requests',
      labelNames: ['method', 'route', 'status_code'],
      registers: [register]
    });

    this.requestDuration = new Histogram({
      name: 'payrollsync_http_request_duration_seconds',
      help: 'HTTP request duration in seconds',
      labelNames: ['method', 'route', 'status_code'],
      buckets: [0.001, 0.005, 0.01, 0.05, 0.1, 0.5, 1, 5, 10],
      registers: [register]
    });

    // Database metrics
    this.databaseDuration = new Histogram({
      name: 'payrollsync_database_query_duration_seconds',
      help: 'Database query duration in seconds',
      labelNames: ['operation', 'table'],
      buckets: [0.001, 0.005, 0.01, 0.05, 0.1, 0.5, 1, 5],
      registers: [register]
    });

    // System metrics
    this.activeConnections = new Gauge({
      name: 'payrollsync_active_connections',
      help: 'Number of active connections',
      registers: [register]
    });

    this.memoryUsage = new Gauge({
      name: 'payrollsync_memory_usage_bytes',
      help: 'Memory usage in bytes',
      labelNames: ['type'],
      registers: [register]
    });

    this.cpuUsage = new Gauge({
      name: 'payrollsync_cpu_usage_percent',
      help: 'CPU usage percentage',
      registers: [register]
    });

    this.eventLoopLag = new Gauge({
      name: 'payrollsync_event_loop_lag_seconds',
      help: 'Event loop lag in seconds',
      registers: [register]
    });

    console.log('✅ Production performance metrics initialized');
  }

  /**
   * Start monitoring system resources
   */
  private startMonitoring(): void {
    if (this.monitoringInterval) {
      clearInterval(this.monitoringInterval);
    }

    this.monitoringInterval = setInterval(() => {
      this.collectSystemMetrics();
    }, 10000); // Collect every 10 seconds

    console.log('⏰ Production performance monitoring started');
  }

  /**
   * Record HTTP request metrics
   */
  recordRequest(metrics: RequestMetrics): void {
    const labels = {
      method: metrics.method,
      route: this.sanitizeRoute(metrics.route),
      status_code: metrics.statusCode.toString()
    };

    // Increment request counter
    this.requestCounter.inc(labels);

    // Record request duration
    this.requestDuration.observe(labels, metrics.duration / 1000);

    // Store recent request for analysis
    this.recentRequests.push(metrics);
    if (this.recentRequests.length > this.maxRecentRequests) {
      this.recentRequests.shift();
    }

    // Alert on slow requests (>5 seconds)
    if (metrics.duration > 5000) {
      errorTrackingService.captureMessage(
        `Slow request detected: ${metrics.method} ${metrics.route} - ${metrics.duration}ms`,
        'warning',
        {
          tags: {
            route: metrics.route,
            method: metrics.method,
            statusCode: metrics.statusCode.toString()
          },
          extra: {
            duration: metrics.duration,
            userAgent: metrics.userAgent
          }
        }
      );
    }

    // Send to error tracking for performance monitoring
    errorTrackingService.recordPerformance({
      responseTime: metrics.duration,
      memoryUsage: process.memoryUsage().heapUsed,
      endpoint: metrics.route,
      statusCode: metrics.statusCode
    });
  }

  /**
   * Record database query metrics
   */
  recordDatabaseQuery(metrics: DatabaseMetrics): void {
    const operation = this.extractOperation(metrics.query);
    const table = this.extractTable(metrics.query);

    const labels = {
      operation,
      table: table || 'unknown'
    };

    this.databaseDuration.observe(labels, metrics.duration / 1000);

    // Alert on slow queries (>1 second)
    if (metrics.duration > 1000) {
      errorTrackingService.captureMessage(
        `Slow database query: ${operation} on ${table} - ${metrics.duration}ms`,
        'warning',
        {
          tags: {
            operation,
            table: table || 'unknown'
          },
          extra: {
            query: metrics.query.substring(0, 200), // First 200 chars
            duration: metrics.duration,
            rowCount: metrics.rowCount
          }
        }
      );
    }
  }

  /**
   * Collect system metrics
   */
  private collectSystemMetrics(): void {
    try {
      // Memory usage
      const memUsage = process.memoryUsage();
      this.memoryUsage.set({ type: 'heap_used' }, memUsage.heapUsed);
      this.memoryUsage.set({ type: 'heap_total' }, memUsage.heapTotal);
      this.memoryUsage.set({ type: 'external' }, memUsage.external);
      this.memoryUsage.set({ type: 'rss' }, memUsage.rss);

      // CPU usage
      const cpuUsage = process.cpuUsage();
      this.cpuUsage.set((cpuUsage.user + cpuUsage.system) / 1000000);

      // Event loop lag (simplified measurement)
      const start = performance.now();
      setImmediate(() => {
        const lag = performance.now() - start;
        this.eventLoopLag.set(lag / 1000);
      });

    } catch (error) {
      console.error('Failed to collect system metrics:', error);
    }
  }

  /**
   * Get performance metrics for API
   */
  async getMetrics(): Promise<string> {
    return register.metrics();
  }

  /**
   * Get performance summary
   */
  getPerformanceSummary(): {
    requests: {
      total: number;
      avgDuration: number;
      slowRequests: number;
      errorRate: number;
    };
    system: {
      memoryUsage: NodeJS.MemoryUsage;
      cpuUsage: NodeJS.CpuUsage;
    };
    top: {
      slowestRoutes: Array<{ route: string; avgDuration: number; count: number }>;
      errorRoutes: Array<{ route: string; errorCount: number; totalCount: number }>;
    };
  } {
    const recentWindow = this.recentRequests.slice(-100);
    
    const totalRequests = recentWindow.length;
    const avgDuration = totalRequests > 0 
      ? recentWindow.reduce((sum, req) => sum + req.duration, 0) / totalRequests 
      : 0;
    const slowRequests = recentWindow.filter(req => req.duration > 1000).length;
    const errorRequests = recentWindow.filter(req => req.statusCode >= 400).length;

    // Analyze routes
    const routeStats = new Map<string, { durations: number[]; errors: number; total: number }>();
    
    recentWindow.forEach(req => {
      const key = `${req.method} ${req.route}`;
      if (!routeStats.has(key)) {
        routeStats.set(key, { durations: [], errors: 0, total: 0 });
      }
      const stats = routeStats.get(key)!;
      stats.durations.push(req.duration);
      stats.total++;
      if (req.statusCode >= 400) stats.errors++;
    });

    const slowestRoutes = Array.from(routeStats.entries())
      .map(([route, stats]) => ({
        route,
        avgDuration: stats.durations.reduce((sum, d) => sum + d, 0) / stats.durations.length,
        count: stats.total
      }))
      .sort((a, b) => b.avgDuration - a.avgDuration)
      .slice(0, 5);

    const errorRoutes = Array.from(routeStats.entries())
      .map(([route, stats]) => ({
        route,
        errorCount: stats.errors,
        totalCount: stats.total
      }))
      .filter(r => r.errorCount > 0)
      .sort((a, b) => (b.errorCount / b.totalCount) - (a.errorCount / a.totalCount))
      .slice(0, 5);

    return {
      requests: {
        total: totalRequests,
        avgDuration,
        slowRequests,
        errorRate: totalRequests > 0 ? (errorRequests / totalRequests) * 100 : 0
      },
      system: {
        memoryUsage: process.memoryUsage(),
        cpuUsage: process.cpuUsage()
      },
      top: {
        slowestRoutes,
        errorRoutes
      }
    };
  }

  /**
   * Sanitize route for metrics (remove IDs and sensitive data)
   */
  private sanitizeRoute(route: string): string {
    return route
      .replace(/\/\d+/g, '/:id')
      .replace(/\/[a-f0-9-]{36}/g, '/:uuid')
      .replace(/\/[a-f0-9]{24}/g, '/:objectid')
      .replace(/\?.*$/, '');
  }

  /**
   * Extract SQL operation from query
   */
  private extractOperation(query: string): string {
    const operation = query.trim().split(' ')[0].toUpperCase();
    return ['SELECT', 'INSERT', 'UPDATE', 'DELETE', 'CREATE', 'DROP', 'ALTER'].includes(operation) 
      ? operation 
      : 'OTHER';
  }

  /**
   * Extract table name from SQL query
   */
  private extractTable(query: string): string | null {
    const normalizedQuery = query.toLowerCase().replace(/\s+/g, ' ');
    
    const patterns = [
      /from\s+["']?([a-zA-Z_][a-zA-Z0-9_]*)["']?/,
      /into\s+["']?([a-zA-Z_][a-zA-Z0-9_]*)["']?/,
      /update\s+["']?([a-zA-Z_][a-zA-Z0-9_]*)["']?/,
      /table\s+["']?([a-zA-Z_][a-zA-Z0-9_]*)["']?/
    ];

    for (const pattern of patterns) {
      const match = normalizedQuery.match(pattern);
      if (match) return match[1];
    }

    return null;
  }

  /**
   * Health check for performance monitoring
   */
  healthCheck(): { status: 'healthy' | 'unhealthy'; details: any } {
    const summary = this.getPerformanceSummary();
    const isHealthy = summary.requests.errorRate < 5 && summary.requests.avgDuration < 2000;

    return {
      status: isHealthy ? 'healthy' : 'unhealthy',
      details: {
        monitoring: !!this.monitoringInterval,
        metricsCount: register.metrics().split('\n').length,
        avgResponseTime: summary.requests.avgDuration,
        errorRate: summary.requests.errorRate,
        memoryUsageMB: Math.round(summary.system.memoryUsage.heapUsed / 1024 / 1024)
      }
    };
  }

  /**
   * Stop monitoring (cleanup)
   */
  stop(): void {
    if (this.monitoringInterval) {
      clearInterval(this.monitoringInterval);
      this.monitoringInterval = null;
    }
    register.clear();
    console.log('🛑 Production performance monitoring stopped');
  }
}

// Export singleton instance
export const productionPerformanceService = new ProductionPerformanceService();