/**
 * Edge Cases API - Complex payroll scenario handling
 */

import type { Express } from "express";
import { EdgeCaseHandler } from "../services/edgeCaseHandler";
import { z } from "zod";

export function edgeCaseRoutes(app: Express) {

  // =============================================================================
  // MULTI-ENTITY MAPPING
  // =============================================================================

  /**
   * Resolve Account Mapping with Multi-Entity Priority
   * POST /v1/edge-cases/resolve-mapping
   */
  app.post('/v1/edge-cases/resolve-mapping', async (req, res) => {
    try {
      const { entity_id, property_id, earnings_code, mappings } = req.body;

      if (!entity_id || !earnings_code || !mappings) {
        return res.status(400).json({
          error: 'MISSING_PARAMETERS',
          detail: 'entity_id, earnings_code, and mappings are required',
          hint: 'Provide entity mapping hierarchy for resolution'
        });
      }

      const resolution = EdgeCaseHandler.resolveAccountMapping(
        entity_id,
        property_id,
        earnings_code,
        mappings
      );

      if (!resolution) {
        return res.status(404).json({
          error: 'MAPPING_NOT_FOUND',
          detail: `No account mapping found for ${earnings_code} in entity ${entity_id}`,
          hint: 'Configure entity-level or property-specific mappings'
        });
      }

      res.json({
        entity_id,
        property_id,
        earnings_code,
        resolved_mapping: resolution,
        resolution_type: property_id ? 'property_specific' : 'entity_level',
      });
    } catch (error) {
      console.error('Mapping resolution error:', error);
      res.status(500).json({
        error: 'INTERNAL_ERROR',
        detail: 'Failed to resolve account mapping'
      });
    }
  });

  // =============================================================================
  // TIP HANDLING
  // =============================================================================

  /**
   * Generate Tip Journal Lines
   * POST /v1/edge-cases/tips/generate-lines
   */
  app.post('/v1/edge-cases/tips/generate-lines', async (req, res) => {
    try {
      const { tip_amount, employee_id, property_id, handling_rule, description = 'Tips' } = req.body;

      if (!tip_amount || !employee_id || !handling_rule) {
        return res.status(400).json({
          error: 'MISSING_PARAMETERS',
          detail: 'tip_amount, employee_id, and handling_rule are required',
          hint: 'Specify tip handling type: expense_liability or pass_through'
        });
      }

      if (tip_amount <= 0) {
        return res.status(400).json({
          error: 'INVALID_AMOUNT',
          detail: 'tip_amount must be greater than 0',
          hint: 'Provide a positive tip amount'
        });
      }

      const lines = EdgeCaseHandler.generateTipJournalLines(
        parseFloat(tip_amount),
        employee_id,
        property_id,
        handling_rule,
        description
      );

      const totalDebits = lines.reduce((sum, line) => sum + parseFloat(line.debit), 0);
      const totalCredits = lines.reduce((sum, line) => sum + parseFloat(line.credit), 0);

      res.json({
        tip_amount: parseFloat(tip_amount),
        handling_type: handling_rule.type,
        employee_id,
        property_id,
        lines,
        totals: {
          debits: totalDebits.toFixed(2),
          credits: totalCredits.toFixed(2),
          is_balanced: Math.abs(totalDebits - totalCredits) < 0.01,
        },
        line_count: lines.length,
      });
    } catch (error) {
      console.error('Tip lines generation error:', error);
      res.status(500).json({
        error: 'INTERNAL_ERROR',
        detail: 'Failed to generate tip journal lines'
      });
    }
  });

  /**
   * Get Tip Handling Rules by Industry
   * GET /v1/edge-cases/tips/rules?industry=...
   */
  app.get('/v1/edge-cases/tips/rules', async (req, res) => {
    try {
      const { industry = 'default' } = req.query;
      
      const rules = EdgeCaseHandler.getTipHandlingRules();
      const rule = rules[industry as string] || rules['default'];

      res.json({
        industry,
        rule,
        available_industries: Object.keys(rules),
        description: {
          expense_liability: 'Employer holds tips, creates expense and liability accounts',
          pass_through: 'Tips pass directly from customer to employee',
        }[rule.type],
      });
    } catch (error) {
      console.error('Tip rules fetch error:', error);
      res.status(500).json({
        error: 'INTERNAL_ERROR',
        detail: 'Failed to get tip handling rules'
      });
    }
  });

  // =============================================================================
  // BONUS HANDLING (ΔΏΡΑ/ΕΠΙΔΌΜΑΤΑ)
  // =============================================================================

  /**
   * Generate Bonus Journal Lines
   * POST /v1/edge-cases/bonuses/generate-lines
   */
  app.post('/v1/edge-cases/bonuses/generate-lines', async (req, res) => {
    try {
      const { 
        bonus_amount, 
        employee_id, 
        bonus_type, 
        tax_withholding = 0, 
        dimensions = {} 
      } = req.body;

      if (!bonus_amount || !employee_id || !bonus_type) {
        return res.status(400).json({
          error: 'MISSING_PARAMETERS',
          detail: 'bonus_amount, employee_id, and bonus_type are required',
          hint: 'Specify bonus type: XMAS_BONUS, EASTER_BONUS, etc.'
        });
      }

      const bonusMappings = EdgeCaseHandler.getGreekBonusMappings();
      const bonusMapping = bonusMappings.find(b => b.code === bonus_type);

      if (!bonusMapping) {
        return res.status(400).json({
          error: 'INVALID_BONUS_TYPE',
          detail: `Bonus type ${bonus_type} not found`,
          hint: `Available types: ${bonusMappings.map(b => b.code).join(', ')}`,
          available_bonuses: bonusMappings,
        });
      }

      const grossAmount = parseFloat(bonus_amount);
      const taxAmount = parseFloat(tax_withholding);
      const netAmount = grossAmount - taxAmount;

      const lines = EdgeCaseHandler.generateBonusJournalLines(
        grossAmount,
        employee_id,
        bonusMapping,
        taxAmount,
        netAmount,
        dimensions
      );

      const totalDebits = lines.reduce((sum, line) => sum + parseFloat(line.debit), 0);
      const totalCredits = lines.reduce((sum, line) => sum + parseFloat(line.credit), 0);

      res.json({
        bonus_type: bonusMapping.code,
        bonus_name: bonusMapping.name,
        greek_name: bonusMapping.greekName,
        amounts: {
          gross: grossAmount.toFixed(2),
          tax_withholding: taxAmount.toFixed(2),
          net: netAmount.toFixed(2),
        },
        employee_id,
        lines,
        totals: {
          debits: totalDebits.toFixed(2),
          credits: totalCredits.toFixed(2),
          is_balanced: Math.abs(totalDebits - totalCredits) < 0.01,
        },
        separate_from_wages: bonusMapping.separateFromWages,
      });
    } catch (error) {
      console.error('Bonus lines generation error:', error);
      res.status(500).json({
        error: 'INTERNAL_ERROR',
        detail: 'Failed to generate bonus journal lines'
      });
    }
  });

  /**
   * Get Greek Bonus Mappings
   * GET /v1/edge-cases/bonuses/mappings
   */
  app.get('/v1/edge-cases/bonuses/mappings', async (req, res) => {
    try {
      const mappings = EdgeCaseHandler.getGreekBonusMappings();

      res.json({
        bonus_mappings: mappings,
        total_count: mappings.length,
        categories: {
          seasonal: mappings.filter(b => ['XMAS_BONUS', 'EASTER_BONUS'].includes(b.code)),
          allowances: mappings.filter(b => b.code.includes('ALLOWANCE')),
          performance: mappings.filter(b => b.code.includes('PERFORMANCE') || b.code.includes('SENIORITY')),
        },
      });
    } catch (error) {
      console.error('Bonus mappings fetch error:', error);
      res.status(500).json({
        error: 'INTERNAL_ERROR',
        detail: 'Failed to get bonus mappings'
      });
    }
  });

  // =============================================================================
  // BACK-DATED ADJUSTMENTS
  // =============================================================================

  /**
   * Create Back-dated Adjustment
   * POST /v1/edge-cases/backdated-adjustment
   */
  app.post('/v1/edge-cases/backdated-adjustment', async (req, res) => {
    try {
      const { 
        original_journal_id, 
        adjustment_data, 
        policy = EdgeCaseHandler.getDefaultBackdatedPolicy() 
      } = req.body;

      if (!original_journal_id || !adjustment_data) {
        return res.status(400).json({
          error: 'MISSING_PARAMETERS',
          detail: 'original_journal_id and adjustment_data are required',
          hint: 'Provide original journal reference and adjustment details'
        });
      }

      const result = await EdgeCaseHandler.createBackdatedAdjustment(
        original_journal_id,
        adjustment_data,
        policy
      );

      res.json({
        original_journal_id,
        adjustment_journal_id: result.journalId,
        back_posted: result.isBackPosted,
        current_period_reference: result.currentPeriodReference,
        requires_approval: result.requiresApproval,
        policy_applied: policy,
        message: result.isBackPosted 
          ? 'Adjustment posted to original period' 
          : 'Adjustment posted to current period with reference',
      });
    } catch (error) {
      console.error('Back-dated adjustment error:', error);
      res.status(500).json({
        error: 'INTERNAL_ERROR',
        detail: 'Failed to create back-dated adjustment'
      });
    }
  });

  // =============================================================================
  // POSTING WINDOWS & LOCK DATES
  // =============================================================================

  /**
   * Validate Posting Window
   * GET /v1/edge-cases/posting-window/validate?entity_id=...&period=...
   */
  app.get('/v1/edge-cases/posting-window/validate', async (req, res) => {
    try {
      const { entity_id, period } = req.query;

      if (!entity_id || !period) {
        return res.status(400).json({
          error: 'MISSING_PARAMETERS',
          detail: 'entity_id and period are required',
          hint: 'Provide entity ID and period (YYYY-MM) for validation'
        });
      }

      const validation = await EdgeCaseHandler.validatePostingWindow(
        entity_id as string,
        period as string
      );

      res.json({
        entity_id,
        period,
        can_post: validation.canPost,
        lock_status: validation.lockStatus,
        should_create_draft: validation.shouldCreateDraft,
        message: validation.message,
        recommended_action: validation.canPost 
          ? 'Proceed with posting' 
          : 'Create as draft and notify administrator',
      });
    } catch (error) {
      console.error('Posting window validation error:', error);
      res.status(500).json({
        error: 'INTERNAL_ERROR',
        detail: 'Failed to validate posting window'
      });
    }
  });

  // =============================================================================
  // PAYROLL RE-RUN HANDLING
  // =============================================================================

  /**
   * Handle Payroll Re-run
   * POST /v1/edge-cases/payroll-rerun
   */
  app.post('/v1/edge-cases/payroll-rerun', async (req, res) => {
    try {
      const { entity_id, run_id, period } = req.body;

      if (!entity_id || !run_id || !period) {
        return res.status(400).json({
          error: 'MISSING_PARAMETERS',
          detail: 'entity_id, run_id, and period are required',
          hint: 'Provide entity, run ID and period for re-run handling'
        });
      }

      const result = await EdgeCaseHandler.handlePayrollRerun(
        entity_id,
        run_id,
        period
      );

      res.json({
        entity_id,
        run_id,
        period,
        reversal_required: result.reversalRequired,
        reversal_journal_id: result.reversalJournalId,
        new_journal_id: result.newJournalId,
        message: result.message,
        next_steps: result.reversalRequired 
          ? [
              '1. Review and post reversal journal',
              '2. Process new payroll run',
              '3. Post new journal',
            ]
          : [
              '1. Process payroll run',
              '2. Post journal',
            ],
      });
    } catch (error) {
      console.error('Payroll re-run handling error:', error);
      res.status(500).json({
        error: 'INTERNAL_ERROR',
        detail: 'Failed to handle payroll re-run'
      });
    }
  });

  // =============================================================================
  // CONFIGURATION ENDPOINTS
  // =============================================================================

  /**
   * Get Back-dated Policy Configuration
   * GET /v1/edge-cases/config/backdated-policy
   */
  app.get('/v1/edge-cases/config/backdated-policy', async (req, res) => {
    try {
      const defaultPolicy = EdgeCaseHandler.getDefaultBackdatedPolicy();

      res.json({
        default_policy: defaultPolicy,
        policy_options: {
          allow_back_post: {
            description: 'Allow posting adjustments to original periods',
            default: defaultPolicy.allowBackPost,
          },
          current_period_reference: {
            description: 'Post in current period with reference to original',
            default: defaultPolicy.currentPeriodReference,
          },
          max_back_days: {
            description: 'Maximum days back for adjustments',
            default: defaultPolicy.maxBackDays,
            range: '1-365',
          },
          require_approval: {
            description: 'Require approval for back-dated adjustments',
            default: defaultPolicy.requireApproval,
          },
        },
      });
    } catch (error) {
      console.error('Policy configuration error:', error);
      res.status(500).json({
        error: 'INTERNAL_ERROR',
        detail: 'Failed to get policy configuration'
      });
    }
  });
}