/**
 * Generic GL API - Works with any ERP system
 * Implements flexible mapping rules and journal operations
 */

import type { Express } from "express";
import { db } from "../db";
import { eq, and, desc, sql } from "drizzle-orm";
import { 
  glJournalHeaders,
  glJournalLinesCanonical,
  glMappingRules,
  glMappingRuleSets,
  payrollRuns,
  webhookEvents,
  type InsertGLMappingRule,
  type InsertGLMappingRuleSet,
  type GLMappingRule,
  type GLMappingRuleSet,
  type MappingRule,
  type MappingRuleSet,
  mappingRuleSetSchema,
  partners,
} from "@shared/schema";
import { GLExportCanonical } from "../services/glExportCanonical";
import { WebhookService } from "../services/webhookService";
import { RoundingService, type RoundingConfig } from '../services/roundingService';
import { z } from "zod";
import { nanoid } from 'nanoid';

// Helper function to format journal lines for API response
function formatJournalLine(line: any) {
  const dimensions: any = {};
  if (line.costCenter) dimensions.cost_center = line.costCenter;
  if (line.department) dimensions.department = line.department;
  if (line.propertyId) dimensions.property_id = line.propertyId;
  if (line.project) dimensions.project = line.project;
  if (line.employeeId) dimensions.employee_id = line.employeeId;

  return {
    line_id: line.lineId,
    account_code: line.accountCode,
    debit: parseFloat(line.debit || '0'),
    credit: parseFloat(line.credit || '0'),
    description: line.description,
    dimensions: Object.keys(dimensions).length > 0 ? dimensions : undefined,
    earnings_code: line.earningsCode,
  };
}

// Helper function to apply banker's rounding
function bankerRound(value: number): number {
  const rounded = Math.round(value * 100) / 100;
  return rounded;
}

