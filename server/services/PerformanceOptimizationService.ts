/**
 * Performance Optimization Service
 * Comprehensive performance monitoring and optimization for production
 */

import { AuditService } from './AuditService';
import compression from 'compression';
import type { Express, Request, Response, NextFunction } from 'express';

export interface PerformanceMetrics {
  responseTime: {
    average: number;
    p95: number;
    p99: number;
    slowest: number;
  };
  throughput: {
    requestsPerSecond: number;
    requestsPerMinute: number;
    totalRequests: number;
  };
  resources: {
    memoryUsage: number;
    cpuUsage: number;
    diskUsage: number;
  };
  errors: {
    errorRate: number;
    criticalErrors: number;
    timeouts: number;
  };
  database: {
    connectionPoolUtilization: number;
    averageQueryTime: number;
    slowQueries: number;
  };
}

export interface OptimizationReport {
  timestamp: Date;
  overallScore: number;
  metrics: PerformanceMetrics;
  recommendations: {
    critical: string[];
    high: string[];
    medium: string[];
    low: string[];
  };
  optimizations: {
    applied: string[];
    planned: string[];
  };
}

export class PerformanceOptimizationService {
  private static instance: PerformanceOptimizationService;
  private responseTimesTracker: number[] = [];
  private requestCounter = 0;
  private errorCounter = 0;
  private startTime = Date.now();

  static getInstance(): PerformanceOptimizationService {
    if (!this.instance) {
      this.instance = new PerformanceOptimizationService();
    }
    return this.instance;
  }

  /**
   * Configure Express app with production performance optimizations
   */
  configureApp(app: Express): void {
    console.log('🚀 Configuring production performance optimizations...');

    // Enable compression for all responses
    app.use(compression({
      level: 6, // Good balance between compression and CPU usage
      threshold: 1024, // Only compress responses larger than 1KB
      filter: (req: Request, res: Response) => {
        // Don't compress already compressed files
        if (req.headers['x-no-compression']) {
          return false;
        }
        return compression.filter(req, res);
      }
    }));

    // Add performance monitoring middleware
    app.use(this.performanceMiddleware.bind(this));

    // Add cache headers for static assets
    app.use('/assets', (req: Request, res: Response, next: NextFunction) => {
      // Cache static assets for 1 year
      res.setHeader('Cache-Control', 'public, max-age=31536000, immutable');
      next();
    });

    // Add security-focused performance headers
    app.use((req: Request, res: Response, next: NextFunction) => {
      // DNS prefetch control
      res.setHeader('X-DNS-Prefetch-Control', 'on');
      
      // Keep-alive for better connection reuse
      res.setHeader('Connection', 'keep-alive');
      
      // Enable HTTP/2 Server Push hints (if supported)
      res.setHeader('Link', '</assets/main.css>; rel=preload; as=style');
      
      next();
    });

    console.log('✅ Production performance optimizations configured');
  }

  /**
   * Performance monitoring middleware
   */
  private performanceMiddleware(req: Request, res: Response, next: NextFunction): void {
    const startTime = Date.now();
    this.requestCounter++;

    // Track errors
    const originalSend = res.send;
    res.send = function(body: any) {
      if (res.statusCode >= 400) {
        PerformanceOptimizationService.getInstance().errorCounter++;
      }
      return originalSend.call(this, body);
    };

    res.on('finish', () => {
      const responseTime = Date.now() - startTime;
      this.responseTimesTracker.push(responseTime);
      
      // Keep only last 1000 response times
      if (this.responseTimesTracker.length > 1000) {
        this.responseTimesTracker.shift();
      }

      // Log slow requests
      if (responseTime > 1000) {
        console.warn(`Slow request detected: ${req.method} ${req.path} - ${responseTime}ms`);
      }
    });

    next();
  }

  /**
   * Get current performance metrics
   */
  async getPerformanceMetrics(): Promise<PerformanceMetrics> {
    const memoryUsage = process.memoryUsage();
    const uptime = process.uptime();

    // Calculate response time statistics
    const sortedTimes = this.responseTimesTracker.sort((a, b) => a - b);
    const average = sortedTimes.length > 0 
      ? sortedTimes.reduce((sum, time) => sum + time, 0) / sortedTimes.length 
      : 0;
    const p95Index = Math.floor(sortedTimes.length * 0.95);
    const p99Index = Math.floor(sortedTimes.length * 0.99);

    return {
      responseTime: {
        average: Math.round(average),
        p95: sortedTimes[p95Index] || 0,
        p99: sortedTimes[p99Index] || 0,
        slowest: sortedTimes[sortedTimes.length - 1] || 0
      },
      throughput: {
        requestsPerSecond: uptime > 0 ? Math.round(this.requestCounter / uptime) : 0,
        requestsPerMinute: uptime > 0 ? Math.round((this.requestCounter / uptime) * 60) : 0,
        totalRequests: this.requestCounter
      },
      resources: {
        memoryUsage: Math.round(memoryUsage.heapUsed / 1024 / 1024), // MB
        cpuUsage: 0, // Would need external monitoring
        diskUsage: 0 // Would need external monitoring
      },
      errors: {
        errorRate: this.requestCounter > 0 ? (this.errorCounter / this.requestCounter) * 100 : 0,
        criticalErrors: this.errorCounter,
        timeouts: 0 // Would track separately
      },
      database: {
        connectionPoolUtilization: 0, // Would get from database service
        averageQueryTime: 0, // Would get from database service
        slowQueries: 0 // Would get from database service
      }
    };
  }

