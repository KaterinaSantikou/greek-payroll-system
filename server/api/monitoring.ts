/**
 * Performance & Monitoring API Endpoints
 */

import { Router } from 'express';
import { errorTrackingService } from '../services/ErrorTrackingService';
import { productionPerformanceService } from '../services/ProductionPerformanceService';
import { databaseOptimizationService } from '../services/DatabaseOptimizationService';
import { cdnService } from '../services/CDNService';

const router = Router();

/**
 * GET /api/monitoring/health - Get overall system health
 */
router.get('/health', async (req, res) => {
  try {
    const health = {
      timestamp: new Date().toISOString(),
      status: 'healthy',
      services: {
        errorTracking: errorTrackingService.healthCheck(),
        performance: productionPerformanceService.healthCheck(),
        database: databaseOptimizationService.healthCheck(),
        cdn: cdnService.healthCheck()
      }
    };

    // Determine overall status
    const serviceStatuses = Object.values(health.services).map(s => s.status);
    if (serviceStatuses.includes('unhealthy')) {
      health.status = 'unhealthy';
    } else if (serviceStatuses.includes('warning')) {
      health.status = 'warning';
    }

    const statusCode = health.status === 'healthy' ? 200 : 503;
    res.status(statusCode).json(health);
    
  } catch (error) {
    console.error('Health check failed:', error);
    res.status(500).json({
      timestamp: new Date().toISOString(),
      status: 'unhealthy',
      error: 'Health check failed'
    });
  }
});

/**
 * GET /api/monitoring/metrics - Get Prometheus metrics
 */
router.get('/metrics', async (req, res) => {
  try {
    const metrics = await productionPerformanceService.getMetrics();
    res.set('Content-Type', 'text/plain; version=0.0.4; charset=utf-8');
    res.send(metrics);
  } catch (error) {
    console.error('Failed to get metrics:', error);
    res.status(500).json({
      error: 'Failed to get metrics'
    });
  }
});

/**
 * GET /api/monitoring/performance - Get performance summary
 */
router.get('/performance', async (req, res) => {
  try {
    const performance = productionPerformanceService.getPerformanceSummary();
    res.json({
      success: true,
      performance,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Failed to get performance data:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get performance data'
    });
  }
});

/**
 * GET /api/monitoring/database - Get database optimization report
 */
router.get('/database', async (req, res) => {
  try {
    const report = databaseOptimizationService.getOptimizationReport();
    res.json({
      success: true,
      report,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Failed to get database optimization report:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get database optimization report'
    });
  }
});

/**
 * GET /api/monitoring/cdn - Get CDN performance metrics
 */
router.get('/cdn', async (req, res) => {
  try {
    const metrics = cdnService.getMetrics();
    res.json({
      success: true,
      metrics,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Failed to get CDN metrics:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get CDN metrics'
    });
  }
});

/**
 * POST /api/monitoring/error-test - Test error tracking (development only)
 */
router.post('/error-test', (req, res) => {
  if (process.env.NODE_ENV === 'production') {
    return res.status(403).json({
      error: 'Error testing is not allowed in production'
    });
  }

  try {
    const { type = 'error', message = 'Test error' } = req.body;
    
    if (type === 'error') {
      throw new Error(message);
    } else {
      errorTrackingService.captureMessage(message, 'info', {
        tags: { test: 'true' },
        extra: { testType: type }
      });
    }

    res.json({
      success: true,
      message: 'Error tracking test completed'
    });
    
  } catch (error) {
    // This error will be caught by error middleware and sent to Sentry
    throw error;
  }
});

/**
 * GET /api/monitoring/alerts - Get active performance alerts
 */
router.get('/alerts', async (req, res) => {
  try {
    const performance = productionPerformanceService.getPerformanceSummary();
    const dbReport = databaseOptimizationService.getOptimizationReport();
    
    const alerts: Array<{
      type: 'performance' | 'database' | 'error';
      severity: 'low' | 'medium' | 'high' | 'critical';
      message: string;
      timestamp: string;
      details?: any;
    }> = [];

    // Performance alerts
    if (performance.requests.errorRate > 10) {
      alerts.push({
        type: 'error',
        severity: performance.requests.errorRate > 25 ? 'critical' : 'high',
        message: `High error rate: ${performance.requests.errorRate.toFixed(1)}%`,
        timestamp: new Date().toISOString(),
        details: { errorRate: performance.requests.errorRate }
      });
    }

    if (performance.requests.avgDuration > 3000) {
      alerts.push({
        type: 'performance',
        severity: performance.requests.avgDuration > 5000 ? 'high' : 'medium',
        message: `High average response time: ${performance.requests.avgDuration.toFixed(0)}ms`,
        timestamp: new Date().toISOString(),
        details: { avgDuration: performance.requests.avgDuration }
      });
    }

    // Database alerts
    if (dbReport.performance.avgQueryTime > 2000) {
      alerts.push({
        type: 'database',
        severity: dbReport.performance.avgQueryTime > 5000 ? 'high' : 'medium',
        message: `Slow database queries detected: ${dbReport.performance.avgQueryTime.toFixed(0)}ms average`,
        timestamp: new Date().toISOString(),
        details: { avgQueryTime: dbReport.performance.avgQueryTime }
      });
    }

    // Memory alerts
    const memoryUsageMB = Math.round(performance.system.memoryUsage.heapUsed / 1024 / 1024);
    if (memoryUsageMB > 512) {
      alerts.push({
        type: 'performance',
        severity: memoryUsageMB > 1024 ? 'high' : 'medium',
        message: `High memory usage: ${memoryUsageMB}MB`,
        timestamp: new Date().toISOString(),
        details: { memoryUsageMB }
      });
    }

    res.json({
      success: true,
      alerts: alerts.sort((a, b) => {
        const severityOrder = { critical: 4, high: 3, medium: 2, low: 1 };
        return severityOrder[b.severity] - severityOrder[a.severity];
      }),
      count: alerts.length,
      timestamp: new Date().toISOString()
    });
    
  } catch (error) {
    console.error('Failed to get alerts:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get alerts'
    });
  }
});

export default router;