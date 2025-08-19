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
} from "@shared/schema";
import { GLExportCanonical } from "../services/glExportCanonical";
import { z } from "zod";

export function glGenericRoutes(app: Express) {
  
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
      const { run_id, entity_id, description } = req.body;

      if (!run_id || !entity_id) {
        return res.status(400).json({
          success: false,
          error: 'missing_parameters',
          message: 'run_id and entity_id are required',
        });
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
          success: false,
          error: 'missing_mappings',
          message: `No mapping rules configured for entity: ${entity_id}`,
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
      };

      // Build journal using custom mapping rules
      const journal = await GLExportCanonical.generateJournalWithMappings(glJournalRequest);

      res.status(201).json({
        success: true,
        data: {
          journal_id: journal.journalId,
          journal_number: journal.journalNumber,
          status: journal.status,
          entity_id: entity_id,
          run_id: run_id,
          total_debit: journal.totalDebit,
          total_credit: journal.totalCredit,
          line_count: journal.lineCount,
          created_at: journal.createdAt,
        },
      });
    } catch (error) {
      console.error('GL journal build error:', error);
      res.status(500).json({
        success: false,
        error: 'internal_error',
        message: error instanceof Error ? error.message : 'Failed to build journal',
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
          success: false,
          error: 'already_posted',
          message: 'Journal is already posted',
        });
      }

      if (journal.header.status === 'reversed') {
        return res.status(400).json({
          success: false,
          error: 'reversed_journal',
          message: 'Cannot post a reversed journal',
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
      await db.insert(webhookEvents).values({
        event: 'journal.posted',
        data: webhookData as any,
        status: 'pending',
      });

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
          success: false,
          error: 'already_reversed',
          message: 'Journal is already reversed',
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

      await db.insert(webhookEvents).values({
        event: 'journal.reversed',
        data: webhookData as any,
        status: 'pending',
      });

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
}