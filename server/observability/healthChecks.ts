// =============================================================================
// HEALTH CHECKS - LIVENESS vs READINESS
// =============================================================================

import { Router } from 'express';
import { db } from '../db.js';
import { logger } from './logging.js';

const router = Router();

/**
 * Service dependency definitions
 */
interface ServiceCheck {
  name: string;
  check: () => Promise<{ status: 'up' | 'down'; message?: string; responseTime?: number }>;
  timeout: number;
  critical: boolean; // If true, failure affects readiness
}

const serviceChecks: ServiceCheck[] = [
  {
    name: 'database',
    timeout: 5000,
    critical: true,
    check: async () => {
      const start = Date.now();
      try {
        await db.execute('SELECT 1 as health_check');
        return {
          status: 'up',
          responseTime: Date.now() - start,
          message: 'Database connection successful'
        };
      } catch (error) {
        return {
          status: 'down',
          responseTime: Date.now() - start,
          message: error instanceof Error ? error.message : 'Database connection failed'
        };
      }
    }
  },
  {
    name: 'filesystem',
    timeout: 1000,
    critical: true,
    check: async () => {
      const start = Date.now();
      try {
        const fs = await import('fs/promises');
        await fs.access('/tmp', fs.constants.W_OK);
        return {
          status: 'up',
          responseTime: Date.now() - start,
          message: 'Filesystem access successful'
        };
      } catch (error) {
        return {
          status: 'down',
          responseTime: Date.now() - start,
          message: error instanceof Error ? error.message : 'Filesystem access failed'
        };
      }
    }
  },
  {
    name: 'memory',
    timeout: 500,
    critical: false, // Memory pressure shouldn't kill readiness immediately
    check: async () => {
      const start = Date.now();
      try {
        const memUsage = process.memoryUsage();
        const memUsageMB = {
          rss: Math.round(memUsage.rss / 1024 / 1024),
          heapUsed: Math.round(memUsage.heapUsed / 1024 / 1024),
          heapTotal: Math.round(memUsage.heapTotal / 1024 / 1024),
          external: Math.round(memUsage.external / 1024 / 1024)
        };
        
        // Alert if heap usage > 1GB (adjust based on your needs)
        const highMemoryUsage = memUsageMB.heapUsed > 1024;
        
        return {
          status: highMemoryUsage ? 'down' : 'up',
          responseTime: Date.now() - start,
          message: `Heap: ${memUsageMB.heapUsed}MB, RSS: ${memUsageMB.rss}MB`
        };
      } catch (error) {
        return {
          status: 'down',
          responseTime: Date.now() - start,
          message: error instanceof Error ? error.message : 'Memory check failed'
        };
      }
    }
  }
];

/**
 * LIVENESS PROBE - Just checks if the process is running
 * Used by orchestrators (K8s, Docker) to know if process should be restarted
 */
router.get('/health/live', (req, res) => {
  const requestId = (req as any).requestId;
  
  logger.debug('Liveness check requested', {}, requestId);
  
  const response = {
    status: 'alive',
    timestamp: new Date().toISOString(),
    uptime: Math.floor(process.uptime()),
    pid: process.pid,
    version: process.env.npm_package_version || '1.0.0',
    environment: process.env.NODE_ENV || 'development'
  };
  
  res.status(200).json(response);
  
  logger.debug('Liveness check completed', response, requestId);
});

/**
 * READINESS PROBE - Checks if service can handle traffic
 * Used by load balancers to know if traffic should be routed here
 */
