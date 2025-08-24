// =============================================================================
// BACKGROUND JOBS MONITORING AND CONTROL API
// =============================================================================

import { Router } from 'express';
import { getJobStatuses, resetJobCircuitBreaker } from '../utils/safeScheduler.js';

const router = Router();

/**
 * GET /api/background-jobs/status
 * Get status of all background jobs
 */
router.get('/status', (req, res) => {
  try {
    const statuses = getJobStatuses();
    
    res.json({
      success: true,
      data: statuses,
      summary: {
        totalJobs: Object.keys(statuses.jobs).length,
        runningJobs: Object.values(statuses.jobs).filter((job: any) => job.isRunning).length,
        circuitBreakerOpen: Object.values(statuses.jobs).filter((job: any) => job.circuitBreakerOpen).length,
        jobsWithFailures: Object.values(statuses.jobs).filter((job: any) => job.consecutiveFailures > 0).length
      }
    });
    
  } catch (error) {
    console.error('[JOBS_API] Failed to get job statuses:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get job statuses',
      message: error instanceof Error ? error.message : String(error)
    });
  }
});

/**
 * POST /api/background-jobs/reset-circuit-breaker
 * Reset circuit breaker for a specific job (emergency use)
 * Body: { jobName: string }
 */
router.post('/reset-circuit-breaker', (req, res) => {
  try {
    const { jobName } = req.body;
    
    if (!jobName || typeof jobName !== 'string') {
      return res.status(400).json({
        success: false,
        error: 'Invalid request',
        message: 'jobName is required and must be a string'
      });
    }
    
    const success = resetJobCircuitBreaker(jobName);
    
    if (success) {
      res.json({
        success: true,
        message: `Circuit breaker reset for job: ${jobName}`,
        timestamp: new Date().toISOString()
      });
    } else {
      res.status(404).json({
        success: false,
        error: 'Job not found',
        message: `No job found with name: ${jobName}`
      });
    }
    
  } catch (error) {
    console.error('[JOBS_API] Failed to reset circuit breaker:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to reset circuit breaker',
      message: error instanceof Error ? error.message : String(error)
    });
  }
});

/**
 * GET /api/background-jobs/environment-status
 * Show which jobs are enabled/disabled by environment variables
 */
router.get('/environment-status', (req, res) => {
  try {
    const envVars = [
      'ENABLE_GOVERNMENT_MONITORING',
      'ENABLE_ERGANI_SUBMISSION', 
      'ENABLE_EMAIL_QUEUE',
      'ENABLE_DB_CLEANUP',
      'ENABLE_STATUS_MONITORING',
      'ENABLE_SECRET_ROTATION',
      'ENABLE_SECURITY_CLEANUP',
      'ENABLE_CACHE_CLEANUP',
      'ENABLE_WEBAUTHN_CLEANUP',
      'ENABLE_ANALYTICS_CLEANUP',
      'ENABLE_PERF_CLEANUP'
    ];
    
    const envStatus: Record<string, any> = {};
    
    for (const envVar of envVars) {
      const value = process.env[envVar];
      envStatus[envVar] = {
        value: value || 'undefined',
        enabled: value === 'true',
        job: envVar.replace('ENABLE_', '').toLowerCase().replace(/_/g, '-')
      };
    }
    
    res.json({
      success: true,
      data: envStatus,
      summary: {
        totalVars: envVars.length,
        enabled: Object.values(envStatus).filter(env => env.enabled).length,
        disabled: Object.values(envStatus).filter(env => !env.enabled).length
      },
      instructions: {
        toEnable: 'Set environment variable to "true" (e.g., ENABLE_GOVERNMENT_MONITORING=true)',
        toDisable: 'Set environment variable to "false" or leave unset'
      }
    });
    
  } catch (error) {
    console.error('[JOBS_API] Failed to get environment status:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get environment status',
      message: error instanceof Error ? error.message : String(error)
    });
  }
});

/**
 * GET /api/background-jobs/health
 * Health check endpoint for background job system
 */
router.get('/health', (req, res) => {
  try {
    const statuses = getJobStatuses();
    const jobs = Object.values(statuses.jobs);
    
    // Determine overall health
    const hasFailures = jobs.some((job: any) => job.consecutiveFailures > 0);
    const hasOpenCircuits = jobs.some((job: any) => job.circuitBreakerOpen);
    const runningJobs = jobs.filter((job: any) => job.isRunning).length;
    
    let health = 'healthy';
    if (hasOpenCircuits) {
      health = 'degraded';
    } else if (hasFailures) {
      health = 'warning';
    }
    
    res.json({
      success: true,
      health,
      data: {
        totalJobs: jobs.length,
        runningJobs,
        jobsWithFailures: jobs.filter((job: any) => job.consecutiveFailures > 0).length,
        circuitBreakersOpen: jobs.filter((job: any) => job.circuitBreakerOpen).length,
        idempotencyCache: statuses.globalIdempotencyCache
      },
      timestamp: statuses.timestamp
    });
    
  } catch (error) {
    console.error('[JOBS_API] Failed to get job health:', error);
    res.status(500).json({
      success: false,
      health: 'unhealthy',
      error: 'Failed to get job health',
      message: error instanceof Error ? error.message : String(error)
    });
  }
});

export default router;