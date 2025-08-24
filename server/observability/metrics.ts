// =============================================================================
// METRICS COLLECTION - API LATENCY, ERROR RATES, JOB RUNS
// =============================================================================

import { Request, Response, NextFunction, Router } from 'express';
import { register, Counter, Histogram, Gauge, collectDefaultMetrics } from 'prom-client';
import { logger } from './logging.js';

// Initialize default metrics collection (CPU, memory, etc.)
collectDefaultMetrics({
  prefix: 'payrollsync_',
  gcDurationBuckets: [0.001, 0.01, 0.1, 1, 2, 5],
  eventLoopMonitoringPrecision: 10,
});

// =============================================================================
// PROMETHEUS METRICS DEFINITIONS
// =============================================================================

/**
 * API Request Metrics
 */
const httpRequestsTotal = new Counter({
  name: 'payrollsync_http_requests_total',
  help: 'Total number of HTTP requests',
  labelNames: ['method', 'route', 'status_code', 'status_class']
});

const httpRequestDuration = new Histogram({
  name: 'payrollsync_http_request_duration_seconds',
  help: 'Duration of HTTP requests in seconds',
  labelNames: ['method', 'route', 'status_code'],
  buckets: [0.001, 0.005, 0.01, 0.05, 0.1, 0.2, 0.5, 1, 2, 5, 10]
});

/**
 * API Error Metrics
 */
const httpErrors = new Counter({
  name: 'payrollsync_http_errors_total',
  help: 'Total number of HTTP errors',
  labelNames: ['method', 'route', 'status_code', 'error_type']
});

const httpErrorRate = new Gauge({
  name: 'payrollsync_http_error_rate',
  help: 'HTTP error rate (errors/requests) in the last 5 minutes',
  labelNames: ['route']
});

/**
 * Background Job Metrics
 */
const backgroundJobsTotal = new Counter({
  name: 'payrollsync_background_jobs_total',
  help: 'Total number of background job executions',
  labelNames: ['job_name', 'status']
});

const backgroundJobDuration = new Histogram({
  name: 'payrollsync_background_job_duration_seconds',
  help: 'Duration of background job executions in seconds',
  labelNames: ['job_name'],
  buckets: [0.1, 0.5, 1, 2, 5, 10, 30, 60, 300, 600]
});

const backgroundJobsActive = new Gauge({
  name: 'payrollsync_background_jobs_active',
  help: 'Number of currently active background jobs',
  labelNames: ['job_name']
});

const backgroundJobCircuitBreakerOpen = new Gauge({
  name: 'payrollsync_background_job_circuit_breaker_open',
  help: 'Whether job circuit breaker is open (1) or closed (0)',
  labelNames: ['job_name']
});

/**
 * Database Metrics
 */
const databaseConnections = new Gauge({
  name: 'payrollsync_database_connections',
  help: 'Number of active database connections'
});

const databaseQueryDuration = new Histogram({
  name: 'payrollsync_database_query_duration_seconds',
  help: 'Duration of database queries in seconds',
  labelNames: ['operation'],
  buckets: [0.001, 0.005, 0.01, 0.05, 0.1, 0.5, 1, 2, 5]
});

const databaseErrors = new Counter({
  name: 'payrollsync_database_errors_total',
  help: 'Total number of database errors',
  labelNames: ['operation', 'error_type']
});

/**
 * Business Metrics
 */
const payrollCalculations = new Counter({
  name: 'payrollsync_payroll_calculations_total',
  help: 'Total number of payroll calculations',
  labelNames: ['company_id', 'status']
});

const erganiSubmissions = new Counter({
  name: 'payrollsync_ergani_submissions_total',
  help: 'Total number of ERGANI submissions',
  labelNames: ['status', 'submission_type']
});

// =============================================================================
// METRICS MIDDLEWARE
// =============================================================================

/**
 * Express middleware to collect HTTP request metrics
 */
export function metricsMiddleware(req: Request, res: Response, next: NextFunction) {
  const startTime = Date.now();
  const requestId = (req as any).requestId;
  
  // Extract route pattern (not specific values)
  const route = getRoutePattern(req.route?.path || req.path || req.url);
  
  logger.debug('Metrics collection started', {
    method: req.method,
    route,
    userAgent: req.headers['user-agent']
  }, requestId);
  
  res.on('finish', () => {
    const duration = (Date.now() - startTime) / 1000; // Convert to seconds
    const statusClass = getStatusClass(res.statusCode);
    
    // Increment request counter
    httpRequestsTotal.labels({
      method: req.method,
      route: route,
      status_code: res.statusCode.toString(),
      status_class: statusClass
    }).inc();
    
    // Record request duration
    httpRequestDuration.labels({
      method: req.method,
      route: route,
      status_code: res.statusCode.toString()
    }).observe(duration);
    
    // Track errors specifically
    if (res.statusCode >= 400) {
      const errorType = res.statusCode >= 500 ? 'server_error' : 'client_error';
      
      httpErrors.labels({
        method: req.method,
        route: route,
        status_code: res.statusCode.toString(),
        error_type: errorType
      }).inc();
      
      logger.warn('HTTP error recorded in metrics', {
        method: req.method,
        route,
        statusCode: res.statusCode,
        duration: `${duration}s`,
        errorType
      }, requestId);
    }
    
    logger.debug('Request metrics recorded', {
      method: req.method,
      route,
      statusCode: res.statusCode,
      duration: `${duration}s`,
      statusClass
    }, requestId);
  });
  
  next();
}

/**
 * Background job metrics collection
 */
