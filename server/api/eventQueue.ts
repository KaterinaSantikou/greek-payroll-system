import { Router } from 'express';
import { isAuthenticated } from '../replitAuth';
import { z } from 'zod';
import { eventQueueService } from '../services/EventQueueService';
import { runEventedPlatformShipTest } from '../tests/eventedPlatform.shiptest';

const router = Router();

// Event enqueue schema
const EnqueueEventSchema = z.object({
  eventType: z.string().min(1),
  payload: z.record(z.any()),
  idempotencyKey: z.string().optional(),
  priority: z.number().int().min(-100).max(100).default(0),
  scheduledFor: z.string().datetime().optional(),
  metadata: z.record(z.any()).optional(),
  sourceSystem: z.string().default('payroll'),
  correlationId: z.string().optional(),
  maxAttempts: z.number().int().min(1).max(10).default(5),
});

// Event retry schema
const RetryEventSchema = z.object({
  eventId: z.string().min(1),
});

/**
 * GET /api/events/queue - Get current queue status
 */
router.get('/api/events/queue', isAuthenticated, async (req, res) => {
  try {
    const status = eventQueueService.getQueueStatus();

    res.json({
      data: status,
      meta: {
        timestamp: new Date().toISOString(),
        performance: {
          avgProcessingTime: status.metrics.averageProcessingTime,
          successRate: status.metrics.successRate,
          throughput: status.metrics.eventsProcessed,
        },
      },
    });
  } catch (error) {
    console.error('Error fetching queue status:', error);
    res.status(500).json({ error: 'Failed to fetch queue status' });
  }
});

/**
 * GET /api/events/queue/:status - Get events by status
 */
router.get('/api/events/queue/:status', isAuthenticated, async (req, res) => {
  try {
    const { status } = req.params;
    const validStatuses = [
      'pending',
      'processing',
      'completed',
      'failed',
      'dead_letter',
    ];

    if (!validStatuses.includes(status)) {
      return res.status(400).json({
        error: 'Invalid status',
        validStatuses,
      });
    }

    const events = eventQueueService.getEventsByStatus(status as any);
    const { limit = '50', offset = '0' } = req.query;

    const startIndex = parseInt(offset as string);
    const limitNum = parseInt(limit as string);
    const paginatedEvents = events.slice(startIndex, startIndex + limitNum);

    res.json({
      data: paginatedEvents,
      meta: {
        total: events.length,
        limit: limitNum,
        offset: startIndex,
        hasMore: startIndex + limitNum < events.length,
      },
    });
  } catch (error) {
    console.error('Error fetching events by status:', error);
    res.status(500).json({ error: 'Failed to fetch events' });
  }
});

/**
 * GET /api/events/:eventId - Get specific event
 */
router.get('/api/events/:eventId', isAuthenticated, async (req, res) => {
  try {
    const { eventId } = req.params;
    const event = eventQueueService.getEvent(eventId);

    if (!event) {
      return res.status(404).json({ error: 'Event not found' });
    }

    res.json({
      data: event,
      meta: {
        processingDuration: event.processingDurationMs
          ? `${event.processingDurationMs}ms`
          : null,
        attemptsRemaining: event.maxAttempts - event.attemptCount,
        nextRetryAt: event.nextAttemptAt?.toISOString(),
      },
    });
  } catch (error) {
    console.error('Error fetching event:', error);
    res.status(500).json({ error: 'Failed to fetch event' });
  }
});

/**
 * POST /api/events/enqueue - Enqueue a new event
 */
