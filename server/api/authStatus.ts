/**
 * Auth Status API - Observability endpoint for authentication system health
 */

import { Router } from 'express';
import { db } from '../db';
import { sessions } from '@shared/schema';
import { sql } from 'drizzle-orm';

const router = Router();

/**
 * GET /api/auth/health
 * Authentication system health and metrics
 */
router.get('/health', async (req, res) => {
  try {
    const startTime = Date.now();
    
    // Test database connectivity
    let dbStatus = 'unknown';
    let activeSessionsCount = 0;
    
    try {
      // Simple DB health check
      await db.execute(sql`SELECT 1`);
      
      // Count active sessions (optional - graceful degradation)
      try {
        const result = await db
          .select({ count: sql`COUNT(*)` })
          .from(sessions)
          .where(sql`expire > NOW()`);
        activeSessionsCount = Number(result[0]?.count || 0);
        dbStatus = 'healthy';
      } catch (sessionError) {
        // Sessions table might not exist yet - that's ok
        dbStatus = 'healthy_degraded';
      }
    } catch (dbError) {
      dbStatus = 'error';
    }
    
    const responseTime = Date.now() - startTime;
    
    const status = {
      status: 'ok',
      timestamp: new Date().toISOString(),
      auth_system: {
        database: dbStatus,
        active_sessions: dbStatus === 'error' ? null : activeSessionsCount,
        response_time_ms: responseTime
      },
      environment: {
        node_env: process.env.NODE_ENV || 'development',
        repl_id: process.env.REPL_ID ? 'configured' : 'missing',
        replit_domains: process.env.REPLIT_DOMAINS ? 'configured' : 'missing'
      },
      endpoints: {
        login: '/api/login',
        logout: '/api/logout', 
        user: '/api/auth/user',
        oauth_callback: '/oauth2callback'
      },
      rate_limiting: {
        auth_endpoints: '5 requests per minute per IP',
        global: 'none'
      }
    };
    
    // Set appropriate status code based on health
    const httpStatus = dbStatus === 'error' ? 503 : 200;
    
    res.status(httpStatus).json(status);
    
  } catch (error) {
    console.error('[AUTH_STATUS] Error generating status:', error);
    res.status(500).json({
      status: 'error',
      timestamp: new Date().toISOString(),
      error: 'Failed to generate auth status',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * GET /api/auth/metrics
 * Authentication metrics for monitoring (basic implementation)
 */
router.get('/metrics', async (req, res) => {
  try {
    const metrics = {
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      memory_usage: process.memoryUsage(),
      auth_events: {
        // These would be populated from actual metrics collection
        login_attempts_24h: 0,
        successful_logins_24h: 0,
        failed_logins_24h: 0,
        active_sessions: 0
      },
      rate_limit_events: {
        blocked_requests_1h: 0,
        peak_requests_per_minute: 0
      }
    };
    
    res.json(metrics);
  } catch (error) {
    console.error('[AUTH_METRICS] Error generating metrics:', error);
    res.status(500).json({
      error: 'Failed to generate auth metrics',
      timestamp: new Date().toISOString()
    });
  }
});

export default router;