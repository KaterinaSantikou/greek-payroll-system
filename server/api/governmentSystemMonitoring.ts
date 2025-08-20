/**
 * Government System Monitoring API
 * Provides endpoints for monitoring Greek government systems and managing alerts
 */

import { Router } from 'express';
import { isAuthenticated } from '../replitAuth';
import { GovernmentSystemMonitoringService } from '../services/GovernmentSystemMonitoringService';
import { 
  insertGovernmentSystemSchema, 
  insertSystemAlertSubscriptionSchema,
  insertSystemOutageSchema 
} from '@shared/schema';
import { fromZodError } from 'zod-validation-error';
import { db } from '../db';
import { 
  governmentSystems, 
  systemStatusChecks, 
  systemOutages, 
  systemAlertSubscriptions,
  systemAvailabilityMetrics,
  systemIntegrations 
} from '@shared/schema';
import { eq, desc, and, gte, lte, sql, count } from 'drizzle-orm';

const router = Router();

// All government monitoring routes require authentication
router.use(isAuthenticated);

const monitoringService = GovernmentSystemMonitoringService.getInstance();

// ========================================
// SYSTEM STATUS AND DASHBOARD
// ========================================

/**
 * Get comprehensive system status dashboard
 */
router.get('/dashboard', async (req, res) => {
  try {
    const dashboard = await monitoringService.getSystemStatusDashboard();
    res.json(dashboard);
  } catch (error) {
    console.error('Error getting system status dashboard:', error);
    res.status(500).json({ 
      error: 'Failed to get system status dashboard',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * Get current status for all government systems
 */
router.get('/systems/status', async (req, res) => {
  try {
    const systems = await db
      .select({
        id: governmentSystems.id,
        systemCode: governmentSystems.systemCode,
        displayName: governmentSystems.displayName,
        systemType: governmentSystems.systemType,
        priority: governmentSystems.priority,
        isActive: governmentSystems.isActive,
      })
      .from(governmentSystems)
      .where(eq(governmentSystems.isActive, true));

    // Get latest status for each system
    const systemsWithStatus = await Promise.all(
      systems.map(async (system) => {
        const [latestCheck] = await db
          .select()
          .from(systemStatusChecks)
          .where(eq(systemStatusChecks.systemId, system.id))
          .orderBy(desc(systemStatusChecks.checkTime))
          .limit(1);

        return {
          ...system,
          currentStatus: latestCheck?.status || 'unknown',
          lastChecked: latestCheck?.checkTime,
          responseTime: latestCheck?.responseTime,
          isHealthy: latestCheck?.isSuccessful ?? false,
        };
      })
    );

    res.json(systemsWithStatus);
  } catch (error) {
    console.error('Error getting system status:', error);
    res.status(500).json({ 
      error: 'Failed to get system status',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * Get detailed status for a specific system
 */
router.get('/systems/:systemId/status', async (req, res) => {
  try {
    const { systemId } = req.params;
    
    const [system] = await db
      .select()
      .from(governmentSystems)
      .where(eq(governmentSystems.id, systemId))
      .limit(1);

    if (!system) {
      return res.status(404).json({ error: 'System not found' });
    }

    // Get recent status checks
    const recentChecks = await db
      .select()
      .from(systemStatusChecks)
      .where(eq(systemStatusChecks.systemId, systemId))
      .orderBy(desc(systemStatusChecks.checkTime))
      .limit(50);

    // Get active outages
    const activeOutages = await db
      .select()
      .from(systemOutages)
      .where(
        and(
          eq(systemOutages.systemId, systemId),
          eq(systemOutages.status, 'active')
        )
      );

    // Get availability metrics for last 30 days
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const metrics = await db
      .select()
      .from(systemAvailabilityMetrics)
      .where(
        and(
          eq(systemAvailabilityMetrics.systemId, systemId),
          gte(systemAvailabilityMetrics.metricDate, thirtyDaysAgo)
        )
      )
      .orderBy(desc(systemAvailabilityMetrics.metricDate));

    res.json({
      system,
      recentChecks,
      activeOutages,
      metrics,
      currentStatus: recentChecks[0]?.status || 'unknown',
      lastChecked: recentChecks[0]?.checkTime,
    });
  } catch (error) {
    console.error('Error getting system detailed status:', error);
    res.status(500).json({ 
      error: 'Failed to get system detailed status',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * Trigger manual health check for a system
 */
router.post('/systems/:systemId/check', async (req, res) => {
  try {
    const { systemId } = req.params;
    
    const healthCheck = await monitoringService.performHealthCheck(systemId);
    
    res.json({
      message: 'Health check completed',
      result: healthCheck,
    });
  } catch (error) {
    console.error('Error performing manual health check:', error);
    res.status(500).json({ 
      error: 'Failed to perform health check',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// ========================================
// OUTAGE MANAGEMENT
// ========================================

/**
 * List outages with filtering
 */
router.get('/outages', async (req, res) => {
  try {
    const {
      systemId,
      status,
      severity,
      dateFrom,
      dateTo,
      limit = '50',
      offset = '0'
    } = req.query;

    let query = db.select().from(systemOutages);

    const conditions = [];
    if (systemId) conditions.push(eq(systemOutages.systemId, systemId as string));
    if (status) conditions.push(eq(systemOutages.status, status as string));
    if (severity) conditions.push(eq(systemOutages.severity, severity as string));
    if (dateFrom) conditions.push(gte(systemOutages.startTime, new Date(dateFrom as string)));
    if (dateTo) conditions.push(lte(systemOutages.startTime, new Date(dateTo as string)));

    if (conditions.length > 0) {
      query = query.where(and(...conditions));
    }

    const outages = await query
      .orderBy(desc(systemOutages.startTime))
      .limit(parseInt(limit as string))
      .offset(parseInt(offset as string));

    // Get total count
    let countQuery = db.select({ count: count() }).from(systemOutages);
    if (conditions.length > 0) {
      countQuery = countQuery.where(and(...conditions));
    }
    const [{ count: total }] = await countQuery;

    res.json({
      outages,
      total,
      limit: parseInt(limit as string),
      offset: parseInt(offset as string),
    });
  } catch (error) {
    console.error('Error listing outages:', error);
    res.status(500).json({ 
      error: 'Failed to list outages',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * Get outage by ID
 */
router.get('/outages/:outageId', async (req, res) => {
  try {
    const [outage] = await db
      .select()
      .from(systemOutages)
      .where(eq(systemOutages.id, req.params.outageId))
      .limit(1);

    if (!outage) {
      return res.status(404).json({ error: 'Outage not found' });
    }

    // Get related system information
    const [system] = await db
      .select()
      .from(governmentSystems)
      .where(eq(governmentSystems.id, outage.systemId))
      .limit(1);

    res.json({
      ...outage,
      system,
    });
  } catch (error) {
    console.error('Error getting outage:', error);
    res.status(500).json({ 
      error: 'Failed to get outage',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * Create manual outage report
 */
router.post('/outages', async (req, res) => {
  try {
    const validatedData = insertSystemOutageSchema.parse(req.body);
    const userId = req.user?.claims?.sub || 'unknown';

    const [outage] = await db
      .insert(systemOutages)
      .values({
        ...validatedData,
        reportedBy: userId,
        incidentId: `MAN-${Date.now()}-${validatedData.systemId.substring(0, 8)}`,
      })
      .returning();

    res.status(201).json(outage);
  } catch (error) {
    if (error instanceof Error && error.name === 'ZodError') {
      const validationError = fromZodError(error);
      return res.status(400).json({ 
        error: 'Validation failed',
        details: validationError.message 
      });
    }
    console.error('Error creating outage:', error);
    res.status(500).json({ 
      error: 'Failed to create outage',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * Update outage status
 */
router.patch('/outages/:outageId', async (req, res) => {
  try {
    const { status, resolution, estimatedResolution } = req.body;
    const updateData: any = { updatedAt: new Date() };

    if (status) updateData.status = status;
    if (resolution) updateData.resolution = resolution;
    if (estimatedResolution) updateData.estimatedResolution = new Date(estimatedResolution);

    if (status === 'resolved') {
      updateData.endTime = new Date();
    }

    const [outage] = await db
      .update(systemOutages)
      .set(updateData)
      .where(eq(systemOutages.id, req.params.outageId))
      .returning();

    if (!outage) {
      return res.status(404).json({ error: 'Outage not found' });
    }

    res.json({
      message: 'Outage updated successfully',
      outage,
    });
  } catch (error) {
    console.error('Error updating outage:', error);
    res.status(500).json({ 
      error: 'Failed to update outage',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// ========================================
// ALERT SUBSCRIPTIONS
// ========================================

/**
 * Get user's alert subscriptions
 */
router.get('/subscriptions', async (req, res) => {
  try {
    const userId = req.user?.claims?.sub;
    
    const subscriptions = await db
      .select()
      .from(systemAlertSubscriptions)
      .where(eq(systemAlertSubscriptions.userId, userId))
      .orderBy(desc(systemAlertSubscriptions.createdAt));

    res.json(subscriptions);
  } catch (error) {
    console.error('Error getting alert subscriptions:', error);
    res.status(500).json({ 
      error: 'Failed to get alert subscriptions',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * Create alert subscription
 */
router.post('/subscriptions', async (req, res) => {
  try {
    const validatedData = insertSystemAlertSubscriptionSchema.parse(req.body);
    const userId = req.user?.claims?.sub || 'unknown';

    const [subscription] = await db
      .insert(systemAlertSubscriptions)
      .values({
        ...validatedData,
        userId,
      })
      .returning();

    res.status(201).json(subscription);
  } catch (error) {
    if (error instanceof Error && error.name === 'ZodError') {
      const validationError = fromZodError(error);
      return res.status(400).json({ 
        error: 'Validation failed',
        details: validationError.message 
      });
    }
    console.error('Error creating alert subscription:', error);
    res.status(500).json({ 
      error: 'Failed to create alert subscription',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * Update alert subscription
 */
router.patch('/subscriptions/:subscriptionId', async (req, res) => {
  try {
    const userId = req.user?.claims?.sub;
    
    const [subscription] = await db
      .update(systemAlertSubscriptions)
      .set({ ...req.body, updatedAt: new Date() })
      .where(
        and(
          eq(systemAlertSubscriptions.id, req.params.subscriptionId),
          eq(systemAlertSubscriptions.userId, userId)
        )
      )
      .returning();

    if (!subscription) {
      return res.status(404).json({ error: 'Subscription not found or not authorized' });
    }

    res.json({
      message: 'Subscription updated successfully',
      subscription,
    });
  } catch (error) {
    console.error('Error updating alert subscription:', error);
    res.status(500).json({ 
      error: 'Failed to update alert subscription',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * Delete alert subscription
 */
router.delete('/subscriptions/:subscriptionId', async (req, res) => {
  try {
    const userId = req.user?.claims?.sub;
    
    const [subscription] = await db
      .delete(systemAlertSubscriptions)
      .where(
        and(
          eq(systemAlertSubscriptions.id, req.params.subscriptionId),
          eq(systemAlertSubscriptions.userId, userId)
        )
      )
      .returning();

    if (!subscription) {
      return res.status(404).json({ error: 'Subscription not found or not authorized' });
    }

    res.json({ message: 'Subscription deleted successfully' });
  } catch (error) {
    console.error('Error deleting alert subscription:', error);
    res.status(500).json({ 
      error: 'Failed to delete alert subscription',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// ========================================
// ANALYTICS AND REPORTING
// ========================================

/**
 * Get system availability metrics
 */
router.get('/metrics/availability', async (req, res) => {
  try {
    const {
      systemId,
      periodType = 'daily',
      dateFrom,
      dateTo,
      limit = '30'
    } = req.query;

    let query = db.select().from(systemAvailabilityMetrics);

    const conditions = [];
    if (systemId) conditions.push(eq(systemAvailabilityMetrics.systemId, systemId as string));
    if (periodType) conditions.push(eq(systemAvailabilityMetrics.periodType, periodType as string));
    if (dateFrom) conditions.push(gte(systemAvailabilityMetrics.metricDate, new Date(dateFrom as string)));
    if (dateTo) conditions.push(lte(systemAvailabilityMetrics.metricDate, new Date(dateTo as string)));

    if (conditions.length > 0) {
      query = query.where(and(...conditions));
    }

    const metrics = await query
      .orderBy(desc(systemAvailabilityMetrics.metricDate))
      .limit(parseInt(limit as string));

    res.json(metrics);
  } catch (error) {
    console.error('Error getting availability metrics:', error);
    res.status(500).json({ 
      error: 'Failed to get availability metrics',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * Get system uptime report
 */
router.get('/reports/uptime', async (req, res) => {
  try {
    const {
      dateFrom = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(),
      dateTo = new Date().toISOString()
    } = req.query;

    const systems = await db
      .select()
      .from(governmentSystems)
      .where(eq(governmentSystems.isActive, true));

    const uptimeReport = await Promise.all(
      systems.map(async (system) => {
        // Get metrics for the period
        const metrics = await db
          .select()
          .from(systemAvailabilityMetrics)
          .where(
            and(
              eq(systemAvailabilityMetrics.systemId, system.id),
              gte(systemAvailabilityMetrics.metricDate, new Date(dateFrom as string)),
              lte(systemAvailabilityMetrics.metricDate, new Date(dateTo as string))
            )
          );

        // Calculate average uptime
        const avgUptime = metrics.length > 0 
          ? metrics.reduce((sum, m) => sum + (m.uptime || 0), 0) / metrics.length
          : 0;

        // Get total outage time
        const totalOutageMinutes = metrics.reduce((sum, m) => sum + (m.totalOutageMinutes || 0), 0);

        // Get outage count
        const outageCount = metrics.reduce((sum, m) => sum + (m.outageCount || 0), 0);

        return {
          system: {
            id: system.id,
            code: system.systemCode,
            name: system.displayName,
            type: system.systemType,
            priority: system.priority,
          },
          uptime: Number(avgUptime.toFixed(2)),
          totalOutageMinutes,
          outageCount,
          slaStatus: avgUptime >= 99.9 ? 'met' : avgUptime >= 99.5 ? 'at_risk' : 'missed',
        };
      })
    );

    res.json({
      period: {
        from: dateFrom,
        to: dateTo,
      },
      systems: uptimeReport,
      overall: {
        avgUptime: uptimeReport.reduce((sum, s) => sum + s.uptime, 0) / uptimeReport.length,
        totalOutages: uptimeReport.reduce((sum, s) => sum + s.outageCount, 0),
        systemsMeetingSLA: uptimeReport.filter(s => s.slaStatus === 'met').length,
      },
    });
  } catch (error) {
    console.error('Error generating uptime report:', error);
    res.status(500).json({ 
      error: 'Failed to generate uptime report',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// ========================================
// SYSTEM ADMINISTRATION
// ========================================

/**
 * List all government systems
 */
router.get('/systems', async (req, res) => {
  try {
    const systems = await db
      .select()
      .from(governmentSystems)
      .orderBy(governmentSystems.systemCode);

    res.json(systems);
  } catch (error) {
    console.error('Error listing government systems:', error);
    res.status(500).json({ 
      error: 'Failed to list government systems',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * Create new government system
 */
router.post('/systems', async (req, res) => {
  try {
    const validatedData = insertGovernmentSystemSchema.parse(req.body);
    
    const [system] = await db
      .insert(governmentSystems)
      .values(validatedData)
      .returning();

    res.status(201).json(system);
  } catch (error) {
    if (error instanceof Error && error.name === 'ZodError') {
      const validationError = fromZodError(error);
      return res.status(400).json({ 
        error: 'Validation failed',
        details: validationError.message 
      });
    }
    console.error('Error creating government system:', error);
    res.status(500).json({ 
      error: 'Failed to create government system',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * Update government system
 */
router.patch('/systems/:systemId', async (req, res) => {
  try {
    const [system] = await db
      .update(governmentSystems)
      .set({ ...req.body, updatedAt: new Date() })
      .where(eq(governmentSystems.id, req.params.systemId))
      .returning();

    if (!system) {
      return res.status(404).json({ error: 'System not found' });
    }

    res.json({
      message: 'System updated successfully',
      system,
    });
  } catch (error) {
    console.error('Error updating government system:', error);
    res.status(500).json({ 
      error: 'Failed to update government system',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * Get monitoring health
 */
router.get('/health', async (req, res) => {
  try {
    const last5Minutes = new Date(Date.now() - 5 * 60 * 1000);
    
    const recentChecks = await db
      .select({ count: count() })
      .from(systemStatusChecks)
      .where(gte(systemStatusChecks.checkTime, last5Minutes));

    const activeOutages = await db
      .select({ count: count() })
      .from(systemOutages)
      .where(eq(systemOutages.status, 'active'));

    const activeSystems = await db
      .select({ count: count() })
      .from(governmentSystems)
      .where(eq(governmentSystems.isActive, true));

    const health = {
      status: 'healthy',
      recentChecks: recentChecks[0]?.count || 0,
      activeOutages: activeOutages[0]?.count || 0,
      activeSystems: activeSystems[0]?.count || 0,
      monitoringActive: recentChecks[0]?.count > 0,
      timestamp: new Date(),
    };

    if (health.activeOutages > 0) health.status = 'degraded';
    if (!health.monitoringActive) health.status = 'warning';

    res.json(health);
  } catch (error) {
    console.error('Error checking monitoring health:', error);
    res.status(500).json({ 
      status: 'error',
      error: 'Failed to check monitoring health',
      details: error instanceof Error ? error.message : 'Unknown error',
      timestamp: new Date(),
    });
  }
});

export default router;