router.post('/api/events/enqueue', isAuthenticated, async (req, res) => {
  try {
    const eventData = EnqueueEventSchema.parse(req.body);

    const event = await eventQueueService.enqueueEvent(
      eventData.eventType,
      eventData.payload,
      {
        idempotencyKey: eventData.idempotencyKey,
        priority: eventData.priority,
        scheduledFor: eventData.scheduledFor
          ? new Date(eventData.scheduledFor)
          : undefined,
        metadata: eventData.metadata,
        sourceSystem: eventData.sourceSystem,
        correlationId: eventData.correlationId,
        maxAttempts: eventData.maxAttempts,
      }
    );

    res.status(201).json({
      data: event,
      meta: {
        enqueued: true,
        estimatedProcessingTime: '< 30s',
        position: 'Processing will begin immediately',
      },
    });
  } catch (error) {
    console.error('Error enqueueing event:', error);
    if (error instanceof z.ZodError) {
      return res.status(400).json({
        error: 'Invalid event data',
        details: error.errors,
      });
    }
    res.status(500).json({ error: 'Failed to enqueue event' });
  }
});

/**
 * POST /api/events/payroll/finalized - Trigger payroll.run.finalized event
 * This is the main integration point for the evented platform
 */
router.post(
  '/api/events/payroll/finalized',
  isAuthenticated,
  async (req, res) => {
    try {
      const PayrollFinalizedSchema = z.object({
        payrollRunId: z.string().min(1),
        period: z.string().regex(/^\d{4}-\d{2}$/), // YYYY-MM format
        finalizedBy: z.string().min(1),
        totalGrossPay: z.number().positive(),
        employeeCount: z.number().int().positive(),
        autoPostGL: z.boolean().default(true),
        metadata: z.record(z.any()).optional(),
      });

      const payrollData = PayrollFinalizedSchema.parse(req.body);

      // Generate idempotency key for this payroll run
      const idempotencyKey = `payroll.finalized-${payrollData.payrollRunId}-${payrollData.period}`;

      const event = await eventQueueService.enqueueEvent(
        'payroll.run.finalized',
        {
          payrollRunId: payrollData.payrollRunId,
          period: payrollData.period,
          finalizedBy: payrollData.finalizedBy,
          totalGrossPay: payrollData.totalGrossPay,
          employeeCount: payrollData.employeeCount,
          autoPostGL: payrollData.autoPostGL,
        },
        {
          idempotencyKey,
          priority: 10, // High priority for payroll events
          metadata: {
            ...payrollData.metadata,
            source: 'payroll_api',
            targetProcessingTime: 30000, // 30 seconds
          },
          sourceSystem: 'payroll',
          correlationId: payrollData.payrollRunId,
        }
      );

      res.status(201).json({
        data: {
          eventId: event.eventId,
          payrollRunId: payrollData.payrollRunId,
          period: payrollData.period,
          status: event.status,
          estimatedGLPostingTime: '< 30 seconds',
        },
        meta: {
          idempotencyKey,
          autoGLPosting: payrollData.autoPostGL,
          webhookDelivery: 'automatic',
          message:
            'Payroll finalization event enqueued - GL posting will begin immediately',
        },
      });
    } catch (error) {
      console.error('Error processing payroll finalization:', error);
      if (error instanceof z.ZodError) {
        return res.status(400).json({
          error: 'Invalid payroll data',
          details: error.errors,
        });
      }
      res.status(500).json({ error: 'Failed to process payroll finalization' });
    }
  }
);

/**
 * POST /api/events/:eventId/retry - Retry a failed event
 */
router.post('/api/events/:eventId/retry', isAuthenticated, async (req, res) => {
  try {
    const { eventId } = req.params;
    const retrySuccess = await eventQueueService.retryEvent(eventId);

    if (!retrySuccess) {
      return res.status(400).json({
        error: 'Event cannot be retried',
        reason:
          'Event not found or not in a retryable state (failed/dead_letter)',
      });
    }

    const event = eventQueueService.getEvent(eventId);

    res.json({
      data: {
        eventId,
        status: event?.status,
        retryInitiated: true,
      },
      meta: {
        message: 'Event retry initiated successfully',
        estimatedProcessingTime: '< 30s',
      },
    });
  } catch (error) {
    console.error('Error retrying event:', error);
    res.status(500).json({ error: 'Failed to retry event' });
  }
});

