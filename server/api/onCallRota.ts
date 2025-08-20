/**
 * On-Call Rota API
 * Provides endpoints for managing on-call schedules, incidents, and escalations
 */

import { Router } from 'express';
import { isAuthenticated } from '../replitAuth';
import { OnCallRotaService } from '../services/OnCallRotaService';
import { 
  insertOnCallTeamSchema, 
  insertOnCallScheduleSchema,
  insertOnCallIncidentSchema,
  insertOnCallAvailabilitySchema,
  insertEscalationPolicySchema
} from '@shared/schema';
import { fromZodError } from 'zod-validation-error';
import { db } from '../db';
import { 
  onCallTeams, 
  onCallTeamMembers,
  onCallSchedules,
  onCallAssignments,
  onCallIncidents,
  incidentResponses,
  escalationPolicies,
  onCallAvailability,
  onCallMetrics,
  users
} from '@shared/schema';
import { eq, desc, and, gte, lte, sql, count, avg, or } from 'drizzle-orm';

const router = Router();

// All on-call routes require authentication
router.use(isAuthenticated);

const onCallService = OnCallRotaService.getInstance();

// ========================================
// ON-CALL STATUS AND DASHBOARD
// ========================================

/**
 * Get current on-call status dashboard
 */
router.get('/dashboard', async (req, res) => {
  try {
    const currentStatus = await onCallService.getCurrentOnCallStatus();
    
    // Get recent incidents
    const recentIncidents = await db
      .select()
      .from(onCallIncidents)
      .orderBy(desc(onCallIncidents.triggeredAt))
      .limit(10);

    // Get active incidents
    const activeIncidents = await db
      .select()
      .from(onCallIncidents)
      .where(sql`${onCallIncidents.status} IN ('triggered', 'acknowledged', 'escalated')`)
      .orderBy(desc(onCallIncidents.triggeredAt));

    // Get today's metrics
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    const [todayStats] = await db
      .select({
        totalIncidents: count(),
        criticalIncidents: count(sql`CASE WHEN ${onCallIncidents.severity} = 'critical' THEN 1 END`),
        avgResponseTime: avg(onCallIncidents.totalResponseTime),
        resolvedToday: count(sql`CASE WHEN ${onCallIncidents.status} = 'resolved' THEN 1 END`),
      })
      .from(onCallIncidents)
      .where(
        and(
          gte(onCallIncidents.triggeredAt, today),
          lte(onCallIncidents.triggeredAt, tomorrow)
        )
      );

    res.json({
      currentStatus,
      recentIncidents,
      activeIncidents,
      todayStats,
    });
  } catch (error) {
    console.error('Error getting on-call dashboard:', error);
    res.status(500).json({ 
      error: 'Failed to get on-call dashboard',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * Get current on-call personnel
 */
router.get('/current', async (req, res) => {
  try {
    const currentStatus = await onCallService.getCurrentOnCallStatus();
    res.json(currentStatus);
  } catch (error) {
    console.error('Error getting current on-call status:', error);
    res.status(500).json({ 
      error: 'Failed to get current on-call status',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * Get who's on-call for a specific team
 */
router.get('/teams/:teamId/current', async (req, res) => {
  try {
    const { teamId } = req.params;
    const now = new Date();

    const currentAssignment = await db
      .select({
        assignment: onCallAssignments,
        user: {
          id: users.id,
          email: users.email,
          firstName: users.firstName,
          lastName: users.lastName,
        },
        team: {
          id: onCallTeams.id,
          name: onCallTeams.name,
          notificationChannels: onCallTeams.notificationChannels,
        }
      })
      .from(onCallAssignments)
      .leftJoin(users, eq(onCallAssignments.userId, users.id))
      .leftJoin(onCallSchedules, eq(onCallAssignments.scheduleId, onCallSchedules.id))
      .leftJoin(onCallTeams, eq(onCallSchedules.teamId, onCallTeams.id))
      .where(
        and(
          eq(onCallTeams.id, teamId),
          eq(onCallAssignments.status, 'active'),
          lte(onCallAssignments.startTime, now),
          gte(onCallAssignments.endTime, now)
        )
      )
      .limit(1);

    if (currentAssignment.length === 0) {
      return res.status(404).json({ error: 'No current assignment for this team' });
    }

    res.json(currentAssignment[0]);
  } catch (error) {
    console.error('Error getting team current assignment:', error);
    res.status(500).json({ 
      error: 'Failed to get team current assignment',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// ========================================
// INCIDENT MANAGEMENT
// ========================================

/**
 * List incidents with filtering
 */
router.get('/incidents', async (req, res) => {
  try {
    const {
      status,
      severity,
      assignedTeamId,
      dateFrom,
      dateTo,
      limit = '50',
      offset = '0'
    } = req.query;

    let query = db
      .select({
        incident: onCallIncidents,
        team: {
          id: onCallTeams.id,
          name: onCallTeams.name,
        },
        assignee: {
          id: users.id,
          firstName: users.firstName,
          lastName: users.lastName,
        }
      })
      .from(onCallIncidents)
      .leftJoin(onCallTeams, eq(onCallIncidents.assignedTeamId, onCallTeams.id))
      .leftJoin(users, eq(onCallIncidents.currentAssigneeId, users.id));

    const conditions = [];
    if (status) conditions.push(eq(onCallIncidents.status, status as string));
    if (severity) conditions.push(eq(onCallIncidents.severity, severity as string));
    if (assignedTeamId) conditions.push(eq(onCallIncidents.assignedTeamId, assignedTeamId as string));
    if (dateFrom) conditions.push(gte(onCallIncidents.triggeredAt, new Date(dateFrom as string)));
    if (dateTo) conditions.push(lte(onCallIncidents.triggeredAt, new Date(dateTo as string)));

    if (conditions.length > 0) {
      query = query.where(and(...conditions));
    }

    const incidents = await query
      .orderBy(desc(onCallIncidents.triggeredAt))
      .limit(parseInt(limit as string))
      .offset(parseInt(offset as string));

    // Get total count
    let countQuery = db.select({ count: count() }).from(onCallIncidents);
    if (conditions.length > 0) {
      countQuery = countQuery.where(and(...conditions));
    }
    const [{ count: total }] = await countQuery;

    res.json({
      incidents,
      total,
      limit: parseInt(limit as string),
      offset: parseInt(offset as string),
    });
  } catch (error) {
    console.error('Error listing incidents:', error);
    res.status(500).json({ 
      error: 'Failed to list incidents',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * Get incident by ID
 */
router.get('/incidents/:incidentId', async (req, res) => {
  try {
    const [incident] = await db
      .select({
        incident: onCallIncidents,
        team: onCallTeams,
        assignee: users,
      })
      .from(onCallIncidents)
      .leftJoin(onCallTeams, eq(onCallIncidents.assignedTeamId, onCallTeams.id))
      .leftJoin(users, eq(onCallIncidents.currentAssigneeId, users.id))
      .where(eq(onCallIncidents.id, req.params.incidentId))
      .limit(1);

    if (!incident) {
      return res.status(404).json({ error: 'Incident not found' });
    }

    // Get incident responses
    const responses = await db
      .select({
        response: incidentResponses,
        responder: {
          id: users.id,
          firstName: users.firstName,
          lastName: users.lastName,
          email: users.email,
        }
      })
      .from(incidentResponses)
      .leftJoin(users, eq(incidentResponses.responderId, users.id))
      .where(eq(incidentResponses.incidentId, req.params.incidentId))
      .orderBy(desc(incidentResponses.responseTime));

    res.json({
      ...incident,
      responses,
    });
  } catch (error) {
    console.error('Error getting incident:', error);
    res.status(500).json({ 
      error: 'Failed to get incident',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * Create new incident
 */
router.post('/incidents', async (req, res) => {
  try {
    const validatedData = insertOnCallIncidentSchema.parse(req.body);
    
    const incident = await onCallService.triggerIncident(validatedData);
    
    res.status(201).json(incident);
  } catch (error) {
    if (error instanceof Error && error.name === 'ZodError') {
      const validationError = fromZodError(error);
      return res.status(400).json({ 
        error: 'Validation failed',
        details: validationError.message 
      });
    }
    console.error('Error creating incident:', error);
    res.status(500).json({ 
      error: 'Failed to create incident',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * Acknowledge incident
 */
router.post('/incidents/:incidentId/acknowledge', async (req, res) => {
  try {
    const { incidentId } = req.params;
    const { message, responseMethod = 'web' } = req.body;
    const userId = req.user?.claims?.sub || 'unknown';

    await onCallService.acknowledgeIncident(incidentId, userId, message, responseMethod);
    
    res.json({ 
      message: 'Incident acknowledged successfully',
      acknowledgedBy: userId,
      acknowledgedAt: new Date(),
    });
  } catch (error) {
    console.error('Error acknowledging incident:', error);
    res.status(500).json({ 
      error: 'Failed to acknowledge incident',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * Escalate incident
 */
router.post('/incidents/:incidentId/escalate', async (req, res) => {
  try {
    const { incidentId } = req.params;
    const { reason } = req.body;

    const escalation = await onCallService.escalateIncident(incidentId, reason);
    
    res.json({
      message: 'Incident escalated successfully',
      escalation,
    });
  } catch (error) {
    console.error('Error escalating incident:', error);
    res.status(500).json({ 
      error: 'Failed to escalate incident',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * Resolve incident
 */
router.post('/incidents/:incidentId/resolve', async (req, res) => {
  try {
    const { incidentId } = req.params;
    const { resolution, falseAlarm = false } = req.body;
    const userId = req.user?.claims?.sub || 'unknown';

    await onCallService.resolveIncident(incidentId, userId, resolution, falseAlarm);
    
    res.json({ 
      message: 'Incident resolved successfully',
      resolvedBy: userId,
      resolvedAt: new Date(),
    });
  } catch (error) {
    console.error('Error resolving incident:', error);
    res.status(500).json({ 
      error: 'Failed to resolve incident',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// ========================================
// TEAM MANAGEMENT
// ========================================

/**
 * List on-call teams
 */
router.get('/teams', async (req, res) => {
  try {
    const teams = await db
      .select({
        team: onCallTeams,
        memberCount: count(onCallTeamMembers.id),
      })
      .from(onCallTeams)
      .leftJoin(onCallTeamMembers, eq(onCallTeams.id, onCallTeamMembers.teamId))
      .groupBy(onCallTeams.id)
      .orderBy(onCallTeams.name);

    res.json(teams);
  } catch (error) {
    console.error('Error listing teams:', error);
    res.status(500).json({ 
      error: 'Failed to list teams',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * Get team details
 */
router.get('/teams/:teamId', async (req, res) => {
  try {
    const [team] = await db
      .select()
      .from(onCallTeams)
      .where(eq(onCallTeams.id, req.params.teamId))
      .limit(1);

    if (!team) {
      return res.status(404).json({ error: 'Team not found' });
    }

    // Get team members
    const members = await db
      .select({
        member: onCallTeamMembers,
        user: {
          id: users.id,
          firstName: users.firstName,
          lastName: users.lastName,
          email: users.email,
        }
      })
      .from(onCallTeamMembers)
      .leftJoin(users, eq(onCallTeamMembers.userId, users.id))
      .where(eq(onCallTeamMembers.teamId, req.params.teamId))
      .orderBy(onCallTeamMembers.escalationLevel);

    // Get team schedules
    const schedules = await db
      .select()
      .from(onCallSchedules)
      .where(eq(onCallSchedules.teamId, req.params.teamId))
      .orderBy(desc(onCallSchedules.createdAt));

    res.json({
      ...team,
      members,
      schedules,
    });
  } catch (error) {
    console.error('Error getting team:', error);
    res.status(500).json({ 
      error: 'Failed to get team',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * Create new team
 */
router.post('/teams', async (req, res) => {
  try {
    const validatedData = insertOnCallTeamSchema.parse(req.body);
    const userId = req.user?.claims?.sub;

    const [team] = await db
      .insert(onCallTeams)
      .values({
        ...validatedData,
        teamLead: userId,
      })
      .returning();

    res.status(201).json(team);
  } catch (error) {
    if (error instanceof Error && error.name === 'ZodError') {
      const validationError = fromZodError(error);
      return res.status(400).json({ 
        error: 'Validation failed',
        details: validationError.message 
      });
    }
    console.error('Error creating team:', error);
    res.status(500).json({ 
      error: 'Failed to create team',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// ========================================
// SCHEDULE MANAGEMENT
// ========================================

/**
 * Get schedule for a team
 */
router.get('/teams/:teamId/schedules', async (req, res) => {
  try {
    const { teamId } = req.params;
    const { 
      startDate = new Date().toISOString(),
      endDate = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString() // 30 days
    } = req.query;

    const schedules = await db
      .select()
      .from(onCallSchedules)
      .where(
        and(
          eq(onCallSchedules.teamId, teamId),
          eq(onCallSchedules.isActive, true)
        )
      )
      .orderBy(desc(onCallSchedules.createdAt));

    // Get assignments for the time period
    const assignments = await db
      .select({
        assignment: onCallAssignments,
        user: {
          id: users.id,
          firstName: users.firstName,
          lastName: users.lastName,
          email: users.email,
        }
      })
      .from(onCallAssignments)
      .leftJoin(users, eq(onCallAssignments.userId, users.id))
      .leftJoin(onCallSchedules, eq(onCallAssignments.scheduleId, onCallSchedules.id))
      .where(
        and(
          eq(onCallSchedules.teamId, teamId),
          gte(onCallAssignments.endTime, new Date(startDate as string)),
          lte(onCallAssignments.startTime, new Date(endDate as string))
        )
      )
      .orderBy(onCallAssignments.startTime);

    res.json({
      schedules,
      assignments,
      period: {
        startDate,
        endDate,
      },
    });
  } catch (error) {
    console.error('Error getting team schedules:', error);
    res.status(500).json({ 
      error: 'Failed to get team schedules',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * Generate rotation schedule
 */
router.post('/schedules/:scheduleId/generate', async (req, res) => {
  try {
    const { scheduleId } = req.params;
    const {
      startDate = new Date().toISOString(),
      endDate = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString()
    } = req.body;

    const schedule = await onCallService.generateRotationSchedule(
      scheduleId,
      new Date(startDate),
      new Date(endDate)
    );

    res.json(schedule);
  } catch (error) {
    console.error('Error generating rotation schedule:', error);
    res.status(500).json({ 
      error: 'Failed to generate rotation schedule',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// ========================================
// ESCALATION POLICIES
// ========================================

/**
 * List escalation policies
 */
router.get('/escalation-policies', async (req, res) => {
  try {
    const { teamId } = req.query;

    let query = db
      .select({
        policy: escalationPolicies,
        team: {
          id: onCallTeams.id,
          name: onCallTeams.name,
        }
      })
      .from(escalationPolicies)
      .leftJoin(onCallTeams, eq(escalationPolicies.teamId, onCallTeams.id));

    if (teamId) {
      query = query.where(eq(escalationPolicies.teamId, teamId as string));
    }

    const policies = await query.orderBy(escalationPolicies.name);

    res.json(policies);
  } catch (error) {
    console.error('Error listing escalation policies:', error);
    res.status(500).json({ 
      error: 'Failed to list escalation policies',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * Create escalation policy
 */
router.post('/escalation-policies', async (req, res) => {
  try {
    const validatedData = insertEscalationPolicySchema.parse(req.body);
    const userId = req.user?.claims?.sub;

    const [policy] = await db
      .insert(escalationPolicies)
      .values({
        ...validatedData,
        createdBy: userId,
      })
      .returning();

    res.status(201).json(policy);
  } catch (error) {
    if (error instanceof Error && error.name === 'ZodError') {
      const validationError = fromZodError(error);
      return res.status(400).json({ 
        error: 'Validation failed',
        details: validationError.message 
      });
    }
    console.error('Error creating escalation policy:', error);
    res.status(500).json({ 
      error: 'Failed to create escalation policy',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// ========================================
// AVAILABILITY AND OVERRIDES
// ========================================

/**
 * Get availability for a user
 */
router.get('/availability', async (req, res) => {
  try {
    const userId = req.user?.claims?.sub;
    const { 
      startDate = new Date().toISOString(),
      endDate = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString()
    } = req.query;

    const availability = await db
      .select()
      .from(onCallAvailability)
      .where(
        and(
          eq(onCallAvailability.userId, userId),
          gte(onCallAvailability.endTime, new Date(startDate as string)),
          lte(onCallAvailability.startTime, new Date(endDate as string))
        )
      )
      .orderBy(onCallAvailability.startTime);

    res.json(availability);
  } catch (error) {
    console.error('Error getting availability:', error);
    res.status(500).json({ 
      error: 'Failed to get availability',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * Request time off or override
 */
router.post('/availability', async (req, res) => {
  try {
    const validatedData = insertOnCallAvailabilitySchema.parse(req.body);
    const userId = req.user?.claims?.sub;

    const [availability] = await db
      .insert(onCallAvailability)
      .values({
        ...validatedData,
        userId,
      })
      .returning();

    res.status(201).json(availability);
  } catch (error) {
    if (error instanceof Error && error.name === 'ZodError') {
      const validationError = fromZodError(error);
      return res.status(400).json({ 
        error: 'Validation failed',
        details: validationError.message 
      });
    }
    console.error('Error creating availability request:', error);
    res.status(500).json({ 
      error: 'Failed to create availability request',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// ========================================
// METRICS AND REPORTING
// ========================================

/**
 * Get on-call metrics
 */
router.get('/metrics', async (req, res) => {
  try {
    const {
      userId,
      teamId,
      startDate,
      endDate,
      period = 'monthly'
    } = req.query;

    const metrics = await onCallService.getOnCallMetrics(
      userId as string,
      teamId as string,
      startDate ? new Date(startDate as string) : undefined,
      endDate ? new Date(endDate as string) : undefined
    );

    res.json(metrics);
  } catch (error) {
    console.error('Error getting on-call metrics:', error);
    res.status(500).json({ 
      error: 'Failed to get on-call metrics',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * Get incident response statistics
 */
router.get('/reports/response-stats', async (req, res) => {
  try {
    const {
      startDate = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(),
      endDate = new Date().toISOString()
    } = req.query;

    const stats = await db
      .select({
        totalIncidents: count(),
        criticalIncidents: count(sql`CASE WHEN ${onCallIncidents.severity} = 'critical' THEN 1 END`),
        avgResponseTime: avg(onCallIncidents.totalResponseTime),
        avgResolutionTime: avg(onCallIncidents.resolutionTime),
        escalationRate: count(sql`CASE WHEN ${onCallIncidents.currentEscalationLevel} > 0 THEN 1 END`),
        falseAlarms: count(sql`CASE WHEN ${onCallIncidents.falseAlarm} = true THEN 1 END`),
      })
      .from(onCallIncidents)
      .where(
        and(
          gte(onCallIncidents.triggeredAt, new Date(startDate as string)),
          lte(onCallIncidents.triggeredAt, new Date(endDate as string))
        )
      );

    // Get incidents by severity
    const severityBreakdown = await db
      .select({
        severity: onCallIncidents.severity,
        count: count(),
      })
      .from(onCallIncidents)
      .where(
        and(
          gte(onCallIncidents.triggeredAt, new Date(startDate as string)),
          lte(onCallIncidents.triggeredAt, new Date(endDate as string))
        )
      )
      .groupBy(onCallIncidents.severity);

    res.json({
      period: {
        startDate,
        endDate,
      },
      overall: stats[0],
      severityBreakdown,
    });
  } catch (error) {
    console.error('Error getting response stats:', error);
    res.status(500).json({ 
      error: 'Failed to get response stats',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * Get system health check
 */
router.get('/health', async (req, res) => {
  try {
    const last5Minutes = new Date(Date.now() - 5 * 60 * 1000);
    
    const activeIncidents = await db
      .select({ count: count() })
      .from(onCallIncidents)
      .where(sql`${onCallIncidents.status} IN ('triggered', 'acknowledged', 'escalated')`);

    const recentIncidents = await db
      .select({ count: count() })
      .from(onCallIncidents)
      .where(gte(onCallIncidents.triggeredAt, last5Minutes));

    const activeTeams = await db
      .select({ count: count() })
      .from(onCallTeams)
      .where(eq(onCallTeams.isActive, true));

    const health = {
      status: 'healthy',
      activeIncidents: activeIncidents[0]?.count || 0,
      recentIncidents: recentIncidents[0]?.count || 0,
      activeTeams: activeTeams[0]?.count || 0,
      onCallSystemActive: true,
      timestamp: new Date(),
    };

    if (health.activeIncidents > 5) health.status = 'warning';
    if (health.activeIncidents > 10) health.status = 'critical';

    res.json(health);
  } catch (error) {
    console.error('Error checking on-call health:', error);
    res.status(500).json({ 
      status: 'error',
      error: 'Failed to check on-call health',
      details: error instanceof Error ? error.message : 'Unknown error',
      timestamp: new Date(),
    });
  }
});

export default router;