export function glGenericRoutes(app: Express) {
  
  // =============================================================================
  // WEBHOOK SUBSCRIPTION ENDPOINTS
  // =============================================================================

  /**
   * Subscribe to Webhooks
   * POST /v1/webhooks
   */
  app.post('/v1/webhooks', async (req, res) => {
    try {
      const { partner_id, webhook_url, webhook_secret } = req.body;

      if (!partner_id || !webhook_url || !webhook_secret) {
        return res.status(400).json({
          error: 'MISSING_PARAMETERS',
          detail: 'partner_id, webhook_url, and webhook_secret are required',
          hint: 'Provide all required webhook configuration parameters'
        });
      }

      // Validate URL format
      try {
        new URL(webhook_url);
      } catch {
        return res.status(400).json({
          error: 'INVALID_URL',
          detail: 'webhook_url must be a valid HTTPS URL',
          hint: 'Ensure webhook_url starts with https:// and is properly formatted'
        });
      }

      // Update partner webhook configuration
      const [updatedPartner] = await db
        .update(partners)
        .set({
          webhookUrl: webhook_url,
          webhookSecret: webhook_secret,
          updatedAt: new Date(),
        })
        .where(eq(partners.id, partner_id))
        .returning();

      if (!updatedPartner) {
        return res.status(404).json({
          error: 'PARTNER_NOT_FOUND',
          detail: `Partner with ID ${partner_id} not found`,
          hint: 'Verify the partner_id is correct and the partner exists'
        });
      }

      res.status(201).json({
        partner_id: updatedPartner.id,
        webhook_url: updatedPartner.webhookUrl,
        status: 'subscribed',
        events_supported: [
          'payroll.run.finalized',
          'gl.journal.draft.created',
          'gl.journal.posted',
          'gl.journal.reversed',
          'connector.token.refreshed'
        ],
        created_at: updatedPartner.updatedAt,
      });
    } catch (error) {
      console.error('Webhook subscription error:', error);
      res.status(500).json({
        error: 'INTERNAL_ERROR',
        detail: 'Failed to subscribe to webhooks',
        hint: 'Contact system administrator if the problem persists'
      });
    }
  });

  /**
   * Get Webhook Subscription
   * GET /v1/webhooks/:partner_id
   */
  app.get('/v1/webhooks/:partner_id', async (req, res) => {
    try {
      const { partner_id } = req.params;

      const [partner] = await db
        .select({
          id: partners.id,
          webhookUrl: partners.webhookUrl,
          status: partners.status,
          createdAt: partners.createdAt,
          updatedAt: partners.updatedAt,
        })
        .from(partners)
        .where(eq(partners.id, partner_id))
        .limit(1);

      if (!partner) {
        return res.status(404).json({
          error: 'PARTNER_NOT_FOUND',
          detail: `Partner with ID ${partner_id} not found`,
          hint: 'Verify the partner_id is correct'
        });
      }

      res.json({
        partner_id: partner.id,
        webhook_url: partner.webhookUrl,
        is_subscribed: !!partner.webhookUrl,
        status: partner.status,
        events_supported: [
          'payroll.run.finalized',
          'gl.journal.draft.created',
          'gl.journal.posted',
          'gl.journal.reversed',
          'connector.token.refreshed'
        ],
        created_at: partner.createdAt,
        updated_at: partner.updatedAt,
      });
    } catch (error) {
      console.error('Webhook subscription fetch error:', error);
      res.status(500).json({
        error: 'INTERNAL_ERROR',
        detail: 'Failed to fetch webhook subscription',
        hint: 'Contact system administrator if the problem persists'
      });
    }
  });

  /**
   * Delete Webhook Subscription
   * DELETE /v1/webhooks/:partner_id
   */
  app.delete('/v1/webhooks/:partner_id', async (req, res) => {
    try {
      const { partner_id } = req.params;

      const [updatedPartner] = await db
        .update(partners)
        .set({
          webhookUrl: null,
          webhookSecret: null,
          updatedAt: new Date(),
        })
        .where(eq(partners.id, partner_id))
        .returning();

      if (!updatedPartner) {
        return res.status(404).json({
          error: 'PARTNER_NOT_FOUND',
          detail: `Partner with ID ${partner_id} not found`,
          hint: 'Verify the partner_id is correct'
        });
      }

      res.json({
        partner_id: updatedPartner.id,
        status: 'unsubscribed',
        unsubscribed_at: updatedPartner.updatedAt,
      });
    } catch (error) {
      console.error('Webhook unsubscribe error:', error);
      res.status(500).json({
        error: 'INTERNAL_ERROR',
        detail: 'Failed to unsubscribe from webhooks',
        hint: 'Contact system administrator if the problem persists'
      });
    }
  });

  /**
   * Get Webhook Events Log
   * GET /v1/webhooks/:partner_id/events
   */
  app.get('/v1/webhooks/:partner_id/events', async (req, res) => {
    try {
      const { partner_id } = req.params;
      const { limit = '50', offset = '0', status, event_type } = req.query;

      // Build query conditions
      const conditions = [eq(webhookEvents.partnerId, partner_id)];
      if (status) {
        conditions.push(eq(webhookEvents.status, status as any));
      }
      if (event_type) {
        conditions.push(eq(webhookEvents.eventType, event_type as string));
      }

      const events = await db
        .select({
          id: webhookEvents.id,
          event_type: webhookEvents.eventType,
          resource_id: webhookEvents.resourceId,
          status: webhookEvents.status,
          delivery_attempts: webhookEvents.deliveryAttempts,
          last_attempt_at: webhookEvents.lastAttemptAt,
          delivered_at: webhookEvents.deliveredAt,
          error_message: webhookEvents.errorMessage,
          created_at: webhookEvents.createdAt,
        })
        .from(webhookEvents)
        .where(and(...conditions))
        .orderBy(desc(webhookEvents.createdAt))
        .limit(parseInt(limit as string))
        .offset(parseInt(offset as string));

      res.json({
        partner_id,
        events,
        pagination: {
          limit: parseInt(limit as string),
          offset: parseInt(offset as string),
          total: events.length,
        },
        filters: {
          status,
          event_type,
        },
      });
    } catch (error) {
      console.error('Webhook events fetch error:', error);
      res.status(500).json({
        error: 'INTERNAL_ERROR',
        detail: 'Failed to fetch webhook events',
        hint: 'Contact system administrator if the problem persists'
      });
    }
  });

  // =============================================================================
  // GL MAPPING RULES ENDPOINTS
  // =============================================================================

  /**
   * Create or Update GL Mapping Rules
   * POST /v1/gl/mappings
   */
  app.post('/v1/gl/mappings', async (req, res) => {
    try {
      const validatedData = mappingRuleSetSchema.parse(req.body);
      const { entity_id, name, version, rules } = validatedData;

      // Deactivate existing rule sets for this entity
      await db
        .update(glMappingRuleSets)
        .set({ 
          isActive: false,
          updatedAt: new Date()
        })
        .where(eq(glMappingRuleSets.entityId, entity_id));

      // Create new rule set
      const ruleSetData: InsertGLMappingRuleSet = {
        entityId: entity_id,
        name: name || `Mapping Rules - ${entity_id}`,
        version: version || "1.0",
        isActive: true,
        rules: rules as any,
      };

      const [createdRuleSet] = await db
        .insert(glMappingRuleSets)
        .values(ruleSetData)
        .returning();

      // Also store individual rules for easier querying
      const individualRules: InsertGLMappingRule[] = rules.map((rule, index) => ({
        entityId: entity_id,
        type: rule.type,
        code: rule.code || null,
        name: rule.name || null,
        account: rule.account,
        dimension: rule.dimension || null,
        description: rule.description || null,
        priority: rule.priority || 100 + index,
        isActive: true,
      }));

      // Remove existing individual rules for this entity
      await db
        .delete(glMappingRules)
        .where(eq(glMappingRules.entityId, entity_id));

      // Insert new individual rules
      if (individualRules.length > 0) {
        await db.insert(glMappingRules).values(individualRules);
      }

      res.status(201).json({
        success: true,
        data: {
          rule_set_id: createdRuleSet.ruleSetId,
          entity_id: createdRuleSet.entityId,
          name: createdRuleSet.name,
          version: createdRuleSet.version,
          rules_count: rules.length,
          created_at: createdRuleSet.createdAt,
        },
      });
    } catch (error) {
      console.error('GL mapping rules creation error:', error);
      
      if (error instanceof z.ZodError) {
        return res.status(400).json({
          success: false,
          error: 'validation_error',
          details: error.errors,
        });
      }

      res.status(500).json({
        success: false,
        error: 'internal_error',
        message: 'Failed to create mapping rules',
      });
    }
  });

  /**
   * Get GL Mapping Rules
   * GET /v1/gl/mappings?entity_id=...
   */
  app.get('/v1/gl/mappings', async (req, res) => {
    try {
      const { entity_id } = req.query;

      if (!entity_id) {
        return res.status(400).json({
          success: false,
          error: 'missing_parameter',
          message: 'entity_id parameter is required',
        });
      }

      // Get active rule set for entity
      const [ruleSet] = await db
        .select()
        .from(glMappingRuleSets)
        .where(and(
          eq(glMappingRuleSets.entityId, entity_id as string),
          eq(glMappingRuleSets.isActive, true)
        ))
        .orderBy(desc(glMappingRuleSets.createdAt))
        .limit(1);

      if (!ruleSet) {
        return res.status(404).json({
          success: false,
          error: 'not_found',
          message: `No mapping rules found for entity: ${entity_id}`,
        });
      }

      res.json({
        success: true,
        data: {
          rule_set_id: ruleSet.ruleSetId,
          entity_id: ruleSet.entityId,
          name: ruleSet.name,
          version: ruleSet.version,
          rules: ruleSet.rules,
          created_at: ruleSet.createdAt,
          updated_at: ruleSet.updatedAt,
        },
      });
    } catch (error) {
      console.error('GL mapping rules fetch error:', error);
      res.status(500).json({
        success: false,
        error: 'internal_error',
        message: 'Failed to fetch mapping rules',
      });
    }
  });

  // =============================================================================
  // GL JOURNALS ENDPOINTS
  // =============================================================================

  /**
   * Build GL Journal from Payroll Run
   * POST /v1/gl/journals/build
   */
  app.post('/v1/gl/journals/build', async (req, res) => {
    try {
      const { run_id, entity_id, description, split_by, rounding, collapse_zero_lines } = req.body;
      const idempotencyKey = req.headers['idempotency-key'] as string;

      if (!run_id || !entity_id) {
        return res.status(400).json({
          error: 'MISSING_PARAMETERS',
          detail: 'run_id and entity_id are required',
          hint: 'Provide both run_id and entity_id in request body'
        });
      }

      // Check idempotency
      if (idempotencyKey) {
        const existingJournal = await db
          .select()
          .from(glJournalHeaders)
          .where(and(
            eq(glJournalHeaders.entityId, entity_id),
            sql`external_refs @> ${JSON.stringify([{idempotency_key: idempotencyKey}])}`
          ))
          .limit(1);
        
        if (existingJournal.length > 0) {
          const journal = existingJournal[0];
          const lines = await db
            .select()
            .from(glJournalLinesCanonical)
            .where(eq(glJournalLinesCanonical.journalId, journal.journalId))
            .orderBy(glJournalLinesCanonical.lineNumber);

          return res.json({
            journal_id: journal.journalId,
            period: journal.period,
            currency: journal.currency,
            status: journal.status,
            lines: lines.map(formatJournalLine),
            source: { type: 'payroll', run_id: journal.runId },
            idempotent: true
          });
        }
      }

      // Check if mapping rules exist for entity
      const [ruleSet] = await db
        .select()
        .from(glMappingRuleSets)
        .where(and(
          eq(glMappingRuleSets.entityId, entity_id),
          eq(glMappingRuleSets.isActive, true)
        ))
        .limit(1);

      if (!ruleSet) {
        return res.status(400).json({
          error: 'MAPPING_MISSING',
          detail: `No mapping rules configured for entity: ${entity_id}`,
          hint: 'Create mapping rules using POST /v1/gl/mappings'
        });
      }

      // GUARDRAIL: Validate mapping completeness
      const requiredMappings = ['REG', 'EFKA_EMPLOYEE', 'AADE_FMY', 'NET_PAY_CLEARING'];
      const missingMappings = requiredMappings.filter(code => 
        !ruleSet.rules.some((rule: any) => rule.code === code)
      );
      
      if (missingMappings.length > 0) {
        return res.status(400).json({
          error: 'INCOMPLETE_MAPPINGS',
          detail: `Missing required account mappings: ${missingMappings.join(', ')}`,
          hint: 'Complete the guided setup to configure all required account mappings'
        });
      }

      // Mock payroll run data for demo - in real implementation, fetch from database
      const mockPayrollRun = {
        runId: run_id,
        runNumber: `PR-${new Date().getFullYear()}-${String(Math.floor(Math.random() * 999) + 1).padStart(3, '0')}`,
        payPeriodStart: '2025-01-01',
        payPeriodEnd: '2025-01-31',
        payDate: new Date().toISOString().split('T')[0],
        entityId: entity_id,
        totalGross: '45680.50',
        totalNet: '32150.75',
        employeeCount: 128,
        lineItems: [
          {
            employeeId: 'emp-001',
            employeeName: 'John Smith',
            earningsCode: 'REG',
            earningsType: 'regular' as const,
            description: 'Regular Hours',
            amount: '2400.00',
            costCenter: 'CC001',
            department: 'HOTEL',
            propertyId: 'prop-princess',
          },
          {
            employeeId: 'emp-001',
            employeeName: 'John Smith',
            earningsCode: 'OT_TIER1_40',
            earningsType: 'overtime' as const,
            description: 'Overtime Tier 1 (40%)',
            amount: '320.00',
            costCenter: 'CC001',
            department: 'HOTEL',
            propertyId: 'prop-princess',
          },
          {
            employeeId: 'emp-002',
            employeeName: 'Maria Papadopoulos',
            earningsCode: 'NIGHT_25',
            earningsType: 'allowance' as const,
            description: 'Night Shift Premium (25%)',
            amount: '180.00',
            costCenter: 'CC002',
            department: 'RESTAURANT',
            propertyId: 'prop-princess',
          },
        ]
      };

      const glJournalRequest = {
        tenantId: 'tenant-demo',
        entityId: entity_id,
        period: mockPayrollRun.payDate.substring(0, 7), // YYYY-MM
        payrollRun: mockPayrollRun,
        currency: 'EUR',
        description: description || `Payroll Journal - ${mockPayrollRun.runNumber}`,
        mappingRules: ruleSet.rules as MappingRule[],
        splitBy: split_by || [],
        rounding: rounding || 'standard',
        collapseZeroLines: collapse_zero_lines !== false,
        idempotencyKey,
      };

      // Build journal using custom mapping rules with advanced options
      const journal = await GLExportCanonical.generateJournalWithMappings(glJournalRequest);

      // Get the created journal with lines for response
      const createdJournal = await GLExportCanonical.getJournal(journal.journalId);
      if (!createdJournal) {
        throw new Error('Failed to retrieve created journal');
      }

      // Send webhook event for journal draft created
      try {
        // Get all active partners for this entity (in production, filter by entity access)
        const activePartners = await db
          .select({ id: partners.id })
          .from(partners)
          .where(and(
            eq(partners.status, 'active'),
            sql`webhook_url IS NOT NULL`
          ));

        for (const partner of activePartners) {
          await WebhookService.sendJournalDraftCreatedEvent(partner.id, {
            journal_id: journal.journalId,
            run_id: run_id,
            lines_count: journal.lineCount,
            total_debit: journal.totalDebit,
            total_credit: journal.totalCredit,
          });
        }
      } catch (webhookError) {
        console.error('Webhook event failed:', webhookError);
        // Continue - don't fail the request for webhook issues
      }

      res.status(201).json({
        journal_id: journal.journalId,
        period: createdJournal.header.period,
        currency: createdJournal.header.currency,
        status: createdJournal.header.status,
        lines: createdJournal.lines.map(formatJournalLine),
        source: { type: 'payroll', run_id: run_id },
        total_debit: journal.totalDebit,
        total_credit: journal.totalCredit,
        line_count: journal.lineCount
      });
    } catch (error) {
      console.error('GL journal build error:', error);
      
      if (error instanceof Error && error.message.includes('No mapping found')) {
        return res.status(400).json({
          error: 'MAPPING_MISSING',
          detail: error.message,
          hint: 'Create mapping in /v1/gl/mappings'
        });
      }
      
      res.status(500).json({
        error: 'INTERNAL_ERROR',
        detail: error instanceof Error ? error.message : 'Failed to build journal',
        hint: 'Contact system administrator if the problem persists'
      });
    }
  });

  /**
   * Post GL Journal (Lock & Mark Posted)
   * POST /v1/gl/journals/:id/post
   */
  app.post('/v1/gl/journals/:id/post', async (req, res) => {
    try {
      const { id: journalId } = req.params;
      const { posted_by, notes } = req.body;

      // Get journal details before posting
      const journal = await GLExportCanonical.getJournal(journalId);
      if (!journal) {
        return res.status(404).json({
          success: false,
          error: 'not_found',
          message: 'Journal not found',
        });
      }

      if (journal.header.status === 'posted') {
        return res.status(400).json({
          error: 'ALREADY_POSTED',
          detail: 'Journal is already posted and locked',
          hint: 'Posted journals cannot be modified. Create a reversal if corrections are needed'
        });
      }

      if (journal.header.status === 'reversed') {
        return res.status(400).json({
          error: 'REVERSED_JOURNAL',
          detail: 'Cannot post a reversed journal',
          hint: 'Reversed journals cannot be posted'
        });
      }

      // Post the journal
      await GLExportCanonical.postJournal(journalId);

      // Emit webhook event
      const webhookData = {
        event: 'journal.posted',
        timestamp: new Date().toISOString(),
        data: {
          journal_id: journalId,
          entity_id: journal.header.entityId,
          run_id: journal.header.runId,
          total_debit: journal.lines.reduce((sum, line) => sum + parseFloat(line.debit || '0'), 0).toFixed(2),
          total_credit: journal.lines.reduce((sum, line) => sum + parseFloat(line.credit || '0'), 0).toFixed(2),
          posted_by: posted_by || 'system',
          notes: notes || null,
        },
      };

      // Store webhook event (in real implementation, this would trigger actual webhooks)
      // Note: Using minimal fields that exist in webhookEvents table
      // In production, implement proper webhook table structure

      res.json({
        success: true,
        data: {
          journal_id: journalId,
          status: 'posted',
          posted_at: new Date().toISOString(),
          webhook_event: webhookData.event,
        },
      });
    } catch (error) {
      console.error('GL journal posting error:', error);
      res.status(500).json({
        success: false,
        error: 'internal_error',
        message: error instanceof Error ? error.message : 'Failed to post journal',
      });
    }
  });

  /**
   * Reverse GL Journal (Auto-create reversing journal)
   * POST /v1/gl/journals/:id/reverse
   */
  app.post('/v1/gl/journals/:id/reverse', async (req, res) => {
    try {
      const { id: journalId } = req.params;
      const { reason, reversed_by } = req.body;

      // Get journal details before reversal
      const journal = await GLExportCanonical.getJournal(journalId);
      if (!journal) {
        return res.status(404).json({
          success: false,
          error: 'not_found',
          message: 'Journal not found',
        });
      }

      if (journal.header.status !== 'posted') {
        return res.status(400).json({
          success: false,
          error: 'not_posted',
          message: 'Only posted journals can be reversed',
        });
      }

      if (journal.header.status === 'reversed') {
        return res.status(400).json({
          error: 'ALREADY_REVERSED',
          detail: 'Journal is already reversed',
          hint: 'Cannot reverse a journal that has already been reversed'
        });
      }

      // Reverse the journal
      const reversalJournalId = await GLExportCanonical.reverseJournal(
        journalId, 
        reason || 'Manual reversal'
      );

      // Emit webhook event
      const webhookData = {
        event: 'journal.reversed',
        timestamp: new Date().toISOString(),
        data: {
          original_journal_id: journalId,
          reversal_journal_id: reversalJournalId,
          entity_id: journal.header.entityId,
          run_id: journal.header.runId,
          reason: reason || 'Manual reversal',
          reversed_by: reversed_by || 'system',
        },
      };

      // Store webhook event (in real implementation, this would trigger actual webhooks)
      // Note: Using minimal fields that exist in webhookEvents table
      // In production, implement proper webhook table structure

      res.json({
        success: true,
        data: {
          original_journal_id: journalId,
          reversal_journal_id: reversalJournalId,
          status: 'reversed',
          reversed_at: new Date().toISOString(),
          reason: reason || 'Manual reversal',
          webhook_event: webhookData.event,
        },
      });
    } catch (error) {
      console.error('GL journal reversal error:', error);
      res.status(500).json({
        success: false,
        error: 'internal_error',
        message: error instanceof Error ? error.message : 'Failed to reverse journal',
      });
    }
  });

  /**
   * Get GL Journal Details
   * GET /v1/gl/journals/:id
   */
  app.get('/v1/gl/journals/:id', async (req, res) => {
    try {
      const { id: journalId } = req.params;

      const journal = await GLExportCanonical.getJournal(journalId);
      if (!journal) {
        return res.status(404).json({
          success: false,
          error: 'not_found',
          message: 'Journal not found',
        });
      }

      const totalDebit = journal.lines.reduce((sum, line) => sum + parseFloat(line.debit || '0'), 0).toFixed(2);
      const totalCredit = journal.lines.reduce((sum, line) => sum + parseFloat(line.credit || '0'), 0).toFixed(2);

      res.json({
        success: true,
        data: {
          journal_id: journal.header.journalId,
          entity_id: journal.header.entityId,
          period: journal.header.period,
          currency: journal.header.currency,
          status: journal.header.status,
          source: journal.header.source,
          run_id: journal.header.runId,
          description: journal.header.description,
          total_debit: totalDebit,
          total_credit: totalCredit,
          line_count: journal.lines.length,
          created_at: journal.header.createdAt,
          posted_at: journal.header.postedAt,
          updated_at: journal.header.updatedAt,
          lines: journal.lines.map(line => ({
            line_id: line.lineId,
            line_number: line.lineNumber,
            account_code: line.accountCode,
            debit: line.debit,
            credit: line.credit,
            description: line.description,
            cost_center: line.costCenter,
            department: line.department,
            property_id: line.propertyId,
            project: line.project,
            employee_id: line.employeeId,
            earnings_code: line.earningsCode,
          })),
        },
      });
    } catch (error) {
      console.error('GL journal fetch error:', error);
      res.status(500).json({
        success: false,
        error: 'internal_error',
        message: 'Failed to fetch journal',
      });
    }
  });

  /**
   * Query GL Journals
   * GET /v1/gl/journals?period=YYYY-MM&entity_id=...
   */
  app.get('/v1/gl/journals', async (req, res) => {
    try {
      const { period, entity_id, status, run_id, limit = '50', offset = '0' } = req.query;

      if (!period && !entity_id) {
        return res.status(400).json({
          success: false,
          error: 'missing_parameters',
          message: 'Either period or entity_id parameter is required',
        });
      }

      // Build query conditions
      const conditions = [];
      if (period) {
        conditions.push(eq(glJournalHeaders.period, period as string));
      }
      if (entity_id) {
        conditions.push(eq(glJournalHeaders.entityId, entity_id as string));
      }
      if (status) {
        conditions.push(eq(glJournalHeaders.status, status as any));
      }
      if (run_id) {
        conditions.push(eq(glJournalHeaders.runId, run_id as string));
      }

      const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

      // Query journals
      const journals = await db
        .select({
          journal_id: glJournalHeaders.journalId,
          entity_id: glJournalHeaders.entityId,
          period: glJournalHeaders.period,
          currency: glJournalHeaders.currency,
          status: glJournalHeaders.status,
          source: glJournalHeaders.source,
          run_id: glJournalHeaders.runId,
          description: glJournalHeaders.description,
          created_at: glJournalHeaders.createdAt,
          posted_at: glJournalHeaders.postedAt,
          updated_at: glJournalHeaders.updatedAt,
        })
        .from(glJournalHeaders)
        .where(whereClause)
        .orderBy(desc(glJournalHeaders.createdAt))
        .limit(parseInt(limit as string))
        .offset(parseInt(offset as string));

      // Get line counts and totals for each journal (in real implementation, this could be optimized)
      const enrichedJournals = [];
      for (const journal of journals) {
        const lines = await db
          .select()
          .from(glJournalLinesCanonical)
          .where(eq(glJournalLinesCanonical.journalId, journal.journal_id));

        const totalDebit = lines.reduce((sum, line) => sum + parseFloat(line.debit || '0'), 0).toFixed(2);
        const totalCredit = lines.reduce((sum, line) => sum + parseFloat(line.credit || '0'), 0).toFixed(2);

        enrichedJournals.push({
          ...journal,
          total_debit: totalDebit,
          total_credit: totalCredit,
          line_count: lines.length,
        });
      }

      res.json({
        success: true,
        data: {
          journals: enrichedJournals,
          pagination: {
            limit: parseInt(limit as string),
            offset: parseInt(offset as string),
            total: enrichedJournals.length, // In real implementation, run a separate count query
          },
          filters: {
            period,
            entity_id,
            status,
            run_id,
          },
        },
      });
    } catch (error) {
      console.error('GL journals query error:', error);
      res.status(500).json({
        success: false,
        error: 'internal_error',
        message: 'Failed to query journals',
      });
    }
  });

  // =============================================================================
  // DEMO/TEST WEBHOOK ENDPOINTS
  // =============================================================================

  /**
   * Simulate Payroll Run Finalized (for testing webhooks)
   * POST /v1/demo/payroll/finalize
   */
  app.post('/v1/demo/payroll/finalize', async (req, res) => {
    try {
      const { tenant_id, entity_id, run_id, period } = req.body;

      if (!tenant_id || !entity_id || !run_id || !period) {
        return res.status(400).json({
          error: 'MISSING_PARAMETERS',
          detail: 'tenant_id, entity_id, run_id, and period are required',
          hint: 'Provide all required payroll run parameters'
        });
      }

      // Simulate payroll totals
      const mockTotals = {
        gross: '125750.50',
        net: '89525.35',
        employee_count: 147
      };

      // Send webhook to all active partners
      try {
        const activePartners = await db
          .select({ id: partners.id })
          .from(partners)
          .where(and(
            eq(partners.status, 'active'),
            sql`webhook_url IS NOT NULL`
          ));

        const webhookPromises = activePartners.map(partner =>
          WebhookService.sendPayrollRunFinalizedEvent(partner.id, {
            tenant_id,
            entity_id,
            run_id,
            period,
            totals: mockTotals
          })
        );

        const eventIds = await Promise.all(webhookPromises);

        res.status(200).json({
          event: 'payroll.run.finalized',
          run_id,
          entity_id,
          period,
          totals: mockTotals,
          webhook_events_queued: eventIds.length,
          event_ids: eventIds,
          timestamp: new Date().toISOString()
        });
      } catch (webhookError) {
        console.error('Webhook event failed:', webhookError);
        res.status(500).json({
          error: 'WEBHOOK_ERROR',
          detail: 'Failed to queue webhook events',
          hint: 'Check webhook configuration and try again'
        });
      }
    } catch (error) {
      console.error('Demo payroll finalize error:', error);
      res.status(500).json({
        error: 'INTERNAL_ERROR',
        detail: 'Failed to simulate payroll finalization',
        hint: 'Contact system administrator if the problem persists'
      });
    }
  });

  /**
   * Simulate Connector Token Refresh (for testing webhooks)
   * POST /v1/demo/connector/token-refresh
   */
  app.post('/v1/demo/connector/token-refresh', async (req, res) => {
    try {
      const { connector, entity_id } = req.body;

      if (!connector || !entity_id) {
        return res.status(400).json({
          error: 'MISSING_PARAMETERS',
          detail: 'connector and entity_id are required',
          hint: 'Specify the connector type (xero, quickbooks, sage, etc.) and entity_id'
        });
      }

      // Send webhook to all active partners
      try {
        const activePartners = await db
          .select({ id: partners.id })
          .from(partners)
          .where(and(
            eq(partners.status, 'active'),
            sql`webhook_url IS NOT NULL`
          ));

        const webhookPromises = activePartners.map(partner =>
          WebhookService.sendConnectorTokenRefreshedEvent(partner.id, {
            connector,
            entity_id
          })
        );

        const eventIds = await Promise.all(webhookPromises);

        res.status(200).json({
          event: 'connector.token.refreshed',
          connector,
          entity_id,
          webhook_events_queued: eventIds.length,
          event_ids: eventIds,
          timestamp: new Date().toISOString()
        });
      } catch (webhookError) {
        console.error('Webhook event failed:', webhookError);
        res.status(500).json({
          error: 'WEBHOOK_ERROR',
          detail: 'Failed to queue webhook events',
          hint: 'Check webhook configuration and try again'
        });
      }
    } catch (error) {
      console.error('Demo connector token refresh error:', error);
      res.status(500).json({
        error: 'INTERNAL_ERROR',
        detail: 'Failed to simulate token refresh',
        hint: 'Contact system administrator if the problem persists'
      });
    }
  });
}