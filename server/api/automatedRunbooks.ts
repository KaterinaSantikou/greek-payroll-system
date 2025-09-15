/**
 * Automated Runbooks API
 * Provides endpoints for managing runbooks, executions, and triggers
 */

import { Router } from 'express';
import { isAuthenticated } from '../replitAuth';
import { AutomatedRunbooksService } from '../services/AutomatedRunbooksService';
import {
  insertRunbookSchema,
  insertRunbookExecutionSchema,
  insertRunbookTriggerSchema,
  insertRunbookTemplateSchema,
} from '@shared/schema';
import { fromZodError } from 'zod-validation-error';
import { db } from '../db';
import {
  runbooks,
  runbookExecutions,
  runbookStepExecutions,
  runbookTriggers,
  runbookTemplates,
  runbookExecutionLogs,
  runbookApprovals,
  users,
} from '@shared/schema';
import { eq, desc, and, gte, lte, sql, count, avg, or } from 'drizzle-orm';

const router = Router();

// All runbook routes require authentication
router.use(isAuthenticated);

// Feature gate: only initialize runbooks service if enabled
let runbooksService: any = null;
if (process.env.ENABLE_RUNBOOKS === 'true') {
  try {
    runbooksService = AutomatedRunbooksService.getInstance();
  } catch (error) {
    console.error(
      '❌ Failed to initialize AutomatedRunbooksService:',
      error.message
    );
  }
}

// ========================================
// RUNBOOK MANAGEMENT
// ========================================

/**
 * List all runbooks with filtering
 */