export class JobMetricsCollector {
  private activeJobs = new Map<string, Date>();
  
  /**
   * Mark job as started
   */
  startJob(jobName: string) {
    this.activeJobs.set(jobName, new Date());
    backgroundJobsActive.labels({ job_name: jobName }).inc();
    
    logger.debug('Job metrics: started', { jobName });
  }
  
  /**
   * Mark job as completed
   */
  completeJob(jobName: string, success: boolean) {
    const startTime = this.activeJobs.get(jobName);
    if (startTime) {
      const duration = (Date.now() - startTime.getTime()) / 1000;
      
      backgroundJobDuration.labels({ job_name: jobName }).observe(duration);
      backgroundJobsTotal.labels({
        job_name: jobName,
        status: success ? 'success' : 'failure'
      }).inc();
      
      backgroundJobsActive.labels({ job_name: jobName }).dec();
      this.activeJobs.delete(jobName);
      
      logger.debug('Job metrics: completed', {
        jobName,
        success,
        duration: `${duration}s`
      });
    }
  }
  
  /**
   * Update circuit breaker status
   */
  updateCircuitBreakerStatus(jobName: string, isOpen: boolean) {
    backgroundJobCircuitBreakerOpen.labels({ job_name: jobName }).set(isOpen ? 1 : 0);
    
    logger.debug('Job metrics: circuit breaker updated', {
      jobName,
      isOpen
    });
  }
}

// Global job metrics collector instance
export const jobMetrics = new JobMetricsCollector();

/**
 * Database metrics helpers
 */
export function recordDatabaseQuery(operation: string, duration: number, success: boolean) {
  databaseQueryDuration.labels({ operation }).observe(duration / 1000);
  
  if (!success) {
    databaseErrors.labels({
      operation,
      error_type: 'query_failure'
    }).inc();
  }
}

export function updateDatabaseConnections(count: number) {
  databaseConnections.set(count);
}

/**
 * Business metrics helpers
 */
export function recordPayrollCalculation(companyId: string, success: boolean) {
  payrollCalculations.labels({
    company_id: companyId,
    status: success ? 'success' : 'failure'
  }).inc();
}

export function recordErganiSubmission(status: string, submissionType: string) {
  erganiSubmissions.labels({
    status,
    submission_type: submissionType
  }).inc();
}

// =============================================================================
// METRICS ENDPOINT
// =============================================================================

const router = Router();

/**
 * Prometheus metrics endpoint
 */
router.get('/metrics', async (req, res) => {
  const requestId = (req as any).requestId;
  
  logger.debug('Metrics endpoint requested', {}, requestId);
  
  try {
    res.set('Content-Type', register.contentType);
    const metrics = await register.metrics();
    res.end(metrics);
    
    logger.debug('Metrics endpoint served', {
      metricsLength: metrics.length
    }, requestId);
  } catch (error) {
    logger.error('Failed to generate metrics', {
      error: error instanceof Error ? error.message : String(error)
    }, requestId);
    
    res.status(500).end('Error generating metrics');
  }
});

/**
 * Custom metrics summary endpoint (JSON format)
 */
router.get('/metrics/summary', async (req, res) => {
  const requestId = (req as any).requestId;
  
  logger.debug('Metrics summary requested', {}, requestId);
  
  try {
    const summary = {
      timestamp: new Date().toISOString(),
      uptime: Math.floor(process.uptime()),
      
      // Get current metric values
      requests: {
        total: await getMetricValue(httpRequestsTotal),
        errors: await getMetricValue(httpErrors),
        current_rate: '0', // Would need time series data for this
      },
      
      jobs: {
        total: await getMetricValue(backgroundJobsTotal),
        active: await getMetricValue(backgroundJobsActive),
        circuit_breakers_open: await getMetricValue(backgroundJobCircuitBreakerOpen)
      },
      
      database: {
        connections: await getMetricValue(databaseConnections),
        errors: await getMetricValue(databaseErrors)
      },
      
      business: {
        payroll_calculations: await getMetricValue(payrollCalculations),
        ergani_submissions: await getMetricValue(erganiSubmissions)
      }
    };
    
    res.json(summary);
    
    logger.debug('Metrics summary served', summary, requestId);
  } catch (error) {
    logger.error('Failed to generate metrics summary', {
      error: error instanceof Error ? error.message : String(error)
    }, requestId);
    
    res.status(500).json({ error: 'Failed to generate metrics summary' });
  }
});

// =============================================================================
// UTILITY FUNCTIONS
// =============================================================================

/**
 * Extract route pattern from path
 */
function getRoutePattern(path: string): string {
  return path
    .replace(/\/api\/v\d+/, '/api') // Normalize versioned APIs
    .replace(/\/\d+/g, '/:id')      // Replace numeric IDs
    .replace(/\/[a-f0-9-]{36}/g, '/:uuid') // Replace UUIDs
    .replace(/\/[a-f0-9]{24}/g, '/:objectId') // Replace MongoDB ObjectIds
    .replace(/\?.*$/, '');          // Remove query parameters
}

/**
 * Get status class from HTTP status code
 */
function getStatusClass(statusCode: number): string {
  if (statusCode < 200) return '1xx';
  if (statusCode < 300) return '2xx';
  if (statusCode < 400) return '3xx';
  if (statusCode < 500) return '4xx';
  return '5xx';
}

/**
 * Get current value of a metric (simplified)
 */
async function getMetricValue(metric: any): Promise<string> {
  try {
    // This is a simplified implementation
    // In reality, you'd need to sum up all label combinations
    return '0';
  } catch (error) {
    return 'unknown';
  }
}

export default router;