router.get('/health/ready', async (req, res) => {
  const requestId = (req as any).requestId;
  const startTime = Date.now();
  
  logger.debug('Readiness check started', {}, requestId);
  
  const results: Record<string, any> = {};
  let overallStatus = 'ready';
  let httpStatus = 200;
  
  // Run all service checks in parallel
  const checkPromises = serviceChecks.map(async (service) => {
    try {
      const timeoutPromise = new Promise((_, reject) => {
        setTimeout(() => reject(new Error(`Timeout after ${service.timeout}ms`)), service.timeout);
      });
      
      const checkResult = await Promise.race([service.check(), timeoutPromise]) as any;
      
      results[service.name] = {
        status: checkResult.status,
        responseTime: checkResult.responseTime,
        message: checkResult.message,
        critical: service.critical,
        lastChecked: new Date().toISOString()
      };
      
      // If critical service is down, mark overall as not ready
      if (service.critical && checkResult.status === 'down') {
        overallStatus = 'not_ready';
        httpStatus = 503;
      }
      
    } catch (error) {
      results[service.name] = {
        status: 'down',
        responseTime: service.timeout,
        message: error instanceof Error ? error.message : 'Check failed',
        critical: service.critical,
        lastChecked: new Date().toISOString()
      };
      
      if (service.critical) {
        overallStatus = 'not_ready';
        httpStatus = 503;
      }
    }
  });
  
  await Promise.allSettled(checkPromises);
  
  const totalResponseTime = Date.now() - startTime;
  
  const response = {
    status: overallStatus,
    timestamp: new Date().toISOString(),
    responseTime: totalResponseTime,
    services: results,
    summary: {
      total: serviceChecks.length,
      up: Object.values(results).filter((r: any) => r.status === 'up').length,
      down: Object.values(results).filter((r: any) => r.status === 'down').length,
      critical_down: Object.values(results).filter((r: any) => r.status === 'down' && r.critical).length
    }
  };
  
  res.status(httpStatus).json(response);
  
  const logLevel = httpStatus >= 500 ? 'error' : httpStatus >= 400 ? 'warn' : 'info';
  logger[logLevel]('Readiness check completed', {
    status: overallStatus,
    responseTime: totalResponseTime,
    httpStatus,
    summary: response.summary
  }, requestId);
});

/**
 * STARTUP PROBE - Checks if application has finished starting up
 * Used during container startup to know when to start sending traffic
 */
router.get('/health/startup', async (req, res) => {
  const requestId = (req as any).requestId;
  
  logger.debug('Startup check requested', {}, requestId);
  
  // Check if core services are initialized
  const coreServices = {
    auth: true, // Assume initialized if we're handling requests
    database: false,
    backgroundJobs: true
  };
  
  try {
    // Quick DB check for startup
    await db.execute('SELECT 1');
    coreServices.database = true;
  } catch (error) {
    logger.warn('Startup check: database not ready', { error: error instanceof Error ? error.message : String(error) }, requestId);
  }
  
  const allReady = Object.values(coreServices).every(Boolean);
  const status = allReady ? 'started' : 'starting';
  const httpStatus = allReady ? 200 : 503;
  
  const response = {
    status,
    timestamp: new Date().toISOString(),
    uptime: Math.floor(process.uptime()),
    coreServices,
    message: allReady ? 'Application fully started' : 'Application still starting'
  };
  
  res.status(httpStatus).json(response);
  
  logger.debug('Startup check completed', response, requestId);
});

/**
 * DEEP HEALTH CHECK - Comprehensive check for monitoring/debugging
 * Not used by orchestrators, but useful for ops teams
 */
router.get('/health/deep', async (req, res) => {
  const requestId = (req as any).requestId;
  const startTime = Date.now();
  
  logger.debug('Deep health check started', {}, requestId);
  
  // Run readiness checks first
  const readinessChecks = serviceChecks.map(async (service) => {
    try {
      const result = await service.check();
      return { [service.name]: result };
    } catch (error) {
      return {
        [service.name]: {
          status: 'down',
          message: error instanceof Error ? error.message : 'Check failed'
        }
      };
    }
  });
  
  const serviceResults = await Promise.allSettled(readinessChecks);
  const services = Object.assign({}, ...serviceResults.map(r => r.status === 'fulfilled' ? r.value : {}));
  
  // Additional deep checks
  const memoryUsage = process.memoryUsage();
  const cpuUsage = process.cpuUsage();
  
  const response = {
    status: 'deep_check_complete',
    timestamp: new Date().toISOString(),
    responseTime: Date.now() - startTime,
    
    // Service checks
    services,
    
    // System information
    system: {
      uptime: Math.floor(process.uptime()),
      memory: {
        rss: Math.round(memoryUsage.rss / 1024 / 1024),
        heapUsed: Math.round(memoryUsage.heapUsed / 1024 / 1024),
        heapTotal: Math.round(memoryUsage.heapTotal / 1024 / 1024),
        external: Math.round(memoryUsage.external / 1024 / 1024)
      },
      cpu: {
        user: cpuUsage.user,
        system: cpuUsage.system
      },
      platform: process.platform,
      nodeVersion: process.version,
      pid: process.pid
    },
    
    // Environment info
    environment: {
      nodeEnv: process.env.NODE_ENV || 'development',
      version: process.env.npm_package_version || '1.0.0',
      logLevel: process.env.LOG_LEVEL || 'info'
    }
  };
  
  res.json(response);
  
  logger.info('Deep health check completed', {
    responseTime: Date.now() - startTime,
    servicesUp: Object.values(services).filter((s: any) => s.status === 'up').length,
    servicesDown: Object.values(services).filter((s: any) => s.status === 'down').length
  }, requestId);
});

export default router;