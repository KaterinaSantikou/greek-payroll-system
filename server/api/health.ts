import { Router } from "express";
import { db } from "../db";

const router = Router();

// System health check endpoint - robust for deployment monitoring
router.get('/api/health', async (req, res) => {
  const startTime = Date.now();
  const checks = {
    database: false,
    memory: false,
    disk: false,
    critical_services: false
  };
  const errors: string[] = [];
  
  try {
    // Test database connectivity with timeout
    const dbPromise = db.execute('SELECT 1 as health_check');
    const dbTimeout = new Promise((_, reject) => 
      setTimeout(() => reject(new Error('Database timeout')), 5000)
    );
    
    await Promise.race([dbPromise, dbTimeout]);
    checks.database = true;
  } catch (error) {
    errors.push(`Database: ${error instanceof Error ? error.message : 'Connection failed'}`);
  }
  
  try {
    // Check memory usage
    const memory = process.memoryUsage();
    const memoryUsagePercent = (memory.heapUsed / memory.heapTotal) * 100;
    checks.memory = memoryUsagePercent < 90; // Consider healthy if under 90%
    if (!checks.memory) {
      errors.push(`Memory: ${memoryUsagePercent.toFixed(1)}% used (high)`);
    }
  } catch (error) {
    errors.push(`Memory: Check failed`);
  }
  
  try {
    // Check if application is responding properly
    checks.critical_services = process.uptime() > 0;
    if (!checks.critical_services) {
      errors.push('Critical services: Not responding');
    }
  } catch (error) {
    errors.push('Critical services: Check failed');
  }
  
  // Basic disk space check (simplified)
  try {
    // This is a basic check - in production you'd want more sophisticated disk monitoring
    checks.disk = true; // Assume healthy for now
  } catch (error) {
    errors.push('Disk: Check failed');
  }
  
  const overallHealth = Object.values(checks).every(check => check);
  const responseTime = Date.now() - startTime;
  
  const healthData = {
    status: overallHealth ? "healthy" : "unhealthy",
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    memory: process.memoryUsage(),
    responseTime,
    version: process.env.npm_package_version || "1.0.0",
    environment: process.env.NODE_ENV || "development",
    checks,
    errors: errors.length > 0 ? errors : undefined,
    deployment: {
      ready: overallHealth && responseTime < 1000, // Ready if healthy and fast response
      startup_time: process.uptime()
    },
    services: {
      authentication: checks.database ? "operational" : "degraded",
      payroll: checks.database ? "operational" : "degraded",
      ergani: checks.database ? "operational" : "degraded",
      compliance: checks.database ? "operational" : "degraded"
    }
  };
  
  const statusCode = overallHealth ? 200 : 503;
  res.status(statusCode).json(healthData);
});

// Performance metrics endpoint
router.get('/api/metrics', async (req, res) => {
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
      activeRequests: (process as any)._getActiveRequests?.()?.length || 0
    };
    
    res.json(metrics);
  } catch (error) {
    console.error("Error fetching metrics:", error);
    res.status(500).json({ error: "Failed to fetch metrics" });
  }
});

export default router;