/**
 * GET /api/events/metrics - Get detailed performance metrics
 */
router.get('/api/events/metrics', isAuthenticated, async (req, res) => {
  try {
    const status = eventQueueService.getQueueStatus();
    const { since } = req.query;

    // Calculate performance metrics
    const performanceMetrics = {
      processingTime: {
        average: status.metrics.averageProcessingTime,
        target: 30000, // 30 seconds
        compliance: status.metrics.averageProcessingTime <= 30000,
      },
      throughput: {
        eventsProcessed: status.metrics.eventsProcessed,
        successRate: status.metrics.successRate,
        failureRate: 100 - status.metrics.successRate,
      },
      queue: {
        currentLoad: status.pendingEvents + status.processingEvents,
        backlog: status.pendingEvents,
        processing: status.processingEvents,
      },
      reliability: {
        successfulEvents: status.completedEvents,
        failedEvents: status.failedEvents,
        deadLetterEvents: status.deadLetterEvents,
      },
    };

    res.json({
      data: performanceMetrics,
      meta: {
        timestamp: new Date().toISOString(),
        targetCompliance: performanceMetrics.processingTime.compliance,
        healthStatus: status.metrics.successRate > 95 ? 'healthy' : 'degraded',
        since: since || 'system_start',
      },
    });
  } catch (error) {
    console.error('Error fetching metrics:', error);
    res.status(500).json({ error: 'Failed to fetch metrics' });
  }
});

/**
 * GET /api/events/health - Health check endpoint (public)
 */
router.get('/api/events/health', async (req, res) => {
  try {
    const status = eventQueueService.getQueueStatus();

    const health = {
      status: 'healthy',
      checks: {
        queueService: 'operational',
        processingTime:
          status.metrics.averageProcessingTime <= 30000
            ? 'optimal'
            : 'degraded',
        successRate: status.metrics.successRate > 95 ? 'excellent' : 'degraded',
        backlog: status.pendingEvents < 100 ? 'normal' : 'elevated',
      },
      metrics: {
        uptime: 'continuous',
        averageProcessingTime: `${status.metrics.averageProcessingTime}ms`,
        successRate: `${status.metrics.successRate.toFixed(1)}%`,
        queueSize: status.totalEvents,
      },
    };

    // Determine overall health
    const degradedChecks = Object.values(health.checks).filter(
      check => check === 'degraded'
    ).length;
    if (degradedChecks > 0) {
      health.status = 'degraded';
    }

    res.json({
      data: health,
      meta: {
        timestamp: new Date().toISOString(),
        version: '1.0.0',
        service: 'EventQueue',
      },
    });
  } catch (error) {
    console.error('Error checking health:', error);
    res.status(500).json({
      data: {
        status: 'unhealthy',
        error: 'Service check failed',
      },
    });
  }
});

/**
 * POST /api/events/ship-test - Run comprehensive ship test
 */
router.post('/api/events/ship-test', isAuthenticated, async (req, res) => {
  try {
    console.log('🚀 Starting Evented Platform Ship Test via API');

    const results = await runEventedPlatformShipTest();

    const responseStatus = results.passed ? 200 : 422; // 422 for failed validation

    res.status(responseStatus).json({
      data: {
        testsPassed: results.passed,
        summary: results.summary,
        totalTests: results.totalTests,
        passedTests: results.passedTests,
        failedTests: results.failedTests,
        readyForProduction: results.passed,
      },
      details: results.results,
      meta: {
        timestamp: new Date().toISOString(),
        testSuite: 'EventedPlatformShipTest',
        version: '1.0.0',
        definitionOfDone: {
          performanceTarget: '<30s GL posting',
          idempotency: 'replay-safe event processing',
          integration: 'zero CSV dependencies',
          monitoring: 'comprehensive metrics available',
        },
      },
    });
  } catch (error) {
    console.error('Error running ship test:', error);
    res.status(500).json({
      error: 'Ship test execution failed',
      details: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

export default router;