router.get('/runbooks', async (req, res) => {
  // Feature gate check
  if (!runbooksService) {
    return res.status(503).json({
      error: 'Automated runbooks service is not available',
      reason: 'Service disabled or schema missing',
    });
  }

  try {
    const {
      category,
      isActive,
      autoTrigger,
      search,
      limit = '50',
      offset = '0',
    } = req.query;

    let query = db
      .select({
        runbook: runbooks,
        createdBy: {
          id: users.id,
          firstName: users.firstName,
          lastName: users.lastName,
        },
      })
      .from(runbooks)
      .leftJoin(users, eq(runbooks.createdBy, users.id));

    const conditions = [];
    if (category) conditions.push(eq(runbooks.category, category as string));
    if (isActive !== undefined)
      conditions.push(eq(runbooks.isActive, isActive === 'true'));
    if (autoTrigger !== undefined)
      conditions.push(eq(runbooks.autoTrigger, autoTrigger === 'true'));

    if (search) {
      conditions.push(
        or(
          sql`${runbooks.name} ILIKE ${'%' + search + '%'}`,
          sql`${runbooks.description} ILIKE ${'%' + search + '%'}`
        )
      );
    }

    if (conditions.length > 0) {
      query = query.where(and(...conditions));
    }

    const runbookList = await query
      .orderBy(desc(runbooks.createdAt))
      .limit(parseInt(limit as string))
      .offset(parseInt(offset as string));

    // Get total count
    let countQuery = db.select({ count: count() }).from(runbooks);
    if (conditions.length > 0) {
      countQuery = countQuery.where(and(...conditions));
    }
    const [{ count: total }] = await countQuery;

    res.json({
      runbooks: runbookList,
      total,
      limit: parseInt(limit as string),
      offset: parseInt(offset as string),
    });
  } catch (error) {
    console.error('Error listing runbooks:', error);
    res.status(500).json({
      error: 'Failed to list runbooks',
      details: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

/**
 * Get runbook by ID
 */
router.get('/runbooks/:runbookId', async (req, res) => {
  try {
    const [runbook] = await db
      .select({
        runbook: runbooks,
        createdBy: users,
      })
      .from(runbooks)
      .leftJoin(users, eq(runbooks.createdBy, users.id))
      .where(eq(runbooks.id, req.params.runbookId))
      .limit(1);

    if (!runbook) {
      return res.status(404).json({ error: 'Runbook not found' });
    }

    // Get associated triggers
    const triggers = await db
      .select()
      .from(runbookTriggers)
      .where(eq(runbookTriggers.runbookId, req.params.runbookId))
      .orderBy(desc(runbookTriggers.createdAt));

    // Get recent executions
    const recentExecutions = await db
      .select()
      .from(runbookExecutions)
      .where(eq(runbookExecutions.runbookId, req.params.runbookId))
      .orderBy(desc(runbookExecutions.startedAt))
      .limit(10);

    res.json({
      ...runbook,
      triggers,
      recentExecutions,
    });
  } catch (error) {
    console.error('Error getting runbook:', error);
    res.status(500).json({
      error: 'Failed to get runbook',
      details: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

/**
 * Create new runbook
 */
router.post('/runbooks', async (req, res) => {
  try {
    const validatedData = insertRunbookSchema.parse(req.body);
    const userId = req.user?.claims?.sub;

    const [runbook] = await db
      .insert(runbooks)
      .values({
        ...validatedData,
        createdBy: userId,
        updatedBy: userId,
      })
      .returning();

    res.status(201).json(runbook);
  } catch (error) {
    if (error instanceof Error && error.name === 'ZodError') {
      const validationError = fromZodError(error);
      return res.status(400).json({
        error: 'Validation failed',
        details: validationError.message,
      });
    }
    console.error('Error creating runbook:', error);
    res.status(500).json({
      error: 'Failed to create runbook',
      details: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

/**
 * Update runbook
 */
router.put('/runbooks/:runbookId', async (req, res) => {
  try {
    const validatedData = insertRunbookSchema.parse(req.body);
    const userId = req.user?.claims?.sub;

    const [runbook] = await db
      .update(runbooks)
      .set({
        ...validatedData,
        updatedBy: userId,
        updatedAt: new Date(),
      })
      .where(eq(runbooks.id, req.params.runbookId))
      .returning();

    if (!runbook) {
      return res.status(404).json({ error: 'Runbook not found' });
    }

    res.json(runbook);
  } catch (error) {
    if (error instanceof Error && error.name === 'ZodError') {
      const validationError = fromZodError(error);
      return res.status(400).json({
        error: 'Validation failed',
        details: validationError.message,
      });
    }
    console.error('Error updating runbook:', error);
    res.status(500).json({
      error: 'Failed to update runbook',
      details: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

/**
 * Delete runbook
 */
router.delete('/runbooks/:runbookId', async (req, res) => {
  try {
    const [runbook] = await db
      .delete(runbooks)
      .where(eq(runbooks.id, req.params.runbookId))
      .returning();

    if (!runbook) {
      return res.status(404).json({ error: 'Runbook not found' });
    }

    res.json({ message: 'Runbook deleted successfully' });
  } catch (error) {
    console.error('Error deleting runbook:', error);
    res.status(500).json({
      error: 'Failed to delete runbook',
      details: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

// ========================================
// RUNBOOK EXECUTION
// ========================================

/**
 * Execute a runbook manually
 */
router.post('/runbooks/:runbookId/execute', async (req, res) => {
  try {
    const { runbookId } = req.params;
    const { variables = {}, priority = 'medium', reason } = req.body;
    const userId = req.user?.claims?.sub || 'unknown';

    const execution = await runbooksService.executeRunbook(runbookId, {
      variables,
      environment: (process.env.NODE_ENV as any) || 'development',
      triggeredBy: userId,
      priority,
    });

    res.status(201).json(execution);
  } catch (error) {
    console.error('Error executing runbook:', error);
    res.status(500).json({
      error: 'Failed to execute runbook',
      details: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

/**
 * Get execution details
 */
router.get('/executions/:executionId', async (req, res) => {
  try {
    const [execution] = await db
      .select({
        execution: runbookExecutions,
        runbook: {
          id: runbooks.id,
          name: runbooks.name,
          category: runbooks.category,
        },
        triggeredBy: {
          id: users.id,
          firstName: users.firstName,
          lastName: users.lastName,
        },
      })
      .from(runbookExecutions)
      .leftJoin(runbooks, eq(runbookExecutions.runbookId, runbooks.id))
      .leftJoin(users, eq(runbookExecutions.triggeredBy, users.id))
      .where(eq(runbookExecutions.id, req.params.executionId))
      .limit(1);

    if (!execution) {
      return res.status(404).json({ error: 'Execution not found' });
    }

    // Get step executions
    const steps = await db
      .select()
      .from(runbookStepExecutions)
      .where(eq(runbookStepExecutions.executionId, req.params.executionId))
      .orderBy(runbookStepExecutions.stepIndex);

    // Get execution logs
    const logs = await db
      .select()
      .from(runbookExecutionLogs)
      .where(eq(runbookExecutionLogs.executionId, req.params.executionId))
      .orderBy(desc(runbookExecutionLogs.timestamp))
      .limit(100);

    res.json({
      ...execution,
      steps,
      logs,
    });
  } catch (error) {
    console.error('Error getting execution:', error);
    res.status(500).json({
      error: 'Failed to get execution',
      details: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

/**
 * List executions with filtering
 */
router.get('/executions', async (req, res) => {
  try {
    const {
      runbookId,
      status,
      result,
      triggeredBy,
      startDate,
      endDate,
      limit = '50',
      offset = '0',
    } = req.query;

    let query = db
      .select({
        execution: runbookExecutions,
        runbook: {
          id: runbooks.id,
          name: runbooks.name,
          category: runbooks.category,
        },
        triggeredBy: {
          id: users.id,
          firstName: users.firstName,
          lastName: users.lastName,
        },
      })
      .from(runbookExecutions)
      .leftJoin(runbooks, eq(runbookExecutions.runbookId, runbooks.id))
      .leftJoin(users, eq(runbookExecutions.triggeredBy, users.id));

    const conditions = [];
    if (runbookId)
      conditions.push(eq(runbookExecutions.runbookId, runbookId as string));
    if (status) conditions.push(eq(runbookExecutions.status, status as string));
    if (result) conditions.push(eq(runbookExecutions.result, result as string));
    if (triggeredBy)
      conditions.push(eq(runbookExecutions.triggeredBy, triggeredBy as string));
    if (startDate)
      conditions.push(
        gte(runbookExecutions.startedAt, new Date(startDate as string))
      );
    if (endDate)
      conditions.push(
        lte(runbookExecutions.startedAt, new Date(endDate as string))
      );

    if (conditions.length > 0) {
      query = query.where(and(...conditions));
    }

    const executions = await query
      .orderBy(desc(runbookExecutions.startedAt))
      .limit(parseInt(limit as string))
      .offset(parseInt(offset as string));

    // Get total count
    let countQuery = db.select({ count: count() }).from(runbookExecutions);
    if (conditions.length > 0) {
      countQuery = countQuery.where(and(...conditions));
    }
    const [{ count: total }] = await countQuery;

    res.json({
      executions,
      total,
      limit: parseInt(limit as string),
      offset: parseInt(offset as string),
    });
  } catch (error) {
    console.error('Error listing executions:', error);
    res.status(500).json({
      error: 'Failed to list executions',
      details: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

/**
 * Cancel execution
 */
router.post('/executions/:executionId/cancel', async (req, res) => {
  try {
    const { reason } = req.body;
    const userId = req.user?.claims?.sub;

    const [execution] = await db
      .update(runbookExecutions)
      .set({
        status: 'cancelled',
        result: 'cancelled',
        resultSummary: reason || 'Cancelled by user',
        completedAt: new Date(),
        updatedAt: new Date(),
      })
      .where(eq(runbookExecutions.id, req.params.executionId))
      .returning();

    if (!execution) {
      return res.status(404).json({ error: 'Execution not found' });
    }

    res.json({
      message: 'Execution cancelled successfully',
      execution,
    });
  } catch (error) {
    console.error('Error cancelling execution:', error);
    res.status(500).json({
      error: 'Failed to cancel execution',
      details: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

// ========================================
// TRIGGERS MANAGEMENT
// ========================================

/**
 * List runbook triggers
 */
router.get('/triggers', async (req, res) => {
  try {
    const { runbookId, isActive } = req.query;

    let query = db
      .select({
        trigger: runbookTriggers,
        runbook: {
          id: runbooks.id,
          name: runbooks.name,
          category: runbooks.category,
        },
      })
      .from(runbookTriggers)
      .leftJoin(runbooks, eq(runbookTriggers.runbookId, runbooks.id));

    const conditions = [];
    if (runbookId)
      conditions.push(eq(runbookTriggers.runbookId, runbookId as string));
    if (isActive !== undefined)
      conditions.push(eq(runbookTriggers.isActive, isActive === 'true'));

    if (conditions.length > 0) {
      query = query.where(and(...conditions));
    }

    const triggers = await query.orderBy(desc(runbookTriggers.createdAt));

    res.json(triggers);
  } catch (error) {
    console.error('Error listing triggers:', error);
    res.status(500).json({
      error: 'Failed to list triggers',
      details: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

/**
 * Create runbook trigger
 */
router.post('/triggers', async (req, res) => {
  try {
    const validatedData = insertRunbookTriggerSchema.parse(req.body);
    const userId = req.user?.claims?.sub;

    const [trigger] = await db
      .insert(runbookTriggers)
      .values({
        ...validatedData,
        createdBy: userId,
      })
      .returning();

    res.status(201).json(trigger);
  } catch (error) {
    if (error instanceof Error && error.name === 'ZodError') {
      const validationError = fromZodError(error);
      return res.status(400).json({
        error: 'Validation failed',
        details: validationError.message,
      });
    }
    console.error('Error creating trigger:', error);
    res.status(500).json({
      error: 'Failed to create trigger',
      details: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

/**
 * Test trigger conditions
 */
router.post('/triggers/:triggerId/test', async (req, res) => {
  try {
    const { alertData } = req.body;

    // Test if the alert would trigger this runbook
    const matchingRunbooks =
      await runbooksService.checkTriggerConditions(alertData);

    res.json({
      wouldTrigger: matchingRunbooks.length > 0,
      matchingRunbooks,
      alertData,
    });
  } catch (error) {
    console.error('Error testing trigger:', error);
    res.status(500).json({
      error: 'Failed to test trigger',
      details: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

// ========================================
// TEMPLATES AND LIBRARY
// ========================================

/**
 * List runbook templates
 */
router.get('/templates', async (req, res) => {
  try {
    const { category, difficulty, isPublic } = req.query;

    let query = db
      .select({
        template: runbookTemplates,
        createdBy: {
          id: users.id,
          firstName: users.firstName,
          lastName: users.lastName,
        },
      })
      .from(runbookTemplates)
      .leftJoin(users, eq(runbookTemplates.createdBy, users.id));

    const conditions = [];
    if (category)
      conditions.push(eq(runbookTemplates.category, category as string));
    if (difficulty)
      conditions.push(eq(runbookTemplates.difficulty, difficulty as string));
    if (isPublic !== undefined)
      conditions.push(eq(runbookTemplates.isPublic, isPublic === 'true'));

    if (conditions.length > 0) {
      query = query.where(and(...conditions));
    }

    const templates = await query.orderBy(
      desc(runbookTemplates.rating),
      desc(runbookTemplates.downloadCount)
    );

    res.json(templates);
  } catch (error) {
    console.error('Error listing templates:', error);
    res.status(500).json({
      error: 'Failed to list templates',
      details: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

/**
 * Create runbook from template
 */
router.post('/templates/:templateId/create-runbook', async (req, res) => {
  try {
    const [template] = await db
      .select()
      .from(runbookTemplates)
      .where(eq(runbookTemplates.id, req.params.templateId))
      .limit(1);

    if (!template) {
      return res.status(404).json({ error: 'Template not found' });
    }

    const { name, customizations = {} } = req.body;
    const userId = req.user?.claims?.sub;

    // Create runbook from template
    const templateData = template.templateData as any;
    const runbookData = {
      ...templateData,
      name:
        name || `${template.name} - ${new Date().toISOString().split('T')[0]}`,
      ...customizations,
      isTemplate: false,
      createdBy: userId,
      updatedBy: userId,
    };

    const [runbook] = await db.insert(runbooks).values(runbookData).returning();

    // Update template download count
    await db
      .update(runbookTemplates)
      .set({
        downloadCount: sql`${runbookTemplates.downloadCount} + 1`,
      })
      .where(eq(runbookTemplates.id, req.params.templateId));

    res.status(201).json(runbook);
  } catch (error) {
    console.error('Error creating runbook from template:', error);
    res.status(500).json({
      error: 'Failed to create runbook from template',
      details: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

// ========================================
// ANALYTICS AND REPORTING
// ========================================

/**
 * Get runbook analytics
 */
router.get('/analytics', async (req, res) => {
  try {
    const {
      startDate = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(),
      endDate = new Date().toISOString(),
      runbookId,
    } = req.query;

    const conditions = [
      gte(runbookExecutions.startedAt, new Date(startDate as string)),
      lte(runbookExecutions.startedAt, new Date(endDate as string)),
    ];

    if (runbookId) {
      conditions.push(eq(runbookExecutions.runbookId, runbookId as string));
    }

    // Overall statistics
    const [overallStats] = await db
      .select({
        totalExecutions: count(),
        successfulExecutions: count(
          sql`CASE WHEN ${runbookExecutions.result} = 'success' THEN 1 END`
        ),
        failedExecutions: count(
          sql`CASE WHEN ${runbookExecutions.result} = 'failure' THEN 1 END`
        ),
        avgDuration: avg(runbookExecutions.actualDuration),
        autoTriggered: count(
          sql`CASE WHEN ${runbookExecutions.triggerType} = 'automatic' THEN 1 END`
        ),
      })
      .from(runbookExecutions)
      .where(and(...conditions));

    // Executions by category
    const categoryStats = await db
      .select({
        category: runbooks.category,
        count: count(),
        successRate: sql`ROUND(COUNT(CASE WHEN ${runbookExecutions.result} = 'success' THEN 1 END) * 100.0 / COUNT(*), 2)`,
      })
      .from(runbookExecutions)
      .leftJoin(runbooks, eq(runbookExecutions.runbookId, runbooks.id))
      .where(and(...conditions))
      .groupBy(runbooks.category);

    // Most executed runbooks
    const topRunbooks = await db
      .select({
        runbook: {
          id: runbooks.id,
          name: runbooks.name,
          category: runbooks.category,
        },
        executionCount: count(),
        successRate: sql`ROUND(COUNT(CASE WHEN ${runbookExecutions.result} = 'success' THEN 1 END) * 100.0 / COUNT(*), 2)`,
        avgDuration: avg(runbookExecutions.actualDuration),
      })
      .from(runbookExecutions)
      .leftJoin(runbooks, eq(runbookExecutions.runbookId, runbooks.id))
      .where(and(...conditions))
      .groupBy(runbooks.id, runbooks.name, runbooks.category)
      .orderBy(sql`COUNT(*) DESC`)
      .limit(10);

    res.json({
      period: {
        startDate,
        endDate,
      },
      overall: overallStats,
      byCategory: categoryStats,
      topRunbooks,
    });
  } catch (error) {
    console.error('Error getting runbook analytics:', error);
    res.status(500).json({
      error: 'Failed to get runbook analytics',
      details: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

/**
 * Get system health check
 */
router.get('/health', async (req, res) => {
  try {
    const last10Minutes = new Date(Date.now() - 10 * 60 * 1000);

    const activeExecutions = await db
      .select({ count: count() })
      .from(runbookExecutions)
      .where(sql`${runbookExecutions.status} IN ('running', 'pending')`);

    const recentExecutions = await db
      .select({ count: count() })
      .from(runbookExecutions)
      .where(gte(runbookExecutions.startedAt, last10Minutes));

    const activeTriggers = await db
      .select({ count: count() })
      .from(runbookTriggers)
      .where(eq(runbookTriggers.isActive, true));

    const health = {
      status: 'healthy',
      activeExecutions: activeExecutions[0]?.count || 0,
      recentExecutions: recentExecutions[0]?.count || 0,
      activeTriggers: activeTriggers[0]?.count || 0,
      runbooksSystemActive: true,
      timestamp: new Date(),
    };

    if (health.activeExecutions > 20) health.status = 'warning';
    if (health.activeExecutions > 50) health.status = 'critical';

    res.json(health);
  } catch (error) {
    console.error('Error checking runbooks health:', error);
    res.status(500).json({
      status: 'error',
      error: 'Failed to check runbooks health',
      details: error instanceof Error ? error.message : 'Unknown error',
      timestamp: new Date(),
    });
  }
});

export default router;
