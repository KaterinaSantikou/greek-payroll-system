import { Router } from 'express';
import { db } from '../db';

const router = Router();

// System health check endpoint
router.get('/health', async (req, res) => {
  const startTime = Date.now();

  try {
    // Test database connectivity
    await db.execute('SELECT 1');

    const healthData = {
      status: 'healthy',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      memory: process.memoryUsage(),
      responseTime: Date.now() - startTime,
      version: process.env.npm_package_version || '1.0.0',
      environment: process.env.NODE_ENV || 'development',
      database: 'connected',
      services: {
        authentication: 'operational',
        payroll: 'operational',
        ergani: 'operational',
        compliance: 'operational',
      },
    };

    res.json(healthData);
  } catch (error) {
    res.status(503).json({
      status: 'unhealthy',
      timestamp: new Date().toISOString(),
      error: 'Database connectivity issue',
      services: {
        authentication: 'operational',
        payroll: 'degraded',
        ergani: 'degraded',
        compliance: 'degraded',
      },
    });
  }
});

// Performance metrics endpoint
router.get('/metrics', async (req, res) => {
  try {
    const metrics = {
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      memory: process.memoryUsage(),
      cpu: process.cpuUsage(),
      platform: process.platform,
      nodeVersion: process.version,
      pid: process.pid,
      activeHandles: (process as any)._getActiveHandles?.()?.length || 0,
      activeRequests: (process as any)._getActiveRequests?.()?.length || 0,
    };

    res.json(metrics);
  } catch (error) {
    console.error('Error fetching metrics:', error);
    res.status(500).json({ error: 'Failed to fetch metrics' });
  }
});

export default router;
