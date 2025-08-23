/**
 * Central Log Management API
 * Provides endpoints for log search, analysis, monitoring, and management
 */

import { Router } from 'express';
import { isAuthenticated } from '../replitAuth';
import { CentralLogAggregationService, type LogSearchQuery, type AggregationOptions } from '../services/CentralLogAggregationService';
import { insertLogSubscriptionSchema, insertLogRetentionPolicySchema } from '@shared/schema';
import { fromZodError } from 'zod-validation-error';
import { z } from 'zod';

const router = Router();

// All log routes require authentication
router.use(isAuthenticated);

// Feature gate: only initialize log service if enabled
let logService: any = null;
if (process.env.ENABLE_LOGGING !== 'false') {
  try {
    logService = CentralLogAggregationService.getInstance();
  } catch (error) {
    console.error('❌ Failed to initialize CentralLogAggregationService:', error.message);
  }
}

// ========================================
// LOG SEARCH AND RETRIEVAL
// ========================================

/**
 * Search logs with advanced filtering and pagination
 */
router.get('/search', async (req, res) => {
  // Feature gate check
  if (!logService) {
    return res.status(503).json({ 
      error: 'Central logging service is not available',
      reason: 'Service disabled or schema missing'
    });
  }
  
  try {
    const query: LogSearchQuery = {
      levels: req.query.levels ? (req.query.levels as string).split(',') : undefined,
      services: req.query.services ? (req.query.services as string).split(',') : undefined,
      categories: req.query.categories ? (req.query.categories as string).split(',') : undefined,
      dateFrom: req.query.dateFrom ? new Date(req.query.dateFrom as string) : undefined,
      dateTo: req.query.dateTo ? new Date(req.query.dateTo as string) : undefined,
      message: req.query.message as string,
      userId: req.query.userId as string,
      sessionId: req.query.sessionId as string,
      requestId: req.query.requestId as string,
      tags: req.query.tags ? (req.query.tags as string).split(',') : undefined,
      severity: {
        min: req.query.severityMin ? parseInt(req.query.severityMin as string) : undefined,
        max: req.query.severityMax ? parseInt(req.query.severityMax as string) : undefined,
      },
      limit: req.query.limit ? parseInt(req.query.limit as string) : 50,
      offset: req.query.offset ? parseInt(req.query.offset as string) : 0,
      sortBy: (req.query.sortBy as 'timestamp' | 'severity' | 'service') || 'timestamp',
      sortOrder: (req.query.sortOrder as 'asc' | 'desc') || 'desc',
    };

    const result = await logService.searchLogs(query);
    res.json(result);
  } catch (error) {
    console.error('Error searching logs:', error);
    res.status(500).json({ 
      error: 'Failed to search logs',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * Get log entry by ID
 */
router.get('/entries/:logId', async (req, res) => {
  try {
    const result = await logService.searchLogs({
      limit: 1,
      offset: 0,
    });
    
    const entry = result.entries.find(e => e.id === req.params.logId);
    if (!entry) {
      return res.status(404).json({ error: 'Log entry not found' });
    }
    
    res.json(entry);
  } catch (error) {
    console.error('Error getting log entry:', error);
    res.status(500).json({ 
      error: 'Failed to get log entry',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * Create manual log entry
 */
router.post('/entries', async (req, res) => {
  try {
    const { level, message, service, component, category, metadata } = req.body;
    const userId = req.user?.claims?.sub;

    const entry = await logService.log(level, message, {
      service,
      component,
      category,
      userId,
      metadata,
      tags: ['manual_entry'],
    });

    res.status(201).json(entry);
  } catch (error) {
    console.error('Error creating log entry:', error);
    res.status(500).json({ 
      error: 'Failed to create log entry',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// ========================================
// LOG METRICS AND ANALYTICS
// ========================================

/**
 * Generate aggregated log metrics
 */
router.get('/metrics', async (req, res) => {
  try {
    const dateFrom = req.query.dateFrom ? new Date(req.query.dateFrom as string) : new Date(Date.now() - 24 * 60 * 60 * 1000);
    const dateTo = req.query.dateTo ? new Date(req.query.dateTo as string) : new Date();
    
    const options: AggregationOptions = {
      timeWindow: (req.query.timeWindow as 'hour' | 'day' | 'week' | 'month') || 'hour',
      groupBy: req.query.groupBy ? (req.query.groupBy as string).split(',') as ('service' | 'level' | 'category' | 'user')[] : ['service'],
      metrics: req.query.metrics ? (req.query.metrics as string).split(',') as ('count' | 'errors' | 'performance' | 'users')[] : ['count', 'errors'],
    };

    const metrics = await logService.generateMetrics(dateFrom, dateTo, options);
    res.json({
      period: { from: dateFrom, to: dateTo },
      options,
      metrics,
    });
  } catch (error) {
    console.error('Error generating log metrics:', error);
    res.status(500).json({ 
      error: 'Failed to generate log metrics',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * Get service overview dashboard
 */
router.get('/dashboard', async (req, res) => {
  try {
    const last24Hours = new Date(Date.now() - 24 * 60 * 60 * 1000);
    const lastHour = new Date(Date.now() - 60 * 60 * 1000);

    // Get recent logs by service and level
    const recentLogs = await logService.searchLogs({
      dateFrom: last24Hours,
      limit: 0, // Just get count
    });

    // Get error trends
    const errorTrends = await logService.generateMetrics(last24Hours, new Date(), {
      timeWindow: 'hour',
      groupBy: ['service', 'level'],
      metrics: ['count', 'errors'],
    });

    // Get active services
    const activeServices = await logService.searchLogs({
      dateFrom: lastHour,
      limit: 0,
    });

    // Detect anomalies
    const anomalies = await logService.detectAnomalies();

    res.json({
      summary: {
        totalLogs24h: recentLogs.total,
        activeServices: new Set(recentLogs.entries.map(e => e.service)).size,
        errors24h: recentLogs.entries.filter(e => ['error', 'fatal'].includes(e.level)).length,
        warnings24h: recentLogs.entries.filter(e => e.level === 'warn').length,
      },
      errorTrends,
      anomalies,
      topServices: errorTrends
        .reduce((acc, metric) => {
          const existing = acc.find(s => s.service === metric.service);
          if (existing) {
            existing.logCount += metric.entryCount;
            existing.errorCount += metric.errorCount;
          } else {
            acc.push({
              service: metric.service,
              logCount: metric.entryCount,
              errorCount: metric.errorCount,
            });
          }
          return acc;
        }, [] as any[])
        .sort((a, b) => b.logCount - a.logCount)
        .slice(0, 10),
    });
  } catch (error) {
    console.error('Error generating dashboard:', error);
    res.status(500).json({ 
      error: 'Failed to generate dashboard',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * Detect anomalies in log patterns
 */
router.get('/anomalies', async (req, res) => {
  try {
    const service = req.query.service as string;
    const anomalies = await logService.detectAnomalies(service);
    res.json(anomalies);
  } catch (error) {
    console.error('Error detecting anomalies:', error);
    res.status(500).json({ 
      error: 'Failed to detect anomalies',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// ========================================
// REAL-TIME LOG STREAMING
// ========================================

/**
 * WebSocket endpoint for real-time log streaming
 */
router.get('/stream', async (req, res) => {
  // Set up Server-Sent Events
  res.writeHead(200, {
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache',
    'Connection': 'keep-alive',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Cache-Control',
  });

  const filters = {
    levels: req.query.levels ? (req.query.levels as string).split(',') : undefined,
    services: req.query.services ? (req.query.services as string).split(',') : undefined,
    categories: req.query.categories ? (req.query.categories as string).split(',') : undefined,
    userId: req.query.userId as string,
    severity: {
      min: req.query.severityMin ? parseInt(req.query.severityMin as string) : undefined,
      max: req.query.severityMax ? parseInt(req.query.severityMax as string) : undefined,
    },
  };

  const stream = logService.getLogStream(filters);

  // Send initial connection message
  res.write(`data: ${JSON.stringify({ type: 'connected', timestamp: new Date() })}\n\n`);

  // Handle new log entries
  stream.on('log', (entry) => {
    res.write(`data: ${JSON.stringify({ type: 'log', entry })}\n\n`);
  });

  // Cleanup on disconnect
  req.on('close', () => {
    stream.emit('close');
  });

  req.on('aborted', () => {
    stream.emit('close');
  });
});

// ========================================
// LOG SUBSCRIPTIONS AND ALERTS
// ========================================

/**
 * Create log subscription for alerts
 */
router.post('/subscriptions', async (req, res) => {
  try {
    const validatedData = insertLogSubscriptionSchema.parse(req.body);
    const subscription = await logService.createSubscription({
      ...validatedData,
      userId: req.user?.claims?.sub || 'unknown',
    });
    
    res.status(201).json(subscription);
  } catch (error) {
    if (error instanceof Error && error.name === 'ZodError') {
      const validationError = fromZodError(error);
      return res.status(400).json({ 
        error: 'Validation failed',
        details: validationError.message 
      });
    }
    console.error('Error creating subscription:', error);
    res.status(500).json({ 
      error: 'Failed to create subscription',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * List user's log subscriptions
 */
router.get('/subscriptions', async (req, res) => {
  try {
    const userId = req.user?.claims?.sub;
    const subscriptions = await logService.searchLogs({
      userId,
      limit: 100,
    });
    
    res.json(subscriptions);
  } catch (error) {
    console.error('Error listing subscriptions:', error);
    res.status(500).json({ 
      error: 'Failed to list subscriptions',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// ========================================
// LOG RETENTION MANAGEMENT
// ========================================

/**
 * Create log retention policy
 */
router.post('/retention-policies', async (req, res) => {
  try {
    const validatedData = insertLogRetentionPolicySchema.parse(req.body);
    const policy = await logService.createRetentionPolicy(validatedData);
    
    res.status(201).json(policy);
  } catch (error) {
    if (error instanceof Error && error.name === 'ZodError') {
      const validationError = fromZodError(error);
      return res.status(400).json({ 
        error: 'Validation failed',
        details: validationError.message 
      });
    }
    console.error('Error creating retention policy:', error);
    res.status(500).json({ 
      error: 'Failed to create retention policy',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * Clean up expired logs
 */
router.post('/cleanup', async (req, res) => {
  try {
    const result = await logService.cleanupExpiredLogs();
    res.json({
      message: 'Log cleanup completed',
      ...result,
    });
  } catch (error) {
    console.error('Error during log cleanup:', error);
    res.status(500).json({ 
      error: 'Failed to cleanup logs',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// ========================================
// SYSTEM ADMINISTRATION
// ========================================

/**
 * Get log system health
 */
router.get('/health', async (req, res) => {
  try {
    const last5Minutes = new Date(Date.now() - 5 * 60 * 1000);
    
    const recentLogs = await logService.searchLogs({
      dateFrom: last5Minutes,
      limit: 1000,
    });

    const health = {
      status: 'healthy',
      recentLogCount: recentLogs.total,
      activeServices: new Set(recentLogs.entries.map(e => e.service)).size,
      errorRate: recentLogs.entries.filter(e => ['error', 'fatal'].includes(e.level)).length / Math.max(recentLogs.total, 1),
      averageSeverity: recentLogs.entries.reduce((sum, e) => sum + e.severity, 0) / Math.max(recentLogs.entries.length, 1),
      timestamp: new Date(),
    };

    // Determine health status
    if (health.errorRate > 0.1) health.status = 'unhealthy';
    else if (health.errorRate > 0.05) health.status = 'degraded';

    res.json(health);
  } catch (error) {
    console.error('Error checking log system health:', error);
    res.status(500).json({ 
      status: 'error',
      error: 'Failed to check system health',
      details: error instanceof Error ? error.message : 'Unknown error',
      timestamp: new Date(),
    });
  }
});

/**
 * Get log statistics
 */
router.get('/stats', async (req, res) => {
  try {
    const last24Hours = new Date(Date.now() - 24 * 60 * 60 * 1000);
    const last7Days = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);

    const [daily, weekly] = await Promise.all([
      logService.searchLogs({ dateFrom: last24Hours, limit: 0 }),
      logService.searchLogs({ dateFrom: last7Days, limit: 0 }),
    ]);

    const stats = {
      daily: {
        total: daily.total,
        byLevel: daily.entries.reduce((acc, entry) => {
          acc[entry.level] = (acc[entry.level] || 0) + 1;
          return acc;
        }, {} as Record<string, number>),
        byService: daily.entries.reduce((acc, entry) => {
          acc[entry.service] = (acc[entry.service] || 0) + 1;
          return acc;
        }, {} as Record<string, number>),
      },
      weekly: {
        total: weekly.total,
        averageDaily: Math.round(weekly.total / 7),
        growthRate: daily.total > 0 ? ((daily.total - (weekly.total / 7)) / (weekly.total / 7)) * 100 : 0,
      },
      timestamp: new Date(),
    };

    res.json(stats);
  } catch (error) {
    console.error('Error generating log statistics:', error);
    res.status(500).json({ 
      error: 'Failed to generate statistics',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

export default router;