  /**
   * Generate performance optimization report
   */
  async generateOptimizationReport(): Promise<OptimizationReport> {
    const metrics = await this.getPerformanceMetrics();
    const timestamp = new Date();

    // Calculate overall performance score (0-100)
    let score = 100;

    // Penalize slow response times
    if (metrics.responseTime.average > 500) score -= 20;
    if (metrics.responseTime.p95 > 1000) score -= 15;
    if (metrics.responseTime.p99 > 2000) score -= 10;

    // Penalize high error rates
    if (metrics.errors.errorRate > 5) score -= 25;
    if (metrics.errors.errorRate > 1) score -= 10;

    // Penalize high resource usage
    if (metrics.resources.memoryUsage > 500) score -= 15;
    if (metrics.resources.memoryUsage > 1000) score -= 25;

    const recommendations = {
      critical: [] as string[],
      high: [] as string[],
      medium: [] as string[],
      low: [] as string[]
    };

    // Generate recommendations based on metrics
    if (metrics.responseTime.average > 1000) {
      recommendations.critical.push('Average response time exceeds 1 second - investigate slow queries and optimize bottlenecks');
    }
    if (metrics.errors.errorRate > 5) {
      recommendations.critical.push('High error rate detected - review application logs and fix critical issues');
    }
    if (metrics.resources.memoryUsage > 1000) {
      recommendations.critical.push('High memory usage - investigate memory leaks and optimize data structures');
    }

    if (metrics.responseTime.p95 > 2000) {
      recommendations.high.push('95th percentile response time is slow - optimize heaviest endpoints');
    }
    if (metrics.throughput.requestsPerSecond < 10) {
      recommendations.high.push('Low throughput - consider scaling or performance tuning');
    }

    if (metrics.responseTime.average > 500) {
      recommendations.medium.push('Response time could be improved - review database queries and caching');
    }
    if (metrics.resources.memoryUsage > 300) {
      recommendations.medium.push('Memory usage is elevated - monitor for potential optimizations');
    }

    recommendations.low.push('Enable HTTP/2 for better multiplexing');
    recommendations.low.push('Implement CDN for static assets');
    recommendations.low.push('Add database connection pooling optimization');

    return {
      timestamp,
      overallScore: Math.max(0, score),
      metrics,
      recommendations,
      optimizations: {
        applied: [
          'Gzip compression enabled',
          'Cache headers configured',
          'Keep-alive connections enabled',
          'Performance monitoring middleware active'
        ],
        planned: [
          'Database query optimization',
          'Redis caching implementation',
          'CDN integration',
          'HTTP/2 Server Push'
        ]
      }
    };
  }

  /**
   * Apply automatic performance optimizations
   */
  async applyOptimizations(): Promise<{
    success: boolean;
    optimizations: string[];
    errors: string[];
  }> {
    const optimizations: string[] = [];
    const errors: string[] = [];

    try {
      // Clear old response time data if too large
      if (this.responseTimesTracker.length > 1000) {
        this.responseTimesTracker = this.responseTimesTracker.slice(-500);
        optimizations.push('Cleaned performance metrics memory');
      }

      // Force garbage collection if memory usage is high
      if (global.gc && process.memoryUsage().heapUsed > 500 * 1024 * 1024) {
        global.gc();
        optimizations.push('Forced garbage collection to free memory');
      }

      await AuditService.logEvent({
        resourceType: 'system',
        metadata: {
          action: 'performance.optimizations.applied',
          count: optimizations.length,
          optimizations
        }
      });

      return {
        success: true,
        optimizations,
        errors
      };

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      errors.push(`Optimization failed: ${errorMessage}`);
      
      return {
        success: false,
        optimizations,
        errors
      };
    }
  }

  /**
   * Check if performance meets production standards
   */
  async checkProductionReadiness(): Promise<{
    ready: boolean;
    score: number;
    issues: string[];
    recommendations: string[];
  }> {
    const report = await this.generateOptimizationReport();
    const issues: string[] = [];
    
    // Critical performance checks
    if (report.metrics.responseTime.average > 1000) {
      issues.push('Average response time exceeds production threshold (1000ms)');
    }
    
    if (report.metrics.errors.errorRate > 2) {
      issues.push('Error rate exceeds production threshold (2%)');
    }
    
    if (report.metrics.resources.memoryUsage > 800) {
      issues.push('Memory usage too high for production environment');
    }

    const ready = report.overallScore >= 80 && issues.length === 0;

    return {
      ready,
      score: report.overallScore,
      issues,
      recommendations: [
        ...report.recommendations.critical,
        ...report.recommendations.high
      ]
    };
  }
}